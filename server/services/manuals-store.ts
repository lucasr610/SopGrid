import fs from 'fs';
import os from 'os';
import path from 'path';

// Get the manuals directory from environment or use default
const home = os.homedir();
const root = (process.env.MANUALS_DIR || path.join(home, 'SopGrid', 'manuals')).replace(/^~\//, home + '/');

// Ensure the directory exists
fs.mkdirSync(root, { recursive: true });

console.log(`📁 Manual storage directory: ${root}`);

export function manualPath(rel: string): string {
  // Sanitize the relative path to prevent directory traversal
  const sanitized = rel.replace(/\.\./g, '').replace(/^\//, '');
  return path.join(root, sanitized);
}

export function saveManual(filename: string, buffer: Buffer): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fullPath = manualPath(sanitizedFilename);
  
  // Ensure the directory exists
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  
  // Write the file
  fs.writeFileSync(fullPath, buffer);
  
  console.log(`💾 Manual saved: ${fullPath}`);
  return fullPath;
}

export function readManual(filename: string): Buffer | null {
  try {
    const fullPath = manualPath(filename);
    return fs.readFileSync(fullPath);
  } catch (error) {
    console.error(`❌ Error reading manual: ${filename}`, error);
    return null;
  }
}

export function listManuals(): string[] {
  try {
    return fs.readdirSync(root).filter(file => {
      const stats = fs.statSync(path.join(root, file));
      return stats.isFile();
    });
  } catch (error) {
    console.error('❌ Error listing manuals:', error);
    return [];
  }
}

export function deleteManual(filename: string): boolean {
  try {
    const fullPath = manualPath(filename);
    fs.unlinkSync(fullPath);
    console.log(`🗑️ Manual deleted: ${fullPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting manual: ${filename}`, error);
    return false;
  }
}

export function getManualStats(filename: string): fs.Stats | null {
  try {
    const fullPath = manualPath(filename);
    return fs.statSync(fullPath);
  } catch (error) {
    console.error(`❌ Error getting manual stats: ${filename}`, error);
    return null;
  }
}