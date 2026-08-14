"""ForHumo Nexus — Agent webhook example (Python + FastAPI).

Barcha event turlari va javob shakllarini namoyish etadi.
Node.js versiyasi bilan xulqi bir xil.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request

API_KEY = os.environ.get("FORHUMO_AGENT_API_KEY", "")
REPLAY_WINDOW_SEC = 300  # +/- 5 daq

if not API_KEY:
    raise SystemExit("FORHUMO_AGENT_API_KEY .env ga qo'yilmagan")

app = FastAPI(title="forhumo-agent-python")


def verify_signature(body: bytes, timestamp: str | None, signature: str | None) -> bool:
    if not timestamp or not signature:
        return False
    try:
        ts = int(timestamp)
    except ValueError:
        return False
    if abs(int(time.time()) - ts) > REPLAY_WINDOW_SEC:
        return False
    mac = hmac.new(API_KEY.encode(), msg=f"{timestamp}.{body.decode('utf-8')}".encode(), digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected.encode(), signature.encode())


@app.get("/")
def health() -> dict[str, Any]:
    return {"ok": True, "name": "forhumo-agent-python"}


@app.post("/webhook")
async def webhook(
    request: Request,
    x_forhumo_timestamp: str | None = Header(None),
    x_forhumo_signature: str | None = Header(None),
    x_forhumo_event: str | None = Header(None),
) -> dict[str, Any]:
    body = await request.body()
    if not verify_signature(body, x_forhumo_timestamp, x_forhumo_signature):
        raise HTTPException(status_code=401, detail="invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid json") from exc

    frm = payload.get("from") or {}
    print(f"[{x_forhumo_event}] from @{frm.get('username') or frm.get('profileId')}: {payload.get('text') or payload.get('query') or '(media)'}")

    match x_forhumo_event:
        case "message.created":
            return handle_message(payload)
        case "callback.query":
            return handle_callback(payload)
        case "invoice.paid":
            return handle_invoice_paid(payload)
        case "inline.query":
            return handle_inline(payload)
        case "message.edited" | "message.deleted" | "message.pinned" | "message.unpinned":
            return {}
        case _:
            return {}


# --- Event handlerlar ---

def handle_message(p: dict[str, Any]) -> dict[str, Any]:
    text = (p.get("text") or "").strip()

    if text in ("/help", "help", "Help"):
        return {
            "text": "Salom! Buyruqlar:\n/echo <matn> — matnni takrorlash\n/buy — namunaviy to'lov\n/media — rasm yuborish",
            "buttons": [
                [{"text": "Sotib olish", "callbackData": "buy"}, {"text": "Media", "callbackData": "media"}],
                [{"text": "Sayt", "url": "https://forhumo.uz"}],
            ],
        }

    if text.startswith("/echo "):
        return {"text": text[6:]}

    if text == "/buy":
        return {
            "text": "To'lash uchun quyidagi tugmani bosing:",
            "invoice": {
                "amount": 10000,
                "currency": "UZS",
                "description": "Test mahsulot",
                "payload": "order_12345",
            },
        }

    if text == "/media":
        return {
            "text": "Namunaviy rasm:",
            "mediaUrl": "https://picsum.photos/seed/forhumo/600/400",
            "mediaType": "image",
            "mediaMime": "image/jpeg",
        }

    return {"text": f"Siz yozdingiz: {text}"}


def handle_callback(p: dict[str, Any]) -> dict[str, Any]:
    data = p.get("callbackData")
    if data == "buy":
        return {
            "text": "Siz sotib olish tugmasini bosdingiz.",
            "invoice": {"amount": 5000, "currency": "UZS", "description": "Callback buyurtmasi", "payload": f"cb_{int(time.time())}"},
        }
    if data == "media":
        return {
            "text": "Media namunasi:",
            "mediaUrl": "https://picsum.photos/seed/callback/500/500",
            "mediaType": "image",
        }
    return {"text": f"Tugma bosildi: {data}"}


def handle_invoice_paid(p: dict[str, Any]) -> dict[str, Any]:
    inv = p.get("invoice") or {}
    return {
        "text": (
            f"To'lov qabul qilindi ✓\n"
            f"Summa: {inv.get('amount')} {inv.get('currency')}\n"
            f"Buyurtma: {inv.get('payload') or '—'}\n\n"
            "Rahmat! Buyurtmangiz qayta ishlanmoqda."
        ),
    }


def handle_inline(p: dict[str, Any]) -> dict[str, Any]:
    q = (p.get("query") or "").strip()
    return {
        "results": [
            {
                "id": "res-1",
                "title": f'Qidiruv: "{q}"' if q else "Xush kelibsiz",
                "description": "Birinchi natija namunasi",
                "thumbnailUrl": "https://picsum.photos/seed/inline1/64",
                "message": {"text": f'Siz "{q}" ni qidirdingiz — bu 1-natija.'},
            },
            {
                "id": "res-2",
                "title": "Rasmli natija",
                "description": "Ikkinchi variant",
                "message": {
                    "text": "Rasmli javob:",
                    "mediaUrl": "https://picsum.photos/seed/inline2/600/400",
                    "mediaType": "image",
                },
            },
            {
                "id": "res-3",
                "title": "Uchinchi natija",
                "message": {"text": f'Sizga "{q}" bo\'yicha uchinchi variant.'},
            },
        ],
    }
