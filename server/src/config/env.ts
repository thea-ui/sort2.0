import dotenv from 'dotenv';

dotenv.config();

const INSECURE_DEFAULT = 'sortv2_super_secret_jwt_key_2026';
const MIN_SECRET_LENGTH = 32;

function readRequired(name: string): string {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(
      `[Config] Missing required environment variable "${name}". ` +
        'Add it to server/.env before starting the server.'
    );
  }
  return value;
}

/**
 * Validates the environment at startup so the process fails fast and loudly
 * instead of silently falling back to insecure defaults.
 */
export function validateEnv(): void {
  const jwtSecret = readRequired('JWT_SECRET');

  if (jwtSecret === INSECURE_DEFAULT) {
    throw new Error(
      '[Config] JWT_SECRET is set to the publicly known default value. ' +
        'Generate a strong secret with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
        'then set JWT_SECRET in server/.env.'
    );
  }

  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[Config] JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`
    );
  }

  readRequired('DATABASE_URL');
}

/**
 * Returns the validated JWT signing secret.
 * `validateEnv()` must have run at startup; this never falls back to a default.
 */
export function getJwtSecret(): string {
  return readRequired('JWT_SECRET');
}
