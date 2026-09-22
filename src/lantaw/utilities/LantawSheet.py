class LantawSheet:
    """
    Utility class that defines the spreadsheet generation instructions for Lantaw AI.
    
    CRITICAL: Spreadsheet data MUST come exclusively from the LantawSources database tables.
    The AI does NOT generate or invent spreadsheet data — it only specifies WHICH source table 
    to export, and the server-side endpoint pulls the real data directly from Supabase.
    
    Supported sources (from LantawSources):
        - pdrrmo_inventory
        - weather_telemetry
        - incident_report
        - air_quality
        - distress_signals
        - utilities
    """

    ALLOWED_SOURCES = [
        "pdrrmo_inventory",
        "weather_telemetry",
        "incident_report",
        "air_quality",
        "distress_signals",
        "utilities",
    ]

    @staticmethod
    def get_sheet_instructions() -> str:
        """
        Returns the system prompt instructing the AI to output a JSON config
        for spreadsheet generation. The AI only specifies which source to use;
        the actual data is fetched server-side from Supabase.
        """
        sources_list = ", ".join(f"'{s}'" for s in LantawSheet.ALLOWED_SOURCES)

        return (
            "\n\n--- SPREADSHEET GENERATION INSTRUCTIONS ---\n"
            "CRITICAL: You must NEVER proactively generate a spreadsheet on your own. "
            "You are ONLY allowed to return the spreadsheet JSON format if the user's query EXPLICITLY mentions "
            "keywords such as: 'spreadsheet', 'excel', 'xlsx', 'export to sheet', 'download sheet', "
            "'generate spreadsheet', or similar clear spreadsheet intent.\n\n"
            "If the user simply asks a question or wants information, respond normally.\n\n"
            "When the user DOES explicitly request a spreadsheet, return a RAW JSON object (no markdown code blocks).\n\n"
            "The JSON must strictly follow this structure:\n"
            '{ "spreadsheet": true, "source": "<source_table>", "title": "<Sheet Title>" }\n\n'
            "RULES:\n"
            f"- 'source' MUST be one of these exact table names: {sources_list}\n"
            "- The data will be pulled DIRECTLY from the database. You do NOT generate or invent any rows.\n"
            "- Choose the source table that best matches what the user is asking for.\n"
            "- If the user asks for multiple sources, pick the single most relevant one.\n"
            "- Do NOT include any conversational text outside the JSON object.\n"
        )

    @staticmethod
    def is_valid_source(source: str) -> bool:
        """Checks if the requested source table is in the allowed list."""
        return source in LantawSheet.ALLOWED_SOURCES
