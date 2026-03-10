import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from contextlib import asynccontextmanager
import logging

from database import (init_db, import_csv, get_all_customers, get_due_customers,
                      get_customer, update_call_status, log_call, get_call_logs, get_stats)
from agent import decide_action, generate_response, determine_next_action
from voice_call import make_call, twiml_greeting, twiml_follow_up, twiml_voicemail
from stt import transcribe_bytes
from tts import text_to_speech_base64, preview_script
from scheduler import start_scheduler, stop_scheduler, trigger_manual_run
from config import CSV_UPLOAD_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
os.makedirs(CSV_UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(title="EMI Reminder Voice Agent", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root():
    return {"status": "running", "message": "EMI Reminder Voice Agent API", "docs": "/docs"}

@app.get("/api/customers")
def list_customers():
    return {"customers": get_all_customers()}

@app.get("/api/customers/due")
def list_due_customers():
    return {"customers": get_due_customers()}

@app.get("/api/customers/stats")
def customer_stats():
    return get_stats()

@app.get("/api/customers/{customer_id}")
def get_one_customer(customer_id: str):
    customer = get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files supported")
    save_path = os.path.join(CSV_UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        result = import_csv(save_path)
        return {"success": True, "filename": file.filename, **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/load-sample")
def load_sample_data():
    sample_path = "data/customers_sample.csv"
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample data not found")
    result = import_csv(sample_path)
    return {"success": True, **result}

@app.post("/api/call/{customer_id}")
def trigger_call(customer_id: str):
    customer = get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    result = make_call(customer_id, customer["phone"])
    if result["success"]:
        update_call_status(customer_id, "calling")
        log_call(customer_id, result["call_sid"], "", "initiated", "call_placed")
        return {"success": True, "call_sid": result["call_sid"], "status": result["status"]}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Call failed"))

@app.post("/api/call/manual-run")
async def manual_call_run():
    await trigger_manual_run()
    return {"success": True, "message": "Manual run triggered"}

@app.get("/api/call/logs")
def get_logs(customer_id: str = None):
    return {"logs": get_call_logs(customer_id)}

@app.post("/api/test/voice")
async def test_voice_agent(customer_id: str = Form(...), file: UploadFile = File(...)):
    customer = get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    audio_bytes = await file.read()
    suffix = "." + file.filename.split(".")[-1]
    try:
        transcript = transcribe_bytes(audio_bytes, suffix=suffix)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    decision    = decide_action(transcript, customer)
    response    = generate_response(decision, customer)
    next_action = determine_next_action(decision)
    try:
        audio_b64 = text_to_speech_base64(response)
    except Exception:
        audio_b64 = None
    return {"transcript": transcript, "decision": decision,
            "agent_response": response, "next_action": next_action, "audio_base64": audio_b64}

@app.post("/api/test/text")
async def test_text_input(customer_id: str = Form(...), text: str = Form(...)):
    customer = get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    decision    = decide_action(text, customer)
    response    = generate_response(decision, customer)
    next_action = determine_next_action(decision)
    try:
        audio_b64 = text_to_speech_base64(response)
    except Exception:
        audio_b64 = None
    return {"input_text": text, "decision": decision,
            "agent_response": response, "next_action": next_action, "audio_base64": audio_b64}

@app.get("/api/preview/{customer_id}")
def preview_call(customer_id: str):
    customer = get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    try:
        audio_b64 = preview_script(customer)
        return {"audio_base64": audio_b64, "customer": customer["name"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/twiml/greeting")
async def twiml_greeting_webhook(request: Request, customer_id: str):
    customer = get_customer(customer_id)
    if not customer:
        return Response(content="<Response><Say>Thank you. Goodbye.</Say></Response>", media_type="application/xml")
    form_data   = await request.form()
    answered_by = form_data.get("AnsweredBy", "human")
    if answered_by == "machine_start":
        xml = twiml_voicemail(customer["name"], customer["emi_amount"], customer["emi_due_date"])
        update_call_status(customer_id, "voicemail")
    else:
        xml = twiml_greeting(customer["name"], customer["emi_amount"], customer["emi_due_date"], customer_id)
        update_call_status(customer_id, "in_call")
    return Response(content=xml, media_type="application/xml")

@app.post("/twiml/handle_response")
async def handle_customer_response(request: Request, customer_id: str, retry: bool = False):
    customer  = get_customer(customer_id)
    form_data = await request.form()
    speech_result = form_data.get("SpeechResult", "")
    call_sid      = form_data.get("CallSid", "")
    if not customer:
        return Response(content="<Response><Say>Thank you. Goodbye.</Say></Response>", media_type="application/xml")
    decision    = decide_action(speech_result, customer)
    response    = generate_response(decision, customer)
    next_action = determine_next_action(decision)
    update_call_status(customer_id, "called", speech_result, decision)
    log_call(customer_id, call_sid, speech_result, decision, next_action["db_status"])
    xml = twiml_follow_up(response, decision, customer_id)
    return Response(content=xml, media_type="application/xml")

@app.post("/twiml/status")
async def call_status_update(request: Request, customer_id: str):
    form_data   = await request.form()
    call_status = form_data.get("CallStatus", "unknown")
    call_sid    = form_data.get("CallSid", "")
    if call_status in ("no-answer", "busy"):
        update_call_status(customer_id, "no_answer")
        log_call(customer_id, call_sid, "", "NO_ANSWER", call_status)
    elif call_status == "failed":
        update_call_status(customer_id, "call_failed")
        log_call(customer_id, call_sid, "", "FAILED", "call_failed")
    return JSONResponse({"received": True})
```

---

## 1️⃣2️⃣ `data/customers_sample.csv`
```
