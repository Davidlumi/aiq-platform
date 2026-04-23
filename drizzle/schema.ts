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
  onboardingCompleted: boolean("onboarding_completed").default(false),
  experienceLevel: mysqlEnum("experience_level", ["junior", "mid", "senior", "principal"]),
  aiUsageLevel: mysqlEnum("ai_usage_level", ["none", "occasional", "regular", "advanced"]),
  jobFunction: varchar("job_function", { length: 100 }),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  seniorityLevel: varchar("seniority_level", { length: 50 }),
  sector: varchar("sector", { length: 100 }),
  aiToolsUsed: text("ai_tools_used"),
  roleFamily: varchar("role_family", { length: 100 }),
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
  // S4: required reasoning flag for high-signal items
  reasoningRequired: boolean("reasoning_required").notNull().default(false),
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
  rationaleText: text("rationale_text"),
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
  id: varchar("id", { length: 36 }).primaryKey().notNull(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  selectedValueJson: json("selected_value_json"),
  freeText: text("free_text"),
  // C2.1: Participant reasoning capture — optional free-text explanation of thinking
  // Stored separately from freeText (which is used for open-ended item types)
  // reasoningText is always optional and shown for judgement/governance/critique items
  reasoningText: text("reasoning_text"),
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
  // S1: versioned scoring transform reference
  scoringConfigVersion: int("scoring_config_version").notNull().default(1),
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
  consequenceText: text("consequence_text"),
  stakeholderState: json("stakeholder_state"),
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

// ─── Content System ───────────────────────────────────────────────────────────

export const contentRoles = mysqlTable("content_roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  family: varchar("family", { length: 100 }).notNull(),
  description: text("description"),
  aiUsagePatternsJson: json("ai_usage_patterns_json").$type<string[]>().$default(() => ([])),
  capabilityWeightingsJson: json("capability_weightings_json").$type<Record<string, number>>().$default(() => ({})),
  failurePointsJson: json("failure_points_json").$type<string[]>().$default(() => ([])),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const contentWorkflows = mysqlTable("content_workflows", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  stepsJson: json("steps_json").$type<Array<{ step: number; action: string; aiUsage?: string; riskPoint?: string }>>().$default(() => ([])),
  aiUsagePointsJson: json("ai_usage_points_json").$type<string[]>().$default(() => ([])),
  riskPointsJson: json("risk_points_json").$type<string[]>().$default(() => ([])),
  governanceRequirementsJson: json("governance_requirements_json").$type<string[]>().$default(() => ([])),
  applicableRoleKeysJson: json("applicable_role_keys_json").$type<string[]>().$default(() => ([])),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const contentScenarios = mysqlTable("content_scenarios", {
  id: varchar("id", { length: 36 }).primaryKey(),
  interactionId: varchar("interaction_id", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  domain: varchar("domain", { length: 100 }).notNull(),
  capabilityKey: varchar("capability_key", { length: 50 }).notNull(),
  interactionType: varchar("interaction_type", { length: 50 }).notNull(),
  difficulty: int("difficulty").notNull().default(2),
  riskLevel: mysqlEnum("risk_level", ["Low", "Medium", "High", "Critical"]).notNull().default("Medium"),
  governanceSensitive: boolean("governance_sensitive").notNull().default(false),
  scenario: text("scenario").notNull(),
  constraint: text("constraint"),
  question: text("question").notNull(),
  workflowKey: varchar("workflow_key", { length: 100 }),
  roleKeysJson: json("role_keys_json").$type<string[]>().$default(() => ([])),
  failureModeKeysJson: json("failure_mode_keys_json").$type<string[]>().$default(() => ([])),
  tagsJson: json("tags_json").$type<string[]>().$default(() => ([])),
  primarySignal: varchar("primary_signal", { length: 100 }),
  ambiguityLevel: mysqlEnum("ambiguity_level", ["low", "medium", "high"]).notNull().default("medium"),
  /** S8: Sector applicability — empty array means universal (all sectors) */
  sectorApplicability: json("sector_applicability").$type<string[]>().$default(() => ([])),
  /** S8: True if item does not reference any specific AI tool */
  toolAgnostic: boolean("tool_agnostic").notNull().default(false),
  status: mysqlEnum("status", ["draft", "published", "archived", "under_review"]).notNull().default("draft"),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  domainCapIdx: index("idx_content_scenarios_domain_cap").on(t.domain, t.capabilityKey),
  statusIdx: index("idx_content_scenarios_status").on(t.status),
}));

export const contentScenarioOptions = mysqlTable("content_scenario_options", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scenarioId: varchar("scenario_id", { length: 36 }).notNull(),
  optionOrder: int("option_order").notNull(),
  label: text("label").notNull(),
  value: varchar("value", { length: 100 }).notNull(),
  outcomeClass: varchar("outcome_class", { length: 50 }),
  signalDeltasJson: json("signal_deltas_json").$type<Record<string, number>>().$default(() => ({})),
  rationaleText: text("rationale_text"),
  isOptimal: boolean("is_optimal").notNull().default(false),
});

export const contentScenarioAnchors = mysqlTable("content_scenario_anchors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scenarioId: varchar("scenario_id", { length: 36 }).notNull(),
  anchorKey: varchar("anchor_key", { length: 50 }).notNull(),
  anchorLabel: varchar("anchor_label", { length: 100 }).notNull(),
  description: text("description").notNull(),
  scoreRange: varchar("score_range", { length: 20 }),
});

export const contentFailureModes = mysqlTable("content_failure_modes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  description: text("description").notNull(),
  hrExamplesJson: json("hr_examples_json").$type<string[]>().$default(() => ([])),
  riskImplicationsJson: json("risk_implications_json").$type<string[]>().$default(() => ([])),
  capabilityKeysJson: json("capability_keys_json").$type<string[]>().$default(() => ([])),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentTags = mysqlTable("content_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentVersions = mysqlTable("content_versions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scenarioId: varchar("scenario_id", { length: 36 }).notNull(),
  version: int("version").notNull(),
  changeType: mysqlEnum("change_type", ["created", "edited", "reviewed", "published", "archived"]).notNull(),
  changedBy: varchar("changed_by", { length: 36 }),
  changeSummary: text("change_summary"),
  snapshotJson: json("snapshot_json").$type<Record<string, unknown>>().$default(() => ({})),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  scenarioVersionIdx: index("idx_content_versions_scenario").on(t.scenarioId, t.version),
}));

export type ContentRole = typeof contentRoles.$inferSelect;
export type ContentWorkflow = typeof contentWorkflows.$inferSelect;
export type ContentScenario = typeof contentScenarios.$inferSelect;
export type ContentScenarioOption = typeof contentScenarioOptions.$inferSelect;
export type ContentScenarioAnchor = typeof contentScenarioAnchors.$inferSelect;
export type ContentFailureMode = typeof contentFailureModes.$inferSelect;
export type ContentTag = typeof contentTags.$inferSelect;
export type ContentVersion = typeof contentVersions.$inferSelect;

// ─── Adaptive Intelligence Layer (AIL) Tables ────────────────────────────────

export const ailUserIntelligenceProfiles = mysqlTable("ail_user_intelligence_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  totalSimulationsCompleted: int("total_simulations_completed").notNull().default(0),
  totalAssessmentsCompleted: int("total_assessments_completed").notNull().default(0),
  platformEngagementScore: decimal("platform_engagement_score", { precision: 5, scale: 2 }).notNull().default("0.00" as any),
  nextSimulationRecommendationJson: text("next_simulation_recommendation_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_uip_user").on(t.userId),
  tenantIdx: index("idx_ail_uip_tenant").on(t.tenantId),
}));

export const ailSignalLedger = mysqlTable("ail_signal_ledger", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  signalName: varchar("signal_name", { length: 100 }).notNull(),
  totalScore: decimal("total_score", { precision: 8, scale: 3 }).notNull().default("0.000" as any),
  observationCount: int("observation_count").notNull().default(0),
  averageScore: decimal("average_score", { precision: 8, scale: 3 }).notNull().default("0.000" as any),
  trend: mysqlEnum("trend", ["improving", "stable", "declining"]).notNull().default("stable"),
  lastObservedAt: timestamp("last_observed_at"),
  simulationsObservedJson: text("simulations_observed_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_sl_user").on(t.userId),
  tenantIdx: index("idx_ail_sl_tenant").on(t.tenantId),
  uniqueUserSignal: unique("unique_user_signal").on(t.userId, t.signalName),
}));

export const ailFailureModeRegistry = mysqlTable("ail_failure_mode_registry", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  failureMode: varchar("failure_mode", { length: 100 }).notNull(),
  occurrenceCount: int("occurrence_count").notNull().default(1),
  severity: mysqlEnum("severity", ["critical", "moderate", "minor"]).notNull().default("minor"),
  simulationsTriggeredJson: text("simulations_triggered_json"),
  lastOccurrenceAt: timestamp("last_occurrence_at").defaultNow().notNull(),
  retestScheduled: boolean("retest_scheduled").notNull().default(false),
  retestSimulationId: varchar("retest_simulation_id", { length: 36 }),
  patternFlagged: boolean("pattern_flagged").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_fmr_user").on(t.userId),
  tenantIdx: index("idx_ail_fmr_tenant").on(t.tenantId),
  uniqueUserFailureMode: unique("unique_user_failure_mode").on(t.userId, t.failureMode),
}));

export const ailRetestQueue = mysqlTable("ail_retest_queue", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  targetFailureMode: varchar("target_failure_mode", { length: 100 }).notNull(),
  scheduledSimulationId: varchar("scheduled_simulation_id", { length: 36 }),
  contextVariation: text("context_variation"),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).notNull().default("medium"),
  scheduledAfterSimulationCount: int("scheduled_after_simulation_count").notNull().default(1),
  status: mysqlEnum("status", ["pending", "delivered", "passed", "failed"]).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_rq_user").on(t.userId),
  statusIdx: index("idx_ail_rq_status").on(t.status),
}));

export const ailPersonaProfiles = mysqlTable("ail_persona_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  validationOrientation: decimal("validation_orientation", { precision: 4, scale: 2 }).notNull().default("5.00" as any),
  governanceOrientation: decimal("governance_orientation", { precision: 4, scale: 2 }).notNull().default("5.00" as any),
  riskOrientation: decimal("risk_orientation", { precision: 4, scale: 2 }).notNull().default("5.00" as any),
  communicationOrientation: decimal("communication_orientation", { precision: 4, scale: 2 }).notNull().default("5.00" as any),
  primaryPersona: mysqlEnum("primary_persona", [
    "strong_validator",
    "overconfident_decision_maker",
    "risk_averse_escalator",
    "passive_deferrer",
    "governance_anchor_under_pressure",
    "unclassified",
  ]).notNull().default("unclassified"),
  personaConfidence: decimal("persona_confidence", { precision: 4, scale: 3 }).notNull().default("0.000" as any),
  pressureSensitivityJson: text("pressure_sensitivity_json"),
  blindAcceptancePattern: boolean("blind_acceptance_pattern").notNull().default(false),
  governanceBypassPattern: boolean("governance_bypass_pattern").notNull().default(false),
  overCautiousPattern: boolean("over_cautious_pattern").notNull().default(false),
  contradictionRigidity: boolean("contradiction_rigidity").notNull().default(false),
  communicationWeakness: boolean("communication_weakness").notNull().default(false),
  highConfidenceOverconfidence: boolean("high_confidence_overconfidence").notNull().default(false),
  narrativeSummary: text("narrative_summary"),
  narrativeUpdatedAt: timestamp("narrative_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_pp_user").on(t.userId),
  tenantIdx: index("idx_ail_pp_tenant").on(t.tenantId),
  personaIdx: index("idx_ail_pp_persona").on(t.primaryPersona),
}));

export const ailOrgContext = mysqlTable("ail_org_context", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().unique(),
  sector: mysqlEnum("sector", [
    "financial_services", "healthcare", "technology", "retail",
    "public_sector", "professional_services", "manufacturing", "other",
  ]).notNull().default("other"),
  primaryRegulator: varchar("primary_regulator", { length: 100 }),
  additionalRegulatorsJson: text("additional_regulators_json"),
  reportingRequirementsJson: text("reporting_requirements_json"),
  recentRegulatoryActionsJson: text("recent_regulatory_actions_json"),
  headcount: int("headcount"),
  structure: mysqlEnum("structure", ["centralised", "decentralised", "matrix", "holding_company"]).default("centralised"),
  geographiesJson: text("geographies_json"),
  strategicPrioritiesJson: text("strategic_priorities_json"),
  currentChallengesJson: text("current_challenges_json"),
  recentEventsJson: text("recent_events_json"),
  riskAppetiteOverall: mysqlEnum("risk_appetite_overall", ["risk_averse", "moderate", "risk_tolerant"]).default("moderate"),
  riskAppetiteLegal: mysqlEnum("risk_appetite_legal", ["risk_averse", "moderate", "risk_tolerant"]).default("risk_averse"),
  riskAppetiteReputational: mysqlEnum("risk_appetite_reputational", ["risk_averse", "moderate", "risk_tolerant"]).default("moderate"),
  riskAppetiteInnovation: mysqlEnum("risk_appetite_innovation", ["risk_averse", "moderate", "risk_tolerant"]).default("moderate"),
  aiMaturityLevel: mysqlEnum("ai_maturity_level", ["early_adopter", "scaling", "mature", "cautious"]).default("early_adopter"),
  currentAiToolsJson: text("current_ai_tools_json"),
  aiGovernanceFramework: boolean("ai_governance_framework").default(false),
  aiEthicsCommittee: boolean("ai_ethics_committee").default(false),
  recentAiIncidentsJson: text("recent_ai_incidents_json"),
  hierarchyLevel: mysqlEnum("hierarchy_level", ["flat", "moderate", "hierarchical"]).default("moderate"),
  decisionMakingStyle: mysqlEnum("decision_making_style", ["consensus", "top_down", "data_driven"]).default("consensus"),
  hrInfluence: mysqlEnum("hr_influence", ["strategic_partner", "operational", "administrative"]).default("operational"),
  ceoStyle: mysqlEnum("ceo_style", ["collaborative", "directive", "data_driven", "charismatic"]).default("collaborative"),
  cfoStyle: mysqlEnum("cfo_style", ["risk_averse", "growth_focused", "cost_focused"]).default("cost_focused"),
  hasAiUsagePolicy: boolean("has_ai_usage_policy").default(false),
  hasDataProtectionPolicy: boolean("has_data_protection_policy").default(true),
  hasRedundancyPolicy: boolean("has_redundancy_policy").default(false),
  hasWhistleblowingPolicy: boolean("has_whistleblowing_policy").default(false),
  hasEdiPolicy: boolean("has_edi_policy").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_ail_oc_tenant").on(t.tenantId),
}));

export const ailNarrativeState = mysqlTable("ail_narrative_state", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  legalRiskLevel: mysqlEnum("legal_risk_level", ["low", "moderate", "high", "critical"]).notNull().default("low"),
  employeeRelationsScore: int("employee_relations_score").notNull().default(70),
  regulatoryStandingScore: int("regulatory_standing_score").notNull().default(80),
  csuiteConfidenceInHr: int("csuite_confidence_in_hr").notNull().default(60),
  boardConfidenceInHr: int("board_confidence_in_hr").notNull().default(60),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_ns_user").on(t.userId),
  tenantIdx: index("idx_ail_ns_tenant").on(t.tenantId),
}));

export const ailStakeholderRelationships = mysqlTable("ail_stakeholder_relationships", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  stakeholderId: varchar("stakeholder_id", { length: 50 }).notNull(),
  stakeholderName: varchar("stakeholder_name", { length: 100 }).notNull(),
  stakeholderRole: varchar("stakeholder_role", { length: 100 }).notNull(),
  relationshipScore: int("relationship_score").notNull().default(0),
  trustLevel: mysqlEnum("trust_level", ["high", "moderate", "low", "broken"]).notNull().default("moderate"),
  currentEmotionalState: mysqlEnum("current_emotional_state", [
    "collaborative", "pressured", "defensive", "frustrated",
    "distressed", "confident", "suspicious", "resigned",
  ]).notNull().default("collaborative"),
  knownHistoryJson: text("known_history_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_sr_user").on(t.userId),
  tenantIdx: index("idx_ail_sr_tenant").on(t.tenantId),
  uniqueUserStakeholder: unique("unique_user_stakeholder").on(t.userId, t.stakeholderId),
}));

export const ailNarrativeEvents = mysqlTable("ail_narrative_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  simulationId: varchar("simulation_id", { length: 36 }),
  eventType: mysqlEnum("event_type", ["decision", "consequence", "external_event"]).notNull().default("decision"),
  description: text("description").notNull(),
  stakeholdersInvolvedJson: text("stakeholders_involved_json"),
  consequenceForFuture: text("consequence_for_future"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_ne_user").on(t.userId),
  tenantIdx: index("idx_ail_ne_tenant").on(t.tenantId),
  simIdx: index("idx_ail_ne_simulation").on(t.simulationId),
}));

export const ailNarrativeThreads = mysqlTable("ail_narrative_threads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  threadName: varchar("thread_name", { length: 200 }).notNull(),
  threadType: mysqlEnum("thread_type", ["consequence", "escalation", "relationship"]).notNull().default("consequence"),
  startedInSimulationId: varchar("started_in_simulation_id", { length: 36 }),
  currentStatus: mysqlEnum("current_status", ["active", "resolved", "escalated"]).notNull().default("active"),
  nextExpectedEvent: text("next_expected_event"),
  relatedSimulationsJson: text("related_simulations_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_nt_user").on(t.userId),
  tenantIdx: index("idx_ail_nt_tenant").on(t.tenantId),
  statusIdx: index("idx_ail_nt_status").on(t.currentStatus),
}));

export const betaApplications = mysqlTable("beta_applications", {
  id:              int("id").primaryKey().autoincrement(),
  // Contact
  contactFirstName:varchar("contact_first_name", { length: 100 }).notNull(),
  contactLastName: varchar("contact_last_name",  { length: 100 }).notNull(),
  contactEmail:    varchar("contact_email",      { length: 255 }).notNull().unique(),
  contactTitle:    varchar("contact_title",      { length: 150 }).notNull(),
  // Company
  companyName:     varchar("company_name",       { length: 200 }).notNull(),
  sector:          varchar("sector",             { length: 100 }).notNull(),
  companySize:     varchar("company_size",       { length: 50 }).notNull(),
  hrTeamSize:      int("hr_team_size").notNull(),
  // Application
  useCase:         text("use_case").notNull(),
  currentAiTools:  text("current_ai_tools"),
  motivation:      text("motivation").notNull(),
  linkedinUrl:     varchar("linkedin_url",       { length: 500 }),
  // Status
  status:          varchar("status",             { length: 30 }).notNull().default("pending"),
  notes:           text("notes"),
  createdAt:       int("created_at").notNull(),
  updatedAt:       int("updated_at").notNull(),
});

export const ailDifficultyProfiles = mysqlTable("ail_difficulty_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  signalClarity: int("signal_clarity").notNull().default(4),
  ambiguity: int("ambiguity").notNull().default(2),
  politicalComplexity: int("political_complexity").notNull().default(2),
  informationalCompleteness: int("informational_completeness").notNull().default(4),
  timePressure: int("time_pressure").notNull().default(2),
  consequenceVisibility: int("consequence_visibility").notNull().default(4),
  dimensionPerformanceJson: text("dimension_performance_json"),
  adjustmentHistoryJson: text("adjustment_history_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_ail_dp_user").on(t.userId),
  tenantIdx: index("idx_ail_dp_tenant").on(t.tenantId),
}));

// ─── S1: Scoring Config ──────────────────────────────────────────────────────

export const scoringConfig = mysqlTable("scoring_config", {
  id: int("id").primaryKey().autoincrement(),
  version: int("version").notNull().unique(),
  capabilityScoreIntercept: decimal("capability_score_intercept", { precision: 6, scale: 2 }).notNull().default("50.00"),
  capabilityScoreMultiplier: decimal("capability_score_multiplier", { precision: 6, scale: 2 }).notNull().default("50.00"),
  isActive: boolean("is_active").notNull().default(false),
  calibrationSource: mysqlEnum("calibration_source", ["synthetic_default", "pilot_cohort", "empirical"]).notNull().default("synthetic_default"),
  calibrationSampleSize: int("calibration_sample_size"),
  calibratedAt: timestamp("calibrated_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── S10: Organisation-Configurable Thresholds ────────────────────────────────

export const organisationCapabilityThresholds = mysqlTable("organisation_capability_thresholds", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  archetypeId: varchar("archetype_id", { length: 50 }).notNull(),
  capability: varchar("capability", { length: 50 }).notNull(),
  minimumSafeThreshold: int("minimum_safe_threshold").notNull(),
  updatedBy: varchar("updated_by", { length: 36 }),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  orgArchetypeCapIdx: index("idx_org_thresholds_org_archetype_cap").on(t.orgId, t.archetypeId, t.capability),
}));

// ─── S8: Sector Vocabulary ────────────────────────────────────────────────────

export const sectorVocabulary = mysqlTable("sector_vocabulary", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ScoringConfig = typeof scoringConfig.$inferSelect;
export type OrganisationCapabilityThreshold = typeof organisationCapabilityThresholds.$inferSelect;
export type SectorVocabulary = typeof sectorVocabulary.$inferSelect;

// AIL Types
export type AilUserIntelligenceProfile = typeof ailUserIntelligenceProfiles.$inferSelect;
export type AilSignalLedger = typeof ailSignalLedger.$inferSelect;
export type AilFailureModeRegistry = typeof ailFailureModeRegistry.$inferSelect;
export type AilRetestQueue = typeof ailRetestQueue.$inferSelect;
export type AilPersonaProfile = typeof ailPersonaProfiles.$inferSelect;
export type AilOrgContext = typeof ailOrgContext.$inferSelect;
export type AilNarrativeState = typeof ailNarrativeState.$inferSelect;
export type AilStakeholderRelationship = typeof ailStakeholderRelationships.$inferSelect;
export type AilNarrativeEvent = typeof ailNarrativeEvents.$inferSelect;
export type AilNarrativeThread = typeof ailNarrativeThreads.$inferSelect;
export type AilDifficultyProfile = typeof ailDifficultyProfiles.$inferSelect;
