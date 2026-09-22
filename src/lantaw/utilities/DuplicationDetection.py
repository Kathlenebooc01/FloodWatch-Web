import json
import sys
import re
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
    inserted into the database. Uses Gemini's semantic understanding combined
    with deterministic normalized string matching.
    """

    @staticmethod
    def normalize_string(s: str) -> str:
        """Normalizes strings by removing spaces, punctuation, and converting to lowercase."""
        if not s:
            return ""
        return re.sub(r'[^a-z0-9]', '', str(s).lower())

    # ──────────────────────────────────────────────────────────
    #  Prompt Builders with Strict Name Rules & Table Scope Isolation
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
            f"TASK: Compare INCOMING {context_label} against EXISTING {context_label} already in database and identify duplicates.\n\n"
            "CRITICAL DUPLICATION RULES:\n"
            "1. SAME ITEM NAME RULE: If an incoming item has the SAME or VERY SIMILAR item name as an existing record "
            "(e.g., 'Emergency First Aid Kit' vs 'Emergency First Aid Kit', or 'Life Vest' vs 'Life Jacket'), it IS A DUPLICATE.\n"
            "2. Different control numbers, serial numbers, or quantities DO NOT override duplicate item names.\n"
            f"3. Focus fields: {', '.join(fields)}.\n"
            "4. Minor typos, spaces, hyphenation, and formatting differences should still be caught.\n\n"
            f"--- INCOMING {context_label.upper()} ---\n"
            f"{incoming_summary}\n\n"
            f"--- EXISTING {context_label.upper()} (Database) ---\n"
            f"{existing_summary}\n\n"
            "RESPONSE FORMAT:\n"
            "Return ONLY a raw JSON array (no markdown, no code blocks, no extra text).\n"
            "Each element:\n"
            "{\n"
            '  "incoming_index": <index of incoming record (0-based)>,\n'
            '  "existing_id": <id of matching existing record>,\n'
            '  "confidence": <float 0.0 to 1.0>,\n'
            '  "reason": "<brief explanation>"\n'
            "}\n\n"
            "If NO duplicates are found, return: []\n"
        )

    @staticmethod
    def _build_internal_detection_prompt(records: list, fields: list, context_label: str = "records") -> str:
        """
        Builds prompt for detecting duplicates WITHIN a single list.
        """
        records_summary = json.dumps(records, indent=2, default=str)

        return (
            "You are Lantaw AI, a duplication detection assistant for the FloodWatch system.\n\n"
            f"TASK: Scan the following list of {context_label} and identify any INTERNAL DUPLICATES "
            "(rows that repeat the same item name or refer to the same real-world item).\n\n"
            "CRITICAL DUPLICATION RULES:\n"
            "1. SAME ITEM NAME RULE: If two rows have the SAME or VERY SIMILAR item name "
            "(e.g. 'Emergency First Aid Kit' in row 2 and row 3), they ARE DUPLICATES.\n"
            "2. Different control numbers or storage locations DO NOT make duplicate item names unique.\n"
            f"3. Focus fields: {', '.join(fields)}.\n\n"
            f"--- RECORDS ---\n"
            f"{records_summary}\n\n"
            "RESPONSE FORMAT:\n"
            "Return ONLY a raw JSON array (no markdown, no code blocks, no extra text).\n"
            "Each element:\n"
            "{\n"
            '  "index_a": <index of first record (0-based)>,\n'
            '  "index_b": <index of duplicate record (0-based)>,\n'
            '  "confidence": <float 0.0 to 1.0>,\n'
            '  "reason": "<brief explanation>"\n'
            "}\n\n"
            "If NO duplicates are found, return: []\n"
        )

    # ──────────────────────────────────────────────────────────
    #  AI Response Parser
    # ──────────────────────────────────────────────────────────

    @staticmethod
    def _parse_ai_response(raw_response: str) -> list:
        cleaned = raw_response.strip()

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
        if not records or len(records) < 2:
            return []

        prompt = LantawDuplicationDetection._build_internal_detection_prompt(records, fields, context_label)
        raw = generate_response(prompt)
        return LantawDuplicationDetection._parse_ai_response(raw)

    @staticmethod
    def find_duplicates_against_existing(incoming: list, existing: list, fields: list, context_label: str = "records") -> list:
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
        return LantawDuplicationDetection.find_duplicates_against_existing(
            incoming, existing,
            fields=["name", "type", "serial_number"],
            context_label="shared municipal utilities"
        )

    @staticmethod
    def detect_duplicate_inventory(incoming: list, existing: list) -> list:
        return LantawDuplicationDetection.find_duplicates_against_existing(
            incoming, existing,
            fields=["item_name", "category", "control_number"],
            context_label="pdrrmo command center inventory items"
        )

    @staticmethod
    def format_duplicate_report(duplicates: list) -> str:
        if not duplicates:
            return "✅ No duplicates detected by Lantaw AI."

        lines = [f"⚠ Lantaw AI detected {len(duplicates)} potential duplicate(s):\n"]
        for i, dup in enumerate(duplicates, 1):
            confidence = dup.get("confidence", 0)
            confidence_pct = int(confidence * 100) if isinstance(confidence, float) else confidence
            reason = dup.get("reason", "No reason provided")
            lines.append(f"  {i}. {reason} — {confidence_pct}% confidence")

        return "\n".join(lines)


# Backwards compatibility alias
DuplicationDetection = LantawDuplicationDetection
