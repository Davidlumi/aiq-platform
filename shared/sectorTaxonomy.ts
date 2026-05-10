/**
 * Sub-sector taxonomy and benchmark overrides.
 * Sector keys match the ailOrgContext.sector enum values.
 * Sub-sector keys are snake_case slugs stored in ailOrgContext.subSector.
 */

// ── Taxonomy ─────────────────────────────────────────────────────────────────

export interface SubSectorDef {
  value: string;   // snake_case slug stored in DB
  label: string;   // Display label
}

export const SUB_SECTOR_TAXONOMY: Record<string, SubSectorDef[]> = {
  financial_services: [
    { value: "banking_capital_markets",  label: "Banking & Capital Markets" },
    { value: "insurance",                label: "Insurance" },
    { value: "asset_management",         label: "Asset Management" },
    { value: "fintech",                  label: "FinTech" },
    { value: "payments",                 label: "Payments" },
  ],
  healthcare: [
    { value: "nhs_public_health",        label: "NHS & Public Health" },
    { value: "private_healthcare",       label: "Private Healthcare" },
    { value: "pharma_biotech",           label: "Pharma & Biotech" },
    { value: "medical_devices",          label: "Medical Devices" },
    { value: "health_tech",              label: "Health Tech" },
  ],
  technology: [
    { value: "enterprise_software",      label: "Enterprise Software" },
    { value: "saas_cloud",               label: "SaaS / Cloud" },
    { value: "cybersecurity",            label: "Cybersecurity" },
    { value: "ai_data",                  label: "AI / Data" },
    { value: "hardware_semiconductors",  label: "Hardware & Semiconductors" },
  ],
  professional_services: [
    { value: "management_consulting",    label: "Management Consulting" },
    { value: "legal_services",           label: "Legal Services" },
    { value: "accounting_audit",         label: "Accounting & Audit" },
    { value: "recruitment_staffing",     label: "Recruitment & Staffing" },
    { value: "pr_communications",        label: "PR & Communications" },
  ],
  retail: [
    { value: "grocery_food",             label: "Grocery & Food" },
    { value: "fashion_apparel",          label: "Fashion & Apparel" },
    { value: "ecommerce_marketplace",    label: "E-commerce & Marketplace" },
    { value: "luxury_beauty",            label: "Luxury & Beauty" },
    { value: "home_diy",                 label: "Home & DIY" },
  ],
  manufacturing: [
    { value: "automotive",               label: "Automotive" },
    { value: "aerospace_defence",        label: "Aerospace & Defence" },
    { value: "fmcg_cpg",                 label: "FMCG / CPG" },
    { value: "industrial_engineering",   label: "Industrial & Heavy Engineering" },
    { value: "construction",             label: "Construction" },
  ],
  public_sector: [
    { value: "central_government",       label: "Central Government" },
    { value: "local_government",         label: "Local Government" },
    { value: "higher_education",         label: "Higher Education" },
    { value: "schools_fe",               label: "Schools & FE" },
    { value: "charity_third_sector",     label: "Charity & Third Sector" },
  ],
  energy_utilities: [
    { value: "oil_gas",                  label: "Oil & Gas" },
    { value: "renewables",               label: "Renewables" },
    { value: "utilities_water",          label: "Utilities & Water" },
    { value: "mining_extractives",       label: "Mining & Extractives" },
  ],
  media_entertainment: [
    { value: "broadcasting_streaming",   label: "Broadcasting & Streaming" },
    { value: "publishing_news",          label: "Publishing & News" },
    { value: "gaming",                   label: "Gaming" },
    { value: "advertising_martech",      label: "Advertising & MarTech" },
  ],
  other: [],
};

/** Returns the sub-sector options for a given sector key. */
export function getSubSectors(sector: string): SubSectorDef[] {
  return SUB_SECTOR_TAXONOMY[sector] ?? [];
}

/** Returns the display label for a sub-sector slug, or the slug itself if not found. */
export function getSubSectorLabel(sector: string, subSector: string): string {
  const found = (SUB_SECTOR_TAXONOMY[sector] ?? []).find(s => s.value === subSector);
  return found?.label ?? subSector;
}

// ── Sub-sector benchmark overrides ───────────────────────────────────────────
// These override the parent-sector average (0–5 scale) for the company
// assessment benchmark. Values are based on industry AI maturity research.
// Where no override exists, the parent-sector average is used.

export const SUB_SECTOR_BENCHMARKS: Record<string, number> = {
  // Financial Services
  banking_capital_markets:  3.4,
  insurance:                2.9,
  asset_management:         3.0,
  fintech:                  3.8,
  payments:                 3.5,
  // Healthcare
  nhs_public_health:        1.9,
  private_healthcare:       2.3,
  pharma_biotech:           2.8,
  medical_devices:          2.5,
  health_tech:              3.2,
  // Technology
  enterprise_software:      3.5,
  saas_cloud:               3.9,
  cybersecurity:            3.4,
  ai_data:                  4.2,
  hardware_semiconductors:  3.1,
  // Professional Services
  management_consulting:    3.2,
  legal_services:           2.5,
  accounting_audit:         2.7,
  recruitment_staffing:     2.8,
  pr_communications:        2.6,
  // Retail
  grocery_food:             2.2,
  fashion_apparel:          2.3,
  ecommerce_marketplace:    3.1,
  luxury_beauty:            2.4,
  home_diy:                 2.1,
  // Manufacturing
  automotive:               2.5,
  aerospace_defence:        2.8,
  fmcg_cpg:                 2.3,
  industrial_engineering:   2.0,
  construction:             1.8,
  // Public Sector
  central_government:       2.1,
  local_government:         1.7,
  higher_education:         2.4,
  schools_fe:               1.8,
  charity_third_sector:     1.6,
  // Energy & Utilities
  oil_gas:                  2.4,
  renewables:               2.7,
  utilities_water:          2.2,
  mining_extractives:       1.9,
  // Media & Entertainment
  broadcasting_streaming:   2.9,
  publishing_news:          2.5,
  gaming:                   3.3,
  advertising_martech:      3.0,
};

/**
 * Returns the most specific available benchmark for the given sector + sub-sector.
 * Falls back to the sector-level benchmark, then to the global default.
 */
export function getEffectiveBenchmark(
  sectorBenchmarks: Record<string, number>,
  sector: string,
  subSector: string | null | undefined,
): number {
  if (subSector && SUB_SECTOR_BENCHMARKS[subSector] !== undefined) {
    return SUB_SECTOR_BENCHMARKS[subSector];
  }
  // Map sector enum keys to the display keys used in SECTOR_BENCHMARKS
  const SECTOR_KEY_MAP: Record<string, string> = {
    financial_services:   "Financial Services",
    healthcare:           "Healthcare",
    technology:           "Technology",
    professional_services:"Professional Services",
    retail:               "Retail",
    manufacturing:        "Manufacturing",
    public_sector:        "Public Sector",
    energy_utilities:     "Energy & Utilities",
    media_entertainment:  "Media & Entertainment",
    other:                "Other",
  };
  const displayKey = SECTOR_KEY_MAP[sector] ?? "Other";
  return sectorBenchmarks[displayKey] ?? 2.5;
}
