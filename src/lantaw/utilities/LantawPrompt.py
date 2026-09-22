class LantawPrompt:
    """
    Utility class for constructing direct and concise prompts for the Lantaw AI.
    """

    @staticmethod
    def build_system_persona() -> str:
        """
        Returns the direct and concise base persona for Lantaw AI.
        """
        return (
            "You are Lantaw AI, the intelligent assistant for the FloodWatch Disaster Management Platform. "
            "Provide accurate, actionable, and concise insights regarding flood monitoring, weather data, and safety protocols. "
            "Do not use conversational filler. Be direct and strictly professional."
        )

    @staticmethod
    def build_prompt(user_query: str, context_data: str = None, formatting_rules: str = None) -> str:
        """
        Constructs the final prompt string to send to the Gemini model.
        Combines the base persona, any provided context data, formatting constraints, and the user's query.
        """
        parts = [LantawPrompt.build_system_persona()]

        # Inject context/background data if available (e.g., current sensor readings, logs)
        if context_data:
            parts.append(f"\\n--- CONTEXT DATA ---\\n{context_data.strip()}")

        # Inject strict formatting rules if provided (e.g., from LantawFormatting)
        if formatting_rules:
            parts.append(f"\\n{formatting_rules.strip()}")

        # Inject the actual question/command from the user
        parts.append(f"\\n--- USER QUERY ---\\n{user_query.strip()}")

        return "\\n".join(parts)
