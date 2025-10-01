// Firebase initialization and simple helpers
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { AssessmentResult } from "@/services/api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
export function ensureFirebase() {
  if (!app) app = initializeApp(firebaseConfig);
}

export const auth = (() => { ensureFirebase(); return getAuth(); })();
export const db = (() => { ensureFirebase(); return getFirestore(); })();

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signUpWithEmail(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logoutFirebase() {
  await signOut(auth);
}

export type FireUser = User;

export { collection, doc, setDoc, getDocs, orderBy, query, Timestamp };

// Firestore paths: users/{uid}/reports/{assessmentId}
export async function saveReport(uid: string, result: AssessmentResult) {
  const col = collection(db, "users", uid, "reports");
  const d = doc(col, result.assessmentId);
  await setDoc(d, { ...result, createdAt: Timestamp.now() }, { merge: true });
}

export async function loadReports(uid: string): Promise<AssessmentResult[]> {
  const col = collection(db, "users", uid, "reports");
  const q = query(col, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      assessmentId: data.assessmentId ?? doc.id,
      riskLevel: data.riskLevel,
      probability: data.probability,
      featureImportances: data.featureImportances ?? [],
      subScores: data.subScores,
      recommendations: data.recommendations ?? [],
      generatedAt: data.generatedAt ?? new Date().toISOString(),
    } as AssessmentResult;
  });
}
