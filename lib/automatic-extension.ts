// Serialize background jobs: shared assets must not race project saves.
let queue: Promise<unknown> = Promise.resolve();
const jobs = new Map<string, Promise<void>>();
export function automaticExtension(key: string, eligible: () => boolean, run: () => Promise<void>, storage: Pick<Storage, 'getItem' | 'setItem'>): Promise<void> {
  const existing = jobs.get(key);
  if (existing) return existing;
  const job = queue.catch(() => {}).then(async () => {
    if (!eligible()) return;
    // Fail closed if storage is unavailable. Never repeatedly spend on remount.
    if (storage.getItem(key)) return;
    storage.setItem(key, 'attempted');
    await run();
  });
  jobs.set(key, job);
  queue = job.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 0)));
  void job.finally(() => jobs.delete(key)).catch(() => {});
  return job;
}
