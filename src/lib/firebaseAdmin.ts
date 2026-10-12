import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const emulators =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";
if (emulators) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
}

const firebaseAdminConfig = {
  ...(emulators
    ? {}
    : {
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      }),
};

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(
        emulators
          ? {
              projectId: "demo-contest-manager",
              storageBucket: "demo-contest-manager.appspot.com",
            }
          : {
              ...firebaseAdminConfig,
              storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            },
      );

export const adminAuth = getAuth(app);
export const profileBucket = () => getStorage(app).bucket();
