/**
 * seed-completed-session.mjs
 *
 * Seeds a completed AI Skills Check session for reward@dunder.com by:
 * 1. Logging in via the tRPC API to get a session cookie
 * 2. Starting a new assessment session
 * 3. Submitting 49 real answers via the API (so LLM generates real rationales)
 * 4. Completing the session
 *
 * This ensures all generated content (rationales, scores, narrative) is real.
 */
// Node 22 has built-in fetch

const BASE_URL = "http://localhost:3000";
const TRPC_URL = `${BASE_URL}/api/trpc`;

// ── Helpers ────────────────────────────────────────────────────────────────────
let sessionCookie = "";

async function trpc(procedure, input, method = "mutation") {
  const isQuery = method === "query";
  let url, options;
  if (isQuery) {
    const params = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
    url = `${TRPC_URL}/${procedure}?batch=1&input=${params}`;
    options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
    };
  } else {
    url = `${TRPC_URL}/${procedure}?batch=1`;
    options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({ 0: { json: input } }),
    };
  }

  const res = await fetch(url, options);

  // Capture Set-Cookie header
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    // Extract just the cookie name=value part
    const cookieVal = setCookie.split(";")[0];
    if (cookieVal) sessionCookie = cookieVal;
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!res.ok || (Array.isArray(data) && data[0]?.error)) {
    const err = Array.isArray(data) ? data[0]?.error : data;
    throw new Error(`tRPC error on ${procedure}: ${JSON.stringify(err?.message ?? err)}`);
  }

  return Array.isArray(data) ? data[0]?.result?.data?.json : data?.result?.data?.json;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log("=== Seeding completed assessment session for reward@dunder.com ===\n");

// Step 1: Login
console.log("1. Logging in...");
await trpc("auth.login", {
  email: "reward@dunder.com",
  password: "Reward2024!",
  tenantSlug: "dunder",
});
console.log("   ✓ Logged in, cookie captured");

// Step 2: Verify auth
const me = await trpc("auth.me", {}, "query");
console.log(`   ✓ Authenticated as: ${me?.firstName} ${me?.lastName} (${me?.email})`);

// Step 3: Start a new session
console.log("\n2. Starting new assessment session...");
const startResult = await trpc("assessment.startSession", {
  blueprintId: "bp-aiq-v10-standard",
  roleHint: "learning",
  deviceType: "desktop",
  localeCode: "en-GB",
});
const sessionId = startResult?.sessionId;
console.log(`   ✓ Session started: ${sessionId}`);

// Step 4: Answer questions until complete
console.log("\n3. Answering questions (this will take a while — LLM generates each item)...");
let answeredCount = 0;
const TARGET = 49;
const CONFIDENCE_VALUES = [0.6, 0.7, 0.8, 0.5, 0.9, 0.6, 0.7, 0.8, 0.5, 0.6];

while (answeredCount < TARGET) {
  // Get current session state
  let sessionData;
  let retries = 0;
  while (retries < 20) {
    try {
      sessionData = await trpc("assessment.session", { sessionId }, "query");
      if (sessionData?.nextItem || sessionData?.isComplete) break;
      console.log(`   ... waiting for item generation (attempt ${retries + 1})...`);
      await sleep(3000);
      retries++;
    } catch (e) {
      console.log(`   ... retry after error: ${e.message}`);
      await sleep(3000);
      retries++;
    }
  }

  if (!sessionData) {
    console.error("   ✗ Failed to get session data after retries");
    break;
  }

  if (sessionData.isComplete) {
    console.log(`   ✓ Session complete signal received at ${answeredCount} answers`);
    break;
  }

  const nextItem = sessionData.nextItem;
  if (!nextItem) {
    console.log(`   ✗ No next item available at answer ${answeredCount}`);
    break;
  }

  // Select an answer — pick option index 0 or 1 (vary to avoid gaming detection)
  // Use the correct answer if available, otherwise pick index based on pattern
  const options = nextItem.options ?? [];
  let selectedValue = null;
  if (options.length > 0) {
    // Vary selection: mostly correct (index 0-1), occasionally wrong (index 2-3)
    // to produce a realistic mix of Strong/Partial/Incorrect outcomes
    const pattern = answeredCount % 10;
    let idx;
    if (pattern < 6) idx = 0;       // 60% pick first option
    else if (pattern < 8) idx = 1;  // 20% pick second
    else if (pattern === 8) idx = 2; // 10% pick third (likely wrong)
    else idx = 3;                    // 10% pick fourth (likely wrong)
    idx = Math.min(idx, options.length - 1);
    const opt = options[idx];
    selectedValue = typeof opt === "string" ? opt : (opt?.id ?? opt?.value ?? opt?.text ?? String(idx));
  }

  const confidence = CONFIDENCE_VALUES[answeredCount % CONFIDENCE_VALUES.length];
  const timeToAnswer = 15000 + Math.floor(Math.random() * 30000); // 15-45 seconds

  try {
    await trpc("assessment.submitAnswer", {
      sessionId,
      itemId: nextItem.id,
      selectedValue,
      confidenceScore: confidence,
      timeToAnswerMs: timeToAnswer,
      deviceType: "desktop",
    });
    answeredCount++;
    process.stdout.write(`\r   ✓ Answered ${answeredCount}/${TARGET}`);
  } catch (e) {
    console.log(`\n   ✗ Error submitting answer ${answeredCount + 1}: ${e.message}`);
    await sleep(2000);
  }

  // Small delay between answers to avoid rate limiting
  await sleep(500);
}

console.log(`\n\n4. Completing session...`);
try {
  const completeResult = await trpc("assessment.completeSession", { sessionId });
  console.log(`   ✓ Session completed: ${JSON.stringify(completeResult)}`);
} catch (e) {
  console.log(`   ✗ Complete error (may already be complete): ${e.message}`);
}

// Step 5: Verify results
console.log("\n5. Verifying results...");
await sleep(3000);
try {
  const results = await trpc("assessment.results", { sessionId }, "query");
  console.log(`   ✓ Results available`);
  console.log(`   Overall score: ${results?.overallScore}`);
  if (results?.capabilityScores) {
    for (const [domain, score] of Object.entries(results.capabilityScores)) {
      console.log(`   ${domain}: ${score?.score ?? score}`);
    }
  }
} catch (e) {
  console.log(`   ✗ Results not yet ready: ${e.message}`);
}

console.log(`\n=== Done! Session ID: ${sessionId} ===`);
console.log(`Navigate to: https://hraiq.co.uk/assessment/${sessionId}/results`);
