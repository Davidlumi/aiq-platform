#!/usr/bin/env python3
"""
Merge value_model fields from library.json into content-library.json.
content-library.json is the file the server loads first (it's listed first
in the candidates array in contentLibrary.ts). library.json has the value_model
data added in the previous fix session. This script copies value_model from
library.json → content-library.json for every initiative.
"""
import json
import shutil
from pathlib import Path

server_dir = Path("server")
lib_path = server_dir / "library.json"
clib_path = server_dir / "content-library.json"

# Load both
with open(lib_path) as f:
    lib = json.load(f)
with open(clib_path) as f:
    clib = json.load(f)

lib_inits = lib["initiatives"]
clib_inits = clib["initiatives"]

added = 0
already = 0
missing_in_lib = 0

for iid, clib_init in clib_inits.items():
    if "value_model" in clib_init:
        already += 1
        continue
    lib_init = lib_inits.get(iid)
    if lib_init and "value_model" in lib_init:
        clib_init["value_model"] = lib_init["value_model"]
        added += 1
    else:
        missing_in_lib += 1
        print(f"  WARNING: {iid} has no value_model in library.json either")

print(f"\nResults:")
print(f"  Added value_model to {added} initiatives in content-library.json")
print(f"  Already had value_model: {already}")
print(f"  Missing in library.json too: {missing_in_lib}")

# Verify all 30 have value_model now
total = len(clib_inits)
with_vm = sum(1 for i in clib_inits.values() if "value_model" in i)
print(f"  Total initiatives: {total}")
print(f"  With value_model: {with_vm}")

# Write back
with open(clib_path, "w") as f:
    json.dump(clib, f, indent=2)
print(f"\nWritten: {clib_path}")

# Verify a few key ones
print("\nSpot check:")
for iid in ["ai_assisted_cv_screening", "ai_literacy_programme", "ai_ethics_governance_framework"]:
    init = clib_inits.get(iid, {})
    vm = init.get("value_model")
    if vm:
        qv = vm.get("quantified_value")
        print(f"  {iid}: type={vm.get('primary_value_type')}, qv={'present' if qv else 'null'}, qual_only={vm.get('qualitative_value_only')}")
    else:
        print(f"  {iid}: STILL MISSING")
