import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMHvdmpCQ6etdCfIrZKvreL8pmgaL8r2s",
  authDomain: "studio-5183488057-eae49.firebaseapp.com",
  projectId: "studio-5183488057-eae49",
  storageBucket: "studio-5183488057-eae49.firebasestorage.app",
  messagingSenderId: "852098675911",
  appId: "1:852098675911:web:11bbf4b54fae5ae5e1fae2"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db_firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

auth.useDeviceLanguage();

export { auth, db_firestore, googleProvider };
