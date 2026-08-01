import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// In a real app, this should fetch Keycloak's public JWKS.
// For testing without a hardcoded secret, we can decode the token or use a mock validation.
// Keycloak RS256 token verification requires the realm's public key.
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Decoding without verify for local scaffolding. 
    // DO NOT DO THIS IN PRODUCTION! Use jwt.verify() with Keycloak's public key.
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Attach to request
    (req as any).user = {
      id: decoded.sub,
      username: decoded.preferred_username,
      roles: decoded.realm_access?.roles || []
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !user.roles.includes(role)) {
      return res.status(403).json({ error: `Forbidden: Requires ${role} role` });
    }
    next();
  };
};
