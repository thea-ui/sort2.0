import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';

const JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

export interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
  userName: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): any {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS }) as { id: string; role: string; name?: string };
    (req as AuthenticatedRequest).userId = decoded.id;
    (req as AuthenticatedRequest).userRole = decoded.role;
    (req as AuthenticatedRequest).userName = decoded.name || 'Unknown';
    next();
  } catch {
    return res.status(401).json({ error: 'Token is invalid or expired', code: 'INVALID_TOKEN' });
  }
}

/**
 * Attaches the authenticated user when a valid Bearer token is present, but
 * never rejects the request. Used for endpoints that serve both public and
 * role-scoped data (e.g. the leaderboard projection).
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): any {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS }) as { id: string; role: string; name?: string };
      (req as AuthenticatedRequest).userId = decoded.id;
      (req as AuthenticatedRequest).userRole = decoded.role;
      (req as AuthenticatedRequest).userName = decoded.name || 'Unknown';
    } catch {
      // Ignore invalid tokens here; the route decides what public data to serve.
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): any {
  authenticate(req, res, () => {
    if ((req as AuthenticatedRequest).userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    }
    next();
  });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): any => {
    authenticate(req, res, () => {
      if (!roles.includes((req as AuthenticatedRequest).userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      }
      next();
    });
  };
}
