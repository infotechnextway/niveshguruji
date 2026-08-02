import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserSchema } from './infrastructure/schemas/user.schema';
import { Session, SessionSchema } from './infrastructure/schemas/session.schema';
import { OtpRequest, OtpRequestSchema } from './infrastructure/schemas/otp-request.schema';
import { LoginHistory, LoginHistorySchema } from './infrastructure/schemas/login-history.schema';
import { Employee, EmployeeSchema } from './infrastructure/schemas/employee.schema';
import { PasswordService } from './infrastructure/password.service';
import { TokenService } from './infrastructure/token.service';
import { OtpService } from './infrastructure/otp.service';
import { SMS_SENDER } from './infrastructure/sms/sms.port';
import { ConsoleSmsSender } from './infrastructure/sms/console-sms.sender';
import { Msg91SmsSender } from './infrastructure/sms/msg91-sms.sender';
import { MAIL_SENDER } from './infrastructure/mail/mail.port';
import { ConsoleMailSender } from './infrastructure/mail/console-mail.sender';
import { SmtpMailSender } from './infrastructure/mail/smtp-mail.sender';
import { AuthService } from './application/auth.service';
import { EmployeeAuthService } from './application/employee-auth.service';
import { AuthController } from './presentation/auth.controller';
import { AdminAuthController } from './presentation/admin-auth.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: OtpRequest.name, schema: OtpRequestSchema },
      { name: LoginHistory.name, schema: LoginHistorySchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    PasswordService,
    TokenService,
    OtpService,
    AuthService,
    EmployeeAuthService,
    {
      provide: SMS_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('SMS_PROVIDER') === 'msg91' ? new Msg91SmsSender(config) : new ConsoleSmsSender(),
    },
    {
      provide: MAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get('MAIL_PROVIDER') === 'smtp' ? new SmtpMailSender(config) : new ConsoleMailSender(),
    },
  ],
  exports: [TokenService, PasswordService],
})
export class AuthModule {}
