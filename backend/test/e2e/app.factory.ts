import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import { ApiModule } from '../../apps/api/src/api.module';
import { GlobalExceptionFilter, EnvelopeInterceptor } from '@app/shared';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * Boots the real ApiModule (all providers, Mongo, Redis) but replaces the
 * global throttler guard binding so tests aren't rate-limited. Everything
 * else — validation, envelope, error filter — matches production.
 */
export async function createE2EApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [ApiModule],
  })
    .overrideProvider(APP_FILTER)
    .useClass(GlobalExceptionFilter)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
