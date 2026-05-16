#!/usr/bin/env python3
"""Add fieldErr error messages for the new v4.2 Launch-tier required fields."""

with open("client/src/pages/strategy/StrategyDiagnosticPage.tsx", "r") as f:
    content = f.read()

replacements = [
    # 1. workforceComposition — add fieldErr after </Select> before businessDirectionType
    (
        '                  </SelectContent>\n                </Select>\n              </div>\n              <div className="space-y-2">\n                <Label>Business direction type',
        '                  </SelectContent>\n                </Select>\n                {fieldErr("I", !getFieldI("workforceComposition")) && <p className="text-destructive text-xs mt-1">Please select workforce composition</p>}\n              </div>\n              <div className="space-y-2">\n                <Label>Business direction type',
    ),
    # 2. skillsFrameworkStatus — add fieldErr after </Select> before Skills inventory completeness
    (
        '                  </SelectContent>\n                </Select>\n              </div>\n              <div className="space-y-2">\n                <Label>Skills inventory completeness',
        '                  </SelectContent>\n                </Select>\n                {fieldErr("I", !getFieldI("skillsFrameworkStatus")) && <p className="text-destructive text-xs mt-1">Please select skills framework maturity</p>}\n              </div>\n              <div className="space-y-2">\n                <Label>Skills inventory completeness',
    ),
    # 3. performanceReviewCadence — add fieldErr after </Select> before HR helpdesk model
    (
        '                  </SelectContent>\n                </Select>\n              </div>\n              <div className="space-y-2">\n                <Label>HR helpdesk model',
        '                  </SelectContent>\n                </Select>\n                {fieldErr("K", !getFieldK("performanceReviewCadence")) && <p className="text-destructive text-xs mt-1">Please select performance review cadence</p>}\n              </div>\n              <div className="space-y-2">\n                <Label>HR helpdesk model',
    ),
    # 4. yearsOfHrisData — add fieldErr after the select (already has aria-invalid, add text message)
    (
        '                    <SelectItem value="unknown">Unknown</SelectItem>\n                  </SelectContent>\n                </Select>\n              </div>\n              <div className="space-y-2">\n                <Label>Workforce digital access',
        '                    <SelectItem value="unknown">Unknown</SelectItem>\n                  </SelectContent>\n                </Select>\n                {fieldErr("C", !getField("C", "yearsOfHrisData")) && <p className="text-destructive text-xs mt-1">Please select years of HRIS data</p>}\n              </div>\n              <div className="space-y-2">\n                <Label>Workforce digital access',
    ),
    # 5. workforceDigitalAccess — add fieldErr after the select
    (
        '                    <SelectItem value="limited">Limited \u2014 significant portion have no digital access</SelectItem>\n                  </SelectContent>\n                </Select>\n              </div>\n            </div>\n          )}\n          {/* \u2500\u2500 Section D',
        '                    <SelectItem value="limited">Limited \u2014 significant portion have no digital access</SelectItem>\n                  </SelectContent>\n                </Select>\n                {fieldErr("C", !getField("C", "workforceDigitalAccess")) && <p className="text-destructive text-xs mt-1">Please select workforce digital access level</p>}\n              </div>\n            </div>\n          )}\n          {/* \u2500\u2500 Section D',
    ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        print(f"  Applied: {old[:60].strip()!r}")
    else:
        print(f"  MISS: {old[:60].strip()!r}")

with open("client/src/pages/strategy/StrategyDiagnosticPage.tsx", "w") as f:
    f.write(content)

print("\nDone.")
