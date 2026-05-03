import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { SaveConfigSchema } from './schema';

type Bindings = {
  DB: D1Database;
  BACKUPS: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Rate Limiting Middleware (Basic KV Example)
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  // In a real app, use Cloudflare Rate Limiting or KV correctly
  // For demo: pass through
  await next();
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '2.0.0', secure: true }));

// Get configs
app.get('/api/configs', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, config_name, updated_at FROM server_configs ORDER BY updated_at DESC').all();
    return c.json({ data: results });
  } catch (error) {
    return c.json({ error: 'Database error' }, 500);
  }
});

// Save config with strict Zod validation
app.post(
  '/api/configs',
  zValidator('json', SaveConfigSchema),
  async (c) => {
    const data = c.req.valid('json');
    const id = crypto.randomUUID();
    
    // In production, user_id comes from Better-Auth context
    const userId = 'system-admin'; 
    
    await c.env.DB.prepare(
      'INSERT INTO server_configs (id, user_id, config_name, settings_json, loot_json) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, userId, data.configName, data.settingsJson || null, data.lootJson || null).run();
    
    return c.json({ status: 'success', id }, 201);
  }
);

export default app;
