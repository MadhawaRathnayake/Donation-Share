"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// In a real app, this should fetch Keycloak's public JWKS.
// For testing without a hardcoded secret, we can decode the token or use a mock validation.
// Keycloak RS256 token verification requires the realm's public key.
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        // Decoding without verify for local scaffolding. 
        // DO NOT DO THIS IN PRODUCTION! Use jwt.verify() with Keycloak's public key.
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // Attach to request
        req.user = {
            id: decoded.sub,
            username: decoded.preferred_username,
            roles: decoded.realm_access?.roles || []
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Token verification failed' });
    }
};
exports.authenticate = authenticate;
const requireRole = (role) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.roles.includes(role)) {
            return res.status(403).json({ error: `Forbidden: Requires ${role} role` });
        }
        next();
    };
};
exports.requireRole = requireRole;
