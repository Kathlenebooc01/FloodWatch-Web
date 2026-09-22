class LantawThinking:
    """
    Utility class defining the cognitive guardrails, restrictions, and domain boundaries for Lantaw AI.
    It ensures the AI relies on database sources for facts but allows internal reasoning for guidance and writing tasks.
    """

    @staticmethod
    def get_guardrails() -> str:
        """
        Returns the set of behavioral rules that Lantaw AI must follow to prevent hallucinations 
        regarding facts, while allowing creative freedom for drafting and guidance.
        """
        return (
            "\\n\\n--- STRICT DOMAIN RESTRICTIONS & GUARDRAILS ---\\n"
            "1. NO WEB SEARCHING: You do not have internet access. You cannot browse the web to fetch live external data.\\n"
            "2. FACTUAL DATA SOURCING: When answering questions that require specific facts, statistics, or database records, you MUST pull EXCLUSIVELY from the provided 'CONTEXT DATA' (Inventory, Telemetry, Incidents, etc.). Do not invent or assume any factual data outside of this context.\\n"
            "3. CREATIVE AND GUIDANCE EXCEPTIONS: You ARE fully allowed to use your own internal reasoning and knowledge to generate content such as drafting emails, writing guidance protocols, summarizing information, or providing general disaster management advice, provided you do not pretend to have live external facts.\\n"
            "4. DENIAL OF UNRELATED QUERIES: If the user's query is completely nonsense or blatantly off-topic (e.g., asking about unrelated pop culture or general trivia), politely reject it by stating you are Lantaw AI, a specialized assistant for FloodWatch.\\n"
            "5. NO HALLUCINATIONS: Do not invent database records, sensor readings, or fake incident reports under any circumstances."
        )

    @staticmethod
    def pre_filter_query(user_query: str) -> bool:
        """
        A basic, fast keyword heuristic to pre-filter blatantly off-topic or nonsense queries.
        Returns True if the query passes the basic check, False if it should be immediately rejected.
        """
        if not user_query or len(user_query.strip()) < 2:
            return False
            
        # Core domain keywords for the FloodWatch system, including generative task keywords
        domain_keywords = [
            "flood", "weather", "rain", "temperature", "wind", "storm", "typhoon", "water", 
            "level", "alert", "distress", "emergency", "incident", "hazard", "report", "aqi",
            "air", "pollution", "inventory", "pdrrmo", "equipment", "rescue", "utility", "data",
            "chart", "table", "graph", "show", "give", "list", "what", "how", "many", "is",
            "email", "draft", "guide", "write", "help", "generate", "summarize", "advise", "plan"
        ]
        
        query_lower = user_query.lower()
        
        if len(query_lower.split()) <= 3:
            return True
            
        for word in domain_keywords:
            if word in query_lower:
                return True
                
        return True
