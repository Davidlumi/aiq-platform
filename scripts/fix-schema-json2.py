"""Fix doubled json() wrapping in drizzle/schema.ts."""

with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

count_before = content.count('json(json(')
print(f'Before: {count_before} doubled json() occurrences')

def fix_doubled_json(content):
    result = []
    i = 0
    n = len(content)
    while i < n:
        # Look for json(json(  — 10 chars
        if content[i:i+10] == 'json(json(':
            # Skip the outer 'json(' (5 chars), keep the inner expression
            inner_start = i + 5  # points to 'json("...'
            
            # Find the end of the inner expression by counting parens
            # The inner expression ends when we hit depth==-1 (the outer closing paren)
            depth = 0
            j = inner_start
            while j < n:
                if content[j] == '(':
                    depth += 1
                elif content[j] == ')':
                    if depth == 0:
                        # This ) closes the outer json(
                        inner_expr = content[inner_start:j]
                        result.append(inner_expr)
                        i = j + 1
                        break
                    depth -= 1
                j += 1
            else:
                result.append(content[i])
                i += 1
        else:
            result.append(content[i])
            i += 1
    return ''.join(result)

fixed = fix_doubled_json(content)
count_after = fixed.count('json(json(')
print(f'After: {count_after} doubled json() occurrences')

with open('drizzle/schema.ts', 'w') as f:
    f.write(fixed)

print('Done')
