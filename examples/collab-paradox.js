// examples/collab-paradox.js — seed 5 example run: the collaboration-
// paradox instrument on a SYNTHETIC fixture (labeled NOT field data).
// Run: node examples/collab-paradox.js
import { Ledger } from '../src/core.js';
import { readCollab, bookCollab } from '../src/collab.js';

// Synthetic fixture, 12 items: 2 delegated (16.7%), 4 reviewed (2 walled),
// 6 direct. Pin the shape so the example is a regression fixture, not a
// vibe: change the fixture, the printed rows change, the test suite pins
// the mechanism.
const FIXTURE = [
  { id: 'blog-post', path: 'delegated', resolved: true },
  { id: 'lint-gate', path: 'delegated', resolved: true },
  { id: 'api-design', path: 'reviewed', reviewPasses: 2, resolved: true },
  { id: 'db-migration', path: 'reviewed', reviewPasses: 5, resolved: false },
  { id: 'vendor-pick', path: 'reviewed', reviewPasses: 4, resolved: false },
  { id: 'copy-edit', path: 'reviewed', reviewPasses: 1, resolved: true },
  { id: 'hotfix-1', path: 'direct', resolved: true },
  { id: 'hotfix-2', path: 'direct', resolved: true },
  { id: 'ticket-triage', path: 'direct', resolved: true },
  { id: 'deploy-button', path: 'direct', resolved: true },
  { id: 'incident-comms', path: 'direct', resolved: true },
  { id: 'spec-tweak', path: 'direct', resolved: true },
];

const result = readCollab(FIXTURE);
const ledger = new Ledger('collab-paradox');
bookCollab(ledger, 'example-synthetic-12', result);

console.log(`items: ${result.n}  resolved: ${result.resolved}/${result.n}`);
console.log(`paths: delegated=${result.counts.delegated} ` +
  `reviewed=${result.counts.reviewed} direct=${result.counts.direct}`);
console.log(`delegation share: ${(result.delegationShare * 100).toFixed(1)}%` +
  `  paradox band (0-20%): ${result.paradoxBand}`);
console.log('walls (named, not averaged):');
for (const w of result.walled) console.log(`  ${w.id}: ${w.reviewPasses} review passes, unresolved`);
console.log(`receipt chain verified: ${ledger.verify()}`);
