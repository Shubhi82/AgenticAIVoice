import os
import tempfile
import base64
from gtts import gTTS

def text_to_speech_file(text: str, output_path: str = None, lang: str = "en") -> str:
    if output_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        output_path = tmp.name
        tmp.close()
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(output_path)
    return output_path

def text_to_speech_base64(text: str, lang: str = "en") -> str:
    path = text_to_speech_file(text, lang=lang)
    try:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    finally:
        os.unlink(path)

def preview_script(customer: dict) -> str:
    first_name = customer.get("name", "Customer").split()[0]
    amount     = customer.get("emi_amount", 0)
    date       = customer.get("emi_due_date", "")
    script = (
        f"Hello {first_name}! This is an automated reminder from your loan provider. "
        f"Your EMI payment of Rupees {int(amount)} is due on {date}. "
        f"Please say yes to confirm payment, or say no if you need more time."
    )
    return text_to_speech_base64(script)
