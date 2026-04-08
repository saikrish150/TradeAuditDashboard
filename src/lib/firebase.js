import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services with optimized settings
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Enable Local Persistence for Free Tier Optimization
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firebase Persistence: Multiple tabs open, using single-tab mode.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firebase Persistence: Not supported by current browser.");
    }
  });
}
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Debug Bridge: Allows you to run queries in the Browser Console
if (typeof window !== 'undefined') {
  window._db = db;
  window._storage = storage;
  window._auth = auth;
}

export { db, storage, auth, googleProvider };
export default app;
