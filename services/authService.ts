import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, googleProvider, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      username: user.displayName || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || null,
      bio: "",
      college: "",
      branch: "",
      skillsOffered: [],
      skillsWanted: [],
      points: 0,
      streak: 0,
      completedSessions: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    await updateDoc(userRef, {
      updatedAt: serverTimestamp()
    });
  }

  return user;
}

export async function logout() {
  await signOut(auth);
}

export async function loginWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim();
  const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const normalizedEmail = email.trim();
  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = result.user;

  await sendEmailVerification(user);

  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email || normalizedEmail,
    username: name,
    displayName: name,
    photoURL: null,
    bio: "",
    college: "",
    branch: "",
    skillsOffered: [],
    skillsWanted: [],
    points: 0,
    streak: 0,
    completedSessions: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return user;
}
