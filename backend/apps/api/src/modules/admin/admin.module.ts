import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './infrastructure/role.schema';
import { Employee, EmployeeSchema } from '../auth/infrastructure/schemas/employee.schema';
import { User, UserSchema } from '../auth/infrastructure/schemas/user.schema';
import { Session, SessionSchema } from '../auth/infrastructure/schemas/session.schema';
import { LoginHistory, LoginHistorySchema } from '../auth/infrastructure/schemas/login-history.schema';
import { RoleCacheService } from './application/role-cache.service';
import { EmployeeAdminService } from './application/employee-admin.service';
import { UserAdminService } from './application/user-admin.service';
import { ConfigAdminService } from './application/config-admin.service';
import { PermissionsGuard } from './presentation/permissions.guard';
import { AdminController } from './presentation/admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: LoginHistory.name, schema: LoginHistorySchema },
    ]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [RoleCacheService, EmployeeAdminService, UserAdminService, ConfigAdminService, PermissionsGuard],
  exports: [PermissionsGuard, RoleCacheService, MongooseModule],
})
export class AdminModule {}
