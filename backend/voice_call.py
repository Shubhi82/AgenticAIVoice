from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.base.exceptions import TwilioRestException
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, PUBLIC_URL

def get_twilio_client():
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise ValueError("Twilio credentials not set. Add to .env file. Free trial at https://www.twilio.com/try-twilio")
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def make_call(customer_id: str, to_phone: str) -> dict:
    client = get_twilio_client()
    try:
        call = client.calls.create(
            to=to_phone,
            from_=TWILIO_PHONE_NUMBER,
            url=f"{PUBLIC_URL}/twiml/greeting?customer_id={customer_id}",
            method="POST",
            status_callback=f"{PUBLIC_URL}/twiml/status?customer_id={customer_id}",
            status_callback_method="POST",
            timeout=30,
            machine_detection="Enable",
        )
        return {"success": True, "call_sid": call.sid, "status": call.status, "to": to_phone}
    except TwilioRestException as e:
        return {"success": False, "error": str(e), "to": to_phone}

def twiml_greeting(customer_name: str, emi_amount: float, due_date: str, customer_id: str) -> str:
    first_name = customer_name.split()[0]
    resp = VoiceResponse()
    with resp.gather(
        input="speech",
        action=f"{PUBLIC_URL}/twiml/handle_response?customer_id={customer_id}",
        method="POST",
        speechTimeout="3",
        language="en-IN",
        enhanced=True,
    ) as gather:
        gather.say(
            f"Hello {first_name}! This is an automated reminder from your loan provider. "
            f"Your EMI payment of Rupees {int(emi_amount)} is due on {due_date}. "
            f"Please say yes to confirm you will make the payment, or say no if you need more time.",
            voice="Polly.Aditi",
            language="en-IN",
        )
    resp.say("We did not receive a response. We will try again later. Goodbye.", voice="Polly.Aditi", language="en-IN")
    return str(resp)

def twiml_follow_up(agent_response: str, decision: str, customer_id: str) -> str:
    resp = VoiceResponse()
    if decision in ("UNCLEAR", "NO_ANSWER"):
        with resp.gather(
            input="speech",
            action=f"{PUBLIC_URL}/twiml/handle_response?customer_id={customer_id}&retry=true",
            method="POST",
            speechTimeout="3",
            language="en-IN",
        ) as gather:
            gather.say(agent_response, voice="Polly.Aditi", language="en-IN")
    else:
        resp.say(agent_response, voice="Polly.Aditi", language="en-IN")
        resp.say("Thank you. Goodbye.", voice="Polly.Aditi", language="en-IN")
        resp.hangup()
    return str(resp)

def twiml_voicemail(customer_name: str, emi_amount: float, due_date: str) -> str:
    first_name = customer_name.split()[0]
    resp = VoiceResponse()
    resp.pause(length=2)
    resp.say(
        f"Hello {first_name}, this is an automated EMI reminder. "
        f"Your payment of Rupees {int(emi_amount)} is due on {due_date}. "
        f"Please make the payment or call us back. Thank you.",
        voice="Polly.Aditi", language="en-IN",
    )
    return str(resp)

def get_call_status(call_sid: str) -> dict:
    try:
        client = get_twilio_client()
        call = client.calls(call_sid).fetch()
        return {"status": call.status, "duration": call.duration}
    except Exception as e:
        return {"status": "unknown", "error": str(e)}
