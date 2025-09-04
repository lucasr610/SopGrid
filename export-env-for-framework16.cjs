// This script exports your REAL API keys from Replit to a .env file
// Run this to get your actual configuration for Framework 16

const fs = require('fs');

console.log('\n=== EXPORTING YOUR REAL API KEYS ===\n');

// Your actual API keys from Replit environment
const envContent = `# SOPGRID FRAMEWORK 16 - REAL CONFIGURATION
# Generated from your Replit environment

# AI Service API Keys (YOUR REAL KEYS)
OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}
ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}
GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}

# Database Configuration (YOUR REAL DATABASE)
DATABASE_URL=${process.env.DATABASE_URL || ''}
PGDATABASE=${process.env.PGDATABASE || ''}
PGHOST=${process.env.PGHOST || ''}
PGPASSWORD=${process.env.PGPASSWORD || ''}
PGPORT=${process.env.PGPORT || ''}
PGUSER=${process.env.PGUSER || ''}

# MongoDB Configuration
MONGODB_URI=mongodb+srv://ai-sop-dev.nezgetk.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=ai-sop-dev

# RV Parts Finder Integration (YOUR REAL CREDENTIALS)
RVPARTFINDER_COMPANY_ID=${process.env.RVPARTFINDER_COMPANY_ID || ''}
RVPARTFINDER_PIN=${process.env.RVPARTFINDER_PIN || ''}
RVPARTFINDER_USER_ID=${process.env.RVPARTFINDER_USER_ID || ''}

# Qdrant Vector Database
QDRANT_URL=https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=${process.env.QDRANT_API_KEY || ''}

# SOPGRID System Configuration
OS_AGENT_ENABLED=true
COMPLIANCE_STRICT=false
NLI_REQUIRED=false
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Guardian OS Configuration
GUARDIAN_OS_ENABLED=true
SENTINEL_ENABLED=true
GOVERNOR_ENABLED=true
ORACLE_ENABLED=true

# Multi-Agent System (All 7 Agents)
AGENT_WATSON_ENABLED=true
AGENT_MOTHER_ENABLED=true
AGENT_FATHER_ENABLED=true
AGENT_SOAP_ENABLED=true
AGENT_ARBITER_ENABLED=true
AGENT_ROTOR_ENABLED=true
AGENT_EYES_ENABLED=true

# Agent Performance Settings
MAX_CONCURRENT_AGENTS=7
AGENT_TIMEOUT=30000
ROTOR_CYCLE_INTERVAL=5000

# Security Configuration
SESSION_SECRET=sopgrid-framework16-secure-${Date.now()}
CORS_ORIGIN=http://localhost:5000

# File Processing Configuration
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,txt,doc,docx,html,xml,json
UPLOAD_DIR=./uploads
TEMP_DIR=./temp

# Compliance Configuration
OSHA_COMPLIANCE_ENABLED=true
EPA_COMPLIANCE_ENABLED=true
DOT_COMPLIANCE_ENABLED=true
FDA_COMPLIANCE_ENABLED=true
DOD_COMPLIANCE_ENABLED=true

# Safety Thresholds
CONTRADICTION_SCORE_THRESHOLD=0.35
SAFETY_VALIDATION_REQUIRED=true
MANUAL_REVIEW_THRESHOLD=0.8

# Logging Configuration
LOG_LEVEL=info
DEBUG_MODE=false
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# Framework 16 Optimizations
CPU_CORES=16
MAX_WORKERS=8
MEMORY_LIMIT=32768
GPU_ACCELERATION=true
`;

// Write the REAL .env file
fs.writeFileSync('.env.framework16', envContent);

console.log('✅ SUCCESS! Your REAL .env file has been created: .env.framework16');
console.log('\nThis file contains:');
console.log('- Your ACTUAL OpenAI API key');
console.log('- Your ACTUAL Anthropic API key');
console.log('- Your ACTUAL Gemini API key');
console.log('- Your ACTUAL database credentials');
console.log('- Your ACTUAL RV Parts Finder credentials');
console.log('- ALL system configurations\n');

console.log('📥 DOWNLOAD THIS FILE: .env.framework16');
console.log('📝 RENAME IT TO: .env on your Framework 16\n');

// Also check which keys are present
const keys = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'DATABASE_URL',
  'RVPARTFINDER_COMPANY_ID'
];

console.log('Verification - Keys found in your environment:');
keys.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${key}: NOT FOUND`);
  }
});

console.log('\n=== EXPORT COMPLETE ===\n');