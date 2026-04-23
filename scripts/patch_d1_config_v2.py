path = "/home/ubuntu/aiq-platform/server/assessment/scoringConfig.ts"
with open(path, 'r') as f:
    content = f.read()

# Step 1: Add D1 fields to ActiveScoringConfig interface
old_interface = """  calibrationSource: string;
}"""
new_interface = """  calibrationSource: string;
  // D1: Configurable evidence sufficiency thresholds (previously MINIMUM_EVIDENCE in sessionController.ts)
  evidenceTotalItems: number;
  evidenceSignalsPerCapability: number;
  evidenceDistinctInteractionTypes: number;
  evidenceHighRiskProportion: number;
  evidenceTargetItems: number;
}"""

if old_interface in content:
    content = content.replace(old_interface, new_interface, 1)
    print("D1 interface: patched")
else:
    print("D1 interface: NOT FOUND")

# Step 2: Add D1 fields to DEFAULT_CONFIG
old_default = """  calibrationSource: "synthetic_default",
};"""
new_default = """  calibrationSource: "synthetic_default",
  // D1: defaults match the former MINIMUM_EVIDENCE compile-time constants exactly
  evidenceTotalItems: 20,
  evidenceSignalsPerCapability: 3,
  evidenceDistinctInteractionTypes: 5,
  evidenceHighRiskProportion: 0.25,
  evidenceTargetItems: 49,
};"""

if old_default in content:
    content = content.replace(old_default, new_default, 1)
    print("D1 default: patched")
else:
    print("D1 default: NOT FOUND")

# Step 3: Add D1 fields to the loader return object
old_loader = """        calibrationSource: row.calibrationSource,
      };"""
new_loader = """        calibrationSource: row.calibrationSource,
        // D1: evidence sufficiency thresholds
        evidenceTotalItems: row.evidenceTotalItems !== null && row.evidenceTotalItems !== undefined
          ? Number(row.evidenceTotalItems) : 20,
        evidenceSignalsPerCapability: row.evidenceSignalsPerCapability !== null && row.evidenceSignalsPerCapability !== undefined
          ? Number(row.evidenceSignalsPerCapability) : 3,
        evidenceDistinctInteractionTypes: row.evidenceDistinctInteractionTypes !== null && row.evidenceDistinctInteractionTypes !== undefined
          ? Number(row.evidenceDistinctInteractionTypes) : 5,
        evidenceHighRiskProportion: row.evidenceHighRiskProportion !== null && row.evidenceHighRiskProportion !== undefined
          ? parseFloat(row.evidenceHighRiskProportion as unknown as string) : 0.25,
        evidenceTargetItems: row.evidenceTargetItems !== null && row.evidenceTargetItems !== undefined
          ? Number(row.evidenceTargetItems) : 49,
      };"""

if old_loader in content:
    content = content.replace(old_loader, new_loader, 1)
    print("D1 loader: patched")
else:
    print("D1 loader: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
