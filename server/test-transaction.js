import prisma from './prismaClient.js';

async function run() {
  const uid1 = 'test1_' + Date.now();
  const uid2 = 'test2_' + Date.now();
  
  const u1 = await prisma.userReference.create({ data: { firebaseUid: uid1 } });
  const u2 = await prisma.userReference.create({ data: { firebaseUid: uid2 } });
  
  const req1 = await prisma.skillSwapRequest.create({ data: { senderUid: uid1, receiverUid: uid2, skillOffered: 'A', skillWanted: 'B', status: 'ACCEPTED' } });
  const session1 = await prisma.session.create({ data: { requestId: req1.id, tutorUid: uid2, learnerUid: uid1, status: 'COMPLETED' } });
  
  console.log("--- TEST 1: SUCCESSFUL TRANSACTION ---");
  await prisma.$transaction([
    prisma.review.create({ data: { sessionId: session1.id, reviewerUid: uid1, revieweeUid: uid2, rating: 5, comment: 'Great' } }),
    prisma.xpTransaction.create({ data: { userUid: uid2, amount: 50, reason: 'Test' } }),
    prisma.userReference.update({ where: { firebaseUid: uid2 }, data: { totalXp: { increment: 50 } } })
  ]);
  
  const reviewCheck1 = await prisma.review.findFirst({ where: { sessionId: session1.id } });
  console.log("Review saved in DB?", !!reviewCheck1);
  const userCheck1 = await prisma.userReference.findUnique({ where: { firebaseUid: uid2 } });
  console.log("XP updated in DB?", userCheck1.totalXp === 50);
  
  console.log("\n--- TEST 2: ROLLBACK TRANSACTION ---");
  const req2 = await prisma.skillSwapRequest.create({ data: { senderUid: uid2, receiverUid: uid1, skillOffered: 'C', skillWanted: 'D', status: 'ACCEPTED' } });
  const session2 = await prisma.session.create({ data: { requestId: req2.id, tutorUid: uid1, learnerUid: uid2, status: 'COMPLETED' } });
  
  try {
    await prisma.$transaction([
      prisma.review.create({ data: { sessionId: session2.id, reviewerUid: uid2, revieweeUid: uid1, rating: 5, comment: 'Rollback Test' } }),
      // INTENTIONAL FAILURE: Foreign key constraint violation on non-existent user
      prisma.xpTransaction.create({ data: { userUid: 'INVALID_UID_FAILS', amount: 50, reason: 'Test' } }),
      prisma.userReference.update({ where: { firebaseUid: uid1 }, data: { totalXp: { increment: 50 } } })
    ]);
  } catch(e) {
    console.log("Transaction successfully caught an error!");
  }
  
  const reviewCheck2 = await prisma.review.findFirst({ where: { sessionId: session2.id } });
  console.log("Review saved in DB despite failure? (Should be false):", !!reviewCheck2);

  // Cleanup
  await prisma.userReference.deleteMany({ where: { firebaseUid: { in: [uid1, uid2] } } });
}

run().catch(console.error).finally(() => prisma.$disconnect());
