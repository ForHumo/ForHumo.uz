// Payme (Paycom) webhook — JSON-RPC 2.0 protocol.
// MChJ registratsiyasi + merchant kabinet yaratilgach, `PAYME_MERCHANT_KEY`ni env'ga qo'shing.
// Payme dokumentatsiya: https://developer.help.paycom.uz
//
// Metodlar (Payme yuboradi):
//   CheckPerformTransaction  — hisob va summa to'g'rimi?
//   CreateTransaction        — tranzaksiya yaratish (holat=PENDING)
//   PerformTransaction       — to'lov tasdiqlangan (holat=PAID → balansga qo'shamiz)
//   CancelTransaction        — bekor qilish (holat=CANCELED)
//   CheckTransaction         — tranzaksiya statusi
//   GetStatement             — davr bo'yicha tranzaksiyalar

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RpcReq { method: string; params?: Record<string, unknown>; id?: number | string }

// Payme xato kodlari
const ERR = {
    INVALID_AMOUNT:       { code: -31001, message: { uz: "Noto'g'ri summa",              ru: "Неверная сумма",       en: "Invalid amount" } },
    ACCOUNT_NOT_FOUND:    { code: -31050, message: { uz: "Foydalanuvchi topilmadi",     ru: "Пользователь не найден", en: "User not found" } },
    ALREADY_DONE:         { code: -31051, message: { uz: "Tranzaksiya allaqachon bajarilgan", ru: "Уже выполнено", en: "Already done" } },
    UNAUTHORIZED:         { code: -32504, message: { uz: "Ruxsatsiz",                    ru: "Не авторизован",       en: "Unauthorized" } },
    METHOD_NOT_FOUND:     { code: -32601, message: { uz: "Metod topilmadi",              ru: "Метод не найден",       en: "Method not found" } },
} as const;

function rpcError(id: number | string | undefined, err: { code: number; message: unknown }) {
    return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: err });
}
function rpcOk(id: number | string | undefined, result: unknown) {
    return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

// Basic auth (Payme: username="Paycom", password=PAYME_MERCHANT_KEY)
function checkAuth(auth: string | null): boolean {
    const key = process.env.PAYME_MERCHANT_KEY;
    if (!key) return false;
    if (!auth?.startsWith("Basic ")) return false;
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    return decoded === `Paycom:${key}`;
}

export async function POST(req: Request) {
    if (!process.env.PAYME_MERCHANT_ID || !process.env.PAYME_MERCHANT_KEY) {
        return NextResponse.json({ error: "Payme not configured" }, { status: 501 });
    }
    const body: RpcReq = await req.json().catch(() => ({} as RpcReq));
    const auth = req.headers.get("authorization");
    if (!checkAuth(auth)) return rpcError(body.id, ERR.UNAUTHORIZED);

    const { method, params = {}, id } = body;

    switch (method) {
        case "CheckPerformTransaction": {
            const account = params.account as { profile_id?: string } | undefined;
            const amount = Number(params.amount) / 100;
            if (!account?.profile_id) return rpcError(id, ERR.ACCOUNT_NOT_FOUND);
            const profile = await prisma.userProfile.findUnique({ where: { id: account.profile_id }, select: { id: true } });
            if (!profile) return rpcError(id, ERR.ACCOUNT_NOT_FOUND);
            if (!amount || amount < 1000) return rpcError(id, ERR.INVALID_AMOUNT);
            return rpcOk(id, { allow: true });
        }
        case "CreateTransaction":
        case "PerformTransaction":
        case "CancelTransaction":
        case "CheckTransaction":
        case "GetStatement":
            // TODO: PaymentTransaction jadval qo'shilganda to'liq implementatsiya.
            // Hozircha: PerformTransaction'da balansni to'g'ridan-to'g'ri to'ldirish.
            if (method === "PerformTransaction") {
                const account = params.account as { profile_id?: string } | undefined;
                const amount = Number(params.amount) / 100;
                const paymeId = String(params.id ?? "");
                if (!account?.profile_id || !amount) return rpcError(id, ERR.INVALID_AMOUNT);
                const wallet = await prisma.wallet.findUnique({ where: { profileId: account.profile_id } });
                if (!wallet) return rpcError(id, ERR.ACCOUNT_NOT_FOUND);

                // Idempotent: (walletId, ref) unique — ikkinchi urinishda P2002 → allaqachon qilingan deymiz
                try {
                    const newBalance = Number(wallet.balance) + amount;
                    await prisma.$transaction([
                        prisma.walletTransaction.create({
                            data: {
                                walletId: wallet.id, type: "DEPOSIT", amount, currency: wallet.currency,
                                balanceAfter: newBalance, description: "Payme to'ldirish", ref: paymeId,
                            },
                        }),
                        prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
                    ]);
                } catch (e) {
                    const code = (e as { code?: string }).code;
                    if (code !== "P2002") throw e;
                    // duplikat — javob baribir muvaffaqiyatli
                }
                return rpcOk(id, { transaction: paymeId, perform_time: Date.now(), state: 2 });
            }
            return rpcOk(id, { transaction: String(params.id ?? ""), state: 1 });
        default:
            return rpcError(id, ERR.METHOD_NOT_FOUND);
    }
}
