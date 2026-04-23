path = "/home/ubuntu/aiq-platform/server/assessment/scoringConfig.ts"
with open(path, 'r') as f:
    content = f.read()

# Add D1 fields to ActiveScoringConfig interface
old_interface_end = """  // WS1.2 Item 1: Configurable scoring constants
  baseFailureThresholdMagnitude: number;
  catastrophicMarginMultiplier: number;
  atRiskConfidenceFloor: number;
  provisionalConfidenceThreshold: number;
  confidenceFloor: number;
  minimumSafeClassificationConfidence: number;
}"""

new_interface_end = """  // WS1.2 Item 1: Configurable scoring constants
  baseFailureThresholdMagnitude: number;
  catastrophicMarginMultiplier: number;
  atRiskConfidenceFloor: number;
  provisionalConfidenceThreshold: number;
  confidenceFloor: number;
  minimumSafeClassificationConfidence: number;
  // D1: Configurable evidence sufficiency thresholds
  evidenceTotalItems: number;
  evidenceSignalsPerCapability: number;
  evidenceDistinctInteractionTypes: number;
  evidenceHighRiskProportion: number;
  evidenceTargetItems: number;
}"""

if old_interface_end in content:
    content = content.replace(old_interface_end, new_interface_end, 1)
    print("D1 interface: patched")
else:
    print("D1 interface: NOT FOUND")

# Add D1 fields to the loader return object
old_loader_end = """    baseFailureThresholdMagnitude: Number(row.baseFailureThresholdMagnitude),
    catastrophicMarginMultiplier: Number(row.catastrophicMarginMultiplier),
    atRiskConfidenceFloor: Number(row.atRiskConfidenceFloor),
    provisionalConfidenceThreshold: Number(row.provisionalConfidenceThreshold),
    confidenceFloor: Number(row.confidenceFloor),
    minimumSafeClassificationConfidence: Number(row.minimumSafeClassificationConfidence),
  };"""

new_loader_end = """    baseFailureThresholdMagnitude: Number(row.baseFailureThresholdMagnitude),
    catastrophicMarginMultiplier: Number(row.catastrophicMarginMultiplier),
    atRiskConfidenceFloor: Number(row.atRiskConfidenceFloor),
    provisionalConfidenceThreshold: Number(row.provisionalConfidenceThreshold),
    confidenceFloor: Number(row.confidenceFloor),
    minimumSafeClassificationConfidence: Number(row.minimumSafeClassificationConfidence),
    // D1: Evidence sufficiency thresholds
    evidenceTotalItems: Number(row.evidenceTotalItems),
    evidenceSignalsPerCapability: Number(row.evidenceSignalsPerCapability),
    evidenceDistinctInteractionTypes: Number(row.evidenceDistinctInteractionTypes),
    evidenceHighRiskProportion: Number(row.evidenceHighRiskProportion),
    evidenceTargetItems: Number(row.evidenceTargetItems),
  };"""

if old_loader_end in content:
    content = content.replace(old_loader_end, new_loader_end, 1)
    print("D1 loader: patched")
else:
    print("D1 loader: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
