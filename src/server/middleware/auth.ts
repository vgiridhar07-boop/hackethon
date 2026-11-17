import { Request, Response, NextFunction } from 'express';
import { RbacRole } from '../../types';

export interface AuthenticatedUser {
  userId: string;
  role: RbacRole;
  phone?: string;
  email?: string;
  districtId?: number;
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | null;
    }
  }
}

/**
 * Authentication & Security Middleware
 * Inspects Authorization bearer tokens, x-user-id headers, and session credentials.
 */
export const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const customUserId = req.headers['x-user-id'] as string;
  const customRole = (req.headers['x-user-role'] as string) || 'Citizen';
  const adminKey = req.headers['x-admin-secret'] as string;

  // Super Admin secret bypass for system integrations
  if (adminKey && adminKey === process.env.ADMIN_SECRET_KEY) {
    req.user = {
      userId: 'system-super-admin',
      role: 'System Admin',
    };
    return next();
  }

  // Extract from Bearer token or x-user-id header
  let extractedUserId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      extractedUserId = token;
    }
  } else if (customUserId) {
    extractedUserId = customUserId;
  }

  if (extractedUserId) {
    // Map valid roles safely
    const validRoles: RbacRole[] = ['Citizen', 'Department Operator', 'State Moderator', 'System Admin'];
    const resolvedRole: RbacRole = validRoles.includes(customRole as RbacRole)
      ? (customRole as RbacRole)
      : 'Citizen';

    req.user = {
      userId: extractedUserId,
      role: resolvedRole,
      phone: req.headers['x-user-phone'] as string,
      email: req.headers['x-user-email'] as string,
    };
  } else {
    req.user = null;
  }

  next();
};

/**
 * Enforce Authenticated Users Only
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'Access denied. You must be authenticated to access this endpoint.',
      code: 'UNAUTHENTICATED_ACCESS_DENIED',
    });
  }
  next();
};

/**
 * Enforce Administrative Roles Only (Department Operator, State Moderator, System Admin)
 */
export const requireAdminOrModerator = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      code: 'UNAUTHENTICATED',
    });
  }

  if (req.user.role === 'Citizen') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Regular citizens are restricted from accessing administrative tables or operations.',
      code: 'CITIZEN_ACCESS_FORBIDDEN',
    });
  }

  next();
};

