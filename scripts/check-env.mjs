import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const examplePath = path.join(projectRoot, '.env.example');
const envFile = process.env.ENV_FILE || '.env';
const envFilePath = path.join(projectRoot, envFile);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split('=');
      if (key) {
        acc[key.trim()] = rest.join('=').trim();
      }
      return acc;
    }, {});
}

function collectRequiredKeys(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo de ejemplo no encontrado: ${filePath}`);
  }

  const exampleVars = parseEnvFile(filePath);
  return Object.keys(exampleVars).filter(Boolean);
}

function checkEnvironment(requiredKeys, providedValues) {
  const missing = [];

  for (const key of requiredKeys) {
    const value = providedValues[key] ?? process.env[key];
    if (value === undefined || value === '') {
      missing.push(key);
    }
  }

  return missing;
}

const requiredKeys = collectRequiredKeys(examplePath);
const providedValues = parseEnvFile(envFilePath);
const missingKeys = checkEnvironment(requiredKeys, providedValues);

if (missingKeys.length > 0) {
  console.error('\u274c Variables de entorno faltantes o vacías:');
  missingKeys.forEach((key) => console.error(` - ${key}`));
  console.error(`\nSugerencia: define las variables en ${envFilePath} o exportalas en el shell antes de desplegar.`);
  process.exit(1);
}

console.log('\u2705 Todas las variables requeridas están definidas.');
