import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const applicationRoot = fileURLToPath(new URL('..', import.meta.url));
const nextBin = fileURLToPath(new URL('../../../node_modules/next/dist/bin/next', import.meta.url));
const mockApi = fileURLToPath(new URL('./mock-auth-api.mjs', import.meta.url));
const children = [
  spawn(process.execPath, [mockApi], { cwd: applicationRoot, stdio: 'inherit' }),
  spawn(process.execPath, [nextBin, 'start', '--port', '3101'], {
    cwd: applicationRoot,
    stdio: 'inherit',
    env: { ...process.env, API_BASE_URL: 'http://127.0.0.1:3202/api/v1' },
  }),
];

let exiting = false;
function stop(exitCode = 0) {
  if (exiting) return;
  exiting = true;
  for (const child of children) child.kill();
  process.exit(exitCode);
}

for (const child of children) {
  child.once('exit', (code) => {
    if (!exiting && code !== null && code !== 0) stop(code);
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
