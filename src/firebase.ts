import { initializeApp } from "firebase/app";
import { forceLongPolling, getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { Capacitor } from "@capacitor/core";

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

export const app = initializeApp(firebaseConfig);

// WKWebView can prevent the Realtime Database WebSocket transport from
// completing. Use Firebase's supported HTTP long-polling transport on iOS.
if (Capacitor.getPlatform() === 'ios') {
  forceLongPolling();
}

export const db = getDatabase(app);
export const auth = getAuth(app);
