/**
 * Adaptive Learning System Stress Test
 * Tests 10 Acme employees: gap analysis → plan generation → module progression
 */
import mysql from 'mysql2/promise';
import { nanoid } from 'nanoid';

const ACME_USERS = [
  { id: 'u-acme-007', name: 'Amara Diallo', roleFamily: 'HRBP', sessionId: 'sess-acme-u-acme-007' },
  { id: 'u-acme-012', name: 'Ben Kowalski', roleFamily: 'Talent', sessionId: 'sess-acme-u-acme-012' },
  { id: 'u-acme-015', name: 'Aisha Mensah', roleFamily: 'Talent', sessionId: 'sess-acme-u-acme-015' },
  { id: 'u-acme-016', name: 'Connor Burke', roleFamily: 'Talent', sessionId: 'sess-acme-u-acme-016' },
  { id: 'u-acme-023', name: 'Claire Drummond', roleFamily: 'Reward', sessionId: 'sess-acme-u-acme-023' },
  { id: 'u-acme-034', name: 'Arjun Nair', roleFamily: 'Analytics', sessionId: 'sess-acme-u-acme-034' },
  { id: 'u-acme-035', name: 'Chloe Beaumont', roleFamily: 'Analytics', sessionId: 'sess-acme-u-acme-035' },
  { id: 'u-acme-041', name: 'Amelia Okonkwo', roleFamily: 'DEI', sessionId: 'sess-acme-u-acme-041' },
  { id: 'u-acme-045', name: 'Damian Kowalczyk', roleFamily: 'HR Ops', sessionId: 'sess-acme-u-acme-045' },
  { id: 'u-acme-049', name: 'Alexei Volkov', roleFamily: 'Workforce Planning', sessionId: 'sess-acme-u-acme-049' },
];

const CAPABILITY_KEYS = ['execution', 'judgement', 'governance', 'appropriateness', 'workflow', 'data_interpretation'];
const BENCHMARKS = { execution: 65, judgement: 63, governance: 62, appropriateness: 64, workflow: 66, data_interpretation: 60 };

function computeGapAnalysis(capScores, seniorityTier = 'mid') {
  const benchmarkAdj = seniorityTier === 'senior' ? 5 : seniorityTier === 'lead' ? 10 : 0;
  const gaps = {};
  const priorities = [];
  for (const cap of CAPABILITY_KEYS) {
    const score = capScores[cap] ?? 50;
    const benchmark = (BENCHMARKS[cap] ?? 60) + benchmarkAdj;
    const gap = benchmark - score; // positive = below benchmark
    let severity;
    if (score >= 80) severity = 'advanced';
    else if (score >= 65) severity = 'proficient';
    else if (score >= 45) severity = 'developing';
    else severity = 'critical';
    gaps[cap] = { capability: cap, score, benchmark, gap, severity, priority: 0 };
    priorities.push({ cap, gap, score });
  }
  // Sort by gap desc (biggest gap = highest priority)
  priorities.sort((a, b) => b.gap - a.gap);
  priorities.forEach((p, i) => { gaps[p.cap].priority = i + 1; });
  const overall = Object.values(gaps).reduce((s, g) => s + g.score, 0) / CAPABILITY_KEYS.length;
  let band;
  if (overall >= 75) band = 'proficient';
  else if (overall >= 60) band = 'progressing';
  else if (overall >= 45) band = 'developing';
  else band = 'foundation_gap';
  return { capabilityGaps: gaps, priorityOrder: priorities.map(p => p.cap), overallReadinessScore: overall, readinessBand: band };
}

function extractCapScores(scoreBreakdownJson) {
  try {
    const bd = typeof scoreBreakdownJson === 'string' ? JSON.parse(scoreBreakdownJson) : scoreBreakdownJson;
    const raw = bd?.capabilityScores ?? {};
    const result = {};
    for (const [k, v] of Object.entries(raw)) {
      result[k] = typeof v === 'number' ? v : v?.score ?? 50;
    }
    return result;
  } catch { return {}; }
}

const errors = [];
const results = [];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all published modules
  const [modules] = await conn.query('SELECT id, capability, difficulty, modality, duration_mins, level_label FROM learning_modules WHERE status = "published" LIMIT 200');
  console.log(`\n📚 Found ${modules.length} published modules\n`);
  
  if (modules.length === 0) {
    errors.push('CRITICAL: No published modules found — learning plan generation will fail for all users');
  }

  for (const user of ACME_USERS) {
    console.log(`\n── Testing ${user.name} (${user.roleFamily}) ──`);
    const userResult = { user: user.name, roleFamily: user.roleFamily, errors: [], warnings: [], planId: null, modulesAssigned: 0, modulesCompleted: 0 };
    
    try {
      // 1. Get assessment score
      const [scores] = await conn.query(
        'SELECT score_breakdown_json, overall_score FROM assessment_scores WHERE session_id = ? LIMIT 1',
        [user.sessionId]
      );
      
      let capScores = {};
      let overallScore = 50;
      if (scores.length === 0) {
        userResult.warnings.push(`No assessment score found for session ${user.sessionId} — using default scores`);
        // Generate random-ish scores for testing
        for (const cap of CAPABILITY_KEYS) {
          capScores[cap] = 40 + Math.floor(Math.random() * 40);
        }
      } else {
        capScores = extractCapScores(scores[0].score_breakdown_json);
        overallScore = parseFloat(scores[0].overall_score);
        console.log(`  ✓ Assessment score: ${overallScore.toFixed(1)} — caps: ${JSON.stringify(capScores)}`);
        if (Object.keys(capScores).length === 0) {
          userResult.warnings.push('scoreBreakdownJson has no capabilityScores — using default scores');
          for (const cap of CAPABILITY_KEYS) {
            capScores[cap] = 40 + Math.floor(Math.random() * 40);
          }
        }
      }

      // 2. Generate gap analysis
      const analysis = computeGapAnalysis(capScores);
      const gapId = nanoid();
      
      try {
        await conn.query(
          'INSERT INTO gap_analyses (id, user_id, tenant_id, session_id, capability_gaps_json, priority_order_json, overall_readiness_score, readiness_band, generated_at, trigger_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [gapId, user.id, 'tenant-acme-ltd', user.sessionId, JSON.stringify(analysis.capabilityGaps), JSON.stringify(analysis.priorityOrder), analysis.overallReadinessScore.toFixed(2), analysis.readinessBand, Date.now(), 'manual']
        );
        console.log(`  ✓ Gap analysis: band=${analysis.readinessBand}, score=${analysis.overallReadinessScore.toFixed(1)}`);
      } catch (e) {
        userResult.errors.push(`Gap analysis insert failed: ${e.message}`);
        errors.push(`${user.name}: gap_analyses insert — ${e.message}`);
        continue;
      }

      // 3. Generate adaptive learning plan
      if (modules.length === 0) {
        userResult.errors.push('No modules available — cannot generate plan');
        errors.push(`${user.name}: no modules to assign`);
        results.push(userResult);
        continue;
      }

      // Simple plan: pick top 8 modules matching priority capabilities
      const planModules = [];
      const priorityCaps = analysis.priorityOrder.slice(0, 3);
      for (const cap of priorityCaps) {
        const capMods = modules.filter(m => m.capability === cap).slice(0, 2);
        planModules.push(...capMods);
      }
      // Fill remaining with any modules
      const remaining = modules.filter(m => !planModules.find(pm => pm.id === m.id)).slice(0, Math.max(0, 8 - planModules.length));
      planModules.push(...remaining);
      const finalMods = planModules.slice(0, 8);

      const planId = nanoid();
      const totalMins = finalMods.reduce((s, m) => s + (m.duration_mins ?? 0), 0);
      
      try {
        await conn.query(
          'INSERT INTO adaptive_learning_plans (id, user_id, tenant_id, gap_analysis_id, session_id, state, generator_version, total_modules, completed_modules, estimated_total_mins, summary_json, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [planId, user.id, 'tenant-acme-ltd', gapId, user.sessionId, 'active', 'stress-test-v1', finalMods.length, 0, totalMins, JSON.stringify({ readinessBand: analysis.readinessBand, overallReadinessScore: analysis.overallReadinessScore }), Date.now()]
        );
        userResult.planId = planId;
        userResult.modulesAssigned = finalMods.length;
        console.log(`  ✓ Plan created: ${finalMods.length} modules, ${totalMins} mins`);
      } catch (e) {
        userResult.errors.push(`Plan insert failed: ${e.message}`);
        errors.push(`${user.name}: adaptive_learning_plans insert — ${e.message}`);
        continue;
      }

      // 4. Insert plan items
      let itemInsertErrors = 0;
      for (let i = 0; i < finalMods.length; i++) {
        const mod = finalMods[i];
        const itemId = nanoid();
        try {
          await conn.query(
            'INSERT INTO adaptive_plan_items (id, plan_id, module_id, order_index, phase, required, status, reason_json, assigned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [itemId, planId, mod.id, i, i < 2 ? 'foundation' : i < 5 ? 'development' : 'practice', i < 3 ? 1 : 0, 'available', JSON.stringify({ capability: mod.capability, prescriptionStage: 1 }), Date.now()]
          );
        } catch (e) {
          itemInsertErrors++;
          userResult.errors.push(`Plan item insert failed for module ${mod.id}: ${e.message}`);
          errors.push(`${user.name}: adaptive_plan_items insert — ${e.message}`);
        }
      }
      if (itemInsertErrors === 0) console.log(`  ✓ ${finalMods.length} plan items inserted`);

      // 5. Simulate completing first 3 modules
      const [planItems] = await conn.query(
        'SELECT id, module_id FROM adaptive_plan_items WHERE plan_id = ? ORDER BY order_index LIMIT 3',
        [planId]
      );
      
      let completedCount = 0;
      for (const item of planItems) {
        const score = 65 + Math.floor(Math.random() * 25); // 65-90
        const timeSpentMins = 10 + Math.floor(Math.random() * 20);
        try {
          await conn.query(
            'UPDATE adaptive_plan_items SET status = "completed", completed_at = ?, score_json = ?, completion_state = ? WHERE id = ?',
            [Date.now(), JSON.stringify({ score, timeSpentMins, completionState: 'completed' }), 'completed', item.id]
          );
          completedCount++;
        } catch (e) {
          userResult.errors.push(`Module completion update failed: ${e.message}`);
          errors.push(`${user.name}: module completion — ${e.message}`);
        }
      }
      
      if (completedCount > 0) {
        // Update plan completed_modules count
        await conn.query(
          'UPDATE adaptive_learning_plans SET completed_modules = ? WHERE id = ?',
          [completedCount, planId]
        );
        userResult.modulesCompleted = completedCount;
        console.log(`  ✓ Simulated ${completedCount} module completions`);
      }

      // 6. Test spaced repetition queue
      for (const item of planItems.slice(0, 2)) {
        const srId = nanoid();
        try {
          await conn.query(
            'INSERT INTO spaced_repetition_queue (id, user_id, module_id, next_due_at, interval_days, ease_factor, repetitions, last_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [srId, user.id, item.module_id, Date.now() + 7 * 24 * 3600 * 1000, '7.00', '2.500', 1, '75.00']
          );
        } catch (e) {
          userResult.warnings.push(`Spaced repetition insert failed: ${e.message}`);
        }
      }
      console.log(`  ✓ Spaced repetition queue entries created`);

    } catch (e) {
      userResult.errors.push(`Unexpected error: ${e.message}`);
      errors.push(`${user.name}: unexpected — ${e.message}`);
    }
    
    results.push(userResult);
  }

  await conn.end();

  // Summary
  console.log('\n\n══════════════════════════════════════════');
  console.log('STRESS TEST SUMMARY');
  console.log('══════════════════════════════════════════');
  for (const r of results) {
    const status = r.errors.length === 0 ? '✅' : '❌';
    console.log(`${status} ${r.user} (${r.roleFamily}): plan=${r.planId ? 'created' : 'FAILED'}, modules=${r.modulesAssigned}, completed=${r.modulesCompleted}, errors=${r.errors.length}, warnings=${r.warnings.length}`);
    if (r.errors.length > 0) r.errors.forEach(e => console.log(`    ERROR: ${e}`));
    if (r.warnings.length > 0) r.warnings.forEach(w => console.log(`    WARN: ${w}`));
  }
  
  console.log(`\n${errors.length === 0 ? '✅ All tests passed' : `❌ ${errors.length} errors found`}`);
  if (errors.length > 0) {
    console.log('\nAll errors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
