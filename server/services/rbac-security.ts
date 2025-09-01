import crypto from 'crypto';

export type UserRole = 'super_admin' | 'admin' | 'technician' | 'viewer' | 'guest';

export type Permission = 
  | 'create_sop' | 'edit_sop' | 'delete_sop' | 'approve_sop'
  | 'view_documents' | 'upload_documents' | 'delete_documents'
  | 'manage_users' | 'view_users' | 'edit_users'
  | 'view_analytics' | 'manage_system' | 'export_data'
  | 'moderate_content' | 'access_admin_panel'
  | 'manage_training' | 'view_training' | 'certify_users';

interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

interface SecurityPolicy {
  encryption: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: number; // minutes
  passwordComplexity: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  ipWhitelist?: string[];
  auditLogging: boolean;
}

export class RBACSecurityService {
  private rolePermissions: Map<UserRole, Permission[]> = new Map();
  private securityPolicy: SecurityPolicy;

  constructor() {
    this.initializeRoles();
    this.securityPolicy = this.getDefaultSecurityPolicy();
  }

  private initializeRoles(): void {
    const roles: RolePermissions[] = [
      {
        role: 'super_admin',
        permissions: [
          'create_sop', 'edit_sop', 'delete_sop', 'approve_sop',
          'view_documents', 'upload_documents', 'delete_documents',
          'manage_users', 'view_users', 'edit_users',
          'view_analytics', 'manage_system', 'export_data',
          'moderate_content', 'access_admin_panel',
          'manage_training', 'view_training', 'certify_users'
        ],
        description: 'Full system access - Lucas.Reynolds level'
      },
      {
        role: 'admin',
        permissions: [
          'create_sop', 'edit_sop', 'approve_sop',
          'view_documents', 'upload_documents',
          'view_users', 'edit_users',
          'view_analytics', 'moderate_content',
          'manage_training', 'view_training', 'certify_users'
        ],
        description: 'Administrative access with user management'
      },
      {
        role: 'technician',
        permissions: [
          'create_sop', 'edit_sop',
          'view_documents', 'upload_documents',
          'view_training'
        ],
        description: 'Technician access for SOP creation and training'
      },
      {
        role: 'viewer',
        permissions: [
          'view_documents',
          'view_training'
        ],
        description: 'Read-only access to documents and training'
      },
      {
        role: 'guest',
        permissions: [],
        description: 'No permissions - authentication required'
      }
    ];

    roles.forEach(role => {
      this.rolePermissions.set(role.role, role.permissions);
    });

    console.log('🔐 RBAC Security initialized with 5 role levels');
  }

  hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = this.rolePermissions.get(userRole);
    return rolePermissions?.includes(permission) || false;
  }

  getUserPermissions(userRole: UserRole): Permission[] {
    return this.rolePermissions.get(userRole) || [];
  }

  validateAccess(userRole: UserRole, requiredPermissions: Permission[]): {
    hasAccess: boolean;
    missingPermissions: Permission[];
  } {
    const userPermissions = this.getUserPermissions(userRole);
    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission)
    );

    return {
      hasAccess: missingPermissions.length === 0,
      missingPermissions
    };
  }

  encryptSensitiveData(data: string, key?: string): string {
    const secretKey = key || process.env.ENCRYPTION_KEY || 'fallback-dev-key';
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptSensitiveData(encryptedData: string, key?: string): string {
    const secretKey = key || process.env.ENCRYPTION_KEY || 'fallback-dev-key';
    const algorithm = 'aes-256-gcm';
    
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  validatePasswordComplexity(password: string): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const policy = this.securityPolicy.passwordComplexity;

    if (password.length < policy.minLength) {
      violations.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      violations.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  logSecurityEvent(
    userId: string,
    action: string,
    details: any,
    ipAddress?: string
  ): void {
    if (!this.securityPolicy.auditLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details,
      ipAddress,
      sessionId: this.generateSessionId()
    };

    // In production, this would write to secure audit log
    console.log('🔍 Security audit:', JSON.stringify(logEntry));
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getDefaultSecurityPolicy(): SecurityPolicy {
    return {
      encryption: true,
      twoFactorAuth: false, // Can be enabled per user
      sessionTimeout: 480, // 8 hours
      passwordComplexity: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      auditLogging: true
    };
  }

  getSecurityPolicy(): SecurityPolicy {
    return { ...this.securityPolicy };
  }

  updateSecurityPolicy(updates: Partial<SecurityPolicy>): void {
    this.securityPolicy = { ...this.securityPolicy, ...updates };
    console.log('🔒 Security policy updated');
  }
}

export const rbacSecurity = new RBACSecurityService();