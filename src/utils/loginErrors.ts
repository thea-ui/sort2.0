const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect LRN/Employee ID or password. Passwords are managed by EnrollPro — use your EnrollPro portal password.',
  NOT_PROVISIONED: 'Account not provisioned. Contact your administrator.',
  AUTH_SERVICE_UNREACHABLE: 'Authentication service unreachable. Please try again later.',
  SERVER_UNREACHABLE: 'Cannot reach the SORT server. Please try again later.',
  ACCOUNT_SUSPENDED: 'Account is suspended. Please try again later.',
  PASSWORD_CHANGE_REQUIRED: 'Please change your password in EnrollPro first, then sign in.',
  NO_ENROLLPRO_ACCOUNT: 'Your EnrollPro portal account is not yet activated. Contact the registrar.',
  RATE_LIMITED: 'Too many login attempts. Please try again in 15 minutes.',
  OFFLINE_PIN_INVALID:
    'EnrollPro is offline. Enter your SORT offline PIN in the password field (set it from your profile menu while signed in).',
  OFFLINE_PIN_LOCKED: 'Too many failed offline PIN attempts. Try again in 15 minutes.',
  OFFLINE_AUTH_DISABLED: 'Offline sign-in has ended. Sign in again once EnrollPro is reachable.',
};

export const ROLE_PORTAL_MESSAGE = 'This account does not have access to this portal.';

export function getLoginErrorMessage(code: string, message?: string): string {
  if (code === 'ACCOUNT_SUSPENDED' && message) return message;
  return ERROR_MESSAGES[code] || message || 'Authentication failed. Please verify your credentials.';
}
