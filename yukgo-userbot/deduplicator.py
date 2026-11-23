"""Tez in-memory TTL dedup — bir xil e'lon o'nlab guruhda bir vaqtda chiqadi.
Backend'ni bir xil xabar bilan urmaslik uchun (backend'da ham 48s dedup bor)."""
import time
import hashlib


class TTLDedup:
    def __init__(self, ttl_sec: int = 600):
        self.ttl = ttl_sec
        self._seen: dict[str, float] = {}

    @staticmethod
    def _key(text: str) -> str:
        norm = " ".join(text.lower().split())
        return hashlib.sha1(norm.encode("utf-8")).hexdigest()

    def seen(self, text: str) -> bool:
        now = time.time()
        if len(self._seen) > 5000:  # vaqti-vaqti bilan tozalash
            self._seen = {k: v for k, v in self._seen.items() if v > now}
        k = self._key(text)
        exp = self._seen.get(k)
        if exp and exp > now:
            return True
        self._seen[k] = now + self.ttl
        return False
