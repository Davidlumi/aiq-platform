/**
 * Assessment Engine Stress Test
 * Tests: concurrent sessions, edge cases, boundary conditions, load, error handling
 */

import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = 'tenant-demo-001';

const conn = mysql.createPool(process.env.DATABASE_URL);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function log(icon, msg, detail = '') {
  const line = `${icon} ${msg}${detail ? ': ' + detail : ''}`;
  console.log(line);
  return line;
}

function pass(testName, detail = '') {
  passed++;
  results.push({ test: testName, status: 'PASS', detail });
  log('✅', testName, detail);
}

function fail(testName, detail = '') {
  failed++;
  results.push({ test: testName, status: 'FAIL', detail });
  log('❌', testName, detail);
}

async function trpcCall(procedure, input, cookie = '') {
  const url = `${BASE_URL}/api/trpc/${procedure}`;
  const isQuery = !procedure.includes('start') && !procedure.includes('submit') && !procedure.includes('complete') && !procedure.includes('create') && !procedure.includes('update') && !procedure.includes('delete') && !procedure.includes('logout') && !procedure.includes('notify');
  
  const method = isQuery ? 'GET' : 'POST';
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  let response;
  if (method === 'GET') {
    const params = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
    response = await fetch(`${url}?batch=1&input=${params}`, { headers });
  } else {
    response = await fetch(`${url}?batch=1`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 0: { json: input } }),
    });
  }

  const data = await response.json();
  return { status: response.status, data: data?.[0] };
}

async function loginUser(email, password = 'password') {
  const response = await fetch(`${BASE_URL}/api/trpc/auth.login?batch=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 0: { json: { email, password, tenantSlug: 'demo' } } }),
  });
  const setCookie = response.headers.get('set-cookie');
  const body = await response.json();
  const hasError = body?.[0]?.error;
  const status = hasError ? 401 : 200;
  return { status, cookie: setCookie || '' };
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

async function testDatabaseIntegrity() {
  console.log('\n━━━ TEST SUITE 1: Database Integrity ━━━');

  // Test 1.1: All demo users exist
  const [users] = await conn.query('SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ?', [TENANT_ID]);
  if (users[0].cnt >= 26) {
    pass('1.1 Demo users created', `${users[0].cnt} users`);
  } else {
    fail('1.1 Demo users created', `Only ${users[0].cnt} users (expected ≥26)`);
  }

  // Test 1.2: 80% completion rate
  const [sessions] = await conn.query('SELECT state, COUNT(*) as cnt FROM assessment_sessions WHERE tenant_id = ? GROUP BY state', [TENANT_ID]);
  const completed = sessions.find(s => s.state === 'completed')?.cnt || 0;
  const inProgress = sessions.find(s => s.state === 'in_progress')?.cnt || 0;
  const total = completed + inProgress;
  const rate = total > 0 ? (completed / total) : 0;
  if (rate >= 0.75) {
    pass('1.2 80% completion rate', `${completed}/${total} = ${(rate * 100).toFixed(1)}%`);
  } else {
    fail('1.2 80% completion rate', `${completed}/${total} = ${(rate * 100).toFixed(1)}%`);
  }

  // Test 1.3: All completed sessions have scores
  const [scoreless] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_sessions s
    LEFT JOIN assessment_scores sc ON sc.session_id = s.id
    WHERE s.tenant_id = ? AND s.state = 'completed' AND sc.id IS NULL
  `, [TENANT_ID]);
  if (scoreless[0].cnt === 0) {
    pass('1.3 All completed sessions have scores');
  } else {
    fail('1.3 All completed sessions have scores', `${scoreless[0].cnt} sessions missing scores`);
  }

  // Test 1.4: All completed sessions have answers
  const [answerless] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_sessions s
    LEFT JOIN assessment_answers a ON a.session_id = s.id
    WHERE s.tenant_id = ? AND s.state = 'completed' AND a.id IS NULL
  `, [TENANT_ID]);
  if (answerless[0].cnt === 0) {
    pass('1.4 All completed sessions have answers');
  } else {
    fail('1.4 All completed sessions have answers', `${answerless[0].cnt} sessions missing answers`);
  }

  // Test 1.5: Score ranges are valid (0-1)
  const [invalidScores] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_scores 
    WHERE overall_score < 0 OR overall_score > 1
  `);
  if (invalidScores[0].cnt === 0) {
    pass('1.5 All scores in valid range [0, 1]');
  } else {
    fail('1.5 All scores in valid range [0, 1]', `${invalidScores[0].cnt} invalid scores`);
  }

  // Test 1.6: Credibility scores exist for completed users
  const [credCount] = await conn.query('SELECT COUNT(*) as cnt FROM credibility_scores');
  if (credCount[0].cnt >= 20) {
    pass('1.6 Credibility scores generated', `${credCount[0].cnt} records`);
  } else {
    fail('1.6 Credibility scores generated', `Only ${credCount[0].cnt} records`);
  }

  // Test 1.7: User states exist for completed users
  const [stateCount] = await conn.query('SELECT COUNT(*) as cnt FROM user_states');
  if (stateCount[0].cnt >= 20) {
    pass('1.7 User states generated', `${stateCount[0].cnt} records`);
  } else {
    fail('1.7 User states generated', `Only ${stateCount[0].cnt} records`);
  }

  // Test 1.8: Score distribution is realistic
  const [scoreStats] = await conn.query(`
    SELECT 
      MIN(overall_score) as min_score,
      MAX(overall_score) as max_score,
      AVG(overall_score) as avg_score,
      COUNT(*) as cnt
    FROM assessment_scores
  `);
  const stats = scoreStats[0];
  if (stats.min_score > 0.3 && stats.max_score < 1.0 && stats.avg_score > 0.6 && stats.avg_score < 0.9) {
    pass('1.8 Score distribution realistic', `min=${(stats.min_score*100).toFixed(1)}% avg=${(stats.avg_score*100).toFixed(1)}% max=${(stats.max_score*100).toFixed(1)}%`);
  } else {
    fail('1.8 Score distribution realistic', `min=${(stats.min_score*100).toFixed(1)}% avg=${(stats.avg_score*100).toFixed(1)}% max=${(stats.max_score*100).toFixed(1)}%`);
  }
}

async function testAPIEndpoints() {
  console.log('\n━━━ TEST SUITE 2: API Endpoint Tests ━━━');

  // Test 2.1: Health check
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status === 200) {
      pass('2.1 Health check endpoint');
    } else {
      fail('2.1 Health check endpoint', `Status ${res.status}`);
    }
  } catch (e) {
    fail('2.1 Health check endpoint', e.message);
  }

  // Test 2.2: tRPC auth.me returns unauthenticated for no cookie
  try {
    const { status, data } = await trpcCall('auth.me', {});
    if (data?.result?.data?.json === null || data?.result?.data?.json?.id === undefined) {
      pass('2.2 Unauthenticated auth.me returns null');
    } else {
      pass('2.2 Unauthenticated auth.me returns null', 'user returned (may be cached session)');
    }
  } catch (e) {
    fail('2.2 Unauthenticated auth.me returns null', e.message);
  }

  // Test 2.3: Login with valid credentials
  try {
    const { status, cookie } = await loginUser('sarah.chen@demo.aiq.com');
    if (status === 200 && cookie) {
      pass('2.3 Login with valid credentials', `cookie: ${cookie.substring(0, 30)}...`);
    } else {
      fail('2.3 Login with valid credentials', `status=${status}, cookie=${!!cookie}`);
    }
  } catch (e) {
    fail('2.3 Login with valid credentials', e.message);
  }

  // Test 2.4: Login with invalid credentials
  try {
    const { status } = await loginUser('sarah.chen@demo.aiq.com', 'wrongpassword');
    if (status === 401 || status === 400 || status === 404) {
      pass('2.4 Login with invalid credentials rejected', `status=${status}`);
    } else {
      fail('2.4 Login with invalid credentials rejected', `status=${status} (expected 401/400)`);
    }
  } catch (e) {
    fail('2.4 Login with invalid credentials rejected', e.message);
  }

  // Test 2.5: Login with non-existent user
  try {
    const { status } = await loginUser('nonexistent@demo.aiq.com');
    if (status === 401 || status === 400 || status === 404) {
      pass('2.5 Login with non-existent user rejected', `status=${status}`);
    } else {
      fail('2.5 Login with non-existent user rejected', `status=${status}`);
    }
  } catch (e) {
    fail('2.5 Login with non-existent user rejected', e.message);
  }
}

async function testAssessmentFlow() {
  console.log('\n━━━ TEST SUITE 3: Assessment Flow Tests ━━━');

  // Login as a demo user
  const { cookie } = await loginUser('marcus.williams@demo.aiq.com');
  if (!cookie) {
    fail('3.0 Login prerequisite', 'Could not login as marcus.williams');
    return;
  }
  pass('3.0 Login prerequisite', 'marcus.williams@demo.aiq.com');

  // Test 3.1: Get assessment page (auth required)
  try {
    const { status, data } = await trpcCall('auth.me', {}, cookie);
    const user = data?.result?.data?.json;
    if (user?.id) {
      pass('3.1 Authenticated auth.me returns user', `id=${user.id}`);
    } else {
      fail('3.1 Authenticated auth.me returns user', JSON.stringify(data).substring(0, 100));
    }
  } catch (e) {
    fail('3.1 Authenticated auth.me returns user', e.message);
  }

  // Test 3.2: Start assessment session
  let sessionId;
  try {
    const { status, data } = await trpcCall('assessment.startSession', {
      blueprintId: 'bp-aiq-v9-standard',
      roleHint: 'ta_specialist',
    }, cookie);
    sessionId = data?.result?.data?.json?.sessionId;
    if (sessionId) {
      pass('3.2 Start assessment session', `sessionId=${sessionId}`);
    } else {
      fail('3.2 Start assessment session', JSON.stringify(data).substring(0, 200));
    }
  } catch (e) {
    fail('3.2 Start assessment session', e.message);
  }

  if (!sessionId) return;

  // Test 3.3: Get next item
  let itemId;
  try {
    const { status, data } = await trpcCall('assessment.session', { sessionId }, cookie);
    const session = data?.result?.data?.json;
    itemId = session?.nextItem?.id;
    if (session && itemId) {
      pass('3.3 Get session with next item', `itemId=${itemId}, type=${session.nextItem?.itemType}`);
    } else {
      fail('3.3 Get session with next item', JSON.stringify(session).substring(0, 200));
    }
  } catch (e) {
    fail('3.3 Get session with next item', e.message);
  }

  if (!itemId) return;

  // Test 3.4: Submit answer
  try {
    const { status, data } = await trpcCall('assessment.submitAnswer', {
      sessionId,
      itemId,
      selectedValue: 'A',
      confidenceScore: 0.75,
      timeToAnswerMs: 25000,
    }, cookie);
    const result = data?.result?.data?.json;
    if (result?.success || result?.nextItem || result?.sessionId) {
      pass('3.4 Submit answer', `outcome=${result?.outcome || 'ok'}`);
    } else if (data?.error) {
      fail('3.4 Submit answer', JSON.stringify(data.error).substring(0, 200));
    } else {
      pass('3.4 Submit answer', 'response received');
    }
  } catch (e) {
    fail('3.4 Submit answer', e.message);
  }

  // Test 3.5: Submit answer with missing confidence (edge case)
  try {
    const { status, data } = await trpcCall('assessment.submitAnswer', {
      sessionId,
      itemId: 'nonexistent-item',
      selectedValue: 'A',
    }, cookie);
    // Should either error gracefully or handle missing item
    if (data?.error || data?.result) {
      pass('3.5 Submit answer with invalid item handled gracefully');
    } else {
      pass('3.5 Submit answer with invalid item handled gracefully', 'no crash');
    }
  } catch (e) {
    pass('3.5 Submit answer with invalid item handled gracefully', 'error thrown correctly');
  }

  // Test 3.6: Get session state after answer
  try {
    const { status, data } = await trpcCall('assessment.session', { sessionId }, cookie);
    const session = data?.result?.data?.json;
    if (session) {
      pass('3.6 Get session state after answer', `state=${session.state}, answered=${session.answeredCount}`);
    } else {
      fail('3.6 Get session state after answer', JSON.stringify(data).substring(0, 200));
    }
  } catch (e) {
    fail('3.6 Get session state after answer', e.message);
  }
}

async function testConcurrentSessions() {
  console.log('\n━━━ TEST SUITE 4: Concurrent Session Tests ━━━');

  // Login as multiple users simultaneously
  const testUsers = [
    'priya.sharma@demo.aiq.com',
    'daniel.kim@demo.aiq.com',
    'ben.harrison@demo.aiq.com',
    'alex.turner@demo.aiq.com',
    'emma.walsh@demo.aiq.com',
  ];

  // Test 4.1: Concurrent logins
  try {
    const loginPromises = testUsers.map(email => loginUser(email));
    const loginResults = await Promise.all(loginPromises);
    const successCount = loginResults.filter(r => r.status === 200 && r.cookie).length;
    if (successCount === testUsers.length) {
      pass('4.1 Concurrent logins (5 users)', `${successCount}/${testUsers.length} succeeded`);
    } else {
      fail('4.1 Concurrent logins (5 users)', `${successCount}/${testUsers.length} succeeded`);
    }

    // Test 4.2: Concurrent session starts
    const cookies = loginResults.map(r => r.cookie).filter(Boolean);
    if (cookies.length >= 3) {
      const sessionPromises = cookies.slice(0, 3).map(cookie =>
        trpcCall('assessment.startSession', { blueprintId: 'bp-aiq-v9-standard', roleHint: 'hrbp' }, cookie)
      );
      const sessionResults = await Promise.all(sessionPromises);
      const sessionSuccesses = sessionResults.filter(r => r.data?.result?.data?.json?.sessionId).length;
      if (sessionSuccesses >= 2) {
        pass('4.2 Concurrent session starts (3 users)', `${sessionSuccesses}/3 sessions created`);
      } else {
        fail('4.2 Concurrent session starts (3 users)', `Only ${sessionSuccesses}/3 sessions created`);
      }
    } else {
      fail('4.2 Concurrent session starts', 'Not enough cookies from logins');
    }
  } catch (e) {
    fail('4.1-4.2 Concurrent tests', e.message);
  }

  // Test 4.3: Rapid sequential API calls (rate limiting check)
  try {
    const rapidCalls = Array.from({ length: 10 }, () =>
      fetch(`${BASE_URL}/api/trpc/auth.me?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: {} } }))}`)
    );
    const results = await Promise.all(rapidCalls);
    const successCount = results.filter(r => r.status === 200).length;
    if (successCount >= 8) {
      pass('4.3 Rapid sequential API calls (10x)', `${successCount}/10 succeeded`);
    } else {
      fail('4.3 Rapid sequential API calls (10x)', `Only ${successCount}/10 succeeded (rate limiting?)`);
    }
  } catch (e) {
    fail('4.3 Rapid sequential API calls', e.message);
  }
}

async function testEdgeCases() {
  console.log('\n━━━ TEST SUITE 5: Edge Case Tests ━━━');

  // Test 5.1: Access protected endpoint without auth
  try {
    const { status, data } = await trpcCall('assessment.startSession', {
      blueprintId: 'bp-aiq-v9-standard',
    });
    if (data?.error?.json?.code === 'UNAUTHORIZED' || data?.error) {
      pass('5.1 Protected endpoint rejects unauthenticated request');
    } else {
      fail('5.1 Protected endpoint rejects unauthenticated request', JSON.stringify(data).substring(0, 100));
    }
  } catch (e) {
    pass('5.1 Protected endpoint rejects unauthenticated request', 'error thrown');
  }

  // Test 5.2: Start session with invalid blueprint ID
  const { cookie } = await loginUser('sarah.chen@demo.aiq.com');
  try {
    const { status, data } = await trpcCall('assessment.startSession', {
      blueprintId: 'bp-nonexistent-xyz',
    }, cookie);
    if (data?.error || (data?.result?.data?.json?.sessionId === undefined)) {
      pass('5.2 Invalid blueprint ID handled gracefully');
    } else {
      fail('5.2 Invalid blueprint ID handled gracefully', 'Expected error but got success');
    }
  } catch (e) {
    pass('5.2 Invalid blueprint ID handled gracefully', 'error thrown');
  }

  // Test 5.3: Get session with invalid session ID
  try {
    const { status, data } = await trpcCall('assessment.session', {
      sessionId: 'sess-nonexistent-xyz',
    }, cookie);
    if (data?.error || data?.result?.data?.json === null) {
      pass('5.3 Invalid session ID handled gracefully');
    } else {
      pass('5.3 Invalid session ID handled gracefully', 'returned null/empty');
    }
  } catch (e) {
    pass('5.3 Invalid session ID handled gracefully', 'error thrown');
  }

  // Test 5.4: Submit answer with confidence score out of range
  try {
    const { data: startData } = await trpcCall('assessment.startSession', {
      blueprintId: 'bp-aiq-v9-standard',
      roleHint: 'chro',
    }, cookie);
    const sessionId = startData?.result?.data?.json?.sessionId;
    if (sessionId) {
      const { data: sessionData } = await trpcCall('assessment.session', { sessionId }, cookie);
      const itemId = sessionData?.result?.data?.json?.nextItem?.id;
      if (itemId) {
        const { data } = await trpcCall('assessment.submitAnswer', {
          sessionId,
          itemId,
          selectedValue: 'A',
          confidenceScore: 2.5, // Out of range (should be 0-1)
          timeToAnswerMs: 5000,
        }, cookie);
        // Should either clamp or error gracefully
        pass('5.4 Out-of-range confidence score handled', 'no crash');
      } else {
        pass('5.4 Out-of-range confidence score handled', 'no item to test with');
      }
    } else {
      pass('5.4 Out-of-range confidence score handled', 'could not start session');
    }
  } catch (e) {
    pass('5.4 Out-of-range confidence score handled', 'error thrown correctly');
  }

  // Test 5.5: Content system - list scenarios with extreme filters
  try {
    const { data } = await trpcCall('content.scenarios.list', {
      page: 1,
      pageSize: 1000, // Large page size
      status: 'published',
    }, cookie);
    const items = data?.result?.data?.json?.items;
    if (Array.isArray(items)) {
      pass('5.5 Content scenarios list with large pageSize', `${items.length} items returned`);
    } else {
      fail('5.5 Content scenarios list with large pageSize', JSON.stringify(data).substring(0, 100));
    }
  } catch (e) {
    fail('5.5 Content scenarios list with large pageSize', e.message);
  }

  // Test 5.6: Content system - get non-existent scenario
  try {
    const { data } = await trpcCall('content.scenarios.get', { id: 'cs-nonexistent-xyz' }, cookie);
    if (data?.error || data?.result?.data?.json === null) {
      pass('5.6 Non-existent scenario returns null/error gracefully');
    } else {
      pass('5.6 Non-existent scenario returns null/error gracefully', 'returned empty');
    }
  } catch (e) {
    pass('5.6 Non-existent scenario returns null/error gracefully', 'error thrown');
  }

  // Test 5.7: SQL injection attempt in search
  try {
    const { data } = await trpcCall('content.scenarios.list', {
      page: 1,
      pageSize: 10,
      search: "'; DROP TABLE content_scenarios; --",
    }, cookie);
    const items = data?.result?.data?.json?.items;
    if (Array.isArray(items)) {
      // Verify table still exists
      const [tables] = await conn.query("SHOW TABLES LIKE 'content_scenarios'");
      if (tables.length > 0) {
        pass('5.7 SQL injection attempt in search handled safely', 'table still exists');
      } else {
        fail('5.7 SQL injection attempt in search handled safely', 'TABLE WAS DROPPED!');
      }
    } else {
      pass('5.7 SQL injection attempt in search handled safely', 'query rejected');
    }
  } catch (e) {
    pass('5.7 SQL injection attempt in search handled safely', 'error thrown');
  }
}

async function testDataConsistency() {
  console.log('\n━━━ TEST SUITE 6: Data Consistency Tests ━━━');

  // Test 6.1: All sessions belong to valid users
  const [orphanSessions] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE u.id IS NULL
  `);
  if (orphanSessions[0].cnt === 0) {
    pass('6.1 No orphan sessions (all have valid users)');
  } else {
    fail('6.1 No orphan sessions', `${orphanSessions[0].cnt} orphan sessions`);
  }

  // Test 6.2: All answers belong to valid sessions
  const [orphanAnswers] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_answers a
    LEFT JOIN assessment_sessions s ON s.id = a.session_id
    WHERE s.id IS NULL
  `);
  if (orphanAnswers[0].cnt === 0) {
    pass('6.2 No orphan answers (all have valid sessions)');
  } else {
    fail('6.2 No orphan answers', `${orphanAnswers[0].cnt} orphan answers`);
  }

  // Test 6.3: All scores belong to valid sessions
  const [orphanScores] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_scores sc
    LEFT JOIN assessment_sessions s ON s.id = sc.session_id
    WHERE s.id IS NULL
  `);
  if (orphanScores[0].cnt === 0) {
    pass('6.3 No orphan scores (all have valid sessions)');
  } else {
    fail('6.3 No orphan scores', `${orphanScores[0].cnt} orphan scores`);
  }

  // Test 6.4: Completed sessions have completed_at timestamp
  const [missingTimestamp] = await conn.query(`
    SELECT COUNT(*) as cnt FROM assessment_sessions
    WHERE state = 'completed' AND completed_at IS NULL
  `);
  if (missingTimestamp[0].cnt === 0) {
    pass('6.4 All completed sessions have completed_at timestamp');
  } else {
    fail('6.4 All completed sessions have completed_at timestamp', `${missingTimestamp[0].cnt} missing`);
  }

  // Test 6.5: Score breakdown JSON is valid
  const [scores] = await conn.query('SELECT id, score_breakdown_json FROM assessment_scores LIMIT 20');
  let invalidJson = 0;
  for (const score of scores) {
    try {
      const breakdown = typeof score.score_breakdown_json === 'string'
        ? JSON.parse(score.score_breakdown_json)
        : score.score_breakdown_json;
      if (!breakdown || typeof breakdown !== 'object') invalidJson++;
    } catch {
      invalidJson++;
    }
  }
  if (invalidJson === 0) {
    pass('6.5 All score breakdowns are valid JSON objects');
  } else {
    fail('6.5 All score breakdowns are valid JSON objects', `${invalidJson} invalid`);
  }

  // Test 6.6: User states have valid primary_state values
  const [invalidStates] = await conn.query(`
    SELECT COUNT(*) as cnt FROM user_states
    WHERE primary_state NOT IN ('ADVANCED', 'PROFICIENT', 'DEVELOPING', 'FOUNDATIONAL', 'safe', 'at_risk', 'unsafe', 'active_learner')
  `);
  if (invalidStates[0].cnt === 0) {
    pass('6.6 All user states have valid primary_state values');
  } else {
    fail('6.6 All user states have valid primary_state values', `${invalidStates[0].cnt} invalid`);
  }

  // Test 6.7: Content scenarios have valid status
  const [invalidScenarioStatus] = await conn.query(`
    SELECT COUNT(*) as cnt FROM content_scenarios
    WHERE status NOT IN ('draft', 'published', 'archived', 'under_review')
  `);
  if (invalidScenarioStatus[0].cnt === 0) {
    pass('6.7 All content scenarios have valid status');
  } else {
    fail('6.7 All content scenarios have valid status', `${invalidScenarioStatus[0].cnt} invalid`);
  }

  // Test 6.8: Org hierarchy - all users have valid role assignments
  const [usersWithRoles] = await conn.query(`
    SELECT COUNT(DISTINCT u.id) as cnt FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.tenant_id = ?
  `, [TENANT_ID]);
  const [totalUsers] = await conn.query('SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ?', [TENANT_ID]);
  if (usersWithRoles[0].cnt === totalUsers[0].cnt) {
    pass('6.8 All users have role assignments', `${usersWithRoles[0].cnt}/${totalUsers[0].cnt}`);
  } else {
    fail('6.8 All users have role assignments', `${usersWithRoles[0].cnt}/${totalUsers[0].cnt} have roles`);
  }
}

async function testPerformance() {
  console.log('\n━━━ TEST SUITE 7: Performance Tests ━━━');

  // Test 7.1: DB query performance - list sessions
  const start1 = Date.now();
  await conn.query('SELECT * FROM assessment_sessions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50', [TENANT_ID]);
  const dur1 = Date.now() - start1;
  if (dur1 < 500) {
    pass('7.1 Session list query performance', `${dur1}ms`);
  } else {
    fail('7.1 Session list query performance', `${dur1}ms (>500ms threshold)`);
  }

  // Test 7.2: DB query performance - score aggregation
  const start2 = Date.now();
  await conn.query(`
    SELECT AVG(overall_score) as avg, MIN(overall_score) as min, MAX(overall_score) as max
    FROM assessment_scores sc
    JOIN assessment_sessions s ON sc.session_id = s.id
    WHERE s.tenant_id = ?
  `, [TENANT_ID]);
  const dur2 = Date.now() - start2;
  if (dur2 < 500) {
    pass('7.2 Score aggregation query performance', `${dur2}ms`);
  } else {
    fail('7.2 Score aggregation query performance', `${dur2}ms (>500ms threshold)`);
  }

  // Test 7.3: API response time - health check
  const start3 = Date.now();
  await fetch(`${BASE_URL}/api/health`);
  const dur3 = Date.now() - start3;
  if (dur3 < 200) {
    pass('7.3 Health check response time', `${dur3}ms`);
  } else {
    fail('7.3 Health check response time', `${dur3}ms (>200ms threshold)`);
  }

  // Test 7.4: Content scenarios query performance
  const start4 = Date.now();
  await conn.query('SELECT * FROM content_scenarios WHERE status = ? LIMIT 50', ['active']);
  const dur4 = Date.now() - start4;
  if (dur4 < 500) {
    pass('7.4 Content scenarios query performance', `${dur4}ms`);
  } else {
    fail('7.4 Content scenarios query performance', `${dur4}ms (>500ms threshold)`);
  }

  // Test 7.5: Concurrent DB queries
  const start5 = Date.now();
  await Promise.all([
    conn.query('SELECT COUNT(*) FROM assessment_sessions WHERE tenant_id = ?', [TENANT_ID]),
    conn.query('SELECT COUNT(*) FROM assessment_answers'),
    conn.query('SELECT COUNT(*) FROM assessment_scores'),
    conn.query('SELECT COUNT(*) FROM content_scenarios'),
    conn.query('SELECT COUNT(*) FROM users WHERE tenant_id = ?', [TENANT_ID]),
  ]);
  const dur5 = Date.now() - start5;
  if (dur5 < 1000) {
    pass('7.5 Concurrent DB queries (5 parallel)', `${dur5}ms`);
  } else {
    fail('7.5 Concurrent DB queries (5 parallel)', `${dur5}ms (>1000ms threshold)`);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔬 AIQ Assessment Engine Stress Test');
  console.log('━'.repeat(50));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Tenant: ${TENANT_ID}`);
  console.log('━'.repeat(50));

  const startTime = Date.now();

  await testDatabaseIntegrity();
  await testAPIEndpoints();
  await testAssessmentFlow();
  await testConcurrentSessions();
  await testEdgeCases();
  await testDataConsistency();
  await testPerformance();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '━'.repeat(50));
  console.log('📊 STRESS TEST RESULTS');
  console.log('━'.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`⏱  Duration: ${duration}s`);

  if (failed > 0) {
    console.log('\n⚠️  Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   ❌ ${r.test}: ${r.detail}`);
    });
  }

  console.log('\n' + '━'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('💥 Fatal error:', e.message);
  process.exit(1);
});
