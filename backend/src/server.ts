import { app } from './app.js';
import { initDatabaseConnection } from './config/db.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  await initDatabaseConnection();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hostel Backend API] Listening on http://localhost:${PORT}`);
    console.log(`[Hostel Backend API] Health check at http://localhost:${PORT}/api/system/status`);
  });
}

start();
