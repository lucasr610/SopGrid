import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  
  return { valid: true };
}

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export function getRolePermissions(role: string): string[] {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return ['all', 'system_admin', 'user_management', 'enterprise_config'];
    case USER_ROLES.ADMIN:
      return ['all', 'user_management'];
    case USER_ROLES.SUPERVISOR:
      return ['view_all', 'create_sop', 'approve_sop', 'manage_documents'];
    case USER_ROLES.TECHNICIAN:
      return ['view_sop', 'create_sop', 'upload_documents'];
    case USER_ROLES.VIEWER:
      return ['view_sop'];
    default:
      return [];
  }
}