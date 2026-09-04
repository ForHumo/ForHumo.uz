import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const p = await prisma.userProfile.findUnique({
  where: { username: "support" },
  select: { id: true, username: true, name: true, image: true, humoId: true },
});
console.log("UserProfile:", p);
if (p) {
  const a = await prisma.nexusAgent.findUnique({ where: { profileId: p.id } });
  console.log("NexusAgent:", a);
}
await prisma.$disconnect();
