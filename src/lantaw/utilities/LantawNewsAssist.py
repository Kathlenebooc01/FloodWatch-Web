class LantawNewsAssist:
    """
    Utility class for Lantaw AI's News Assist feature.
    Generates structured news content (headline, tag, reference link, detailed content)
    from a user's short narration prompt. Skips fields that already have values.
    """

    @staticmethod
    def get_news_assist_instructions(existing_fields: dict = None) -> str:
        """
        Returns the prompt instructions for generating news board content.
        existing_fields is a dict like: { "headline": "...", "tag": "...", "referenceLink": "...", "detailedContent": "..." }
        Fields with non-empty values will be skipped.
        """

        # Determine which fields need to be generated
        fields_to_generate = []
        skip_info = []

        if not existing_fields:
            existing_fields = {}

        if not existing_fields.get("headline", "").strip():
            fields_to_generate.append('"headline": "A concise, professional headline for the news article"')
        else:
            skip_info.append(f'- headline is already set to: "{existing_fields["headline"]}"')

        if not existing_fields.get("tag", "").strip():
            fields_to_generate.append('"tag": "A single relevant one-word category tag (e.g. Flood, Storm, Rescue, Weather, Alert, Emergency)"')
        else:
            skip_info.append(f'- tag is already set to: "{existing_fields["tag"]}"')

        if not existing_fields.get("referenceLink", "").strip():
            fields_to_generate.append('"referenceLink": "Leave as empty string since you cannot generate real URLs"')
        else:
            skip_info.append(f'- referenceLink is already set to: "{existing_fields["referenceLink"]}"')

        if not existing_fields.get("detailedContent", "").strip():
            fields_to_generate.append('"detailedContent": "A well-written, professional, detailed news report (2-4 paragraphs) expanding on the narration"')
        else:
            skip_info.append(f'- detailedContent is already set to: "{existing_fields["detailedContent"]}"')

        fields_json = ",\n  ".join(fields_to_generate)
        skip_text = "\n".join(skip_info) if skip_info else "None — all fields need to be generated."

        return (
            "\n\n--- NEWS ASSIST INSTRUCTIONS ---\n"
            "You are helping a Provincial Admin write a news board article for the FloodWatch platform.\n"
            "The admin has provided a short narration or summary of the event. Your task is to generate "
            "structured content to fill in the news form.\n\n"
            "IMPORTANT RULES:\n"
            "1. Return ONLY a valid raw JSON object. No markdown, no code blocks, no conversational text.\n"
            "2. The JSON must contain ONLY the fields that need to be generated (listed below).\n"
            "3. Do NOT include fields that are already filled in.\n"
            "4. The 'detailedContent' should be a professional, well-structured news report.\n"
            "5. The 'headline' should be concise and attention-grabbing but professional.\n"
            "6. The 'tag' must be exactly ONE word — a category label.\n"
            "7. The 'referenceLink' should always be an empty string since you cannot generate real URLs.\n"
            "8. Do NOT hallucinate specific data, locations, or statistics not mentioned in the narration.\n\n"
            f"FIELDS ALREADY FILLED (SKIP THESE):\n{skip_text}\n\n"
            f"FIELDS TO GENERATE (include ONLY these in your JSON):\n{{\n  {fields_json}\n}}\n"
        )
