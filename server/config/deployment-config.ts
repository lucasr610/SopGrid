import * as fs from 'fs';
import * as path from 'path';

export interface DeploymentConfig {
  environment: 'local' | 'cloud' | 'hybrid';
  storage: {
    root: string;
    sops: string;
    documents: string;
    vectors: string;
    backups: string;
    logs: string;
  };
  ai: {
    preferLocal: boolean;
    fallbackToCloud: boolean;
    costThreshold: number;
    ollama: {
      enabled: boolean;
      baseUrl: string;
      models: {
        small: string;
        large: string;
      };
    };
    cloud: {
      openai: boolean;
      gemini: boolean;
      anthropic: boolean;
    };
  };
  databases: {
    postgres: {
      url: string;
      local: boolean;
    };
    mongodb: {
      uri: string;
      local: boolean;
    };
    qdrant: {
      url: string;
      apiKey?: string;
      local: boolean;
    };
  };
  features: {
    websocket: boolean;
    monitoring: boolean;
    arbitration: boolean;
    selfHealing: boolean;
    snapshots: boolean;
  };
}

class ConfigLoader {
  private config: DeploymentConfig;

  constructor() {
    this.loadEnvironment();
    this.config = this.buildConfig();
    this.validateConfig();
    this.createDirectories();
  }

  private loadEnvironment(): void {
    // Environment variables should already be loaded by the main application
    // Check if we're in local deployment mode
    const localEnvPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(localEnvPath)) {
      console.log('Local deployment configuration detected (.env.local)');
    }
  }

  private buildConfig(): DeploymentConfig {
    const isLocal = process.env.NODE_ENV !== 'production' || process.env.DEPLOYMENT === 'local';
    const storageRoot = process.env.LOCAL_STORAGE_ROOT || '/tmp/oracle-engine';

    return {
      environment: this.determineEnvironment(),
      storage: {
        root: storageRoot,
        sops: process.env.SOP_STORAGE_PATH || path.join(storageRoot, 'sops'),
        documents: process.env.DOCUMENT_STORAGE_PATH || path.join(storageRoot, 'documents'),
        vectors: process.env.VECTOR_STORAGE_PATH || path.join(storageRoot, 'vectors'),
        backups: process.env.BACKUP_PATH || path.join(storageRoot, 'backups'),
        logs: process.env.LOG_PATH || path.join(storageRoot, 'logs')
      },
      ai: {
        preferLocal: process.env.PREFER_LOCAL_MODELS !== 'false',
        fallbackToCloud: process.env.FALLBACK_TO_CLOUD !== 'false',
        costThreshold: parseFloat(process.env.COST_THRESHOLD || '10'),
        ollama: {
          enabled: process.env.OLLAMA_BASE_URL ? true : false,
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          models: {
            small: process.env.OLLAMA_SMALL_MODEL || 'mistral:7b',
            large: process.env.OLLAMA_LARGE_MODEL || 'llama2:13b'
          }
        },
        cloud: {
          openai: !!process.env.OPENAI_API_KEY,
          gemini: !!process.env.GEMINI_API_KEY,
          anthropic: !!process.env.ANTHROPIC_API_KEY
        }
      },
      databases: {
        postgres: {
          url: process.env.DATABASE_URL || '',
          local: this.isLocalDatabase(process.env.DATABASE_URL || '')
        },
        mongodb: {
          uri: process.env.MONGODB_URI || '',
          local: this.isLocalDatabase(process.env.MONGODB_URI || '')
        },
        qdrant: {
          url: process.env.QDRANT_URL || '',
          apiKey: process.env.QDRANT_API_KEY,
          local: this.isLocalDatabase(process.env.QDRANT_URL || '')
        }
      },
      features: {
        websocket: process.env.ENABLE_WEBSOCKET !== 'false',
        monitoring: process.env.ENABLE_MONITORING !== 'false',
        arbitration: process.env.ENABLE_ARBITRATION !== 'false',
        selfHealing: process.env.ENABLE_SELF_HEALING !== 'false',
        snapshots: process.env.ENABLE_SNAPSHOTS !== 'false'
      }
    };
  }

  private determineEnvironment(): 'local' | 'cloud' | 'hybrid' {
    const hasOllama = !!process.env.OLLAMA_BASE_URL;
    const hasCloudAPIs = !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
    
    if (hasOllama && !hasCloudAPIs) {
      return 'local';
    } else if (!hasOllama && hasCloudAPIs) {
      return 'cloud';
    } else {
      return 'hybrid';
    }
  }

  private isLocalDatabase(url: string): boolean {
    if (!url) return false;
    return url.includes('localhost') || 
           url.includes('127.0.0.1') || 
           url.includes('host.docker.internal');
  }

  private validateConfig(): void {
    // Check if at least one AI service is available
    if (!this.config.ai.ollama.enabled && 
        !this.config.ai.cloud.openai && 
        !this.config.ai.cloud.gemini && 
        !this.config.ai.cloud.anthropic) {
      console.warn('⚠️  WARNING: No AI services configured!');
      console.warn('   Please configure Ollama or at least one cloud API key.');
    }

    // Check database configuration
    if (!this.config.databases.postgres.url) {
      console.warn('⚠️  WARNING: PostgreSQL not configured!');
    }

    // Log deployment mode
    console.log(`🚀 Deployment Mode: ${this.config.environment.toUpperCase()}`);
    
    if (this.config.environment === 'local') {
      console.log('   ✅ Using local Ollama models (FREE)');
      console.log('   ✅ No cloud API costs');
    } else if (this.config.environment === 'hybrid') {
      console.log('   ✅ Ollama models as primary (FREE)');
      console.log('   ⚠️  Cloud APIs as fallback (costs apply)');
      console.log(`   💰 Cost threshold: $${this.config.ai.costThreshold}`);
    } else {
      console.log('   ⚠️  Using cloud APIs only (costs apply)');
    }
  }

  private createDirectories(): void {
    // Create necessary directories if they don't exist
    const dirs = [
      this.config.storage.root,
      this.config.storage.sops,
      this.config.storage.documents,
      this.config.storage.vectors,
      this.config.storage.backups,
      this.config.storage.logs
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        } catch (error) {
          console.error(`Failed to create directory ${dir}:`, error);
        }
      }
    }
  }

  getConfig(): DeploymentConfig {
    return this.config;
  }

  getStoragePath(type: keyof DeploymentConfig['storage']): string {
    return this.config.storage[type];
  }

  isLocalDeployment(): boolean {
    return this.config.environment === 'local';
  }

  isHybridDeployment(): boolean {
    return this.config.environment === 'hybrid';
  }

  getAIServicePriority(): string[] {
    const priority = [];
    
    if (this.config.ai.ollama.enabled && this.config.ai.preferLocal) {
      priority.push('ollama');
    }
    
    if (this.config.ai.cloud.gemini) {
      priority.push('gemini');
    }
    
    if (this.config.ai.cloud.openai) {
      priority.push('openai');
    }
    
    if (this.config.ai.cloud.anthropic) {
      priority.push('anthropic');
    }
    
    return priority;
  }

  logConfiguration(): void {
    console.log('\n=== Oracle Engine Configuration ===');
    console.log(`Environment: ${this.config.environment}`);
    console.log('\nAI Services:');
    console.log(`  Ollama: ${this.config.ai.ollama.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  OpenAI: ${this.config.ai.cloud.openai ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  Gemini: ${this.config.ai.cloud.gemini ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  Anthropic: ${this.config.ai.cloud.anthropic ? '✅ Configured' : '❌ Not configured'}`);
    console.log('\nDatabases:');
    console.log(`  PostgreSQL: ${this.config.databases.postgres.local ? '🏠 Local' : '☁️  Cloud'}`);
    console.log(`  MongoDB: ${this.config.databases.mongodb.local ? '🏠 Local' : '☁️  Cloud'}`);
    console.log(`  Qdrant: ${this.config.databases.qdrant.local ? '🏠 Local' : '☁️  Cloud'}`);
    console.log('\nStorage Root:', this.config.storage.root);
    console.log('=================================\n');
  }
}

export const deploymentConfig = new ConfigLoader();
export const config = deploymentConfig.getConfig();