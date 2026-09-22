import os
import base64
import json
from pathlib import Path


class LantawExtractDataFromImage:
    """
    Extracts structured data from image files using the Gemini Vision API.

    Supported formats: .png, .jpg, .jpeg, .webp

    Workflow:
      1. Validate the image file.
      2. Encode the image to base64.
      3. Send it to Gemini with an extraction prompt.
      4. Parse the AI's structured JSON response.
    """

    SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

    MIME_MAP = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp"
    }

    @staticmethod
    def extract(file_path: str) -> dict:
        """
        Main extraction method. Reads the image, encodes it, and sends it
        to the Gemini Vision model for content extraction.

        Returns:
            dict with keys: 'type' (str), 'content' (str), 'error' (str|None)
        """
        ext = Path(file_path).suffix.lower()

        if ext not in LantawExtractDataFromImage.SUPPORTED_EXTENSIONS:
            return {
                "type": "unsupported",
                "content": None,
                "error": f"Unsupported image format: {ext}"
            }

        try:
            # Step 1: Read and encode the image
            image_data = LantawExtractDataFromImage._encode_image(file_path)
            mime_type = LantawExtractDataFromImage.MIME_MAP.get(ext, "image/png")

            # Step 2: Send to Gemini Vision for extraction
            result = LantawExtractDataFromImage._analyze_with_vision(image_data, mime_type)

            return {
                "type": "image",
                "content": result,
                "error": None
            }

        except Exception as e:
            return {
                "type": "image",
                "content": None,
                "error": f"Image extraction failed: {str(e)}"
            }

    @staticmethod
    def _encode_image(file_path: str) -> str:
        """Reads an image file and returns its base64-encoded string."""
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    @staticmethod
    def _analyze_with_vision(base64_image: str, mime_type: str) -> str:
        """
        Sends the base64-encoded image to the Gemini model with a 
        structured extraction prompt. Returns the model's text response.
        """
        from lantaw.connection.LantawConnect import get_lantaw_model

        model = get_lantaw_model()

        extraction_prompt = LantawExtractDataFromImage.get_extraction_prompt()

        # Build the multimodal content parts
        contents = [
            {
                "parts": [
                    {"text": extraction_prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64_image
                        }
                    }
                ]
            }
        ]

        response = model.generate_content(contents)
        return response.text

    @staticmethod
    def get_extraction_prompt() -> str:
        """
        Returns the prompt that instructs the vision model on exactly
        what data to extract from the uploaded image.
        """
        return (
            "You are Lantaw AI, a data extraction assistant for the FloodWatch disaster management system.\n\n"
            "Analyze the uploaded image carefully and extract ALL relevant structured data from it.\n\n"
            "INSTRUCTIONS:\n"
            "1. If the image contains a TABLE or SPREADSHEET, extract ALL rows and columns as structured data.\n"
            "2. If the image contains a DOCUMENT or FORM, extract all readable text, labels, and values.\n"
            "3. If the image contains a RECEIPT or INVOICE, extract item names, quantities, prices, and totals.\n"
            "4. If the image contains HANDWRITTEN TEXT, attempt to transcribe it as accurately as possible.\n"
            "5. If the image contains an INVENTORY LIST or EQUIPMENT LOG, extract item names, serial numbers, quantities, types, and any other visible fields.\n\n"
            "OUTPUT FORMAT:\n"
            "Return a valid JSON object with the following structure:\n"
            "```json\n"
            "{\n"
            '  "data_type": "<table|document|receipt|inventory|handwritten|other>",\n'
            '  "description": "<brief description of what the image contains>",\n'
            '  "extracted_items": [\n'
            "    {\n"
            '      "name": "<item name>",\n'
            '      "type": "<item type/category>",\n'
            '      "serial_number": "<serial number if visible>",\n'
            '      "quantity": <number>,\n'
            '      "description": "<any additional details>"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "```\n\n"
            "RULES:\n"
            "- Extract ONLY what you can actually see in the image. Do NOT fabricate data.\n"
            "- If a field is not visible, use null.\n"
            "- If the image is unreadable or contains no extractable data, return an empty extracted_items array with a description explaining why.\n"
        )

    @staticmethod
    def parse_extracted_json(raw_response: str) -> dict:
        """
        Attempts to parse the AI's response as JSON.
        Handles cases where the response is wrapped in markdown code blocks.
        """
        cleaned = raw_response.strip()

        # Strip markdown JSON code fences if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {
                "data_type": "unknown",
                "description": "Could not parse AI response as JSON.",
                "raw_response": raw_response,
                "extracted_items": []
            }

    @staticmethod
    def content_to_context_string(extracted: dict) -> str:
        """
        Converts the extracted image data into a clean string
        suitable for injection into the AI prompt as context.
        """
        if extracted.get("error"):
            return f"[Image extraction error: {extracted['error']}]"

        content = extracted.get("content")
        if not content:
            return "[No data extracted from image]"

        # Try to parse as JSON for nicer formatting
        parsed = LantawExtractDataFromImage.parse_extracted_json(content)

        if parsed.get("extracted_items"):
            items = parsed["extracted_items"]
            return (
                f"[Extracted IMAGE data — {parsed.get('data_type', 'unknown')} — {len(items)} items]\n"
                f"Description: {parsed.get('description', 'N/A')}\n"
                + json.dumps(items, indent=2, default=str)
            )
        else:
            # Fallback: return the raw text response
            return f"[Extracted IMAGE analysis]\n{content}"
