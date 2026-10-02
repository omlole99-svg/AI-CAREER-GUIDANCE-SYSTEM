import prisma from './prismaClient.js';

async function cleanupDuplicates() {
  console.log("Starting cleanup of duplicate active sessions...");

  // 1. Fetch all scheduled sessions with their related swap request
  const activeSessions = await prisma.session.findMany({
    where: { status: 'SCHEDULED' },
    include: { request: true }
  });

  // 2. Group sessions by unique pair + skills
  const groups = {};
  
  for (const session of activeSessions) {
    const { tutorUid, learnerUid, request } = session;
    // Normalized composite key to find identical duplicates
    // Ensure order of users doesn't matter if they swap roles, but here they requested the same skills in the same direction
    const key = `${tutorUid}-${learnerUid}-${request.skillOffered.toLowerCase()}-${request.skillWanted.toLowerCase()}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(session);
  }

  let deletedSessions = 0;
  let deletedRequests = 0;

  // 3. For each group with more than 1 session, keep the oldest, delete the rest
  for (const key in groups) {
    if (groups[key].length > 1) {
      // Sort by createdAt ascending (oldest first)
      groups[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Keep the first (oldest), delete the rest
      const duplicatesToDelete = groups[key].slice(1);
      
      console.log(`Found ${duplicatesToDelete.length} duplicates for group: ${key}`);
      
      for (const duplicate of duplicatesToDelete) {
        // Delete the session and the corresponding request
        await prisma.session.delete({ where: { id: duplicate.id } });
        await prisma.skillSwapRequest.delete({ where: { id: duplicate.requestId } });
        
        console.log(`Deleted duplicate session: ${duplicate.id} and request: ${duplicate.requestId}`);
        deletedSessions++;
        deletedRequests++;
      }
    }
  }

  console.log(`Cleanup complete. Deleted ${deletedSessions} duplicate sessions and ${deletedRequests} duplicate requests.`);
}

cleanupDuplicates()
  .catch(e => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
