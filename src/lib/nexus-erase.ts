// Akkaunt o'chirilganda foydalanuvchining BARCHA Nexus ma'lumotlarini o'chiradi.
// Sabab: aksariyat Nexus modellari profileId'ni oddiy String sifatida saqlaydi
// (UserProfile'ga FK yo'q), shuning uchun cascade ishlamaydi — qo'lda tozalaymiz.
// Hamyon/ledger (Wallet/WalletTransaction) BU YERDA tegilmaydi — anonim saqlanadi.

import { prisma } from "@/lib/prisma";

// Bir tranzaksiyada profileId bo'yicha barcha ijtimoiy kontent + DM + aloqalarni o'chiradi.
export async function eraseNexusData(profileId: string): Promise<void> {
    const id = profileId;
    await prisma.$transaction([
        // Top-level kontent (o'z bolalarini cascade qiladi: layk/izoh/ko'rish/xarid/a'zo/xabar)
        prisma.nexusPost.deleteMany({ where: { profileId: id } }),
        prisma.nexusVideo.deleteMany({ where: { profileId: id } }),
        prisma.nexusTrack.deleteMany({ where: { profileId: id } }),
        prisma.nexusStory.deleteMany({ where: { profileId: id } }),
        prisma.nexusLiveStream.deleteMany({ where: { profileId: id } }),
        prisma.nexusChannel.deleteMany({ where: { ownerId: id } }),
        prisma.nexusConversation.deleteMany({ where: { OR: [{ user1Id: id }, { user2Id: id }] } }),

        // Mening boshqalar kontentidagi izlarim (standalone — FK yo'q)
        prisma.nexusComment.deleteMany({ where: { profileId: id } }),
        prisma.nexusVideoComment.deleteMany({ where: { profileId: id } }),
        prisma.nexusLike.deleteMany({ where: { profileId: id } }),
        prisma.nexusSave.deleteMany({ where: { profileId: id } }),
        prisma.nexusPollVote.deleteMany({ where: { profileId: id } }),
        prisma.nexusVideoView.deleteMany({ where: { profileId: id } }),
        prisma.nexusVideoLike.deleteMany({ where: { profileId: id } }),
        prisma.nexusTrackPlay.deleteMany({ where: { profileId: id } }),
        prisma.nexusTrackLike.deleteMany({ where: { profileId: id } }),
        prisma.nexusWatchLater.deleteMany({ where: { profileId: id } }),
        prisma.nexusVideoPurchase.deleteMany({ where: { buyerId: id } }),
        prisma.nexusChannelMember.deleteMany({ where: { profileId: id } }),
        prisma.nexusChannelMessage.deleteMany({ where: { senderId: id } }),
        prisma.nexusLiveMessage.deleteMany({ where: { profileId: id } }),
        prisma.nexusLiveViewer.deleteMany({ where: { profileId: id } }),
        prisma.nexusMessage.deleteMany({ where: { senderId: id } }),

        // Aloqalar (har ikki yo'nalish)
        prisma.nexusFollow.deleteMany({ where: { OR: [{ followerId: id }, { followingId: id }] } }),
        prisma.nexusBlock.deleteMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] } }),
        prisma.nexusMute.deleteMany({ where: { OR: [{ muterId: id }, { mutedId: id }] } }),
        prisma.nexusSubscription.deleteMany({ where: { OR: [{ subscriberId: id }, { creatorId: id }] } }),
        prisma.nexusTip.deleteMany({ where: { OR: [{ donorId: id }, { recipientId: id }] } }),
        prisma.nexusNotification.deleteMany({ where: { OR: [{ recipientId: id }, { actorId: id }] } }),

        // Boshqa profil-bog'liq yozuvlar
        prisma.nexusReport.deleteMany({ where: { reporterId: id } }),
        prisma.nexusVerifyRequest.deleteMany({ where: { profileId: id } }),
        prisma.nexusPushSub.deleteMany({ where: { profileId: id } }),
        prisma.aiUsage.deleteMany({ where: { profileId: id } }),
    ]);
}
