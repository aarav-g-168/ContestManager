import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const emulators =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app =
  getApps()[0] ??
  initializeApp(
    emulators
      ? {
          apiKey: "demo-api-key",
          authDomain: "demo-contest-manager.firebaseapp.com",
          projectId: "demo-contest-manager",
          storageBucket: "demo-contest-manager.appspot.com",
        }
      : firebaseConfig,
  );

export const auth = getAuth(app);
if (emulators) {
  if (!auth.emulatorConfig)
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
}
