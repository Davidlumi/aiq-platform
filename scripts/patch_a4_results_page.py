path = "/home/ubuntu/aiq-platform/client/src/pages/assessment/AssessmentResultsPage.tsx"
with open(path, 'r') as f:
    content = f.read()

# A4: Add governanceAction and governingConstraint extraction after classificationConfidence
old = "  const stateConfig = READINESS_CONFIG[primaryState] ?? READINESS_CONFIG.unknown;"
new = """  // A4: Governance action and governing constraint
  const governanceAction = (breakdown.governanceAction ?? null) as string | null;
  const governingConstraint = (breakdown.governingConstraint ?? null) as {
    capability: string; score: number; band: string; thresholdRequired: number; gap: number; droveClassification: boolean;
  } | null;
  const stateConfig = READINESS_CONFIG[primaryState] ?? READINESS_CONFIG.unknown;"""

if old in content:
    content = content.replace(old, new, 1)
    print("A4 extraction: patched")
else:
    print("A4 extraction: NOT FOUND")

# A4: Add governance action banner just before the UX-3 score summary
old = """          {/* UX-3: Score Summary - actual question count with early-completion label */}"""
new = """          {/* A4: Governance Action Banner */}
          {governanceAction && (
            <Card className={`border-l-4 ${governanceAction === "development_required" ? "border-l-[#EF4444] bg-[#EF4444]/5" : "border-l-[#F59E0B] bg-[#F59E0B]/5"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`w-5 h-5 mt-0.5 flex-shrink-0 ${governanceAction === "development_required" ? "text-[#EF4444]" : "text-[#F59E0B]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground font-sora mb-1">
                      {governanceAction === "development_required" ? "Development Required Before Independent AI Use" : "Supervised AI Use Recommended"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {governanceAction === "development_required"
                        ? "Your current capability profile indicates significant gaps that should be addressed through structured development before independent AI deployment."
                        : "Your capability profile supports AI use with appropriate oversight. A line manager or governance lead should review AI outputs in high-stakes decisions."}
                    </p>
                    {governingConstraint && governingConstraint.droveClassification && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Flag className="w-3 h-3 flex-shrink-0" />
                        Governing constraint: <span className="font-medium text-foreground capitalize">{governingConstraint.capability.replace(/_/g, " ")}</span>
                        {" "}(score {Math.round(governingConstraint.score)}, threshold {Math.round(governingConstraint.thresholdRequired)}, gap {Math.round(governingConstraint.gap)} points)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* UX-3: Score Summary - actual question count with early-completion label */}"""

if old in content:
    content = content.replace(old, new, 1)
    print("A4 banner: patched")
else:
    print("A4 banner: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
