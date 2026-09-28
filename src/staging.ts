import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

export const stagingConfig = {
  apiKey: 'AIzaSyA1M-QWoDTffdcCpk8z5k2O2B7sGZjuzcU',
  authDomain: 'ncoa-calendar-staging.firebaseapp.com',
  databaseURL: 'https://ncoa-calendar-staging-default-rtdb.firebaseio.com',
  projectId: 'ncoa-calendar-staging',
  storageBucket: 'ncoa-calendar-staging.firebasestorage.app',
  messagingSenderId: '19984974124',
  appId: '1:19984974124:web:807a54b422ee29270aac89'
};

const stagingApp = getApps().find(candidate => candidate.name === 'ncoa-staging')
  || initializeApp(stagingConfig, 'ncoa-staging');
export const stagingAuth = getAuth(stagingApp);
export const stagingFunctions = getFunctions(stagingApp, 'us-central1');

// Never infer authorization from this routing flag. The staging server and
// database rules independently validate the staging authentication claims.
const restoreStaging = () => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = JSON.parse(window.localStorage.getItem('blc_calendar_login') || 'null');
    return saved?.testMode === true && saved?.role === 'ADMIN';
  } catch { return false; }
};
let stagingSession = restoreStaging();
let sessionGeneration = 0;
export const isStagingSession = () => stagingSession;
export const getSessionGeneration = () => sessionGeneration;
export const selectStagingSession = (enabled: boolean) => {
  if (enabled && typeof window === 'undefined') throw new Error('Test sessions require a browser or native app.');
  stagingSession = enabled;
  sessionGeneration += 1;
};
export const stagingDatabaseUrl = (path: string, token: string) => {
  if (!token) throw new Error('Staging authentication is required.');
  const url = new URL(`${stagingConfig.databaseURL}/${path.replace(/^\/+|\/+$/g, '')}.json`);
  url.searchParams.set('auth', token);
  return url.toString();
};
