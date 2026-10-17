// Load test for the public, read-heavy paths. No dependencies (Node 22 fetch).
//   node tests/load/loadtest.mjs --base http://localhost:3000 --users 100 --seconds 30 --paths /,/api/health,/api/v1/businesses,/b/your-slug
// "users" are simulated concurrent browsers, each sending one request, waiting `think` ms, and repeating.
// Run against a copy of production (same database size, same instance size), never against someone else's site.
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith("--") ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const base = (args.base ?? "http://localhost:3000").replace(/\/$/, "");
const users = Number(args.users ?? 100), seconds = Number(args.seconds ?? 30), think = Number(args.think ?? 500);
const paths = (args.paths ?? "/,/api/health,/api/v1/businesses").split(",");
if (!Number.isInteger(users) || users < 1 || users > 5000) { console.error("--users must be 1..5000"); process.exit(1); }

const lat = [], codes = new Map(); let errors = 0; const end = Date.now() + seconds * 1000;
async function user(id) {
  let i = id;
  while (Date.now() < end) {
    const url = base + paths[i++ % paths.length]; const t0 = performance.now();
    try { const r = await fetch(url, { signal: AbortSignal.timeout(15_000) }); await r.arrayBuffer(); codes.set(r.status, (codes.get(r.status) ?? 0) + 1); if (r.status >= 500) errors++; }
    catch { errors++; codes.set("network/timeout", (codes.get("network/timeout") ?? 0) + 1); }
    lat.push(performance.now() - t0);
    await new Promise((r) => setTimeout(r, think * (0.5 + Math.random())));
  }
}
console.log(`Testing ${base} with ${users} concurrent users for ${seconds}s over ${paths.join(" ")}`);
const started = Date.now();
await Promise.all(Array.from({ length: users }, (_, i) => user(i)));
const sorted = lat.sort((a, b) => a - b), q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
const secs = (Date.now() - started) / 1000;
console.log(`requests: ${sorted.length}  (${(sorted.length / secs).toFixed(1)}/s)   errors: ${errors} (${((errors / Math.max(1, sorted.length)) * 100).toFixed(2)}%)`);
console.log(`latency ms  p50: ${q(0.5).toFixed(0)}  p95: ${q(0.95).toFixed(0)}  p99: ${q(0.99).toFixed(0)}  max: ${(sorted.at(-1) ?? 0).toFixed(0)}`);
console.log("status codes:", Object.fromEntries(codes));
const pass = errors / Math.max(1, sorted.length) < 0.01 && q(0.95) < 1500;
console.log(pass ? "PASS: under 1% errors and p95 under 1.5 s" : "FAIL: investigate (see docs/architecture/scalability.md, 'when it hurts')");
process.exit(pass ? 0 : 2);
