import { Injectable } from '@nestjs/common';

import { AuthenticationCrypto, type IssuedLoginCredentials } from './authentication.crypto.js';
import { AuthenticationError } from './authentication.errors.js';
import { INVALID_CREDENTIALS_MESSAGE, RATE_LIMITED_MESSAGE } from './authentication.constants.js';
import { AuthenticationRepository } from './authentication.repository.js';
import type { LoginInput } from './login.dto.js';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly repository: AuthenticationRepository,
    private readonly crypto: AuthenticationCrypto,
  ) {}

  async login(input: LoginInput): Promise<IssuedLoginCredentials> {
    const identifierKey = this.crypto.identifierKey(input.email);
    const retryAfter = await this.repository.consumeAccountAttempt(identifierKey);
    if (retryAfter !== null) {
      throw new AuthenticationError(429, 'AUTH_RATE_LIMITED', RATE_LIMITED_MESSAGE, retryAfter);
    }

    const admin = await this.repository.findAdmin(input.email);
    const passwordValid = await this.crypto.verifyPassword(
      admin?.passwordHash ?? null,
      input.password,
    );
    if (admin === null || !passwordValid || admin.disabled || !admin.eligible) {
      throw new AuthenticationError(401, 'INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
    }

    const replacementPasswordHash = this.crypto.passwordNeedsRehash(admin.passwordHash)
      ? await this.crypto.hashPassword(input.password)
      : null;
    const credentials = await this.crypto.issueLoginCredentials(admin.id);
    await this.repository.commitSuccessfulLogin(
      admin.id,
      identifierKey,
      credentials,
      replacementPasswordHash,
    );
    return credentials;
  }
}
