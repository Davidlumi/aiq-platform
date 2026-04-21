/**
 * Adaptive Intelligence Layer — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          executiveSummary: "Test summary",
          persistentStrengths: ["Strength 1"],
          persistentRisks: ["Risk 1"],
          developmentRecommendations: ["Recommendation 1"],
          primaryPersona: "strong_validator",
          personaConfidence: 0.8,
          validationOrientation: 8,
          governanceOrientation: 7,
          riskOrientation: 6,
          communicationOrientation: 7,
          narrativeSummary: "Test narrative",
          blindAcceptancePattern: false,
          governanceBypassPattern: false,
          overCautiousPattern: false,
        }),
      },
    }],
  }),
}));

// ─── Adaptive Difficulty Engine v2 ───────────────────────────────────────────

import {
  difficultyProfileToSimulationConfig,
  type DifficultyProfile,
  type SimulationPerformance,
} from "./ail/adaptiveDifficultyEngineV2";

describe("AdaptiveDifficultyEngineV2", () => {
  describe("difficultyProfileToSimulationConfig", () => {
    it("converts a default profile to moderate simulation config", () => {
      const profile: DifficultyProfile = {
        signalClarity: 4,
        ambiguity: 2,
        politicalComplexity: 2,
        informationalCompleteness: 4,
        timePressure: 2,
        consequenceVisibility: 4,
      };

      const config = difficultyProfileToSimulationConfig(profile);

      expect(config.aiErrorSubtlety).toBe("moderate");
      expect(config.numberOfDefensibleAnswers).toBe(1);
      expect(config.stakeholderPressureLevel).toBe("moderate");
      expect(config.dataCompleteness).toBe("mostly_complete");
      expect(config.hasDeadline).toBe(true);
      expect(config.deadlineUrgency).toBe("days");
      expect(config.consequencesExplained).toBe(true);
    });

    it("converts a maximum difficulty profile correctly", () => {
      const profile: DifficultyProfile = {
        signalClarity: 1,
        ambiguity: 5,
        politicalComplexity: 5,
        informationalCompleteness: 1,
        timePressure: 5,
        consequenceVisibility: 1,
      };

      const config = difficultyProfileToSimulationConfig(profile);

      expect(config.aiErrorSubtlety).toBe("expert_only");
      expect(config.numberOfDefensibleAnswers).toBe(3);
      expect(config.stakeholderPressureLevel).toBe("maximum");
      expect(config.dataCompleteness).toBe("incomplete");
      expect(config.hasDeadline).toBe(true);
      expect(config.deadlineUrgency).toBe("minutes");
      expect(config.consequencesExplained).toBe(false);
    });

    it("converts a minimum difficulty profile correctly", () => {
      const profile: DifficultyProfile = {
        signalClarity: 5,
        ambiguity: 1,
        politicalComplexity: 1,
        informationalCompleteness: 5,
        timePressure: 1,
        consequenceVisibility: 5,
      };

      const config = difficultyProfileToSimulationConfig(profile);

      expect(config.aiErrorSubtlety).toBe("obvious");
      expect(config.numberOfDefensibleAnswers).toBe(1);
      expect(config.stakeholderPressureLevel).toBe("low");
      expect(config.dataCompleteness).toBe("complete");
      expect(config.hasDeadline).toBe(false);
      expect(config.deadlineUrgency).toBeNull();
      expect(config.consequencesExplained).toBe(true);
    });
  });
});

// ─── Emotional Dynamics Layer ─────────────────────────────────────────────────

import {
  computeEmotionalStateTransition,
  generateEmotionalFramingText,
  type EmotionalState,
  type StakeholderBehaviourProfile,
} from "./ail/emotionalDynamicsLayer";

describe("EmotionalDynamicsLayer", () => {
  describe("computeEmotionalStateTransition", () => {
    it("moves collaborative → pressured on negative delta", () => {
      const result = computeEmotionalStateTransition("collaborative", -2, false, false);
      expect(result).toBe("pressured");
    });

    it("moves pressured → collaborative on positive delta with good comms", () => {
      const result = computeEmotionalStateTransition("pressured", 2, true, true);
      expect(result).toBe("collaborative");
    });

    it("moves frustrated → confident on negative delta", () => {
      const result = computeEmotionalStateTransition("frustrated", -2, false, false);
      expect(result).toBe("confident");
    });

    it("moves frustrated → pressured on positive delta with good comms", () => {
      const result = computeEmotionalStateTransition("frustrated", 2, true, true);
      expect(result).toBe("pressured");
    });

    it("moves collaborative → defensive when stood firm but communicated poorly", () => {
      const result = computeEmotionalStateTransition("collaborative", 0, true, false);
      expect(result).toBe("defensive");
    });

    it("keeps confident at confident on negative delta (already maximum adversarial)", () => {
      const result = computeEmotionalStateTransition("confident", -2, false, false);
      expect(result).toBe("confident");
    });

    it("returns same state when delta is neutral and no pressure", () => {
      const result = computeEmotionalStateTransition("collaborative", 0, false, false);
      expect(result).toBe("collaborative");
    });
  });

  describe("generateEmotionalFramingText", () => {
    it("generates framing text for a confident stakeholder", () => {
      const profile: StakeholderBehaviourProfile = {
        stakeholderId: "cfo-001",
        stakeholderName: "James Whitfield",
        stakeholderRole: "CFO",
        currentEmotionalState: "confident",
        trustLevel: "low",
        relationshipScore: -2,
        behaviourModifiers: {
          pressureIntensity: "maximum",
          willEscalateToBoard: true,
          willBypassHR: true,
          likelyTactic: "Presents the decision as already made",
          openingTone: "Assertive — treats HR as an obstacle",
        },
      };

      const text = generateEmotionalFramingText(profile, "redundancy process");
      expect(text).toContain("Assertive");
      expect(text).toContain("Presents the decision as already made");
    });

    it("includes trust context for broken trust", () => {
      const profile: StakeholderBehaviourProfile = {
        stakeholderId: "ceo-001",
        stakeholderName: "Sarah Chen",
        stakeholderRole: "CEO",
        currentEmotionalState: "frustrated",
        trustLevel: "broken",
        relationshipScore: -5,
        behaviourModifiers: {
          pressureIntensity: "high",
          willEscalateToBoard: true,
          willBypassHR: false,
          likelyTactic: "Threatens to escalate",
          openingTone: "Impatient",
        },
      };

      const text = generateEmotionalFramingText(profile, "pay equity audit");
      expect(text).toContain("lost confidence in HR");
    });
  });
});

// ─── Narrative Engine ─────────────────────────────────────────────────────────

describe("NarrativeEngine", () => {
  it("module exports are importable", async () => {
    const module = await import("./ail/narrativeEngine");
    expect(typeof module.ensureNarrativeState).toBe("function");
    expect(typeof module.updateNarrativeState).toBe("function");
    expect(typeof module.updateStakeholderRelationship).toBe("function");
    expect(typeof module.recordNarrativeEvent).toBe("function");
    expect(typeof module.upsertNarrativeThread).toBe("function");
    expect(typeof module.getNarrativeContext).toBe("function");
  });

  it("getNarrativeContext returns null when db is unavailable", async () => {
    const { getNarrativeContext } = await import("./ail/narrativeEngine");
    const result = await getNarrativeContext("user-no-db");
    expect(result).toBeNull();
  });
});

// ─── Organisation Context Layer ───────────────────────────────────────────────

describe("OrganisationContextLayer", () => {
  it("module exports are importable", async () => {
    const module = await import("./ail/organisationContextLayer");
    expect(typeof module.upsertOrgContext).toBe("function");
    expect(typeof module.getOrgContext).toBe("function");
    expect(typeof module.generateSimulationContextInjection).toBe("function");
  });

  it("generateSimulationContextInjection returns default when no org context", async () => {
    const { generateSimulationContextInjection } = await import("./ail/organisationContextLayer");
    const result = await generateSimulationContextInjection("tenant-no-context");
    expect(result).toHaveProperty("scenarioFraming");
    expect(result).toHaveProperty("stakeholderModifiers");
    expect(result).toHaveProperty("consequenceCalibration");
    expect(result).toHaveProperty("activePolicies");
    expect(result).toHaveProperty("regulatoryReferences");
  });
});

// ─── Cross-Simulation Memory ──────────────────────────────────────────────────

describe("CrossSimulationMemory", () => {
  it("module exports are importable", async () => {
    const module = await import("./ail/crossSimulationMemory");
    expect(typeof module.processSimulationCompletion).toBe("function");
    expect(typeof module.processAssessmentCompletion).toBe("function");
    expect(typeof module.getSignalLedger).toBe("function");
    expect(typeof module.getFailureModeRegistry).toBe("function");
    expect(typeof module.getPendingRetests).toBe("function");
  });

  it("getSignalLedger returns empty array when db is unavailable", async () => {
    const { getSignalLedger } = await import("./ail/crossSimulationMemory");
    const result = await getSignalLedger("user-no-db");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("getPendingRetests returns empty array when db is unavailable", async () => {
    const { getPendingRetests } = await import("./ail/crossSimulationMemory");
    const result = await getPendingRetests("user-no-db");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ─── Persona Classification Engine ───────────────────────────────────────────

import { getPersonaAdaptedParameters, type PersonaType } from "./ail/personaClassificationEngine";

describe("PersonaClassificationEngine", () => {
  it("module exports are importable", async () => {
    const module = await import("./ail/personaClassificationEngine");
    expect(typeof module.updatePersonaProfile).toBe("function");
    expect(typeof module.getPersonaProfile).toBe("function");
    expect(typeof module.getPersonaAdaptedParameters).toBe("function");
    expect(typeof module.generatePersonaNarrative).toBe("function");
  });

  it("getPersonaAdaptedParameters returns correct config for strong_validator", () => {
    const params = getPersonaAdaptedParameters("strong_validator");
    expect(params.contradictionFrequency).toBe("high");
    expect(params.stakeholderPressureLevel).toBe("maximum");
    expect(params.openResponseScaffolding).toBe(false);
  });

  it("getPersonaAdaptedParameters returns correct config for passive_deferrer", () => {
    const params = getPersonaAdaptedParameters("passive_deferrer");
    expect(params.stakeholderPressureLevel).toBe("moderate");
    expect(params.contradictionFrequency).toBe("low");
    expect(params.openResponseScaffolding).toBe(true);
  });

  it("getPersonaAdaptedParameters returns correct config for overconfident_decision_maker", () => {
    const params = getPersonaAdaptedParameters("overconfident_decision_maker");
    expect(params.contradictionFrequency).toBe("maximum");
    expect(params.stakeholderPressureLevel).toBe("maximum");
    expect(params.timePressure).toBe("low");
  });

  it("getPersonaAdaptedParameters returns defaults for unclassified", () => {
    const params = getPersonaAdaptedParameters("unclassified");
    expect(params.contradictionFrequency).toBe("moderate");
    expect(params.stakeholderPressureLevel).toBe("moderate");
  });

  it("getPersonaProfile returns null when db is unavailable", async () => {
    const { getPersonaProfile } = await import("./ail/personaClassificationEngine");
    const result = await getPersonaProfile("user-no-db");
    expect(result).toBeNull();
  });
});

// ─── Capability Report ────────────────────────────────────────────────────────

describe("CapabilityReport", () => {
  it("module exports are importable", async () => {
    const module = await import("./ail/capabilityReport");
    expect(typeof module.generateCapabilityReport).toBe("function");
  });

  it("generateCapabilityReport returns null when db is unavailable", async () => {
    const { generateCapabilityReport } = await import("./ail/capabilityReport");
    const result = await generateCapabilityReport("user-no-db", "tenant-no-db");
    expect(result).toBeNull();
  });
});

// ─── User Intelligence Profile ────────────────────────────────────────────────

describe("UserIntelligenceProfile", () => {
  it("module exports are importable", async () => {
    const module = await import("./ail/userIntelligenceProfile");
    expect(typeof module.preSimulationOrchestration).toBe("function");
    expect(typeof module.postSimulationOrchestration).toBe("function");
    expect(typeof module.getUserIntelligenceProfile).toBe("function");
    expect(typeof module.processAssessmentThroughAIL).toBe("function");
  });

  it("getUserIntelligenceProfile returns null when db is unavailable", async () => {
    const { getUserIntelligenceProfile } = await import("./ail/userIntelligenceProfile");
    const result = await getUserIntelligenceProfile("user-no-db", "tenant-no-db");
    expect(result).toBeNull();
  });
});
