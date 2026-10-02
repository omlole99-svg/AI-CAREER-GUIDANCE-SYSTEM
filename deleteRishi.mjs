import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

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

const del = async () => {
  try {
    const q = query(collection(db, 'users'), where('name', '==', 'Rishikesh'));
    const snaps = await getDocs(q);
    for (const s of snaps.docs) {
      await deleteDoc(s.ref);
      console.log("Deleted", s.id);
    }
    console.log("Done");
    process.exit(0);
  } catch(e){
    console.error(e);
    process.exit(1);
  }
};
del();
