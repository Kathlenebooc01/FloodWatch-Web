import json
import re

class LantawTableFormatting:
    """
    Utility class to instruct the Lantaw AI on how to format tabular data and Shadcn Charts.
    """

    @staticmethod
    def get_chart_instructions() -> str:
        """
        Returns the system prompt instructing the AI to output valid JSON configurations for Shadcn Charts.
        Enforces the restriction of ONLY using Area, Pie, and Bar charts.
        """
        return (
            "\\n\\n--- VISUALIZATION FORMAT INSTRUCTIONS ---\\n"
            "If the user requests data visualization, charts, or graphs, you MUST return a RAW JSON object. "
            "Do NOT include markdown formatting, markdown code blocks (```json), or conversational text.\\n\\n"
            "You are RESTRICTED to ONLY the following chart types: 'bar', 'area', or 'pie'.\\n\\n"
            "The JSON must strictly follow this structure so the frontend Shadcn components can digest it directly:\\n"
            "{\\n"
            "  \"visualization\": \"chart\",\\n"
            "  \"type\": \"<chart_type>\", // MUST be 'bar', 'area', or 'pie'\\n"
            "  \"title\": \"<Chart Title>\",\\n"
            "  \"description\": \"<Brief description of the trend>\",\\n"
            "  \"chart_config\": {\\n"
            "      // Define chart colors and labels here (matching Shadcn ChartConfig)\\n"
            "      \"<dataKey>\": { \"label\": \"<Label Name>\", \"color\": \"hsl(var(--chart-1))\" }\\n"
            "  },\\n"
            "  \"chart_data\": [\\n"
            "      // For 'bar' or 'area': objects must contain an X-axis label key (e.g., 'month') and numerical dataKey values.\\n"
            "      // For 'pie': objects must contain 'name' (string), 'value' (number), and 'fill' (color string).\\n"
            "      { \"label\": \"Category 1\", \"<dataKey>\": 150 }\\n"
            "  ]\\n"
            "}\\n"
        )

    @staticmethod
    def get_table_instructions() -> str:
        """
        Returns the system instruction prompt for formatting standard data tables.
        """
        return (
            "\\n\\n--- TABLE FORMAT INSTRUCTIONS ---\\n"
            "If the user requests a table without specifying a chart, return the data in a RAW JSON object representing the table. "
            "Do NOT use markdown tables. Do NOT include conversational text.\\n\\n"
            "The JSON must strictly follow this structure:\\n"
            "{\\n"
            "  \"visualization\": \"table\",\\n"
            "  \"title\": \"<Table Title>\",\\n"
            "  \"columns\": [\"Column 1\", \"Column 2\", \"Column 3\"],\\n"
            "  \"rows\": [\\n"
            "      [\"Row 1 Data 1\", \"Row 1 Data 2\", \"Row 1 Data 3\"],\\n"
            "      [\"Row 2 Data 1\", \"Row 2 Data 2\", \"Row 2 Data 3\"]\\n"
            "  ]\\n"
            "}\\n"
        )

    @staticmethod
    def parse_visualization_data(text: str):
        """
        Safely extracts the JSON visualization payload from the AI's response.
        Useful for intercepting the response before passing it to the frontend Shadcn components.
        """
        if not text:
            return None
            
        try:
            # Fallback: Strip markdown code blocks if the AI accidentally adds them despite instructions
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
            json_str = match.group(1) if match else text
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error for Table/Chart data: {e}")
            return None
