import os
from pathlib import Path
from dotenv import load_dotenv

try:
    from supabase import create_client, Client
except ImportError:
    raise ImportError("The 'supabase' package is not installed. Please run: pip install supabase")

# Resolve path to the .env.local file
env_path = Path(__file__).resolve().parent.parent.parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
# Use Service Role Key for backend administrative read access if available, else Anon Key
SUPABASE_KEY = os.getenv("NEXT_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and key) not found in .env.local")

# Initialize the Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class LantawSources:
    """
    Utility class that acts as the read-only data crawler for Lantaw AI.
    It fetches data from the FloodWatch Supabase database securely to provide context to the model.
    """

    @staticmethod
    def get_pdrrmo_inventory(limit: int = 50):
        """Fetches the PDRRMO inventory data."""
        try:
            response = supabase.table('pdrrmo_inventory').select('*').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error crawling pdrrmo_inventory: {e}")
            return []

    @staticmethod
    def get_weather_telemetry(limit: int = 50):
        """Fetches recent observation feeds data, ordered by the latest fetch time."""
        try:
            response = supabase.table('weather_telemetry').select('*').order('fetched_at', desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error crawling weather_telemetry: {e}")
            return []

    @staticmethod
    def get_incident_reports(limit: int = 50):
        """Fetches recent incident reports."""
        try:
            response = supabase.table('incident_report').select('*').order('created_at', desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error crawling incident_report: {e}")
            return []

    @staticmethod
    def get_air_quality(limit: int = 50):
        """Fetches recent air quality readings."""
        try:
            response = supabase.table('air_quality').select('*').order('recorded_at', desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error crawling air_quality: {e}")
            return []

    @staticmethod
    def get_distress_signals(limit: int = 50):
        """Fetches recent distress signals."""
        try:
            response = supabase.table('distress_signals').select('*').order('created_at', desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error crawling distress_signals: {e}")
            return []

    @staticmethod
    def get_utilities(limit: int = 50):
        """Fetches registered utilities and equipment."""
        try:
            response = supabase.table('utilities').select('*').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error crawling utilities: {e}")
            return []

    @staticmethod
    def get_all_context_summary() -> dict:
        """
        Convenience method that crawls all relevant tables to build a comprehensive 
        snapshot of the current system state. This dictionary can be converted to a JSON 
        string and fed directly into the LantawPrompt context_data parameter.
        """
        return {
            "pdrrmo_inventory_snapshot": LantawSources.get_pdrrmo_inventory(limit=15),
            "recent_weather": LantawSources.get_weather_telemetry(limit=10),
            "recent_incidents": LantawSources.get_incident_reports(limit=10),
            "recent_air_quality": LantawSources.get_air_quality(limit=10),
            "active_distress_signals": LantawSources.get_distress_signals(limit=10),
            "utilities_snapshot": LantawSources.get_utilities(limit=15)
        }
