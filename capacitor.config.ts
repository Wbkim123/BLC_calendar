/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.pages.blccalendar',
  appName: 'BLC Schedule Tracker',
  webDir: 'build',
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound']
    }
  }
};

export default config;
