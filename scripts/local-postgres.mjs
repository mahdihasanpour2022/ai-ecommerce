import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const composeArguments = ['compose', '--file', 'compose.yaml'];
const serviceName = 'postgres';
const databaseUser = 'e_commerce';
const databases = new Set(['e_commerce_dev', 'e_commerce_test']);

function fail(message) {
  throw new Error(message);
}

function runCompose(arguments_, { capture = false } = {}) {
  const result = spawnSync('docker', [...composeArguments, ...arguments_], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error?.code === 'ENOENT') {
    fail('Docker Compose is required but the docker command was not found.');
  }

  if (result.error) {
    fail(`Docker Compose could not be executed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = capture ? result.stderr.trim() : '';
    fail(detail || `Docker Compose exited with status ${String(result.status)}.`);
  }

  return capture ? result.stdout.trim() : '';
}

function verifyDatabase(databaseName) {
  const actualDatabase = runCompose(
    [
      'exec',
      '-T',
      serviceName,
      'psql',
      '--username',
      databaseUser,
      '--dbname',
      databaseName,
      '--tuples-only',
      '--no-align',
      '--command',
      'SELECT current_database();',
    ],
    { capture: true },
  );

  if (actualDatabase !== databaseName) {
    fail(`Database isolation check failed for ${databaseName}.`);
  }

  console.log(`${databaseName}: reachable and isolated`);
}

function resetDatabase(databaseName) {
  if (!databases.has(databaseName)) {
    fail('Reset target rejected: only e_commerce_dev or e_commerce_test is allowed.');
  }

  runCompose([
    'exec',
    '-T',
    serviceName,
    'dropdb',
    '--username',
    databaseUser,
    '--maintenance-db',
    'postgres',
    '--if-exists',
    '--force',
    databaseName,
  ]);
  runCompose([
    'exec',
    '-T',
    serviceName,
    'createdb',
    '--username',
    databaseUser,
    '--maintenance-db',
    'postgres',
    '--owner',
    databaseUser,
    databaseName,
  ]);
  verifyDatabase(databaseName);
}

function printUsage() {
  console.error(
    'Usage: node scripts/local-postgres.mjs <config|start|status|health|verify|stop|reset> [database]',
  );
}

function main() {
  const [command, databaseName, ...unexpectedArguments] = process.argv.slice(2);

  if (unexpectedArguments.length > 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case 'config':
      runCompose(['config', '--quiet']);
      break;
    case 'start':
      runCompose(['up', '--detach', '--wait', '--wait-timeout', '60', serviceName]);
      break;
    case 'status':
      runCompose(['ps', serviceName]);
      break;
    case 'health':
      runCompose([
        'exec',
        '-T',
        serviceName,
        'pg_isready',
        '--username',
        databaseUser,
        '--dbname',
        'e_commerce_dev',
      ]);
      break;
    case 'verify':
      verifyDatabase('e_commerce_dev');
      verifyDatabase('e_commerce_test');
      break;
    case 'stop':
      runCompose(['stop', serviceName]);
      break;
    case 'reset':
      if (databaseName === undefined) {
        fail('Reset target is required and must be e_commerce_dev or e_commerce_test.');
      }
      resetDatabase(databaseName);
      break;
    default:
      printUsage();
      process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local PostgreSQL command failed.');
  process.exitCode = 1;
}
