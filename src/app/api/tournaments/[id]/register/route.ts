import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        const body = await req.json()
        const { teamId, requesterId } = body
        const { id: tournamentId } = await params

        if (!teamId || !requesterId)
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

        // 1. Ruxsat tekshirish (Owner yoki Captain)
        const membership = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: requesterId, teamId } }
        })
        if (!membership || !['OWNER', 'CAPTAIN'].includes(membership.role))
            return NextResponse.json({ error: 'Unauthorized: Only Owner or Captain can register team' }, { status: 403 })

        const team = await prisma.team.findUnique({ where: { id: teamId } })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

        // 2. Turnir tekshirish
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { teams: true }
        })
        if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
        if (tournament.status !== 'UPCOMING')
            return NextResponse.json({ error: "Ro'yxatdan o'tish yopilgan" }, { status: 400 })
        if (tournament.teams.length >= tournament.maxTeams)
            return NextResponse.json({ error: 'Turnir to\'lgan' }, { status: 400 })

        // 3. Qayta ro'yxatdan o'tishni bloklash
        const existing = await prisma.tournamentTeam.findUnique({
            where: { tournamentId_teamId: { tournamentId, teamId } }
        })
        if (existing) return NextResponse.json({ error: 'Jamoa allaqachon ro\'yxatdan o\'tgan' }, { status: 409 })

        // 4. Zij kirish badali (entryFee > 0 bo'lsa)
        const fee = Number(tournament.entryFee ?? 0)
        if (fee > 0) {
            if (!session?.user?.email)
                return NextResponse.json({ error: 'Zij to\'lovi uchun tizimga kiring' }, { status: 401 })

            const profile = await prisma.userProfile.findUnique({ where: { email: session.user.email } })
            if (!profile) return NextResponse.json({ error: 'Profil topilmadi' }, { status: 404 })

            let wallet = await prisma.zijWallet.findUnique({ where: { profileId: profile.id } })
            if (!wallet) wallet = await prisma.zijWallet.create({ data: { profileId: profile.id } })

            if (Number(wallet.balance) < fee)
                return NextResponse.json({
                    error: `Balans yetarli emas. Kerak: ${fee} Ƶ, Mavjud: ${Number(wallet.balance)} Ƶ`,
                    code: 'INSUFFICIENT_ZIJ',
                    required: fee,
                    available: Number(wallet.balance),
                }, { status: 400 })

            const newBalance = Number(wallet.balance) - fee

            // Atomic: Zij yechish + turnirga yozish
            const [registration] = await prisma.$transaction([
                prisma.tournamentTeam.create({
                    data: { tournamentId, teamId, snapshotName: team.name, snapshotLogo: team.logo ?? null }
                }),
                prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
                prisma.zijTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'PURCHASE',
                        amount: fee,
                        balanceAfter: newBalance,
                        description: `Turnir: ${tournament.name}`,
                        ref: tournamentId,
                    }
                })
            ])

            return NextResponse.json({ registration, zijPaid: fee, newBalance })
        }

        // 5. Bepul turnir
        const registration = await prisma.tournamentTeam.create({
            data: { tournamentId, teamId, snapshotName: team.name, snapshotLogo: team.logo ?? null }
        })
        return NextResponse.json({ registration, zijPaid: 0 })

    } catch (error) {
        console.error('Error registering team:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
