import { lstatSync, readFileSync } from 'fs';

// Check Node version
const nodeVersion = process.version;
const requiredVersion = readFileSync('.nvmrc', 'utf-8').trim();

if (!nodeVersion.startsWith(requiredVersion)) {
  console.error(
    `You are using Node ${nodeVersion}, but this project requires Node ${requiredVersion}.\nUse the correct node version to run this project`
  );
  process.exit(1);
}

// Check for env file
const envFile = lstatSync('.env.local', { throwIfNoEntry: false });
if (!envFile?.isFile()) {
  console.error(
    'You are missing a .env.local file. Please refer to the README for instructions on how to create one.'
  );
  process.exit(1);
}
