import { DynamicModule, Global, Module } from '@nestjs/common';

import type { ApiEnvironment } from './environment.js';
import { API_ENVIRONMENT } from './tokens.js';

@Global()
@Module({})
export class ConfigurationModule {
  static forRoot(environment: ApiEnvironment): DynamicModule {
    return {
      module: ConfigurationModule,
      providers: [{ provide: API_ENVIRONMENT, useValue: environment }],
      exports: [API_ENVIRONMENT],
    };
  }
}
