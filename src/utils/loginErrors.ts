const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect LRN/Employee ID or password. Passwords are managed by EnrollPro — use your EnrollPro portal password.',
  NOT_PROVISIONED: 'Account not provisioned. Contact your administrator.',
  AUTH_SERVICE_UNREACHABLE: 'EnrollPro is unreachable and no offline sign-in is available for this account yet. Sign in once while EnrollPro is online to enable it.',
  SERVER_UNREACHABLE: 'Cannot reach the SORT server. Please try again later.',
  ACCOUNT_SUSPENDED: 'Account is suspended. Please try again later.',
  NO_ENROLLPRO_ACCOUNT: 'Your EnrollPro portal account is not yet activated. Contact the registrar.',
  RATE_LIMITED: 'Too many login attempts. Please try again in 15 minutes.',
  WRONG_PORTAL: 'This account does not have access to this portal.',
};

export const ROLE_PORTAL_MESSAGE = 'This account does not have access to this portal.';

export function getLoginErrorMessage(code: string, message?: string): string {
  if (code === 'ACCOUNT_SUSPENDED' && message) return message;
  return ERROR_MESSAGES[code] || message || 'Authentication failed. Please verify your credentials.';
}
