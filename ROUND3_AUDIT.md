# AiQ Platform — Round 3 UX Audit

## 10 Improvements Selected

| # | Area | Issue | Fix |
|---|------|-------|-----|
| R3-01 | Assessment Session | "Next question" button is the only way to advance — no keyboard shortcut hint visible after answer selection | Show a persistent keyboard shortcut pill `↵ Enter to continue` below the Submit button so power users can flow without mouse |
| R3-02 | Assessment Results | The "Results not available" error page shown for the in-progress session is misleading — it shows the same empty-state for a session that simply hasn't been completed yet | Detect `state === "in_progress"` and show a friendly "This assessment is still in progress" state with a Resume button instead of the generic error |
| R3-03 | Dashboard — Function Score card | The "Not Yet Ready" badge appears inside the Function Score card even when the logged-in user is AI-Ready (8.2). The badge reflects the function's lowest tier, not the user's own score — this is confusing | Remove the badge from the Function Score card entirely; it belongs only in the readiness distribution section |
| R3-04 | Learning Plan — Activity tab | The "Day streak" counter is hardcoded to 0 regardless of actual activity. This undermines motivation | Compute streak dynamically from completed plan items (group by calendar date, count consecutive days up to today) |
| R3-05 | Module Player — Completion screen | After completing a module the "Start Next Module" button navigates to the next module but does NOT pass the `planItemId` query param, so the new module loads without plan context and cannot mark itself complete | Pass `planItemId` of the next module when navigating from the completion screen |
| R3-06 | Reports page | The fallback for unrecognised report types renders raw JSON in a `<pre>` block. The `learner_report` and `manager_team_report` types both fall through to this raw JSON view | Add proper rendered views for `learner_report` and `manager_team_report` |
| R3-07 | Policy Rules Engine | The "Create Policy" dialog has no validation feedback — submitting with an empty name silently does nothing (the mutation fires but the toast may not surface the error clearly) | Add inline required-field validation with red border + helper text before the mutation fires |
| R3-08 | Audit Log | The category filter tabs show counts of 0 for all categories even when events exist in the DB. The count badges are static placeholders | Wire the category counts to the actual query result so they reflect real data |
| R3-09 | Profile page | The "Change Password" section is present but this platform uses Manus OAuth — there is no local password. The section is misleading and non-functional | Replace the Change Password section with a "Security" section that explains OAuth-managed auth and links to the Manus account portal |
| R3-10 | Dashboard — Heatmap table | Domain column headers are truncated ("AI Output...") with no tooltip, making the table hard to read on smaller screens | Add `title` attribute tooltips and a hover `<Tooltip>` component to all truncated domain headers in the heatmap table |
