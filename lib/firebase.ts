
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBV0ztjWjHS2uGdlnXrIExq1tNUTWJX36U",
  authDomain: "explode-cores.firebaseapp.com",
  projectId: "explode-cores",
  storageBucket: "explode-cores.firebasestorage.app",
  messagingSenderId: "548116805324",
  appId: "1:548116805324:web:87008a486dbf3f607fb469",
  measurementId: "G-V1LFTZY2PL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
