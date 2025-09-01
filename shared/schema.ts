import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  // Enhanced fields for RBAC and security
  jurisdiction: text("jurisdiction").default("us-federal"),
  securityClearance: text("security_clearance").default("standard"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLocked: boolean("account_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // compliance, sop-generator, validator, scraper, arbitrator, vectorizer
  status: text("status").notNull().default("inactive"), // active, inactive, processing, error
  config: jsonb("config"),
  lastHeartbeat: timestamp("last_heartbeat"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  content: text("content"),
  industry: text("industry"),
  vectorized: boolean("vectorized").default(false),
  metadata: jsonb("metadata"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  
  // New fields for production-grade document management
  sourceUrl: text("source_url"),
  sourceHost: text("source_host"),
  docType: text("doc_type"), // pdf, video, html, etc.
  docClass: text("doc_class"), // owners_manual, oem_install_manual, aftermarket_manual, service_manual, tech_ref, video
  region: text("region").default("US"), // US, AU
  series: text("series"), // 1000xl, 3000ws, etc.
  ccd: text("ccd"), // CCD-0001261
  features: text("features").array(), // smart_arm, wind_sensor
  normalizedTitle: text("normalized_title"),
  sha256: text("sha256"),
  byteSize: integer("byte_size"),
  retrievedAt: timestamp("retrieved_at"),
  etag: text("etag"),
  revCode: text("rev_code"),
  
  // Video-specific fields
  videoDuration: integer("video_duration"), // seconds
  videoHost: text("video_host"), // youtube, vimeo
  videoHostId: text("video_host_id"),
  transcriptText: text("transcript_text"),
  transcriptSha256: text("transcript_sha256"),
  
  // Section-specific fields (for anchor sections)
  parentUrl: text("parent_url"),
  sectionId: text("section_id"),
  sectionTitle: text("section_title"),
  
  // Safety flags for SOPGRID gates
  ppeRequired: boolean("ppe_required").default(false),
  lockoutTagout: boolean("lockout_tagout").default(false),
  electricalHazard: boolean("electrical_hazard").default(false),
  needsOcr: boolean("needs_ocr").default(false),
});

export const sops = pgTable("sops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  industry: text("industry").notNull(),
  complianceStandards: text("compliance_standards").array(),
  validationStatus: text("validation_status").notNull().default("pending"), // pending, validated, rejected
  sourceDocumentId: varchar("source_document_id").references(() => documents.id),
  generatedBy: varchar("generated_by").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cpuUsage: integer("cpu_usage").notNull(),
  memoryUsage: integer("memory_usage").notNull(),
  diskUsage: integer("disk_usage").notNull(),
  networkIO: integer("network_io").notNull(),
  activeAgents: integer("active_agents").notNull(),
  complianceScore: integer("compliance_score").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// System Cache for memory offloading and unified storage
export const systemCache = pgTable("system_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheType: text("cache_type").notNull(), // workflow_state, system_history, operation_queue, etc.
  cacheKey: text("cache_key").notNull(),
  cacheData: jsonb("cache_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueTypeKey: sql`unique(cache_type, cache_key)`,
}));

export const complianceChecks = pgTable("compliance_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sopId: varchar("sop_id").references(() => sops.id),
  standard: text("standard").notNull(), // OSHA, EPA, DOT, etc.
  status: text("status").notNull(), // compliant, non-compliant, warning
  details: text("details"),
  checkedBy: varchar("checked_by").references(() => agents.id),
  checkedAt: timestamp("checked_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  lastHeartbeat: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertSOPSchema = createInsertSchema(sops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemMetricsSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertComplianceCheckSchema = createInsertSchema(complianceChecks).omit({
  id: true,
  checkedAt: true,
});

// SOP Approval System Tables
export const sopApprovals = pgTable("sop_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sopId: varchar("sop_id").references(() => sops.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, denied, needs_review, under_review
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  techId: varchar("tech_id").references(() => users.id), // Technician who submitted
  adminNotes: text("admin_notes"),
  techNotes: text("tech_notes"), // Tech can flag issues for admin review
  failedSections: jsonb("failed_sections"), // Which parts failed and why
  storageLocation: text("storage_location"), // "qdrant", "mongodb", "both"
  qdrantId: varchar("qdrant_id"), // Reference to Qdrant vector storage
  mongoId: varchar("mongo_id"), // Reference to MongoDB document storage
  approvalScore: integer("approval_score"), // AI confidence score 0-100
  safetyFlags: text("safety_flags").array(), // Safety issues detected
  complianceFlags: text("compliance_flags").array(), // Compliance issues detected
  learningData: jsonb("learning_data"), // Data for system learning
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Storage Decision Records - Track system learning about storage routing
export const storageDecisions = pgTable("storage_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sopId: varchar("sop_id").references(() => sops.id).notNull(),
  decisionType: text("decision_type").notNull(), // "vector_search", "document_storage", "hybrid"
  reason: text("reason").notNull(), // Why this storage was chosen
  characteristics: jsonb("characteristics"), // SOP characteristics that influenced decision
  performance: jsonb("performance"), // How well this storage choice performed
  createdAt: timestamp("created_at").defaultNow(),
});

// Failed SOP Learning Records - Track mistakes for system improvement
export const sopFailures = pgTable("sop_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalSopId: varchar("original_sop_id").references(() => sops.id),
  failureType: text("failure_type").notNull(), // "safety", "compliance", "format", "content"
  failureDetails: jsonb("failure_details").notNull(), // Specific failure analysis
  correctionApplied: text("correction_applied"), // How it was fixed
  preventionRule: text("prevention_rule"), // Rule to prevent future occurrence
  learnedFrom: varchar("learned_from").references(() => users.id), // Who identified the issue
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const sopIssueReports = pgTable("sop_issue_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sopId: varchar("sop_id").references(() => sops.id).notNull(),
  approvalId: varchar("approval_id").references(() => sopApprovals.id),
  reportedBy: varchar("reported_by").references(() => users.id).notNull(),
  issueType: text("issue_type").notNull(), // "safety", "compliance", "technical", "formatting", "other"
  severity: text("severity").notNull().default("medium"), // "low", "medium", "high", "critical"
  description: text("description").notNull(),
  suggestedFix: text("suggested_fix"),
  section: text("section"), // Which SOP section has the issue
  status: text("status").notNull().default("open"), // "open", "in_review", "resolved", "closed"
  adminResponse: text("admin_response"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const systemLearning = pgTable("system_learning", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // "approval_patterns", "denial_reasons", "safety_issues", "compliance_fixes"
  pattern: text("pattern").notNull(), // The pattern or issue that was learned
  context: jsonb("context"), // Context data about when this was learned
  successRate: integer("success_rate").default(0), // How often this pattern leads to success
  failureReasons: text("failure_reasons").array(), // Common failure reasons
  improveActions: text("improve_actions").array(), // Actions that improve outcomes
  confidence: integer("confidence").default(50), // AI confidence in this learning 0-100
  timesEncountered: integer("times_encountered").default(1),
  lastEncountered: timestamp("last_encountered").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sopVersions = pgTable("sop_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sopId: varchar("sop_id").references(() => sops.id).notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  changeReason: text("change_reason"), // Why this version was created
  changedBy: varchar("changed_by").references(() => users.id),
  approvalStatus: text("approval_status").default("pending"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new tables
export const insertSOPApprovalSchema = createInsertSchema(sopApprovals).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export const insertSOPIssueReportSchema = createInsertSchema(sopIssueReports).omit({
  id: true,
  createdAt: true,
});

export const insertSystemLearningSchema = createInsertSchema(systemLearning).omit({
  id: true,
  lastEncountered: true,
  createdAt: true,
});

export const insertSOPVersionSchema = createInsertSchema(sopVersions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertSOP = z.infer<typeof insertSOPSchema>;
export type SOP = typeof sops.$inferSelect;

export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;
export type SystemMetrics = typeof systemMetrics.$inferSelect;

export type InsertComplianceCheck = z.infer<typeof insertComplianceCheckSchema>;
export type ComplianceCheck = typeof complianceChecks.$inferSelect;

export type InsertSOPApproval = z.infer<typeof insertSOPApprovalSchema>;
export type SOPApproval = typeof sopApprovals.$inferSelect;

export type InsertSOPIssueReport = z.infer<typeof insertSOPIssueReportSchema>;
export type SOPIssueReport = typeof sopIssueReports.$inferSelect;

export type InsertSystemLearning = z.infer<typeof insertSystemLearningSchema>;
export type SystemLearning = typeof systemLearning.$inferSelect;

export type InsertSOPVersion = z.infer<typeof insertSOPVersionSchema>;
export type SOPVersion = typeof sopVersions.$inferSelect;

// SOP Training & Corrections Tables
export const sopCorrections = pgTable("sop_corrections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalSOP: text("original_sop").notNull(),
  correctedSOP: text("corrected_sop").notNull(),
  category: varchar("category").notNull(),
  safetyLevel: varchar("safety_level").notNull(), // 'critical' | 'important' | 'minor'
  reasoning: text("reasoning").notNull(),
  equipment: varchar("equipment").notNull(),
  procedure: varchar("procedure").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  status: varchar("status").default("active"), // 'active' | 'archived'
});

export const trainingRules = pgTable("training_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condition: text("condition").notNull(),
  correction: text("correction").notNull(),
  category: varchar("category").notNull(), // 'electrical' | 'mechanical' | 'safety' | 'compliance' | 'general'
  priority: varchar("priority").notNull(), // 'high' | 'medium' | 'low'
  examples: jsonb("examples").default([]),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSOPCorrectionSchema = createInsertSchema(sopCorrections).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingRuleSchema = createInsertSchema(trainingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// New insert schemas for approval system
export const insertStorageDecisionSchema = createInsertSchema(storageDecisions).omit({
  id: true,
  createdAt: true,
});

export const insertSOPFailureSchema = createInsertSchema(sopFailures).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type InsertSOPCorrection = z.infer<typeof insertSOPCorrectionSchema>;
export type SOPCorrection = typeof sopCorrections.$inferSelect;
export type InsertTrainingRule = z.infer<typeof insertTrainingRuleSchema>;
export type TrainingRule = typeof trainingRules.$inferSelect;

// New types for approval system
export type InsertStorageDecision = z.infer<typeof insertStorageDecisionSchema>;
export type StorageDecision = typeof storageDecisions.$inferSelect;
export type InsertSOPFailure = z.infer<typeof insertSOPFailureSchema>;
export type SOPFailure = typeof sopFailures.$inferSelect;

// Document Revision Tracking and Auto-SOP Generation Tables
export const documentRevisions = pgTable("document_revisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  revisionCode: text("revision_code"),
  sha256Hash: text("sha256_hash").notNull(),
  content: text("content").notNull(),
  changesSummary: text("changes_summary"),
  impactLevel: text("impact_level").default("medium"), // low, medium, high, critical
  detectedAt: timestamp("detected_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  affectedSOPsCount: integer("affected_sops_count").default(0),
});

export const sopRevisions = pgTable("sop_revisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalSopId: varchar("original_sop_id").references(() => sops.id).notNull(),
  revisionNumber: integer("revision_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  changeReason: text("change_reason").notNull(),
  sourceRevisionId: varchar("source_revision_id").references(() => documentRevisions.id),
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  generatedBy: varchar("generated_by").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const bulkProcessingJobs = pgTable("bulk_processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(), // auto_sop_generation, bulk_vectorization, revision_processing
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed, cancelled
  totalItems: integer("total_items").notNull(),
  processedItems: integer("processed_items").default(0),
  failedItems: integer("failed_items").default(0),
  successfulItems: integer("successful_items").default(0),
  startedBy: varchar("started_by").references(() => users.id),
  jobConfig: jsonb("job_config"), // Configuration for the bulk job
  results: jsonb("results"), // Summary of results
  errorLog: text("error_log").array(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  estimatedCompletion: timestamp("estimated_completion"),
});

export const embeddingQueries = pgTable("embedding_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryText: text("query_text").notNull(),
  queryType: text("query_type").notNull(), // assembly_like, semantic_search, procedural_lookup
  embeddingVector: text("embedding_vector").array(), // Stored as text array for now
  resultsCount: integer("results_count"),
  executionTimeMs: integer("execution_time_ms"),
  retrievalPlan: jsonb("retrieval_plan"), // Assembly-like execution plan
  queryResults: jsonb("query_results"),
  requestedBy: varchar("requested_by").references(() => users.id),
  executedAt: timestamp("executed_at").defaultNow(),
});

// Insert schemas for new tables
export const insertDocumentRevisionSchema = createInsertSchema(documentRevisions).omit({
  id: true,
  detectedAt: true,
});

export const insertSOPRevisionSchema = createInsertSchema(sopRevisions).omit({
  id: true,
  createdAt: true,
});

export const insertBulkProcessingJobSchema = createInsertSchema(bulkProcessingJobs).omit({
  id: true,
  startedAt: true,
});

export const insertEmbeddingQuerySchema = createInsertSchema(embeddingQueries).omit({
  id: true,
  executedAt: true,
});

// Enhanced schema for new features
export const evidenceBlocks = pgTable("evidence_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockType: text("block_type").notNull(), // sop_generation, compliance_check, human_approval, agent_action
  blockData: jsonb("block_data").notNull(),
  blockHash: text("block_hash").notNull(),
  previousHash: text("previous_hash").notNull(),
  signature: text("signature").notNull(),
  validator: text("validator").notNull(),
  chainHeight: integer("chain_height").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const qualityMetrics = pgTable("quality_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sopId: varchar("sop_id").references(() => sops.id),
  accuracy: integer("accuracy").notNull(), // 0-100
  consistency: integer("consistency").notNull(),
  safety: integer("safety").notNull(),
  compliance: integer("compliance").notNull(),
  readability: integer("readability").notNull(),
  completeness: integer("completeness").notNull(),
  overallScore: integer("overall_score").notNull(),
  humanReviewRequired: boolean("human_review_required").default(true),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingProgress = pgTable("training_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  moduleId: text("module_id").notNull(),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, certified
  progress: integer("progress").default(0), // 0-100
  timeSpent: integer("time_spent").default(0), // seconds
  score: integer("score"), // 0-100
  completedAt: timestamp("completed_at"),
  certificationValid: timestamp("certification_valid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const securityAuditLog = pgTable("security_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  riskLevel: text("risk_level").default("low"), // low, medium, high, critical
  timestamp: timestamp("timestamp").defaultNow(),
});

export const contradictionAnalysis = pgTable("contradiction_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentHash: text("content_hash").notNull(),
  contradictionScore: integer("contradiction_score").notNull(), // 0-100
  semanticSimilarity: integer("semantic_similarity").notNull(),
  consensusReached: boolean("consensus_reached").notNull(),
  contradictions: text("contradictions").array(),
  conflictingSources: text("conflicting_sources").array(),
  recommendation: text("recommendation").notNull(), // approve, review, reject
  aiModelsUsed: text("ai_models_used").array(),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new tables
export const insertEvidenceBlockSchema = createInsertSchema(evidenceBlocks).omit({
  id: true,
  timestamp: true,
});

export const insertQualityMetricsSchema = createInsertSchema(qualityMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingProgressSchema = createInsertSchema(trainingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLog).omit({
  id: true,
  timestamp: true,
});

export const insertContradictionAnalysisSchema = createInsertSchema(contradictionAnalysis).omit({
  id: true,
  createdAt: true,
});

// Additional type exports for new tables
export type DocumentRevision = typeof documentRevisions.$inferSelect;
export type InsertDocumentRevision = z.infer<typeof insertDocumentRevisionSchema>;
export type SOPRevision = typeof sopRevisions.$inferSelect;
export type InsertSOPRevision = z.infer<typeof insertSOPRevisionSchema>;
export type BulkProcessingJob = typeof bulkProcessingJobs.$inferSelect;
export type InsertBulkProcessingJob = z.infer<typeof insertBulkProcessingJobSchema>;
export type EmbeddingQuery = typeof embeddingQueries.$inferSelect;
export type InsertEmbeddingQuery = z.infer<typeof insertEmbeddingQuerySchema>;

// New type exports
export type EvidenceBlock = typeof evidenceBlocks.$inferSelect;
export type InsertEvidenceBlock = z.infer<typeof insertEvidenceBlockSchema>;
export type QualityMetrics = typeof qualityMetrics.$inferSelect;
export type InsertQualityMetrics = z.infer<typeof insertQualityMetricsSchema>;
export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;
export type ContradictionAnalysis = typeof contradictionAnalysis.$inferSelect;
export type InsertContradictionAnalysis = z.infer<typeof insertContradictionAnalysisSchema>;
