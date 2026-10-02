import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "skillswap-g.firebaseapp.com",
  projectId: "skillswap-g",
  storageBucket: "skillswap-g.firebasestorage.app",
  messagingSenderId: "221972158406",
  appId: "1:221972158406:web:d999c58ea21ae357fcc4c7",
  measurementId: "G-VGBD7ZPT3W"
  
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
