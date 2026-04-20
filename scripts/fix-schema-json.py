"""Fix doubled json() wrapping in drizzle/schema.ts.

The previous sed replacement turned:
  json("col_name").notNull().default({})
into:
  json(json("col_name").$default(() => ({})))

This script fixes it back to:
  json("col_name").$default(() => ({}))
"""
import re

with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

# Pattern: json(json("col_name").$default(() => ({})))
# Fix to:  json("col_name").$default(() => ({}))
# Use a simple string replacement approach

# Count before
before = content.count('json(json(')
print(f'Before: {before} doubled json() occurrences')

# Replace json(json("...") with json("...")
# The pattern is: json(json("COLNAME").$default(() => ({})))
# We need to unwrap the outer json()

lines = content.split('\n')
fixed_lines = []
for line in lines:
    # Match: json(json("col_name").$default(() => ({})))
    # or:    json("event_codes_json").$default(() => ([]))
    # The doubled ones look like: json(json("col_name").$default(() => ({})))
    if 'json(json(' in line:
        # Remove the outer json( ... ) wrapper
        # Find: json(json("
        # Replace with: json("
        # But we need to also remove the trailing ) that closes the outer json(
        
        # Strategy: find json(json(" and replace with json("
        # then find the matching closing ) 
        
        # Simple approach: use regex
        fixed = re.sub(
            r'json\((json\("[^"]+"\)\.\$default\([^)]+\))\)',
            r'\1',
            line
        )
        # Also handle the array version: json(json("col").$default(() => ([])))
        fixed = re.sub(
            r'json\((json\("[^"]+"\)\.\$default\(\(\) => \(\[\]\)\))\)',
            r'\1',
            fixed
        )
        fixed_lines.append(fixed)
    else:
        fixed_lines.append(line)

content = '\n'.join(fixed_lines)

# Count after
after = content.count('json(json(')
print(f'After: {after} doubled json() occurrences')

with open('drizzle/schema.ts', 'w') as f:
    f.write(content)

print('Done')
