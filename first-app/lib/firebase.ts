import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDT2evTvU6_exbLTY8kIiO9n-mrF7vg4hs",
  authDomain: "attendex-47d45.firebaseapp.com",
  projectId: "attendex-47d45",
  storageBucket: "attendex-47d45.firebasestorage.app",
  messagingSenderId: "731988308422",
  appId: "1:731988308422:web:ebc33605ab8ad24025c2c7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
