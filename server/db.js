import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'genshin.db');
const db = new DatabaseSync(dbPath);

// Configuration sobre en mémoire (< 2 Mo de cache SQLite)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -2000;
  PRAGMA foreign_keys = ON;
`);

// Initialisation des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,       -- 'character', 'weapon', 'reliquary'
    name TEXT NOT NULL,
    element TEXT,                 -- 'Pyro', 'Hydro', 'Cryo', etc.
    rarity INTEGER NOT NULL,      -- 1 à 5
    weapon_type TEXT,             -- 'WEAPON_SWORD_ONE_HAND', etc.
    icon TEXT NOT NULL,
    data_json TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_category ON catalog_items(category);

  CREATE TABLE IF NOT EXISTS character_loadouts (
    id TEXT PRIMARY KEY,
    character_id INTEGER NOT NULL,
    character_name TEXT NOT NULL,
    name TEXT NOT NULL,
    weapon_id INTEGER,
    weapon_refinement INTEGER DEFAULT 1,
    artifact_set_1_id INTEGER,
    artifact_set_2_id INTEGER,
    main_stats TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_loadouts_char ON character_loadouts(character_id);

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slot1_character_id INTEGER,
    slot1_loadout_id TEXT,
    slot2_character_id INTEGER,
    slot2_loadout_id TEXT,
    slot3_character_id INTEGER,
    slot3_loadout_id TEXT,
    slot4_character_id INTEGER,
    slot4_loadout_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS upgrade_planner (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,       -- 'character', 'weapon'
    character_id INTEGER,
    weapon_id INTEGER,
    name TEXT NOT NULL,
    icon TEXT,
    tier TEXT DEFAULT 'S',           -- 'S', 'A', 'B'
    current_level INTEGER DEFAULT 1,
    target_level INTEGER DEFAULT 90,
    talent_normal_target INTEGER DEFAULT 1,
    talent_skill_target INTEGER DEFAULT 1,
    talent_burst_target INTEGER DEFAULT 1,
    weapon_target_level INTEGER DEFAULT 90,
    artifact_action TEXT DEFAULT 'none', -- 'none', 'set_change', 'upgrade_levels', 'substat_farm', 'completed'
    artifact_notes TEXT,
    is_level_done INTEGER DEFAULT 0,
    is_talents_done INTEGER DEFAULT 0,
    is_weapon_done INTEGER DEFAULT 0,
    is_artifacts_done INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_planner_tier ON upgrade_planner(tier, sort_order);

  CREATE TABLE IF NOT EXISTS endgame_setups (
    id TEXT PRIMARY KEY,             -- 'abyss_current', 'carnage_current'
    mode TEXT NOT NULL,              -- 'abyss', 'carnage'
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wish_roadmap (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,         -- 'character', 'weapon', 'constellation'
    item_id INTEGER,
    name TEXT NOT NULL,
    icon TEXT,
    constellation_level INTEGER,
    priority_order INTEGER NOT NULL,
    status TEXT DEFAULT 'active',    -- 'active', 'obtained', 'skipped'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_wish_order ON wish_roadmap(priority_order);
`);

export default db;
