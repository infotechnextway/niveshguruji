import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const PASSWORD_MSG = 'Password must be 8–72 chars with upper, lower and a digit';

export class RegisterDto {
  @IsString() @Length(2, 100)
  name!: string;

  @IsEmail()
  email!: string;

  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Mobile must be +91 followed by a valid 10-digit number' })
  mobile!: string;

  @Matches(/^[a-zA-Z0-9_]{4,30}$/, { message: 'Username: 4–30 chars, letters/digits/underscore' })
  username!: string;

  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  password!: string;

  @IsOptional() @IsString() @MaxLength(20)
  referredBy?: string;
}

export class RequestOtpDto {
  @Matches(/^\+91[6-9]\d{9}$/)
  mobile!: string;
}

export class VerifyMobileDto extends RequestOtpDto {
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code!: string;
}

export class ResendEmailDto {
  @IsEmail()
  email!: string;
}

export class VerifyEmailDto {
  @IsString() @MinLength(20)
  token!: string;
}

export class LoginDto {
  /** Username or email. */
  @IsString() @Length(4, 254)
  identifier!: string;

  @IsString() @Length(8, 72)
  password!: string;
}

export class RefreshDto {
  @IsString() @MinLength(32)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(20)
  token!: string;

  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  newPassword!: string;
}

export class EmployeeLoginDto {
  @IsEmail()
  email!: string;

  @IsString() @Length(8, 72)
  password!: string;

  @ValidateIf((o: EmployeeLoginDto) => o.totpCode !== undefined)
  @Matches(/^\d{6}$/)
  totpCode?: string;
}

export class TotpEnableDto {
  @Matches(/^\d{6}$/)
  code!: string;
}

export class SessionScopeDto {
  @IsOptional() @IsIn(['current', 'all'])
  scope?: 'current' | 'all';
}
