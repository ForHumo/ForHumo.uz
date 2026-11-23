"""Arzon evristik pre-filter — Gemini xarajatini kamaytiradi.
Faqat "e'longa o'xshagan" xabarlarni backend'ga yuboramiz; salom/stikr/link/chatlashuvni o'tkazib yuboramiz.
Backend'dagi parser baribir yakuniy hakam — shuning uchun bu yerda "yuborish" tomonga og'amiz."""
import re

_DIGIT = re.compile(r"\d")
_PHONE = re.compile(r"(?:\+?\d[\d\s\-()]{6,}\d)")
# uz/ru logistika kalit so'zlari (yo'nalish / yuk / mashina / narx)
_KEYWORDS = (
    "yuk", "mashina", "fura", "tent", "ref", "рефр", "изотерм",
    "тонна", "tonna", " т ", "тн", "кг", " kg", "груз", "рейс",
    "ищу", "нужен", "нужны", "керак", "kerak", " bor", "достав",
    "млн", "ming", "минг", "сум", "so'm", "$", "перевоз", "загруз",
)


def looks_like_ad(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 15:
        return False
    if not _DIGIT.search(t):          # e'londa vazn/narx/telefon bo'ladi
        return False
    low = t.lower()
    if any(k in low for k in _KEYWORDS):
        return True
    if _PHONE.search(t):              # telefon bor → ehtimol e'lon
        return True
    return False
