import { runUpdateInitialAdminCredentialsCli } from './update-initial-admin-credentials.js';

void runUpdateInitialAdminCredentialsCli({
  argv: process.argv.slice(2),
  environment: process.env,
  io: {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  },
}).then((exitCode) => {
  process.exitCode = exitCode;
});
