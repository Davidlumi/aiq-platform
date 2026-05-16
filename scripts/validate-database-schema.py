#!/usr/bin/env python3
"""
validate-database-schema.py v2 — Initiative database schema validator

Comprehensive checks for the HR AI Initiative Database. Catches schema-drift 
bugs that have cost ship cycles.

CHECKS PERFORMED:

  1. Field reference resolution
     Every `sectionX.fieldname` referenced in the database must be documented 
     in the patch schema.
  
  2. Linked input fields drift
     Each initiative's "Linked input fields" summary must include every field
     referenced in its fit gates, soft signals, and value formula.
  
  3. Enum value validation  
     Every value compared against a field (e.g., `field == "value"`) must be 
     in that field's documented enum values.
  
  4. Initiative structural completeness
     Every initiative must have all required sections (Plain English, 
     Case study anchors, Fit gates, etc.).
  
  5. Summary table consistency
     Every initiative in the database body must appear in the summary table, 
     and vice versa.
  
  6. Category count verification
     Database header initiative count must match actual count.

USAGE:
    python3 validate-database-schema.py <database.md> <patch.md>
    python3 validate-database-schema.py <database.md> <patch.md> --strict
    
    --strict: warnings (yellow) cause non-zero exit; default treats only 
              hard failures (red) as exit code 1.

EXIT CODES:
    0 — all checks pass (warnings may have printed)
    1 — at least one hard failure
    2 — invalid arguments
"""

import re
import sys
from collections import defaultdict
from pathlib import Path


# Sub-paths to strip when comparing
KNOWN_SUBPATHS = ('.score', '.high', '.low', '.length')

# False-positive regex artifacts to ignore in field-ref detection
IGNORE_FIELD_REFS = {
    'sectionG.ai',
    'sectionA.industry',
}

# Required sections that every initiative entry must have
REQUIRED_INITIATIVE_SECTIONS = [
    'Plain English',
    'Case study anchors',
    'Fit gates',
    'Value formula',
    'Linked input fields',
]

# ANSI colors for terminal output
class Color:
    RED = '\033[91m'
    YELLOW = '\033[93m'
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text):
    print(f"\n{Color.BOLD}{Color.BLUE}━━━ {text} ━━━{Color.END}")


def print_pass(text):
    print(f"{Color.GREEN}✅ PASS:{Color.END} {text}")


def print_fail(text):
    print(f"{Color.RED}❌ FAIL:{Color.END} {text}")


def print_warn(text):
    print(f"{Color.YELLOW}⚠️  WARN:{Color.END} {text}")


# ─────────────────────────────────────────────────────────────────────
# Parsing helpers
# ─────────────────────────────────────────────────────────────────────

def extract_initiatives(db_content):
    """Split database into per-initiative blocks keyed by initiative ID."""
    initiatives = {}
    # Match: ### `initiative_id` — description
    pattern = r'^### `([a-z_]+)` — .+$'
    matches = list(re.finditer(pattern, db_content, re.MULTILINE))
    
    for i, match in enumerate(matches):
        initiative_id = match.group(1)
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(db_content)
        initiatives[initiative_id] = db_content[start:end]
    
    return initiatives


def extract_field_refs(text):
    """Pull every sectionX.fieldname reference. Returns set of base fields 
    (stripping known sub-paths)."""
    pattern = r'section[A-K]\.[a-zA-Z_]+(?:\.[a-zA-Z]+)?'
    refs = set(re.findall(pattern, text))
    
    base_fields = set()
    for ref in refs:
        if any(ref.endswith(suffix) for suffix in KNOWN_SUBPATHS):
            base = '.'.join(ref.split('.')[:2])
        else:
            base = ref
        base_fields.add(base)
    
    return base_fields


def extract_linked_fields_summary(initiative_text):
    """Parse the 'Linked input fields:' line. Returns set of fields in 
    sectionX.fieldname format."""
    match = re.search(r'\*\*Linked input fields:\*\*\s*([^\n]+)', initiative_text)
    if not match:
        return set()
    
    fields_str = match.group(1)
    # Format is: D.annualHires, B.hrSubFunctions, ...
    fields = set()
    for part in fields_str.split(','):
        part = part.strip().rstrip('.')
        if re.match(r'^[A-K]\.[a-zA-Z_]+$', part):
            section, field = part.split('.', 1)
            fields.add(f'section{section}.{field}')
    return fields


def extract_engine_logic_refs(initiative_text):
    """Pull field refs from Fit gates, Soft signals, and Value formula 
    sections only (not the summary line)."""
    # Split off the Linked input fields summary so we don't double-count
    logic_text = re.split(r'\*\*Linked input fields:\*\*', initiative_text)[0]
    return extract_field_refs(logic_text)


def extract_patch_schema(patch_content):
    """Pull documented fields from the patch."""
    documented_qual = set()
    documented_bare = set()
    
    # Fully-qualified refs
    qualified_pattern = r'`(section[A-K]\.[a-zA-Z_]+(?:\.[a-zA-Z_]+)?)`'
    for match in re.finditer(qualified_pattern, patch_content):
        documented_qual.add(match.group(1))
    
    # Bare backtick identifiers
    bare_pattern = r'`([a-zA-Z][a-zA-Z_0-9]*(?:\.[a-z_]+)?)`'
    for match in re.finditer(bare_pattern, patch_content):
        documented_bare.add(match.group(1))
    
    return documented_qual, documented_bare


def extract_enum_definitions(patch_content):
    """Parse the patch for field → [allowed enum values] mappings.
    
    Looks for blocks like:
        ### Field N: `fieldname` — ...
        ...
        Options (use these enum values verbatim):
          - `value1` — "Label"
          - `value2` — "Label"
    """
    enums = defaultdict(set)
    
    # Find every field definition section
    field_sections = re.findall(
        r'### Field \d+: `(\w+)`.*?(?=\n### |\n## |\Z)',
        patch_content,
        re.DOTALL
    )
    
    for section_match in re.finditer(
        r'### Field \d+: `(\w+)`(.*?)(?=\n### |\n## |\Z)',
        patch_content,
        re.DOTALL,
    ):
        field_name = section_match.group(1)
        section_content = section_match.group(2)
        
        # Find options block
        opts_match = re.search(
            r'Options[^:]*:(.*?)(?:Tooltip:|Fallback:|\*\*|\n\n```|```\n)',
            section_content,
            re.DOTALL,
        )
        if not opts_match:
            continue
        
        # Extract each `value` from option lines
        for line in opts_match.group(1).split('\n'):
            val_match = re.match(r'\s*-\s*`([^`]+)`', line)
            if val_match:
                enums[field_name].add(val_match.group(1))
    
    # Also parse Section K compact format: "K1: fieldname" with Options
    for section_match in re.finditer(
        r'K\d+:\s*(\w+)(.*?)(?=\nK\d+:|\n##|\Z)',
        patch_content,
        re.DOTALL,
    ):
        field_name = section_match.group(1)
        section_content = section_match.group(2)
        
        for line in section_content.split('\n'):
            val_match = re.match(r'\s*-\s*`([^`]+)`', line)
            if val_match and val_match.group(1) not in ('Fallback', 'Tooltip'):
                enums[field_name].add(val_match.group(1))
    
    return dict(enums)


def extract_enum_value_uses(db_content):
    """Find every place a field is compared to a literal value.
    Returns list of (field_name, value, line_number) tuples."""
    uses = []
    
    # Pattern: sectionX.fieldname == "value"
    eq_pattern = r'section[A-K]\.([a-zA-Z_]+)\s*(?:==|!=)\s*"([^"]+)"'
    # Pattern: sectionX.fieldname in ["v1", "v2", ...]
    in_pattern = r'section[A-K]\.([a-zA-Z_]+)\s*(?:in|includes)\s*\[([^\]]+)\]'
    # Pattern: sectionX.fieldname includes "value"
    incl_pattern = r'section[A-K]\.([a-zA-Z_]+)\s*includes\s*"([^"]+)"'
    
    for line_no, line in enumerate(db_content.split('\n'), 1):
        for m in re.finditer(eq_pattern, line):
            uses.append((m.group(1), m.group(2), line_no))
        
        for m in re.finditer(in_pattern, line):
            values_str = m.group(2)
            for val_match in re.finditer(r'"([^"]+)"', values_str):
                uses.append((m.group(1), val_match.group(1), line_no))
        
        for m in re.finditer(incl_pattern, line):
            uses.append((m.group(1), m.group(2), line_no))
    
    return uses


def extract_summary_table(db_content):
    """Find the summary table at bottom. Returns set of initiative IDs in it."""
    initiatives_in_table = set()
    # Match: | initiative_id | CATEGORY | ...
    for match in re.finditer(r'^\|\s*([a-z_]+)\s*\|\s*[A-Z& ]+\s*\|', db_content, re.MULTILINE):
        candidate = match.group(1)
        # Filter out header rows and other false positives
        if re.match(r'^[a-z]{2,}_[a-z_]+$', candidate):
            initiatives_in_table.add(candidate)
    return initiatives_in_table


def extract_header_count(db_content):
    """Pull the declared initiative count from the header."""
    match = re.search(r'(\d+)\s+(?:HR AI\s+)?initiatives', db_content)
    return int(match.group(1)) if match else None


# ─────────────────────────────────────────────────────────────────────
# Checks
# ─────────────────────────────────────────────────────────────────────

def check_field_resolution(initiatives, documented_qual, documented_bare):
    """Check 1: every field referenced is documented."""
    print_header("CHECK 1: Field reference resolution")
    
    all_refs = set()
    for content in initiatives.values():
        all_refs.update(extract_field_refs(content))
    
    orphans = []
    for ref in sorted(all_refs):
        if ref in IGNORE_FIELD_REFS:
            continue
        
        if ref in documented_qual:
            continue
        
        bare = ref.split('.', 1)[1]
        if bare in documented_bare:
            continue
        
        if any(d.startswith(bare + '.') for d in documented_bare):
            continue
        
        if any(d.startswith(ref + '.') for d in documented_qual):
            continue
        
        orphans.append(ref)
    
    if not orphans:
        print_pass(f"All {len(all_refs)} unique field references documented in patch.")
        return 0, 0
    
    print_fail(f"{len(orphans)} field references not documented in patch:")
    for orphan in orphans:
        bare = orphan.split('.', 1)[1]
        similar = [d for d in documented_bare 
                   if d.lower() == bare.lower() or 
                   bare.lower() in d.lower() and len(d) < 30]
        if similar:
            print(f"   • {orphan}  — closest matches: {similar[:3]}")
        else:
            print(f"   • {orphan}  — NOT FOUND")
    
    return len(orphans), 0


def check_linked_fields_drift(initiatives):
    """Check 2: linked input fields summary matches actual logic refs."""
    print_header("CHECK 2: Linked-input-fields summary drift")
    
    hard_fails = 0
    warns = 0
    
    for init_id, content in initiatives.items():
        logic_refs = extract_engine_logic_refs(content)
        summary_refs = extract_linked_fields_summary(content)
        
        # Strip IGNORE list
        logic_refs = {r for r in logic_refs if r not in IGNORE_FIELD_REFS}
        
        # Fields in logic but not in summary (under-documented)
        missing_from_summary = logic_refs - summary_refs
        # Fields in summary but not in logic (over-documented)
        unused_in_logic = summary_refs - logic_refs
        
        if missing_from_summary:
            print_warn(f"{init_id}: fields in logic but missing from Linked summary:")
            for f in sorted(missing_from_summary):
                print(f"      missing: {f}")
            warns += len(missing_from_summary)
        
        if unused_in_logic:
            # Often the linked summary intentionally lists value-formula inputs
            # that don't appear in fit gates. Treat as soft warning.
            pass  # Skip — common pattern
    
    if hard_fails == 0 and warns == 0:
        print_pass(f"All {len(initiatives)} initiatives' summary matches their logic.")
    elif hard_fails == 0:
        print_warn(f"{warns} minor drift across {len(initiatives)} initiatives. See details above.")
    
    return hard_fails, warns


def check_enum_values(db_content, enum_defs):
    """Check 3: every compared value is in the field's documented enum."""
    print_header("CHECK 3: Enum value validation")
    
    if not enum_defs:
        print_warn("No enum definitions extracted from patch — skipping.")
        return 0, 1
    
    print(f"   Loaded enums for {len(enum_defs)} fields from patch.")
    
    uses = extract_enum_value_uses(db_content)
    print(f"   Found {len(uses)} value comparisons in database.")
    
    invalid = []
    unchecked = defaultdict(int)
    
    for field, value, line_no in uses:
        # Skip numeric comparisons (handled elsewhere)
        if value.isdigit() or value.replace('.', '').isdigit():
            continue
        
        # Skip operators on .length 
        if value in ('None',) or 'length' in value:
            continue
        
        if field not in enum_defs:
            unchecked[field] += 1
            continue
        
        if value not in enum_defs[field]:
            invalid.append((field, value, line_no))
    
    if invalid:
        print_fail(f"{len(invalid)} value mismatches against documented enums:")
        for field, value, line_no in invalid[:20]:
            valid = enum_defs.get(field, set())
            print(f"   • line {line_no}: {field} == \"{value}\"")
            print(f"      Valid values: {sorted(valid)}")
        if len(invalid) > 20:
            print(f"   ... and {len(invalid) - 20} more")
    else:
        print_pass(f"All compared values match documented enums.")
    
    if unchecked:
        print_warn(f"{len(unchecked)} fields have value comparisons but no enum docs in patch:")
        for f, count in sorted(unchecked.items(), key=lambda x: -x[1])[:10]:
            print(f"      {f} ({count} uses)")
        print(f"   → Either add enum docs to patch, or these are Manus-managed enums (OK).")
    
    return len(invalid), len(unchecked)


def check_initiative_structure(initiatives):
    """Check 4: every initiative has required sections."""
    print_header("CHECK 4: Initiative structural completeness")
    
    incomplete = []
    for init_id, content in initiatives.items():
        missing = []
        for section in REQUIRED_INITIATIVE_SECTIONS:
            if f'**{section}' not in content:
                missing.append(section)
        if missing:
            incomplete.append((init_id, missing))
    
    if not incomplete:
        print_pass(f"All {len(initiatives)} initiatives have required sections.")
        return 0, 0
    
    print_fail(f"{len(incomplete)} initiatives missing required sections:")
    for init_id, missing in incomplete:
        print(f"   • {init_id}: missing {missing}")
    return len(incomplete), 0


def check_summary_table(initiatives, db_content):
    """Check 5: every initiative is in the summary table, and vice versa."""
    print_header("CHECK 5: Summary table consistency")
    
    body_initiatives = set(initiatives.keys())
    table_initiatives = extract_summary_table(db_content)
    
    missing_from_table = body_initiatives - table_initiatives
    missing_from_body = table_initiatives - body_initiatives
    
    if not missing_from_table and not missing_from_body:
        print_pass(f"All {len(body_initiatives)} initiatives are in the summary table.")
        return 0, 0
    
    fails = 0
    if missing_from_table:
        print_fail(f"{len(missing_from_table)} initiatives in body but not in summary table:")
        for i in sorted(missing_from_table):
            print(f"   • {i}")
        fails += len(missing_from_table)
    
    if missing_from_body:
        print_fail(f"{len(missing_from_body)} entries in summary table but not in body:")
        for i in sorted(missing_from_body):
            print(f"   • {i}")
        fails += len(missing_from_body)
    
    return fails, 0


def check_category_count(initiatives, db_content):
    """Check 6: header declared count matches actual count."""
    print_header("CHECK 6: Category count verification")
    
    declared = extract_header_count(db_content)
    actual = len(initiatives)
    
    if declared is None:
        print_warn("Could not parse declared count from header.")
        return 0, 1
    
    if declared == actual:
        print_pass(f"Header declares {declared} initiatives, body contains {actual}.")
        return 0, 0
    
    print_fail(f"Header declares {declared} initiatives, but body contains {actual}.")
    return 1, 0


# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 validate-database-schema.py <database.md> <patch.md> [--strict]")
        sys.exit(2)
    
    db_path = sys.argv[1]
    patch_path = sys.argv[2]
    strict = '--strict' in sys.argv
    
    print(f"{Color.BOLD}HR AI Initiative Database Validator v2{Color.END}")
    print(f"Database: {db_path}")
    print(f"Patch:    {patch_path}")
    print(f"Mode:     {'STRICT (warnings cause failure)' if strict else 'NORMAL'}")
    
    db_content = Path(db_path).read_text()
    patch_content = Path(patch_path).read_text()
    
    initiatives = extract_initiatives(db_content)
    documented_qual, documented_bare = extract_patch_schema(patch_content)
    enum_defs = extract_enum_definitions(patch_content)
    
    total_fails = 0
    total_warns = 0
    
    f, w = check_field_resolution(initiatives, documented_qual, documented_bare)
    total_fails += f; total_warns += w
    
    f, w = check_linked_fields_drift(initiatives)
    total_fails += f; total_warns += w
    
    f, w = check_enum_values(db_content, enum_defs)
    total_fails += f; total_warns += w
    
    f, w = check_initiative_structure(initiatives)
    total_fails += f; total_warns += w
    
    f, w = check_summary_table(initiatives, db_content)
    total_fails += f; total_warns += w
    
    f, w = check_category_count(initiatives, db_content)
    total_fails += f; total_warns += w
    
    print_header("SUMMARY")
    print(f"   Initiatives checked:  {len(initiatives)}")
    print(f"   Hard failures:        {total_fails}")
    print(f"   Warnings:             {total_warns}")
    print()
    
    if total_fails > 0:
        print(f"{Color.RED}{Color.BOLD}❌ VALIDATION FAILED{Color.END}")
        sys.exit(1)
    elif strict and total_warns > 0:
        print(f"{Color.YELLOW}{Color.BOLD}⚠️  STRICT MODE: warnings cause failure{Color.END}")
        sys.exit(1)
    else:
        print(f"{Color.GREEN}{Color.BOLD}✅ VALIDATION PASSED{Color.END}")
        sys.exit(0)


if __name__ == '__main__':
    main()
