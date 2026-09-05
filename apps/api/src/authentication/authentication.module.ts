import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AccessAuthenticationGuard } from './access-authentication.guard.js';
import { AuthenticationController } from './authentication.controller.js';
import { AuthenticationCrypto } from './authentication.crypto.js';
import { AuthenticationRepository } from './authentication.repository.js';
import { AuthenticationService } from './authentication.service.js';
import { BootstrapAuthenticationService } from './bootstrap-authentication.service.js';
import { CsrfService } from './csrf.service.js';
import { LoginSecurity } from './login-security.js';
import { LogoutAuthenticationService } from './logout-authentication.service.js';
import { ProtectedAuthenticationService } from './protected-authentication.service.js';
import { RefreshAuthenticationService } from './refresh-authentication.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthenticationController],
  providers: [
    AccessAuthenticationGuard,
    AuthenticationCrypto,
    AuthenticationRepository,
    AuthenticationService,
    BootstrapAuthenticationService,
    CsrfService,
    LoginSecurity,
    LogoutAuthenticationService,
    ProtectedAuthenticationService,
    RefreshAuthenticationService,
  ],
  exports: [AuthenticationCrypto, CsrfService, LoginSecurity, ProtectedAuthenticationService],
})
export class AuthenticationModule {}
