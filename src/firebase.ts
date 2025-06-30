// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAqzVYPFPkNZYqf6-v9TDjYacRU8Vclt50",
  authDomain: "balynce-3e30f.firebaseapp.com",
  projectId: "balynce-3e30f",
  storageBucket: "balynce-3e30f.firebasestorage.app",  // ← This was probably wrong
  messagingSenderId: "736242926326",
  appId: "1:736242926326:web:f5f1a49c9582bf44eca2d7",
  measurementId: "G-N60HD5S528"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


