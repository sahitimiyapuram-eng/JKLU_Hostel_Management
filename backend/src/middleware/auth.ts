import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hostel_jwt_key_college_dbms_2024';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'Chief Warden' | 'Warden' | 'Student' | 'Security Guard';
  assigned_hostel?: 'GH1' | 'GH2' | 'BH1' | 'BH2' | null;
  student_code?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization required. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
    return;
  }
}

export function authorize(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized.`,
      });
      return;
    }

    next();
  };
}

// Server-side hostel security: Wardens can ONLY access their assigned hostel.
// Chief Warden can access any or all hostels.
export function resolveEffectiveHostel(req: AuthenticatedRequest, paramHostel?: string): {
  hostelCode: string | null;
  isRestricted: boolean;
} {
  const user = req.user;
  if (!user) return { hostelCode: null, isRestricted: false };

  if (user.role === 'Chief Warden') {
    return {
      hostelCode: paramHostel && ['GH1', 'GH2', 'BH1', 'BH2'].includes(paramHostel) ? paramHostel : null,
      isRestricted: false,
    };
  }

  // Warden is strictly restricted to their assigned hostel
  return {
    hostelCode: user.assigned_hostel || 'GH1',
    isRestricted: true,
  };
}
