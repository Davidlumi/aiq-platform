#!/usr/bin/env python3
"""
A1: Add published_date and last_reviewed_date to all sources in library.json.
Also add function_tag to initiatives (for E2 manager dashboard filtering).
Bump library version to v1.3.0.
"""
import json
from datetime import date

LIBRARY_PATH = "/home/ubuntu/aiq-platform/server/library.json"

# Mapping: source_id -> (published_date, last_reviewed_date, confidence)
# Using existing publication_date where available, adding last_reviewed_date
SOURCE_DATES = {
    "src_lumi_framework_v3":       ("2026-01-01", "2026-04-01", "high"),
    "src_cipd_2025_capability":    ("2025-06-01", "2026-04-01", "high"),
    "src_mckinsey_lnd_2024":       ("2024-09-01", "2025-09-01", "medium"),
    "src_lumi_design_partners_2025": ("2025-12-01", "2026-04-01", "high"),
    "src_eu_ai_act_2024":          ("2024-07-12", "2026-04-01", "high"),
    "src_ico_guidance_hr_ai_2025": ("2025-03-01", "2026-04-01", "high"),
    "src_gartner_hr_tech_2025":    ("2025-04-01", "2026-04-01", "medium"),
    "src_gartner_data_readiness_2025": ("2025-02-01", "2026-04-01", "medium"),
    "src_deloitte_workforce_ai_2025": ("2025-01-15", "2026-04-01", "medium"),
    "src_acas_ai_employment_2024": ("2024-11-01", "2025-11-01", "high"),
    "src_wef_future_jobs_2025":    ("2025-01-07", "2026-04-01", "high"),
    "src_cipd_people_mgmt_2024":   ("2024-10-01", "2025-10-01", "high"),
    "src_ibm_ai_adoption_2025":    ("2025-05-01", "2026-04-01", "medium"),
    "src_pwc_workforce_upskilling_2025": ("2025-03-01", "2026-04-01", "medium"),
    "src_nesta_ai_skills_2024":    ("2024-07-01", "2025-07-01", "high"),
}

# Mapping: initiative_id -> function_tag (HR function most relevant to this initiative)
# Used by E2 manager dashboard to filter relevant initiatives
INITIATIVE_FUNCTION_TAGS = {
    "ai_literacy_programme": ["L&D", "HR Operations", "HRBP"],
    "ai_ethics_governance_framework": ["HRBP", "HR Operations"],
    "prompt_engineering_for_hr": ["L&D", "People Analytics"],
    "ai_acceptable_use_policy": ["HR Operations", "HRBP"],
    "hr_data_quality_audit": ["People Analytics", "HR Operations"],
    "ai_change_management_programme": ["L&D", "HRBP", "HR Communications"],
    "bias_monitoring_and_auditing": ["People Analytics", "HRBP"],
    "hr_process_automation": ["HR Operations"],
    "ai_assisted_job_descriptions": ["TA"],
    "hr_chatbot_employee_queries": ["HR Operations", "HRBP"],
    "people_analytics_dashboard": ["People Analytics"],
    "ai_assisted_performance_feedback": ["HRBP", "L&D"],
    "ai_tool_adoption_programme": ["L&D", "HR Operations"],
    "automated_onboarding_orchestration": ["HR Operations", "TA"],
    "ai_assisted_cv_screening": ["TA"],
    "predictive_attrition_modelling": ["People Analytics", "HRBP"],
    "skills_intelligence_platform": ["L&D", "Workforce Planning"],
    "workforce_scenario_planning": ["Workforce Planning", "People Analytics"],
    "ai_powered_learning_personalisation": ["L&D"],
    "ai_pay_equity_analysis": ["People Analytics", "HRBP"],
    "ai_centre_of_excellence": ["HR Operations", "People Analytics"],
    "hr_ai_operating_model_redesign": ["HR Operations", "HRBP"],
    "ai_governance_maturity_programme": ["HR Operations", "HRBP"],
    "manager_ai_coaching_toolkit": ["L&D", "HRBP"],
    "ai_talent_marketplace": ["TA", "Workforce Planning"],
    "ai_performance_calibration": ["HRBP", "People Analytics"],
    "ai_employee_listening": ["HR Communications", "People Analytics"],
    "ai_job_architecture_redesign": ["Workforce Planning", "HR Operations"],
    "ai_governance_continuous_monitoring": ["HR Operations", "People Analytics"],
    "ai_hr_operating_model_redesign": ["HR Operations", "HRBP"],
}

with open(LIBRARY_PATH) as f:
    lib = json.load(f)

# A1: Update sources with published_date, last_reviewed_date, confidence
today = date.today().isoformat()
for src_id, src in lib["sources"].items():
    if src_id in SOURCE_DATES:
        pub, reviewed, conf = SOURCE_DATES[src_id]
        src["published_date"] = pub
        src["last_reviewed_date"] = reviewed
        src["confidence"] = conf
    else:
        # Fallback for any new sources
        src.setdefault("published_date", "2024-01-01")  # conservative placeholder
        src.setdefault("last_reviewed_date", "2024-01-01")
        src.setdefault("confidence", "medium")
        print(f"WARNING: {src_id} using placeholder dates — flag for manual review")

# Add function_tag to initiatives
for init_id, init in lib["initiatives"].items():
    if init_id in INITIATIVE_FUNCTION_TAGS:
        init["function_tags"] = INITIATIVE_FUNCTION_TAGS[init_id]
    else:
        init.setdefault("function_tags", ["HR Operations"])

# Bump library version to v1.3.0
lib["meta"]["version"] = "1.3.0"
lib["meta"]["built_at"] = "2026-05-08T00:00:00.000Z"

with open(LIBRARY_PATH, "w") as f:
    json.dump(lib, f, indent=2)

print(f"Updated {len(lib['sources'])} sources with date fields")
print(f"Updated {len(lib['initiatives'])} initiatives with function_tags")
print(f"Library version bumped to {lib['meta']['version']}")

# Validate: check for stale sources (last_reviewed > 18 months ago)
from datetime import datetime
today_dt = datetime.now().date()
stale_count = 0
for src_id, src in lib["sources"].items():
    reviewed = datetime.strptime(src["last_reviewed_date"], "%Y-%m-%d").date()
    months_diff = (today_dt.year - reviewed.year) * 12 + (today_dt.month - reviewed.month)
    if months_diff > 18:
        print(f"WARNING: {src_id} is stale (last reviewed {src['last_reviewed_date']}, {months_diff} months ago)")
        stale_count += 1

print(f"\nValidation complete: {stale_count} stale sources (last_reviewed > 18 months ago)")
