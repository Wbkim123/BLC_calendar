const projectId = process.env.GCLOUD_PROJECT || '';
const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '';

if (!projectId.startsWith('demo-') || !/^127\.0\.0\.1:9000$|^localhost:9000$/.test(emulatorHost)) {
  throw new Error('Database smoke test requires the local emulator and a demo-* project.');
}

const path = `__emulator_smoke__/${Date.now()}`;
const url = new URL(`http://${emulatorHost}/${path}.json`);
url.searchParams.set('ns', projectId);

(async () => {
  try {
    const write = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isolated: true })
    });
    if (!write.ok) throw new Error('Emulator write check failed.');
    const read = await fetch(url);
    if (!read.ok || (await read.json()).isolated !== true) throw new Error('Emulator read check failed.');
    console.log('Firebase Database Emulator smoke test passed.');
  } finally {
    await fetch(url, { method: 'DELETE' }).catch(() => undefined);
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
