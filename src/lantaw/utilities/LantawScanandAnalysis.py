import os
import json
import sys
import mimetypes
import re
from pathlib import Path

class LantawScanAndAnalysis:
    """
    The entry-point scanner for Lantaw AI's file processing pipeline.
    
    When a file is uploaded, this class determines the file type,
    validates it, routes it to the correct extraction handler, and cleanses data:
      - Document files (.pdf, .docx, .xlsx, .csv, .txt) → LantawExtractDataFromFiles
      - Image files (.png, .jpg, .jpeg, .webp) → LantawExtractDataFromImage
    
    After extraction, it runs deterministic name deduplication and AI-powered
    duplication detection against the specific target database table (utilities or pdrrmo_inventory).
    """

    DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".csv", ".txt"]
    IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]
    ALLOWED_EXTENSIONS = DOCUMENT_EXTENSIONS + IMAGE_EXTENSIONS

    # Max file size: 10 MB
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

    @staticmethod
    def identify_file_type(file_path: str) -> str:
        ext = Path(file_path).suffix.lower()

        if ext in LantawScanAndAnalysis.DOCUMENT_EXTENSIONS:
            return "document"
        elif ext in LantawScanAndAnalysis.IMAGE_EXTENSIONS:
            return "image"
        else:
            return "unsupported"

    @staticmethod
    def validate_file(file_path: str) -> dict:
        path = Path(file_path)

        if not path.exists():
            return {"valid": False, "error": "File does not exist.", "file_type": None, "metadata": None}

        ext = path.suffix.lower()
        if ext not in LantawScanAndAnalysis.ALLOWED_EXTENSIONS:
            return {
                "valid": False,
                "error": f"Unsupported file type '{ext}'. Allowed: {', '.join(LantawScanAndAnalysis.ALLOWED_EXTENSIONS)}",
                "file_type": None,
                "metadata": None
            }

        file_size = path.stat().st_size
        if file_size > LantawScanAndAnalysis.MAX_FILE_SIZE_BYTES:
            size_mb = file_size / (1024 * 1024)
            return {
                "valid": False,
                "error": f"File too large ({size_mb:.1f} MB). Maximum allowed: 10 MB.",
                "file_type": None,
                "metadata": None
            }

        file_type = LantawScanAndAnalysis.identify_file_type(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)

        metadata = {
            "file_name": path.name,
            "extension": ext,
            "mime_type": mime_type or "unknown",
            "size_bytes": file_size,
            "size_readable": f"{file_size / 1024:.1f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.2f} MB"
        }

        return {"valid": True, "error": None, "file_type": file_type, "metadata": metadata}

    @staticmethod
    def _fetch_existing_records(target_table: str = "utilities") -> list:
        """
        Fetches existing records ONLY from the specific target database table (utilities or pdrrmo_inventory).
        Enforces strict table isolation.
        """
        try:
            from lantaw.utilities.LantawSources import supabase
            if target_table == "pdrrmo_inventory":
                response = supabase.table('pdrrmo_inventory').select('item_id, item_name, category, control_number').execute()
                return response.data or []
            else:
                response = supabase.table('utilities').select('id, name, type, serial_number').execute()
                return response.data or []
        except Exception as e:
            print(f"Warning: Could not fetch existing records from {target_table} for duplication check: {e}", file=sys.stderr)
            return []

    @staticmethod
    def normalize_name(name_str: str) -> str:
        """Helper to convert item names to a clean lowercase alphanumeric representation."""
        if not name_str:
            return ""
        return re.sub(r'[^a-z0-9]', '', str(name_str).lower())

    @staticmethod
    def cleanse_and_filter_items(extracted_items: list, target_table: str = "utilities") -> dict:
        """
        Cleanses extracted items by:
          1. Discarding invalid/noise rows (empty, missing primary fields, or header/total text)
          2. Deterministic Name Deduplication (detecting duplicate item names within file)
          3. Deterministic DB Name Deduplication (detecting item names matching active target_table in DB)
          4. AI Semantic Deduplication (catching non-exact synonyms like 'Life Vest' ↔ 'Life Jacket')
        """
        from lantaw.utilities.LantawDuplicationDetection import LantawDuplicationDetection

        if not isinstance(extracted_items, list):
            return {
                "cleaned_items": [],
                "cleansing_insight": {
                    "total_raw": 0,
                    "discarded_invalid": 0,
                    "duplicates_removed": 0,
                    "reasons": []
                }
            }

        total_raw = len(extracted_items)
        valid_items = []
        discarded_invalid = 0
        reasons = []

        # 1. Filter invalid / noise rows
        for index, item in enumerate(extracted_items):
            if not isinstance(item, dict):
                discarded_invalid += 1
                continue

            name_val = str(item.get("name") or item.get("item_name") or "").strip()
            type_val = str(item.get("type") or item.get("category") or item.get("item_type") or "").strip()
            serial_val = str(item.get("serial_number") or item.get("control_number") or "").strip()

            is_noise = (
                not name_val or 
                name_val.lower() in ["total", "grand total", "summary", "subtotal", "name", "item name", "item", "description"] or
                (not type_val and not serial_val and len(name_val) < 2)
            )

            if is_noise:
                discarded_invalid += 1
                if name_val:
                    reasons.append(f"Discarded non-inventory/header row '{name_val}'")
            else:
                valid_items.append(item)

        # 2. Deterministic Internal Name Deduplication (File Scope)
        seen_file_names = set()
        items_after_internal_name = []
        internal_name_dups_count = 0

        for item in valid_items:
            raw_name = item.get("name") or item.get("item_name") or ""
            norm_name = LantawScanAndAnalysis.normalize_name(raw_name)

            if norm_name in seen_file_names:
                internal_name_dups_count += 1
                reasons.append(f"Removed duplicate item name '{raw_name}' repeated within file")
            else:
                seen_file_names.add(norm_name)
                items_after_internal_name.append(item)

        # 3. Deterministic Database Name Deduplication (Active Table Scope)
        existing_db = LantawScanAndAnalysis._fetch_existing_records(target_table)
        existing_db_names = set()
        for db_row in existing_db:
            db_name = db_row.get("name") or db_row.get("item_name") or ""
            norm_db = LantawScanAndAnalysis.normalize_name(db_name)
            if norm_db:
                existing_db_names.add(norm_db)

        items_after_db_name = []
        db_name_dups_count = 0

        for item in items_after_internal_name:
            raw_name = item.get("name") or item.get("item_name") or ""
            norm_name = LantawScanAndAnalysis.normalize_name(raw_name)

            if norm_name in existing_db_names:
                db_name_dups_count += 1
                tbl_label = "PDRRMO Command Center" if target_table == "pdrrmo_inventory" else "Shared Inventory"
                reasons.append(f"Removed database duplicate item name '{raw_name}' already in {tbl_label}")
            else:
                items_after_db_name.append(item)

        # 4. AI Semantic Deduplication (Catching Synonyms/Variations)
        items_after_ai = items_after_db_name
        ai_dups_count = 0

        if len(items_after_db_name) > 0 and existing_db:
            try:
                if target_table == "pdrrmo_inventory":
                    db_duplicates = LantawDuplicationDetection.detect_duplicate_inventory(items_after_db_name, existing_db)
                else:
                    db_duplicates = LantawDuplicationDetection.detect_duplicate_utilities(items_after_db_name, existing_db)

                ai_dup_indices = set()
                for dup in db_duplicates:
                    inc_idx = dup.get("incoming_index")
                    if inc_idx is not None and 0 <= inc_idx < len(items_after_db_name):
                        ai_dup_indices.add(inc_idx)
                        reason_txt = dup.get("reason") or "Semantic duplicate found"
                        item_name_str = items_after_db_name[inc_idx].get("name") or items_after_db_name[inc_idx].get("item_name") or ""
                        reasons.append(f"Lantaw AI removed semantic duplicate '{item_name_str}' ({reason_txt})")

                items_after_ai = [item for i, item in enumerate(items_after_db_name) if i not in ai_dup_indices]
                ai_dups_count = len(ai_dup_indices)
            except Exception as e:
                print(f"AI duplication check warning: {e}", file=sys.stderr)

        total_duplicates_removed = internal_name_dups_count + db_name_dups_count + ai_dups_count

        return {
            "cleaned_items": items_after_ai,
            "cleansing_insight": {
                "total_raw": total_raw,
                "discarded_invalid": discarded_invalid,
                "duplicates_removed": total_duplicates_removed,
                "reasons": reasons
            }
        }

    @staticmethod
    def scan_and_route(file_path: str, target_table: str = "utilities") -> dict:
        """
        Main orchestrator method. Validates the file, routes it to the
        correct extractor, cleanses & deduplicates items against target_table, and returns insights.
        """
        from lantaw.utilities.LantawExtractDataFromFiles import LantawExtractDataFromFiles
        from lantaw.utilities.LantawExtractDataFromImage import LantawExtractDataFromImage

        # Step 1: Validate
        validation = LantawScanAndAnalysis.validate_file(file_path)
        if not validation["valid"]:
            return {
                "success": False,
                "file_type": None,
                "data": None,
                "error": validation["error"]
            }

        file_type = validation["file_type"]
        metadata = validation["metadata"]

        # Step 2: Route to correct extractor
        try:
            if file_type == "document":
                extracted = LantawExtractDataFromFiles.extract(file_path)
            elif file_type == "image":
                extracted = LantawExtractDataFromImage.extract(file_path)
            else:
                return {
                    "success": False,
                    "file_type": file_type,
                    "data": None,
                    "error": "No extractor available for this file type."
                }

            if extracted.get("error"):
                return {
                    "success": False,
                    "file_type": file_type,
                    "data": None,
                    "error": extracted["error"]
                }

        except Exception as e:
            return {
                "success": False,
                "file_type": file_type,
                "data": None,
                "error": f"Extraction failed: {str(e)}"
            }

        raw_content = extracted.get("content", [])

        if file_type == "image" and isinstance(raw_content, str):
            from lantaw.utilities.LantawExtractDataFromImage import LantawExtractDataFromImage
            parsed = LantawExtractDataFromImage.parse_extracted_json(raw_content)
            raw_content = parsed.get("extracted_items", [])

        # Step 3: Cleanse, Filter Noise, and Remove Duplicates (Strict Table Scope)
        cleansing_res = LantawScanAndAnalysis.cleanse_and_filter_items(raw_content, target_table)

        cleaned_items = cleansing_res["cleaned_items"]
        insight = cleansing_res["cleansing_insight"]

        return {
            "success": True,
            "file_type": file_type,
            "metadata": metadata,
            "data": {
                "extracted_items": cleaned_items,
                "cleansing_insight": insight
            },
            "error": None
        }

if __name__ == "__main__":
    src_path = str(Path(__file__).resolve().parent.parent.parent)
    if src_path not in sys.path:
        sys.path.insert(0, src_path)

    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided."}))
        sys.exit(1)

    file_to_process = sys.argv[1]
    target_tbl = sys.argv[2] if len(sys.argv) > 2 else "utilities"
    result = LantawScanAndAnalysis.scan_and_route(file_to_process, target_tbl)
    
    print(json.dumps(result, default=str))
