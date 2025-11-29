import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const required = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing Firebase config value for ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: required("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: required("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: required("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: required("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
