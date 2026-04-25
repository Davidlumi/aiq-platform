# AssessmentSessionPage Peakon Audit

## Hardcoded hex colours to replace with Tailwind classes:
1. RISK_CONFIG (line 75-79): `#DC2626`, `#F59E0B`, `#10B981` with /8 and /30 opacity
2. AiOutputBlock (line 158-205): `#8B5CF6`, `#CCBB44`, `#DC2626` with /4 and /30 opacity
3. DataContextBlock (line 209-228): `#66CCEE` with /4 and /30 opacity
4. ArtefactBlock (line 234-380): Uses Tailwind classes already (blue-500, emerald-500, etc.) but with /30 and /4 opacity - mostly OK but uses -400 text colours (dark theme)
5. NarrativeWrapper (line 384-408): `#3B82F6` with /5 and /30 opacity
6. CompletionScreen (line 488-591): var(--color-green-*) + `#F59E0B` + `#3B82F6` for capability bars
7. Constraint block (line 1244): `#F59E0B` with /6 and /20
8. Risk framing (line 1254): `#DC2626` with /6 and /20
9. Governance framing (line 1264): `#10B981` with /6 and /20
10. Option selection (line 1325): `#10B981` + `#F0FDF4` for selected state
11. Confidence staking (line 1388): `#DC2626`, `#F59E0B`, var(--color-green-700)
12. Save & Exit buttons: `#10B981`, `#D1FAE5`, `#F8FAFC`

## ArtefactBlock text colours using -400 (dark theme):
- text-blue-400, text-emerald-400, text-amber-400, text-purple-400, text-cyan-400, text-rose-400, text-indigo-400, text-orange-400, text-red-400, text-slate-400
- Should be -600 for light theme

## Key changes needed:
1. Replace all hex colours with Tailwind semantic classes
2. Change ArtefactBlock text-*-400 to text-*-600 for light theme
3. Replace bg-*/4 patterns with bg-*/50 Tailwind equivalents
4. Replace border-*/30 with border-*/200 Tailwind equivalents
5. CompletionScreen capability bars should use PeakonScoreBadge
