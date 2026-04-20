from dotenv import load_dotenv
import httpx
import os
load_dotenv()

api_key = os.getenv("API_KEY")
email = os.getenv("EMAIL")

async def send_otp(email_receiver, random_otp):
    url = "https://api.resend.com/emails"
    header = {
        "Authorization" : f"Bearer {api_key}",
        "Content-Type" : "application/json"
    }
    body = {
        "from" : email,
        "to" : email_receiver,
        "subject" : "OTP for YappyYap Login",
        "html" : f"<h2>Your OTP is: {random_otp}</h2><p>Do Not share your OTP with anyone.</p>"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=body, headers=header)
        return response.status_code