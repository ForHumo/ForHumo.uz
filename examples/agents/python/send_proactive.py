"""Agent tomondan foydalanuvchiga proaktiv DM yuborish.

Ishlatish:
    python send_proactive.py <recipientProfileId> "matn"
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time

import httpx

API_KEY = os.environ.get("FORHUMO_AGENT_API_KEY", "")
BASE_URL = os.environ.get("FORHUMO_BASE_URL", "https://forhumo.uz")

if not API_KEY:
    raise SystemExit("FORHUMO_AGENT_API_KEY o'rnatilmagan")

if len(sys.argv) < 3:
    raise SystemExit('Ishlatish: python send_proactive.py <profileId> "matn"')

recipient_id = sys.argv[1]
text = " ".join(sys.argv[2:])

body = json.dumps({"recipientProfileId": recipient_id, "text": text}, ensure_ascii=False).encode("utf-8")
timestamp = str(int(time.time()))
signature = "sha256=" + hmac.new(
    API_KEY.encode(),
    msg=f"{timestamp}.{body.decode('utf-8')}".encode(),
    digestmod=hashlib.sha256,
).hexdigest()

resp = httpx.post(
    f"{BASE_URL}/api/nexus/agents/webhook-inbox",
    content=body,
    headers={
        "Content-Type": "application/json",
        "X-Forhumo-Timestamp": timestamp,
        "X-Forhumo-Signature": signature,
        "X-Forhumo-Api-Key": API_KEY,
    },
    timeout=15.0,
)
print(resp.status_code, resp.text)
