# SOPGRID - Cognitive OS for RV Technician Excellence

**The Complete Multi-Agent AI System for Industrial SOP Generation & Compliance**

SOPGRID is a comprehensive cognitive operating system designed specifically for generating, validating, and enforcing regulator-safe Standard Operating Procedures (SOPs) for RV technicians. Built with multi-agent AI orchestration, the system ensures absolute safety compliance while delivering production-ready technical procedures.

## ☁️ Cloud-Only Deployment

SOPGRID runs exclusively on Replit with cloud services:
- **Database**: PostgreSQL (Neon)
- **Document Storage**: MongoDB Atlas  
- **Vector Search**: Qdrant Cloud
- **AI Processing**: OpenAI, Gemini, Anthropic APIs

### Quick Start on Replit
1. **Fork this Repl**
2. **Add API Keys**: Configure your AI service keys in Secrets
3. **Run**: System starts automatically
4. **Login**: admin / admin123

### Required API Keys (Add to Replit Secrets)
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `ANTHROPIC_API_KEY` - Get from [Anthropic Console](https://console.anthropic.com/)

## 🏗️ System Architecture

### Multi-Agent Ecosystem
SOPGRID operates with 7 specialized AI agents working in concert:

- **Watson** (Memory & Format): Maintains SOP formatting standards and ID conventions
- **Mother** (Safety Guardian): Ensures OSHA compliance and safety protocol adherence
- **Father** (Logic & Research): Validates technical accuracy through multi-source research
- **Soap** (Primary Author): Crafts comprehensive SOPs integrating all agent inputs
- **Arbiter** (Multi-LLM Validator): Cross-validates outputs using multiple AI models
- **Rotor** (System Orchestrator): Manages sequential agent execution and task distribution
- **Eyes** (Real-time Monitor): Provides continuous system health and progress monitoring

### Core Features

#### 🛡️ Safety-First Design
- **Mandatory Human Gates**: All SOPs require human approval before deployment
- **AI-In-The-Loop Validation**: Multi-agent cross-checking with contradiction scoring
- **Evidence Ledger**: Complete immutable audit trail with blockchain integrity
- **Compliance Monitoring**: Real-time validation against OSHA, EPA, DOT, and FDA standards

#### 🎓 RVIA Training Knowledge Base
The system now includes comprehensive RV industry expertise:
- **11 RVIA Training Manuals** fully ingested and vectorized
- **Semantic Search** across all technical procedures
- **Complete Coverage**: Electrical, propane, plumbing, HVAC, generators, brakes/suspension, hydraulics, appliances

#### 🤖 Cloud AI Integration  
- **Multi-Model Support**: OpenAI GPT-5, Google Gemini 2.5 Pro, Anthropic Claude Sonnet 4
- **Intelligent Load Balancing**: Adaptive task distribution across cloud AI services
- **Cloud-Native Architecture**: No local installations required
- **Vectorized Knowledge**: Semantic search and retrieval across technical documentation

## 📋 Key Capabilities

### SOP Generation & Management
- Generate safety-compliant SOPs for any RV system or procedure
- Multi-step validation with human oversight at every stage
- Version control with complete change tracking
- Export to multiple formats (PDF, Word, HTML)

### Knowledge Management
- **RVIA Training Integration**: Access to complete RV technician curriculum
- **Semantic Search**: Find relevant procedures instantly across all manuals
- **Document Processing**: Automatic chunking and embedding generation
- **Real-time Updates**: Live sync with knowledge base additions

### Compliance & Safety
- **Regulatory Validation**: Automatic checking against industry standards
- **Safety Protocol Enforcement**: Built-in OSHA and safety compliance
- **Audit Trail**: Complete evidence chain for regulatory compliance
- **Multi-Jurisdiction Support**: US, Canada, EU, and Australia standards

### System Monitoring & Health
- **Real-time Dashboard**: Medical-style system health monitoring
- **Performance Analytics**: CPU, RAM, disk usage tracking
- **Agent Heartbeats**: Continuous monitoring of all AI agents
- **Error Recovery**: Automated system repair and failover

## 🔧 Configuration

### API Keys (Added via UI)
Navigate to **Credentials Vault** to securely add:
- **OpenAI API Key** (for embeddings and safety analysis)
- **Google Gemini API Key** (for compliance checking)
- **Anthropic Claude API Key** (for additional validation)

### Cloud Database Integration
SOPGRID connects to cloud databases automatically:
- **PostgreSQL**: Primary database (automatically configured via Replit)
- **MongoDB Atlas**: Document storage with automatic connection
- **Qdrant Cloud**: Vector search database for semantic queries

### Environment Variables
```bash
# Optional database connection
DATABASE_URL="postgresql://user:password@localhost:5432/sopgrid"

# Optional external services
QDRANT_URL="http://localhost:6333"  # Vector database
MONGODB_URI="mongodb://localhost:27017/sopgrid"  # Alternative storage
```

## 🎯 Industry Applications

### RV & Mobile Home Industry
- **Complete System Coverage**: All RV systems from electrical to plumbing
- **RVIA Certification Support**: Aligned with industry training standards
- **Safety-Critical Procedures**: Gas, electrical, and mechanical system SOPs
- **Maintenance Protocols**: Preventive and corrective maintenance procedures

### Regulatory Compliance
- **OSHA Standards**: Occupational safety and health compliance
- **EPA Regulations**: Environmental protection protocols
- **DOT Guidelines**: Transportation and mobile unit standards
- **NFPA Codes**: Fire safety and electrical standards
- **ASME Standards**: Mechanical and pressure vessel compliance

## 🌐 Web Interface Features

### Dashboard & Monitoring
- **Real-time System Health**: Visual monitoring with medical-style indicators
- **Agent Status Tracking**: Live status of all AI agents
- **Performance Metrics**: System utilization and efficiency tracking
- **Error Reporting**: Comprehensive logging with automated alerts

### SOP Management Interface
- **Intuitive SOP Generator**: Step-by-step guided SOP creation
- **Multi-Agent Orchestration**: Visual representation of agent workflows
- **Approval Workflows**: Human-in-the-loop validation gates
- **Version Control**: Complete change tracking and rollback capabilities

### Knowledge Base Access
- **RVIA Training Portal**: Browse and search all training materials
- **Semantic Search Interface**: Find relevant procedures instantly
- **Document Viewer**: Integrated PDF and document viewing
- **Cross-Reference System**: Linked procedures and related content

## 🔒 Security & Compliance

### Authentication & Authorization
- **Session-based Security**: Secure user sessions with automatic timeout
- **Role-based Access**: Multiple user levels with appropriate permissions
- **Credential Vault**: Encrypted storage for all API keys and sensitive data
- **Audit Logging**: Complete user activity tracking

### Data Protection
- **Evidence Ledger**: Blockchain-style immutable audit trail
- **Input Validation**: Comprehensive request validation using structured schemas
- **CORS Protection**: Secure cross-origin request handling
- **Environment-based Config**: Sensitive data stored securely

## 🚀 Production Deployment

### Build Process
```bash
# Install dependencies
npm install

# Build production assets
npm run build

# Start production server
npm start
```

### Environment Setup
```bash
# Production database
DATABASE_URL="your-postgresql-production-url"

# AI service keys (configure via UI)
OPENAI_API_KEY="your-openai-key"
GEMINI_API_KEY="your-gemini-key"
ANTHROPIC_API_KEY="your-anthropic-key"
```

### Health Monitoring
The system includes comprehensive monitoring:
- **Uptime Tracking**: Service availability monitoring
- **Performance Metrics**: Response time and throughput analysis
- **Error Rate Monitoring**: Automated alerting for system issues
- **Resource Usage**: CPU, memory, and storage utilization

## 📊 System Status

**Current State**: ✅ Fully Operational
- **RVIA Knowledge Base**: ✅ 11/11 training manuals ingested
- **Multi-Agent System**: ✅ All 7 agents operational
- **Safety Gates**: ✅ HITL/AI-ITL validation active
- **Compliance Monitoring**: ✅ Real-time regulatory checking
- **Evidence Ledger**: ✅ Blockchain integrity verified

## 💡 Key Benefits

- **Safety Assured**: Never compromises on safety or regulatory compliance
- **Expert Knowledge**: Complete RV industry expertise at your fingertips
- **Human Controlled**: AI assists but humans always have final approval
- **Audit Ready**: Complete evidence trail for regulatory inspection
- **Scalable Architecture**: Grows with your organization's needs

## 📞 Support & Maintenance

For technical support:
1. **System Health Dashboard**: Check real-time system status
2. **Built-in Diagnostics**: Use integrated troubleshooting tools
3. **Log Analysis**: Review detailed system logs for issues
4. **Agent Status Monitoring**: Verify all AI agents are operational

---

**SOPGRID**: Where human expertise meets artificial intelligence for uncompromising safety and compliance in the RV industry.

*Built with safety-first design principles and regulatory compliance at its core.*