path = "/home/ubuntu/aiq-platform/client/src/pages/assessment/AssessmentSessionPage.tsx"
with open(path, 'r') as f:
    content = f.read()

# Step 1: Add B2 device detection utility function before the component
old_component_start = "export default function AssessmentSessionPage() {"
new_component_start = """// B2: Device and browser detection helpers
function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "tablet";
  return "desktop";
}
function detectBrowserType(): string {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "edge";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "chrome";
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "safari";
  if (/OPR\//i.test(ua)) return "opera";
  return "other";
}

export default function AssessmentSessionPage() {"""

if old_component_start in content:
    content = content.replace(old_component_start, new_component_start, 1)
    print("B2 helpers: patched")
else:
    print("B2 helpers: NOT FOUND")

# Step 2: Add deviceType and browserType to the submitMutation.mutate call
old_submit = """      // B1: Behavioural telemetry
      revisionCount,
      focusLossCount,
    });"""

new_submit = """      // B1: Behavioural telemetry
      revisionCount,
      focusLossCount,
      // B2: Device context telemetry
      deviceType: detectDeviceType(),
      browserType: detectBrowserType(),
      screenWidthPx: window.screen.width,
    });"""

if old_submit in content:
    content = content.replace(old_submit, new_submit, 1)
    print("B2 submit fields: patched")
else:
    print("B2 submit fields: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
