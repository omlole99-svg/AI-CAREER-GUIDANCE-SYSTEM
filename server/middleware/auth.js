import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const initAuth = () => {
  try {
    if (getApps().length === 0) {
      const serviceAccountKeyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKeyStr) {
        const serviceAccount = JSON.parse(serviceAccountKeyStr);
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('Firebase Admin Initialized successfully.');
      } else {
        console.warn('⚠️ WARNING: FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env. Firebase Admin Auth will fail.');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
};

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const checkRevoked = true;
    const decodedToken = await getAuth().verifyIdToken(token, checkRevoked);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
