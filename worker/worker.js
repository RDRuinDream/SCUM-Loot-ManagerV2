
/**
 * Cloudflare Worker for SCUM Loot Manager Auth
 * Features: Secure Login, User Mgmt (Add/Del/Status/Reset), Brute Force Protection, Access Logs, Session Mgmt.
 * 
 * REQUIRED D1 SCHEMA:
 * 
 * CREATE TABLE IF NOT EXISTS users (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   username TEXT UNIQUE NOT NULL,
 *   email TEXT,
 *   password_hash TEXT NOT NULL,
 *   salt TEXT NOT NULL,
 *   role TEXT DEFAULT 'user',
 *   name TEXT,
 *   is_active INTEGER DEFAULT 1,
 *   created_at INTEGER DEFAULT (unixepoch())
 * );
 * 
 * CREATE TABLE IF NOT EXISTS login_attempts (
 *   ip TEXT PRIMARY KEY,
 *   attempts INTEGER DEFAULT 0,
 *   lock_until INTEGER DEFAULT 0
 * );
 * 
 * CREATE TABLE IF NOT EXISTS access_logs (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   user_id INTEGER,
 *   username TEXT,
 *   ip TEXT,
 *   action TEXT,
 *   timestamp INTEGER DEFAULT (unixepoch())
 * );
 * 
 * CREATE TABLE IF NOT EXISTS sessions (
 *   token TEXT PRIMARY KEY,
 *   user_id INTEGER,
 *   username TEXT,
 *   role TEXT,
 *   ip TEXT,
 *   expires_at INTEGER,
 *   created_at INTEGER DEFAULT (unixepoch())
 * );
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const SCHEMA_SQL = [
`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);`,
`CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  lock_until INTEGER DEFAULT 0
);`,
`CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  ip TEXT,
  action TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);`,
`CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  username TEXT,
  role TEXT,
  ip TEXT,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);`
];

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

function validateInput(username, password) {
  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 32) return false;
  // If password provided, validate it
  if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6 || password.length > 128) return false;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
  return true;
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const exported = await crypto.subtle.exportKey("raw", key);
  
  // Explicitly check type to satisfy TS and ensure runtime safety
  if (!(exported instanceof ArrayBuffer)) {
      throw new Error("Crypto export failed: Expected ArrayBuffer");
  }

  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

async function logAction(db, userId, username, ip, action) {
    try {
        // Use Date.now() for MS timestamp to match frontend display logic
        await db.prepare('INSERT INTO access_logs (user_id, username, ip, action, timestamp) VALUES (?, ?, ?, ?, ?)').bind(userId, username, ip, action, Date.now()).run();
    } catch(e) { console.warn("Log failed", e); }
}

async function verifySession(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    const token = authHeader.split(' ')[1];
    const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ?').bind(token).first();
    
    if (!session) return null;
    if (session.expires_at < Date.now()) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        return null;
    }
    
    // Also check if user is still active
    try {
        const user = await env.DB.prepare('SELECT is_active FROM users WHERE id = ?').bind(session.user_id).first();
        if (!user || user.is_active === 0) {
            await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
            return null;
        }
    } catch (e) {
        // Fallback if column missing to avoid total lockout before migration
        console.warn("verifySession failed to check is_active (schema mismatch?)", e);
    }

    return session; // Returns { user_id, username, role, ... }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+/g, '/');
    const ip = getClientIP(request);

    // CRITICAL: Check if DB binding exists
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not configured in worker." }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    try {
      // --- DB SETUP ENDPOINT (First Run Fix & Migration) ---
      if (path === '/api/setup' && request.method === 'GET') {
          const results = [];
          for (const sql of SCHEMA_SQL) {
              try {
                  await env.DB.prepare(sql).run();
              } catch(e) {
                  results.push(`Table check error: ${e.message}`);
              }
          }
          results.push("Tables check complete.");

          // --- AUTO MIGRATIONS ---
          // Fix: D1_ERROR: no such column: is_active
          try {
             await env.DB.prepare("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1").run();
             results.push("Migration applied: Added 'is_active' column.");
          } catch(e) {
             // Column likely exists or other error, assume fine
          }

          // Create default admin if not exists
          try {
              // Ensure users table exists before checking admin
              const admin = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind('admin').first();
              if (!admin) {
                   const salt = crypto.randomUUID();
                   const hash = await hashPassword('admin123', salt); // Default password
                   await env.DB.prepare('INSERT INTO users (username, password_hash, salt, role, name) VALUES (?, ?, ?, ?, ?)').bind('admin', hash, salt, 'admin', 'System Admin').run();
                   results.push("Default admin created: admin / admin123");
              } else {
                   results.push("Admin user already exists.");
              }
          } catch(e) { results.push("Admin creation check failed: " + e.message); }

          return new Response(JSON.stringify({ message: "Setup/Repair complete", details: results }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // --- LOGIN ---
      if (path === '/api/login' && request.method === 'POST') {
        let attempt = null;
        try { attempt = await env.DB.prepare('SELECT * FROM login_attempts WHERE ip = ?').bind(ip).first(); } catch (e) {}
        
        const now = Date.now();
        
        // 1. Check if CURRENTLY locked
        if (attempt && attempt.lock_until > now) {
            const waitMinutes = Math.ceil((attempt.lock_until - now) / 60000);
            return new Response(JSON.stringify({ error: `Locked. Try again in ${waitMinutes}m.` }), { status: 429, headers: CORS_HEADERS });
        }

        const { username, password } = await request.json();
        if (!validateInput(username, password)) {
            return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: CORS_HEADERS });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
        
        let loginSuccess = false;
        if (user) {
            // Check is_active safely
            if (user.is_active !== undefined && user.is_active === 0) {
                 return new Response(JSON.stringify({ error: 'Account disabled' }), { status: 403, headers: CORS_HEADERS });
            }
            const hash = await hashPassword(password, user.salt);
            if (hash === user.password_hash) {
                loginSuccess = true;
            }
        }

        if (!loginSuccess) {
            // Log attempt with robust UPSERT and intelligent reset
            try {
                let newAttempts = (attempt?.attempts || 0) + 1;
                let newLockUntil = 0; // Default 0 (not locked)

                // If previous lock existed but expired (lock_until < now), reset attempts to 1 (this failure)
                // This prevents "Death Spiral" where 1 failure after 15m wait locks you again instantly.
                if (attempt && attempt.lock_until > 0 && attempt.lock_until < now) {
                    newAttempts = 1;
                }
                
                // 5 failed attempts triggers a 15 minute lock
                if (newAttempts >= 5) {
                    newLockUntil = now + 15 * 60 * 1000; // 15 mins lock
                }
                
                await env.DB.prepare(
                    `INSERT INTO login_attempts (ip, attempts, lock_until) VALUES (?, ?, ?) 
                     ON CONFLICT(ip) DO UPDATE SET attempts = excluded.attempts, lock_until = excluded.lock_until`
                ).bind(ip, newAttempts, newLockUntil).run();
            } catch (e) {
                console.warn("Failed to update login attempts", e);
            }

            // --- LOG THE FAILURE (Including Password as requested) ---
            await logAction(env.DB, user ? user.id : null, username, ip, `LOGIN_FAILED Pass: ${password}`);

            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: CORS_HEADERS });
        } else {
            // Success - Clear login attempts
            try { await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run(); } catch(e) {}
            await logAction(env.DB, user.id, user.username, ip, 'LOGIN_SUCCESS');
        }

        // Create Session
        const token = crypto.randomUUID();
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        await env.DB.prepare('INSERT INTO sessions (token, user_id, username, role, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?)').bind(token, user.id, user.username, user.role, ip, expiresAt).run();

        return new Response(JSON.stringify({ 
            token, 
            user: { username: user.username, name: user.name, role: user.role, email: user.email } 
        }), { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
      }

      // --- AUTH MIDDLEWARE ---
      const currentSession = await verifySession(request, env);
      
      // Public endpoints handled above. All below require auth.
      if (!currentSession && path !== '/api/login') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
      }

      const requireAdmin = () => {
          if (currentSession.role !== 'admin') throw new Error("Unauthorized");
      };

      // --- LOGOUT ---
      if (path === '/api/logout' && request.method === 'POST') {
          const token = request.headers.get('Authorization').split(' ')[1];
          await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
          return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // --- USER MANAGEMENT (Admin) ---

      // 1. Get Users
      if (path === '/api/users' && request.method === 'GET') {
        requireAdmin();
        const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(results), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 2. Add User
      if (path === '/api/users' && request.method === 'POST') {
        requireAdmin();
        const { username, password, name, role, email } = await request.json();
        
        if (!validateInput(username, password)) return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: CORS_HEADERS });

        const salt = crypto.randomUUID();
        const hash = await hashPassword(password, salt);
        try {
          await env.DB.prepare('INSERT INTO users (username, password_hash, salt, name, role, email) VALUES (?, ?, ?, ?, ?, ?)').bind(username, hash, salt, name || username, role || 'user', email || '').run();
          await logAction(env.DB, currentSession.user_id, currentSession.username, ip, `CREATE_USER: ${username}`);
          return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        } catch (e) { return new Response(JSON.stringify({ error: 'User exists' }), { status: 400, headers: CORS_HEADERS }); }
      }

      // 3. Delete User
      if (path.startsWith('/api/users/') && request.method === 'DELETE' && !path.endsWith('/sessions')) {
         requireAdmin();
         const target = path.split('/').pop();
         if (target === currentSession.username) return new Response(JSON.stringify({ error: 'Cannot delete self' }), { status: 400, headers: CORS_HEADERS });
         
         await env.DB.prepare('DELETE FROM users WHERE username = ?').bind(target).run();
         // Also kill sessions
         await env.DB.prepare('DELETE FROM sessions WHERE username = ?').bind(target).run();
         
         await logAction(env.DB, currentSession.user_id, currentSession.username, ip, `DELETE_USER: ${target}`);
         return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 4. Toggle Status (Active/Disabled)
      if (path.match(/^\/api\/users\/.*\/status$/) && request.method === 'PUT') {
          requireAdmin();
          const target = path.split('/')[3]; 
          const { active } = await request.json(); 
          if (target === currentSession.username) return new Response(JSON.stringify({ error: 'Cannot disable self' }), { status: 400, headers: CORS_HEADERS });

          await env.DB.prepare('UPDATE users SET is_active = ? WHERE username = ?').bind(active ? 1 : 0, target).run();
          // If disabled, kill all sessions
          if (!active) {
              await env.DB.prepare('DELETE FROM sessions WHERE username = ?').bind(target).run();
          }
          await logAction(env.DB, currentSession.user_id, currentSession.username, ip, `UPDATE_STATUS: ${target} -> ${active}`);
          return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 5. Reset Password
      if (path.match(/^\/api\/users\/.*\/reset$/) && request.method === 'PUT') {
          requireAdmin();
          const target = path.split('/')[3];
          const { newPassword } = await request.json();
          if (!newPassword || newPassword.length < 6) return new Response(JSON.stringify({ error: 'Password too short' }), { status: 400, headers: CORS_HEADERS });
          
          const salt = crypto.randomUUID();
          const hash = await hashPassword(newPassword, salt);
          await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE username = ?').bind(hash, salt, target).run();
          // Kill sessions on pass reset to force relogin
          await env.DB.prepare('DELETE FROM sessions WHERE username = ?').bind(target).run();
          
          await logAction(env.DB, currentSession.user_id, currentSession.username, ip, `RESET_PASS: ${target}`);
          return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 6. Force Logout (Revoke Sessions)
      if (path.match(/^\/api\/users\/.*\/sessions$/) && request.method === 'DELETE') {
          requireAdmin();
          const target = path.split('/')[3];
          await env.DB.prepare('DELETE FROM sessions WHERE username = ?').bind(target).run();
          await logAction(env.DB, currentSession.user_id, currentSession.username, ip, `FORCE_LOGOUT: ${target}`);
          return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 7. Security Logs
      if (path === '/api/logs' && request.method === 'GET') {
        requireAdmin();
        try {
            const { results } = await env.DB.prepare('SELECT * FROM login_attempts ORDER BY attempts DESC').all();
            return new Response(JSON.stringify(results), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        } catch (e) { return new Response(JSON.stringify([]), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }); }
      }
      
      // 8. Access History
      if (path === '/api/history' && request.method === 'GET') {
          requireAdmin();
          const { results } = await env.DB.prepare('SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 50').all();
          return new Response(JSON.stringify(results), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 9. Unlock IP
      if (path.startsWith('/api/logs/') && request.method === 'DELETE') {
         requireAdmin();
         const targetIp = decodeURIComponent(path.split('/').pop());
         await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(targetIp).run();
         await logAction(env.DB, currentSession.user_id, currentSession.username, ip, `UNBAN_IP: ${targetIp}`);
         return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // 10. Session Check
      if (path === '/api/me' && request.method === 'GET') {
         return new Response(JSON.stringify({ valid: true, user: { username: currentSession.username, role: currentSession.role } }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
    } catch (e) { 
        if(e.message === 'Unauthorized') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }); 
    }
  }
};
