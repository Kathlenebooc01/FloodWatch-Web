import json
import sys
from pathlib import Path

# Ensure src directory is in sys.path for imports
src_path = str(Path(__file__).resolve().parent.parent.parent)
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from lantaw.connection.LantawConnect import generate_response


class LantawDuplicationDetection:
    """
    AI-powered duplication detection utility for the FloodWatch system,
    powered by Lantaw AI (Gemini).

    Detects redundant Items, Reports, and other information before they are
    inserted into the database. Uses Gemini's semantic understanding to
    identify duplicates that simple string matching would miss
    (e.g. "Life Vest" ↔ "Life Jacket").

    Supported detection modes:
      - Utility duplicates (name, type, serial_number)
      - Incident report duplicates (title, description, location)
      - Inventory duplicates (item_name, category, serial_number)
      - Generic / custom field comparison
    """

    # ──────────────────────────────────────────────────────────
    #  Prompt Builder
    # ──────────────────────────────────────────────────────────

    @staticmethod
    def _build_detection_prompt(incoming: list, existing: list, fields: list, context_label: str = "records") -> str:
        """
        Builds the structured prompt that Lantaw AI will use to
        analyze incoming vs existing records for duplicates.
        """
        incoming_summary = json.dumps(incoming, indent=2, default=str)
        existing_summary = json.dumps(existing, indent=2, default=str)

        return (
            "You are Lantaw AI, a duplication detection assistant for the FloodWatch system.\n\n"
            f"TASK: Compare the INCOMING {context_label} against the EXISTING {context_label} and identify duplicates.\n\n"
            "RULES:\n"
            "1. Two records are duplicates if they refer to the SAME real-world item, even if the wording differs "
            "(e.g. 'Life Vest' and 'Life Jacket' are duplicates, 'Rescue Boat Model A' and 'Rescue Boat Model-A' are duplicates).\n"
            f"2. Focus on these fields for comparison: {', '.join(fields)}.\n"
            "3. Serial numbers that match exactly are a STRONG indicator of duplication.\n"
            "4. Minor typos, abbreviations, and formatting differences should still be caught.\n"
            "5. Be conservative — only flag genuine duplicates, not items that are merely similar.\n\n"
            f"--- INCOMING {context_label.upper()} (about to be inserted) ---\n"
            f"{incoming_summary}\n\n"
            f"--- EXISTING {context_label.upper()} (already in database) ---\n"
            f"{existing_summary}\n\n"
            "RESPONSE FORMAT:\n"
            "Return ONLY a raw JSON array (no markdown, no code blocks, no extra text).\n"
            "Each element should be:\n"
            "{\n"
            '  "incoming_index": <index of the incoming record (0-based)>,\n'
            '  "existing_id": <id of the matching existing record, or null if not available>,\n'
            '  "confidence": <float 0.0 to 1.0>,\n'
            '  "reason": "<brief explanation of why these are duplicates>"\n'
            "}\n\n"
            "If NO duplicates are found, return an empty array: []\n"
        )

    @staticmethod
    def _build_internal_detection_prompt(records: list, fields: list, context_label: str = "records") -> str:
        """
        Builds the prompt for detecting duplicates WITHIN a single list
        (e.g. an uploaded file that contains the same row twice).
        """
        records_summary = json.dumps(records, indent=2, default=str)

        return (
            "You are Lantaw AI, a duplication detection assistant for the FloodWatch system.\n\n"
            f"TASK: Scan the following list of {context_label} and identify any INTERNAL duplicates "
            "(records that appear more than once or refer to the same real-world item).\n\n"
            "RULES:\n"
            "1. Two records are duplicates if they refer to the SAME real-world item, even with different wording.\n"
            f"2. Focus on these fields: {', '.join(fields)}.\n"
            "3. Serial numbers that match exactly are a STRONG indicator.\n"
            "4. Minor typos, abbreviations, and formatting differences should still be caught.\n"
            "5. Be conservative — only flag genuine duplicates.\n\n"
            f"--- RECORDS ---\n"
            f"{records_summary}\n\n"
            "RESPONSE FORMAT:\n"
            "Return ONLY a raw JSON array (no markdown, no code blocks, no extra text).\n"
            "Each element should be:\n"
            "{\n"
            '  "index_a": <index of the first record (0-based)>,\n'
            '  "index_b": <index of the duplicate record (0-based)>,\n'
            '  "confidence": <float 0.0 to 1.0>,\n'
            '  "reason": "<brief explanation>"\n'
            "}\n\n"
            "If NO duplicates are found, return an empty array: []\n"
        )

    # ──────────────────────────────────────────────────────────
    #  AI Response Parser
    # ──────────────────────────────────────────────────────────

    @staticmethod
    def _parse_ai_response(raw_response: str) -> list:
        """
        Parses the AI's raw text response into a Python list of dicts.
        Handles cases where Gemini wraps the JSON in markdown code blocks.
        """
        cleaned = raw_response.strip()

        # Strip markdown JSON fences if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        try:
            result = json.loads(cleaned)
            if isinstance(result, list):
                return result
            return []
        except json.JSONDecodeError:
            return []

    # ──────────────────────────────────────────────────────────
    #  Core Detection Functions
    # ──────────────────────────────────────────────────────────

    @staticmethod
    def find_duplicates_in_list(records: list, fields: list, context_label: str = "records") -> list:
        """
        Uses Lantaw AI to scan a list of records for internal duplicates.

        Args:
            records:       List of dicts representing the data to check.
            fields:        Fields to focus on for comparison.
            context_label: Human label for the type of data (e.g. "utilities").

        Returns:
            List of dicts: [{ index_a, index_b, confidence, reason }]
        """
        if not records or len(records) < 2:
            return []

        prompt = LantawDuplicationDetection._build_internal_detection_prompt(records, fields, context_label)
        raw = generate_response(prompt)
        return LantawDuplicationDetection._parse_ai_response(raw)

    @staticmethod
    def find_duplicates_against_existing(incoming: list, existing: list, fields: list, context_label: str = "records") -> list:
        """
        Uses Lantaw AI to compare incoming records against existing database records.

        Args:
            incoming:      List of new records about to be inserted.
            existing:      List of records already in the database.
            fields:        Fields to focus on for comparison.
            context_label: Human label for the type of data.

        Returns:
            List of dicts: [{ incoming_index, existing_id, confidence, reason }]
        """
        if not incoming or not existing:
            return []

        prompt = LantawDuplicationDetection._build_detection_prompt(incoming, existing, fields, context_label)
        raw = generate_response(prompt)
        return LantawDuplicationDetection._parse_ai_response(raw)

    # ──────────────────────────────────────────────────────────
    #  Pre-configured Detection Profiles
    # ──────────────────────────────────────────────────────────

    @staticmethod
    def detect_duplicate_utilities(incoming: list, existing: list) -> list:
        """
        AI-powered duplicate detection for the 'utilities' table.
        Focuses on name, type, and serial_number.
        """
        return LantawDuplicationDetection.find_duplicates_against_existing(
            incoming, existing,
            fields=["name", "type", "serial_number"],
            context_label="utilities"
        )

    @staticmethod
    def detect_duplicate_incidents(incoming: list, existing: list) -> list:
        """
        AI-powered duplicate detection for the 'incident_report' table.
        Focuses on title, description, and location.
        """
        return LantawDuplicationDetection.find_duplicates_against_existing(
            incoming, existing,
            fields=["title", "description", "location"],
            context_label="incident reports"
        )

    @staticmethod
    def detect_duplicate_inventory(incoming: list, existing: list) -> list:
        """
        AI-powered duplicate detection for the 'pdrrmo_inventory' table.
        Focuses on item_name, category, and serial_number.
        """
        return LantawDuplicationDetection.find_duplicates_against_existing(
            incoming, existing,
            fields=["item_name", "category", "serial_number"],
            context_label="inventory items"
        )

    # ──────────────────────────────────────────────────────────
    #  Utility Helpers
    # ──────────────────────────────────────────────────────────

    @staticmethod
    def format_duplicate_report(duplicates: list) -> str:
        """
        Generates a human-readable summary of detected duplicates.
        Useful for logging or displaying to the user.
        """
        if not duplicates:
            return "✅ No duplicates detected by Lantaw AI."

        lines = [f"⚠ Lantaw AI detected {len(duplicates)} potential duplicate(s):\n"]

        for i, dup in enumerate(duplicates, 1):
            confidence = dup.get("confidence", 0)
            confidence_pct = int(confidence * 100) if isinstance(confidence, float) else confidence
            reason = dup.get("reason", "No reason provided")

            lines.append(f"  {i}. {reason} — {confidence_pct}% confidence")

        return "\n".join(lines)
