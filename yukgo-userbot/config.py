"""YukGo userbot — konfiguratsiya (.env dan)."""
import os
from dotenv import load_dotenv

load_dotenv()


def _req(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise SystemExit(f"[config] Majburiy env yo'q: {name} (.env ni to'ldiring)")
    return v


API_ID: int = int(_req("API_ID"))
API_HASH: str = _req("API_HASH")
SESSION_NAME: str = os.getenv("SESSION_NAME", "yukgo")          # .session fayl nomi/yo'li
BACKEND_URL: str = _req("BACKEND_URL")                           # .../api/yukgo/ingest-bot
BACKEND_API_KEY: str = _req("BACKEND_API_KEY")                   # YUKGO_INGEST_KEY (Vercel bilan bir xil)

MIN_TEXT_LEN: int = int(os.getenv("MIN_TEXT_LEN", "15"))
DEDUP_TTL_SEC: int = int(os.getenv("DEDUP_TTL_SEC", "600"))     # 10 daqiqa
