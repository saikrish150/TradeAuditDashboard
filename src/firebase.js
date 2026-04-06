import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3OTnmEO8nnzySekQf-D_Uncw_jEHiLNI",
  authDomain: "tradingjournal-b17c4.firebaseapp.com",
  projectId: "tradingjournal-b17c4",
  storageBucket: "tradingjournal-b17c4.firebasestorage.app",
  messagingSenderId: "490842561265",
  appId: "1:490842561265:web:58c0e726d2a495133a6750"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getFirestore(app);
const storage = getStorage(app);

// Debug Bridge: Allows you to run queries in the Browser Console
if (typeof window !== 'undefined') {
  window._db = db;
  window._storage = storage;
}

export { db, storage };
export default app;
