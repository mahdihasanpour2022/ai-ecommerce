import { DynamicModule, Module } from '@nestjs/common';

import { AuthenticationModule } from './authentication/authentication.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ConfigurationModule } from './config/configuration.module.js';
import type { ApiEnvironment } from './config/environment.js';
import { CustomerAuthenticationModule } from './customer-authentication/customer-authentication.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({})
export class AppModule {
  static forRoot(environment: ApiEnvironment): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigurationModule.forRoot(environment),
        DatabaseModule,
        AuthenticationModule,
        CustomerAuthenticationModule,
        CatalogModule,
      ],
    };
  }
}
