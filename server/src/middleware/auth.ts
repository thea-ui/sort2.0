import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sortv2_super_secret_jwt_key_2026';

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; name?: string };
    (req as AuthenticatedRequest).userId = decoded.id;
    (req as AuthenticatedRequest).userRole = decoded.role;
    (req as AuthenticatedRequest).userName = decoded.name || 'Unknown';
    next();
  } catch {
    return res.status(401).json({ error: 'Token is invalid or expired', code: 'INVALID_TOKEN' });
  }
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
