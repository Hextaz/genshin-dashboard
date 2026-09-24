import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

describe('Genshin Dashboard - Tests du Domaine & SQLite', () => {
  // Base en mémoire pour les tests unitaires
  const db = new DatabaseSync(':memory:');

  db.exec(`
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
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slot1_character_id INTEGER,
      slot1_loadout_id TEXT,
      slot2_character_id INTEGER,
      slot2_loadout_id TEXT,
      slot3_character_id INTEGER,
      slot3_loadout_id TEXT,
      slot4_character_id INTEGER,
      slot4_loadout_id TEXT
    );

    CREATE TABLE IF NOT EXISTS upgrade_planner (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT DEFAULT 'S',
      target_level INTEGER DEFAULT 90,
      is_completed INTEGER DEFAULT 0
    );
  `);

  it('devrait créer et récupérer un loadout de personnage', () => {
    const insert = db.prepare(`
      INSERT INTO character_loadouts (id, character_id, character_name, name, weapon_id, weapon_refinement)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run('loadout-1', 10000002, 'Kamisato Ayaka', 'Freeze Blizzard', 11509, 1);

    const row = db.prepare('SELECT * FROM character_loadouts WHERE id = ?').get('loadout-1');
    assert.equal(row.character_name, 'Kamisato Ayaka');
    assert.equal(row.weapon_refinement, 1);
  });

  it('devrait créer une équipe avec association de loadout', () => {
    const insert = db.prepare(`
      INSERT INTO teams (id, name, slot1_character_id, slot1_loadout_id)
      VALUES (?, ?, ?, ?)
    `);
    insert.run('team-1', 'Ayaka Freeze', 10000002, 'loadout-1');

    const row = db.prepare('SELECT * FROM teams WHERE id = ?').get('team-1');
    assert.equal(row.name, 'Ayaka Freeze');
    assert.equal(row.slot1_loadout_id, 'loadout-1');
  });

  it('devrait trier le planificateur par Tier (S > A > B)', () => {
    const insert = db.prepare('INSERT INTO upgrade_planner (id, name, tier) VALUES (?, ?, ?)');
    insert.run('g-1', 'Furina', 'B');
    insert.run('g-2', 'Xilonen', 'S');
    insert.run('g-3', 'Mavuika', 'A');

    const rows = db.prepare(`
      SELECT * FROM upgrade_planner
      ORDER BY CASE tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 ELSE 4 END
    `).all();

    assert.equal(rows[0].name, 'Xilonen');
    assert.equal(rows[1].name, 'Mavuika');
    assert.equal(rows[2].name, 'Furina');
  });

  it('devrait valider l\'absence de doublons dans les compositions Endgame', () => {
    // Règle d'exclusion mutuelle : un perso ne peut pas être à la fois en Team 1 et Team 2
    const team1 = [10000002, 10000030, 10000047, 10000078];
    const team2 = [10000003, 10000031, 10000048, 10000079];

    const team1Set = new Set(team1);
    const hasDuplicate = team2.some(id => team1Set.has(id));
    assert.equal(hasDuplicate, false, 'Aucun doublon ne doit exister entre les deux équipes');

    // Tentative d'ajout d'Ayaka (10000002) en Team 2
    const invalidTeam2 = [10000002, 10000031, 10000048, 10000079];
    const conflict = invalidTeam2.some(id => team1Set.has(id));
    assert.equal(conflict, true, 'Le doublon doit être détecté immédiatement');
  });
});
