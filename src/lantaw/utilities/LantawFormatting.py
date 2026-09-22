import re
import json

class LantawFormatter:
    """
    A utility class to format, clean, and standardize text from the Lantaw AI model.
    """

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Cleans the raw text output by removing excessive whitespace and standardizing newlines.
        """
        if not text:
            return ""
        
        # Replace 3 or more consecutive newlines with just 2 newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove excessive trailing/leading whitespace from each line
        lines = [line.rstrip() for line in text.split('\n')]
        
        # Rejoin and strip the entire string
        return '\n'.join(lines).strip()

    @staticmethod
    def extract_json(text: str):
        """
        Safely extracts JSON if the AI wrapped the response in markdown blocks (e.g., ```json ... ```).
        Returns a Python dictionary/list, or None if parsing fails.
        """
        if not text:
            return None
            
        try:
            # Check if it has markdown code block
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
            json_str = match.group(1) if match else text
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            return None

    @staticmethod
    def get_formatting_rules(format_type: str = "markdown") -> str:
        """
        Returns a prompt instruction string to attach to the AI prompt.
        This dictates the 'overall output text formatting' to the model.
        """
        rules = "\n\n--- FORMAT INSTRUCTIONS ---\n"
        
        if format_type.lower() == "json":
            return rules + "Return ONLY a valid, raw JSON object. Do not include markdown code blocks (```json), introductions, or conversational text. Ensure keys and string values are enclosed in double quotes."
            
        elif format_type.lower() == "markdown":
            return rules + "Format your response using clean Markdown. Use headings (##, ###) to separate sections, bullet points for lists, and bold text (**text**) for emphasis. Keep paragraphs short, structured, and easy to read."
            
        elif format_type.lower() == "plain":
            return rules + "Return the response in plain text format ONLY. Do not use asterisks, hashes, or any markdown formatting. Use simple line breaks for spacing."
            
        return ""

    @staticmethod
    def format_final_output(raw_text: str) -> str:
        """
        The main wrapper function for processing the final text output before sending it to the frontend.
        """
        return LantawFormatter.clean_text(raw_text)

# Example usage (can be removed later):
if __name__ == "__main__":
    sample_raw = "Here is the response:\n\n\n\n**Item 1**   \n\n\n**Item 2**"
    print("Cleaned Output:")
    print(repr(LantawFormatter.format_final_output(sample_raw)))
