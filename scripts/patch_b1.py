path = "/home/ubuntu/aiq-platform/client/src/pages/assessment/AssessmentSessionPage.tsx"
with open(path, 'r') as f:
    content = f.read()

# Step 1: Add revisionCount and focusLossCount state after firstInteractionTime state
old_state = "  // WS5.1: Track first interaction time for telemetry\n  const [firstInteractionTime, setFirstInteractionTime] = useState<number | null>(null);"
new_state = """  // WS5.1: Track first interaction time for telemetry
  const [firstInteractionTime, setFirstInteractionTime] = useState<number | null>(null);
  // B1: Track revision count (option changes after first selection) and focus loss count
  const [revisionCount, setRevisionCount] = useState<number>(0);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);"""

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print("B1 state: patched")
else:
    print("B1 state: NOT FOUND")

# Step 2: Increment revisionCount when setSelectedValue is called after the first selection
# The option click handler: onClick={() => { setSelectedValue(option.value); if (firstInteractionTime === null) setFirstInteractionTime(Date.now()); }}
old_click = "onClick={() => { setSelectedValue(option.value); if (firstInteractionTime === null) setFirstInteractionTime(Date.now()); }}"
new_click = "onClick={() => { if (selectedValue && selectedValue !== option.value) setRevisionCount(c => c + 1); setSelectedValue(option.value); if (firstInteractionTime === null) setFirstInteractionTime(Date.now()); }}"

if old_click in content:
    content = content.replace(old_click, new_click, 1)
    print("B1 click handler: patched")
else:
    print("B1 click handler: NOT FOUND")

# Step 3: Add visibilitychange listener for focus loss tracking
# Insert after the keyboard navigation useEffect
old_keyboard = "  // UX-4: Keyboard navigation — 1-4 to select option, Enter to submit\n  useEffect(() => {"
new_keyboard = """  // B1: Track focus loss via visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setFocusLossCount(c => c + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
  // UX-4: Keyboard navigation — 1-4 to select option, Enter to submit
  useEffect(() => {"""

if old_keyboard in content:
    content = content.replace(old_keyboard, new_keyboard, 1)
    print("B1 visibilitychange: patched")
else:
    print("B1 visibilitychange: NOT FOUND")

# Step 4: Reset revisionCount and focusLossCount on answer submission success
old_reset = "        setSelectedValue(\"\");\n        setConfidence(50);\n        setReasoningText(\"\"); // C2.1: reset reasoning\n        setItemStartTime(Date.now());\n        setFirstInteractionTime(null);"
new_reset = """        setSelectedValue("");
        setConfidence(50);
        setReasoningText(""); // C2.1: reset reasoning
        setItemStartTime(Date.now());
        setFirstInteractionTime(null);
        setRevisionCount(0); // B1: reset per-item counters
        setFocusLossCount(0);"""

if old_reset in content:
    content = content.replace(old_reset, new_reset, 1)
    print("B1 reset: patched")
else:
    print("B1 reset: NOT FOUND")

# Step 5: Send revisionCount and focusLossCount in submitMutation.mutate
old_submit = "      // WS5.1 telemetry\n      timeToFirstInteractionMs: firstInteractionTime !== null ? Math.round(firstInteractionTime - itemStartTime) : undefined,\n      confidenceRatingRaw: confidence / 100,"
new_submit = """      // WS5.1 telemetry
      timeToFirstInteractionMs: firstInteractionTime !== null ? Math.round(firstInteractionTime - itemStartTime) : undefined,
      confidenceRatingRaw: confidence / 100,
      // B1: Behavioural telemetry
      revisionCount,
      focusLossCount,"""

if old_submit in content:
    content = content.replace(old_submit, new_submit, 1)
    print("B1 submit: patched")
else:
    print("B1 submit: NOT FOUND")

# Step 6: Add revisionCount and focusLossCount to handleSubmit useCallback deps
old_deps = "  }, [selectedValue, confidence, itemStartTime, firstInteractionTime, sessionId, nextItem?.id]);"
new_deps = "  }, [selectedValue, confidence, itemStartTime, firstInteractionTime, revisionCount, focusLossCount, sessionId, nextItem?.id]);"

if old_deps in content:
    content = content.replace(old_deps, new_deps, 1)
    print("B1 deps: patched")
else:
    print("B1 deps: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
