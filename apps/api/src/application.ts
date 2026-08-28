import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';
export const OPENAPI_JSON_PATH = 'api/docs-json';

export function isSwaggerEnabled(environment: string | undefined): boolean {
  return environment === 'development' || environment === 'test';
}

export function configureApplication(
  app: INestApplication,
  environment: string = process.env.NODE_ENV ?? 'development',
): void {
  app.setGlobalPrefix(API_PREFIX);

  if (!isSwaggerEnabled(environment)) {
    return;
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('Automotive Commerce API')
    .setDescription('HTTP API contracts implemented by the Automotive Commerce backend.')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup(SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: `/${OPENAPI_JSON_PATH}`,
    useGlobalPrefix: false,
  });
}
