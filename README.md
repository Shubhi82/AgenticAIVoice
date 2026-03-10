# 📞 EMI Reminder Voice Agent — Agentic AI

> A real **phone-calling AI agent** that automatically calls customers,
> delivers EMI reminders via voice, understands their response using AI,
> and decides the next action — all autonomously.

---

## 🏗️ Architecture

```
Customer Dataset (CSV/Kaggle)
        │
        ▼
   ┌─────────────┐
   │  Dashboard   │  ← React UI
   │  (Frontend)  │
   └──────┬───────┘
          │ REST API
          ▼
   ┌─────────────────────────────────────────┐
   │            FastAPI Backend               │
   │                                         │
   │  /api/call/{id}  →  Twilio API          │
   │  /twiml/greeting  ← Twilio webhook      │
   │  /twiml/handle_response                 │
   └─────────┬───────────────────────────────┘
             │
    ┌────────┼────────────┐
    ▼        ▼            ▼
 Twilio   LangChain    SQLite DB
(calls)   +Groq AI    (customers)
    │        │
    ▼        ▼
Customer  Decision
 Phone    Engine
          │
    ┌─────┴──────────────────┐
    │ PAYMENT_PROMISED        │ → update DB
    │ NEED_EXTENSION         │ → notify team
    │ REFUSED                │ → escalate
    │ ESCALATE_HUMAN         │ → human agent
    │ NO_ANSWER              │ → retry call
    └────────────────────────┘
```

---

## 🔄 The Agentic Loop

```
OBSERVE          REASON           ACT            UPDATE
  │                │               │               │
Load DB  →   Who to call?  →  Make call  →  Log outcome
Check EMI     Risk score        Twilio        Next step
due dates     AI decides       webhook       Schedule
```

---

## 🛠️ Tech Stack (All Free)

| Layer             | Tool              | Why                             |
|-------------------|-------------------|---------------------------------|
| Frontend          | React + Vite      | Fast UI                         |
| Backend           | FastAPI + Uvicorn | Python async API                |
| AI Decision       | LangChain + Groq  | Free LLM (llama-3.1-8b)        |
| Phone Calls       | Twilio            | Real outbound calls             |
| Speech-to-Text    | Twilio built-in   | Free with calls (no Whisper!)   |
| Text-to-Speech    | Twilio Polly      | Natural Indian English voice    |
| Local TTS preview | gTTS              | Python 3.12 compatible          |
| STT (testing)     | OpenAI Whisper    | Upload audio for testing        |
| Database          | SQLite            | Zero setup for dev              |
| Scheduler         | APScheduler       | Daily auto-call loop            |

---

## 🚀 Setup Guide (Step by Step)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/voice-agent-ai
cd voice-agent-ai
```

### 2. Get FREE API keys

**Twilio (for real phone calls)**
1. Go to https://www.twilio.com/try-twilio
2. Sign up → free trial gives $15 credit
3. Console → Account Info → copy:
   - Account SID
   - Auth Token
4. Phone Numbers → Get a number (free with trial)

**Groq (for AI decisions)**
1. Go to https://console.groq.com
2. Sign up free → API Keys → Create key

**ngrok (to expose local backend to Twilio)**
1. Go to https://ngrok.com → sign up free
2. Install: `brew install ngrok` or download from site

### 3. Configure .env

```bash
cp .env.example .env
# Fill in your Twilio + Groq keys
```

### 4. Install backend

```bash
# In Codespaces / terminal
pip install -r requirements.txt
sudo apt install ffmpeg -y   # for Whisper
```

### 5. Start the backend

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Expose backend publicly (Twilio needs this)

**If local:**
```bash
# New terminal
ngrok http 8000
# Copy the https URL → paste into PUBLIC_URL in .env
```

**If Codespaces:**
- Go to PORTS tab → Port 8000 → Make Public → Copy URL

### 7. Load sample data

```bash
# Open browser: http://localhost:8000/docs
# POST /api/load-sample  → Execute
```

### 8. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📞 Making a Real Test Call

1. Add your own phone number to `data/customers_sample.csv`
2. Load the sample data (`POST /api/load-sample`)
3. Go to Customers tab in UI
4. Click **📞 Call** next to your entry
5. Your phone rings within seconds!
6. Speak a response → AI processes it → logs the decision

---

## 📊 What the Dashboard Shows

- Total customers in system
- EMI due this week
- Calls made today
- Payments promised (AI-classified)
- High-risk customers

---

## 🗂️ Kaggle Datasets That Work

Upload any CSV that contains customer + payment data.
Good datasets from Kaggle:
- **Give Me Some Credit** (credit risk)
- **Home Credit Default Risk**
- **Bank Marketing Dataset**
- **Lending Club Loan Data**

Map the columns to: `customer_id, name, phone, emi_amount, emi_due_date`

---

## 🔧 Project Structure

```
voice-agent-ai/
├── backend/
│   ├── main.py          ← FastAPI app + all routes + Twilio webhooks
│   ├── agent.py         ← LangChain + Groq AI decision engine
│   ├── voice_call.py    ← Twilio calling + TwiML builders
│   ├── database.py      ← SQLite customer store
│   ├── stt.py           ← Whisper STT (for test uploads)
│   ├── tts.py           ← gTTS browser preview
│   ├── scheduler.py     ← APScheduler daily call loop
│   └── config.py        ← Environment settings
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── pages/Dashboard.jsx
│       ├── components/CustomerTable.jsx
│       ├── components/VoiceTest.jsx
│       ├── components/CallLogs.jsx
│       ├── components/UploadData.jsx
│       └── services/apiService.js
├── data/
│   └── customers_sample.csv
├── requirements.txt     ← Python 3.12 compatible ✅
├── .env.example
└── README.md
```

---

## 🚀 Deploy to Production (Free)

**Backend → Render**
1. Push to GitHub
2. render.com → New Web Service → Connect repo
3. Add environment variables from .env
4. Deploy → copy URL → update PUBLIC_URL

**Frontend → Vercel**
1. vercel.com → Import → Connect GitHub repo → `/frontend` folder
2. Add `VITE_API_URL=https://your-render-url.com`
3. Deploy

---

## 📈 What Makes This Truly Agentic

| Feature                | Simple Bot | This Agent |
|------------------------|-----------|------------|
| Follows fixed script   | ✅        | ✅         |
| Understands free speech| ❌        | ✅ (LLM)   |
| Decides next action    | ❌        | ✅         |
| Updates database       | ❌        | ✅         |
| Schedules follow-ups   | ❌        | ✅         |
| Escalates to human     | ❌        | ✅         |
| Runs automatically     | ❌        | ✅ (cron)  |

---

## 🔮 Upgrade Path

Once this works, extend it:

1. **Multi-agent** (CrewAI) — one agent calls, another decides, third escalates
2. **Vector memory** (Chroma) — remember past conversations with each customer
3. **WhatsApp fallback** (Twilio) — if call fails, send WhatsApp
4. **ML risk model** (scikit-learn) — predict who will default
5. **n8n workflows** — no-code automation for escalations
