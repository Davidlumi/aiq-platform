/**
 * Precondition Library — Phase C
 *
 * Founder-curated, version-controlled. Not auto-generated.
 *
 * A precondition is a condition that must be true BEFORE an initiative can succeed.
 * It is not a risk that might materialise, and not a cost assumption.
 * It is the thing that, if absent, makes the initiative fail regardless of execution quality.
 *
 * Authoring rules:
 * 1. `statement` — what must be true, in plain English.
 * 2. `whyItKills` — the specific failure mechanism, not a generic risk statement.
 *    "Legal review required" is NOT acceptable. "Analysis is discoverable in tribunal
 *    proceedings unless conducted under legal privilege" IS acceptable.
 * 3. `severity: "fatal"` — initiative cannot proceed without this.
 *    `severity: "high"` — initiative is severely impaired without this.
 *    `severity: "medium"` — initiative is degraded but can proceed with mitigations.
 * 4. New initiatives: add the corresponding precondition entry in the same PR as the
 *    initiative entry in shared/initiativeLibrary.ts.
 * 5. Gate misses: when the gate reveals a miss (engine failed to surface a killer),
 *    the founder adds or amends the entry here. The library grows from real cases.
 *
 * GATE NOTE: H1 (rt_flight_risk_prediction), H2 (ta_video_interview_assessment),
 * H3 (wp_succession_planning) are intentionally NOT seeded. They are held-out gate
 * cases. Do not add entries for these initiative IDs until after the gate has run.
 */

export type PreconditionDomain =
  | "talent_acquisition"
  | "learning_development"
  | "internal_mobility"
  | "performance_management"
  | "employee_experience"
  | "retention"
  | "hr_operations"
  | "workforce_planning"
  | "compensation_reward"
  | "manager_effectiveness"
  | "governance"
  | "frontline_workforce"
  | "ai_capability";

export type PreconditionSeverity = "fatal" | "high" | "medium";

export type PreconditionEntry = {
  id: string;                          // stable key, e.g. "pc_pay_equity_legal_privilege"
  domain: PreconditionDomain;
  initiativeIds: string[];             // which initiative IDs this precondition applies to
  statement: string;                   // what must be true — the precondition in plain English
  whyItKills: string;                  // the specific failure mechanism if this precondition is absent
  evidenceSignal: string;              // what in org context signals this may be absent
  contextFields: string[];             // sectionX.fieldName paths that inform this precondition
  severity: PreconditionSeverity;
};

// ─── Seeded entries (C1 and C2 control cases) ────────────────────────────────
// These are the two control-case killers for the Phase C gate.
// H1/H2/H3 held-out killers are intentionally absent.

export const PRECONDITION_LIBRARY: PreconditionEntry[] = [

  // ── Compensation & Reward ────────────────────────────────────────────────

  {
    id: "pc_pay_equity_legal_privilege",
    domain: "compensation_reward",
    initiativeIds: ["cr_pay_equity"],
    statement:
      "A legal privilege arrangement is in place with employment law counsel before the pay equity analysis begins.",
    whyItKills:
      "Pay equity analysis conducted without legal privilege is discoverable in employment tribunal proceedings. " +
      "Any gaps identified become evidence against the organisation — the analysis itself creates the liability. " +
      "Organisations that conduct pay equity analysis without privilege and then face a tribunal claim are in the " +
      "position of having produced the claimant's evidence for them.",
    evidenceSignal:
      "No legal or compliance function identified in org context; no mention of legal review in Section F change readiness.",
    contextFields: ["sectionF.changeReadiness", "sectionB.hrSubFunctions"],
    severity: "fatal",
  },

  {
    id: "pc_pay_equity_comp_data_in_hris",
    domain: "compensation_reward",
    initiativeIds: ["cr_pay_equity", "cr_compensation_recommendations"],
    statement:
      "Compensation data (base pay, bonus, grade, and job family) is held in the HRIS and is sufficiently complete for analysis.",
    whyItKills:
      "AI pay equity analysis requires a single source of truth for compensation. When compensation data is " +
      "fragmented across spreadsheets, payroll systems, and HRIS with different field definitions, the model " +
      "produces gaps it cannot fill and results that cannot be defended in a legal or regulatory context. " +
      "Partial data produces partial conclusions — which are worse than no conclusions because they appear authoritative.",
    evidenceSignal:
      "Low data quality rating in Section C; HRIS described as partially integrated or spreadsheet-dependent.",
    contextFields: ["sectionC.dataQualityRating", "sectionC.hrSystemIntegrationMaturity"],
    severity: "fatal",
  },

  // ── Frontline Workforce ──────────────────────────────────────────────────

  {
    id: "pc_scheduling_wfm_system",
    domain: "frontline_workforce",
    initiativeIds: ["fw_shift_scheduling_ai"],
    statement:
      "A workforce management (WFM) system is in place and contains shift pattern and scheduling data.",
    whyItKills:
      "AI scheduling optimises an existing scheduling data model — it does not replace one. Without a WFM system " +
      "as the data substrate, the initiative becomes a WFM implementation project with an AI layer on top. " +
      "The 3% labour cost reduction and 15% overtime reduction case studies assume an existing scheduling system; " +
      "without one, the initiative timeline extends by 12–18 months and the value case does not hold.",
    evidenceSignal:
      "No WFM system mentioned in Section C HR systems; HR system integration maturity is low.",
    contextFields: ["sectionC.hrSystemIntegrationMaturity", "sectionI.workforceComposition"],
    severity: "fatal",
  },

  {
    id: "pc_scheduling_union_agreement",
    domain: "frontline_workforce",
    initiativeIds: ["fw_shift_scheduling_ai"],
    statement:
      "Union or works council agreement (or confirmed absence of union representation) is in place before AI scheduling is deployed.",
    whyItKills:
      "In unionised environments, AI-assisted scheduling is a collective bargaining matter — it changes the terms " +
      "under which shift patterns are determined. Deployment without union agreement triggers industrial action risk " +
      "and can void the scheduling changes under the Employment Relations Act 1999. In the worst case, the first " +
      "AI-generated rota is challenged as a unilateral change to working conditions, and the organisation faces " +
      "both an unfair labour practice claim and the cost of reverting to manual scheduling mid-deployment.",
    evidenceSignal:
      "Frontline or mixed workforce composition in Section I; sector with high union density (retail, hospitality, logistics, healthcare, manufacturing).",
    contextFields: ["sectionI.workforceComposition", "sectionA.sector", "sectionA.ukSitesCount"],
    severity: "fatal",
  },

  // ── Learning & Development ───────────────────────────────────────────────

  {
    id: "pc_upskilling_skills_taxonomy",
    domain: "learning_development",
    initiativeIds: ["ld_workforce_reskilling", "im_skills_inference"],
    statement:
      "A skills taxonomy exists — even if partial — that maps roles to required skills.",
    whyItKills:
      "AI reskilling and skills inference require a skills ontology to match employees to learning pathways. " +
      "Without a taxonomy, the AI has no target state to map toward: it produces generic recommendations rather " +
      "than personalised pathways. The 100K-employee reskilling case studies all assume a pre-existing skills " +
      "framework. Building the taxonomy and deploying the AI simultaneously doubles the timeline and halves the " +
      "personalisation quality.",
    evidenceSignal:
      "Skills framework status in Section I is 'none' or 'informal'; data quality rating is low.",
    contextFields: ["sectionI.skillsFrameworkStatus", "sectionC.dataQualityRating"],
    severity: "fatal",
  },

  {
    id: "pc_upskilling_board_case_reskill_over_hire",
    domain: "learning_development",
    initiativeIds: ["ld_workforce_reskilling"],
    statement:
      "A board-approved business case exists for reskilling over external hiring as the primary response to skills gaps.",
    whyItKills:
      "Large-scale reskilling programmes require multi-year investment and sustained executive commitment across " +
      "budget cycles. Without a board-level decision that reskilling is preferred over hiring, the programme " +
      "stalls at the first budget review — because hiring is always faster and more measurable in the short term. " +
      "The initiative does not fail from poor execution; it fails from the organisation reverting to hiring when " +
      "the reskilling timeline extends past the first annual planning cycle.",
    evidenceSignal:
      "Ambition tier is 'exploratory' or 'cautious'; no transformation mandate in Section I business direction.",
    contextFields: ["sectionI.businessDirectionType", "sectionF.changeReadiness"],
    severity: "high",
  },

  // ── Talent Acquisition ───────────────────────────────────────────────────

  {
    id: "pc_interview_scheduling_ats_calendar",
    domain: "talent_acquisition",
    initiativeIds: ["ta_interview_scheduling"],
    statement:
      "ATS and calendar system (Outlook or Google) are integrated or can be integrated via API.",
    whyItKills:
      "Interview scheduling automation works by reading calendar availability and writing confirmed slots back " +
      "to the ATS. Without ATS-calendar integration, the tool becomes a manual coordination aid — the recruiter " +
      "still has to copy slots between systems. The 70–90% scheduling time reduction disappears; the actual saving " +
      "is closer to 10–15%, which does not justify the vendor cost or the change management effort.",
    evidenceSignal:
      "HR system integration maturity in Section C is 'separate systems' or 'minimal integration'.",
    contextFields: ["sectionC.hrSystemIntegrationMaturity", "sectionC.atsSystem"],
    severity: "fatal",
  },

  {
    id: "pc_sourcing_matching_historical_hire_data",
    domain: "talent_acquisition",
    initiativeIds: ["ta_sourcing_matching"],
    statement:
      "Minimum 18 months of structured hire data exists in the ATS (role, outcome, source channel).",
    whyItKills:
      "AI sourcing and matching learns from historical hire patterns to distinguish good-fit from poor-fit " +
      "candidates. Below 18 months of data, the model has insufficient signal — it produces plausible-looking " +
      "rankings that are statistically unreliable. The risk is not that the model fails visibly; it is that it " +
      "produces confident rankings that are no better than random, and recruiters trust them.",
    evidenceSignal:
      "ATS described as recently implemented or recently migrated; years of HRIS data is less than 2 years.",
    contextFields: ["sectionC.yearsOfHrisData", "sectionC.atsSystem"],
    severity: "fatal",
  },

  // ── Workforce Planning ───────────────────────────────────────────────────

  {
    id: "pc_org_design_exec_mandate",
    domain: "workforce_planning",
    initiativeIds: ["wp_org_design"],
    statement:
      "An executive mandate for org change is in place before the analysis begins.",
    whyItKills:
      "Org design AI produces structural recommendations — changes to spans of control, reporting lines, and " +
      "layer counts. Without executive mandate to act on them, the analysis becomes a report that sits on a shelf. " +
      "The initiative produces no value and consumes significant change management capacity. The failure mode is " +
      "not that the analysis is wrong; it is that the organisation uses it as a reason to discuss rather than " +
      "a mandate to act, and the recommendations are quietly shelved after the next leadership change.",
    evidenceSignal:
      "Business direction is 'stable' or 'growing' rather than 'transforming' or 'optimising'; no restructuring mandate mentioned.",
    contextFields: ["sectionI.businessDirectionType", "sectionF.changeReadiness"],
    severity: "fatal",
  },

  {
    id: "pc_org_design_hris_org_data",
    domain: "workforce_planning",
    initiativeIds: ["wp_org_design"],
    statement:
      "HRIS contains accurate and current org structure data: reporting lines, spans of control, and grade/level.",
    whyItKills:
      "Org design AI analyses spans of control and reporting structures to identify optimisation opportunities. " +
      "If the HRIS org data is stale, incomplete, or does not reflect the actual structure (common after " +
      "acquisitions, reorgs, or rapid growth), the AI optimises a fiction. Recommendations are based on a " +
      "structure that does not exist, and the implementation effort reveals the discrepancy — typically after " +
      "significant consulting spend.",
    evidenceSignal:
      "Data quality rating in Section C is low or medium; HRIS described as recently migrated or partially populated.",
    contextFields: ["sectionC.dataQualityRating", "sectionC.hrSystemIntegrationMaturity"],
    severity: "high",
  },

];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns all precondition entries that apply to a given initiative ID.
 * Returns an empty array (not null) when no entries exist — the caller
 * is responsible for treating an empty result as a coverage gap, not as
 * "no preconditions required."
 */
export function getPreconditionsForInitiative(initiativeId: string): PreconditionEntry[] {
  return PRECONDITION_LIBRARY.filter((p) => p.initiativeIds.includes(initiativeId));
}

/**
 * Returns all precondition entries for a given domain.
 */
export function getPreconditionsForDomain(domain: PreconditionDomain): PreconditionEntry[] {
  return PRECONDITION_LIBRARY.filter((p) => p.domain === domain);
}

/**
 * Returns true if the library has at least one entry for the given initiative ID.
 * Used by the decomposition engine to decide whether to emit a PRECONDITION_COVERAGE_GAP flag.
 */
export function hasPreconditionCoverage(initiativeId: string): boolean {
  return PRECONDITION_LIBRARY.some((p) => p.initiativeIds.includes(initiativeId));
}
