import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
        autoIndex: config.get('NODE_ENV') !== 'production',
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20,
      }),
    }),
  ],
})
export class DatabaseModule {}
