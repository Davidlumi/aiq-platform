# Leader Dashboard Audit

## Issues Identified

### 1. Heatmap Problems
- **Uniform scores**: All cells show ~50-55 range, making the heatmap visually flat (all same navy shade)
- **Navy-only palette**: `scoreToNavyBg()` uses a monochrome navy scale (7 shades) which doesn't communicate capability levels meaningfully
- **Dashes for empty families**: Role families with no assessed users show "—" which is correct but looks broken
- **No target/gap overlay**: The heatmap shows absolute scores but no targets or gaps, so there's no "good vs bad" context
- **Root cause**: The seeded demo data likely gives similar scores to all users, AND the navy palette doesn't differentiate well in the 40-60 range

### 2. No HR-Business Strategy Alignment Signal
- The hero finding mentions "0 strategic priorities" — org context exists but `strategicPrioritiesJson` is empty
- The OrgContextPage admin UI does NOT have fields for `strategicPriorities`, `currentChallenges`, or `recentEvents` even though the backend supports them
- No dedicated section showing alignment between HR capability and business strategy
- The hero statement says "aligned to your 0 strategic priorities" which is meaningless

### 3. Strategic Findings Section
- Shows only "High" and "Low" badges with no text content visible in screenshot
- The findings logic depends on specific thresholds (>25% foundation gap, <30% completion rate, >60% developing, >30% misaligned confidence)
- With uniform ~55 scores, most users are "developing" so the "sustained_function_stall" pattern should trigger
- But the findings appear empty/minimal in the screenshot

## Fix Plan

### Heatmap Fix
1. Replace navy-only palette with a semantic colour scale (red → amber → green) that communicates readiness
2. Add score labels with colour context (below threshold = red, approaching = amber, at/above = green)
3. Add headcount badges to show data density
4. Add a target line or threshold indicator

### Strategy Alignment Section (NEW)
1. Add strategic priorities input to OrgContextPage
2. Create a new "Strategic Alignment" section on the Leader Dashboard
3. Show each strategic priority mapped to relevant capability domains
4. Show alignment score (how well current capability supports each priority)
5. Show clear "aligned / gap / at risk" signals

### Strategic Findings Fix
1. Add more finding patterns that trigger with realistic data
2. Ensure the findings card shows full observation + implication text
3. Add a "strategy gap" finding when priorities exist but capability is below threshold
