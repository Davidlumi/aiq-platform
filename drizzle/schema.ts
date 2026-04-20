import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  unique,
} from "drizzle-orm/mysql-core";

// ─── Tenants ─────────────────────────────────────────────────────────────────

export const tenants = mysqlTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  primaryDomain: varchar("primary_domain", { length: 255 }),
  status: mysqlEnum("status", ["active", "trial", "suspended", "archived"]).notNull().default("trial"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const tenantSettings = mysqlTable("tenant_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().unique(),
  credibilityThreshold: decimal("credibility_threshold", { precision: 5, scale: 4 }).notNull().default("0.7500"),
  revalidationDaysLow: int("revalidation_days_low").notNull().default(90),
  revalidationDaysMedium: int("revalidation_days_medium").notNull().default(60),
  revalidationDaysHigh: int("revalidation_days_high").notNull().default(30),
  defaultRiskModelVersion: varchar("default_risk_model_version", { length: 20 }).notNull().default("v1"),
  defaultLearningModelVersion: varchar("default_learning_model_version", { length: 20 }).notNull().default("v1"),
  configJson: json("config_json").$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// ─── Users & Auth ─────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  status: mysqlEnum("status", ["active", "pending", "suspended", "deactivated"]).notNull().default("pending"),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("last_signed_in"),
}, (t) => ({
  tenantEmailUnique: unique("tenant_email_unique").on(t.tenantId, t.email),
  tenantEmailIdx: index("idx_users_tenant_email").on(t.tenantId, t.email),
}));

export const roles = mysqlTable("roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
});

export const userRoles = mysqlTable("user_roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  roleId: varchar("role_id", { length: 36 }).notNull(),
  assignedBy: varchar("assigned_by", { length: 36 }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => ({
  uniqueUserRole: unique("unique_user_role").on(t.tenantId, t.userId, t.roleId),
}));

export const personas = mysqlTable("personas", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  key: varchar("key", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniquePersonaKey: unique("unique_persona_key").on(t.tenantId, t.key),
}));

export const userPersonas = mysqlTable("user_personas", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  personaId: varchar("persona_id", { length: 36 }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => ({
  uniqueUserPersona: unique("unique_user_persona").on(t.userId, t.personaId),
}));

// ─── Competencies ─────────────────────────────────────────────────────────────

export const competencies = mysqlTable("competencies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
});

// ─── Assessment ───────────────────────────────────────────────────────────────

export const assessmentBlueprints = mysqlTable("assessment_blueprints", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }),
  key: varchar("key", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  version: int("version").notNull().default(1),
  roleScopeJson: json("role_scope_json").$default(() => ({})),
  structureJson: json("structure_json").$default(() => ({})),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentItems = mysqlTable("assessment_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  blueprintId: varchar("blueprint_id", { length: 36 }).notNull(),
  competencyId: varchar("competency_id", { length: 36 }),
  itemType: varchar("item_type", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  metadataJson: json("metadata_json").$type<Record<string, unknown>>().$default(() => ({})),
  difficulty: int("difficulty").notNull().default(2),
  activeVersion: int("active_version").notNull().default(1),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentItemOptions = mysqlTable("assessment_item_options", {
  id: varchar("id", { length: 36 }).primaryKey(),
  itemId: varchar("item_id", { length: 36 }).notNull(),
  label: text("label").notNull(),
  value: varchar("value", { length: 100 }).notNull(),
  optionOrder: int("option_order").notNull(),
  isCorrect: boolean("is_correct"),
  scoreWeight: decimal("score_weight", { precision: 6, scale: 2 }).notNull().default("0"),
  outcomeClass: varchar("outcome_class", { length: 50 }),
  signalDeltasJson: json("signal_deltas_json").$default(() => ({})),
  eventCodesJson: json("event_codes_json").$default(() => ([])),
});

export const assessmentSessions = mysqlTable("assessment_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  blueprintId: varchar("blueprint_id", { length: 36 }).notNull(),
  state: mysqlEnum("state", ["not_started", "in_progress", "completed", "abandoned", "invalidated"]).notNull().default("not_started"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  invalidatedAt: timestamp("invalidated_at"),
  sessionMetadataJson: json("session_metadata_json").$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userStateIdx: index("idx_assessment_sessions_user_state").on(t.tenantId, t.userId, t.startedAt),
}));

export const assessmentAnswers = mysqlTable("assessment_answers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  itemId: varchar("item_id", { length: 36 }).notNull(),
  selectedValueJson: json("selected_value_json"),
  freeText: text("free_text"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }),
  timeToAnswerMs: int("time_to_answer_ms").notNull().default(0),
  revisionCount: int("revision_count").notNull().default(0),
  correctness: boolean("correctness"),
  outcomeClass: varchar("outcome_class", { length: 50 }),
  signalDeltasJson: json("signal_deltas_json"),
  eventCodesJson: json("event_codes_json"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const assessmentScores = mysqlTable("assessment_scores", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull().unique(),
  overallScore: decimal("overall_score", { precision: 6, scale: 2 }).notNull(),
  scoreBreakdownJson: json("score_breakdown_json").$default(() => ({})),
  signalScoresJson: json("signal_scores_json").$default(() => ({})),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1"),
});

// ─── Credibility, Risk, State ─────────────────────────────────────────────────

export const credibilityScores = mysqlTable("credibility_scores", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  assessmentSessionId: varchar("assessment_session_id", { length: 36 }),
  credibilityScore: decimal("credibility_score", { precision: 5, scale: 4 }).notNull(),
  band: mysqlEnum("band", ["low", "medium", "high"]).notNull(),
  reasonJson: json("reason_json").$default(() => ({})),
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const riskScores = mysqlTable("risk_scores", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 4 }).notNull(),
  band: mysqlEnum("band", ["low", "medium", "high"]).notNull(),
  reasonJson: json("reason_json").$default(() => ({})),
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const userStates = mysqlTable("user_states", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  primaryState: varchar("primary_state", { length: 50 }).notNull(),
  credibilityState: mysqlEnum("credibility_state", ["low", "medium", "high"]).notNull().default("low"),
  riskState: mysqlEnum("risk_state", ["low", "medium", "high"]).notNull().default("low"),
  learningState: varchar("learning_state", { length: 50 }).notNull().default("not_started"),
  complianceState: mysqlEnum("compliance_state", ["compliant", "at_risk", "breach"]).notNull().default("compliant"),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"),
  stateReasonJson: json("state_reason_json").$default(() => ({})),
}, (t) => ({
  currentStateIdx: index("idx_user_states_current").on(t.userId, t.effectiveTo),
}));

export const decisionLogs = mysqlTable("decision_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  decisionType: varchar("decision_type", { length: 100 }).notNull(),
  inputSnapshotJson: json("input_snapshot_json").notNull(),
  outputSnapshotJson: json("output_snapshot_json").notNull(),
  precedenceAppliedJson: json("precedence_applied_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const revalidationSchedules = mysqlTable("revalidation_schedules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  dueAt: timestamp("due_at").notNull(),
  triggerReason: varchar("trigger_reason", { length: 200 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ─── Content & Learning ───────────────────────────────────────────────────────

export const learningObjectives = mysqlTable("learning_objectives", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  competencyId: varchar("competency_id", { length: 36 }),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high"]).notNull().default("low"),
});

export const contentItems = mysqlTable("content_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }),
  key: varchar("key", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  contentType: mysqlEnum("content_type", ["video", "article", "quiz", "scenario", "simulation", "walkthrough", "coach_prompt", "micro_lesson", "worked_example", "scenario_practice", "checklist", "reflection", "nudge"]).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  version: int("version").notNull().default(1),
  difficulty: int("difficulty").notNull().default(2),
  durationSeconds: int("duration_seconds").notNull().default(0),
  metadataJson: json("metadata_json").$default(() => ({})),
  bodyJson: json("body_json").$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const contentItemTags = mysqlTable("content_item_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  contentItemId: varchar("content_item_id", { length: 36 }).notNull(),
  tagType: varchar("tag_type", { length: 50 }).notNull(),
  tagValue: varchar("tag_value", { length: 100 }).notNull(),
});

export const policyRules = mysqlTable("policy_rules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  severity: varchar("severity", { length: 50 }).notNull().default("medium"),
  actionType: mysqlEnum("action_type", ["hard_block", "warning", "remediation_trigger", "escalate", "force_revalidation"]).notNull(),
  conditionsJson: json("conditions_json").$default(() => ({})),
  consequencesJson: json("consequences_json").$default(() => ({})),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tenantStatusIdx: index("idx_policy_rules_tenant_status").on(t.tenantId, t.status, t.severity),
}));

export const learningPlans = mysqlTable("learning_plans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  sourceAssessmentSessionId: varchar("source_assessment_session_id", { length: 36 }),
  state: mysqlEnum("state", ["active", "completed", "superseded", "blocked"]).notNull().default("active"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatorVersion: varchar("generator_version", { length: 20 }).notNull().default("v1"),
  summaryJson: json("summary_json").$default(() => ({})),
}, (t) => ({
  userPlanIdx: index("idx_learning_plans_user_generated").on(t.tenantId, t.userId, t.generatedAt),
}));

export const learningPlanItems = mysqlTable("learning_plan_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  learningPlanId: varchar("learning_plan_id", { length: 36 }).notNull(),
  contentItemId: varchar("content_item_id", { length: 36 }).notNull(),
  orderIndex: int("order_index").notNull(),
  required: boolean("required").notNull().default(true),
  unlockRuleJson: json("unlock_rule_json"),
  reasonJson: json("reason_json").$default(() => ({})),
  status: varchar("status", { length: 50 }).notNull().default("assigned"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const contentProgress = mysqlTable("content_progress", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  contentItemId: varchar("content_item_id", { length: 36 }).notNull(),
  progressPercent: decimal("progress_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 50 }).notNull().default("not_started"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  latestResultJson: json("latest_result_json").$default(() => ({})),
}, (t) => ({
  uniqueUserContent: unique("unique_user_content").on(t.userId, t.contentItemId),
}));

// ─── Simulations ──────────────────────────────────────────────────────────────

export const simulations = mysqlTable("simulations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }),
  key: varchar("key", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  version: int("version").notNull().default(1),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  learningObjectiveId: varchar("learning_objective_id", { length: 36 }),
  metadataJson: json("metadata_json").$default(() => ({})),
  passConditionsJson: json("pass_conditions_json").$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const simulationNodes = mysqlTable("simulation_nodes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  simulationId: varchar("simulation_id", { length: 36 }).notNull(),
  nodeKey: varchar("node_key", { length: 100 }).notNull(),
  nodeType: varchar("node_type", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  contextJson: json("context_json").$default(() => ({})),
  scoringWeight: decimal("scoring_weight", { precision: 6, scale: 2 }).notNull().default("1"),
  nodeOrder: int("node_order"),
  isStart: boolean("is_start").notNull().default(false),
  isEnd: boolean("is_end").notNull().default(false),
});

export const simulationChoices = mysqlTable("simulation_choices", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nodeId: varchar("node_id", { length: 36 }).notNull(),
  choiceKey: varchar("choice_key", { length: 100 }).notNull(),
  label: text("label").notNull(),
  choiceOrder: int("choice_order").notNull(),
  outcomeType: varchar("outcome_type", { length: 50 }).notNull(),
  scoreDelta: decimal("score_delta", { precision: 6, scale: 2 }).notNull().default("0"),
  riskDelta: decimal("risk_delta", { precision: 6, scale: 2 }).notNull().default("0"),
  metadataJson: json("metadata_json").$default(() => ({})),
});

export const simulationTransitions = mysqlTable("simulation_transitions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  simulationId: varchar("simulation_id", { length: 36 }).notNull(),
  fromNodeId: varchar("from_node_id", { length: 36 }).notNull(),
  choiceId: varchar("choice_id", { length: 36 }).notNull(),
  toNodeId: varchar("to_node_id", { length: 36 }).notNull(),
  conditionJson: json("condition_json"),
});

export const simulationSessions = mysqlTable("simulation_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  simulationId: varchar("simulation_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  learningPlanId: varchar("learning_plan_id", { length: 36 }),
  state: mysqlEnum("state", ["in_progress", "completed", "failed", "passed"]).notNull().default("in_progress"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  mode: mysqlEnum("mode", ["standard", "guided"]).notNull().default("standard"),
  variantKey: varchar("variant_key", { length: 100 }),
  currentNodeId: varchar("current_node_id", { length: 36 }),
  totalScore: decimal("total_score", { precision: 6, scale: 2 }).notNull().default("0"),
  guidedModeTriggered: boolean("guided_mode_triggered").notNull().default(false),
}, (t) => ({
  userSimIdx: index("idx_simulation_sessions_user_started").on(t.tenantId, t.userId, t.startedAt),
}));

export const simulationSessionEvents = mysqlTable("simulation_session_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  nodeId: varchar("node_id", { length: 36 }),
  choiceId: varchar("choice_id", { length: 36 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payloadJson: json("payload_json").$default(() => ({})),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});

export const simulationResults = mysqlTable("simulation_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull().unique(),
  totalScore: decimal("total_score", { precision: 6, scale: 2 }).notNull(),
  scoreBreakdownJson: json("score_breakdown_json").$default(() => ({})),
  passed: boolean("passed").notNull(),
  riskImpactJson: json("risk_impact_json").$default(() => ({})),
  feedbackJson: json("feedback_json").$default(() => ({})),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ─── Policy & Governance ──────────────────────────────────────────────────────

export const policyEvaluations = mysqlTable("policy_evaluations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  policyRuleId: varchar("policy_rule_id", { length: 36 }).notNull(),
  contextType: varchar("context_type", { length: 100 }).notNull(),
  contextId: varchar("context_id", { length: 36 }),
  result: varchar("result", { length: 50 }).notNull(),
  explanationJson: json("explanation_json").$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminOverrides = mysqlTable("admin_overrides", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  targetUserId: varchar("target_user_id", { length: 36 }).notNull(),
  overrideType: varchar("override_type", { length: 100 }).notNull(),
  reason: text("reason").notNull(),
  beforeSnapshotJson: json("before_snapshot_json").notNull(),
  afterSnapshotJson: json("after_snapshot_json").notNull(),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  active: boolean("active").notNull().default(true),
});

// ─── Events & Audit ───────────────────────────────────────────────────────────

export const events = mysqlTable("events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  sourceService: varchar("source_service", { length: 100 }).notNull(),
  sourceId: varchar("source_id", { length: 36 }),
  correlationId: varchar("correlation_id", { length: 100 }),
  payloadJson: json("payload_json").$default(() => ({})),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
}, (t) => ({
  tenantTypeTimeIdx: index("idx_events_tenant_type_time").on(t.tenantId, t.eventType, t.occurredAt),
}));

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 36 }),
  action: varchar("action", { length: 200 }).notNull(),
  targetType: varchar("target_type", { length: 100 }).notNull(),
  targetId: varchar("target_id", { length: 36 }),
  metadataJson: json("metadata_json").$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tenantTimeIdx: index("idx_audit_logs_tenant_time").on(t.tenantId, t.createdAt),
}));

export const reportJobs = mysqlTable("report_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  reportType: varchar("report_type", { length: 100 }).notNull(),
  requestedBy: varchar("requested_by", { length: 36 }),
  parametersJson: json("parameters_json").$default(() => ({})),
  status: varchar("status", { length: 50 }).notNull().default("queued"),
  downloadUrl: text("download_url"),
  manifestJson: json("manifest_json").$default(() => ({})),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type Persona = typeof personas.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type AssessmentBlueprint = typeof assessmentBlueprints.$inferSelect;
export type AssessmentItem = typeof assessmentItems.$inferSelect;
export type AssessmentSession = typeof assessmentSessions.$inferSelect;
export type AssessmentAnswer = typeof assessmentAnswers.$inferSelect;
export type AssessmentScore = typeof assessmentScores.$inferSelect;
export type CredibilityScore = typeof credibilityScores.$inferSelect;
export type RiskScore = typeof riskScores.$inferSelect;
export type UserState = typeof userStates.$inferSelect;
export type DecisionLog = typeof decisionLogs.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type PolicyRule = typeof policyRules.$inferSelect;
export type LearningPlan = typeof learningPlans.$inferSelect;
export type LearningPlanItem = typeof learningPlanItems.$inferSelect;
export type Simulation = typeof simulations.$inferSelect;
export type SimulationSession = typeof simulationSessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ReportJob = typeof reportJobs.$inferSelect;
