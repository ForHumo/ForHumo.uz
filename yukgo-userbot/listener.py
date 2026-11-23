from telethon import TelegramClient, events
import requests
import hashlib
import logging

logging.basicConfig(level=logging.INFO)

API_ID = 8278693978  # my.telegram.org saytidan olinadi
API_HASH = 'your_api_hash_here'
BACKEND_ENDPOINT = "https://www.forhumo.uz/api/v1/yukgo/ingest" # yoki https://yukgo.com/api/...
API_SECRET_KEY = "yukgo_secret_key_123"

# Ban'dan saqlanish uchun Telegram serverlariga Windows 11 Desktop ilovasi bo'lib ko'rinamiz
client = TelegramClient(
    'yukgo_user_session',
    API_ID,
    API_HASH,
    device_model="Desktop PC",
    system_version="Windows 11",
    app_version="4.16.2",
    lang_code="en"
)

# Takroriy e'lonlarni ushlab qolish uchun kesh (Deduplication)
processed_hashes = set()

def get_text_hash(text):
    return hashlib.md5(text.strip().lower().encode('utf-8')).hexdigest()

@client.on(events.NewMessage)
async def handle_new_message(event):
    # Faqat guruh va kanallarni eshitamiz, shaxsiy yozishmalarni emas
    if not (event.is_group or event.is_channel):
        return

    text = event.message.message
    if not text or len(text) < 10:
        return

    # Takroriy xabarlarni filtrlash
    text_hash = get_text_hash(text)
    if text_hash in processed_hashes:
        return
    
    processed_hashes.add(text_hash)
    # Kesh juda kattalashib ketmasligi uchun tozalab turamiz
    if len(processed_hashes) > 5000:
        processed_hashes.clear()

    # Backend serveringizga yuboriladigan payload
    payload = {
        "text": text,
        "chat_id": event.chat_id,
        "message_id": event.message.id,
        "date": str(event.message.date)
    }

    headers = {
        "X-YukGo-Key": API_SECRET_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(BACKEND_ENDPOINT, json=payload, headers=headers, timeout=5)
        if response.status_code == 200:
            logging.info(f"Qabul qilindi: Chat ID {event.chat_id}")
    except Exception as e:
        logging.error(f"Backendga yuborishda xatolik: {e}")

print("Userbot ishga tushdi...")
client.start()
client.run_until_disconnected()