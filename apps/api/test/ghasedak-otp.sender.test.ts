import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import { GhasedakOtpSender } from '../src/customer-authentication/ghasedak-otp.sender.js';
import { FakeOtpSender } from './fakes/fake-otp.sender.js';

const providerEnvironment = {
  ghasedakApiKey: 'private-test-key',
  ghasedakTemplateName: 'Ghasedak',
};

// یک فرمان معتبر و غیرحساس برای تمرکز تست‌ها روی مرز provider می‌سازد.
function createCommand() {
  return {
    mobile: '+989217101700',
    code: '123456',
    clientReferenceId: randomUUID(),
  } as const;
}

void describe('Ghasedak OTP sender', () => {
  void test('maps the canonical mobile and approved template request exactly once', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const request: typeof globalThis.fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ IsSuccess: true, StatusCode: 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const command = createCommand();
    const sender = new GhasedakOtpSender(providerEnvironment, request);

    assert.deepEqual(await sender.send(command), { status: 'ACCEPTED' });
    assert.equal(
      capturedUrl,
      'https://gateway.ghasedak.me/rest/api/v1/WebService/SendOtpSMS',
    );
    assert.equal(capturedInit?.method, 'POST');
    assert.equal(new Headers(capturedInit?.headers).get('ApiKey'), 'private-test-key');
    assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
      sendDate: null,
      receptors: [{ mobile: '09217101700', clientReferenceId: command.clientReferenceId }],
      templateName: 'Ghasedak',
      inputs: [{ param: 'Code', value: '123456' }],
      isVoice: false,
    });
  });

  void test('maps explicit provider and client rejection to REJECTED', async () => {
    const rejectedResponse: typeof globalThis.fetch = async () =>
      new Response(JSON.stringify({ IsSuccess: false, StatusCode: 402 }), { status: 200 });
    const badRequest: typeof globalThis.fetch = async () =>
      new Response(JSON.stringify({ IsSuccess: false, StatusCode: 400 }), { status: 400 });

    assert.deepEqual(
      await new GhasedakOtpSender(providerEnvironment, rejectedResponse).send(createCommand()),
      { status: 'REJECTED' },
    );
    assert.deepEqual(
      await new GhasedakOtpSender(providerEnvironment, badRequest).send(createCommand()),
      { status: 'REJECTED' },
    );
  });

  void test('maps malformed success and server failure to UNKNOWN', async () => {
    const malformed: typeof globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'missing acceptance flag' }), { status: 200 });
    const serverFailure: typeof globalThis.fetch = async () =>
      new Response(JSON.stringify({ IsSuccess: false, StatusCode: 503 }), { status: 503 });

    assert.deepEqual(
      await new GhasedakOtpSender(providerEnvironment, malformed).send(createCommand()),
      { status: 'UNKNOWN' },
    );
    assert.deepEqual(
      await new GhasedakOtpSender(providerEnvironment, serverFailure).send(createCommand()),
      { status: 'UNKNOWN' },
    );
  });

  void test('does not retry timeout or expose provider secrets through its outcome', async () => {
    let attempts = 0;
    const timedOut: typeof globalThis.fetch = async () => {
      attempts += 1;
      throw new Error('private-test-key 123456 09217101700');
    };
    const outcome = await new GhasedakOtpSender(providerEnvironment, timedOut).send(createCommand());

    assert.deepEqual(outcome, { status: 'UNKNOWN' });
    assert.equal(attempts, 1);
    assert.doesNotMatch(JSON.stringify(outcome), /private-test-key|123456|09217101700/u);
  });

  void test('rejects invalid commands without calling Ghasedak', async () => {
    let attempts = 0;
    const request: typeof globalThis.fetch = async () => {
      attempts += 1;
      return new Response(JSON.stringify({ IsSuccess: true, StatusCode: 200 }), { status: 200 });
    };
    const sender = new GhasedakOtpSender(providerEnvironment, request);

    assert.deepEqual(
      await sender.send({ ...createCommand(), mobile: '09217101700' }),
      { status: 'REJECTED' },
    );
    assert.deepEqual(
      await sender.send({ ...createCommand(), clientReferenceId: 'login-001' }),
      { status: 'REJECTED' },
    );
    assert.equal(attempts, 0);
  });

  void test('provides a deterministic network-free fake for later authentication tests', async () => {
    const fake = new FakeOtpSender();
    const command = createCommand();

    assert.deepEqual(await fake.send(command), { status: 'ACCEPTED' });
    fake.setOutcome({ status: 'UNKNOWN' });
    assert.deepEqual(await fake.send(command), { status: 'UNKNOWN' });
    assert.deepEqual(fake.commands, [command, command]);
  });
});
