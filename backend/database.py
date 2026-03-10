import sqlite3
import os
from datetime import datetime, timedelta
from typing import List, Optional
import pandas as pd
from config import DATABASE_PATH, EMI_DUE_DAYS

os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id       TEXT PRIMARY KEY,
            name              TEXT NOT NULL,
            phone             TEXT NOT NULL,
            email             TEXT,
            loan_amount       REAL,
            emi_amount        REAL,
            emi_due_date      TEXT,
            last_payment_date TEXT,
            missed_payments   INTEGER DEFAULT 0,
            risk_score        REAL DEFAULT 0.0,
            status            TEXT DEFAULT 'pending',
            call_status       TEXT DEFAULT 'not_called',
            last_call_at      TEXT,
            customer_response TEXT,
            agent_decision    TEXT,
            notes             TEXT,
            created_at        TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS call_logs (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id  TEXT,
            call_sid     TEXT,
            called_at    TEXT,
            duration_sec INTEGER,
            transcript   TEXT,
            decision     TEXT,
            outcome      TEXT,
            created_at   TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()

def import_csv(filepath: str) -> dict:
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip().str.lower()
    required = {"customer_id", "name", "phone", "emi_amount", "emi_due_date"}
    if not required.issubset(set(df.columns)):
        raise ValueError(f"CSV must have columns: {required}")
    conn = get_conn()
    c = conn.cursor()
    imported, skipped = 0, 0
    for _, row in df.iterrows():
        try:
            c.execute("""
                INSERT OR REPLACE INTO customers
                  (customer_id, name, phone, email, loan_amount, emi_amount,
                   emi_due_date, last_payment_date, missed_payments, risk_score, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (
                str(row.get("customer_id", "")),
                str(row.get("name", "")),
                str(row.get("phone", "")),
                str(row.get("email", "")),
                float(row.get("loan_amount", 0)),
                float(row.get("emi_amount", 0)),
                str(row.get("emi_due_date", "")),
                str(row.get("last_payment_date", "")),
                int(row.get("missed_payments", 0)),
                float(row.get("risk_score", 0.0)),
                str(row.get("status", "pending")),
            ))
            imported += 1
        except Exception:
            skipped += 1
    conn.commit()
    conn.close()
    return {"imported": imported, "skipped": skipped}

def get_all_customers() -> List[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM customers ORDER BY risk_score DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_due_customers() -> List[dict]:
    today = datetime.today().date()
    limit = today + timedelta(days=EMI_DUE_DAYS)
    conn = get_conn()
    rows = conn.execute("""
        SELECT * FROM customers
        WHERE emi_due_date <= ?
          AND status NOT IN ('paid', 'cancelled')
        ORDER BY risk_score DESC
    """, (str(limit),)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_customer(customer_id: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM customers WHERE customer_id=?", (customer_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def update_call_status(customer_id: str, call_status: str,
                       response: str = "", decision: str = ""):
    conn = get_conn()
    conn.execute("""
        UPDATE customers
        SET call_status=?, customer_response=?,
            agent_decision=?, last_call_at=datetime('now')
        WHERE customer_id=?
    """, (call_status, response, decision, customer_id))
    conn.commit()
    conn.close()

def log_call(customer_id: str, call_sid: str, transcript: str,
             decision: str, outcome: str, duration: int = 0):
    conn = get_conn()
    conn.execute("""
        INSERT INTO call_logs
          (customer_id, call_sid, called_at, duration_sec, transcript, decision, outcome)
        VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
    """, (customer_id, call_sid, duration, transcript, decision, outcome))
    conn.commit()
    conn.close()

def get_call_logs(customer_id: str = None) -> List[dict]:
    conn = get_conn()
    if customer_id:
        rows = conn.execute(
            "SELECT * FROM call_logs WHERE customer_id=? ORDER BY called_at DESC",
            (customer_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM call_logs ORDER BY called_at DESC LIMIT 100"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_stats() -> dict:
    conn = get_conn()
    total     = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    due       = len(get_due_customers())
    called    = conn.execute("SELECT COUNT(*) FROM customers WHERE call_status='called'").fetchone()[0]
    promised  = conn.execute("SELECT COUNT(*) FROM customers WHERE agent_decision='PAYMENT_PROMISED'").fetchone()[0]
    high_risk = conn.execute("SELECT COUNT(*) FROM customers WHERE risk_score >= 0.7").fetchone()[0]
    conn.close()
    return {
        "total_customers":    total,
        "due_this_week":      due,
        "calls_made":         called,
        "payments_promised":  promised,
        "high_risk_count":    high_risk,
    }
