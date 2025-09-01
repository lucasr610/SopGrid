import { db } from '../db';
import { sql } from 'drizzle-orm';
import { storage } from '../storage';

interface DatabaseInfo {
  name: string;
  type: 'postgresql' | 'sqlite';
  status: 'active' | 'inactive' | 'migrating';
  createdAt: Date;
  lastUsed: Date;
  tableCount: number;
  recordCount: number;
  size: string;
}

class DatabaseManager {
  private databases: Map<string, DatabaseInfo> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🗄️ Database Manager initializing...');
    
    try {
      // Check if database is accessible
      await this.checkDatabaseConnection();
      
      // Ensure all required tables exist
      await this.ensureRequiredTables();
      
      // Track the main database
      await this.trackDatabase('main', 'postgresql');
      
      this.initialized = true;
      console.log('✅ Database Manager initialized successfully');
    } catch (error) {
      console.error('❌ Database Manager initialization failed:', error);
      throw error;
    }
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      console.log('🔌 Database connection verified');
      return true;
    } catch (error) {
      console.error('🔌 Database connection failed:', error);
      throw new Error('Database connection failed');
    }
  }

  async ensureRequiredTables(): Promise<void> {
    try {
      // Check if our main tables exist
      const tableChecks = [
        'users', 'agents', 'documents', 'sops', 
        'system_metrics', 'compliance_checks', 
        'sop_corrections', 'training_rules', 
        'sop_approvals', 'sop_issue_reports'
      ];

      for (const tableName of tableChecks) {
        const exists = await this.tableExists(tableName);
        if (!exists) {
          console.log(`📋 Table ${tableName} missing - will be created by schema`);
        } else {
          console.log(`✅ Table ${tableName} exists`);
        }
      }

      // Apply any pending migrations
      await this.applyMigrations();
      
    } catch (error) {
      console.error('❌ Table verification failed:', error);
      throw error;
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        );
      `);
      return (result as any)[0]?.exists === true;
    } catch (error) {
      console.error(`Error checking table ${tableName}:`, error);
      return false;
    }
  }

  async applyMigrations(): Promise<void> {
    try {
      console.log('🔄 Applying database migrations...');
      
      // Check if we need to run drizzle push
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout, stderr } = await execAsync('npm run db:push', { 
          cwd: process.cwd(),
          timeout: 30000 
        });
        
        if (stderr && !stderr.includes('Warning')) {
          console.error('⚠️ Migration warnings:', stderr);
        }
        
        console.log('✅ Database migrations applied successfully');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        // Don't throw - continue with existing schema
      }
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      // Don't throw - continue with existing schema
    }
  }

  async trackDatabase(name: string, type: 'postgresql' | 'sqlite'): Promise<void> {
    const dbInfo: DatabaseInfo = {
      name,
      type,
      status: 'active',
      createdAt: new Date(),
      lastUsed: new Date(),
      tableCount: await this.getTableCount(),
      recordCount: await this.getRecordCount(),
      size: await this.getDatabaseSize()
    };

    this.databases.set(name, dbInfo);
    console.log(`📊 Tracking database: ${name} (${type})`);
  }

  async getTableCount(): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      return parseInt((result as any)[0]?.count as string) || 0;
    } catch (error) {
      console.error('Error getting table count:', error);
      return 0;
    }
  }

  async getRecordCount(): Promise<number> {
    try {
      // Get approximate record count across main tables
      const tables = ['users', 'documents', 'sops', 'agents'];
      let totalRecords = 0;

      for (const table of tables) {
        try {
          const exists = await this.tableExists(table);
          if (exists) {
            const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
            totalRecords += parseInt((result as any)[0]?.count as string) || 0;
          }
        } catch (error) {
          // Skip tables that don't exist or have issues
          continue;
        }
      }

      return totalRecords;
    } catch (error) {
      console.error('Error getting record count:', error);
      return 0;
    }
  }

  async getDatabaseSize(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      return (result as any)[0]?.size as string || '0 bytes';
    } catch (error) {
      console.error('Error getting database size:', error);
      return '0 bytes';
    }
  }

  async updateDatabaseStats(name: string): Promise<void> {
    const dbInfo = this.databases.get(name);
    if (!dbInfo) return;

    dbInfo.lastUsed = new Date();
    dbInfo.tableCount = await this.getTableCount();
    dbInfo.recordCount = await this.getRecordCount();
    dbInfo.size = await this.getDatabaseSize();

    this.databases.set(name, dbInfo);
  }

  async getDatabaseStats(): Promise<DatabaseInfo[]> {
    // Update stats for all tracked databases
    for (const name of Array.from(this.databases.keys())) {
      await this.updateDatabaseStats(name);
    }
    
    return Array.from(this.databases.values());
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    databases: DatabaseInfo[];
    issues: string[];
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // Check database connectivity
      const isConnected = await this.checkDatabaseConnection();
      if (!isConnected) {
        issues.push('Database connection failed');
        status = 'error';
      }

      // Check for missing tables
      const requiredTables = ['users', 'documents', 'agents', 'sops'];
      for (const table of requiredTables) {
        const exists = await this.tableExists(table);
        if (!exists) {
          issues.push(`Missing required table: ${table}`);
          status = status === 'error' ? 'error' : 'warning';
        }
      }

      // Update database stats
      const databases = await this.getDatabaseStats();

      return { status, databases, issues };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'error',
        databases: [],
        issues: ['Health check failed: ' + (error as Error).message]
      };
    }
  }

  async createAgent(): Promise<any> {
    const agent = {
      name: 'Database Manager',
      type: 'database_manager',
      status: 'active',
      description: 'Manages database creation, tracking, and health monitoring',
      config: {
        autoMigrate: true,
        healthCheckInterval: 300000, // 5 minutes
        trackingEnabled: true
      },
      capabilities: [
        'database_creation',
        'schema_management', 
        'health_monitoring',
        'migration_management',
        'stats_tracking'
      ]
    };

    try {
      const createdAgent = await storage.createAgent(agent);
      console.log('🤖 Database Manager agent created:', createdAgent.id);
      return createdAgent;
    } catch (error) {
      console.error('Failed to create Database Manager agent:', error);
      throw error;
    }
  }
}

export const databaseManager = new DatabaseManager();

// Auto-initialize when module loads
databaseManager.initialize().catch(error => {
  console.error('Database Manager auto-initialization failed:', error);
});