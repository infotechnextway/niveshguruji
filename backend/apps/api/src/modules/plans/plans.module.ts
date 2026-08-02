import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Plan, PlanSchema } from './infrastructure/schemas/plan.schema';
import { Payment, PaymentSchema } from './infrastructure/schemas/payment.schema';
import { Subscription, SubscriptionSchema } from './infrastructure/schemas/subscription.schema';
import { Challenge, ChallengeSchema } from './infrastructure/schemas/challenge.schema';
import { LedgerEntry, LedgerEntrySchema } from './infrastructure/schemas/ledger-entry.schema';
import { User, UserSchema } from '../auth/infrastructure/schemas/user.schema';
import { PlanService } from './application/plan.service';
import { PurchaseService } from './application/purchase.service';
import { PAYMENT_PROVIDER } from './infrastructure/payment/payment.port';
import { RazorpayProvider } from './infrastructure/payment/razorpay.provider';
import { ManualPaymentProvider } from './infrastructure/payment/manual.provider';
import { PlanController } from './presentation/plan.controller';
import { PlanAdminController } from './presentation/plan-admin.controller';
import { WebhookController } from './presentation/webhook.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Challenge.name, schema: ChallengeSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    AdminModule,
  ],
  controllers: [PlanController, PlanAdminController, WebhookController],
  providers: [
    PlanService,
    PurchaseService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('PAYMENT_PROVIDER') === 'razorpay' ? new RazorpayProvider(config) : new ManualPaymentProvider(),
    },
  ],
  exports: [MongooseModule],
})
export class PlansModule {}
