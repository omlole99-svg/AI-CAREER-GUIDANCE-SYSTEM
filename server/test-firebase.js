import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
dotenv.config();

try {
  const serviceAccountKeyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKeyStr) {
    console.log('FAIL: FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(serviceAccountKeyStr);
  console.log('Project ID from JSON:', serviceAccount.project_id);

  initializeApp({
    credential: cert(serviceAccount)
  });

  
  console.log('PASS: Firebase Admin Initialized successfully.');
  
  // Optionally verify token logic by trying to verify a fake token and ensuring we get an auth/argument-error rather than an initialization error
  getAuth().verifyIdToken('fake-token').catch(err => {
    if (err.code === 'auth/argument-error' || err.code === 'auth/invalid-argument') {
      console.log('PASS: Auth middleware token validation available.');
    } else {
      console.log('FAIL: Unexpected error verifying token:', err.code);
    }
  });

} catch (error) {
  console.log('FAIL: Failed to initialize Firebase Admin:', error.message);
}
