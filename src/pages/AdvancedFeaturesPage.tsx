import { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Zap, GitBranch, Lock, Database, Server,
  Loader2, RefreshCw, Play, CheckCircle, XCircle, Info,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────
interface GraphNode {
  id: string; name: string; category?: string;
  depth?: number; frequency?: number;
  x: number; y: number; vx: number; vy: number;
}
interface GraphEdge { source: string; target: string; strength?: number; }

// ─── Tiny UI helpers ───────────────────────────────────────────
const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) => {
  const c: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200', green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    red: 'bg-red-100 text-red-700 border-red-200',     yellow: 'bg-amber-100 text-amber-700 border-amber-200',
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c[color]}`}>{children}</span>;
};

const SectionCard = ({ title, icon: Icon, badge, badgeColor, children }: any) => (
  <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/20">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="font-semibold text-sm flex-1">{title}</h2>
      {badge && <Badge color={badgeColor}>{badge}</Badge>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Btn = ({ onClick, disabled, loading, children, variant = 'primary' }: any) => {
  const base = 'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed';
  const v = variant === 'primary'
    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
    : 'border bg-card hover:bg-accent text-foreground';
  return (
    <button className={`${base} ${v}`} onClick={onClick} disabled={disabled || loading}>
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}{children}
    </button>
  );
};

// ─── Force-directed SVG graph ───────────────────────────────────
const DEPTH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function ForceGraph({ nodes, edges, onNodeClick, seedId }: {
  nodes: GraphNode[]; edges: GraphEdge[];
  onNodeClick?: (n: GraphNode) => void; seedId?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stateRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[]; animId: number }>
    ({ nodes: [], edges: [], animId: 0 });
  const [, setTick] = useState(0);

  useEffect(() => {
    cancelAnimationFrame(stateRef.current.animId);
    if (!nodes.length) return;
    const W = svgRef.current?.clientWidth || 600, H = 260;
    const cx = W / 2, cy = H / 2;
    const placed = nodes.map((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const r = (n.depth || 0) === 0 ? 0 : (n.depth || 1) * 75;
      return { ...n, x: cx + Math.cos(angle) * r + (Math.random() - .5) * 20,
                     y: cy + Math.sin(angle) * r + (Math.random() - .5) * 20, vx: 0, vy: 0 };
    });
    stateRef.current = { nodes: placed, edges, animId: 0 };

    const step = () => {
      const s = stateRef.current, ns = s.nodes;
      const K = 0.04, REPEL = 2800, DAMP = 0.78, CENTER = 0.006;
      for (let i = 0; i < ns.length; i++) {
        if (ns[i].id === seedId) { ns[i].vx += (cx - ns[i].x) * 0.05; ns[i].vy += (cy - ns[i].y) * 0.05; continue; }
        ns[i].vx += (cx - ns[i].x) * CENTER; ns[i].vy += (cy - ns[i].y) * CENTER;
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x || .1, dy = ns[i].y - ns[j].y || .1;
          const d2 = dx * dx + dy * dy, f = REPEL / d2;
          ns[i].vx += dx * f; ns[i].vy += dy * f; ns[j].vx -= dx * f; ns[j].vy -= dy * f;
        }
      }
      s.edges.forEach(e => {
        const src = ns.find(n => n.id === e.source), tgt = ns.find(n => n.id === e.target);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x, dy = tgt.y - src.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const tl = 90 + (e.strength || 1) * 15, f = (dist - tl) * K, nx = dx / dist * f, ny = dy / dist * f;
        src.vx += nx; src.vy += ny; tgt.vx -= nx; tgt.vy -= ny;
      });
      ns.forEach(n => {
        n.vx *= DAMP; n.vy *= DAMP;
        n.x = Math.max(36, Math.min(W - 36, n.x + n.vx));
        n.y = Math.max(36, Math.min(H - 36, n.y + n.vy));
      });
      setTick(t => t + 1);
      s.animId = requestAnimationFrame(step);
    };
    stateRef.current.animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(stateRef.current.animId);
  }, [nodes.map(n => n.id).join(','), seedId]);

  const s = stateRef.current;
  if (!s.nodes.length) return (
    <div className="flex items-center justify-center h-64 rounded-xl bg-muted/20 border text-xs text-muted-foreground">
      Select a medicine above to visualize the graph
    </div>
  );
  return (
    <svg ref={svgRef} className="w-full rounded-xl bg-muted/10 border" style={{ height: 260 }}>
      <defs>
        <marker id="arr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="#cbd5e1" />
        </marker>
      </defs>
      {s.edges.map((e, i) => {
        const src = s.nodes.find(n => n.id === e.source), tgt = s.nodes.find(n => n.id === e.target);
        if (!src || !tgt) return null;
        return <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
          stroke="#e2e8f0" strokeWidth={Math.min(1 + (e.strength || 0) * .2, 3)} strokeOpacity={0.8} markerEnd="url(#arr)" />;
      })}
      {s.nodes.map(n => {
        const isSeed = n.id === seedId;
        const col = DEPTH_COLORS[Math.min(n.depth || 0, DEPTH_COLORS.length - 1)];
        const r = isSeed ? 20 : 13;
        return (
          <g key={n.id} onClick={() => onNodeClick?.(n)} style={{ cursor: onNodeClick && !isSeed ? 'pointer' : 'default' }}>
            <circle cx={n.x} cy={n.y} r={r} fill={col} fillOpacity={isSeed ? 1 : 0.8}
              stroke={isSeed ? '#fff' : 'transparent'} strokeWidth={2.5}
              style={{ filter: isSeed ? `drop-shadow(0 0 6px ${col})` : 'none', transition: 'r .2s' }} />
            {(n.frequency || 0) > 0 && (
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">{n.frequency}</text>
            )}
            <text x={n.x} y={n.y + r + 11} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight={isSeed ? '700' : '500'}>
              {n.name.length > 13 ? n.name.slice(0, 12) + '…' : n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Transaction states definition ─────────────────────────────
const TX_STATES = [
  { id: 'IDLE',    label: 'IDLE',     desc: 'No transaction. Connection ready.', color: '#6366f1', cmd: 'CONNECTION ACQUIRED' },
  { id: 'ACTIVE',  label: 'ACTIVE',   desc: 'BEGIN issued. Statements are now buffered.', color: '#10b981', cmd: 'BEGIN' },
  { id: 'INTRANS', label: 'IN TRANS', desc: 'SAVEPOINT set. Partial rollback possible.', color: '#f59e0b', cmd: 'SAVEPOINT sp1' },
  { id: 'INERROR', label: 'IN ERROR', desc: 'A statement failed. No more queries until ROLLBACK.', color: '#ef4444', cmd: 'SELECT non_existent ↯' },
  { id: 'ACTIVE2', label: 'ACTIVE',   desc: 'ROLLBACK TO SAVEPOINT sp1 — error state cleared.', color: '#10b981', cmd: 'ROLLBACK TO SAVEPOINT sp1' },
  { id: 'IDLE2',   label: 'IDLE',     desc: 'COMMIT issued. Data persisted. Connection free.', color: '#6366f1', cmd: 'COMMIT' },
];

const EVENT_COLORS: Record<string, string> = {
  LOGIN: '#6366f1', CREATE_PRESCRIPTION: '#10b981', UPDATE_PRESCRIPTION: '#f59e0b',
  CREATE_PATIENT: '#3b82f6', DELETE_PATIENT: '#ef4444', VIEW_REPORT: '#8b5cf6',
  UPDATE_PATIENT: '#ec4899', CREATE_MEDICINE: '#14b8a6', TRANSACTION_DEMO: '#f97316',
};

// ─── Page ───────────────────────────────────────────────────────
export default function AdvancedFeaturesPage() {
  // 1. Redis
  const [redisTimes, setRedisTimes]   = useState<{ label: string; ms: number; hit: boolean }[]>([]);
  const [redisLoading, setRedisLoading] = useState(false);
  const [redisStats, setRedisStats]   = useState({ hits: 0, misses: 0 });

  // 2. CTE graph
  const [cteNodes,   setCteNodes]     = useState<GraphNode[]>([]);
  const [cteEdges,   setCteEdges]     = useState<GraphEdge[]>([]);
  const [cteSeedId,  setCteSeedId]    = useState<string | null>(null);
  const [cteSeedName,setCteSeedName]  = useState('');
  const [cteLoading, setCteLoading]   = useState(false);
  const [medicines,  setMedicines]    = useState<any[]>([]);

  // 3. Transactions
  const [txStep,    setTxStep]        = useState(-1);
  const [txRunning, setTxRunning]     = useState(false);
  const [txAcid,    setTxAcid]        = useState<any>(null);
  const [txLoading, setTxLoading]     = useState(false);

  // 4. Neo4j
  const [neo4jNodes,  setNeo4jNodes]  = useState<GraphNode[]>([]);
  const [neo4jEdges,  setNeo4jEdges]  = useState<GraphEdge[]>([]);
  const [neo4jStatus, setNeo4jStatus] = useState<'unknown'|'connected'|'disconnected'>('unknown');
  const [neo4jMsg,    setNeo4jMsg]    = useState('');
  const [neo4jSeedId, setNeo4jSeedId] = useState<string|null>(null);
  const [neo4jLoading,setNeo4jLoading]= useState(false);

  // 5. MongoDB
  const [mongoEvents, setMongoEvents] = useState<any[]>([]);
  const [mongoStats,  setMongoStats]  = useState<any[]>([]);
  const [mongoStatus, setMongoStatus] = useState<'unknown'|'connected'|'disconnected'>('unknown');
  const [mongoLoading,setMongoLoading]= useState(false);
  const mongoTimer = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    apiFetch<any[]>('/api/medicines').then(setMedicines).catch(() => {});
  }, []);

  // ── 1. Redis
  const runRedisFetch = async (label: string) => {
    setRedisLoading(true);
    const t0 = performance.now();
    try {
      const token = localStorage.getItem('smartrx_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/medicines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await res.json();
      const ms  = Math.round(performance.now() - t0);
      const hit = res.headers.get('X-Cache') === 'HIT';
      setRedisTimes(p => [...p.slice(-7), { label, ms, hit }]);
      setRedisStats(p => hit ? { ...p, hits: p.hits + 1 } : { ...p, misses: p.misses + 1 });
    } finally { setRedisLoading(false); }
  };

  // ── 2. CTE Graph
  const loadCteGraph = async (id: string, name: string) => {
    setCteLoading(true); setCteSeedId(id); setCteSeedName(name);
    try {
      const data: any = await apiFetch(`/api/medicines/${id}/graph?depth=3`);
      const seedNode: GraphNode = { id, name, depth: 0, x: 0, y: 0, vx: 0, vy: 0 };
      const related: GraphNode[] = (data.graph || []).map((g: any) => ({
        id: g.medicine_id, name: g.medicine_name, depth: Number(g.depth),
        frequency: Number(g.frequency), x: 0, y: 0, vx: 0, vy: 0,
      }));
      setCteNodes([seedNode, ...related]);
      setCteEdges((data.graph || []).map((g: any) => ({
        source: id, target: g.medicine_id, strength: Number(g.frequency),
      })));
    } finally { setCteLoading(false); }
  };

  // ── 3. Transactions
  const runTxStateMachine = async () => {
    setTxRunning(true); setTxStep(-1);
    for (let i = 0; i < TX_STATES.length; i++) {
      await new Promise(r => setTimeout(r, 900));
      setTxStep(i);
    }
    await apiFetch('/api/transactions/states').catch(() => {});
    setTxRunning(false);
  };

  const runAcidDemo = async () => {
    setTxLoading(true); setTxAcid(null);
    try {
      const d = await apiFetch('/api/transactions/acid-demo', { method: 'POST', json: { simulateFailure: true } });
      setTxAcid(d);
    } finally { setTxLoading(false); }
  };

  // ── 4. Neo4j
  const checkNeo4j = async () => {
    setNeo4jLoading(true);
    try {
      const d: any = await apiFetch('/api/neo4j/status');
      setNeo4jStatus(d.connected ? 'connected' : 'disconnected');
      setNeo4jMsg(d.connected ? 'Neo4j connected' : d.error || 'Not connected — see setup_instructions in response');
    } finally { setNeo4jLoading(false); }
  };

  const syncNeo4j = async () => {
    setNeo4jLoading(true);
    try { const d: any = await apiFetch('/api/neo4j/sync', { method: 'POST' }); setNeo4jMsg(d.message || 'Synced'); }
    finally { setNeo4jLoading(false); }
  };

  const loadNeo4jGraph = async (medId: string) => {
    setNeo4jLoading(true); setNeo4jSeedId(medId);
    try {
      const data: any = await apiFetch(`/api/neo4j/graph/${medId}?depth=2`);
      const seedMed = medicines.find(m => m.id === medId);
      const seedNode: GraphNode = { id: medId, name: seedMed?.name || 'Seed', depth: 0, x: 0, y: 0, vx: 0, vy: 0 };
      const related: GraphNode[] = (data.graph || []).map((g: any) => ({
        id: g.medicine_id || g.related_id, name: g.medicine_name || g.related_name,
        depth: Number(g.hops || g.depth || 1), frequency: Number(g.total_freq || g.frequency || 0),
        x: 0, y: 0, vx: 0, vy: 0,
      }));
      setNeo4jNodes([seedNode, ...related]);
      setNeo4jEdges((data.graph || []).map((g: any) => ({
        source: medId, target: g.medicine_id || g.related_id, strength: Number(g.total_freq || 1),
      })));
    } finally { setNeo4jLoading(false); }
  };

  // ── 5. MongoDB
  const loadMongo = useCallback(async () => {
    try {
      const [evs, stats, status]: any = await Promise.all([
        apiFetch('/api/logs?limit=15'),
        apiFetch('/api/logs/stats'),
        apiFetch('/api/logs/status'),
      ]);
      setMongoEvents(evs.events || []);
      setMongoStats(stats.by_type || []);
      setMongoStatus(status.connected ? 'connected' : 'disconnected');
    } catch { setMongoStatus('disconnected'); }
  }, []);

  const writeEvent = async () => {
    setMongoLoading(true);
    try {
      await apiFetch('/api/logs/event', { method: 'POST', json: { eventType: 'VIEW_REPORT', meta: { page: 'AdvancedDB' } } });
      await loadMongo();
    } finally { setMongoLoading(false); }
  };

  useEffect(() => {
    loadMongo();
    mongoTimer.current = setInterval(loadMongo, 8000);
    return () => { if (mongoTimer.current) clearInterval(mongoTimer.current); };
  }, [loadMongo]);

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advanced Database Features</h1>
        <p className="text-muted-foreground text-sm mt-1">All features are live — backed by real API calls and actual database operations</p>
      </div>

      {/* ══ 1. REDIS ══ */}
      <SectionCard icon={Zap} title="Redis Caching — Live Timing Race" badge="ioredis" badgeColor="red">
        <p className="text-xs text-muted-foreground mb-4">
          Time the medicine catalogue fetch. First call hits PostgreSQL (<span className="text-indigo-600 font-medium">MISS</span>).
          Subsequent calls are served from Redis (<span className="text-emerald-600 font-medium">HIT</span>).
          Watch the bar chart — cached requests are dramatically faster.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Cache HITs',  val: redisStats.hits,   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Cache MISSes',val: redisStats.misses, color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-200'  },
            { label: 'Hit Rate',
              val: redisStats.hits + redisStats.misses === 0 ? '—'
                : Math.round(redisStats.hits / (redisStats.hits + redisStats.misses) * 100) + '%',
              color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 border text-center ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {redisTimes.length > 0 && (
          <div className="rounded-xl border bg-muted/20 p-3 mb-4">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={redisTimes} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} unit="ms" />
                <Tooltip formatter={(v: any) => [`${v}ms`, 'Response time']} />
                <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                  {redisTimes.map((t, i) => <Cell key={i} fill={t.hit ? '#10b981' : '#6366f1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />HIT (Redis — fast)</span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-indigo-500" />MISS (PostgreSQL — slower)</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Btn loading={redisLoading} onClick={() => runRedisFetch('Call #' + (redisTimes.length + 1))}>
            <Zap className="h-3 w-3" /> Fetch Medicines
          </Btn>
          <Btn variant="outline" onClick={() => { setRedisTimes([]); setRedisStats({ hits: 0, misses: 0 }); }}>
            Clear Chart
          </Btn>
          <p className="text-[10px] text-muted-foreground self-center">
            Call once → MISS. Call again → HIT. See the difference.
          </p>
        </div>
      </SectionCard>

      {/* ══ 2. RECURSIVE CTE ══ */}
      <SectionCard icon={GitBranch} title="WITH RECURSIVE CTE — Co-Prescription Graph" badge="PostgreSQL" badgeColor="blue">
        <p className="text-xs text-muted-foreground mb-4">
          Click any medicine pill to make it the seed node. The recursive CTE traverses the co-prescription graph
          up to 3 hops deep. <strong>Click any graph node</strong> to re-seed. Numbers inside nodes = co-prescription count. Node color = depth.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4 max-h-20 overflow-y-auto">
          {medicines.slice(0, 24).map(m => (
            <button key={m.id} onClick={() => loadCteGraph(m.id, m.name)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium ${cteSeedId === m.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card hover:bg-accent hover:border-primary/40'}`}>
              {cteLoading && cteSeedId === m.id ? <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-1" /> : null}
              {m.name}
            </button>
          ))}
        </div>

        <ForceGraph nodes={cteNodes} edges={cteEdges} seedId={cteSeedId || undefined}
          onNodeClick={n => n.id !== cteSeedId && loadCteGraph(n.id, n.name)} />

        <div className="flex flex-wrap items-center gap-4 mt-3">
          {DEPTH_COLORS.slice(0, 4).map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-3 w-3 rounded-full" style={{ background: c }} />
              {i === 0 ? 'Seed' : `Depth ${i}`}
            </span>
          ))}
          {cteSeedName && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              Seed: <strong>{cteSeedName}</strong> · {cteNodes.length - 1} related found
            </span>
          )}
        </div>
      </SectionCard>

      {/* ══ 3. TRANSACTIONS ══ */}
      <SectionCard icon={Lock} title="Transaction Management — ACID + State Machine" badge="PostgreSQL" badgeColor="violet">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Animated state machine */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              PostgreSQL State Machine
            </p>
            <div className="space-y-1.5 mb-4">
              {TX_STATES.map((s, i) => {
                const isActive = txStep === i;
                const isDone   = txStep > i;
                return (
                  <div key={s.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 border ${
                    isActive ? 'shadow-md scale-[1.01]' : 'border-transparent'}`}
                    style={isActive ? { borderColor: s.color + '40', background: s.color + '08' } : {}}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 transition-all duration-300`}
                      style={isActive ? { background: s.color, borderColor: s.color, color: '#fff', boxShadow: `0 0 10px ${s.color}60` }
                        : isDone ? { background: '#10b981', borderColor: '#10b981', color: '#fff' }
                        : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold" style={isActive ? { color: s.color } : { color: '#94a3b8' }}>
                          {s.label}
                        </span>
                        {isActive && (
                          <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground animate-pulse">
                            {s.cmd}
                          </code>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Btn loading={txRunning} onClick={runTxStateMachine}>
              <Play className="h-3 w-3" /> {txRunning ? 'Animating states…' : 'Animate State Machine'}
            </Btn>
          </div>

          {/* ACID demo */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              ACID Properties (Live DB)
            </p>
            <div className="space-y-2 mb-4">
              {[
                { letter: 'A', name: 'Atomicity',   text: 'All statements commit or none at all.', color: '#6366f1' },
                { letter: 'C', name: 'Consistency',  text: 'Every commit satisfies all constraints.', color: '#10b981' },
                { letter: 'I', name: 'Isolation',    text: 'Uncommitted rows hidden from other sessions.', color: '#f59e0b' },
                { letter: 'D', name: 'Durability',   text: 'Committed data survives crashes via WAL.', color: '#3b82f6' },
              ].map(p => (
                <div key={p.letter} className="flex items-start gap-3 rounded-xl p-2.5 border"
                  style={{ borderColor: p.color + '30', background: p.color + '08' }}>
                  <span className="h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0"
                    style={{ background: p.color }}>{p.letter}</span>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: p.color }}>{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {txAcid && (
              <div className="space-y-2 mb-3">
                {Object.entries(txAcid.scenarios || {}).map(([key, val]: [string, any]) => {
                  const isCommit   = val.outcome?.includes('COMMITTED');
                  const isIntended = val.outcome?.includes('ROLLED_BACK');
                  return (
                    <div key={key} className={`rounded-xl p-2.5 border text-[10px] ${
                      isCommit   ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                      isIntended ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                   'bg-red-50 border-red-200 text-red-800'}`}>
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {isCommit   ? <CheckCircle className="h-3 w-3 text-emerald-600" /> :
                         isIntended ? <Info className="h-3 w-3 text-blue-600" /> :
                                      <XCircle className="h-3 w-3 text-red-500" />}
                        {key}: {val.outcome}
                      </div>
                      {val.what_happened && <p className="opacity-80 mb-0.5">{val.what_happened}</p>}
                      {val.why_this_is_correct && (
                        <p className="font-medium mt-1 text-blue-700">💡 {val.why_this_is_correct}</p>
                      )}
                      {val.cleanup && <p className="opacity-60 mt-0.5 italic">✓ {val.cleanup}</p>}
                    </div>
                  );
                })}
                {txAcid.important_note && (
                  <p className="text-[10px] text-muted-foreground italic bg-muted/40 rounded-lg px-3 py-2 border">
                    ℹ️ {txAcid.important_note}
                  </p>
                )}
              </div>
            )}

            <Btn loading={txLoading} variant="outline" onClick={runAcidDemo}>
              <Play className="h-3 w-3" /> Run ACID Demo (real DB)
            </Btn>
          </div>
        </div>
      </SectionCard>

      {/* ══ 4. NEO4J ══ */}
      <SectionCard icon={Database} title="Neo4j — Native Graph Database" badge="neo4j-driver" badgeColor="green">
        <p className="text-xs text-muted-foreground mb-4">
          Neo4j stores <code className="text-[10px] bg-muted px-1 rounded">(:Medicine)</code> nodes and{' '}
          <code className="text-[10px] bg-muted px-1 rounded">[:CO_PRESCRIBED_WITH]</code> relationships natively.
          Sync imports pairs from PostgreSQL. Graph uses Cypher{' '}
          <code className="text-[10px] bg-muted px-1 rounded">MATCH (a)-[*1..2]-(b)</code> — no recursive SQL needed.
          Click any node to re-traverse from it.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Btn loading={neo4jLoading} onClick={checkNeo4j}>Check Connection</Btn>
          <Btn loading={neo4jLoading} variant="outline" onClick={syncNeo4j}>
            <RefreshCw className="h-3 w-3" /> Sync from PostgreSQL
          </Btn>
          {medicines.slice(0, 3).map(m => (
            <Btn key={m.id} loading={neo4jLoading && neo4jSeedId === m.id} variant="outline"
              onClick={() => loadNeo4jGraph(m.id)}>
              Graph: {m.name.length > 12 ? m.name.slice(0, 11) + '…' : m.name}
            </Btn>
          ))}
          {neo4jStatus !== 'unknown' && (
            <span className={`flex items-center gap-1.5 text-[11px] font-medium ml-auto ${neo4jStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {neo4jStatus === 'connected' ? <CheckCircle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              {neo4jStatus === 'connected' ? 'Connected' : 'Not installed'}
            </span>
          )}
        </div>

        {neo4jMsg && (
          <div className={`text-[11px] rounded-xl px-3 py-2 mb-4 border flex items-start gap-2 ${neo4jStatus === 'connected'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{neo4jMsg}</span>
          </div>
        )}

        {neo4jNodes.length > 0 ? (
          <>
            <ForceGraph nodes={neo4jNodes} edges={neo4jEdges} seedId={neo4jSeedId || undefined}
              onNodeClick={n => n.id !== neo4jSeedId && loadNeo4jGraph(n.id)} />
            <p className="text-[10px] text-muted-foreground mt-2">
              {neo4jNodes.length - 1} relationships via Cypher *1..2 path · Click node to re-seed
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed h-36 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Database className="h-7 w-7 opacity-20" />
            <p className="text-xs">1. Check Connection → 2. Sync → 3. Click "Graph: [medicine]"</p>
          </div>
        )}
      </SectionCard>

      {/* ══ 5. MONGODB ══ */}
      <SectionCard icon={Server} title="MongoDB — Live Audit Log (Polyglot Persistence)" badge="mongoose" badgeColor="yellow">
        <p className="text-xs text-muted-foreground mb-4">
          Audit events stored as flexible schema-less documents alongside PostgreSQL.
          The bar chart is a real MongoDB aggregation pipeline. Auto-refreshes every 8 seconds.
          Events are auto-deleted after 90 days via a TTL index.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live feed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Live Event Feed</p>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[10px] ${mongoStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${mongoStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  {mongoStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
                <Btn loading={mongoLoading} variant="outline" onClick={writeEvent}>+ Write Event</Btn>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/10 overflow-hidden min-h-[180px]">
              {mongoEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 text-muted-foreground gap-2">
                  <Server className="h-6 w-6 opacity-20" />
                  <p className="text-xs text-center px-4">
                    {mongoStatus === 'disconnected'
                      ? 'MongoDB not running — add MONGO_URI to server/.env and run mongod'
                      : 'No events yet — click "+ Write Event" to create one'}
                  </p>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {mongoEvents.map((ev, i) => (
                    <div key={ev._id || i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors">
                      <span className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: EVENT_COLORS[ev.eventType] || '#94a3b8' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate">{ev.eventType}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                          {ev.meta?.page ? ` · ${ev.meta.page}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aggregation chart */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aggregation Pipeline</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['$match', '→ $group', '→ $sort', '→ $project'].map(s => (
                <code key={s} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{s}</code>
              ))}
            </div>
            <div className="rounded-xl border bg-muted/10 p-3 min-h-[160px] flex items-center">
              {mongoStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={mongoStats} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 90 }}>
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="eventType" tick={{ fontSize: 9 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {mongoStats.map((s, i) => <Cell key={i} fill={EVENT_COLORS[s.eventType] || '#6366f1'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full flex items-center justify-center h-36 text-xs text-muted-foreground">
                  {mongoStatus === 'disconnected' ? 'Connect MongoDB to see aggregation stats' : 'Write events to see stats'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Btn variant="outline" loading={mongoLoading} onClick={loadMongo}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Btn>
          <p className="text-[10px] text-muted-foreground">Auto-refreshes every 8s · TTL index auto-expires after 90 days</p>
        </div>
      </SectionCard>
    </div>
  );
}
