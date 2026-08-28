import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { ApiEnvironment, RuntimeEnvironment } from './config/environment';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './authentication/authentication.constants';

export const API_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';
export const OPENAPI_JSON_PATH = 'api/docs-json';

export function isSwaggerEnabled(environment: RuntimeEnvironment): boolean {
  return environment === 'development' || environment === 'test';
}

export function configureApplication(app: INestApplication, environment: ApiEnvironment): void {
  app.setGlobalPrefix(API_PREFIX);

  app.enableCors({
    credentials: true,
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      callback(
        null,
        origin === undefined || environment.authentication.corsAllowedOrigins.has(origin),
      );
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });

  if (!isSwaggerEnabled(environment.nodeEnv)) {
    return;
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('Automotive Commerce API')
    .setDescription('HTTP API contracts implemented by the Automotive Commerce backend.')
    .setVersion('1.0')
    .addCookieAuth(ACCESS_COOKIE_NAME, { type: 'apiKey' }, 'adminAccess')
    .addCookieAuth(REFRESH_COOKIE_NAME, { type: 'apiKey' }, 'adminRefresh')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup(SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: `/${OPENAPI_JSON_PATH}`,
    useGlobalPrefix: false,
  });
}
