import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { EngineModule } from './engine.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(EngineModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('ENGINE_PORT');
  // Default loopback for local dev; set HOST=0.0.0.0 in Docker/VPS.
  await app.listen(port, process.env.HOST || '127.0.0.1');
}

void bootstrap();
