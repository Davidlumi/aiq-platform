/**
 * AiQ Sector Taxonomy & Benchmark Norms
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive sector / sub-sector taxonomy with AI maturity benchmarks,
 * organisation-size modifiers, and organisation-type modifiers.
 *
 * Benchmark sources (0–5 scale, where 5 = Pioneering):
 *   • McKinsey State of AI 2024 — sector AI adoption rates
 *   • Deloitte AI Maturity Index 2023 — sector maturity scores
 *   • BCG AI Maturity Model 2024 — industry benchmarks
 *   • CIPD People Profession AI Framework 2024 — HR function benchmarks
 *   • PwC AI Readiness Survey 2024 — sector readiness by size
 *   • MIT Sloan AI Maturity Study 2023 — enterprise vs SME gaps
 *   • AIHR HR AI Readiness Radar 2024 — HR-specific norms
 *
 * Scale interpretation:
 *   1.0–1.9  Foundational  — AI is experimental or absent
 *   2.0–2.9  Developing    — AI pilots underway, limited scale
 *   3.0–3.9  Scaling       — AI embedded in key processes
 *   4.0–4.9  Leading       — AI-native workflows, measurable ROI
 *   5.0      Pioneering    — AI-first organisation, industry benchmark-setter
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubSectorDef {
  value: string;
  label: string;
}

export interface SectorDef {
  value: string;
  label: string;
  benchmark: number;
  strategyGuidance: string;
}

export interface OrgSizeBand {
  value: string;
  label: string;
  headcountRange: string;
  benchmarkDelta: number;
  strategyNote: string;
}

export interface OrgTypeDef {
  value: string;
  label: string;
  benchmarkDelta: number;
  strategyNote: string;
}

// ── Sector taxonomy ───────────────────────────────────────────────────────────

export const SECTOR_TAXONOMY: SectorDef[] = [
  {
    value: "financial_services",
    label: "Financial Services",
    benchmark: 3.1,
    strategyGuidance:
      "Financial services organisations face strong regulatory scrutiny (FCA, PRA, EU AI Act) alongside competitive pressure from FinTech disruptors. AI strategy must balance innovation velocity with model explainability, bias controls, and SR 11-7 / SS1/23 model-risk governance.",
  },
  {
    value: "healthcare",
    label: "Healthcare",
    benchmark: 2.4,
    strategyGuidance:
      "Healthcare AI strategy must navigate MHRA medical-device regulation, NHS data-governance frameworks, and patient-safety obligations. Workforce AI capability is typically below the cross-sector average; change management and clinical-staff engagement are critical success factors.",
  },
  {
    value: "technology",
    label: "Technology",
    benchmark: 3.6,
    strategyGuidance:
      "Technology organisations lead on AI infrastructure and tooling but often underinvest in HR AI capability relative to engineering. Strategy should focus on closing the HR-function maturity gap and building AI governance structures that match the pace of product innovation.",
  },
  {
    value: "professional_services",
    label: "Professional Services",
    benchmark: 2.9,
    strategyGuidance:
      "Professional services firms are under intense pressure to deploy AI for productivity and margin improvement. Knowledge-worker AI adoption, client-confidentiality governance, and skills-taxonomy redesign are the dominant strategic priorities.",
  },
  {
    value: "retail",
    label: "Retail & Consumer",
    benchmark: 2.3,
    strategyGuidance:
      "Retail AI strategy is driven by customer-experience and supply-chain use cases; HR AI adoption lags behind commercial functions. Workforce agility, high-turnover talent pipelines, and frontline AI literacy are the key HR AI challenges.",
  },
  {
    value: "manufacturing",
    label: "Manufacturing & Engineering",
    benchmark: 2.1,
    strategyGuidance:
      "Manufacturing AI investment is concentrated in operations and predictive maintenance; HR AI maturity is typically low. Reskilling for Industry 4.0 roles, safety-critical AI governance, and union/works-council engagement are strategic priorities.",
  },
  {
    value: "public_sector",
    label: "Public Sector",
    benchmark: 1.9,
    strategyGuidance:
      "Public sector AI strategy operates under Cabinet Office / CDDO guidance, procurement constraints, and strong accountability obligations. Transparency, algorithmic fairness, and democratic oversight must be embedded in every AI initiative.",
  },
  {
    value: "energy_utilities",
    label: "Energy & Utilities",
    benchmark: 2.5,
    strategyGuidance:
      "Energy sector AI strategy spans net-zero transition, grid optimisation, and safety-critical operations. HR AI must support rapid workforce reskilling for green-energy roles while managing the cultural shift from engineering-led to data-driven decision-making.",
  },
  {
    value: "media_entertainment",
    label: "Media & Entertainment",
    benchmark: 2.8,
    strategyGuidance:
      "Media organisations face existential AI disruption in content creation, rights management, and audience analytics. HR AI strategy must address creative-workforce concerns about job displacement, IP governance, and the ethics of generative AI in content pipelines.",
  },
  {
    value: "logistics_transport",
    label: "Logistics & Transport",
    benchmark: 2.2,
    strategyGuidance:
      "Logistics AI is maturing rapidly in route optimisation and warehouse automation; HR AI lags. Workforce planning for automation-displaced roles, driver/operator reskilling, and safety-critical AI governance are the dominant HR AI priorities.",
  },
  {
    value: "education",
    label: "Education",
    benchmark: 2.0,
    strategyGuidance:
      "Education sector AI adoption is accelerating post-pandemic but governance frameworks are immature. HR AI strategy must navigate academic-freedom concerns, student-data ethics, and the tension between efficiency gains and staff-wellbeing obligations.",
  },
  {
    value: "hospitality_leisure",
    label: "Hospitality & Leisure",
    benchmark: 1.8,
    strategyGuidance:
      "Hospitality AI investment is focused on customer personalisation and revenue management; HR AI maturity is among the lowest across sectors. High turnover, seasonal workforce complexity, and frontline AI literacy are the primary HR AI challenges.",
  },
  {
    value: "other",
    label: "Other",
    benchmark: 2.5,
    strategyGuidance:
      "Apply cross-sector AI strategy principles: build foundational data literacy, establish lightweight AI governance, and prioritise high-ROI use cases before scaling.",
  },
];

// ── Sub-sector taxonomy ───────────────────────────────────────────────────────

export const SUB_SECTOR_TAXONOMY: Record<string, SubSectorDef[]> = {
  financial_services: [
    { value: "banking_capital_markets",  label: "Banking & Capital Markets" },
    { value: "insurance",                label: "Insurance" },
    { value: "asset_wealth_management",  label: "Asset & Wealth Management" },
    { value: "fintech",                  label: "FinTech" },
    { value: "payments_infrastructure",  label: "Payments & Infrastructure" },
    { value: "private_equity_vc",        label: "Private Equity & VC" },
    { value: "mortgage_lending",         label: "Mortgage & Lending" },
  ],
  healthcare: [
    { value: "nhs_public_health",        label: "NHS & Public Health" },
    { value: "private_healthcare",       label: "Private Healthcare & Clinics" },
    { value: "pharma_biotech",           label: "Pharma & Biotech" },
    { value: "medical_devices",          label: "Medical Devices & Diagnostics" },
    { value: "health_tech",              label: "Health Tech & Digital Health" },
    { value: "mental_health_services",   label: "Mental Health Services" },
    { value: "social_care",              label: "Social Care" },
  ],
  technology: [
    { value: "enterprise_software",      label: "Enterprise Software" },
    { value: "saas_cloud",               label: "SaaS / Cloud" },
    { value: "cybersecurity",            label: "Cybersecurity" },
    { value: "ai_data",                  label: "AI & Data" },
    { value: "hardware_semiconductors",  label: "Hardware & Semiconductors" },
    { value: "telecoms",                 label: "Telecoms & Networks" },
    { value: "it_services_outsourcing",  label: "IT Services & Outsourcing" },
  ],
  professional_services: [
    { value: "management_consulting",    label: "Management Consulting" },
    { value: "legal_services",           label: "Legal Services" },
    { value: "accounting_audit",         label: "Accounting & Audit" },
    { value: "recruitment_staffing",     label: "Recruitment & Staffing" },
    { value: "pr_communications",        label: "PR & Communications" },
    { value: "architecture_engineering", label: "Architecture & Engineering Consulting" },
    { value: "research_analytics",       label: "Research & Analytics" },
  ],
  retail: [
    { value: "grocery_food",             label: "Grocery & Food Retail" },
    { value: "fashion_apparel",          label: "Fashion & Apparel" },
    { value: "ecommerce_marketplace",    label: "eCommerce & Marketplace" },
    { value: "luxury_beauty",            label: "Luxury & Beauty" },
    { value: "home_diy",                 label: "Home & DIY" },
    { value: "pharmacy_health_retail",   label: "Pharmacy & Health Retail" },
    { value: "automotive_retail",        label: "Automotive Retail" },
  ],
  manufacturing: [
    { value: "automotive",               label: "Automotive" },
    { value: "aerospace_defence",        label: "Aerospace & Defence" },
    { value: "fmcg_cpg",                 label: "FMCG / CPG" },
    { value: "industrial_engineering",   label: "Industrial & Heavy Engineering" },
    { value: "construction",             label: "Construction" },
    { value: "chemicals_materials",      label: "Chemicals & Materials" },
    { value: "food_beverage_production", label: "Food & Beverage Production" },
  ],
  public_sector: [
    { value: "central_government",       label: "Central Government" },
    { value: "local_government",         label: "Local Government" },
    { value: "higher_education",         label: "Higher Education" },
    { value: "schools_fe",               label: "Schools & FE" },
    { value: "charity_third_sector",     label: "Charity & Third Sector" },
    { value: "nhs_trust",                label: "NHS Trust" },
    { value: "arms_length_body",         label: "Arms-Length Body / Regulator" },
  ],
  energy_utilities: [
    { value: "oil_gas",                  label: "Oil & Gas" },
    { value: "renewables",               label: "Renewables" },
    { value: "utilities_water",          label: "Utilities & Water" },
    { value: "mining_extractives",       label: "Mining & Extractives" },
    { value: "nuclear",                  label: "Nuclear" },
    { value: "grid_transmission",        label: "Grid & Transmission" },
  ],
  media_entertainment: [
    { value: "broadcasting_streaming",   label: "Broadcasting & Streaming" },
    { value: "publishing_news",          label: "Publishing & News" },
    { value: "gaming",                   label: "Gaming" },
    { value: "advertising_martech",      label: "Advertising & MarTech" },
    { value: "music_live_events",        label: "Music & Live Events" },
    { value: "film_production",          label: "Film & Production" },
  ],
  logistics_transport: [
    { value: "road_freight",             label: "Road Freight & Haulage" },
    { value: "rail_transit",             label: "Rail & Transit" },
    { value: "aviation",                 label: "Aviation & Airports" },
    { value: "maritime_ports",           label: "Maritime & Ports" },
    { value: "warehousing_fulfilment",   label: "Warehousing & Fulfilment" },
    { value: "last_mile_delivery",       label: "Last-Mile Delivery" },
  ],
  education: [
    { value: "universities",             label: "Universities" },
    { value: "schools_academies",        label: "Schools & Academies" },
    { value: "edtech",                   label: "EdTech" },
    { value: "professional_training",    label: "Professional Training & CPD" },
    { value: "early_years",              label: "Early Years & Childcare" },
  ],
  hospitality_leisure: [
    { value: "hotels_resorts",           label: "Hotels & Resorts" },
    { value: "restaurants_qsr",          label: "Restaurants & QSR" },
    { value: "travel_tourism",           label: "Travel & Tourism" },
    { value: "sports_fitness",           label: "Sports & Fitness" },
    { value: "gambling_gaming",          label: "Gambling & Gaming" },
  ],
  other: [],
};

// ── Sub-sector benchmark overrides ───────────────────────────────────────────
// Per-sub-sector AI maturity norm (0–5 scale).
// Sources: McKinsey 2024, Deloitte AI Maturity Index 2023, BCG 2024, AIHR 2024.

export const SUB_SECTOR_BENCHMARKS: Record<string, number> = {
  // Financial Services
  banking_capital_markets:  3.4,
  insurance:                2.9,
  asset_wealth_management:  3.0,
  fintech:                  3.8,
  payments_infrastructure:  3.5,
  private_equity_vc:        3.1,
  mortgage_lending:         2.7,
  // Legacy keys (backward compat)
  asset_management:         3.0,
  payments:                 3.5,

  // Healthcare
  nhs_public_health:        1.9,
  private_healthcare:       2.3,
  pharma_biotech:           2.8,
  medical_devices:          2.5,
  health_tech:              3.2,
  mental_health_services:   1.8,
  social_care:              1.6,

  // Technology
  enterprise_software:      3.5,
  saas_cloud:               3.9,
  cybersecurity:            3.4,
  ai_data:                  4.2,
  hardware_semiconductors:  3.1,
  telecoms:                 3.0,
  it_services_outsourcing:  2.8,

  // Professional Services
  management_consulting:    3.2,
  legal_services:           2.5,
  accounting_audit:         2.7,
  recruitment_staffing:     2.8,
  pr_communications:        2.6,
  architecture_engineering: 2.4,
  research_analytics:       3.1,

  // Retail
  grocery_food:             2.2,
  fashion_apparel:          2.3,
  ecommerce_marketplace:    3.1,
  luxury_beauty:            2.4,
  home_diy:                 2.1,
  pharmacy_health_retail:   2.3,
  automotive_retail:        2.2,

  // Manufacturing
  automotive:               2.5,
  aerospace_defence:        2.8,
  fmcg_cpg:                 2.3,
  industrial_engineering:   2.0,
  construction:             1.8,
  chemicals_materials:      2.2,
  food_beverage_production: 2.0,

  // Public Sector
  central_government:       2.1,
  local_government:         1.7,
  higher_education:         2.4,
  schools_fe:               1.8,
  charity_third_sector:     1.6,
  nhs_trust:                1.9,
  arms_length_body:         2.0,

  // Energy & Utilities
  oil_gas:                  2.4,
  renewables:               2.7,
  utilities_water:          2.2,
  mining_extractives:       1.9,
  nuclear:                  2.3,
  grid_transmission:        2.5,

  // Media & Entertainment
  broadcasting_streaming:   2.9,
  publishing_news:          2.5,
  gaming:                   3.3,
  advertising_martech:      3.0,
  music_live_events:        2.3,
  film_production:          2.4,

  // Logistics & Transport
  road_freight:             2.0,
  rail_transit:             2.3,
  aviation:                 2.7,
  maritime_ports:           2.1,
  warehousing_fulfilment:   2.4,
  last_mile_delivery:       2.6,

  // Education
  universities:             2.3,
  schools_academies:        1.7,
  edtech:                   3.0,
  professional_training:    2.5,
  early_years:              1.5,

  // Hospitality & Leisure
  hotels_resorts:           1.9,
  restaurants_qsr:          1.7,
  travel_tourism:           2.0,
  sports_fitness:           1.9,
  gambling_gaming:          2.6,
};

// ── Organisation-size bands ───────────────────────────────────────────────────
// Additive delta applied to the base benchmark.
// Sources: PwC AI Readiness 2024, MIT Sloan 2023, McKinsey 2024.

export const ORG_SIZE_BANDS: OrgSizeBand[] = [
  {
    value: "micro",
    label: "Micro (< 50)",
    headcountRange: "1–49",
    benchmarkDelta: -0.4,
    strategyNote:
      "Micro organisations typically lack dedicated AI/data functions; strategy should focus on accessible, low-overhead AI tools and building foundational data literacy before scaling.",
  },
  {
    value: "small",
    label: "Small (50–249)",
    headcountRange: "50–249",
    benchmarkDelta: -0.2,
    strategyNote:
      "Small organisations benefit from agility but face resource constraints. Prioritise high-ROI AI use cases, leverage vendor-managed AI platforms, and build a small internal AI champion network.",
  },
  {
    value: "mid_market",
    label: "Mid-Market (250–999)",
    headcountRange: "250–999",
    benchmarkDelta: 0.0,
    strategyNote:
      "Mid-market organisations are at the sector average. Strategy should balance building internal AI capability with managed vendor partnerships and establishing lightweight AI governance.",
  },
  {
    value: "enterprise",
    label: "Enterprise (1,000–4,999)",
    headcountRange: "1,000–4,999",
    benchmarkDelta: +0.2,
    strategyNote:
      "Enterprise organisations have the resources to invest in AI centres of excellence and proprietary data assets. Strategy should focus on scaling proven pilots, cross-functional AI governance, and workforce AI upskilling at scale.",
  },
  {
    value: "large_enterprise",
    label: "Large Enterprise (5,000–19,999)",
    headcountRange: "5,000–19,999",
    benchmarkDelta: +0.3,
    strategyNote:
      "Large enterprises face complexity in AI governance and change management across business units. Strategy must address AI ethics at scale, federated data governance, and executive AI literacy alongside frontline deployment.",
  },
  {
    value: "global_enterprise",
    label: "Global Enterprise (20,000+)",
    headcountRange: "20,000+",
    benchmarkDelta: +0.4,
    strategyNote:
      "Global enterprises operate at the frontier of AI deployment but face the greatest governance complexity. Strategy must address multi-jurisdictional regulation, AI ethics at population scale, and the risk of AI capability concentration in central functions.",
  },
];

// ── Organisation-type modifiers ───────────────────────────────────────────────
// Additive delta applied to the base benchmark.
// Sources: Deloitte 2023, BCG 2024, CIPD 2024.

export const ORG_TYPES: OrgTypeDef[] = [
  {
    value: "listed_plc",
    label: "Listed PLC",
    benchmarkDelta: +0.3,
    strategyNote:
      "Listed PLCs face shareholder and analyst scrutiny on AI strategy; AI investment is often higher but must be accompanied by robust disclosure, audit-trail governance, and board-level AI accountability.",
  },
  {
    value: "private_equity",
    label: "Private Equity-Backed",
    benchmarkDelta: +0.2,
    strategyNote:
      "PE-backed organisations are under pressure to demonstrate AI-driven productivity gains within investment horizons. Strategy should focus on measurable ROI, rapid deployment, and value-creation narratives for the investment thesis.",
  },
  {
    value: "private_family",
    label: "Private / Family-Owned",
    benchmarkDelta: -0.1,
    strategyNote:
      "Private and family-owned businesses typically have longer investment horizons but may be more risk-averse on AI. Strategy should emphasise trusted, incremental AI adoption with clear business-case justification.",
  },
  {
    value: "public_sector_org",
    label: "Public Sector / Government",
    benchmarkDelta: -0.3,
    strategyNote:
      "Public sector organisations face procurement constraints, transparency obligations, and democratic accountability. AI strategy must embed algorithmic fairness, public-interest safeguards, and cross-departmental governance from the outset.",
  },
  {
    value: "charity_nfp",
    label: "Charity / Not-for-Profit",
    benchmarkDelta: -0.4,
    strategyNote:
      "Charities and NFPs operate with constrained budgets and high public-trust obligations. AI strategy should focus on mission-aligned use cases, low-cost AI tooling, and volunteer/beneficiary data ethics.",
  },
  {
    value: "startup_scaleup",
    label: "Startup / Scale-Up",
    benchmarkDelta: +0.4,
    strategyNote:
      "Startups and scale-ups are typically AI-native or AI-first; the challenge is building governance and HR AI capability at the same pace as product innovation. Strategy should prioritise AI ethics, talent-pipeline AI literacy, and scalable HR data infrastructure.",
  },
  {
    value: "joint_venture",
    label: "Joint Venture / Consortium",
    benchmarkDelta: 0.0,
    strategyNote:
      "Joint ventures face governance complexity across parent organisations. AI strategy must address data-sharing agreements, IP ownership, and cross-entity AI accountability frameworks.",
  },
  {
    value: "cooperative",
    label: "Co-operative / Mutual",
    benchmarkDelta: -0.2,
    strategyNote:
      "Co-operatives and mutuals have strong member-accountability obligations. AI strategy should embed member voice in AI governance and prioritise transparent, explainable AI that serves member interests.",
  },
];

// ── Headcount-band to size-band mapping ──────────────────────────────────────
// Maps the headcountBand string stored in the companies table to an OrgSizeBand value.

export const HEADCOUNT_BAND_TO_SIZE: Record<string, string> = {
  "1-49":         "micro",
  "50-249":       "small",
  "250-999":      "mid_market",
  "1000-4999":    "enterprise",
  "5000-19999":   "large_enterprise",
  "20000+":       "global_enterprise",
  // Legacy / alternative formats
  "under_50":     "micro",
  "50_249":       "small",
  "250_999":      "mid_market",
  "1000_4999":    "enterprise",
  "5000_19999":   "large_enterprise",
  "20000_plus":   "global_enterprise",
};

// ── Helper functions ──────────────────────────────────────────────────────────

/** Returns the sub-sector options for a given sector key. */
export function getSubSectors(sector: string): SubSectorDef[] {
  return SUB_SECTOR_TAXONOMY[sector] ?? [];
}

/** Returns the display label for a sub-sector slug, or the slug itself if not found. */
export function getSubSectorLabel(sector: string, subSector: string): string {
  const found = (SUB_SECTOR_TAXONOMY[sector] ?? []).find(s => s.value === subSector);
  return found?.label ?? subSector;
}

/** Returns the SectorDef for a given sector key. */
export function getSectorDef(sector: string): SectorDef | undefined {
  return SECTOR_TAXONOMY.find(s => s.value === sector);
}

/** Returns the OrgSizeBand for a given size value. */
export function getOrgSizeBand(sizeValue: string): OrgSizeBand | undefined {
  return ORG_SIZE_BANDS.find(b => b.value === sizeValue);
}

/** Returns the OrgTypeDef for a given org-type value. */
export function getOrgType(typeValue: string): OrgTypeDef | undefined {
  return ORG_TYPES.find(t => t.value === typeValue);
}

/** Resolves a headcount band string to an OrgSizeBand value. */
export function headcountBandToSize(headcountBand: string): string {
  return HEADCOUNT_BAND_TO_SIZE[headcountBand] ?? "mid_market";
}

/**
 * Returns the most specific available benchmark for the given context.
 *
 * Resolution order:
 *   1. Sub-sector benchmark (most specific)
 *   2. Sector-level benchmark from SECTOR_TAXONOMY
 *   3. Legacy sectorBenchmarks map
 *   4. Global default (2.5)
 *
 * Then applies additive modifiers for org size and org type.
 * Result is clamped to [1.0, 5.0].
 */
export function getEffectiveBenchmark(
  sectorBenchmarks: Record<string, number>,
  sector: string,
  subSector: string | null | undefined,
  orgSizeValue?: string | null,
  orgTypeValue?: string | null,
): number {
  // Step 1: base benchmark
  let base: number;
  if (subSector && SUB_SECTOR_BENCHMARKS[subSector] !== undefined) {
    base = SUB_SECTOR_BENCHMARKS[subSector];
  } else {
    const sectorDef = SECTOR_TAXONOMY.find(s => s.value === sector);
    if (sectorDef) {
      base = sectorDef.benchmark;
    } else {
      // Legacy display-key fallback
      const SECTOR_KEY_MAP: Record<string, string> = {
        financial_services:    "Financial Services",
        healthcare:            "Healthcare",
        technology:            "Technology",
        professional_services: "Professional Services",
        retail:                "Retail",
        manufacturing:         "Manufacturing",
        public_sector:         "Public Sector",
        energy_utilities:      "Energy & Utilities",
        media_entertainment:   "Media & Entertainment",
        logistics_transport:   "Logistics & Transport",
        education:             "Education",
        hospitality_leisure:   "Hospitality & Leisure",
        other:                 "Other",
      };
      const displayKey = SECTOR_KEY_MAP[sector] ?? "Other";
      base = sectorBenchmarks[displayKey] ?? 2.5;
    }
  }

  // Step 2: org-size modifier
  if (orgSizeValue) {
    const sizeBand = ORG_SIZE_BANDS.find(b => b.value === orgSizeValue);
    if (sizeBand) base += sizeBand.benchmarkDelta;
  }

  // Step 3: org-type modifier
  if (orgTypeValue) {
    const orgType = ORG_TYPES.find(t => t.value === orgTypeValue);
    if (orgType) base += orgType.benchmarkDelta;
  }

  return Math.round(Math.min(5.0, Math.max(1.0, base)) * 10) / 10;
}

/**
 * Returns a human-readable benchmark context string for use in LLM prompts
 * and strategy guidance UI.
 */
export function getBenchmarkContext(
  sector: string,
  subSector: string | null | undefined,
  orgSizeValue: string | null | undefined,
  orgTypeValue: string | null | undefined,
  effectiveBenchmark: number,
): string {
  const sectorDef = getSectorDef(sector);
  const subSectorLabel = subSector ? getSubSectorLabel(sector, subSector) : null;
  const sizeBand = orgSizeValue ? getOrgSizeBand(orgSizeValue) : null;
  const orgType = orgTypeValue ? getOrgType(orgTypeValue) : null;

  const contextParts: string[] = [];
  if (subSectorLabel) {
    contextParts.push(`${subSectorLabel} (${sectorDef?.label ?? sector})`);
  } else {
    contextParts.push(sectorDef?.label ?? sector);
  }
  if (sizeBand) contextParts.push(sizeBand.label);
  if (orgType) contextParts.push(orgType.label);

  return `${contextParts.join(" \u00b7 ")} \u2014 sector norm: ${effectiveBenchmark}/5.0`;
}

/**
 * Returns combined strategy guidance text for injection into LLM prompts.
 * Merges sector, size, and org-type guidance into a single paragraph.
 */
export function getStrategyGuidance(
  sector: string,
  orgSizeValue: string | null | undefined,
  orgTypeValue: string | null | undefined,
): string {
  const sectorDef = getSectorDef(sector);
  const sizeBand = orgSizeValue ? getOrgSizeBand(orgSizeValue) : null;
  const orgType = orgTypeValue ? getOrgType(orgTypeValue) : null;

  const parts: string[] = [];
  if (sectorDef) parts.push(sectorDef.strategyGuidance);
  if (sizeBand) parts.push(sizeBand.strategyNote);
  if (orgType) parts.push(orgType.strategyNote);

  return parts.join(" ");
}
