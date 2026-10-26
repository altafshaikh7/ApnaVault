import { createServer } from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { DocumentService } from './services/documentService.js';
import { ReminderService } from './services/reminderService.js';

async function bootstrap(): Promise<void> {
  // Connect to database
  await connectDatabase();

  const deletionReconciliationTimer = setInterval(() => {
    void DocumentService.reconcilePendingDeletions();
  }, 60_000);
  deletionReconciliationTimer.unref();

  const reminderCheckTimer = setInterval(() => {
    void ReminderService.checkAndGenerateReminders();
  }, 60_000);
  reminderCheckTimer.unref();

  const server = createServer(app);

  server.listen(env.PORT, () => {
    console.log(`[Server] ApnaVault API server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`[Server] Health check endpoint: http://localhost:${env.PORT}/api/v1/health`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    clearInterval(deletionReconciliationTimer);
    clearInterval(reminderCheckTimer);

    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDatabase();
      console.log('[Server] Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after timeout if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Server] Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[Process] Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('[Process] Uncaught Exception:', error.message);
    process.exit(1);
  });
}

void bootstrap();
