# AiQ Adaptive Assessment System: Credibility Review and C-Suite Justification Report

**Prepared for:** Senior Leadership / C-Suite  
**Date:** 24 April 2026  
**Classification:** Internal — Commercially Sensitive  
**Version:** 1.0

---

## Executive Summary

This report provides a rigorous, independent credibility review of the AiQ adaptive assessment engine — the system that measures HR professionals' capability to work effectively with AI tools. The review evaluates whether the assessment genuinely measures AI capability (as opposed to AI knowledge recall or general HR competence), identifies credibility strengths and vulnerabilities, benchmarks the methodology against recognised industry standards, and provides a prioritised roadmap for strengthening the evidence base over time.

**The headline finding is positive.** The AiQ assessment is built on a methodologically sound foundation — Situational Judgement Test (SJT) design — that is widely recognised in the psychometric literature as a valid approach to measuring applied professional capability. The system incorporates several features that go beyond typical SJT implementations, including real-time LLM-generated scenario personalisation, multi-signal adaptive targeting, anti-gaming countermeasures, and evidence sufficiency gates. These features position AiQ as a credible, defensible assessment instrument for enterprise deployment.

However, the assessment is currently in its **early operational phase**, and several areas require strengthening before the evidence base can be described as mature. The most significant gap is the absence of empirical norm data — all benchmarks are currently synthetic. This is a normal and expected state for a newly deployed assessment, but it must be addressed through systematic data collection as the user base grows.

This report is structured to give the C-suite what it needs: a clear understanding of what the assessment measures, why the methodology is credible, where the vulnerabilities lie, and what the plan is to address them.

---

## 1. What the Assessment Measures

### 1.1 The Construct: AI Capability for HR Professionals

AiQ does not measure AI knowledge. It does not test whether someone can define "machine learning" or list the features of ChatGPT. Instead, it measures **applied AI capability** — the ability to make sound professional decisions when AI tools are involved in HR workflows.

This distinction is critical. An HR professional might score highly on an AI knowledge quiz yet still blindly accept a biased AI screening recommendation, fail to escalate a data protection breach involving an AI tool, or over-rely on AI-generated analysis without checking its assumptions. AiQ is designed to detect exactly these behavioural patterns.

The assessment operationalises AI capability across six domains, each targeting a distinct facet of professional judgement in AI-augmented work:

| Domain | What It Measures | Example Behaviour |
|---|---|---|
| **Execution** | Ability to use AI outputs correctly — validate, refine, and apply them in context | Reviewing an AI-drafted document for accuracy before sending |
| **Judgement** | Quality of decision-making when AI provides recommendations or analysis | Questioning AI assumptions rather than deferring to the tool |
| **Governance** | Understanding of when and how AI use requires oversight, escalation, or approval | Recognising that an unapproved AI tool processing employee data is a breach |
| **Appropriateness** | Ability to assess whether AI is suitable for a given HR decision context | Identifying that AI accuracy claims do not address bias or explainability |
| **Workflow** | Competence in integrating AI into multi-step HR processes | Mapping which workflow steps are suitable for AI and which require human ownership |
| **Data Interpretation** | Ability to critically evaluate AI-generated data, statistics, and analysis | Spotting correlation-causation errors in AI workforce analytics |

These six domains are measured through **22 canonical signals** — specific behavioural indicators that map to capabilities. For example, the signal `blind_acceptance_risk` (negative) maps to the Governance domain, while `workflow_application_quality` (positive) maps to Workflow. Every answer a user gives generates signal deltas that feed into the scoring engine.

### 1.2 Alignment with Industry Standards

The AiQ capability model aligns with several recognised frameworks:

| Standard / Framework | Alignment with AiQ |
|---|---|
| **CIPD AI Skills Planning Guide** (April 2026) [1] | CIPD's five principles — Transparent Intent, Inclusive Opportunity, Human Accountability, Safety-First Learning, Evidence-Led Evolution — map directly to AiQ's governance, appropriateness, and judgement domains. CIPD emphasises practical AI skills for people professionals, not theoretical knowledge — precisely what AiQ measures. |
| **ISO/IEC 42001:2023** Clause 7.2 [2] | ISO 42001 requires organisations to "determine the necessary competence of persons doing work under its control that affects its AI performance" and "retain appropriate documented information as evidence of competence." AiQ provides exactly this: a structured, documented competence assessment with scored evidence. |
| **EU AI Act** Article 4 (effective Feb 2025) [3] | Article 4 requires providers and deployers of AI systems to "ensure, to their best extent, a sufficient level of AI literacy of their staff." AiQ provides the assessment mechanism organisations need to demonstrate compliance — measuring not just literacy but applied capability. |
| **Alan Turing Institute AI Skills for Business Framework** (DSIT-funded) [4] | The Turing framework defines four personas (AI Citizens, Workers, Professionals, Leaders) with competencies across knowledge, skills, and behaviours. AiQ's role archetype system and six capability domains provide a more granular, HR-specific operationalisation of this structure. |
| **SHRM State of AI in HR 2026** [5] | SHRM reports that only 27% of organisations use AI in recruiting and 21% in HR technology, with 39% reporting shifts in worker responsibilities. AiQ addresses the capability gap SHRM identifies — HR professionals need structured assessment of their readiness to work with these tools. |

---

## 2. How the Assessment Works

### 2.1 Methodology: Situational Judgement Testing (SJT)

AiQ uses a **Situational Judgement Test** design — a well-established psychometric methodology with over 30 years of research evidence. SJTs present realistic workplace scenarios and ask the respondent to evaluate or select from a set of response options, each representing a different level of professional capability.

A meta-analysis of SJT validity found a pooled criterion-related validity estimate of **0.32 (p < 0.0001)** [6], and SJTs have been shown to have **smaller racial group differences than cognitive ability tests** [7], making them both valid and fair assessment instruments.

What distinguishes AiQ from a standard SJT is the **dynamic generation** of assessment items. Rather than drawing from a fixed item bank, AiQ uses a large language model (LLM) to generate scenario-based questions in real time, personalised to the individual's role, sector, seniority, and AI experience level. This approach has several advantages:

**Advantages of LLM-generated SJT items:**

The dynamic generation approach means that no two assessments are identical, which significantly reduces the risk of item exposure and answer sharing — a common vulnerability in fixed-item assessments. Each scenario is grounded in the specific professional context of the person being assessed: an HR Business Partner in financial services receives scenarios about AI-assisted workforce planning in a regulated environment, while a Talent Acquisition lead in technology receives scenarios about AI screening tools in a high-volume hiring context. This contextual specificity increases both the face validity (it feels relevant) and the construct validity (it actually measures what the person does) of the assessment.

### 2.2 The Adaptive Engine

The assessment adapts in real time based on the individual's responses. It operates in three phases:

| Phase | Progress | Purpose |
|---|---|---|
| **Baseline** | 0–30% | Broad calibration across all six capability domains |
| **Adaptive** | 30–75% | Deep probing of identified weaknesses — targets the lowest-scoring capabilities |
| **Validation** | 75–100% | Confirms or challenges earlier responses with higher-difficulty items |

The adaptive engine uses several sophisticated mechanisms:

**Capability saturation guards** prevent over-testing of domains where sufficient evidence has already been collected (maximum 8 signals per capability). **Interaction type rotation** ensures the assessment uses at least 5 of the 11 available question formats (situational judgement, scenario critique, output improvement, error detection, prioritisation, risk judgement, data interpretation, governance decision, multi-step workflow, contradiction probe, and confidence calibration). **Difficulty escalation** increases item difficulty after three consecutive strong answers, while **capability over-probe guards** force rotation after three consecutive items targeting the same domain.

### 2.3 Anti-Gaming and Consistency Measures

The assessment includes two dedicated integrity mechanisms. **Anti-gaming injections** detect patterns such as social desirability bias (always choosing the "safest" option), speed-running (answering too quickly to have read the scenario), and response pattern anomalies. When gaming behaviour is detected, the engine injects specifically designed items to test whether the pattern is genuine or strategic.

**Contradiction probes** test consistency by presenting the same underlying capability challenge in a completely different surface context. If someone demonstrates strong governance judgement in a data protection scenario but weak governance judgement in an AI procurement scenario, the contradiction is flagged and factored into the confidence profile.

### 2.4 Scoring and Classification

Each response generates **signal deltas** — positive values indicate capability demonstrated, negative values indicate risk or weakness. These signals are aggregated per capability domain using a configurable formula (intercept = 50, multiplier = 50), producing scores on a 0–100 scale.

Individuals are classified into one of six readiness levels:

| Classification | Score Range | Interpretation |
|---|---|---|
| **Leading** | 80–100 | Exceptional AI capability; can lead and mentor others |
| **Advanced** | 70–79 | Strong capability; works effectively with AI across complex scenarios |
| **Proficient** | 60–69 | Competent; handles routine AI-augmented work well |
| **Developing** | 50–59 | Emerging capability; needs targeted development in specific areas |
| **Provisional** | 40–49 | Significant gaps; requires structured learning before independent AI use |
| **At Risk** | 0–39 | Critical gaps; may pose risk to the organisation if working unsupervised with AI |

Critically, the system includes **evidence sufficiency gates** — it will not classify an individual unless a minimum evidence threshold has been met: at least 20 items answered, at least 3 signals per capability domain, at least 5 distinct interaction types used, and at least 25% of items at high-risk level. If these thresholds are not met, the assessment reports insufficient evidence rather than an unreliable classification.

### 2.5 Quality Assurance

Every LLM-generated item passes through a multi-layer quality gate before being presented to the user:

**Structural validation** checks that each item has exactly 4 options, exactly 1 strong option, at least 1 failure option, a minimum scenario length, and at least 2 signal deltas per option. **Signal integrity checks** verify that strong options have net-positive deltas for the target capability and failure options have net-negative deltas — preventing the LLM from generating items where the "right" answer actually penalises the intended capability. **Anti-tell checks** ensure the strong option is not the shortest (a common test-taking tell) and that no two options have more than 85% word overlap. **Bias and safety checks** scan for PII, vendor names, discriminatory language, and trivially obvious failure phrases (such as "always trust the AI" or "skip validation").

If an item fails quality validation, the system retries up to 3 times with explicit feedback to the LLM about what failed. If all retries fail, a capability-specific fallback template is used — one of six pre-validated items, one per capability domain.

---

## 3. Credibility Strengths

This section documents the specific features that support the assessment's credibility. Each strength is framed in terms of the psychometric property it addresses.

### 3.1 Construct Validity: Measuring Behaviour, Not Knowledge

The single most important credibility claim is that AiQ measures **what people do with AI**, not what they know about AI. This is achieved through the SJT design: every item presents a realistic workplace scenario requiring a decision, not a factual recall question. The response options are graded by behavioural quality (strong, acceptable, weak, failure, critical failure), and the signal deltas map to specific capability dimensions.

This design directly addresses the construct validity question: "Does this assessment actually measure AI capability?" The answer is supported by the scenario-based methodology, the behavioural grading of responses, and the multi-signal measurement model that captures different facets of capability through different interaction types.

### 3.2 Content Validity: Role-Specific Personalisation

Content validity asks: "Does the assessment cover the right content for the intended population?" AiQ addresses this through its role archetype system, which defines capability weights, workflow contexts, and governance sensitivity levels for each HR role type. An HRBP receives different scenarios than a Talent Acquisition Specialist, reflecting the different AI capability demands of each role.

The system currently supports multiple role archetypes, each with hand-authored capability weights that determine how much each domain contributes to the overall readiness score. For example, a Governance-heavy role weights the governance domain more heavily than an execution-focused role.

### 3.3 Face Validity: Realistic, Contextualised Scenarios

Face validity — whether the assessment feels credible and relevant to the person taking it — is enhanced by the LLM personalisation. Scenarios reference the individual's sector, seniority level, and AI experience, making each item feel like a genuine workplace situation rather than a generic test question. This matters for both user engagement and organisational buy-in: if senior HR leaders take the assessment and find the scenarios unrealistic, credibility is immediately undermined.

### 3.4 Reliability Safeguards: Evidence Sufficiency and Confidence Profiling

While formal test-retest reliability data has not yet been collected (see Section 4), the assessment includes several mechanisms that protect against unreliable classification. The evidence sufficiency gates prevent classification on insufficient data. The confidence profiling system tracks how much evidence supports each capability score and flags low-confidence classifications. The provisional classification band (scores 40–50 with confidence below 0.50) explicitly acknowledges uncertainty rather than forcing a definitive label.

### 3.5 Fairness Safeguards: Anti-Gaming and Bias Detection

The anti-gaming engine and contradiction probes protect against strategic responding — a known threat to SJT validity. The LLM quality gate includes bias detection that scans generated items for discriminatory language and protected characteristic references. The SJT methodology itself has documented advantages for fairness: meta-analytic evidence shows smaller racial group differences than cognitive ability tests [7].

---

## 4. Credibility Risks and Mitigation Plan

This section identifies the known vulnerabilities in the current assessment system, rates each by severity, and provides a specific mitigation plan. These are presented transparently because credibility is built through honest disclosure, not through concealing limitations.

### 4.1 Risk Register

| # | Risk | Severity | Current State | Mitigation Plan | Timeline |
|---|---|---|---|---|---|
| R1 | **Synthetic norm data** — all benchmarks are generated from statistical models, not real HR professional data | **High** | `calibrationSource = 'synthetic_default'` | Collect real assessment data; replace synthetic norms once n ≥ 200 per role archetype | 6–12 months |
| R2 | **Hand-authored role archetype weights** — capability weights (e.g., governance = 0.25 for HRBP) are not empirically validated | **Medium** | Weights set by design team based on job analysis reasoning | Conduct structured expert panel review (Delphi method) with 10–12 HR leaders per archetype; publish validation report | 3–6 months |
| R3 | **No test-retest reliability data** — no evidence that the same person receives consistent scores across sessions | **Medium** | No data collected yet | Design and run a test-retest study (n ≥ 50, 2-week interval); target reliability coefficient ≥ 0.70 | 6–9 months |
| R4 | **No item analysis from real response data** — LLM-generated items have no discrimination indices or difficulty calibration from actual responses | **Medium** | Items validated structurally but not empirically | Implement item-level analytics pipeline; compute point-biserial correlations and difficulty indices from live data | 3–6 months |
| R5 | **Administrative readiness thresholds** — the intercept/multiplier formula and classification cutpoints are not anchored to criterion validity evidence | **Medium** | `intercept=50, multiplier=50` — configurable but not empirically calibrated | Phase 1: Conduct concurrent validity study correlating AiQ scores with supervisor ratings of AI capability. Phase 2: Adjust thresholds based on criterion data | 9–12 months |
| R6 | **No adverse impact analysis** — no evidence the assessment does not systematically disadvantage protected groups | **Medium** | No demographic data collected or analysed | Implement optional demographic data collection; conduct adverse impact analysis (4/5ths rule) once n ≥ 500 | 6–12 months |
| R7 | **LLM generation variability** — different users may receive items of different difficulty or quality despite identical parameters | **Low** | Quality gate catches structural issues; no item-level difficulty calibration | Track item-level statistics; implement difficulty anchoring using empirical response data | 6–12 months |

### 4.2 Detailed Analysis of Key Risks

**R1: Synthetic Norm Data** is the single most significant credibility vulnerability. When the assessment reports that someone is "above the role average" or "in the 75th percentile," those benchmarks are derived from a statistical model, not from actual HR professionals' performance. This is standard practice for a newly launched assessment — every psychometric instrument starts with theoretical or expert-derived norms before collecting empirical data — but it must be disclosed transparently and replaced as quickly as possible.

The mitigation path is straightforward: as more HR professionals complete the assessment, real response data accumulates. Once the sample reaches approximately 200 completions per role archetype, empirical norms can be computed and the `calibrationSource` flag updated from `synthetic_default` to `empirical_v1`. The system already supports this transition through its configurable scoring architecture.

**R2: Hand-Authored Role Archetype Weights** are defensible as an initial approach — they are based on structured reasoning about the capability demands of each role — but they lack the formal validation that a C-suite audience might expect. The recommended approach is a **Delphi panel study**: recruit 10–12 senior HR professionals per archetype, present them with the capability domains and ask them to independently weight their importance for the role, then iterate until consensus is reached. This is the standard method recommended in the SJT literature for establishing scoring keys [7].

**R3: Test-Retest Reliability** is important but not urgent. The assessment's adaptive nature means that two sessions will never present identical items, which is actually a strength (it prevents memorisation) but makes traditional test-retest harder to interpret. The appropriate approach is to measure the stability of capability classifications (not individual item scores) across sessions, using a 2-week interval to balance memory effects against genuine capability change.

**R6: Adverse Impact Analysis** is a regulatory and reputational risk rather than a methodological one. The SJT methodology has documented advantages for fairness [7], but this must be verified with AiQ-specific data. The recommended approach is to collect optional, anonymised demographic data and conduct standard adverse impact analysis (the 4/5ths rule) once the sample size is sufficient.

---

## 5. What You Can Say Confidently to the Board

### 5.1 Defensible Claims

The following statements are supported by the current evidence base and can be made confidently in a board or C-suite context:

> "AiQ uses a Situational Judgement Test methodology — a well-established psychometric approach with over 30 years of research evidence and a meta-analytic validity of 0.32. It measures how HR professionals actually make decisions when AI tools are involved, not what they know about AI theory."

> "The assessment is personalised to each individual's role, sector, seniority, and AI experience level, ensuring that scenarios are realistic and relevant to their actual work context."

> "Every assessment item passes through a multi-layer quality gate that checks structural validity, signal integrity, bias indicators, and anti-gaming patterns before being presented to the user."

> "The system includes evidence sufficiency gates that prevent classification on insufficient data — it will report 'insufficient evidence' rather than produce an unreliable result."

> "The assessment methodology aligns with the requirements of ISO/IEC 42001 Clause 7.2 (AI competence documentation), EU AI Act Article 4 (AI literacy), and the CIPD's AI Skills Planning framework."

### 5.2 Claims That Require Caveating

The following statements are partially supported but should be accompanied by appropriate caveats:

> "Benchmark comparisons (role averages, percentiles) are currently based on synthetic reference distributions. These will be replaced with empirical norms as the user base grows. We expect to have sufficient data for empirical norms within 6–12 months."

> "Role archetype capability weights are based on structured job analysis reasoning and will be formally validated through an expert panel (Delphi method) study within the next 3–6 months."

> "The assessment is designed to be fair and unbiased, using a methodology with documented advantages for group fairness. Formal adverse impact analysis will be conducted once the sample size is sufficient (target: n ≥ 500)."

### 5.3 Claims to Avoid

The following claims should **not** be made at this stage:

- "The assessment is fully validated" — it is methodologically sound but empirical validation is ongoing
- "Scores are accurate to within X points" — no standard error of measurement has been computed
- "The assessment predicts job performance" — no criterion validity study has been conducted yet
- "There is no bias in the assessment" — this has not been empirically tested

---

## 6. Credibility Roadmap

The following roadmap provides a phased plan for strengthening the assessment's evidence base. Each phase builds on the previous one, and the entire programme can be completed within 12 months.

### Phase 1: Foundation (Months 1–3)

| Action | Deliverable | Impact |
|---|---|---|
| Add transparent methodology disclosure page to the platform | Public-facing page explaining SJT approach, capability domains, and current limitations | Builds trust through transparency; pre-empts "what does this actually measure?" questions |
| Implement item-level analytics pipeline | Dashboard showing item difficulty, discrimination, and response distribution | Enables empirical item analysis; identifies poorly performing items |
| Conduct Delphi panel study for role archetype weights | Validation report with expert consensus weights for each archetype | Replaces "hand-authored" with "expert-validated" for the most visible credibility gap |
| Add confidence intervals to capability scores | Score reports show range (e.g., "62 ± 8") rather than point estimates | Communicates appropriate uncertainty; prevents over-interpretation of small score differences |

### Phase 2: Empirical Evidence (Months 3–9)

| Action | Deliverable | Impact |
|---|---|---|
| Accumulate real assessment data (target: n ≥ 200 per archetype) | Empirical norm tables replacing synthetic distributions | Eliminates the single biggest credibility vulnerability |
| Conduct test-retest reliability study (n ≥ 50, 2-week interval) | Reliability coefficient and classification stability report | Provides formal reliability evidence |
| Implement optional demographic data collection | Anonymised demographic fields (opt-in) | Enables adverse impact analysis |
| Compute item-level statistics from live data | Item difficulty indices, point-biserial correlations, DIF analysis | Identifies and removes poorly discriminating items |

### Phase 3: Validation (Months 9–12)

| Action | Deliverable | Impact |
|---|---|---|
| Conduct concurrent validity study | Correlation between AiQ scores and supervisor ratings of AI capability | Provides criterion validity evidence — the gold standard |
| Conduct adverse impact analysis (4/5ths rule) | Fairness report by gender, ethnicity, age group | Demonstrates regulatory compliance and fairness |
| Publish technical manual | Comprehensive psychometric documentation | Establishes AiQ as a professionally developed assessment instrument |
| Adjust classification thresholds based on criterion data | Empirically calibrated readiness levels | Ensures classifications are meaningful and actionable |

---

## 7. Competitive Positioning

AiQ's assessment methodology is significantly more sophisticated than the alternatives currently available in the market. Most AI capability assessments for HR professionals fall into one of two categories: **knowledge quizzes** (multiple-choice questions about AI concepts) or **self-assessment surveys** (Likert-scale ratings of perceived AI competence). Neither approach measures actual behavioural capability.

| Feature | AiQ | Typical Knowledge Quiz | Self-Assessment Survey |
|---|---|---|---|
| Measures behaviour, not knowledge | Yes — SJT design | No — tests factual recall | No — measures self-perception |
| Role-specific personalisation | Yes — archetype-based | Rarely | Sometimes |
| Adaptive difficulty | Yes — real-time adaptation | No — fixed items | No — fixed items |
| Anti-gaming protection | Yes — injection + contradiction probes | Minimal | None |
| Evidence sufficiency gates | Yes — minimum thresholds | No | No |
| LLM-generated items | Yes — unique per session | No — fixed bank | N/A |
| Regulatory alignment (ISO 42001, EU AI Act) | Strong | Weak | Weak |

---

## 8. Conclusion

The AiQ adaptive assessment system is built on a methodologically sound foundation with several features that exceed standard practice. The SJT methodology, LLM-driven personalisation, adaptive targeting, anti-gaming countermeasures, and evidence sufficiency gates collectively create an assessment instrument that is credible, defensible, and aligned with recognised industry standards.

The assessment is in its early operational phase, and the evidence base will strengthen significantly over the next 12 months as empirical data is collected. The key vulnerabilities — synthetic norms, hand-authored weights, and the absence of formal reliability and validity studies — are normal for a newly deployed assessment and are addressed by a clear, time-bound remediation roadmap.

The C-suite can confidently position AiQ as a **methodologically rigorous, industry-aligned assessment of HR professionals' AI capability** — with the honest caveat that empirical validation is ongoing and will be completed within 12 months.

---

## References

[1]: https://www.cipd.org/en/knowledge/guides/ai-skills-planning/ "CIPD. AI Skills Planning: Practical Guidance for People Professionals. April 2026."
[2]: https://www.iso.org/standard/42001 "ISO/IEC 42001:2023. Information Technology — Artificial Intelligence — Management System."
[3]: https://artificialintelligenceact.eu/article/4/ "European Parliament. EU AI Act, Article 4: AI Literacy. Regulation (EU) 2024/1689."
[4]: https://www.turing.ac.uk/skills/collaborate/ai-skills-business-framework "The Alan Turing Institute. AI Skills for Business Competency Framework. DSIT/Innovate UK BridgeAI."
[5]: https://www.shrm.org/topics-tools/research/state-of-ai-hr-2026/full-report "SHRM. The State of AI in HR 2026 Report."
[6]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9879421/ "Hejri, S.M. et al. Validity of Constructed-Response Situational Judgment Tests. BMC Medical Education, 2023."
[7]: https://www.humrro.org/corpsite/blog/evidence-and-experience-based-best-practices-situational-judgment-tests/ "Whetzel, D.L., Sullivan, T.S., & McCloy, R.A. Situational Judgment Tests: An Overview of Development Practices and Psychometric Characteristics. Personnel Assessment and Decisions, 2019."
