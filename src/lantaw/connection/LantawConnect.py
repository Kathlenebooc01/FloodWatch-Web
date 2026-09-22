import os
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Resolve path to the .env.local file at the root of the project
# This file is located at src/lantaw/connection/LantawConnect.py
env_path = Path(__file__).resolve().parent.parent.parent.parent / '.env.local'

# Load environment variables
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_LANTAW_AI")
MODEL_NAME = os.getenv("GEMINI_LANTAW_MODEL", "GEMINI_LANTAW_BACKUP_MODEL")

if not API_KEY:
    raise ValueError("GEMINI_LANTAW_AI environment variable is not set. Please check your .env.local file.")

# Configure the Gemini API client
genai.configure(api_key=API_KEY)

# Initialize the model instance
model = genai.GenerativeModel(MODEL_NAME)

def get_lantaw_model():
    """
    Returns the configured GenerativeModel instance for Lantaw AI.
    """
    return model

def generate_response(prompt: str) -> str:
    """
    A helper function to generate a response from the model based on a prompt.
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating response: {e}"

if __name__ == "__main__":
    # Simple test to verify connection
    print(f"Testing connection using model: {MODEL_NAME}...")
    test_prompt = "Say hello and confirm you are connected."
    result = generate_response(test_prompt)
    print(f"Response:\\n{result}")
