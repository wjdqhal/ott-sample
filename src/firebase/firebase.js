import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    // apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    // authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    // projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    // storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    // messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    // appId: import.meta.env.VITE_FIREBASE_APP_ID
    apiKey: "AIzaSyBKwxjvmGPP5-Y238JtbMB4EJcrMiedwBg",
    authDomain: "ott-test-eabe2.firebaseapp.com",
    projectId: "ott-test-eabe2",
    storageBucket: "ott-test-eabe2.firebasestorage.app",
    messagingSenderId: "235773401932",
    appId: "1:235773401932:web:50aafd3318635ed0624de9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();