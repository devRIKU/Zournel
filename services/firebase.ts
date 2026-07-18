import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0tGiXHZ9oGE_i0n2TEE5TSYOGxkVugUQ",
  authDomain: "gen-lang-client-0061322409.firebaseapp.com",
  projectId: "gen-lang-client-0061322409",
  storageBucket: "gen-lang-client-0061322409.firebasestorage.app",
  messagingSenderId: "769825947095",
  appId: "1:769825947095:web:e547678a1737691f339f92"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, "ai-studio-zournel-4c8942e9-d185-4bf1-a595-35ec5545428c");
export const auth = getAuth(app);
