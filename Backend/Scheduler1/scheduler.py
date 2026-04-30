from datetime import datetime, timezone
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from database import session_text, session_voice, session_personalchat, Msgs, VoiceMsgs, PersonalMsgs, GroupInvite
from sqlalchemy import delete
import sys
import signal
from pytz import utc
def del_job():
    try:
        db_text = session_text()
        db_voice = session_voice()
        db_personalchat = session_personalchat()
        db_text.execute(delete(Msgs).where(Msgs.expiry < datetime.now(timezone.utc)))
        db_voice.execute(delete(VoiceMsgs).where(VoiceMsgs.expiry < datetime.now(timezone.utc)))
        db_personalchat.execute(delete(PersonalMsgs).where(PersonalMsgs.defaultExpiration < datetime.now(timezone.utc)))
        db_personalchat.execute(delete(PersonalMsgs).where(PersonalMsgs.defaultExpiration < datetime.now(timezone.utc)))
        db_text.commit()
        db_voice.commit()
        db_personalchat.commit()
        db_text.close()
        db_voice.close()
        db_personalchat.close()
    except:
        pass

executors = {
    "default" : ThreadPoolExecutor(1)
}

def shutdown(signum, frame):
    print("stopping..")
    scheduler.shutdown(wait=True)
    sys.exit(0)
signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

scheduler = BlockingScheduler(executors=executors, timezone=utc)
scheduler.add_job(del_job, 'interval', seconds=10)
try:
    scheduler.start()
except (KeyboardInterrupt, SystemExit):
    print("stoping vro..")