// Role-based Access Control Middleware
// Locks down sensitive routes to admin/supervisor level only

import { Request, Response, NextFunction } from 'express';
import { evidenceLedger } from '../services/evidence-ledger.js';

export interface UserRole {
  userId: string;
  role: 'viewer' | 'technician' | 'supervisor' | 'admin';
  permissions: string[];
  lastActivity: Date;
}

export interface RoleCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole: string;
  userRole: string;
}

export class RoleGuard {
  private readonly ROLE_HIERARCHY = {
    'viewer': 0,
    'technician': 1, 
    'supervisor': 2,
    'admin': 3
  };

  private readonly ROUTE_PERMISSIONS = {
    '/api/export': ['admin', 'supervisor'],
    '/api/upload': ['admin', 'supervisor'],
    '/api/ingest/upload': ['admin', 'supervisor'],
    '/api/hitl': ['admin', 'supervisor'],
    '/api/system/snapshots': ['admin'],
    '/api/system/config': ['admin'],
    '/api/compliance/override': ['admin'],
    '/api/ledger/seal': ['admin']
  };

  // Mock user role system - in production would integrate with real auth
  private getUserRole(req: Request): UserRole {
    // Extract from session, JWT, or auth header
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const roleHeader = req.headers['x-user-role'] as string || 'viewer';
    
    return {
      userId,
      role: roleHeader as any,
      permissions: this.getRolePermissions(roleHeader as any),
      lastActivity: new Date()
    };
  }

  private getRolePermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      'viewer': ['read'],
      'technician': ['read', 'create_sop'],
      'supervisor': ['read', 'create_sop', 'approve_sop', 'export', 'upload'],
      'admin': ['*'] // All permissions
    };
    
    return permissions[role] || [];
  }

  private checkRouteAccess(path: string, userRole: string): RoleCheckResult {
    // Find matching route pattern
    const routePattern = Object.keys(this.ROUTE_PERMISSIONS).find(pattern => 
      path.startsWith(pattern) || path.includes(pattern)
    );

    if (!routePattern) {
      // Route not restricted
      return { allowed: true, requiredRole: 'any', userRole };
    }

    const requiredRoles = this.ROUTE_PERMISSIONS[routePattern as keyof typeof this.ROUTE_PERMISSIONS];
    const userRoleLevel = this.ROLE_HIERARCHY[userRole as keyof typeof this.ROLE_HIERARCHY] || 0;
    const hasAccess = requiredRoles.some((role: any) => {
      const requiredLevel = this.ROLE_HIERARCHY[role as keyof typeof this.ROLE_HIERARCHY] || 99;
      return userRoleLevel >= requiredLevel;
    });

    return {
      allowed: hasAccess,
      reason: hasAccess ? undefined : `Insufficient privileges: requires ${requiredRoles.join(' or ')}`,
      requiredRole: requiredRoles.join(' or '),
      userRole
    };
  }

  createRoleGuardMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userRole = this.getUserRole(req);
        const accessCheck = this.checkRouteAccess(req.path, userRole.role);

        // Log access attempt to evidence ledger
        await evidenceLedger.append({
          type: 'access_attempt',
          timestamp: new Date(),
          userId: userRole.userId,
          userRole: userRole.role,
          path: req.path,
          method: req.method,
          allowed: accessCheck.allowed,
          reason: accessCheck.reason,
          requiredRole: accessCheck.requiredRole,
          clientIp: req.ip,
          userAgent: req.headers['user-agent']
        });

        if (!accessCheck.allowed) {
          console.log(`🚫 Access denied: ${userRole.userId} (${userRole.role}) attempted ${req.method} ${req.path}`);
          console.log(`   Required: ${accessCheck.requiredRole}, Reason: ${accessCheck.reason}`);
          
          return res.status(403).json({
            error: 'Access Forbidden',
            message: accessCheck.reason,
            required_role: accessCheck.requiredRole,
            user_role: userRole.role,
            audit_id: Date.now().toString()
          });
        }

        // Store user context for downstream middleware
        (req as any).userRole = userRole;
        next();
      } catch (error) {
        console.error('Role guard middleware error:', error);
        
        // Fail-closed: deny access if role checking fails
        await evidenceLedger.append({
          type: 'access_error',
          timestamp: new Date(),
          path: req.path,
          method: req.method,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'denied_failsafe'
        });

        return res.status(500).json({
          error: 'Access Control Error',
          message: 'Unable to verify permissions - access denied for security'
        });
      }
    };
  }

  // Helper method to check permissions programmatically
  hasPermission(userRole: UserRole, permission: string): boolean {
    return userRole.permissions.includes('*') || userRole.permissions.includes(permission);
  }

  // Require specific role for route handler
  requireRole(requiredRole: string | string[]) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = (req as any).userRole as UserRole;
      
      if (!userRole) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoleLevel = this.ROLE_HIERARCHY[userRole.role as keyof typeof this.ROLE_HIERARCHY] || 0;
      const hasAccess = requiredRoles.some((role: any) => {
        const requiredLevel = this.ROLE_HIERARCHY[role as keyof typeof this.ROLE_HIERARCHY] || 99;
        return userRoleLevel >= requiredLevel;
      });

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Insufficient privileges',
          required: requiredRoles,
          current: userRole.role
        });
      }

      next();
    };
  }
}

export const roleGuard = new RoleGuard();