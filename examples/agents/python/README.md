# ForHumo Agent — Python namuna

FastAPI-asosli webhook server. Node.js versiyasi bilan bir xil xulq.

## O'rnatish

```bash
python3.10 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env ichida FORHUMO_AGENT_API_KEY ni to'ldiring
uvicorn server:app --host 0.0.0.0 --port 8080 --reload
```

Server `http://localhost:8080/webhook` da tinglaydi.

## Nima qiladi

Node.js namunasi bilan aynan bir xil: `/help`, `/echo`, `/buy`, `/media` buyruqlari,
inline tugmalar, invoice va inline mode.

## Proaktiv xabar

```bash
python send_proactive.py <recipientProfileId> "Salom, bu jonli xabar"
```
