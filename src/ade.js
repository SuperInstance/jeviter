// src/ade.js — ADE bridge (SDAD seed 6): fleet doctrine as MCP-callable
// gates for Gen-4 agentic development environments. The bridge adds no new
// metric; it carries the fleet's existing cells across the surface boundary
// so ADEs can call the same readings the fleet books internally.
//
// Doctrine (pinned by tests):
//   1. Doctrine crosses surfaces as a receipted manifest, never as prose
//      pasted into a prompt — a value that is not booked can be edited
//      downstream without the fleet hearing it.
//   2. Spec fidelity is admitted only as the named reading: drift and
//      missing paths ride with the number, or the gate refuses the reading.
//   3. Collaboration readings cross as resolution paths and named walls,
//      not as a health score — the paradox is a sampling of work, not a
//      mood.
//   4. Every bridge call books on a hash-chained ledger. An ADE that read
//      the doctrine and did not book it did not read the doctrine.

import { Ledger } from './core.js';
import { measureFidelity, bookFidelity } from './fidelity.js';
import { readCollab, bookCollab } from './collab.js';

export const ADE_BRIDGE_VERSION = '0.1.0';

export function adeDoctrine() {
  return {
    name: 'jeviter-ade-bridge',
    version: ADE_BRIDGE_VERSION,
    doctrine: [
      'book every silence',
      'exact identity, no float authority',
      'provenance or it did not happen',
      'an unchecked claim is never a fidelity claim',
      'review walls are named per item',
    ],
    tools: ['fleet_doctrine', 'fleet_spec_fidelity', 'fleet_collab_read'],
  };
}

export function artifactReader(artifacts = {}) {
  return (path) => (Object.prototype.hasOwnProperty.call(artifacts, path)
    ? artifacts[path]
    : null);
}

function receipt(ledger) {
  return {
    cell: ledger.cell,
    entries: ledger.entries.length,
    verified: ledger.verify(),
  };
}

// runAdeTool is the surface-independent half; src/mcp.js binds it to MCP.
// `read` is injected so tests and non-stdio surfaces can provide artifacts.
export function runAdeTool(name, args = {}) {
  const ledger = args.ledger ?? new Ledger('ade-bridge');
  if (name === 'fleet_doctrine') {
    const manifest = adeDoctrine();
    ledger.book({ tool: name }, { manifest }, 'ade-doctrine',
      { tools: manifest.tools.length });
    return { manifest, receipt: receipt(ledger) };
  }

  if (name === 'fleet_spec_fidelity') {
    const read = args.read ?? artifactReader(args.artifacts);
    const result = measureFidelity(args.claims ?? [], read);
    bookFidelity(ledger, args.vessel ?? 'ade-surface', result);
    return { result, receipt: receipt(ledger) };
  }

  if (name === 'fleet_collab_read') {
    const result = readCollab(args.items ?? []);
    bookCollab(ledger, args.source ?? 'ade-surface', result);
    return { result, receipt: receipt(ledger) };
  }

  throw new Error(`unknown ADE tool: ${name}`);
}
