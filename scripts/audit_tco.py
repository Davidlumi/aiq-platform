#!/usr/bin/env python3
"""Audit TCO calculation for Acme Retail / Sarah Thornton test profile."""
import json

with open("server/library.json") as f:
    lib = json.load(f)

initiatives = lib["initiatives"]
print(f"Total initiatives in library: {len(initiatives)}")
print()

# Check cost data
print("=== Cost data per initiative ===")
for i in initiatives:
    if isinstance(i, dict):
        cr = i.get("cost", {}).get("base_range_gbp")
        phase = i.get("typical_phase", "?")
        print(f"  {i.get('initiative_id','?'):50s} phase={phase:12s} cost={cr}")
    else:
        print(f"  NON-DICT entry: {type(i)} = {str(i)[:80]}")

print()

# Simulate TCO for 9 initiatives (typical Acme set)
acme_ids = [
    "ai_assisted_cv_screening",
    "ai_assisted_job_descriptions",
    "automated_onboarding_workflows",
    "hr_chatbot_employee_self_service",
    "ai_driven_performance_coaching",
    "ai_learning_recommendation_engine",
    "skills_intelligence_platform",
    "ai_governance_framework",
    "ai_change_management_programme",
]

print("=== Simulating TCO for Acme 9 initiatives ===")
approxCostLow = 0
approxCostHigh = 0
for init_id in acme_ids:
    init = next((i for i in initiatives if isinstance(i, dict) and i.get("initiative_id") == init_id), None)
    if init:
        cr = init.get("cost", {}).get("base_range_gbp")
        if cr and len(cr) == 2:
            approxCostLow += cr[0]
            approxCostHigh += cr[1]
            print(f"  {init_id}: £{cr[0]:,}–£{cr[1]:,}")
        else:
            print(f"  {init_id}: NO COST DATA")
    else:
        print(f"  {init_id}: NOT FOUND")

print(f"\napproxCostLow = £{approxCostLow:,}")
print(f"approxCostHigh = £{approxCostHigh:,}")
print(f"Inverted? {approxCostLow > approxCostHigh}")

# TCO calculation
changeMgmtLow = round(approxCostLow * 0.12)
changeMgmtHigh = round(approxCostHigh * 0.15)
estHrFtes = max(5, round(50 / 0.10 / 50))
trainingLow = estHrFtes * 200
trainingHigh = estHrFtes * 400
ongoingAnnualLow = round(approxCostLow * 0.18)
ongoingAnnualHigh = round(approxCostHigh * 0.20)
horizonYears = 3

total_low = approxCostLow + changeMgmtLow + trainingLow + ongoingAnnualLow * horizonYears
total_high = approxCostHigh + changeMgmtHigh + trainingHigh + ongoingAnnualHigh * horizonYears

print(f"\n=== TCO breakdown ===")
print(f"Implementation:    £{round(approxCostLow/1000)}k–£{round(approxCostHigh/1000)}k")
print(f"Change Mgmt:       £{round(changeMgmtLow/1000)}k–£{round(changeMgmtHigh/1000)}k")
print(f"Training:          £{round(trainingLow/1000)}k–£{round(trainingHigh/1000)}k")
print(f"Ongoing (annual):  £{round(ongoingAnnualLow/1000)}k–£{round(ongoingAnnualHigh/1000)}k")
print(f"Total 3-Year TCO:  £{round(total_low/1000)}k–£{round(total_high/1000)}k")
print(f"INVERTED? {total_low > total_high}")
