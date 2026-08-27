import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import {
  API_PREFIX,
  configureApplication,
  OPENAPI_JSON_PATH,
  SWAGGER_PATH,
} from "../src/application";

async function createTestApplication(environment: string): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApplication(app, environment);
  await app.init();
  return app;
}

describe("Swagger exposure", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  for (const environment of ["development", "test"]) {
    test(`serves Swagger UI and an empty generated document in ${environment}`, async () => {
      app = await createTestApplication(environment);

      await request(app.getHttpServer())
        .get(`/${SWAGGER_PATH}`)
        .expect(200)
        .expect("Content-Type", /html/);

      const response = await request(app.getHttpServer())
        .get(`/${OPENAPI_JSON_PATH}`)
        .expect(200)
        .expect("Content-Type", /json/);

      assert.equal(response.body.info.title, "Automotive Commerce API");
      assert.deepEqual(response.body.paths, {});
      await request(app.getHttpServer()).get(`/${API_PREFIX}`).expect(404);
    });
  }

  test("does not expose Swagger UI or generated document routes in production", async () => {
    app = await createTestApplication("production");

    await request(app.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(404);
    await request(app.getHttpServer()).get(`/${OPENAPI_JSON_PATH}`).expect(404);
    await request(app.getHttpServer()).get(`/${SWAGGER_PATH}-yaml`).expect(404);
    await request(app.getHttpServer()).get(`/${API_PREFIX}`).expect(404);
  });
});
