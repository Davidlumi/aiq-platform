import {
  boolean,
  decimal,
  double,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
  index,
  unique,
  smallint,
  bigint,
} from "drizzle-orm/mysql-core";

// --- Tenants -----------------------------------------------------------------

export const tenants = mysqlTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  primaryDomain: varchar("primary_domain", { length: 255 }),
  status: mysqlEnum("status", ["active", "trial", "suspended", "archived"]).notNull().default("trial"),
  // B4: Subscription tier - controls which features are available
  // foundation: core assessment + individual results
  // readiness: + team dashboards, manager nudges, gap analysis, learning plans
  // enterprise: + org-level analytics, regulatory mapping, API access, custom branding
  plan: mysqlEnum("plan", ["foundation", "readiness", "enterprise"]).notNull().default("foundation"),
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

// --- Users & Auth -------------------------------------------------------------

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
  // v1.3: E1 manager fields
  managerFunction: varchar("manager_function", { length: 100 }),
  managerDirectReportsJson: text("manager_direct_reports_json"),
  managerOnboardingCompleted: boolean("manager_onboarding_completed").default(false),
  managerOnboardingCompletedAt: timestamp("manager_onboarding_completed_at"),
  // v1.4: module personalisation collapse preference
  modulePersonalisationCollapsed: tinyint("module_personalisation_collapsed").notNull().default(0),
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

// --- Invitations ------------------------------------------------------------

export const invitations = mysqlTable("invitations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  roleKey: varchar("role_key", { length: 50 }).notNull().default("learner"),
  invitedBy: varchar("invited_by", { length: 36 }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdUserId: varchar("created_user_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tokenIdx: index("idx_invitations_token").on(t.token),
  tenantEmailIdx: index("idx_invitations_tenant_email").on(t.tenantId, t.email),
}));

// --- Competencies -------------------------------------------------------------

export const competencies = mysqlTable("competencies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
});

// --- Assessment ---------------------------------------------------------------

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
  // C3.1a: artefact-based items
  artefactType: mysqlEnum("artefact_type", ["none", "dashboard_card", "email", "screening_output", "alert", "document_excerpt"]).default("none"),
  artefactPayload: json("artefact_payload"),
  aiOutputQuality: mysqlEnum("ai_output_quality", ["normal", "poor", "hallucinated", "overconfident"]).default("normal"),
  timeLimitSecs: int("time_limit_secs"),
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
  // WS5.2: Session metadata additions
  normGroupVersion: varchar("norm_group_version", { length: 20 }),
  localeCode: varchar("locale_code", { length: 10 }).default("en-GB"),
  deviceType: varchar("device_type", { length: 20 }),
  scoringConfigVersionAtStart: int("scoring_config_version_at_start"),
  // S7.1: Role archetype for role-weighted scoring
  roleArchetypeId: varchar("role_archetype_id", { length: 36 }),
  roleHintFreetext: varchar("role_hint_freetext", { length: 200 }),
  // C2.2b: Organisation context
  organisationId: varchar("organisation_id", { length: 36 }),
  // Learning-aware reassessment mode per Adaptive Learning §6
  learningAwareMode: boolean("learning_aware_mode").notNull().default(false),
  // JSON array of { moduleId, signals: string[], completedAt: number } for recently completed modules
  learningContextJson: json("learning_context_json").$default(() => ([])),
  // Transfer finding result per §6.3: clean_transfer | broad_development | no_transfer | attention_warranted
  transferFindingJson: json("transfer_finding_json"),
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
  // C2.1: Participant reasoning capture - optional free-text explanation of thinking
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
  // WS1.3: Per-answer contribution breakdown for back-office audit
  contributionBreakdownJson: json("contribution_breakdown_json"),
  // WS3: Model version that generated this item
  modelVersion: varchar("model_version", { length: 64 }),
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
  // C1.4a: readiness classification rule
  readinessRule: mysqlEnum("readiness_rule", ["min_weighted", "min_unweighted", "mean"]).default("min_weighted"),
  // C1.5: confidence floor gate
  confidenceFloor: decimal("confidence_floor", { precision: 4, scale: 3 }).default("0.600"),
});

// --- Credibility, Risk, State -------------------------------------------------

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

// --- Content & Learning -------------------------------------------------------

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

// --- Simulations --------------------------------------------------------------

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

// --- Policy & Governance ------------------------------------------------------

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

// --- Events & Audit -----------------------------------------------------------

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

// --- Type exports -------------------------------------------------------------

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

// --- Content System -----------------------------------------------------------

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
  /** S8: Sector applicability - empty array means universal (all sectors) */
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

// --- Adaptive Intelligence Layer (AIL) Tables --------------------------------

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
  // WS4.1: Participant-facing softened label
  softenedLabel: varchar("softened_label", { length: 120 }),
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
    "energy_utilities", "media_entertainment",
  ]).notNull().default("other"),
  subSector: varchar("sub_sector", { length: 100 }),                                    // sub-sector slug from sectorTaxonomy.ts
  orgType: varchar("org_type", { length: 100 }),                                        // org-type slug from sectorTaxonomy.ts
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
  // Phase 2 additions
  aiToolsInUseJson: text("ai_tools_in_use_json"),                                          // specific AI tools deployed
  ukRegulatoryFrameworksJson: text("uk_regulatory_frameworks_json"),                       // ICO, FCA, NHS, etc.
  aiPolicyStatus: mysqlEnum("ai_policy_status", ["none", "draft", "approved", "embedded"]).default("none"),
  quarterlyReviewEnabled: boolean("quarterly_review_enabled").default(false),
  revalidationCycleMonths: int("revalidation_cycle_months").default(12),
  smallHRFunctionMode: boolean("small_hr_function_mode").default(false),                   // <50 employees, simplified scoring
  companyAiContextNarrative: text("company_ai_context_narrative"),                        // free-text AI context for scenario personalisation
  // Phase 3: Business Ambition Linkage
  ambitionTargetScore: int("ambition_target_score"),                                       // 0-100 raw (displayed as 0-10 Peakon); org's readiness ambition level
  ambitionTargetDate: varchar("ambition_target_date", { length: 10 }),                    // ISO date string YYYY-MM-DD
  ambitionTargetLabel: varchar("ambition_target_label", { length: 200 }),                 // e.g. "Ready to deploy AI across all HR workflows"
  // Phase 4: Business & People Ambition Strategy Builder
  businessAmbitionLevel: int("business_ambition_level"),                                    // 1-5: how aggressively org adopts AI in business
  peopleAmbitionLevel: int("people_ambition_level"),                                       // 1-5: how much HR people lead vs follow AI adoption
  domainTargetsJson: text("domain_targets_json"),                                          // JSON: { ai_interaction: 65, ... } stored as 0-100 raw
  strategyNarrative: text("strategy_narrative"),                                           // CPO free-text strategic intent
  strategySavedAt: timestamp("strategy_saved_at"),                                         // when strategy was last saved
  selectedInitiativesJson: text("selected_initiatives_json"),               // JSON: string[] of selected initiative IDs
  // Phase 5: HR AI Strategy Assessment
  aspirationAnswersJson: text("aspiration_answers_json"),                    // JSON: answers to business AI aspiration questions
  hrRoleAnswersJson: text("hr_role_answers_json"),                           // JSON: answers to HR role questions
  visionStatement: text("vision_statement"),                                // AI-drafted + user-edited vision statement
  userVisionInput: text("user_vision_input"),                                // Verbatim vision text entered directly by the user (not AI-generated)
  guidingPrinciplesJson: text("guiding_principles_json"),                   // JSON: [{title, description}] x5 principles
  strategyAssessmentCompletedAt: timestamp("strategy_assessment_completed_at"), // when assessment was last completed
  wontDoJson: text("wont_do_json"),                                              // JSON: string[] - LLM-generated out-of-scope items
  commitmentsJson: text("commitments_json"),                                        // JSON: string[] - user-editable "by end of period" commitments (3 items)
  snapshotDomainScoresJson: text("snapshot_domain_scores_json"),                    // JSON: Record<string, number|null> — domain scores captured at strategy save time, used for drift detection
  structuredInputsJson: text("structured_inputs_json"),                          // JSON: B1 structured assessment inputs {business_outcomes, business_problems, timeline_months, risk_appetite, success_markers_ranked, hr_leadership_position, hr_processes_priority, governance_principles, voice_capture}
  operationalBaselineJson: text("operational_baseline_json"),                    // JSON: B2 operational baseline {hires_per_year, cost_per_hire_gbp, time_to_fill_days, voluntary_attrition_rate_pct, l_and_d_spend_per_fte_gbp, hr_cost_per_fte_gbp, _sector_default_used: {field: bool}}
  provenanceJson: text("provenance_json"),                                       // JSON: provenance map for cost/risk/vision sources
  libraryVersion: varchar("library_version", { length: 20 }),                   // content library version used when strategy was generated
  leadershipTalkingPointsJson: text("leadership_talking_points_json"),           // JSON: { bullets: string[], generatedAt: number, userEdited: boolean, strategyHash: string }
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

// --- S1: Scoring Config ------------------------------------------------------

export const scoringConfig = mysqlTable("scoring_config", {
  id: int("id").primaryKey().autoincrement(),
  version: int("version").notNull().unique(),
  capabilityScoreIntercept: decimal("capability_score_intercept", { precision: 6, scale: 2 }).notNull().default("50.00"),
  capabilityScoreMultiplier: decimal("capability_score_multiplier", { precision: 6, scale: 2 }).notNull().default("50.00"),
  isActive: boolean("is_active").notNull().default(false),
  calibrationSource: mysqlEnum("calibration_source", ["synthetic_default", "pilot_cohort", "empirical"]).notNull().default("synthetic_default"),
  calibrationSampleSize: int("calibration_sample_size"),
  calibratedAt: timestamp("calibrated_at"),
  // WS1.1: v2.2 sum+clip formula parameters
  contributionCap: decimal("contribution_cap", { precision: 6, scale: 2 }).notNull().default("8.00"),
  contributionMultiplier: decimal("contribution_multiplier", { precision: 6, scale: 2 }).notNull().default("6.25"),
  // WS1.2: Failure-mode evidence thresholds
  blockingFailureMinItems: int("blocking_failure_min_items").notNull().default(2),
  downgradeFailureMinItems: int("downgrade_failure_min_items").notNull().default(1),
  // WS1.2 Item 1: Configurable scoring constants (previously hard-coded compile-time values)
  baseFailureThresholdMagnitude: decimal("base_failure_threshold_magnitude", { precision: 5, scale: 3 }).notNull().default("1.500"),
  catastrophicMarginMultiplier: decimal("catastrophic_margin_multiplier", { precision: 5, scale: 3 }).notNull().default("1.500"),
  atRiskConfidenceFloor: decimal("at_risk_confidence_floor", { precision: 5, scale: 3 }).notNull().default("0.350"),
  provisionalConfidenceThreshold: decimal("provisional_confidence_threshold", { precision: 5, scale: 3 }).notNull().default("0.400"),
  confidenceFloor: decimal("confidence_floor", { precision: 5, scale: 3 }).notNull().default("0.500"),
  minimumSafeClassificationConfidence: decimal("minimum_safe_classification_confidence", { precision: 5, scale: 3 }).notNull().default("0.550"),
  // D1: Configurable evidence sufficiency thresholds (previously MINIMUM_EVIDENCE in sessionController.ts)
  evidenceTotalItems: int("evidence_total_items").notNull().default(20),
  evidenceSignalsPerCapability: int("evidence_signals_per_capability").notNull().default(3),
  evidenceDistinctInteractionTypes: int("evidence_distinct_interaction_types").notNull().default(5),
  evidenceHighRiskProportion: decimal("evidence_high_risk_proportion", { precision: 4, scale: 3 }).notNull().default("0.250"),
  evidenceTargetItems: int("evidence_target_items").notNull().default(49),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
// --- S10: Organisation-Configurable Thresholds --------------------------------

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

// --- S8: Sector Vocabulary ----------------------------------------------------

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

// --- WS1.3: Contribution Breakdown on assessment_answers ---------------------
// (column added via migration; schema update below)

// --- WS4.3: Assessment Review Flags ------------------------------------------
export const assessmentReviewFlags = mysqlTable("assessment_review_flags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "reviewed", "dismissed"]).notNull().default("pending"),
  reviewerNotes: text("reviewer_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (t) => ({
  sessionIdx: index("idx_arf_session").on(t.sessionId),
  statusIdx: index("idx_arf_status").on(t.status),
}));

// --- WS5: Assessment Answer Telemetry ----------------------------------------
export const assessmentAnswerTelemetry = mysqlTable("assessment_answer_telemetry", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  itemId: varchar("item_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  focusLossCount: int("focus_loss_count").notNull().default(0),
  idlePeriodsCount: int("idle_periods_count").notNull().default(0),
  totalActiveMs: int("total_active_ms").notNull().default(0),
  scrollDepthPct: decimal("scroll_depth_pct", { precision: 5, scale: 2 }),
  revisionCount: int("revision_count").notNull().default(0),
  // WS5.1: Extended telemetry columns
  timeToFirstInteractionMs: int("time_to_first_interaction_ms"),
  timeToSubmitMs: int("time_to_submit_ms"),
  confidenceRatingRaw: decimal("confidence_rating_raw", { precision: 3, scale: 2 }),
  deviceType: varchar("device_type", { length: 20 }),
  browserType: varchar("browser_type", { length: 40 }),
  screenWidthPx: smallint("screen_width_px"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index("idx_aat_session").on(t.sessionId),
}));

// --- WS3: LLM Item Review Queue ----------------------------------------------
export const llmItemReviewQueue = mysqlTable("llm_item_review_queue", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }),
  itemId: varchar("item_id", { length: 255 }).notNull(),
  failureReason: text("failure_reason").notNull(),
  itemJson: json("item_json"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "auto_approved"]).notNull().default("pending"),
  reviewerId: varchar("reviewer_id", { length: 36 }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  statusIdx: index("idx_lirq_status").on(t.status),
}));

export type AssessmentReviewFlag = typeof assessmentReviewFlags.$inferSelect;
export type AssessmentAnswerTelemetry = typeof assessmentAnswerTelemetry.$inferSelect;
export type LlmItemReviewQueue = typeof llmItemReviewQueue.$inferSelect;

// --- WS2.2: Anti-Gaming Thresholds -------------------------------------------
export const antiGamingThresholds = mysqlTable("anti_gaming_thresholds", {
  id: varchar("id", { length: 36 }).primaryKey(),
  roleKey: varchar("role_key", { length: 100 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }),
  alwaysSafeChoiceRate: decimal("always_safe_choice_rate", { precision: 5, scale: 4 }).notNull().default("0.7500" as any),
  alwaysEscalateRate: decimal("always_escalate_rate", { precision: 5, scale: 4 }).notNull().default("0.7000" as any),
  alwaysCautiousRate: decimal("always_cautious_rate", { precision: 5, scale: 4 }).notNull().default("0.6000" as any),
  optionPositionBiasRate: decimal("option_position_bias_rate", { precision: 5, scale: 4 }).notNull().default("0.7000" as any),
  strongAnswerMaxRate: decimal("strong_answer_max_rate", { precision: 5, scale: 4 }).notNull().default("0.1000" as any),
  outcomeConditionalRate: decimal("outcome_conditional_rate", { precision: 5, scale: 4 }).notNull().default("0.8000" as any),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  roleKeyTenantIdx: unique("uq_agt_role_tenant").on(t.roleKey, t.tenantId),
  tenantIdx: index("idx_agt_tenant").on(t.tenantId),
}));

export type AntiGamingThreshold = typeof antiGamingThresholds.$inferSelect;



// --- Adaptive Learning Engine -------------------------------------------------

export const learningModules = mysqlTable("learning_modules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  capability: varchar("capability", { length: 100 }).notNull(), // execution|judgement|governance|appropriateness|workflow|data_insight
  modality: mysqlEnum("modality", [
    "tutorial",       // structured lesson with explanations
    "practical",      // hands-on exercise / worked example
    "case_study",     // real-world scenario analysis
    "quiz",           // knowledge check / assessment
    "scenario",       // situational judgement practice
    "video",          // video lesson with transcript
    "reflection",     // guided reflection prompt
    "coaching",       // AI coaching dialogue
  ]).notNull(),
  difficulty: int("difficulty").notNull().default(1), // 1-5
  levelLabel: varchar("level_label", { length: 50 }).notNull().default("Foundation"), // Foundation|Developing|Practitioner|Advanced|Expert
  durationMins: int("duration_mins").notNull().default(10),
  estimatedReadingMins: int("estimated_reading_mins").notNull().default(5),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("published"),
  bodyJson: json("body_json").notNull().$default(() => ({})),
  // bodyJson shape: { overview, objectives[], sections[{title, content, examples[], tips[]}], reflectionPrompts[], citations[], keyTakeaways[] }
  metadataJson: json("metadata_json").$default(() => ({})),
  // metadataJson: { roleRelevance: string[], prerequisites: string[], tags: string[], researchBasis: string }
  /** Formative quiz: 3 questions shown after module completes */
  formativeQuizJson: json("formative_quiz_json").$type<Array<{ question: string; options: Array<{ label: string; value: string; correct: boolean }>; explanation: string }>>(),
  /** Minimum capability score (0-100) required to unlock this module */
  requiredCapabilityScore: int("required_capability_score"),
  /** Minimum difficulty level (1-5) of completed modules required to unlock */
  requiredLevel: int("required_level"),
  // v1.4: strategy initiative linkage (array of initiative key strings)
  linkedInitiativeIds: json("linked_initiative_ids").$type<string[]>(),
  // v1.4: compressed priming text for priority modules (falls back to bodyJson.overview if null)
  primingTextV2: text("priming_text_v2"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  capabilityModalityIdx: index("idx_lm_capability_modality").on(t.capability, t.modality, t.difficulty),
  statusIdx: index("idx_lm_status").on(t.status),
}));

export const learningModuleTags = mysqlTable("learning_module_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  tagType: varchar("tag_type", { length: 50 }).notNull(), // role|workflow|risk_level|prerequisite_module
  tagValue: varchar("tag_value", { length: 100 }).notNull(),
}, (t) => ({
  moduleIdx: index("idx_lmt_module").on(t.moduleId),
  tagTypeIdx: index("idx_lmt_tag_type").on(t.tagType, t.tagValue),
}));

export const gapAnalyses = mysqlTable("gap_analyses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }),
  capabilityGapsJson: json("capability_gaps_json").notNull().$default(() => ({})),
  // shape: { [capability]: { score, benchmark, gap, severity: 'critical'|'developing'|'proficient'|'advanced', priority: number } }
  priorityOrderJson: json("priority_order_json").notNull().$default(() => ([])),
  // shape: string[] ordered by priority (most critical first)
  overallReadinessScore: decimal("overall_readiness_score", { precision: 5, scale: 2 }).notNull().default("0"),
  readinessBand: varchar("readiness_band", { length: 50 }).notNull().default("developing"),
  /** What triggered this gap analysis */
  triggerSource: mysqlEnum("trigger_source", ["manual", "assessment_complete", "revalidation"]).notNull().default("manual"),
  generatedAt: bigint("generated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  userSessionIdx: index("idx_ga_user_session").on(t.userId, t.sessionId),
  userTenantIdx: index("idx_ga_user_tenant").on(t.userId, t.tenantId),
}));

export const adaptiveLearningPlans = mysqlTable("adaptive_learning_plans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  gapAnalysisId: varchar("gap_analysis_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }),
  state: mysqlEnum("state", ["active", "completed", "superseded"]).notNull().default("active"),
  generatorVersion: varchar("generator_version", { length: 20 }).notNull().default("v3-adaptive"),
  totalModules: int("total_modules").notNull().default(0),
  completedModules: int("completed_modules").notNull().default(0),
  estimatedTotalMins: int("estimated_total_mins").notNull().default(0),
  summaryJson: json("summary_json").$default(() => ({})),
  generatedAt: bigint("generated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  completedAt: bigint("completed_at", { mode: "number" }),
  /** Timestamp of last auto-regeneration (from assessment complete) */
  autoRegeneratedAt: bigint("auto_regenerated_at", { mode: "number" }),
}, (t) => ({
  userStateIdx: index("idx_alp_user_state").on(t.userId, t.state),
}));

export const adaptivePlanItems = mysqlTable("adaptive_plan_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  planId: varchar("plan_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  orderIndex: int("order_index").notNull(),
  phase: mysqlEnum("phase", ["foundation", "development", "practice", "validation"]).notNull().default("foundation"),
  // 70/20/10: practice=70%, development=20%, foundation=10%
  required: boolean("required").notNull().default(true),
  unlockAfterModuleId: varchar("unlock_after_module_id", { length: 36 }),
  status: mysqlEnum("status", ["locked", "available", "in_progress", "completed", "skipped"]).notNull().default("available"),
  // Spec §5.1 completion states - only completed_with_engagement advances the pathway
  completionState: mysqlEnum("completion_state", ["not_started", "opened", "partial", "completed", "completed_with_engagement"]).notNull().default("not_started"),
  // No-transfer tracking per §5.4
  noTransferCount: int("no_transfer_count").notNull().default(0),
  alternativeModalityPrescribed: boolean("alternative_modality_prescribed").notNull().default(false),
  honestDisclosureSent: boolean("honest_disclosure_sent").notNull().default(false),
  reasonJson: json("reason_json").$default(() => ({})),
  // { capability, gapSeverity, modalityReason, roleRelevance, prescriptionStage: 1|2|3|4 }
  assignedAt: bigint("assigned_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  timeSpentSeconds: int("time_spent_seconds").notNull().default(0),
  reflectionTextCaptured: boolean("reflection_text_captured").notNull().default(false),
  scoreJson: json("score_json").$default(() => ({})),
  // quiz/scenario scores, reflection quality, time spent
}, (t) => ({
  planIdx: index("idx_api_plan").on(t.planId, t.orderIndex),
  moduleIdx: index("idx_api_module").on(t.moduleId),
}));

export const spacedRepetitionQueue = mysqlTable("spaced_repetition_queue", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  planItemId: varchar("plan_item_id", { length: 36 }),
  nextDueAt: bigint("next_due_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  intervalDays: decimal("interval_days", { precision: 6, scale: 2 }).notNull().default("1"),
  easeFactor: decimal("ease_factor", { precision: 4, scale: 3 }).notNull().default("2.500" as any),
  repetitions: int("repetitions").notNull().default(0),
  lastScore: decimal("last_score", { precision: 5, scale: 2 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  userDueIdx: index("idx_srq_user_due").on(t.userId, t.nextDueAt),
  uniqueUserModule: unique("uq_srq_user_module").on(t.userId, t.moduleId),
}));

export type LearningModule = typeof learningModules.$inferSelect;
export type GapAnalysis = typeof gapAnalyses.$inferSelect;
export type AdaptiveLearningPlan = typeof adaptiveLearningPlans.$inferSelect;
export type AdaptivePlanItem = typeof adaptivePlanItems.$inferSelect;
export type SpacedRepetitionQueue = typeof spacedRepetitionQueue.$inferSelect;

// --- Module Personalisation Cache ---------------------------------------------
export const modulePersonalisationCache = mysqlTable("module_personalisation_cache", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  roleArchetype: varchar("role_archetype", { length: 100 }),
  seniorityLevel: varchar("seniority_level", { length: 100 }),
  personalisedIntro: text("personalised_intro"),
  contextualExamples: json("contextual_examples"),
  failureModeCallouts: json("failure_mode_callouts"),
  generatedAt: bigint("generated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  uniqueUserModule: unique("uq_user_module").on(t.userId, t.moduleId),
  userIdx: index("idx_mpc_user").on(t.userId),
}));

// --- Formative Quiz Results ----------------------------------------------------
export const formativeQuizResults = mysqlTable("formative_quiz_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  planItemId: varchar("plan_item_id", { length: 36 }),
  score: int("score").notNull(),
  totalQuestions: int("total_questions").notNull(),
  answersJson: json("answers_json").notNull(),
  passed: int("passed").default(0),
  attemptedAt: bigint("attempted_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  userModuleIdx: index("idx_fqr_user_module").on(t.userId, t.moduleId),
  userIdx: index("idx_fqr_user").on(t.userId),
}));

// --- Learning Streaks ----------------------------------------------------------
export const learningStreaks = mysqlTable("learning_streaks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  currentStreak: int("current_streak").default(0),
  longestStreak: int("longest_streak").default(0),
  lastActivityDate: varchar("last_activity_date", { length: 10 }),
  totalModulesCompleted: int("total_modules_completed").default(0),
  totalMinsLearned: int("total_mins_learned").default(0),
  milestonesJson: json("milestones_json"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  userIdx: index("idx_ls_user").on(t.userId),
}));

// --- Manager Team Members ------------------------------------------------------
export const managerTeamMembers = mysqlTable("manager_team_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  managerId: varchar("manager_id", { length: 36 }).notNull(),
  memberId: varchar("member_id", { length: 36 }).notNull(),
  addedAt: bigint("added_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  uniqueManagerMember: unique("uq_manager_member").on(t.managerId, t.memberId),
  managerIdx: index("idx_mtm_manager").on(t.managerId),
}));

// --- Learning Nudges (manager → learner module recommendations) --------------
export const learningNudges = mysqlTable("learning_nudges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  managerId: varchar("manager_id", { length: 36 }).notNull(),
  learnerId: varchar("learner_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  message: text("message"),
  sentAt: bigint("sent_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  status: mysqlEnum("status", ["sent", "viewed", "completed", "declined"]).notNull().default("sent"),
}, (t) => ({
  learnerIdx: index("idx_nudges_learner").on(t.learnerId),
  managerIdx: index("idx_nudges_manager").on(t.managerId),
}));

// --- Learning Milestones (capability improvement badges) ---------------------
export const learningMilestones = mysqlTable("learning_milestones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  milestoneType: varchar("milestone_type", { length: 50 }).notNull(),
  capability: varchar("capability", { length: 100 }),
  badgeKey: varchar("badge_key", { length: 100 }),
  achievedAt: bigint("achieved_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  metadataJson: json("metadata_json"),
}, (t) => ({
  userIdx: index("idx_milestones_user").on(t.userId),
}));

// --- Organisations ----------------------------------------------------------
export const organisations = mysqlTable("organisations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_org_tenant").on(t.tenantId),
}));

export const organisationProfiles = mysqlTable("organisation_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  organisationId: varchar("organisation_id", { length: 36 }).notNull(),
  sector: varchar("sector", { length: 100 }),
  aiAdoptionStage: mysqlEnum("ai_adoption_stage", ["exploring", "piloting", "scaling", "embedded"]).default("exploring"),
  riskAppetite: mysqlEnum("risk_appetite", ["conservative", "moderate", "progressive"]).default("moderate"),
  governanceRegime: varchar("governance_regime", { length: 100 }),
  priorityCapabilities: json("priority_capabilities").$type<string[]>(),
  aiToolsJson: json("ai_tools_json").$type<string[]>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// --- Canonical Signals --------------------------------------------------------
export const canonicalSignals = mysqlTable("canonical_signals", {
  signalKey: varchar("signal_key", { length: 100 }).primaryKey(),
  domain: varchar("domain", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ModulePersonalisationCache = typeof modulePersonalisationCache.$inferSelect;
export type FormativeQuizResult = typeof formativeQuizResults.$inferSelect;
export type LearningStreak = typeof learningStreaks.$inferSelect;
export type ManagerTeamMember = typeof managerTeamMembers.$inferSelect;
export type LearningNudge = typeof learningNudges.$inferSelect;
export type LearningMilestone = typeof learningMilestones.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type OrganisationProfile = typeof organisationProfiles.$inferSelect;
export type CanonicalSignal = typeof canonicalSignals.$inferSelect;

// --- A3: Org Workflow Anchor Usage (cross-participant overlap guard) -----------
// Tracks which workflow contexts have been recently used by participants in a
// tenant cohort, enabling the adaptive engine to rotate anchors across users.
export const orgWorkflowAnchorUsage = mysqlTable("org_workflow_anchor_usage", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  roleArchetypeId: varchar("role_archetype_id", { length: 36 }).notNull(),
  workflowContext: varchar("workflow_context", { length: 100 }).notNull(),
  usageCount: int("usage_count").notNull().default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
}, (t) => ({
  tenantRoleIdx: index("idx_org_workflow_anchor_tenant_role").on(t.tenantId, t.roleArchetypeId),
}));
export type OrgWorkflowAnchorUsage = typeof orgWorkflowAnchorUsage.$inferSelect;

// --- Strategy Builder ---------------------------------------------------------

export const strategyIndustries = mysqlTable("strategy_industries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  ethicsBaseline: double("ethics_baseline").notNull().default(0),
  governancePriority: double("governance_priority").notNull().default(1.0),
  regulatoryWeight: double("regulatory_weight").notNull().default(1.0),
  isRegulated: tinyint("is_regulated").notNull().default(0),
  peerInitCountMin: int("peer_init_count_min").notNull().default(3),
  peerInitCountMax: int("peer_init_count_max").notNull().default(8),
  peerGovShareMin: double("peer_gov_share_min").notNull().default(0.15),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const strategyHrSegments = mysqlTable("strategy_hr_segments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull(),
  size: int("size").notNull().default(10),
  currentCapability: double("current_capability").notNull().default(2.0),
  isDefault: tinyint("is_default").notNull().default(0),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_hr_segments_tenant").on(t.tenantId),
}));

export const strategyInitiativeLibrary = mysqlTable("strategy_initiative_library", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  aiType: varchar("ai_type", { length: 60 }).notNull(),
  decisionAuthority: varchar("decision_authority", { length: 60 }).notNull().default("recommends_to_human"),
  regulatoryFlag: varchar("regulatory_flag", { length: 100 }),
  owningSegmentsJson: json("owning_segments_json").$type<string[]>().notNull(),
  weightsJson: json("weights_json").$type<number[]>().notNull(),
  baseTarget: double("base_target").notNull().default(3.0),
  complexity: int("complexity").notNull().default(3),
  keywordsJson: json("keywords_json").$type<string[]>().notNull(),
  forkedFromId: varchar("forked_from_id", { length: 36 }),
  isUserDefined: tinyint("is_user_defined").notNull().default(0),
  frameworkVersion: varchar("framework_version", { length: 20 }).notNull().default("v1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_initiative_lib_tenant").on(t.tenantId),
  categoryIdx: index("idx_initiative_lib_category").on(t.category),
}));

export const strategies = mysqlTable("strategies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 200 }).notNull().default("Strategy A"),
  description: text("description"),
  industryId: varchar("industry_id", { length: 36 }).notNull(),
  businessAmbition: int("business_ambition").notNull().default(2),
  peopleAmbition: int("people_ambition").notNull().default(2),
  status: mysqlEnum("status", ["draft", "committed", "archived"]).notNull().default("draft"),
  committedAt: timestamp("committed_at"),
  committedByUserId: varchar("committed_by_user_id", { length: 36 }),
  frameworkVersion: varchar("framework_version", { length: 20 }).notNull().default("v1"),
  slot: varchar("slot", { length: 1 }).notNull().default("A"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_strategies_tenant").on(t.tenantId),
  userIdx: index("idx_strategies_user").on(t.createdByUserId),
}));

export const strategyInitiatives = mysqlTable("strategy_initiatives", {
  id: varchar("id", { length: 36 }).primaryKey(),
  strategyId: varchar("strategy_id", { length: 36 }).notNull(),
  initiativeId: varchar("initiative_id", { length: 36 }).notNull(),
  criticality: int("criticality").notNull().default(1),
  targetQuarter: varchar("target_quarter", { length: 20 }).notNull().default("Q2 26"),
  targetQuarterOffset: int("target_quarter_offset").notNull().default(6),
  notes: text("notes"),
  // v1.3: C1 implementation status tracking
  status: mysqlEnum("status", ["not_started", "in_progress", "paused", "completed", "cancelled"]).notNull().default("not_started"),
  statusStartedAt: bigint("status_started_at", { mode: "number" }),
  statusCompletedAt: bigint("status_completed_at", { mode: "number" }),
  statusReason: text("status_reason"),
  functionOverride: varchar("function_override", { length: 100 }),   // user-editable HR function override
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  strategyIdx: index("idx_strategy_initiatives_strategy").on(t.strategyId),
  initiativeIdx: index("idx_strategy_initiatives_initiative").on(t.initiativeId),
}));

export const strategyRiskRegister = mysqlTable("strategy_risk_register", {
  id: varchar("id", { length: 36 }).primaryKey(),
  strategyId: varchar("strategy_id", { length: 36 }).notNull(),
  initiativeId: varchar("initiative_id", { length: 36 }).notNull(),
  regulatoryFlag: varchar("regulatory_flag", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["high", "medium"]).notNull().default("medium"),
  mitigation: text("mitigation"),
  ownerRole: varchar("owner_role", { length: 100 }),
  reviewCadence: varchar("review_cadence", { length: 100 }),
  launchQuarter: varchar("launch_quarter", { length: 20 }),
  status: mysqlEnum("status", ["open", "mitigated", "accepted", "closed"]).notNull().default("open"),
  isUserDefined: tinyint("is_user_defined").notNull().default(0),
  sourceRuleId: varchar("source_rule_id", { length: 100 }),                      // content library risk rule ID that triggered this entry
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  strategyIdx: index("idx_risk_register_strategy").on(t.strategyId),
}));

export type StrategyIndustry = typeof strategyIndustries.$inferSelect;
export type StrategyHrSegment = typeof strategyHrSegments.$inferSelect;
export type StrategyInitiativeLibrary = typeof strategyInitiativeLibrary.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type StrategyInitiative = typeof strategyInitiatives.$inferSelect;
export type StrategyRiskRegister = typeof strategyRiskRegister.$inferSelect;

// --- Company HR AI Assessment -------------------------------------------------

export const companies = mysqlTable("companies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  sector: varchar("sector", { length: 100 }).notNull().default(""),
  subSector: varchar("sub_sector", { length: 100 }),
  orgType: varchar("org_type", { length: 100 }),
  headcountBand: varchar("headcount_band", { length: 50 }).notNull().default(""),
  hrTeamSize: varchar("hr_team_size", { length: 50 }).notNull().default(""),
  hrisPlatform: varchar("hris_platform", { length: 100 }).notNull().default(""),
  existingAiToolsJson: json("existing_ai_tools_json").$type<string[]>().notNull().default([]),
  assessmentMotivation: varchar("assessment_motivation", { length: 100 }).notNull().default(""),
  resultsAudience: varchar("results_audience", { length: 100 }).notNull().default(""),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_companies_tenant").on(t.tenantId),
  userIdx: index("idx_companies_user").on(t.createdByUserId),
}));

export const companyQuestions = mysqlTable("company_questions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dimension: varchar("dimension", { length: 60 }).notNull(),
  dimensionLabel: varchar("dimension_label", { length: 100 }).notNull(),
  questionCode: varchar("question_code", { length: 20 }).notNull().unique(),
  isCalibration: tinyint("is_calibration").notNull().default(0),
  difficulty: int("difficulty").notNull().default(2),
  stem: text("stem").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  scoreA: double("score_a").notNull().default(1.0),
  scoreB: double("score_b").notNull().default(2.0),
  scoreC: double("score_c").notNull().default(3.5),
  scoreD: double("score_d").notNull().default(5.0),
  frameworkVersion: varchar("framework_version", { length: 20 }).notNull().default("v1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  dimensionIdx: index("idx_company_q_dimension").on(t.dimension),
  codeIdx: index("idx_company_q_code").on(t.questionCode),
}));

export const companyAssessments = mysqlTable("company_assessments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  companyId: varchar("company_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 36 }).notNull(),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).notNull().default("in_progress"),
  currentDimension: varchar("current_dimension", { length: 60 }),
  questionsAnswered: int("questions_answered").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  companyIdx: index("idx_company_assessments_company").on(t.companyId),
  tenantIdx: index("idx_company_assessments_tenant").on(t.tenantId),
}));

export const companyAssessmentResponses = mysqlTable("company_assessment_responses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  assessmentId: varchar("assessment_id", { length: 36 }).notNull(),
  questionId: varchar("question_id", { length: 36 }).notNull(),
  selectedOption: varchar("selected_option", { length: 1 }).notNull(),
  confidence: varchar("confidence", { length: 20 }).notNull().default("fairly_sure"),
  evidence: text("evidence"),
  rawScore: double("raw_score").notNull(),
  adjustedScore: double("adjusted_score").notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
}, (t) => ({
  assessmentIdx: index("idx_company_responses_assessment").on(t.assessmentId),
  questionIdx: index("idx_company_responses_question").on(t.questionId),
}));

export const companyAssessmentResults = mysqlTable("company_assessment_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  assessmentId: varchar("assessment_id", { length: 36 }).notNull().unique(),
  companyId: varchar("company_id", { length: 36 }).notNull(),
  scoreStrategy: double("score_strategy").notNull().default(0),
  scoreGovernance: double("score_governance").notNull().default(0),
  scoreData: double("score_data").notNull().default(0),
  scoreTechnology: double("score_technology").notNull().default(0),
  scoreWorkforce: double("score_workforce").notNull().default(0),
  scoreHrFunction: double("score_hr_function").notNull().default(0),
  scoreCulture: double("score_culture").notNull().default(0),
  overallScore: double("overall_score").notNull().default(0),
  maturityLabel: varchar("maturity_label", { length: 60 }).notNull().default(""),
  sectorPercentile: int("sector_percentile"),
  overallPercentile: int("overall_percentile"),
  executiveSummary: text("executive_summary"),
  gapAnalysisJson: json("gap_analysis_json").$type<{
    critical: string[];
    developing: string[];
    strengths: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  assessmentIdx: index("idx_company_results_assessment").on(t.assessmentId),
  companyIdx: index("idx_company_results_company").on(t.companyId),
}));

export type Company = typeof companies.$inferSelect;
export type CompanyQuestion = typeof companyQuestions.$inferSelect;
export type CompanyAssessment = typeof companyAssessments.$inferSelect;
export type CompanyAssessmentResponse = typeof companyAssessmentResponses.$inferSelect;
export type CompanyAssessmentResult = typeof companyAssessmentResults.$inferSelect;

// -----------------------------------------------------------------------------
// AiQ COACH - Phase 0 Schema
// -----------------------------------------------------------------------------

// -- coach_sessions ------------------------------------------------------------
export const coachSessions = mysqlTable("coach_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull().default("diagnostic"),
  state: varchar("state", { length: 32 }).notNull().default("idle"),
  assessmentSessionId: varchar("assessment_session_id", { length: 36 }),
  modeContextJson: json("mode_context_json"),
  currentAct: varchar("current_act", { length: 64 }),
  turnCount: int("turn_count").notNull().default(0),
  promptVersion: varchar("prompt_version", { length: 32 }).notNull().default("1.0.0"),
  classifierVersion: varchar("classifier_version", { length: 32 }).notNull().default("1.0.0"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  pausedAt: timestamp("paused_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_coach_sessions_tenant").on(t.tenantId),
  userIdx: index("idx_coach_sessions_user").on(t.userId),
}));

// -- coach_messages ------------------------------------------------------------
export const coachMessages = mysqlTable("coach_messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  clientTurnId: varchar("client_turn_id", { length: 64 }),
  classificationJson: json("classification_json"),
  flagsJson: json("flags_json"),
  llmFirstTokenMs: int("llm_first_token_ms"),
  llmCompletionMs: int("llm_completion_ms"),
  classifierMs: int("classifier_ms"),
  llmInputTokens: int("llm_input_tokens"),
  llmOutputTokens: int("llm_output_tokens"),
  classifierTokens: int("classifier_tokens"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index("idx_coach_messages_session").on(t.sessionId),
  tenantIdx: index("idx_coach_messages_tenant").on(t.tenantId),
}));

// -- user_capability_memory ----------------------------------------------------
export const userCapabilityMemory = mysqlTable("user_capability_memory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  capabilityDomain: varchar("capability_domain", { length: 64 }).notNull(),
  signalKey: varchar("signal_key", { length: 64 }).notNull(),
  memoryType: varchar("memory_type", { length: 32 }).notNull(),
  confidence: int("confidence").notNull().default(80),
  sourceTurnId: varchar("source_turn_id", { length: 36 }),
  sourceSessionId: varchar("source_session_id", { length: 36 }),
  sourceMode: varchar("source_mode", { length: 32 }),
  summary: text("summary"),
  evidenceJson: json("evidence_json"),
  conflictStatus: varchar("conflict_status", { length: 32 }).default("none"),
  supersededById: varchar("superseded_by_id", { length: 36 }),
  lastReinforcedAt: timestamp("last_reinforced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userDomainIdx: index("idx_ucm_user_domain").on(t.userId, t.capabilityDomain),
  tenantIdx: index("idx_ucm_tenant").on(t.tenantId),
}));

// -- coach_audit_log -----------------------------------------------------------
export const coachAuditLog = mysqlTable("coach_audit_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }),
  turnId: varchar("turn_id", { length: 36 }),
  payloadJson: json("payload_json").notNull(),
  classifierVersion: varchar("classifier_version", { length: 32 }),
  promptVersion: varchar("prompt_version", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userTimeIdx: index("idx_coach_audit_user_time").on(t.userId, t.createdAt),
  tenantEventIdx: index("idx_coach_audit_tenant_event").on(t.tenantId, t.eventType, t.createdAt),
}));

// -- apply_commitments ---------------------------------------------------------
export const applyCommitments = mysqlTable("apply_commitments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  capabilityDomain: varchar("capability_domain", { length: 64 }).notNull(),
  commitmentText: text("commitment_text").notNull(),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx: index("idx_apply_commitments_user").on(t.userId),
  tenantIdx: index("idx_apply_commitments_tenant").on(t.tenantId),
}));

// -- apply_evidence ------------------------------------------------------------
export const applyEvidence = mysqlTable("apply_evidence", {
  id: varchar("id", { length: 36 }).primaryKey(),
  commitmentId: varchar("commitment_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  evidenceText: text("evidence_text").notNull(),
  qualityScore: int("quality_score"),
  classificationJson: json("classification_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  commitmentIdx: index("idx_apply_evidence_commitment").on(t.commitmentId),
  userIdx: index("idx_apply_evidence_user").on(t.userId),
}));

// -- Exported types -------------------------------------------------------------
export type CoachSession = typeof coachSessions.$inferSelect;
export type CoachMessage = typeof coachMessages.$inferSelect;
export type UserCapabilityMemory = typeof userCapabilityMemory.$inferSelect;
export type CoachAuditLog = typeof coachAuditLog.$inferSelect;
export type ApplyCommitment = typeof applyCommitments.$inferSelect;
export type ApplyEvidence = typeof applyEvidence.$inferSelect;

// -- Norm Data Points (CR-7: population norm collection) -----------------------
// Anonymised data points collected from completed assessments.
// Used to replace synthetic sector norms with real population data over time.
// No PII stored - only sector, job function, and score data.
export const normDataPoints = mysqlTable("norm_data_points", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sector: varchar("sector", { length: 100 }),
  jobFunction: varchar("job_function", { length: 100 }),
  experienceLevel: varchar("experience_level", { length: 50 }),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  capabilityScoresJson: json("capability_scores_json").$type<Record<string, number>>().notNull(),
  readinessState: varchar("readiness_state", { length: 50 }),
  modelVersion: varchar("model_version", { length: 50 }).default("adaptive-v2"),
  collectedAt: bigint("collected_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  sectorIdx: index("idx_norm_data_sector").on(t.sector),
  jobFunctionIdx: index("idx_norm_data_job_function").on(t.jobFunction),
  collectedAtIdx: index("idx_norm_data_collected_at").on(t.collectedAt),
}));
export type NormDataPoint = typeof normDataPoints.$inferSelect;

// -- Module Engagement Events (AL-08: per-section engagement tracking) ---------
// Tracks time-on-section and scroll depth for adaptive difficulty (Phase 3).
// Data collection layer - adaptive content injection is Phase 3.
export const moduleEngagementEvents = mysqlTable("module_engagement_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  sectionIndex: int("section_index").notNull(),
  sectionType: varchar("section_type", { length: 50 }),
  timeOnSectionMs: int("time_on_section_ms").notNull().default(0),
  scrollDepthPct: int("scroll_depth_pct").notNull().default(0),
  quizCorrect: boolean("quiz_correct"),
  completedSection: boolean("completed_section").notNull().default(false),
  recordedAt: bigint("recorded_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  userModuleIdx: index("idx_mee_user_module").on(t.userId, t.moduleId),
  moduleIdx: index("idx_mee_module").on(t.moduleId),
}));
export type ModuleEngagementEvent = typeof moduleEngagementEvents.$inferSelect;

// -- Content Feedback (Relevance & Update Engine - data collection layer) ------
// Collects user ratings on assessment scenarios after completion.
// Feeds the trigger-based content update pipeline (Phase 3 full implementation).
export const contentFeedback = mysqlTable("content_feedback", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  scenarioId: varchar("scenario_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }),
  // 1-5 star rating: 1=very poor, 3=neutral, 5=excellent
  relevanceRating: int("relevance_rating"),
  clarityRating: int("clarity_rating"),
  difficultyRating: int("difficulty_rating"),
  // Free-text feedback
  comment: text("comment"),
  // Computed: flag for review when avg rating < 2.5 across 5+ responses
  flaggedForReview: boolean("flagged_for_review").notNull().default(false),
  submittedAt: bigint("submitted_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  scenarioIdx: index("idx_content_feedback_scenario").on(t.scenarioId),
  userIdx: index("idx_content_feedback_user").on(t.userId),
  flaggedIdx: index("idx_content_feedback_flagged").on(t.flaggedForReview),
}));
export type ContentFeedback = typeof contentFeedback.$inferSelect;

// --- v1.3 Operational Maturity Tables -----------------------------------------

// A4: Library usage telemetry - records each strategy generation event
export const libraryUsageEvents = mysqlTable("library_usage_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  eventType: mysqlEnum("event_type", [
    "strategy_generated",
    "strategy_regenerated",
    "initiative_selected",
    "initiative_deselected",
    "cost_envelope_viewed",
    "value_envelope_viewed",
    "risk_evaluated",
    "pdf_exported",
  ]).notNull(),
  libraryVersion: varchar("library_version", { length: 20 }).notNull(),
  initiativeIdsJson: text("initiative_ids_json"),
  sectorId: varchar("sector_id", { length: 36 }),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  tenantIdx: index("idx_lue_tenant").on(t.tenantId),
  userIdx: index("idx_lue_user").on(t.userId),
  eventTypeIdx: index("idx_lue_event_type").on(t.eventType),
  occurredAtIdx: index("idx_lue_occurred_at").on(t.occurredAt),
}));
export type LibraryUsageEvent = typeof libraryUsageEvents.$inferSelect;

// B1: Content improvement requests from HR leaders
export const contentRequests = mysqlTable("content_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  requestType: mysqlEnum("request_type", [
    "new_initiative",
    "update_initiative",
    "new_source",
    "update_source",
    "new_risk_rule",
    "other",
  ]).notNull().default("other"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  relatedInitiativeId: varchar("related_initiative_id", { length: 100 }),
  relatedSourceId: varchar("related_source_id", { length: 100 }),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).notNull().default("medium"),
  status: mysqlEnum("status", ["open", "under_review", "accepted", "declined", "done"]).notNull().default("open"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_cr_tenant").on(t.tenantId),
  statusIdx: index("idx_cr_status").on(t.status),
  createdAtIdx: index("idx_cr_created_at").on(t.createdAt),
}));
export type ContentRequest = typeof contentRequests.$inferSelect;

// C1: Initiative status history audit trail
export const initiativeStatusHistory = mysqlTable("initiative_status_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  strategyInitiativeId: varchar("strategy_initiative_id", { length: 36 }).notNull(),
  strategyId: varchar("strategy_id", { length: 36 }).notNull(),
  initiativeId: varchar("initiative_id", { length: 36 }).notNull(),
  fromStatus: mysqlEnum("from_status", ["not_started", "in_progress", "paused", "completed", "cancelled"]),
  toStatus: mysqlEnum("to_status", ["not_started", "in_progress", "paused", "completed", "cancelled"]).notNull(),
  reason: text("reason"),
  changedByUserId: varchar("changed_by_user_id", { length: 36 }).notNull(),
  changedAt: bigint("changed_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  strategyInitiativeIdx: index("idx_ish_strategy_initiative").on(t.strategyInitiativeId),
  strategyIdx: index("idx_ish_strategy").on(t.strategyId),
  changedAtIdx: index("idx_ish_changed_at").on(t.changedAt),
}));
export type InitiativeStatusHistory = typeof initiativeStatusHistory.$inferSelect;

// C2: Strategy milestones - generated from change plan phases
export const strategyMilestones = mysqlTable("strategy_milestones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  strategyId: varchar("strategy_id", { length: 36 }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  phase: mysqlEnum("phase", ["foundation", "build", "scale", "optimise"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  relatedInitiativeId: varchar("related_initiative_id", { length: 100 }),
  dueDate: varchar("due_date", { length: 10 }),
  completedAt: timestamp("completed_at"),
  completedByUserId: varchar("completed_by_user_id", { length: 36 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "overdue"]).notNull().default("pending"),
  sortOrder: int("sort_order").notNull().default(0),
  isAutoGenerated: tinyint("is_auto_generated").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  strategyIdx: index("idx_sm_strategy").on(t.strategyId),
  tenantIdx: index("idx_sm_tenant").on(t.tenantId),
  phaseIdx: index("idx_sm_phase").on(t.phase),
  statusIdx: index("idx_sm_status").on(t.status),
}));
export type StrategyMilestone = typeof strategyMilestones.$inferSelect;

// D1: Assessment history - records each assessment snapshot for progression tracking
export const assessmentHistory = mysqlTable("assessment_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  assessmentType: mysqlEnum("assessment_type", ["initial", "reassessment", "quarterly_review"]).notNull().default("initial"),
  overallScore: double("overall_score").notNull().default(0),
  domainScoresJson: text("domain_scores_json").notNull(),
  selectedInitiativeIdsJson: text("selected_initiative_ids_json"),
  libraryVersion: varchar("library_version", { length: 20 }),
  assessedAt: bigint("assessed_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  notes: text("notes"),
}, (t) => ({
  tenantIdx: index("idx_ah_tenant").on(t.tenantId),
  userIdx: index("idx_ah_user").on(t.userId),
  assessedAtIdx: index("idx_ah_assessed_at").on(t.assessedAt),
}));
export type AssessmentHistory = typeof assessmentHistory.$inferSelect;

// D3: Strategy refresh suggestions - generated by nightly Heartbeat job
export const strategyRefreshSuggestions = mysqlTable("strategy_refresh_suggestions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  triggerType: mysqlEnum("trigger_type", [
    "capability_progression",
    "library_version_update",
    "milestone_completion",
    "manual",
  ]).notNull(),
  triggerDetail: text("trigger_detail"),
  currentLibraryVersion: varchar("current_library_version", { length: 20 }),
  latestLibraryVersion: varchar("latest_library_version", { length: 20 }),
  previousScore: double("previous_score"),
  currentScore: double("current_score"),
  status: mysqlEnum("status", ["pending", "dismissed", "snoozed", "acted"]).notNull().default("pending"),
  snoozedUntil: timestamp("snoozed_until"),
  actedAt: timestamp("acted_at"),
  actedByUserId: varchar("acted_by_user_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  tenantIdx: index("idx_srs_tenant").on(t.tenantId),
  statusIdx: index("idx_srs_status").on(t.status),
  createdAtIdx: index("idx_srs_created_at").on(t.createdAt),
}));
export type StrategyRefreshSuggestion = typeof strategyRefreshSuggestions.$inferSelect;

// E3: Manager briefs - LLM-generated function-specific strategy briefs
export const managerBriefs = mysqlTable("manager_briefs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  strategyContextId: varchar("strategy_context_id", { length: 36 }).notNull(),
  managerFunction: varchar("manager_function", { length: 100 }).notNull(),
  briefMarkdown: text("brief_markdown").notNull(),
  initiativeIdsJson: text("initiative_ids_json").notNull(),
  libraryVersion: varchar("library_version", { length: 20 }),
  generatedAt: bigint("generated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  generatedByUserId: varchar("generated_by_user_id", { length: 36 }),
}, (t) => ({
  tenantFunctionIdx: index("idx_mb_tenant_function").on(t.tenantId, t.managerFunction),
  strategyCtxIdx: index("idx_mb_strategy_ctx").on(t.strategyContextId),
}));
export type ManagerBrief = typeof managerBriefs.$inferSelect;

// --- F: Content Review Policy -------------------------------------------------

// F1: Content review log - append-only audit trail of library version bumps
export const contentReviewLog = mysqlTable("content_review_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  version: varchar("version", { length: 20 }).notNull(),                       // e.g. "1.3.0"
  bumpType: mysqlEnum("bump_type", ["patch", "minor", "major"]).notNull(),
  triggerType: mysqlEnum("trigger_type", [
    "quarterly_review",
    "annual_review",
    "regulatory_trigger",
    "customer_trigger",
    "operational_trigger",
    "manual",
  ]).notNull().default("manual"),
  triggerDetail: text("trigger_detail"),                                        // free-text description of what triggered this review
  author: varchar("author", { length: 100 }).notNull().default("David"),
  reviewer: varchar("reviewer", { length: 100 }),
  changesJson: text("changes_json"),                                            // JSON: string[] of change descriptions
  newSourcesJson: text("new_sources_json"),                                     // JSON: { source_id, citation, confidence }[]
  testFixturesJson: text("test_fixtures_json"),                                 // JSON: { passed, total, notes }[]
  knownIssues: text("known_issues"),                                            // free-text known issues
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  versionIdx: index("idx_crl_version").on(t.version),
  createdAtIdx: index("idx_crl_created_at").on(t.createdAt),
}));
export type ContentReviewLogEntry = typeof contentReviewLog.$inferSelect;

// F2: Triggered reviews - tracks events that trigger an immediate content review
export const triggeredReviews = mysqlTable("triggered_reviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  triggerCategory: mysqlEnum("trigger_category", [
    "regulatory",
    "customer",
    "operational",
  ]).notNull(),
  triggerType: varchar("trigger_type", { length: 100 }).notNull(),             // e.g. "ICO guidance", "design_partner_request", "risk_rule_never_fires"
  triggerDetail: text("trigger_detail").notNull(),                              // full description of the triggering event
  affectedContent: text("affected_content"),                                   // what content is affected (initiative IDs, rule IDs, etc.)
  plannedReviewDate: varchar("planned_review_date", { length: 10 }),           // ISO date YYYY-MM-DD
  status: mysqlEnum("status", ["open", "in_review", "resolved", "deferred"]).notNull().default("open"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id", { length: 36 }),
  resolutionNotes: text("resolution_notes"),
  linkedReviewLogId: varchar("linked_review_log_id", { length: 36 }),          // FK to content_review_log if resolved via a version bump
  createdByUserId: varchar("created_by_user_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  statusIdx: index("idx_tr_status").on(t.status),
  categoryIdx: index("idx_tr_category").on(t.triggerCategory),
  createdAtIdx: index("idx_tr_created_at").on(t.createdAt),
}));
export type TriggeredReview = typeof triggeredReviews.$inferSelect;

// -- coaching_conversations (v1.4: module-linked conversation persistence) -----
export const coachingConversations = mysqlTable("coaching_conversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 36 }),
  conversationJson: json("conversation_json").$type<Array<{ role: string; content: string; createdAt: number }>>().notNull().$default(() => []),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  userModuleIdx: index("idx_cc_user_module").on(t.userId, t.moduleId),
}));
export type CoachingConversation = typeof coachingConversations.$inferSelect;


// -- module_feedback (Feedback Build Brief A1) ---------------------------------
// Stores AI coaching feedback generated for Reflection and Practical Exercise
// module responses. Multiple rows per (user, module, prompt_index) are allowed -
// each "Get a different perspective" call creates a new row.
export const moduleFeedback = mysqlTable("module_feedback", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  promptIndex: int("prompt_index").notNull().default(0),
  feedbackText: text("feedback_text").notNull(),
  formatType: mysqlEnum("format_type", ["reflection", "practical_exercise"]).notNull(),
  userResponseSnapshot: text("user_response_snapshot").notNull(),
  modelUsed: varchar("model_used", { length: 100 }).notNull().default("default"),
  libraryVersion: varchar("library_version", { length: 20 }).notNull().default("v1.4"),
  generatedAt: bigint("generated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userModuleIdx: index("idx_mf_user_module").on(t.userId, t.moduleId),
  userModulePromptIdx: index("idx_mf_user_module_prompt").on(t.userId, t.moduleId, t.promptIndex),
}));
export type ModuleFeedback = typeof moduleFeedback.$inferSelect;

// -- question_flags (Assessment Question Page Refinement Brief v2 — D1) --------
// Stores user-submitted flags on assessment questions for content team review.
// Flags are captured during live assessment sessions and surfaced in the admin
// review queue. High flag rates on a question trigger automated tagging.
export const questionFlags = mysqlTable("question_flags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  itemId: varchar("item_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  reason: mysqlEnum("reason", [
    "confusing_wording",
    "multiple_correct_answers",
    "not_applicable",
    "other",
  ]).notNull(),
  comment: text("comment"),
  reviewed: tinyint("reviewed").notNull().default(0),
  reviewedBy: varchar("reviewed_by", { length: 36 }),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (t) => ({
  sessionIdx: index("idx_qf_session").on(t.sessionId),
  itemIdx: index("idx_qf_item").on(t.itemId),
  userIdx: index("idx_qf_user").on(t.userId),
  reviewedIdx: index("idx_qf_reviewed").on(t.reviewed),
}));
export type QuestionFlag = typeof questionFlags.$inferSelect;

// ─── Risk Acknowledgements ─────────────────────────────────────────────────
export const riskAcknowledgements = mysqlTable("risk_acknowledgements", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  itemId: varchar("item_id", { length: 128 }).notNull(),
  itemType: mysqlEnum("item_type", ["risk", "framework"]).notNull(),
  acknowledgedBy: varchar("acknowledged_by", { length: 36 }).notNull(),
  acknowledgedAt: bigint("acknowledged_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  note: text("note"),
  revokedAt: bigint("revoked_at", { mode: "number" }),
  revokedBy: varchar("revoked_by", { length: 36 }),
}, (t) => ({
  tenantIdx: index("idx_risk_ack_tenant").on(t.tenantId),
  itemIdx: index("idx_risk_ack_item").on(t.itemId),
  activeIdx: index("idx_risk_ack_active").on(t.tenantId, t.itemId),
}));
export type RiskAcknowledgement = typeof riskAcknowledgements.$inferSelect;
