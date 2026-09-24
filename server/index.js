import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');
const port = parseInt(process.env.PORT || '3002', 10);

const app = new Hono();

app.use('*', cors());

// ==========================================
// 1. CATALOGUE DU JEU
// ==========================================
app.get('/api/catalog', (c) => {
  const category = c.req.query('category');
  if (category) {
    const stmt = db.prepare('SELECT id, category, name, element, rarity, weapon_type, icon FROM catalog_items WHERE category = ? ORDER BY rarity DESC, name ASC');
    const items = stmt.all(category);
    return c.json(items);
  }
  const stmt = db.prepare('SELECT id, category, name, element, rarity, weapon_type, icon FROM catalog_items ORDER BY category, rarity DESC, name ASC');
  return c.json(stmt.all());
});

app.get('/api/catalog/:id', (c) => {
  const id = c.req.param('id');
  const stmt = db.prepare('SELECT * FROM catalog_items WHERE id = ?');
  const item = stmt.get(id);
  if (!item) return c.json({ error: 'Item non trouvé' }, 404);
  return c.json({
    ...item,
    data: item.data_json ? JSON.parse(item.data_json) : null
  });
});

// ==========================================
// 2. LOADOUTS DE PERSONNAGES
// ==========================================
app.get('/api/loadouts', (c) => {
  const charId = c.req.query('character_id');
  if (charId) {
    const stmt = db.prepare('SELECT * FROM character_loadouts WHERE character_id = ? ORDER BY created_at DESC');
    return c.json(stmt.all(Number(charId)));
  }
  const stmt = db.prepare('SELECT * FROM character_loadouts ORDER BY character_name ASC, created_at DESC');
  return c.json(stmt.all());
});

app.post('/api/loadouts', async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO character_loadouts (id, character_id, character_name, name, weapon_id, weapon_refinement, artifact_set_1_id, artifact_set_2_id, main_stats, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    Number(body.character_id),
    body.character_name || '',
    body.name || 'Nouveau Build',
    body.weapon_id ? Number(body.weapon_id) : null,
    Number(body.weapon_refinement || 1),
    body.artifact_set_1_id ? Number(body.artifact_set_1_id) : null,
    body.artifact_set_2_id ? Number(body.artifact_set_2_id) : null,
    body.main_stats ? JSON.stringify(body.main_stats) : null,
    body.notes || ''
  );
  return c.json({ success: true, id }, 201);
});

app.put('/api/loadouts/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const stmt = db.prepare(`
    UPDATE character_loadouts
    SET name = ?, weapon_id = ?, weapon_refinement = ?, artifact_set_1_id = ?, artifact_set_2_id = ?, main_stats = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    body.name,
    body.weapon_id ? Number(body.weapon_id) : null,
    Number(body.weapon_refinement || 1),
    body.artifact_set_1_id ? Number(body.artifact_set_1_id) : null,
    body.artifact_set_2_id ? Number(body.artifact_set_2_id) : null,
    body.main_stats ? JSON.stringify(body.main_stats) : null,
    body.notes || '',
    id
  );
  return c.json({ success: true });
});

app.delete('/api/loadouts/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM character_loadouts WHERE id = ?').run(id);
  return c.json({ success: true });
});

// ==========================================
// 3. PRESETS DE TEAMS
// ==========================================
app.get('/api/teams', (c) => {
  const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
  return c.json(teams);
});

app.post('/api/teams', async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO teams (id, name, description, slot1_character_id, slot1_loadout_id, slot2_character_id, slot2_loadout_id, slot3_character_id, slot3_loadout_id, slot4_character_id, slot4_loadout_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    body.name || 'Nouvelle Équipe',
    body.description || '',
    body.slot1_character_id ? Number(body.slot1_character_id) : null,
    body.slot1_loadout_id || null,
    body.slot2_character_id ? Number(body.slot2_character_id) : null,
    body.slot2_loadout_id || null,
    body.slot3_character_id ? Number(body.slot3_character_id) : null,
    body.slot3_loadout_id || null,
    body.slot4_character_id ? Number(body.slot4_character_id) : null,
    body.slot4_loadout_id || null
  );
  return c.json({ success: true, id }, 201);
});

app.put('/api/teams/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const stmt = db.prepare(`
    UPDATE teams
    SET name = ?, description = ?,
        slot1_character_id = ?, slot1_loadout_id = ?,
        slot2_character_id = ?, slot2_loadout_id = ?,
        slot3_character_id = ?, slot3_loadout_id = ?,
        slot4_character_id = ?, slot4_loadout_id = ?
    WHERE id = ?
  `);
  stmt.run(
    body.name,
    body.description || '',
    body.slot1_character_id ? Number(body.slot1_character_id) : null,
    body.slot1_loadout_id || null,
    body.slot2_character_id ? Number(body.slot2_character_id) : null,
    body.slot2_loadout_id || null,
    body.slot3_character_id ? Number(body.slot3_character_id) : null,
    body.slot3_loadout_id || null,
    body.slot4_character_id ? Number(body.slot4_character_id) : null,
    body.slot4_loadout_id || null,
    id
  );
  return c.json({ success: true });
});

app.delete('/api/teams/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return c.json({ success: true });
});

// ==========================================
// 4. PLANIFICATEUR DE MONTÉE (UPGRADE PLANNER)
// ==========================================
app.get('/api/planner', (c) => {
  const items = db.prepare("SELECT * FROM upgrade_planner ORDER BY CASE tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 ELSE 4 END, sort_order ASC, created_at DESC").all();
  return c.json(items);
});

app.post('/api/planner', async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO upgrade_planner (
      id, target_type, character_id, weapon_id, name, icon, tier,
      current_level, target_level, talent_normal_target, talent_skill_target, talent_burst_target,
      weapon_target_level, artifact_action, artifact_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    body.target_type || 'character',
    body.character_id ? Number(body.character_id) : null,
    body.weapon_id ? Number(body.weapon_id) : null,
    body.name || '',
    body.icon || '',
    body.tier || 'S',
    Number(body.current_level || 1),
    Number(body.target_level || 90),
    Number(body.talent_normal_target || 1),
    Number(body.talent_skill_target || 8),
    Number(body.talent_burst_target || 8),
    Number(body.weapon_target_level || 90),
    body.artifact_action || 'none',
    body.artifact_notes || ''
  );
  return c.json({ success: true, id }, 201);
});

app.patch('/api/planner/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(body)) {
    if (['tier', 'current_level', 'target_level', 'talent_normal_target', 'talent_skill_target', 'talent_burst_target', 'weapon_target_level', 'artifact_action', 'artifact_notes', 'is_level_done', 'is_talents_done', 'is_weapon_done', 'is_artifacts_done', 'is_completed'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return c.json({ error: 'Aucun champ valide à mettre à jour' }, 400);

  values.push(id);
  const query = `UPDATE upgrade_planner SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  return c.json({ success: true });
});

app.delete('/api/planner/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM upgrade_planner WHERE id = ?').run(id);
  return c.json({ success: true });
});

// ==========================================
// 5. MODES ENDGAME (ABYSSES & CARNAGE)
// ==========================================
app.get('/api/endgame/:mode', (c) => {
  const mode = c.req.param('mode');
  const row = db.prepare('SELECT * FROM endgame_setups WHERE id = ?').get(mode);
  if (!row) return c.json({ mode, data: null });
  return c.json({ mode: row.mode, data: JSON.parse(row.data_json), updated_at: row.updated_at });
});

app.post('/api/endgame/:mode', async (c) => {
  const mode = c.req.param('mode');
  const body = await c.req.json();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO endgame_setups (id, mode, data_json, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(mode, mode, JSON.stringify(body));
  return c.json({ success: true });
});

// ==========================================
// 6. ROADMAP D'INVOCATIONS (WISH ROADMAP)
// ==========================================
app.get('/api/wishlist', (c) => {
  const items = db.prepare('SELECT * FROM wish_roadmap ORDER BY priority_order ASC, created_at ASC').all();
  return c.json(items);
});

app.post('/api/wishlist', async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const maxOrder = db.prepare('SELECT MAX(priority_order) as m FROM wish_roadmap').get()?.m || 0;
  
  const stmt = db.prepare(`
    INSERT INTO wish_roadmap (id, item_type, item_id, name, icon, constellation_level, priority_order, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    body.item_type || 'character',
    body.item_id ? Number(body.item_id) : null,
    body.name || '',
    body.icon || '',
    body.constellation_level ? Number(body.constellation_level) : null,
    maxOrder + 1,
    body.status || 'active',
    body.notes || ''
  );
  return c.json({ success: true, id }, 201);
});

app.put('/api/wishlist/reorder', async (c) => {
  const { ids } = await c.req.json(); // Tableau ordonné d'IDs
  if (Array.isArray(ids)) {
    const stmt = db.prepare('UPDATE wish_roadmap SET priority_order = ? WHERE id = ?');
    for (let i = 0; i < ids.length; i++) {
      stmt.run(i + 1, ids[i]);
    }
  }
  return c.json({ success: true });
});

app.patch('/api/wishlist/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(body)) {
    if (['status', 'notes', 'priority_order'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE wish_roadmap SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return c.json({ success: true });
});

app.delete('/api/wishlist/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM wish_roadmap WHERE id = ?').run(id);
  return c.json({ success: true });
});

// ==========================================
// 7. FICHIERS STATIQUES DU FRONTEND SPA
// ==========================================
if (existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }));
  // Fallback SPA
  app.get('*', (c) => {
    const htmlPath = join(distDir, 'index.html');
    if (existsSync(htmlPath)) {
      return c.html(readFileSync(htmlPath, 'utf8'));
    }
    return c.text('Build frontend non trouvé dans ./dist', 404);
  });
}

// Lancement du serveur
console.log(`[Lordi Server] Démarrage sur le port ${port}...`);
serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`✓ Serveur actif sur http://localhost:${info.port}`);
});
