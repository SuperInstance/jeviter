// src/mcp.js — MCP stdio server: homeostatic streams as tools for any
// MCP client (Claude Desktop, fleet agents, …). Tools: tail, follow,
// throttle_call, ledger_verify. Streams are handles; next() pulls until
// the world moves, so an MCP client's poll becomes a rest.
import { JevIterator, Ledger, Throttle } from './core.js';

const handles = new Map();
let seq = 0;

const TOOLS = [
  { name: 'jeviter_tail', description: 'Open a homeostatic tail on a file. Yields events only when the stream shape changes; silences are booked to the ledger.',
    inputSchema: { type: 'object', properties: {
      path: { type: 'string' }, k: { type: 'number', default: 2 },
      ledger_path: { type: 'string' } }, required: ['path'] } },
  { name: 'jeviter_next', description: 'Pull the next admitted event from a handle. Blocks (rests) through silence.',
    inputSchema: { type: 'object', properties: { handle: { type: 'number' } }, required: ['handle'] } },
  { name: 'jeviter_throttle', description: 'Wrap a named endpoint: familiar inputs shed (receipted), surprising inputs escalate.',
    inputSchema: { type: 'object', properties: {
      endpoint: { type: 'string' }, text: { type: 'string' }, k: { type: 'number' } },
      required: ['endpoint', 'text'] } },
  { name: 'jeviter_ledger_verify', description: 'Replay a ledger JSONL from genesis; tamper breaks at its own row.',
    inputSchema: { type: 'object', properties: { ledger_path: { type: 'string' } }, required: ['ledger_path'] } },
];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');

async function* fileLines(path) {           // minimal async file tail
  const { readFileSync, statSync } = await import('node:fs');
  let pos = 0;
  for (;;) {
    try {
      const size = statSync(path).size;
      if (size > pos) {
        const text = readFileSync(path, 'utf8');
        const lines = text.slice(pos).split('\n');
        pos = text.length;
        for (const line of lines) if (line.trim()) yield line;
      }
    } catch { /* file may rotate — honest wait */ }
    await new Promise((r) => setTimeout(r, 300));
  }
}

const throttles = new Map();
async function callTool(name, args) {
  if (name === 'jeviter_tail') {
    const h = ++seq;
    handles.set(h, new JevIterator(fileLines(args.path),
      { k: args.k ?? 2, ledger: new Ledger(`mcp:${args.path}`) }));
    return { content: [{ type: 'text', text: JSON.stringify({ handle: h }) }] };
  }
  if (name === 'jeviter_next') {
    const it = handles.get(args.handle);
    if (!it) return { content: [{ type: 'text', text: 'unknown handle' }], isError: true };
    const step = await it.next();
    return { content: [{ type: 'text', text: step.done ? '[exhausted]' :
      JSON.stringify({ text: step.value.text, gain: step.value.gain, th: step.value.threshold }) }] };
  }
  if (name === 'jeviter_throttle') {
    if (!throttles.has(args.endpoint)) {
      throttles.set(args.endpoint, new Throttle((t) => ({ escalated: t }),
        { k: args.k ?? 2, ledger: new Ledger(`mcp-throttle:${args.endpoint}`) }));
    }
    const t = throttles.get(args.endpoint);
    const r = t.call(args.text);
    return { content: [{ type: 'text', text: JSON.stringify(
      r === undefined ? { shed: true, shed_count: t.shed } : { escalated: true, count: t.escalated }) }] };
  }
  if (name === 'jeviter_ledger_verify') {
    const { readFileSync } = await import('node:fs');
    const l = new Ledger();
    for (const line of readFileSync(args.ledger_path, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const e = JSON.parse(line);
      l.entries.push(e); l.tail = BigInt('0x' + e.hash);
    }
    return { content: [{ type: 'text', text: JSON.stringify({ entries: l.entries.length, valid: l.verify() }) }] };
  }
  return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
}

const rl = (await import('node:readline')).createInterface({ input: process.stdin });
for await (const line of rl) {
  let msg;
  try { msg = JSON.parse(line); } catch { continue; }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05',
      capabilities: { tools: {} }, serverInfo: { name: 'jeviter', version: '0.1.0' } } });
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } });
  } else if (msg.method === 'tools/call') {
    try {
      const result = await callTool(msg.params.name, msg.params.arguments ?? {});
      send({ jsonrpc: '2.0', id: msg.id, result });
    } catch (err) {
      send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text',
        text: String(err) }], isError: true } });
    }
  }
}
