import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');
const port = parseInt(process.env.PORT || '3002', 10);
const host = process.env.HOST || '127.0.0.1';

const app = new Hono();

app.use('*', cors());
app.use('/api/*', bodyLimit({
  maxSize: 128 * 1024,
  onError: (c) => c.json({ error: 'Payload trop volumineux (max 128 Ko)' }, 413)
}));

// Détection automatique et mise à jour transparente de l'API Yatta en arrière-plan
async function checkAutoUpdate() {
  try {
    const lastCheckRow = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('last_catalog_check');
    const now = Date.now();
    // Cooldown de 6h pour ne pas surcharger Yatta ni consommer inutilement de requêtes
    if (lastCheckRow && now - Number(lastCheckRow.value) < 6 * 3600 * 1000) {
      return;
    }
    db.prepare('INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run('last_catalog_check', String(now));

    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const vRes = await fetch('https://gi.yatta.moe/api/v2/static/version', { headers: { 'User-Agent': UA } });
    if (!vRes.ok) return;
    const vData = await vRes.json();
    const remoteVh = vData.data?.vh;
    const storedVh = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('catalog_vh')?.value;

    const count = db.prepare('SELECT COUNT(*) as c FROM catalog_items').get()?.c || 0;
    if (count === 0 || (remoteVh && remoteVh !== storedVh)) {
      console.log(`[Auto-Update] Nouvelle version Genshin détectée (remote: ${remoteVh}, locale: ${storedVh || 'none'}) -> Synchro en arrière-plan...`);
      import('../scripts/sync-catalog.js')
        .then(m => m.syncCatalog())
        .catch(err => console.error('[Auto-Update Error]', err));
    }
  } catch (err) {
    console.warn('[Auto-Update Warning] Vérification Yatta impossible:', err.message);
  }
}

// Endpoint de santé pour monitoring (Uptime Kuma)
app.get('/api/health', (c) => {
  const mem = process.memoryUsage();
  return c.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    memory: {
      rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
      heap_used_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2)
    }
  });
});

// ==========================================
// 1. CATALOGUE DU JEU
// ==========================================
app.get('/api/catalog', (c) => {
  // Lancement asynchrone non-bloquant du contrôle d'auto-update
  checkAutoUpdate();

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

// Endpoint des armes signatures (chargé depuis SQLite)
app.get('/api/signature_weapons', (c) => {
  const rows = db.prepare('SELECT character_id, weapon_id FROM character_signatures').all();
  const map = {};
  for (const r of rows) {
    map[r.character_id] = r.weapon_id;
  }
  return c.json(map);
});

function normalizeMainStats(val) {
  if (!val) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'string') {
        return parsed;
      }
      return typeof parsed === 'object' ? JSON.stringify(parsed) : val;
    } catch {
      return val;
    }
  }
  return null;
}

// ==========================================
// 2. LOADOUTS DE PERSONNAGES
// ==========================================
app.get('/api/loadouts', (c) => {
  const charId = c.req.query('character_id');
  if (charId) {
    const numCharId = Number(charId);
    if (!Number.isInteger(numCharId) || numCharId <= 0) {
      return c.json({ error: 'Identifiant de personnage invalide' }, 400);
    }
    const stmt = db.prepare('SELECT * FROM character_loadouts WHERE character_id = ? ORDER BY created_at DESC');
    return c.json(stmt.all(numCharId));
  }
  const stmt = db.prepare('SELECT * FROM character_loadouts ORDER BY character_name ASC, created_at DESC');
  return c.json(stmt.all());
});

app.post('/api/loadouts', async (c) => {
  const body = await c.req.json();
  const charId = Number(body.character_id);
  if (!Number.isInteger(charId) || charId <= 0) {
    return c.json({ error: 'Identifiant de personnage requis et valide' }, 400);
  }
  const id = body.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO character_loadouts (id, character_id, character_name, name, weapon_id, weapon_refinement, artifact_set_1_id, artifact_set_2_id, main_stats, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    charId,
    body.character_name || '',
    body.name || 'Nouveau Build',
    body.weapon_id ? Number(body.weapon_id) : null,
    Number(body.weapon_refinement || 1),
    body.artifact_set_1_id ? Number(body.artifact_set_1_id) : null,
    body.artifact_set_2_id ? Number(body.artifact_set_2_id) : null,
    normalizeMainStats(body.main_stats),
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
  const res = stmt.run(
    body.name,
    body.weapon_id ? Number(body.weapon_id) : null,
    Number(body.weapon_refinement || 1),
    body.artifact_set_1_id ? Number(body.artifact_set_1_id) : null,
    body.artifact_set_2_id ? Number(body.artifact_set_2_id) : null,
    normalizeMainStats(body.main_stats),
    body.notes || '',
    id
  );
  if (res.changes === 0) {
    return c.json({ error: 'Loadout non trouvé' }, 404);
  }
  return c.json({ success: true });
});

app.delete('/api/loadouts/:id', (c) => {
  const id = c.req.param('id');
  const res = db.prepare('DELETE FROM character_loadouts WHERE id = ?').run(id);
  if (res.changes === 0) {
    return c.json({ error: 'Loadout non trouvé' }, 404);
  }
  // Nettoyage en cascade des références orphelines dans les équipes
  db.prepare(`
    UPDATE teams
    SET slot1_loadout_id = CASE WHEN slot1_loadout_id = ? THEN NULL ELSE slot1_loadout_id END,
        slot2_loadout_id = CASE WHEN slot2_loadout_id = ? THEN NULL ELSE slot2_loadout_id END,
        slot3_loadout_id = CASE WHEN slot3_loadout_id = ? THEN NULL ELSE slot3_loadout_id END,
        slot4_loadout_id = CASE WHEN slot4_loadout_id = ? THEN NULL ELSE slot4_loadout_id END
    WHERE slot1_loadout_id = ? OR slot2_loadout_id = ? OR slot3_loadout_id = ? OR slot4_loadout_id = ?
  `).run(id, id, id, id, id, id, id, id);
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
      current_level, target_level,
      talent_normal_current, talent_normal_target,
      talent_skill_current, talent_skill_target,
      talent_burst_current, talent_burst_target,
      weapon_target_level, artifact_action, artifact_notes,
      is_level_done, is_talents_done, is_weapon_done, is_artifacts_done, is_completed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    Number(body.talent_normal_current || 1),
    Number(body.talent_normal_target || 1),
    Number(body.talent_skill_current || 1),
    Number(body.talent_skill_target || 8),
    Number(body.talent_burst_current || 1),
    Number(body.talent_burst_target || 8),
    Number(body.weapon_target_level || 90),
    body.artifact_action || 'none',
    body.artifact_notes || '',
    Number(body.is_level_done || 0),
    Number(body.is_talents_done || 0),
    Number(body.is_weapon_done || 0),
    Number(body.is_artifacts_done || 0),
    Number(body.is_completed || 0)
  );
  return c.json({ success: true, id }, 201);
});

app.patch('/api/planner/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(body)) {
    if (['tier', 'current_level', 'target_level', 'talent_normal_current', 'talent_normal_target', 'talent_skill_current', 'talent_skill_target', 'talent_burst_current', 'talent_burst_target', 'weapon_target_level', 'artifact_action', 'artifact_notes', 'is_level_done', 'is_talents_done', 'is_weapon_done', 'is_artifacts_done', 'is_completed'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return c.json({ error: 'Aucun champ valide à mettre à jour' }, 400);

  values.push(id);
  const query = `UPDATE upgrade_planner SET ${fields.join(', ')} WHERE id = ?`;
  const res = db.prepare(query).run(...values);
  if (res.changes === 0) {
    return c.json({ error: 'Objectif non trouvé' }, 404);
  }
  return c.json({ success: true });
});

app.delete('/api/planner/:id', (c) => {
  const id = c.req.param('id');
  const res = db.prepare('DELETE FROM upgrade_planner WHERE id = ?').run(id);
  if (res.changes === 0) {
    return c.json({ error: 'Objectif non trouvé' }, 404);
  }
  return c.json({ success: true });
});

// ==========================================
// 5. MODES ENDGAME (ABYSSES & CARNAGE)
// ==========================================
app.get('/api/endgame/:mode', (c) => {
  const mode = c.req.param('mode');
  const row = db.prepare('SELECT * FROM endgame_setups WHERE id = ?').get(mode);
  if (!row) return c.json({ mode, data: null });
  const parsed = JSON.parse(row.data_json);

  if (mode === 'abyss_meta') {
    const items = parsed.items || parsed;
    const lastKey = Object.keys(items).pop();
    const floorList = items[lastKey]?.entrance?.floorList || [];
    const floor11 = floorList.length >= 2 ? floorList[floorList.length - 2] : null;
    const floor12 = floorList.length >= 1 ? floorList[floorList.length - 1] : null;
    return c.json({
      mode: 'abyss_meta',
      data: {
        raw: parsed,
        floor11,
        floor12,
        blessing: items[lastKey]?.blessing || {}
      },
      updated_at: row.updated_at
    });
  }

  return c.json({ mode: row.mode, data: parsed, updated_at: row.updated_at });
});

app.post('/api/endgame/:mode', async (c) => {
  const mode = c.req.param('mode');
  const allowedModes = ['abyss', 'carnage', 'abyss_meta'];
  if (!allowedModes.includes(mode)) {
    return c.json({ error: 'Mode endgame non autorisé' }, 400);
  }
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
    INSERT INTO wish_roadmap (id, item_type, item_id, name, icon, constellation_level, priority_order, priority_tier, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    body.item_type || 'character',
    body.item_id ? Number(body.item_id) : null,
    body.name || '',
    body.icon || '',
    body.constellation_level ? Number(body.constellation_level) : null,
    maxOrder + 1,
    body.priority_tier || 'S',
    body.status || 'active',
    body.notes || ''
  );
  return c.json({ success: true, id }, 201);
});

app.put('/api/wishlist/reorder', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ids = body.ids;
  if (Array.isArray(ids)) {
    db.exec('BEGIN TRANSACTION');
    try {
      const stmt = db.prepare('UPDATE wish_roadmap SET priority_order = ? WHERE id = ?');
      for (let i = 0; i < ids.length; i++) {
        stmt.run(i + 1, ids[i]);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
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
    if (['status', 'notes', 'priority_order', 'priority_tier'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length > 0) {
    values.push(id);
    const res = db.prepare(`UPDATE wish_roadmap SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    if (res.changes === 0) {
      return c.json({ error: 'Souhait non trouvé' }, 404);
    }
  }
  return c.json({ success: true });
});

app.delete('/api/wishlist/:id', (c) => {
  const id = c.req.param('id');
  const res = db.prepare('DELETE FROM wish_roadmap WHERE id = ?').run(id);
  if (res.changes === 0) {
    return c.json({ error: 'Souhait non trouvé' }, 404);
  }
  return c.json({ success: true });
});

// ==========================================
// 7. PERSONNAGES POSSÉDÉS (OWNERSHIP)
// ==========================================
app.get('/api/ownership', (c) => {
  const rows = db.prepare('SELECT character_id, is_owned, constellation, notes FROM character_ownership').all();
  const map = {};
  for (const r of rows) {
    map[r.character_id] = r;
  }
  return c.json(map);
});

app.post('/api/ownership/:id', async (c) => {
  const charId = Number(c.req.param('id'));
  if (!Number.isInteger(charId) || charId <= 0) {
    return c.json({ error: 'Identifiant de personnage invalide' }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const current = db.prepare('SELECT is_owned, constellation FROM character_ownership WHERE character_id = ?').get(charId);
  const newOwned = body.is_owned !== undefined ? (body.is_owned ? 1 : 0) : (current?.is_owned ? 0 : 1);
  const constellation = body.constellation !== undefined ? Number(body.constellation) : (current?.constellation || 0);

  db.prepare(`
    INSERT INTO character_ownership (character_id, is_owned, constellation, notes, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(character_id) DO UPDATE SET is_owned = excluded.is_owned, constellation = excluded.constellation, updated_at = CURRENT_TIMESTAMP
  `).run(charId, newOwned, constellation, body.notes || '');

  return c.json({ success: true, character_id: charId, is_owned: newOwned, constellation });
});

// ==========================================
// 8. FICHIERS STATIQUES DU FRONTEND SPA
// ==========================================
if (existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }));
  const indexPath = join(distDir, 'index.html');
  const cachedIndexHtml = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : null;
  // Fallback SPA
  app.get('*', (c) => {
    if (cachedIndexHtml) {
      return c.html(cachedIndexHtml);
    }
    return c.text('Build frontend non trouvé dans ./dist', 404);
  });
}

// Lancement du serveur (uniquement en exécution directe, pas lors des tests unitaires)
const isMain = process.argv[1] && (
  process.argv[1].endsWith('server/index.js') ||
  process.argv[1] === fileURLToPath(import.meta.url)
);

if (isMain) {
  checkAutoUpdate();
  console.log(`[Lordi Server] Démarrage sur http://${host}:${port}...`);
  serve({
    fetch: app.fetch,
    port,
    hostname: host
  }, (info) => {
    console.log(`✓ Serveur actif sur http://${info.address}:${info.port}`);
  });
}

export { app };
export default app;
