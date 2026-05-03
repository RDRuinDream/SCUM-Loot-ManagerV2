import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './auth'; // 假设配置了 better-auth

type Bindings = {
  DB: D1Database;
  BACKUPS: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok', version: '2.0.0' }));

// 获取用户配置
app.get('/api/configs', async (c) => {
  // TODO: Auth check
  const { results } = await c.env.DB.prepare('SELECT id, config_name, updated_at FROM server_configs ORDER BY updated_at DESC').all();
  return c.json({ data: results });
});

// 这是一个极其精简的 Worker 入口，生产中需结合 better-auth 路由和全面的 CRUD。
export default app;
