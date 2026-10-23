const ENROLLPRO_BASE = process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api';

export interface EnrollProAuthResult {
  success: boolean;
  mustChangePassword?: boolean;
  accountInactive?: boolean;
  token?: string;
  user?: { id: number; name: string; email: string; role: string };
  error?: string;
  unreachable?: boolean;
}

function classifyNetworkError(error: any): boolean {
  const causeCode = error.cause?.code || error.code;
  return (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError' ||
    error.name === 'TypeError' ||
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ENOTFOUND' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'EPIPE' ||
    causeCode === 'ETIMEDOUT' ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    causeCode === 'UND_ERR_SOCKET_TIMEOUT'
  );
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function authenticateWithEnrollPro(
  identifier: string,
  password: string
): Promise<EnrollProAuthResult> {
  try {
    const res = await fetch(`${ENROLLPRO_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountName: identifier, password }),
      signal: AbortSignal.timeout(10000),
    });

    // ONLY a true 401 means "wrong credentials". Validation (400) is treated
    // the same; every other failure — proxy HTML, 404 routes, unknown statuses
    // — means EnrollPro is not effectively serving auth, so it must surface as
    // unreachable instead of a misleading "incorrect password".
    if (res.status === 401 || res.status === 400) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, unreachable: true, error: `EnrollPro returned ${res.status}: ${body || res.statusText}` };
    }

    let data: {
      token?: string;
      accessToken?: string;
      user?: { id: number; name: string; email: string; role: string };
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return { success: false, unreachable: true, error: 'EnrollPro returned a non-JSON login response' };
    }

    const jwtToken = data.token || data.accessToken || '';
    const payload = decodeJwtPayload(jwtToken);
    const mustChange = payload?.mustChangePassword === true;

    return {
      success: true,
      token: jwtToken,
      user: data.user,
      mustChangePassword: mustChange || undefined,
    };
  } catch (error: any) {
    if (classifyNetworkError(error)) {
      const causeCode = error.cause?.code || error.code;
      return { success: false, unreachable: true, error: `Authentication service unreachable: ${causeCode || error.message}` };
    }
    // Unknown client-side failures (e.g. malformed proxy responses) are
    // service problems, not credential verdicts.
    return {
      success: false,
      unreachable: true,
      error: `Authentication service error: ${error.message || 'unknown'}`,
    };
  }
}

export async function authenticateLearnerWithEnrollPro(
  lrn: string,
  password: string
): Promise<EnrollProAuthResult> {
  try {
    const res = await fetch(`${ENROLLPRO_BASE}/learner/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lrn, password }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 200) {
      let body: {
        token?: string;
        requiresPasswordReset?: boolean;
        learner?: { id: number; lrn: string; firstName: string; lastName: string; middleName?: string };
      };
      try {
        body = (await res.json()) as typeof body;
      } catch {
        return { success: false, unreachable: true, error: 'EnrollPro returned a non-JSON learner response' };
      }
      return {
        success: true,
        mustChangePassword: body.requiresPasswordReset === true || undefined,
      };
    }

    if (res.status === 401) {
      const body = await res.json().catch(() => null) as { code?: string } | null;
      if (body?.code === 'ACCOUNT_INACTIVE') {
        return { success: false, accountInactive: true };
      }
      return { success: false, error: 'Invalid credentials' };
    }

    if (res.status === 400) {
      return { success: false, error: 'Validation failed' };
    }

    // Any other status (proxy errors, missing routes, unexpected codes) means
    // the auth service is not effectively reachable — never a credential call.
    const body = await res.text().catch(() => '');
    return { success: false, unreachable: true, error: `EnrollPro returned ${res.status}: ${body || res.statusText}` };
  } catch (error: any) {
    if (classifyNetworkError(error)) {
      const causeCode = error.cause?.code || error.code;
      return { success: false, unreachable: true, error: `Authentication service unreachable: ${causeCode || error.message}` };
    }
    return {
      success: false,
      unreachable: true,
      error: `Authentication service error: ${error.message || 'unknown'}`,
    };
  }
}
