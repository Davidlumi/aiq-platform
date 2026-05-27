"""
Add function_scope field to content-library.json initiatives.
Maps from shared/initiativeLibrary.ts functionScope values.
"""
import json
import re

# Load content library
with open("server/content-library.json") as f:
    lib = json.load(f)

# Extract functionScope from initiativeLibrary.ts
scope_map = {}
with open("shared/initiativeLibrary.ts") as f:
    content = f.read()

# Find all id + functionScope pairs
# Pattern: id: "xxx" ... functionScope: "yyy"
blocks = re.split(r'\n  \{', content)
for block in blocks:
    id_match = re.search(r'id:\s*"([^"]+)"', block)
    scope_match = re.search(r'functionScope:\s*"([^"]+)"', block)
    if id_match:
        init_id = id_match.group(1)
        scope = scope_match.group(1) if scope_match else "both"
        scope_map[init_id] = scope

print(f"Extracted {len(scope_map)} initiative scopes from initiativeLibrary.ts")

# Now add function_scope to content-library.json initiatives
# The content library uses different IDs — they're descriptive names, not the same as initiativeLibrary IDs
# We need a mapping strategy. Let's check if any content library IDs match
content_inits = lib["initiatives"]
matched = 0
unmatched = []

for init_id, init_data in content_inits.items():
    # Try direct match
    if init_id in scope_map:
        init_data["function_scope"] = scope_map[init_id]
        matched += 1
    else:
        # Content library initiatives are general capability-building ones
        # Default to "both" since they're applicable to all modes
        init_data["function_scope"] = "both"
        unmatched.append(init_id)

print(f"Matched: {matched}, Defaulted to 'both': {len(unmatched)}")

# Bump version
old_version = lib["meta"]["version"]
parts = old_version.split(".")
parts[2] = str(int(parts[2]) + 1)
lib["meta"]["version"] = ".".join(parts)
lib["meta"]["git_sha"] = f"aiq-v{'.'.join(parts)}"
print(f"Version bumped: {old_version} -> {'.'.join(parts)}")

# Write back
with open("server/content-library.json", "w") as f:
    json.dump(lib, f, indent=2)

print("Done! content-library.json updated with function_scope field.")
