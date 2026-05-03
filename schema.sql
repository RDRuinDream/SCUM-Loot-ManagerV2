-- 认证与用户表 (对接 Better-Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 服务器设置与配置表
CREATE TABLE IF NOT EXISTS server_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  config_name TEXT NOT NULL,
  settings_json TEXT, -- ServerSettings.ini 转换后的 JSON
  loot_json TEXT, -- SCUM Loot Tree Json 
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 备份历史记录表
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES server_configs(id),
  snapshot_data TEXT NOT NULL, -- 或者只存KV的Key
  version_msg TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
