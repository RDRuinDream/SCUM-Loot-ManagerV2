<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SCUM Loot Manager & Auth Worker

This project contains a frontend application for managing SCUM server files and a Cloudflare Worker for authentication.

## Local Development

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the frontend app:
   `npm run dev`

## Database Setup (D1)

The backend uses Cloudflare D1. You do not need to manually run SQL files.

1. **Create Database**:
   ```bash
   npx wrangler d1 create scum-db
   ```
2. **Configure `wrangler.toml`**:
   Add the binding ID from step 1 to your `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "scum-db"
   database_id = "YOUR_DATABASE_ID_HERE"
   ```
3. **Deploy Worker**:
   ```bash
   npx wrangler deploy worker/worker.js
   ```
4. **Initialize Tables**:
   Open the app in your browser (e.g. `http://localhost:5173` or your deployed URL).
   On the Login Screen, click the **System Repair** button at the bottom.
   This will:
   - Create all necessary tables.
   - Create the default admin user (`admin` / `admin123`).
   - Fix any missing columns (Schema Migration).

## View your app in AI Studio
https://ai.studio/apps/drive/1uWQnu6A3oXEHHojIC1FgpLAQqixOzZUP
