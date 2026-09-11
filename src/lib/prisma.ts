import { PrismaClient } from '@prisma/client'

// ── Yuklama chidamliligi (Vercel serverless + Neon PgBouncer) ───────────────
// Ko'p odam bir vaqtda kirsa sayt qotib qolmasligi/qulamasligi uchun ulanish
// satrini normallashtiramiz:
//   - pgbouncer=true  → PgBouncer transaction rejimida prepared statement
//     ishlamaydi; o'chirilmasa spike'da "prepared statement already exists"
//     xatosi 500 beradi.
//   - connection_limit=1 (pooled) → har serverless funksiya atigi 1 ta ulanish
//     ochadi; PgBouncer minglab klientni bir nechta Postgres ulanishida
//     multiplekslaydi. Aks holda har instansiya num_cpus*2+1 ulanish ochib,
//     Neon ulanish limiti tugaydi (connection exhaustion → butun sayt 500).
//   - pool_timeout=10 → barcha ulanish band bo'lsa cheksiz kutmasin, 10s'dan
//     keyin graceful xato (funksiya osilib qolmaydi, resurs bo'shaydi).
//   - connect_timeout=10 → ulanish ochilishi 10s'dan oshmasin.
// Parametr allaqachon berilgan bo'lsa qayta yozilmaydi (idempotent).
function resilientDbUrl(): string | undefined {
    const raw = process.env.DATABASE_URL
    if (!raw) return undefined
    try {
        const u = new URL(raw)
        const isPooled = u.hostname.includes('-pooler')
        const sp = u.searchParams

        if (isPooled && !sp.has('pgbouncer')) sp.set('pgbouncer', 'true')
        if (!sp.has('connection_limit')) sp.set('connection_limit', isPooled ? '1' : '5')
        if (!sp.has('pool_timeout')) sp.set('pool_timeout', '10')
        if (!sp.has('connect_timeout')) sp.set('connect_timeout', '10')

        return u.toString()
    } catch {
        return raw
    }
}

const globalForPrisma = global as unknown as {
    prisma: PrismaClient | undefined
}

const dbUrl = resilientDbUrl()

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ['error'],
        ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}
