import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { ApiModule } from './api.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('API_PORT');
  // Default loopback for local dev; set HOST=0.0.0.0 in Docker/VPS.
  await app.listen(port, process.env.HOST || '127.0.0.1');
}

void bootstrap();
