import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuthenticationController } from './authentication.controller.js';
import { AuthenticationCrypto } from './authentication.crypto.js';
import { AuthenticationRepository } from './authentication.repository.js';
import { AuthenticationService } from './authentication.service.js';
import { LoginSecurity } from './login-security.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthenticationController],
  providers: [AuthenticationCrypto, AuthenticationRepository, AuthenticationService, LoginSecurity],
  exports: [AuthenticationCrypto, LoginSecurity],
})
export class AuthenticationModule {}
