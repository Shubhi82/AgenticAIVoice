from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from config import GROQ_API_KEY

PAYMENT_PROMISED = "PAYMENT_PROMISED"
NEED_EXTENSION   = "NEED_EXTENSION"
REFUSED          = "REFUSED"
ESCALATE_HUMAN   = "ESCALATE_HUMAN"
UNCLEAR          = "UNCLEAR"
NO_ANSWER        = "NO_ANSWER"

VALID_DECISIONS = {PAYMENT_PROMISED, NEED_EXTENSION, REFUSED, ESCALATE_HUMAN, UNCLEAR, NO_ANSWER}

def rule_based_decision(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["pay tomorrow", "will pay", "paying", "paid", "transfer"]):
        return PAYMENT_PROMISED
    if any(w in t for w in ["extension", "more time", "delay", "later", "next month"]):
        return NEED_EXTENSION
    if any(w in t for w in ["cannot", "won't", "not paying", "refuse", "lost job"]):
        return NEED_EXTENSION
    if any(w in t for w in ["manager", "supervisor", "human", "person"]):
        return ESCALATE_HUMAN
    if not text.strip():
        return NO_ANSWER
    return UNCLEAR

DECISION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an EMI collection assistant for a loan company.
A customer just spoke on a phone call. Analyze their response and return EXACTLY ONE label:

PAYMENT_PROMISED   - customer confirmed they will pay
NEED_EXTENSION     - customer asked for more time
REFUSED            - customer explicitly refused
ESCALATE_HUMAN     - customer wants a manager or situation is complex
NO_ANSWER          - customer did not speak
UNCLEAR            - doesn't fit other categories

Customer context:
- Name: {customer_name}
- EMI Amount: {emi_amount}
- Due Date: {due_date}
- Missed Payments: {missed_payments}
- Risk Score: {risk_score}/1.0

Customer said: "{customer_response}"

Return only the label."""),
    ("human", "What is the decision?")
])

RESPONSE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a professional, empathetic EMI reminder voice agent.
Generate a short spoken response (2-3 sentences max). Be polite and clear.
No markdown or special characters.

Customer: {customer_name}
EMI: {emi_amount} due on {due_date}
Decision: {decision}

Generate the response now."""),
    ("human", "Generate voice response.")
])

def get_llm():
    if not GROQ_API_KEY:
        return None
    try:
        return ChatGroq(api_key=GROQ_API_KEY, model="llama-3.1-8b-instant",
                        temperature=0.1, max_tokens=200)
    except Exception:
        return None

def decide_action(customer_response: str, customer: dict) -> str:
    if not GROQ_API_KEY:
        return rule_based_decision(customer_response)
    llm = get_llm()
    if not llm:
        return rule_based_decision(customer_response)
    try:
        chain = DECISION_PROMPT | llm | StrOutputParser()
        result = chain.invoke({
            "customer_name":     customer.get("name", "Customer"),
            "emi_amount":        customer.get("emi_amount", 0),
            "due_date":          customer.get("emi_due_date", ""),
            "missed_payments":   customer.get("missed_payments", 0),
            "risk_score":        customer.get("risk_score", 0),
            "customer_response": customer_response,
        })
        decision = result.strip().upper()
        return decision if decision in VALID_DECISIONS else rule_based_decision(customer_response)
    except Exception:
        return rule_based_decision(customer_response)

def generate_response(decision: str, customer: dict) -> str:
    name   = customer.get("name", "Customer").split()[0]
    amount = customer.get("emi_amount", 0)
    date   = customer.get("emi_due_date", "")
    templates = {
        PAYMENT_PROMISED: f"Thank you {name}! We have noted your payment commitment. Please ensure the EMI of rupees {int(amount)} is paid by {date}.",
        NEED_EXTENSION:   f"I understand {name}. Our team will reach out to discuss a suitable arrangement. Please expect a call shortly.",
        REFUSED:          f"{name}, we understand your situation. Please note that missed payments may affect your credit score. Our team will be in touch.",
        ESCALATE_HUMAN:   f"Of course {name}. I will connect you with a senior specialist who can better assist you. Expect a call within a few hours.",
        NO_ANSWER:        f"Hello {name}, this is a reminder that your EMI of rupees {int(amount)} is due on {date}. Please call us back. Thank you.",
        UNCLEAR:          f"Thank you {name}. To confirm, are you able to make the payment of rupees {int(amount)} by {date}?",
    }
    if not GROQ_API_KEY:
        return templates.get(decision, templates[UNCLEAR])
    llm = get_llm()
    if not llm:
        return templates.get(decision, templates[UNCLEAR])
    try:
        chain = RESPONSE_PROMPT | llm | StrOutputParser()
        return chain.invoke({"customer_name": name, "emi_amount": amount,
                             "due_date": date, "decision": decision}).strip()
    except Exception:
        return templates.get(decision, templates[UNCLEAR])

def determine_next_action(decision: str) -> dict:
    actions = {
        PAYMENT_PROMISED: {"action": "update_db_and_wait",       "db_status": "payment_promised", "follow_up": "3_days",    "notify_team": False},
        NEED_EXTENSION:   {"action": "schedule_human_callback",  "db_status": "needs_extension",  "follow_up": "1_day",     "notify_team": True},
        REFUSED:          {"action": "escalate_immediately",     "db_status": "refused",          "follow_up": "immediate", "notify_team": True},
        ESCALATE_HUMAN:   {"action": "escalate_immediately",     "db_status": "escalated",        "follow_up": "immediate", "notify_team": True},
        NO_ANSWER:        {"action": "retry_call",               "db_status": "no_answer",        "follow_up": "2_hours",   "notify_team": False},
        UNCLEAR:          {"action": "retry_with_clarification", "db_status": "unclear",          "follow_up": "1_day",     "notify_team": False},
    }
    return actions.get(decision, actions[UNCLEAR])
