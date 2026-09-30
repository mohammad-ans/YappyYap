# from database import Base, engine, session, Email_signin, NewsLetter, Email_signup, OTP_entry, Users,Pending_users, Msgs, VoiceMsgs, Home_comp

# Base.metadata.create_all(bind=engine)
# db = session()
# db.query(Users).delete()
# db.query(OTP_entry).delete()
# db.commit()
# OTP_entry.__table__.drop(engine)
# Users.__table__.drop(engine)
# NewsLetter.__table__.drop(engine)
# Pending_users.__table__.drop(engine)
# Msgs.__table__.drop(engine)
# VoiceMsgs.__table__.drop(engine)
# Home_comp.__table__.drop(engine)
# db.close()
# from coolname import generate_slug, generate
# for i in range(100):
#     print(generate_slug(2))

# from datetime import datetime, timezone
a = {"a": None, "b": None}
b = {key: val for key, val in a.items() if val is not None}
print(len(b) == 0)