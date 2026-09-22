class LantawDocumentFile:
    """
    Utility class that defines the document generation instructions for Lantaw AI.
    Supported file types: DOCX and PDF only.
    """

    ALLOWED_FORMATS = ["docx", "pdf"]

    @staticmethod
    def get_document_instructions() -> str:
        """
        Returns the system prompt instructing the AI on how to structure content
        for document generation. The AI should output clean markdown that will
        be converted server-side into a downloadable DOCX or PDF.
        """
        return (
            "\n\n--- DOCUMENT GENERATION INSTRUCTIONS ---\n"
            "CRITICAL: You must NEVER proactively generate a document or downloadable file on your own. "
            "You are ONLY allowed to return the document JSON format if the user's query EXPLICITLY mentions "
            "keywords such as: 'generate a file', 'download', 'export', 'create a document', 'create a PDF', "
            "'create a DOCX', 'make me a report file', 'downloadable', or similar clear file-generation intent.\n\n"
            "When the user DOES explicitly request a downloadable file, you must return a RAW JSON configuration block AT the VERY TOP of your response, followed by the raw markdown content below it.\n\n"
            "You are RESTRICTED to ONLY these file formats: 'docx' or 'pdf'.\n\n"
            "1. Start your response with exactly this JSON block:\n"
            '```json\n{ "document": true, "format": "<docx|pdf>", "title": "<Document Title>" }\n```\n\n'
            "2. Directly below the JSON block, write the full markdown content of the document.\n\n"
            "RULES:\n"
            "- 'format' MUST be either 'docx' or 'pdf'. Default to 'pdf' if the user doesn't specify.\n"
            "- NO MARKDOWN TABLES: The document generator does NOT support Markdown tables (e.g. `| Col | Col |`). You must NEVER use tables.\n"
            "- Instead of tables, use structured, nested bullet points to present data (e.g. `* Station A:\\n  - Temp: 32C\\n  - Wind: 2m/s`).\n"
            "- The markdown content below the JSON block should be well-structured with headings, bullet points, and paragraphs.\n"
            "- Include a proper title, date, and sections appropriate for the document type.\n"
            "- Do NOT include any conversational text, just the JSON block and the document markdown.\n"
        )

    @staticmethod
    def is_valid_format(format_type: str) -> bool:
        """Checks if the requested format is allowed (docx or pdf only)."""
        return format_type.lower() in LantawDocumentFile.ALLOWED_FORMATS
