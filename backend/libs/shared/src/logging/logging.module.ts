import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          genReqId: (req: IncomingMessage) =>
            (req.headers['x-request-id'] as string) ?? randomUUID(),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.otp',
              'req.body.token',
            ],
            censor: '[REDACTED]',
          },
          autoLogging: {
            ignore: (req: IncomingMessage) => req.url === '/health',
          },
        },
      }),
    }),
  ],
})
export class LoggingModule {}
