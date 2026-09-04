import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

// ── JWT_SECRET startup guard ──────────────────────────────────────────────────
// Fail fast: if the secret is missing we refuse to start rather than silently
// signing tokens with a well-known fallback string.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required but was not set. ' +
    'Add it to your .env file before starting the server.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Token is normally sent via the httpOnly 'token' cookie (set by the auth
// controller). The Authorization: Bearer header is kept as a fallback. This
// lets the frontend rely on the cookie without an Authorization header.
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('No token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    next(new AppError('Invalid token', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized', 403));
    }

    next();
  };
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
  } catch {
    // Token invalid — continue as unauthenticated guest
  }

  next();
}

export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
