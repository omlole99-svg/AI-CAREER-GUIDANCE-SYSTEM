import prisma from './prismaClient.js';
console.log('DATABASE_URL:', !!process.env.DATABASE_URL);
async function main() {
  try {
    await prisma.userReference.findMany({ take: 1 });
    console.log('PASS: Prisma connected to Neon.');
  } catch (error) {
    console.log('FAIL: Prisma connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
