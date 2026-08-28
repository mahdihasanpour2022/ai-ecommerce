import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import {
  API_PREFIX,
  configureApplication,
  OPENAPI_JSON_PATH,
  SWAGGER_PATH,
} from '../src/application';
import type { RuntimeEnvironment } from '../src/config/environment';
import { createTestEnvironment } from './test-environment';

async function createTestApplication(environment: RuntimeEnvironment): Promise<INestApplication> {
  const apiEnvironment = createTestEnvironment(environment);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(apiEnvironment)],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApplication(app, apiEnvironment);
  await app.init();
  return app;
}

function getHttpServer(app: INestApplication): App {
  return app.getHttpServer() as App;
}

interface OpenApiDocumentBody {
  info: {
    title: string;
  };
  paths: Record<string, unknown>;
}

void describe('Swagger exposure', () => {
  let app: INestApplication | undefined;

  void afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  for (const environment of ['development', 'test'] as const) {
    void test(`serves Swagger UI and an empty generated document in ${environment}`, async () => {
      app = await createTestApplication(environment);

      await request(getHttpServer(app))
        .get(`/${SWAGGER_PATH}`)
        .expect(200)
        .expect('Content-Type', /html/);

      const response = await request(getHttpServer(app))
        .get(`/${OPENAPI_JSON_PATH}`)
        .expect(200)
        .expect('Content-Type', /json/);

      const body = response.body as OpenApiDocumentBody;
      assert.equal(body.info.title, 'Automotive Commerce API');
      assert.ok('/api/v1/auth/login' in body.paths);
      await request(getHttpServer(app)).get(`/${API_PREFIX}`).expect(404);
    });
  }

  void test('does not expose Swagger UI or generated document routes in production', async () => {
    app = await createTestApplication('production');

    await request(getHttpServer(app)).get(`/${SWAGGER_PATH}`).expect(404);
    await request(getHttpServer(app)).get(`/${OPENAPI_JSON_PATH}`).expect(404);
    await request(getHttpServer(app)).get(`/${SWAGGER_PATH}-yaml`).expect(404);
    await request(getHttpServer(app)).get(`/${API_PREFIX}`).expect(404);
  });
});
