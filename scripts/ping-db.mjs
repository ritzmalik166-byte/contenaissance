import { pingDatabase } from '@/lib/db';

(async () => {
  try {
    const ok = await pingDatabase();
    console.log('Database ping:', ok);
  } catch (err) {
    console.error('Ping failed:', err);
    process.exit(1);
  }
})();

