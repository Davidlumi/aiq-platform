#!/usr/bin/env python3
"""
Fix 7: Swap Section 5 (Value) and Section 6 (Measurement Plan) in AIStrategyPage.tsx.
Section 6 is currently rendered before Section 5 — they need to be swapped.
After swapping, also fix the section numbers in the SectionDivider calls.
"""

with open("client/src/pages/dashboard/AIStrategyPage.tsx") as f:
    lines = f.readlines()

# Find section boundaries (0-indexed)
sec6_start = None
sec5_start = None
for i, line in enumerate(lines):
    if "SECTION 6" in line and "Measurement" in line:
        sec6_start = i
    if "SECTION 5" in line and "VALUE" in line:
        sec5_start = i

print(f"Section 6 block starts at line {sec6_start + 1}")
print(f"Section 5 block starts at line {sec5_start + 1}")

# Find the end of Section 5 (the methodology section comment ══)
sec5_end = None
for i in range(sec5_start, len(lines)):
    if "══" in lines[i] and i > sec5_start + 5:
        sec5_end = i
        break

print(f"Section 5 ends before line {sec5_end + 1}")

# Extract the three blocks:
# before_sec6: lines 0 to sec6_start-1
# sec6_block: lines sec6_start to sec5_start-1
# sec5_block: lines sec5_start to sec5_end-1
# after_sec5: lines sec5_end to end

before_sec6 = lines[:sec6_start]
sec6_block = lines[sec6_start:sec5_start]
sec5_block = lines[sec5_start:sec5_end]
after_sec5 = lines[sec5_end:]

print(f"Section 6 block: {len(sec6_block)} lines")
print(f"Section 5 block: {len(sec5_block)} lines")

# Swap: put sec5_block before sec6_block
# Also fix the section comment numbers and SectionDivider num props
def fix_section_num(block_lines, old_num, new_num):
    """Replace section number references in a block."""
    result = []
    for line in block_lines:
        # Fix the comment header: SECTION 5 → SECTION 6 or vice versa
        line = line.replace(f"SECTION {old_num} —", f"SECTION {new_num} —")
        line = line.replace(f"Section {old_num} —", f"Section {new_num} —")
        # Fix SectionDivider num prop: num="5" → num="6" etc.
        line = line.replace(f'num="{old_num}"', f'num="{new_num}"')
        # Fix eyebrow text: "Section 5 —" → "Section 6 —"
        line = line.replace(f'"Section {old_num} —', f'"Section {new_num} —')
        result.append(line)
    return result

# Section 5 (Value) was num="5", should stay num="5" — it moves earlier
# Section 6 (Measurement) was num="6", should become num="6" — it moves later
# But wait — the spec says the order should be:
# 1 Diagnostic → 2 Ambition → 3 Plan → 4 Investment & Risk → 5 Stakeholder & Change Plan → 6 Value → ...
# Currently: 1→2→3→4→[Section 6 Measurement]→[Section 5 Value]
# After swap: 1→2→3→4→[Section 5 Value]→[Section 6 Measurement]
# The numbers are already correct (5 and 6), just the order is wrong.
# So we just swap the blocks without renumbering.

new_lines = before_sec6 + sec5_block + sec6_block + after_sec5

with open("client/src/pages/dashboard/AIStrategyPage.tsx", "w") as f:
    f.writelines(new_lines)

print("\nSwapped Section 5 (Value) and Section 6 (Measurement Plan)")
print("Section 5 (Value) now renders before Section 6 (Measurement Plan)")

# Verify the new order
with open("client/src/pages/dashboard/AIStrategyPage.tsx") as f:
    new_content = f.read()

sec5_pos = new_content.find("SECTION 5")
sec6_pos = new_content.find("SECTION 6")
print(f"\nVerification:")
print(f"  Section 5 position: {sec5_pos}")
print(f"  Section 6 position: {sec6_pos}")
print(f"  Correct order (5 before 6): {sec5_pos < sec6_pos}")
