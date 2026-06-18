// ================================================================
// SmartRx — Redis Cache Client
// Uses: ioredis (npm install ioredis)
// Purpose: Cache hot read paths so PostgreSQL isn't hit on every
//          request for data that rarely changes.
//
// Cached paths:
//   medicines:all         — full medicine catalogue  (TTL 5 min)
//   medicines:search:<q>  — search results           (TTL 2 min)
//   medicines:top         — top-5 medicines           (TTL 2 min)
//   dashboard:<doctorId>  — dashboard stats           (TTL 1 min)
//   patients:<doctorId>   — patient list              (TTL 2 min)
//
// Cache is INVALIDATED on writes:
//   New medicine   → bust medicines:* keys
//   New patient    → bust patients:<doctorId>
//   New prescription → bust dashboard:<doctorId>
// ================================================================

const Redis = require('ioredis');

let redis;
let connected = false;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      host:     process.env.REDIS_HOST     || '127.0.0.1',
      port:     parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db:       parseInt(process.env.REDIS_DB   || '0'),
      // DO NOT use lazyConnect + enableOfflineQueue:false together.
      // That combination causes every command to throw before the
      // TCP connection is established, so set() never writes and
      // every subsequent get() is a MISS.
      //
      // ioredis default behaviour (no lazyConnect) connects
      // immediately on construction and queues commands until ready.
      // This is exactly what we want.
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 1000);
      },
      connectTimeout:    3000,
      commandTimeout:    2000,
      maxRetriesPerRequest: 1,
    });

    redis.on('connect', () => {
      connected = true;
      console.log('✅  Redis connected — caching active');
    });
    redis.on('ready', () => {
      connected = true;
    });
    redis.on('error', (err) => {
      if (connected) console.warn('[Redis] error:', err.message);
      connected = false;
    });
    redis.on('close', () => { connected = false; });
  }
  return redis;
}

// ── Low-level helpers ──────────────────────────────────────────

async function get(key) {
  try {
    const r = getRedis();
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;   // cache miss — degrade gracefully
  }
}

async function set(key, value, ttlSeconds = 120) {
  try {
    const r = getRedis();
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silent — cache write failure is non-fatal
  }
}

async function del(...keys) {
  try {
    const r = getRedis();
    if (keys.length > 0) await r.del(...keys);
  } catch { /* silent */ }
}

// Bust all keys matching a pattern (uses SCAN, safe for production)
async function bustPattern(pattern) {
  try {
    const r = getRedis();
    const keys = await r.keys(pattern);
    if (keys.length > 0) await r.del(...keys);
  } catch { /* silent */ }
}

// ── Named cache operations ─────────────────────────────────────

const TTL = {
  medicines:  300,   // 5 minutes
  search:     120,   // 2 minutes
  dashboard:  60,    // 1 minute
  patients:   120,   // 2 minutes
};

async function isAlive() {
  try {
    const r = getRedis();
    const pong = await r.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

async function getStats() {
  try {
    const r = getRedis();
    const info = await r.info('stats');
    const lines = info.split('\r\n');
    const stat = (key) => {
      const line = lines.find(l => l.startsWith(key + ':'));
      return line ? line.split(':')[1] : '0';
    };
    return {
      hits:       stat('keyspace_hits'),
      misses:     stat('keyspace_misses'),
      connected:  true,
    };
  } catch {
    return { hits: 0, misses: 0, connected: false };
  }
}

module.exports = { get, set, del, bustPattern, TTL, isAlive, getStats };
