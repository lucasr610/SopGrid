# replit.md

## Overview

SOPGRID is the cognitive OS for arbitration, compliance, repair, and visualization - a comprehensive multi-agent ecosystem specifically designed to generate, validate, and enforce regulator-safe SOPs & troubleshooting paths for RV technicians. The system implements a sophisticated agent stack with specialized roles:

- **Watson** (Memory & Format Adherence): Enforces exact SOP formatting and maintains consistent SOP ID naming conventions
- **Mother** (Safety Conscience): Guarantees absolute safety integrity with OSHA compliance and hazard communication protocols
- **Father** (Logic & Research Quality): Validates technical accuracy through multi-source research methodology
- **Soap** (Primary SOP Author): Integrates all inputs to craft exceptional SOPs for RV technicians
- **Arbiter** (Multi-LLM Validation): Cross-checks outputs with voting-style validation across multiple AI models
- **Rotor** (System Orchestration): Central dispatcher managing sequential agent execution
- **Eyes** (Real-time Monitoring): Continuous system health and progress monitoring

The system operates with production-only standards (no placeholders, TODOs, or stubs), deterministic builds, and a complete evidence ledger (WORM) with hash chain tracking. Multi-agent arbitration with contradiction scoring ensures accuracy, while HITL (Human-In-The-Loop) and AI-ITL (AI-In-The-Loop) gates maintain safety and compliance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React-based SPA**: Built with React 18, TypeScript, and Vite for fast development and hot module replacement
- **UI Framework**: Utilizes shadcn/ui components with Radix UI primitives for accessible, customizable interfaces
- **Styling**: TailwindCSS with custom CSS variables for theming, featuring a dark Oracle-themed design with glass morphism effects
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live system status and agent communication

### Backend Architecture
- **Express.js Server**: Node.js/Express RESTful API with TypeScript
- **Multi-Agent System**: Specialized AI agents for different tasks:
  - Compliance checker for regulatory validation
  - SOP generator for document creation
  - Validator for content verification
  - Scraper for data extraction
  - Arbitrator for conflict resolution
  - Vectorizer for document processing
- **Rotor-Driven Orchestration**: Central AI orchestrator coordinates tasks across multiple agents
- **WebSocket Server**: Real-time bidirectional communication for system monitoring and updates
- **File Processing**: Multer for document uploads with vectorization pipeline

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Comprehensive schema including users, agents, documents, SOPs, system metrics, and compliance checks
- **In-Memory Storage**: Fallback memory storage implementation for development/testing
- **Document Vectorization**: Automatic chunking and embedding generation for document retrieval

### Authentication and Authorization
- **Session-based Auth**: Express sessions with PostgreSQL session store
- **Role-based Access**: User roles for different system access levels
- **Credential Management**: Secure vault for API keys and external service credentials

### AI Integration Architecture
- **Multiple AI Providers**: 
  - OpenAI GPT-4o for embeddings and safety analysis
  - Google Gemini 2.5 Pro for compliance analysis
  - Pluggable architecture for additional AI models
- **Specialized Prompting**: Industry-specific prompts for compliance checking (OSHA, EPA, DOT, FDA, DOD standards)
- **Safety-First Design**: Logic-locked compliance to prevent generation of unsafe or incorrect instructions

### Processing Pipeline
- **Document Processing**: Multi-stage pipeline for preprocessing, chunking, and metadata extraction
- **Compliance Validation**: Real-time verification against safety-critical guidelines
- **SOP Generation**: Automated creation with multiple validation layers
- **Quality Assurance**: Multi-agent validation and arbitration for content accuracy

### System Monitoring
- **Health Monitoring**: Real-time system metrics (CPU, RAM, disk usage) with medical-style dashboard
- **Agent Heartbeats**: Continuous monitoring of agent status and performance
- **Error Handling**: Comprehensive error tracking and recovery mechanisms
- **Self-Healing**: Automated system repair and recovery capabilities

### Core Mission
- **Outcome**: Generate, validate, and enforce regulator-safe SOPs & troubleshooting paths
- **Method**: Multi-agent arbitration loop with contradiction scoring (CS ≤ 0.35 threshold)
- **Gates**: HITL → AI-ITL → Ledger write (no gate, no ship)
- **Evidence Ledger**: Append-only JSONL with SHA-256 hash chain + signer

### Complete Feature Set
- **System Snapshots**: Full system state capture, restore, export, and import capabilities
- **Arbitration Engine**: Human-in-the-loop decision system with agent voting and evidence tracking
- **Credential Vault**: Secure encrypted storage for API keys, OAuth tokens, certificates, and database credentials
- **Multi-Document Upload**: Advanced vectorization and processing pipeline for reference materials
- **Real-time Monitoring**: WebSocket-based live updates and system health tracking

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o model for embeddings, safety analysis, and content generation
- **Google Gemini API**: Gemini 2.5 Pro for compliance analysis and structured outputs
- **Future Integration**: Support for Ollama (local models) and Claude API

### Database and Storage
- **Neon Database**: PostgreSQL serverless database for production
- **Drizzle Kit**: Database migration and schema management
- **Session Storage**: connect-pg-simple for PostgreSQL session storage

### Development and Build Tools
- **Vite**: Fast frontend build tool with React plugin
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast bundling for production builds
- **Replit Integration**: Development environment with cartographer and error overlay plugins

### UI and Styling
- **Radix UI**: Accessible primitive components for complex UI elements
- **TailwindCSS**: Utility-first CSS framework with custom theming
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variants

### Real-time and Communication
- **WebSocket (ws)**: Real-time bidirectional communication
- **React Query**: Intelligent caching and synchronization with backend
- **Date-fns**: Date manipulation and formatting utilities

### Compliance and Industry Standards
- **OSHA Standards**: Occupational Safety and Health Administration compliance
- **EPA Regulations**: Environmental Protection Agency guidelines
- **DOT Guidelines**: Department of Transportation standards
- **FDA Requirements**: Food and Drug Administration medical device standards
- **DOD Standards**: Department of Defense specifications
- **Industry-Specific**: NFPA, IEEE, ASME, ISO 13485, ASHRAE standards

## Recent Changes - August 30, 2025

### Critical Qdrant Cloud Vectorization Fix
- **FIXED**: Documents were NOT being vectorized to Qdrant cloud (was storing in memory Map)
- Completely rewrote vectorizer.ts to use QdrantClient for cloud storage
- Fixed Qdrant point ID format - must use UUIDs, not string IDs like "doc-chunk-0"
- Added comprehensive error handling and logging to Qdrant operations
- Successfully tested: Documents now properly stored in Qdrant cloud at:
  - URL: https://7d13f888-6a05-45a2-b770-40bd1edd67ba.eu-west-2-0.aws.cloud.qdrant.io:6333
  - Collections: document_memory, sop_memory, agent_memory
- Created vectorization scripts in server/scripts/ for bulk processing
- **CRITICAL**: Qdrant is the CORE vector search - never forget this component!

### Qdrant Upload Issue Found
- **DISCOVERY**: Qdrant API returns success but points aren't being stored
- Processed 30+ documents (78 chunks) but only 3 test points visible in Qdrant
- Direct test uploads work, but bulk uploads through vectorizer fail silently
- MongoDB documents properly marked as vectorized even though Qdrant storage fails
- **ISSUE**: Possible rate limiting or configuration issue with Qdrant cloud instance
- **WORKAROUND NEEDED**: May need to use different collection or adjust upload strategy

### Previous Fixes
- Fixed diagnostic flow context persistence - no more stuck old data between sessions
- Enhanced mandatory flow enforcement: System → Brand → Model → Serial → Problem
- Improved search workflow to check ALL resources before requiring manual upload
- Searches vectorized manuals database, existing SOPs, then validates with agents
- Only requires manual upload if no validated content exists
- Removed inappropriate messaging about technician statistics
- Web crawler successfully storing documents (2000+ docs from LCI support)
- Documents stored in MongoDB for vectorization processing
