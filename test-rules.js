const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { setDoc, getDoc, doc } = require('firebase/firestore');
const { get, set, ref, remove, update } = require('firebase/database');
const fs = require('fs');

let testEnv;

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-skillswap-test',
    database: {
      rules: fs.readFileSync('database.rules.json', 'utf8'),
      host: '127.0.0.1',
      port: 9000,
    },
  });
}

async function teardown() {
  await testEnv.cleanup();
}

async function runTests() {
  console.log('--- STARTING SECURITY RULE TESTS ---');
  await setup();
  let failures = 0;

  const expectPass = async (name, promise) => {
    try {
      await assertSucceeds(promise);
      console.log(`[PASS] ${name}`);
    } catch (e) {
      console.error(`[FAIL] ${name} - Expected success but failed with: ${e.message}`);
      failures++;
    }
  };

  const expectFail = async (name, promise) => {
    try {
      await assertFails(promise);
      console.log(`[PASS] ${name}`);
    } catch (e) {
      console.error(`[FAIL] ${name} - Expected failure but succeeded`);
      failures++;
    }
  };

  const unauthDb = testEnv.unauthenticatedContext().database();
  const aliceDb = testEnv.authenticatedContext('alice').database();
  const bobDb = testEnv.authenticatedContext('bob').database();

  // Test 1: Unauth reads /presence -> DENIED
  await expectFail('Unauth reads /presence', get(ref(unauthDb, 'presence')));

  // Test 2: Auth User A reads required presence data -> ALLOWED
  await expectPass('Auth reads /presence', get(ref(aliceDb, 'presence')));

  // Test 3: User A writes /presence/UserA/connections/... -> ALLOWED
  await expectPass('Alice writes own connection', set(ref(aliceDb, 'presence/alice/connections/con1'), true));

  // Test 4: User A writes /presence/UserB/connections/... -> DENIED
  await expectFail('Alice writes Bob connection', set(ref(aliceDb, 'presence/bob/connections/con1'), true));

  // Test 5: User A deletes own connection -> ALLOWED
  await expectPass('Alice deletes own connection', remove(ref(aliceDb, 'presence/alice/connections/con1')));

  // Test 6: User A deletes User B's connection -> DENIED
  await expectFail('Alice deletes Bob connection', remove(ref(aliceDb, 'presence/bob/connections/con1')));

  // Test 7: User A writes arbitrary root data -> DENIED
  await expectFail('Alice writes root', set(ref(aliceDb, 'arbitrary'), true));

  // Test 8: Unauth write presence -> DENIED
  await expectFail('Unauth write presence', set(ref(unauthDb, 'presence/alice/connections/con1'), true));

  await teardown();

  if (failures > 0) {
    console.error(`\nTests completed with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log(`\nAll tests passed successfully.`);
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
