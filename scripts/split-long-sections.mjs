/**
 * split-long-sections.mjs
 *
 * Deterministic, lossless post-process for Group B wall_of_text modules.
 * Any reading_section body exceeding MAX_SECTION_WORDS is split at the
 * last sentence boundary at or before MAX_SECTION_WORDS. The overflow
 * becomes a new section with a generated heading (original heading + " (continued)").
 *
 * No content is discarded. This is a split, not a truncation.
 *
 * Usage:
 *   node scripts/split-long-sections.mjs [--ids=id1,id2,...] [--dry-run]
 *
 * Without --ids, processes ALL modules with at least one section > MAX_SECTION_WORDS.
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const MAX_SECTION_WORDS = 130;
const DRY_RUN = process.argv.includes('--dry-run');
const IDS_ARG = process.argv.find(a => a.startsWith('--ids='));
const TARGET_IDS = IDS_ARG ? IDS_ARG.replace('--ids=', '').split(',').map(s => s.trim()).filter(Boolean) : null;

function wordCount(text) {
  if (!text) return 0;
  return (text.match(/\b\w+\b/g) || []).length;
}

/**
 * Split text at the last sentence boundary at or before maxWords.
 * Returns [firstPart, remainder] where remainder may be empty.
 * Sentence boundaries: '. ', '! ', '? ', '.\n', '!\n', '?\n'
 */
function splitAtSentenceBoundary(text, maxWords) {
  const words = text.match(/\b\w+\b/g) || [];
  if (words.length <= maxWords) return [text, ''];

  // Find the position in the original text where we hit maxWords
  // Walk through the text counting words
  let wordsSeen = 0;
  let charPos = 0;
  const wordRegex = /\b\w+\b/g;
  let match;
  let lastSentenceEnd = -1;
  let lastSentenceEndAtWord = 0;

  // Find all sentence endings and their word positions
  const sentenceEnds = [];
  // Reset and find sentence boundaries
  const sentenceEndRegex = /[.!?][\s\n]/g;
  let sMatch;
  while ((sMatch = sentenceEndRegex.exec(text)) !== null) {
    sentenceEnds.push(sMatch.index + sMatch[0].length); // position after the space
  }

  // For each sentence end, count words up to that point
  for (const endPos of sentenceEnds) {
    const textUpTo = text.substring(0, endPos);
    const wc = wordCount(textUpTo);
    if (wc <= maxWords) {
      lastSentenceEnd = endPos;
      lastSentenceEndAtWord = wc;
    } else {
      break;
    }
  }

  if (lastSentenceEnd === -1) {
    // No sentence boundary found within maxWords — split at word boundary
    // Find the position of the maxWords-th word
    const wordMatches = [...text.matchAll(/\b\w+\b/g)];
    if (wordMatches.length > maxWords) {
      const splitWord = wordMatches[maxWords];
      const splitPos = splitWord.index;
      return [text.substring(0, splitPos).trim(), text.substring(splitPos).trim()];
    }
    return [text, ''];
  }

  const first = text.substring(0, lastSentenceEnd).trim();
  const second = text.substring(lastSentenceEnd).trim();
  return [first, second];
}

async function main() {
  const db = await createConnection(process.env.DATABASE_URL);

  console.log(`🔧 Section Splitter`);
  console.log(`   DRY_RUN: ${DRY_RUN}`);
  console.log(`   MAX_SECTION_WORDS: ${MAX_SECTION_WORDS}`);
  if (TARGET_IDS) console.log(`   IDS: ${TARGET_IDS.join(', ')}`);
  console.log();

  // Fetch modules
  let query = `
    SELECT m.id, m.title, m.domain, m.level,
           rs.id as section_id, rs.heading, rs.body, rs.sort_order
    FROM learning_modules m
    JOIN reading_sections rs ON rs.module_id = m.id
    WHERE m.status = 'published'
    ORDER BY m.id, rs.sort_order
  `;
  const [rows] = await db.execute(query);

  // Group by module
  const moduleMap = new Map();
  for (const row of rows) {
    if (!moduleMap.has(row.id)) {
      moduleMap.set(row.id, { id: row.id, title: row.title, domain: row.domain, level: row.level, sections: [] });
    }
    moduleMap.get(row.id).sections.push({
      id: row.section_id,
      heading: row.heading,
      body: row.body,
      sort_order: row.sort_order,
    });
  }

  // Filter to target IDs if specified
  let modules = [...moduleMap.values()];
  if (TARGET_IDS) {
    modules = modules.filter(m => TARGET_IDS.includes(m.id));
  }

  // Find modules with sections over MAX_SECTION_WORDS
  const toFix = modules.filter(m =>
    m.sections.some(s => wordCount(s.body) > MAX_SECTION_WORDS)
  );

  console.log(`📚 Found ${toFix.length} modules with sections over ${MAX_SECTION_WORDS} words`);
  console.log();

  let processed = 0;
  let totalSplits = 0;

  for (const mod of toFix) {
    const overSections = mod.sections.filter(s => wordCount(s.body) > MAX_SECTION_WORDS);
    console.log(`  [${mod.id}] ${mod.title.substring(0, 60)}`);
    console.log(`    ${overSections.length} section(s) over ${MAX_SECTION_WORDS}w`);

    // Build new section list with splits applied
    const newSections = [];
    for (const sec of mod.sections) {
      const wc = wordCount(sec.body);
      if (wc <= MAX_SECTION_WORDS) {
        newSections.push(sec);
        continue;
      }

      // Split this section
      const [first, remainder] = splitAtSentenceBoundary(sec.body, MAX_SECTION_WORDS);
      const firstWc = wordCount(first);
      const remWc = wordCount(remainder);

      console.log(`    Split: "${sec.heading.substring(0, 50)}" (${wc}w) → ${firstWc}w + ${remWc}w`);

      newSections.push({ ...sec, body: first });

      if (remainder) {
        // Create a continuation section
        newSections.push({
          id: null, // new section
          heading: `${sec.heading} (continued)`,
          body: remainder,
          sort_order: sec.sort_order + 0.5, // will be renumbered
        });
        totalSplits++;
      }
    }

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would update ${mod.id} with ${newSections.length} sections`);
      processed++;
      continue;
    }

    // Apply changes: update existing sections, insert new ones
    // First, renumber sort_order to be clean integers
    const renumbered = newSections.map((s, i) => ({ ...s, sort_order: i + 1 }));

    await db.beginTransaction();
    try {
      for (const sec of renumbered) {
        if (sec.id) {
          // Update existing section
          await db.execute(
            'UPDATE reading_sections SET heading = ?, body = ?, sort_order = ? WHERE id = ?',
            [sec.heading, sec.body, sec.sort_order, sec.id]
          );
        } else {
          // Insert new section
          // Get module_id from the first existing section
          const moduleId = mod.sections[0] ? await getModuleId(db, mod.id) : null;
          if (moduleId) {
            await db.execute(
              'INSERT INTO reading_sections (module_id, heading, body, sort_order) VALUES (?, ?, ?, ?)',
              [moduleId, sec.heading, sec.body, sec.sort_order]
            );
          }
        }
      }
      await db.commit();
      console.log(`    ✓ Updated ${mod.id}: ${mod.sections.length} → ${renumbered.length} sections`);
      processed++;
    } catch (err) {
      await db.rollback();
      console.error(`    ✗ FAILED ${mod.id}: ${err.message}`);
    }
  }

  await db.end();

  console.log();
  console.log(`✅ Complete: ${processed} modules processed, ${totalSplits} new sections created`);
}

async function getModuleId(db, moduleSlug) {
  const [rows] = await db.execute('SELECT id FROM learning_modules WHERE id = ?', [moduleSlug]);
  return rows[0]?.id || null;
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
