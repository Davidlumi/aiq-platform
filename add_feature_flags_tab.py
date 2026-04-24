"""
Script to add Feature Flags tab to BackOfficePage.tsx
"""
with open('client/src/pages/backoffice/BackOfficePage.tsx', 'r') as f:
    content = f.read()

# 1. Add "Toggle" to lucide-react imports
old_icons = "  Trash2,\n} from \"lucide-react\";"
new_icons = "  Trash2,\n  ToggleLeft,\n  ToggleRight,\n  Info,\n} from \"lucide-react\";"
content = content.replace(old_icons, new_icons, 1)

# 2. Update Tab type to include "feature_flags"
old_type = 'type Tab = "dashboard" | "orgs" | "users" | "beta" | "reasoning" | "gaming" | "llm_queue" | "session_flags";'
new_type = 'type Tab = "dashboard" | "orgs" | "users" | "beta" | "reasoning" | "gaming" | "llm_queue" | "session_flags" | "feature_flags";'
content = content.replace(old_type, new_type, 1)

# 3. Add FeatureFlagsTab component before the Main Back-Office Page section
feature_flags_tab = '''// ─── TD-3: Feature Flags Tab ─────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  quality:    { label: "Quality",    color: "#6366F1" },
  integrity:  { label: "Integrity",  color: "#EF4444" },
  ux:         { label: "UX",         color: "#10B981" },
  assessment: { label: "Assessment", color: "#F59E0B" },
};
function FeatureFlagsTab() {
  const { data: flags, isLoading } = trpc.backoffice.getFeatureFlags.useQuery();
  const grouped: Record<string, typeof flags> = {};
  if (flags) {
    for (const f of flags) {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category]!.push(f);
    }
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Feature Flags</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Platform feature flags are controlled via environment variables. This view shows the current runtime state.
        </p>
      </div>
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Feature flags are read-only from this interface. To change a flag, update the corresponding environment variable in the platform settings and redeploy.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !flags?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <ToggleLeft className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No feature flags found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
            const cat = CATEGORY_LABELS[category] ?? { label: category, color: "#6B7280" };
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: cat.color }}>
                    {cat.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {items?.map((flag: any) => (
                    <div key={flag.key} className="border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{flag.label}</p>
                          {flag.defaultOn !== flag.enabled && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                              Non-default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        <p className="text-xs font-mono text-muted-foreground/60 mt-1.5">{flag.key}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {flag.enabled ? (
                          <>
                            <ToggleRight className="w-6 h-6 text-[#10B981]" />
                            <span className="text-xs font-medium text-[#10B981]">Enabled</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Disabled</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''

# Insert before the Main Back-Office Page section
old_main = '// ─── Main Back-Office Page ────────────────────────────────────────────────────'
content = content.replace(old_main, feature_flags_tab + old_main, 1)

# 4. Add "feature_flags" to the tabs array
old_tabs_entry = '    { id: "session_flags", label: "Session Flags",       icon: Flag },'
new_tabs_entry = '    { id: "session_flags", label: "Session Flags",       icon: Flag },\n    { id: "feature_flags",  label: "Feature Flags",       icon: ToggleLeft },'
content = content.replace(old_tabs_entry, new_tabs_entry, 1)

# 5. Add tab content render
old_render = '      {tab === "session_flags"   && <SessionFlagsTab />}'
new_render = '      {tab === "session_flags"   && <SessionFlagsTab />}\n      {tab === "feature_flags"   && <FeatureFlagsTab />}'
content = content.replace(old_render, new_render, 1)

with open('client/src/pages/backoffice/BackOfficePage.tsx', 'w') as f:
    f.write(content)

print('Done. Lines:', content.count('\n'))
