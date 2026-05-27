import { INITIATIVE_LIBRARY } from "./shared/initiativeLibrary.js";

const cpoInits = INITIATIVE_LIBRARY.filter(
  i => i.functionScope === "cpo" || i.functionScope === "both" || !i.functionScope
);

console.log("Total CPO-eligible:", cpoInits.length);

const cats: Record<string, string[]> = {};
for (const i of cpoInits) {
  if (!cats[i.category]) cats[i.category] = [];
  cats[i.category].push(i.id);
}

for (const [cat, ids] of Object.entries(cats)) {
  console.log(`\n${cat} (${ids.length}):`);
  for (const id of ids) {
    const init = INITIATIVE_LIBRARY.find(x => x.id === id)!;
    console.log(`  ${id} — ${init.label} — y1: £${init.y1CostRange.low}k–£${init.y1CostRange.high}k`);
  }
}
