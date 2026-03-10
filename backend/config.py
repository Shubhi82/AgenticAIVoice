import os
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

PUBLIC_URL = os.getenv("PUBLIC_URL", "http://localhost:8000")

DATABASE_PATH  = os.getenv("DATABASE_PATH", "data/customers.db")
CSV_UPLOAD_DIR = os.getenv("CSV_UPLOAD_DIR", "data/uploads")
EMI_DUE_DAYS   = int(os.getenv("EMI_DUE_DAYS", "3"))
