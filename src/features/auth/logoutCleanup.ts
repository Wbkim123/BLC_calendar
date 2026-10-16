// Stop showing the login spinner if cleanup stalls, but keep the original
// barrier intact: a late sign-out must never race a new sign-in.
export async function waitForLogoutCleanup(cleanup: Promise<unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      cleanup,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Session cleanup is still pending')), 20000);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
