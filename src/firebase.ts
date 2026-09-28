import { initializeApp } from "firebase/app";
import { connectDatabaseEmulator, forceLongPolling, getDatabase } from "firebase/database";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { assertSafeFirebaseEnvironment } from './firebaseEnvironment';

const firebaseConfig = {
  apiKey: "AIzaSyDNjoIVSKyIRjFm7LQD-yH7pemRZ7c_nyc",
  authDomain: "blc-calendar-e302f.firebaseapp.com",
  databaseURL: "https://blc-calendar-e302f-default-rtdb.firebaseio.com",
  projectId: "blc-calendar-e302f",
  storageBucket: "blc-calendar-e302f.firebasestorage.app",
  messagingSenderId: "245720895881",
  appId: "1:245720895881:web:f55f09f0ca7c2510f15158",
  measurementId: "G-074Q0C8YQE"
};

export const useFirebaseEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true';
const emulatorProjectId = process.env.REACT_APP_FIREBASE_EMULATOR_PROJECT || 'demo-blc-calendar';
const emulatorHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || '127.0.0.1';

assertSafeFirebaseEnvironment({
  nodeEnv: process.env.NODE_ENV || 'production',
  useEmulators: useFirebaseEmulators,
  projectId: emulatorProjectId,
  emulatorHost
});

if (useFirebaseEmulators) {
  firebaseConfig.projectId = emulatorProjectId;
  firebaseConfig.authDomain = `${emulatorProjectId}.firebaseapp.com`;
  firebaseConfig.databaseURL = `http://${emulatorHost}:9000?ns=${emulatorProjectId}`;
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const functions = getFunctions(app, 'us-central1');

if (useFirebaseEmulators) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectDatabaseEmulator(db, emulatorHost, 9000);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

export const firebaseDatabaseUrl = useFirebaseEmulators
  ? `http://${emulatorHost}:9000`
  : firebaseConfig.databaseURL;

export const getDatabaseRestUrl = (path: string, idToken?: string | null) => {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const url = new URL(`${firebaseDatabaseUrl}/${normalizedPath}.json`);
  if (useFirebaseEmulators) url.searchParams.set('ns', emulatorProjectId);
  if (idToken) url.searchParams.set('auth', idToken);
  return url.toString();
};

// WKWebView can prevent the Realtime Database WebSocket transport from
// completing. Use Firebase's supported HTTP long-polling transport on iOS.
if (Capacitor.getPlatform() === 'ios') {
  forceLongPolling();
}
