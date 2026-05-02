# AiQ Company HR AI Strategy Assessment — Methodology Specification v1.0

## 1. Purpose and Scope

This document defines the methodology for the **AiQ Company HR AI Strategy Assessment** — an organisational-level diagnostic designed for Chief People Officers, HR Directors, and senior HR leaders. It measures the readiness of an organisation's HR function to design, deploy, and govern AI across its people practices, and produces a prioritised AI strategy with a capability gap analysis.

The assessment is distinct from the individual AiQ assessment, which measures a practitioner's personal AI capability. This tool measures the **organisation as the unit of analysis**: its strategy, governance, data infrastructure, HR technology estate, workforce capability, and culture.

---

## 2. Theoretical Foundations

The methodology draws on six primary frameworks, synthesised into a single coherent model:

### 2.1 MIT CISR Enterprise AI Maturity Model (Weill, Woerner & Sebastian, 2025)
Four cumulative stages: **Experiment & Prepare → Build Pilots & Capabilities → Industrialise → AI Future-Ready**. Key insight: financial outperformance only begins at Stage 3. The model emphasises that AI maturity is not a technology question — it is an organisational capability question requiring simultaneous investment in people, process, data, and culture.

### 2.2 Deloitte AI Adoption Maturity Framework (2025 Tech Value Survey)
Four levels: **Basic Automation → Agent-Based Processes → Process Reimagination → Organisational Redesign**. Deloitte's "Transformers vs Automators" finding: organisations that invest across the full technology estate (not just AI in isolation) and measure growth KPIs (not just efficiency) achieve materially higher ROI. Critical for HR: AI value in people functions compounds when HR data quality, HRIS integration, and analytics capability scale together.

### 2.3 AIHR HR AI Readiness Radar (van der Merwe & Veldsman, 2024)
Five dimensions specific to the HR function: **Strategy, Governance, Technology, People (mindset & adoption), Skills**. Scoring 1–5 per dimension. Key finding: governance is the most uneven dimension across organisations; skills gaps are the most universal. HR teams that articulate *why* they are adopting AI (not just *what* tools) achieve significantly higher adoption rates.

### 2.4 CIPD AI Governance Framework for People Professionals (2026)
Five governance steps: **Build AI governance knowledge → Accountability for employee data → Define responsible AI principles → Audit AI governance and people risks → Embed people-centred AI culture**. CIPD's position: HR's remit covers *any* AI deployment that impacts people — not just AI in HR systems. This expands the governance scope beyond HRIS to include AI in performance management, hiring, pay decisions, and workforce planning.

### 2.5 Agility at Scale Eight-Pillar AI Readiness Framework (2026)
Eight pillars: **Strategy, Data, Technology, People, Culture, Processes, Governance, Partnerships**. Relevant extension beyond AIHR's five dimensions: the explicit inclusion of **Partnerships** (vendor relationships, ecosystem readiness) and **Processes** (workflow redesign capability) as distinct dimensions.

### 2.6 HR AI Maturity Model (HR-AIMM, 2024)
Specifically designed for HR functions. Four levels: **Awareness → Experimentation → Integration → Transformation**. Twelve sub-stages. Covers AI in: recruitment, onboarding, L&D, performance, reward, workforce planning, and HR operations. Provides the most granular HR-specific question bank of any published framework.

---

## 3. Assessment Architecture

### 3.1 The Seven Dimensions of HR AI Readiness

The AiQ Company Assessment measures seven dimensions, each scored 1–5:

| # | Dimension | What it measures |
|---|---|---|
| 1 | **AI Strategy & Vision** | Clarity of HR's AI ambition, alignment to business strategy, defined use-case roadmap |
| 2 | **Governance & Ethics** | AI policy maturity, risk identification, regulatory compliance (EU AI Act, GDPR), accountability structures |
| 3 | **Data & Analytics Foundations** | HR data quality, data governance, analytics capability, readiness for AI-driven insight |
| 4 | **HR Technology Estate** | HRIS/HCM maturity, integration capability, AI-native tooling, vendor landscape |
| 5 | **Workforce AI Capability** | Employee AI literacy, role-specific AI skills, learning infrastructure, change readiness |
| 6 | **HR Function Capability** | HR team's own AI skills, HR operating model readiness, HR business partner capability |
| 7 | **Culture & Leadership** | Leadership AI advocacy, psychological safety to experiment, innovation culture, change appetite |

### 3.2 Scoring Model

Each dimension is scored on a 1.0–5.0 scale using a weighted composite of question responses:

| Score | Label | Description |
|---|---|---|
| 1.0–1.9 | **Unaware** | No formal activity; ad hoc or absent |
| 2.0–2.9 | **Exploring** | Early experiments; no systematic approach |
| 3.0–3.9 | **Building** | Structured pilots; governance emerging |
| 4.0–4.9 | **Scaling** | Embedded practices; measurable outcomes |
| 5.0 | **Leading** | Industry-leading; AI is a strategic differentiator |

### 3.3 Composite Score and Maturity Stage

The **Overall HR AI Readiness Score** is a weighted composite:

| Dimension | Weight | Rationale |
|---|---|---|
| AI Strategy & Vision | 20% | Directional clarity is the primary predictor of successful AI adoption (AIHR, 2024) |
| Governance & Ethics | 18% | Regulatory risk is the primary inhibitor of scaling (CIPD, 2026) |
| Data & Analytics | 16% | Data quality is the primary technical constraint (Deloitte, 2025) |
| HR Technology Estate | 14% | Infrastructure enables or limits all other dimensions |
| Workforce AI Capability | 14% | Adoption rate is determined by workforce readiness |
| HR Function Capability | 10% | HR's own capability determines the quality of AI strategy |
| Culture & Leadership | 8% | Culture is an amplifier, not a foundation |

The composite score maps to the MIT CISR four-stage model:

| Score | MIT CISR Stage | AiQ Label |
|---|---|---|
| 1.0–2.0 | Stage 1: Experiment & Prepare | **AI Aware** |
| 2.1–3.0 | Stage 2: Build Pilots & Capabilities | **AI Experimenting** |
| 3.1–4.0 | Stage 3: Industrialise | **AI Scaling** |
| 4.1–5.0 | Stage 4: AI Future-Ready | **AI Leading** |

---

## 4. Adaptive Assessment Engine

### 4.1 Question Bank Structure

The assessment contains **52 questions** across 7 dimensions (6–9 questions per dimension). Questions are presented as scenario-based multiple choice with confidence weighting, mirroring the individual AiQ assessment methodology.

Each question has:
- A **scenario stem** (a realistic HR situation)
- **Four response options** (A–D, representing Unaware → Leading maturity levels)
- A **confidence selector** (Guessing / Fairly sure / Certain)
- An optional **evidence field** ("What evidence supports your answer?")

### 4.2 Adaptive Branching Logic

The assessment uses **dimension-level branching**:
1. Each dimension begins with a **calibration question** (mid-difficulty)
2. If the response indicates high maturity (D), the next question in that dimension is harder (probing edge cases)
3. If the response indicates low maturity (A/B), the next question is easier (confirming baseline)
4. After 3 questions per dimension, the engine has sufficient signal to score the dimension and may skip remaining questions if confidence is high

This reduces average completion time from 52 questions to approximately **28–35 questions** while maintaining scoring accuracy.

### 4.3 Sector and Size Calibration

Responses are calibrated against sector and organisation size benchmarks. A score of 3.2 in Financial Services (where AI adoption is advanced) represents a different competitive position than 3.2 in the Public Sector. The results page shows both the **absolute score** and the **sector-adjusted percentile**.

---

## 5. Question Bank (Full)

### Dimension 1: AI Strategy & Vision (8 questions)

**Q1.1 — Strategy Articulation (Calibration)**
*Your HR leadership team is preparing the annual people strategy. Which best describes your organisation's current approach to AI in that strategy?*
- A: AI is not mentioned in the HR strategy; it may come up informally
- B: AI is acknowledged as a future consideration but has no defined objectives or timelines
- C: AI is included with specific use cases, success metrics, and a 12-month roadmap
- D: AI is a named strategic pillar with multi-year investment commitments, board-level KPIs, and a dedicated HR AI programme lead

**Q1.2 — Use Case Prioritisation**
*The CHRO asks you to identify the top three AI use cases for HR this year. What does your current prioritisation process look like?*
- A: We have not formally identified AI use cases for HR
- B: We have a list of potential use cases but no formal prioritisation criteria
- C: We use a defined framework (e.g., value vs. feasibility matrix) to prioritise use cases against HR and business outcomes
- D: We have a live use case portfolio with business cases, ROI tracking, and a governance gate for new additions

**Q1.3 — Business Alignment**
*The CEO asks HR to demonstrate how its AI investments connect to the organisation's three-year business strategy. How would you respond?*
- A: We would struggle to make that connection clearly
- B: We could describe the general direction but lack specific metrics or evidence
- C: We have documented alignment between HR AI initiatives and at least two strategic business objectives, with defined outcome measures
- D: We have a formal HR AI investment thesis reviewed quarterly by the ExCo, with real-time dashboards showing contribution to business outcomes

**Q1.4 — Stakeholder Alignment**
*Which statement best describes how HR, IT, Legal, and Finance collaborate on AI decisions in your organisation?*
- A: Each function makes AI decisions independently; there is no cross-functional coordination
- B: We have informal conversations but no structured process
- C: We have a cross-functional AI steering group that meets regularly and has agreed decision rights
- D: We have a formal AI Centre of Excellence with HR as a core member, agreed RACI, and a shared AI investment committee

**Q1.5 — Measurement**
*How does your organisation currently measure the value delivered by HR AI initiatives?*
- A: We do not measure AI value in HR
- B: We track activity metrics (e.g., number of tools deployed, users trained) but not outcomes
- C: We track outcome metrics (e.g., time-to-hire reduction, engagement score improvement) for at least two AI initiatives
- D: We use a comprehensive value framework covering efficiency, quality, employee experience, and strategic impact, reviewed at board level

**Q1.6 — Horizon Planning**
*How does your HR AI strategy account for emerging AI capabilities (e.g., agentic AI, multimodal models)?*
- A: We are not monitoring emerging AI capabilities
- B: We follow industry news but have no formal horizon scanning process
- C: We have a quarterly technology watch process and have assessed at least two emerging capabilities for HR relevance
- D: We have a dedicated AI horizon scanning function, run scenario planning exercises, and have a formal process for fast-tracking high-potential emerging capabilities

**Q1.7 — Investment**
*What is the status of dedicated budget for HR AI initiatives in your organisation?*
- A: There is no dedicated budget; AI tools are funded ad hoc from existing HR budgets
- B: We have informal budget allocation but it is not ring-fenced or multi-year
- C: We have a defined annual budget for HR AI with a clear allocation process
- D: We have a multi-year HR AI investment programme with capital and operating expenditure tracked separately and reported to the board

**Q1.8 — Competitive Benchmarking**
*How does your organisation understand its HR AI maturity relative to peers?*
- A: We do not benchmark our HR AI maturity
- B: We have an informal sense of where we stand based on industry conversations
- C: We have participated in at least one formal benchmarking exercise in the past 12 months
- D: We conduct regular benchmarking against sector peers and use the results to adjust our HR AI strategy

---

### Dimension 2: Governance & Ethics (8 questions)

**Q2.1 — Policy Existence (Calibration)**
*An HR manager wants to use an AI tool to screen CVs. What governance process would they follow?*
- A: There is no formal process; they would use their own judgement
- B: They would check with IT or Legal informally, but there is no documented process
- C: They would follow a documented AI use policy that covers data privacy, bias risk, and approval requirements
- D: They would complete a mandatory AI impact assessment, get sign-off from an AI ethics board, and the tool would be added to a live AI inventory

**Q2.2 — EU AI Act Awareness**
*The EU AI Act classifies certain HR AI applications as high-risk. Which statement best describes your organisation's response?*
- A: We are not aware of the EU AI Act's implications for HR
- B: We are aware of the Act but have not assessed which of our HR AI tools are affected
- C: We have completed an audit of our HR AI tools against the EU AI Act high-risk categories and have a remediation plan
- D: We have a fully compliant AI governance programme, including conformity assessments for high-risk applications, human oversight protocols, and documented audit trails

**Q2.3 — Bias and Fairness**
*Your organisation is considering an AI tool for internal mobility recommendations. How would you assess and manage bias risk?*
- A: We would not conduct a formal bias assessment
- B: We would rely on the vendor's assurances about fairness
- C: We would conduct our own bias testing using representative data samples and define acceptable fairness thresholds before deployment
- D: We have a standard bias assessment protocol, an ongoing monitoring process post-deployment, and a defined escalation path if bias is detected

**Q2.4 — Employee Transparency**
*Employees ask how AI is being used in decisions about their pay, performance, and career development. What can you tell them?*
- A: We do not have a formal position on this
- B: We can provide a general statement but lack specifics about individual AI decisions
- C: We have a published AI transparency statement that explains which HR decisions involve AI, what data is used, and how employees can request a human review
- D: We provide employees with individualised AI decision logs, a formal right to explanation, and a clear appeals process for any AI-influenced HR decision

**Q2.5 — Data Privacy**
*An AI vendor proposes using employee performance data to train a new predictive model. What is your response?*
- A: We would likely agree without a formal review process
- B: We would check with Legal but have no standard framework for this type of request
- C: We have a data processing agreement template and a defined review process for AI training data requests
- D: We have a comprehensive AI data governance framework covering consent, purpose limitation, data minimisation, and cross-border transfer restrictions, reviewed by our DPO

**Q2.6 — Accountability**
*Who in your organisation is accountable for the ethical use of AI in HR?*
- A: No one has formal accountability
- B: Accountability is shared informally between HR and IT
- C: A named senior leader (e.g., CHRO or CPO) has formal accountability for HR AI ethics, documented in their role profile
- D: We have a dedicated AI ethics function with a named Chief AI Ethics Officer or equivalent, supported by an AI ethics board with external representation

**Q2.7 — Incident Response**
*An AI tool used in your hiring process produces a discriminatory outcome. What happens next?*
- A: We have no formal incident response process for AI failures
- B: We would escalate to Legal and HR leadership but have no documented process
- C: We have a documented AI incident response plan covering investigation, remediation, affected employee notification, and regulatory reporting
- D: We have a tested AI incident response plan, a dedicated response team, and a post-incident review process that feeds back into our governance framework

**Q2.8 — Governance Maturity**
*How frequently does your organisation review and update its AI governance framework?*
- A: We do not have a formal AI governance framework
- B: We have some governance documents but they are not reviewed regularly
- C: We review our AI governance framework at least annually and update it in response to regulatory changes
- D: We review our AI governance framework quarterly, conduct external audits annually, and publish a transparency report

---

### Dimension 3: Data & Analytics Foundations (7 questions)

**Q3.1 — Data Quality (Calibration)**
*Your CHRO wants to use AI to predict which employees are at risk of leaving in the next six months. What is the current state of your HR data?*
- A: Our HR data is fragmented across multiple systems with significant quality issues
- B: Our core HR data is reasonably clean but lacks the breadth needed for predictive analytics
- C: We have a unified HR data model with documented quality standards and at least 80% data completeness across key fields
- D: We have a certified HR data platform with real-time quality monitoring, automated cleansing, and a data stewardship programme

**Q3.2 — Analytics Capability**
*Which best describes your HR analytics capability today?*
- A: We produce basic HR reports (headcount, turnover) on request
- B: We have a dedicated HR analytics function producing regular dashboards
- C: We use predictive analytics for at least two HR decisions (e.g., attrition risk, hiring success prediction)
- D: We have an AI-driven people analytics platform that informs real-time HR decisions across the employee lifecycle

**Q3.3 — Data Governance**
*How does your organisation govern access to employee data used in AI models?*
- A: There are no formal data access controls for HR data
- B: Access is controlled by IT but HR has limited visibility of who can access what
- C: We have a documented HR data access policy with role-based permissions, reviewed annually
- D: We have a zero-trust data architecture for HR data, with automated access reviews, full audit trails, and employee data rights management

**Q3.4 — Integration**
*How well integrated are your core HR systems (HRIS, ATS, LMS, performance, payroll)?*
- A: Our systems are largely siloed with manual data transfers between them
- B: Some systems are integrated but significant manual effort is still required
- C: Our core HR systems share data via APIs with minimal manual intervention
- D: We have a unified HR data platform that aggregates data from all people systems in real time, with a single source of truth for all employee data

**Q3.5 — External Data**
*Does your organisation use external data sources (e.g., labour market data, skills taxonomies, salary benchmarks) in HR AI models?*
- A: No, we rely only on internal data
- B: We use some external data informally but it is not integrated into our systems
- C: We have at least two external data feeds integrated into our HR analytics platform
- D: We have a comprehensive external data strategy covering labour market intelligence, skills ontologies, competitor benchmarks, and macroeconomic indicators

**Q3.6 — Skills Data**
*How does your organisation capture and maintain a skills inventory for its workforce?*
- A: We do not have a skills inventory
- B: We have a skills inventory in our HRIS but it is largely self-reported and not regularly updated
- C: We have a validated skills taxonomy with at least 70% employee coverage, updated at least annually
- D: We have an AI-inferred skills graph that continuously updates based on work activity, learning completions, and performance data

**Q3.7 — AI Readiness of Data**
*If you were to deploy a new AI model for workforce planning today, how ready is your data?*
- A: Our data is not ready; significant remediation would be needed
- B: Our data has significant gaps but could be used for basic models with caveats
- C: Our data is largely ready for AI use with documented limitations and a remediation roadmap
- D: Our data is AI-ready: clean, labelled, governed, and continuously maintained

---

### Dimension 4: HR Technology Estate (7 questions)

**Q4.1 — HRIS Maturity (Calibration)**
*Which best describes your core HRIS/HCM platform?*
- A: We use a legacy on-premise system with limited analytics capability
- B: We have a cloud-based HRIS but it is not fully configured and has limited AI features
- C: We have a modern cloud HCM (e.g., Workday, SAP SuccessFactors, Oracle HCM) with AI features enabled
- D: We have a best-in-class HCM platform with AI features fully configured, integrated with our analytics platform, and continuously updated

**Q4.2 — AI Tool Inventory**
*How many AI-powered HR tools does your organisation currently use, and how are they managed?*
- A: We are not sure; tools are adopted informally by different HR teams
- B: We have a partial inventory but no formal management process
- C: We have a complete AI tool inventory with documented owners, data flows, and review dates
- D: We have a live AI tool registry integrated with our governance framework, with automated compliance checks and vendor performance tracking

**Q4.3 — Talent Acquisition Technology**
*Which best describes your AI capability in talent acquisition?*
- A: We use no AI in our hiring process
- B: We use AI for one aspect of hiring (e.g., CV screening or interview scheduling)
- C: We use AI across multiple hiring stages (sourcing, screening, assessment, scheduling) with defined human oversight points
- D: We have an AI-driven talent acquisition platform that learns from hiring outcomes, reduces bias, and provides real-time pipeline analytics

**Q4.4 — Learning Technology**
*Which best describes your AI capability in learning and development?*
- A: We have no AI in our L&D technology
- B: We use AI for basic content recommendations in our LMS
- C: We have an AI-powered learning platform that personalises learning pathways based on role, skills gaps, and career goals
- D: We have an adaptive learning ecosystem that integrates skills data, performance data, and career aspiration data to deliver hyper-personalised development at scale

**Q4.5 — Performance Technology**
*Which best describes your AI capability in performance management?*
- A: We have no AI in our performance management process
- B: We use AI for basic analytics (e.g., calibration support, bias flagging in ratings)
- C: We use AI to support continuous performance conversations, goal alignment, and development planning
- D: We have an AI-driven performance ecosystem that provides real-time coaching nudges, predictive performance insights, and automated succession planning

**Q4.6 — Build vs. Buy Strategy**
*How does your organisation make decisions about building vs. buying AI capabilities for HR?*
- A: We buy whatever vendors offer without a formal evaluation process
- B: We have informal criteria but no documented build vs. buy framework
- C: We have a documented build vs. buy framework with defined criteria for when to build proprietary capability
- D: We have a formal AI capability strategy that distinguishes between commodity AI (buy), configured AI (adapt), and proprietary AI (build), with investment allocated accordingly

**Q4.7 — Vendor Management**
*How does your organisation manage AI vendor relationships in HR?*
- A: Vendor management is reactive; we respond to vendor communications as they arise
- B: We have account managers for our major vendors but no formal AI-specific review process
- C: We conduct annual AI capability reviews with our major HR technology vendors
- D: We have a formal AI vendor governance programme with quarterly capability reviews, contractual AI ethics requirements, and a vendor scorecard

---

### Dimension 5: Workforce AI Capability (8 questions)

**Q5.1 — AI Literacy Baseline (Calibration)**
*What proportion of your workforce can confidently explain what AI is and how it is being used in their role?*
- A: Less than 20% — AI literacy is very low across the organisation
- B: 20–40% — some awareness but significant gaps remain
- C: 40–70% — majority of employees have basic AI literacy
- D: Over 70% — AI literacy is embedded as a core competency with regular assessment

**Q5.2 — Role-Specific AI Skills**
*How does your organisation identify and develop the AI skills needed for specific roles?*
- A: We have not mapped AI skills requirements to specific roles
- B: We have a general AI skills framework but it is not role-specific
- C: We have role-specific AI skills profiles for at least 50% of roles, with development pathways
- D: We have AI skills profiles for all roles, integrated into job architecture, performance frameworks, and learning pathways

**Q5.3 — Learning Infrastructure**
*What learning infrastructure exists to build AI capability across the workforce?*
- A: We rely on employees to find their own AI learning resources
- B: We have curated some AI learning content but it is not structured or tracked
- C: We have a structured AI learning programme with defined pathways, completion tracking, and manager support
- D: We have an enterprise AI capability programme with role-based pathways, cohort learning, external certification, and a skills measurement framework

**Q5.4 — Change Readiness**
*How would you describe your workforce's readiness to adopt AI in their day-to-day work?*
- A: There is significant resistance or anxiety about AI across the workforce
- B: Attitudes are mixed; some enthusiasm but also significant concern
- C: The majority of employees are open to AI adoption with appropriate support and communication
- D: AI adoption is actively championed by employees; there is a culture of experimentation and continuous improvement

**Q5.5 — Manager Capability**
*How capable are your line managers at supporting their teams through AI-driven change?*
- A: Managers have received no specific support for leading AI-driven change
- B: Some managers have attended AI awareness sessions but there is no systematic capability building
- C: We have a manager AI capability programme covering AI literacy, change leadership, and team coaching
- D: Managers are assessed on their AI leadership capability, with coaching support and peer learning communities

**Q5.6 — Reskilling at Scale**
*How does your organisation approach reskilling for roles significantly impacted by AI?*
- A: We have not identified which roles are most impacted by AI
- B: We have identified high-impact roles but have no formal reskilling programme
- C: We have a reskilling programme for the top 20% of AI-impacted roles with defined transition pathways
- D: We have a comprehensive workforce transformation programme covering all AI-impacted roles, with individual transition plans, redeployment support, and outcome tracking

**Q5.7 — AI Ethics Literacy**
*How well do employees understand the ethical implications of AI in their work?*
- A: AI ethics is not covered in any employee training
- B: AI ethics is mentioned in general AI awareness content but not role-specific
- C: All employees complete a mandatory AI ethics module covering bias, privacy, and responsible use
- D: AI ethics is embedded in onboarding, role-specific training, and performance expectations, with regular scenario-based refreshers

**Q5.8 — Measurement**
*How does your organisation measure workforce AI capability over time?*
- A: We do not measure workforce AI capability
- B: We track training completion but not actual capability development
- C: We assess AI capability at least annually using a validated assessment tool
- D: We continuously measure AI capability using validated assessments, skills inference, and performance data, with results feeding into workforce planning

---

### Dimension 6: HR Function Capability (6 questions)

**Q6.1 — HR Team AI Skills (Calibration)**
*How would you describe the AI capability of your HR team (not the broader workforce)?*
- A: Most HR professionals in our team have limited AI knowledge and skills
- B: Some HR professionals are AI-literate but the majority are not
- C: The majority of our HR team has sufficient AI literacy to use AI tools confidently in their work
- D: Our HR team includes AI specialists (e.g., people analytics leads, AI implementation managers) alongside a broadly AI-literate generalist population

**Q6.2 — HR Operating Model**
*How has your HR operating model evolved to support AI-driven HR delivery?*
- A: Our HR operating model has not changed in response to AI
- B: We have made some adjustments (e.g., added analytics roles) but the model is largely unchanged
- C: We have redesigned at least two HR processes to integrate AI, with updated role profiles and ways of working
- D: We have a fundamentally redesigned HR operating model built around AI-augmented delivery, with new roles (e.g., AI product owners, people data scientists) and AI-native processes

**Q6.3 — HRBP Capability**
*How capable are your HR Business Partners at using AI insights to advise business leaders?*
- A: HRBPs do not use AI insights in their business partnering conversations
- B: Some HRBPs use analytics dashboards but they are not confident interpreting AI-generated insights
- C: HRBPs are trained to interpret and apply AI insights, and use them regularly in business conversations
- D: HRBPs are AI-fluent advisors who proactively bring AI-generated workforce insights to business leaders and can challenge AI outputs when needed

**Q6.4 — HR AI Strategy Ownership**
*Who owns the HR AI strategy in your organisation?*
- A: No one owns it; AI in HR happens organically
- B: Ownership is unclear or shared informally
- C: A named senior HR leader owns the HR AI strategy with defined accountability
- D: A dedicated HR AI Director or equivalent owns the strategy, with a cross-functional team and board-level reporting

**Q6.5 — External Expertise**
*How does your HR function access external AI expertise?*
- A: We rely entirely on internal knowledge
- B: We use vendor training and occasional consultancy on an ad hoc basis
- C: We have at least one formal external partnership (e.g., academic institution, specialist consultancy) for HR AI capability
- D: We have a strategic advisory board with external AI and HR expertise, and active research partnerships

**Q6.6 — Continuous Learning**
*How does your HR team stay current with AI developments relevant to HR?*
- A: Team members follow AI news individually but there is no structured approach
- B: We have occasional team sessions on AI developments
- C: We have a structured quarterly AI learning programme for the HR team
- D: We have a continuous learning ecosystem for the HR team including curated content, external speakers, peer benchmarking, and an annual HR AI conference

---

### Dimension 7: Culture & Leadership (8 questions)

**Q7.1 — Leadership Advocacy (Calibration)**
*How actively do your senior leaders (CEO, ExCo) advocate for AI adoption across the organisation?*
- A: Senior leaders rarely mention AI; it is not a visible priority
- B: AI is mentioned occasionally in leadership communications but is not a consistent theme
- C: Senior leaders regularly communicate about AI, share examples of AI use, and visibly champion AI adoption
- D: AI is a defining element of the organisation's leadership narrative, with the CEO personally sponsoring the AI transformation programme

**Q7.2 — Psychological Safety**
*How safe do employees feel to experiment with AI, make mistakes, and share what they learn?*
- A: There is a culture of caution; employees are reluctant to experiment with AI for fear of making mistakes
- B: Some teams experiment with AI but there is no organisational encouragement
- C: Experimentation with AI is actively encouraged, with safe-to-fail pilots and shared learning
- D: We have a formal AI experimentation programme with dedicated time, resources, and a culture where failure is celebrated as learning

**Q7.3 — Innovation Culture**
*How does your organisation approach innovation in HR processes and practices?*
- A: HR processes are stable and change slowly; innovation is not a priority
- B: We make incremental improvements but rarely undertake significant process innovation
- C: We run regular innovation sprints and have a pipeline of HR process improvement ideas
- D: We have a continuous innovation capability in HR, with dedicated innovation time, external inspiration, and a fast-track process for scaling successful experiments

**Q7.4 — Change Appetite**
*How would you describe your organisation's appetite for AI-driven change in HR?*
- A: Change appetite is low; there is significant resistance to AI-driven change
- B: Change appetite is moderate; there is openness to change but also significant caution
- C: Change appetite is high; the organisation is actively seeking AI-driven transformation
- D: Change appetite is very high; AI-driven transformation is seen as a competitive necessity and is actively accelerated

**Q7.5 — Trust in AI**
*How much do employees and managers trust AI-generated insights and recommendations in HR?*
- A: Trust is very low; AI outputs are frequently questioned or ignored
- B: Trust is moderate; AI outputs are used selectively with significant human override
- C: Trust is high for specific use cases where AI has demonstrated accuracy and fairness
- D: Trust is calibrated and evidence-based; employees understand AI limitations and use outputs appropriately

**Q7.6 — Diversity & Inclusion in AI**
*How does your organisation ensure AI in HR does not exacerbate existing inequalities?*
- A: We have not considered the D&I implications of AI in HR
- B: We are aware of the risk but have no formal process to address it
- C: We conduct D&I impact assessments for all AI tools used in HR decisions
- D: D&I is embedded in every stage of our AI lifecycle — from use case selection to model design, testing, deployment, and monitoring

**Q7.7 — Employee Voice**
*How are employees involved in decisions about AI use in HR?*
- A: Employees are not consulted about AI use in HR
- B: We communicate AI decisions to employees but do not seek their input
- C: We consult employee representatives (e.g., works councils, employee forums) before deploying AI in HR
- D: Employees are active co-designers of HR AI initiatives, with formal participation in design sprints and governance processes

**Q7.8 — Board Engagement**
*How engaged is your board in HR AI governance and strategy?*
- A: The board has not discussed HR AI
- B: HR AI has been mentioned at board level but is not a regular agenda item
- C: HR AI is a regular board agenda item with defined reporting metrics
- D: The board has a dedicated AI sub-committee, receives quarterly HR AI reports, and has approved a multi-year HR AI investment strategy

---

## 6. Scoring and Results

### 6.1 Dimension Score Calculation

Each response option maps to a maturity score:
- A = 1.0 (Unaware)
- B = 2.0 (Exploring)
- C = 3.5 (Building)
- D = 5.0 (Leading)

The confidence multiplier adjusts the score:
- Guessing: × 0.85 (score pulled toward 2.5 midpoint)
- Fairly sure: × 1.0
- Certain: × 1.05 (score amplified toward extremes)

The dimension score is the weighted average of all answered questions in that dimension.

### 6.2 Benchmark Positioning

Results are benchmarked against:
1. **All organisations** in the AiQ database (percentile rank)
2. **Sector peers** (sector-adjusted percentile)
3. **Organisation size peers** (size-adjusted percentile)

### 6.3 Gap Analysis

The gap analysis identifies:
- **Critical gaps**: dimensions scoring below 2.5 (Exploring or below)
- **Development priorities**: dimensions scoring 2.5–3.5 (Building)
- **Strengths to leverage**: dimensions scoring above 3.5 (Scaling or Leading)

The gap analysis feeds directly into the Company AI Strategy Builder, pre-populating the initiative library with the highest-priority interventions for each dimension.

---

## 7. Company AI Strategy Builder Integration

The Company Assessment results flow directly into a company-level version of the existing AiQ Strategy Builder, with the following adaptations:

### 7.1 Pre-populated Context
- **Industry** and **organisation size** are set from the onboarding profile
- **Business AI Ambition** is suggested based on the overall maturity score
- **People AI Ambition** is suggested based on the Workforce Capability and HR Function dimensions

### 7.2 Company-Level Initiative Library
The initiative library is extended with **organisational-level initiatives** (distinct from individual learning modules):

| Category | Example Initiatives |
|---|---|
| Strategy & Governance | Establish HR AI governance framework; Appoint HR AI Director; Develop AI use case portfolio |
| Data & Analytics | Implement unified HR data platform; Launch skills taxonomy project; Deploy attrition prediction model |
| HR Technology | Implement AI-native ATS; Deploy adaptive LMS; Integrate HR systems via API |
| Workforce Capability | Launch enterprise AI literacy programme; Deploy role-specific AI skills pathways; Build AI champions network |
| HR Function | Redesign HR operating model for AI; Train HRBPs in AI-augmented partnering; Build people analytics CoE |
| Culture & Leadership | Launch leadership AI advocacy programme; Run AI experimentation sprints; Establish employee AI forum |

### 7.3 Gap-to-Initiative Mapping
Each dimension gap automatically surfaces the most relevant initiatives. The CPO can accept, modify, or reject each suggestion.

### 7.4 Team Cascade
Once the company strategy is committed, it generates:
- A **team assessment brief** for each HR sub-function (TA, L&D, Reward, HRBP, Analytics, Operations)
- A **capability gap summary** showing which individual AiQ domains need the most development in each team
- A **recommended learning pathway** for each team, drawn from the existing AiQ module library

---

## 8. CPO Onboarding Flow

### Step 1: Organisation Profile (5 minutes)
- Organisation name and sector
- Headcount (employee count ranges)
- HR team size
- Current HRIS/HCM platform
- Existing AI tools in use (multi-select)
- Primary motivation for assessment (regulatory compliance / competitive pressure / board mandate / internal improvement)
- Who will see the results (CPO only / HR leadership team / ExCo / Board)

### Step 2: Assessment Briefing (1 minute)
- Explanation of the 7 dimensions
- Expected completion time (28–35 questions, approximately 20 minutes)
- Explanation of adaptive branching
- Option to invite colleagues to contribute (multi-rater mode)

### Step 3: Assessment (20–25 minutes)
- Adaptive question sequence as described in Section 4
- Progress indicator by dimension
- Option to save and resume

### Step 4: Results and Strategy Builder (10 minutes)
- Immediate results with dimension scores, maturity label, and sector benchmark
- Gap analysis with prioritised recommendations
- One-click launch of the Company AI Strategy Builder

---

## 9. Multi-Rater Mode

For larger organisations, the assessment supports **multi-rater input**:
- The CPO invites up to 5 colleagues (e.g., HR Director, Head of People Analytics, HR Technology Lead, D&I Lead, Head of L&D)
- Each rater completes the same assessment independently
- Results are aggregated using a weighted average (CPO: 40%, other raters: 15% each)
- The results page shows both the aggregate score and the **rater variance** for each dimension (high variance = low organisational alignment, which is itself a finding)

---

## 10. Regulatory and Ethical Grounding

### EU AI Act (2024)
The assessment specifically addresses EU AI Act compliance for HR AI applications. The Act classifies the following HR uses as **high-risk AI systems** requiring conformity assessment:
- AI used in recruitment and selection (CV screening, interview assessment)
- AI used in promotion and termination decisions
- AI used in performance evaluation
- AI used in task allocation and monitoring

Questions in Dimension 2 (Governance & Ethics) are calibrated to the Act's requirements for high-risk systems: human oversight, transparency, accuracy, robustness, and data governance.

### GDPR / UK GDPR
Questions in Dimensions 2 and 3 address GDPR compliance for employee data used in AI models, including lawful basis, data minimisation, purpose limitation, and automated decision-making rights (Article 22).

### CIPD Profession Map
The assessment is aligned to the CIPD Profession Map's **Digital and Technology** core behaviour and the **People Practice** specialist knowledge area. Results include a CIPD alignment label indicating which Profession Map level the organisation's HR AI capability corresponds to.

---

## 11. Validity and Reliability

### Content Validity
The question bank was developed by synthesising six published frameworks (Section 2) and reviewed against the following criteria:
- Each question addresses a distinct, observable organisational behaviour
- Response options represent genuinely different maturity levels (not just degree of effort)
- Questions are free of jargon and accessible to HR professionals without technical AI backgrounds

### Construct Validity
The seven dimensions are theoretically grounded in the synthesised frameworks and represent distinct, non-overlapping constructs. Dimension intercorrelations are expected to be moderate (0.3–0.6), reflecting the fact that AI maturity dimensions are related but not redundant.

### Adaptive Reliability
The adaptive branching algorithm is designed to achieve a measurement reliability (Cronbach's α equivalent) of ≥ 0.80 for each dimension with a minimum of 3 answered questions per dimension.

---

*Document version: 1.0 | Date: May 2026 | Author: AiQ Platform Methodology Team*
*Frameworks cited: MIT CISR (2025), Deloitte (2025), AIHR (2024), CIPD (2026), Agility at Scale (2026), HR-AIMM (2024)*
