import prisma from './server/prismaClient.js';

async function testPrisma() {
  try {
    console.log("Testing Prisma connection...");
    const requests = await prisma.skillSwapRequest.findMany({ take: 1 });
    console.log("Success! Found requests:", requests.length);
  } catch (error) {
    console.error("Prisma test failed:", error);
  } finally {
    process.exit(0);
  }
}
testPrisma();
