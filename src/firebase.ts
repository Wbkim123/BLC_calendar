import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
