import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApplication } from './application';
import { parseEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const environment = parseEnvironment();
  const app = await NestFactory.create(AppModule.forRoot(environment));
  configureApplication(app, environment);
  await app.listen(environment.port);
}

void bootstrap();
