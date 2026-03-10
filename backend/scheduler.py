from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import asyncio
import logging
from database import get_due_customers, update_call_status, log_call
from voice_call import make_call
from config import TWILIO_ACCOUNT_SID

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def run_daily_reminders():
    logger.info(f"[{datetime.now()}] Starting daily EMI reminder run...")
    if not TWILIO_ACCOUNT_SID:
        logger.warning("Twilio not configured. Dry run mode.")
        customers = get_due_customers()
        for c in customers:
            logger.info(f"  [DRY RUN] Would call {c['name']} at {c['phone']}")
        return
    customers = get_due_customers()
    call_count = 0
    for customer in customers:
        if customer.get("call_status") in ("called", "payment_promised"):
            continue
        result = make_call(customer["customer_id"], customer["phone"])
        if result["success"]:
            update_call_status(customer["customer_id"], "calling")
            log_call(customer["customer_id"], result["call_sid"], "", "initiated", "call_placed")
            call_count += 1
            await asyncio.sleep(2)
        else:
            logger.error(f"Call failed for {customer['name']}: {result.get('error')}")
    logger.info(f"Daily run complete. {call_count} calls placed.")

def start_scheduler():
    scheduler.add_job(run_daily_reminders, trigger=CronTrigger(hour=10, minute=0),
                      id="daily_emi_reminders", replace_existing=True)
    scheduler.start()

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()

async def trigger_manual_run():
    await run_daily_reminders()
