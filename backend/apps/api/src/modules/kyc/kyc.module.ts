import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KycApplication, KycApplicationSchema } from './infrastructure/kyc-application.schema';
import { User, UserSchema } from '../auth/infrastructure/schemas/user.schema';
import { DocumentStoreService } from './infrastructure/document-store.service';
import { KycService } from './application/kyc.service';
import { KycController } from './presentation/kyc.controller';
import { KycAdminController } from './presentation/kyc-admin.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KycApplication.name, schema: KycApplicationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    AdminModule,
  ],
  controllers: [KycController, KycAdminController],
  providers: [DocumentStoreService, KycService],
})
export class KycModule {}
