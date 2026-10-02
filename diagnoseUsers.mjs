import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "REMOVED_API_KEY",
  authDomain: "skillswap-g.firebaseapp.com",
  projectId: "skillswap-g",
  storageBucket: "skillswap-g.firebasestorage.app",
  messagingSenderId: "221972158406",
  appId: "1:221972158406:web:d999c58ea21ae357fcc4c7",
  measurementId: "G-VGBD7ZPT3W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const diagnose = async () => {
  try {
    const snaps = await getDocs(collection(db, 'users'));
    console.log(`\n=== FIRESTORE DIAGNOSIS ===\n`);
    console.log(`Total users in Firestore: ${snaps.docs.length}`);
    
    snaps.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`[${i+1}] Document ID: ${doc.id}`);
      console.log(`    Name: ${data.name || data.displayName || 'N/A'}`);
      console.log(`    Email: ${data.email || 'N/A'}`);
      console.log(`    uid field inside doc: ${data.uid || 'Missing'}`);
      console.log(`-----------------------------------`);
    });
    
    console.log(`\n=== DONE ===\n`);
    process.exit(0);
  } catch(e) {
    console.error("Error diagnosing Firestore:", e);
    process.exit(1);
  }
};

diagnose();
