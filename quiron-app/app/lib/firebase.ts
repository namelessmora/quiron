import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAl8jWWDg2xG7HVfIX6_Re-oo9gx4datHM",
  authDomain: "quiron-23579.firebaseapp.com",
  projectId: "quiron-23579",
  storageBucket: "quiron-23579.firebasestorage.app",
  messagingSenderId: "688595801583",
  appId: "1:688595801583:web:afd8699636d68efc0e921a",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);