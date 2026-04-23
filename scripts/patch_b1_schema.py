path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# Add revisionCount and focusLossCount to submitAnswer z.object schema
old = "        deviceType: z.enum([\"desktop\", \"tablet\", \"mobile\"]).optional(),\n        browserType: z.string().max(40).optional(),\n        screenWidthPx: z.number().int().min(0).max(9999).optional(),\n      })\n    )\n    .mutation(async ({ input, ctx }) => {"
new = """        deviceType: z.enum(["desktop", "tablet", "mobile"]).optional(),
        browserType: z.string().max(40).optional(),
        screenWidthPx: z.number().int().min(0).max(9999).optional(),
        // B1: Behavioural telemetry — option revision count and focus loss count
        revisionCount: z.number().int().min(0).optional(),
        focusLossCount: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {"""

if old in content:
    content = content.replace(old, new, 1)
    print("B1 schema: patched")
else:
    print("B1 schema: NOT FOUND")

# Wire revisionCount and focusLossCount into the telemetry write
old_telem = "          revisionCount: 0,\n          focusLossCount: 0,"
new_telem = "          revisionCount: input.revisionCount ?? 0,\n          focusLossCount: input.focusLossCount ?? 0,"

if old_telem in content:
    content = content.replace(old_telem, new_telem, 1)
    print("B1 telemetry write: patched")
else:
    print("B1 telemetry write: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
