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

  it('devrait enregistrer et basculer le statut possédé d\'un personnage (⭐)', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_ownership (
        character_id INTEGER PRIMARY KEY,
        is_owned INTEGER DEFAULT 0,
        constellation INTEGER DEFAULT 0,
        notes TEXT
      );
    `);

    const upsert = db.prepare(`
      INSERT INTO character_ownership (character_id, is_owned, constellation, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET is_owned = excluded.is_owned
    `);

    // Marquer Raiden (10000052) comme possédée
    upsert.run(10000052, 1, 2, 'C2 Raiden');
    let row = db.prepare('SELECT * FROM character_ownership WHERE character_id = ?').get(10000052);
    assert.equal(row.is_owned, 1);
    assert.equal(row.constellation, 2);

    // Basculer à non possédé
    upsert.run(10000052, 0, 0, '');
    row = db.prepare('SELECT * FROM character_ownership WHERE character_id = ?').get(10000052);
    assert.equal(row.is_owned, 0);
  });

  it('devrait calculer correctement la progression des checklists du planificateur', () => {
    // Calcul de complétion : 3 sous-tâches pour un personnage
    const item = {
      target_type: 'character',
      is_level_done: 1,
      is_talents_done: 1,
      is_artifacts_done: 0
    };
    const done = item.is_level_done + item.is_talents_done + item.is_artifacts_done;
    const total = 3;
    const pct = Math.round((done / total) * 100);
    assert.equal(done, 2);
    assert.equal(pct, 67);
  });

  it('devrait valider le réordonnancement de la roadmap de vœux', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        item_type TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending'
      );
    `);

    const insert = db.prepare('INSERT INTO wishlist (id, item_type, name, sort_order) VALUES (?, ?, ?, ?)');
    insert.run('w1', 'character', 'Skirk', 0);
    insert.run('w2', 'weapon', 'Arme signature', 1);
    insert.run('w3', 'constellation', 'Furina C1', 2);

    // Inverser l'ordre de w1 et w2
    const update = db.prepare('UPDATE wishlist SET sort_order = ? WHERE id = ?');
    update.run(1, 'w1');
    update.run(0, 'w2');

    const ordered = db.prepare('SELECT id, name FROM wishlist ORDER BY sort_order ASC').all();
    assert.equal(ordered[0].id, 'w2');
    assert.equal(ordered[1].id, 'w1');
    assert.equal(ordered[2].id, 'w3');
  });

  it('devrait supporter les Tiers de priorité (S, A, B) dans la roadmap de vœux', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_wish_roadmap (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        priority_order INTEGER NOT NULL,
        priority_tier TEXT DEFAULT 'S',
        status TEXT DEFAULT 'active'
      );
    `);

    const insert = db.prepare('INSERT INTO test_wish_roadmap (id, name, priority_order, priority_tier) VALUES (?, ?, ?, ?)');
    insert.run('w_s', 'Mavuika', 1, 'S');
    insert.run('w_a', 'Citlali', 2, 'A');
    insert.run('w_b', 'Xilonen C1', 3, 'B');

    // Récupération par tier S
    const tierS = db.prepare("SELECT * FROM test_wish_roadmap WHERE priority_tier = 'S'").all();
    assert.equal(tierS.length, 1);
    assert.equal(tierS[0].name, 'Mavuika');

    // Mise à jour de tier
    db.prepare("UPDATE test_wish_roadmap SET priority_tier = ? WHERE id = ?").run('S', 'w_a');
    const updatedTierS = db.prepare("SELECT * FROM test_wish_roadmap WHERE priority_tier = 'S'").all();
    assert.equal(updatedTierS.length, 2);
  });

  it('devrait normaliser canoniquement tous les éléments même avec accents (Anémo, Électro, Géo)', async () => {
    const { normalizeElement } = await import('../client/src/api.js');
    assert.equal(normalizeElement('Anemo'), 'Anemo');
    assert.equal(normalizeElement('Anémo'), 'Anemo');
    assert.equal(normalizeElement('Wind'), 'Anemo');
    assert.equal(normalizeElement('Electro'), 'Electro');
    assert.equal(normalizeElement('Électro'), 'Electro');
    assert.equal(normalizeElement('Electric'), 'Electro');
    assert.equal(normalizeElement('Geo'), 'Geo');
    assert.equal(normalizeElement('Géo'), 'Geo');
    assert.equal(normalizeElement('Rock'), 'Geo');
    assert.equal(normalizeElement('Pyro'), 'Pyro');
    assert.equal(normalizeElement('Fire'), 'Pyro');
  });

  it('devrait permettre de supprimer le seul et unique build d\'un personnage', () => {
    db.prepare(`
      INSERT INTO character_loadouts (id, character_id, character_name, name)
      VALUES (?, ?, ?, ?)
    `).run('only-build', 999999, 'Test Char', 'Single Build');

    let count = db.prepare('SELECT COUNT(*) as c FROM character_loadouts WHERE character_id = ?').get(999999);
    assert.equal(count.c, 1);

    // Suppression de l'unique build
    db.prepare('DELETE FROM character_loadouts WHERE id = ?').run('only-build');
    count = db.prepare('SELECT COUNT(*) as c FROM character_loadouts WHERE character_id = ?').get(999999);
    assert.equal(count.c, 0);
  });

  it('devrait associer correctement l\'arme signature d\'un personnage', async () => {
    const { getSignatureWeaponId } = await import('../client/src/api.js');
    // Hu Tao -> Bâton de Homa (13501)
    assert.equal(getSignatureWeaponId({ id: 'avatar_10000046', name: 'Hu Tao' }), 13501);
    // Raiden -> Lumière du faucheur (13509)
    assert.equal(getSignatureWeaponId({ id: 'avatar_10000052', name: 'Shogun Raiden' }), 13509);
    // Furina -> Splendeur des eaux calmes (11513)
    assert.equal(getSignatureWeaponId({ id: 'avatar_10000089', name: 'Furina' }), 11513);
    // Kazuha -> Serment de la liberté (11503)
    assert.equal(getSignatureWeaponId({ id: 'avatar_10000047', name: 'Kaedehara Kazuha' }), 11503);
    // Neuvillette -> Tome du flux éternel (14514)
    assert.equal(getSignatureWeaponId({ id: 'avatar_10000087', name: 'Neuvillette' }), 14514);
    // Perso inconnu sans signature -> null
    assert.equal(getSignatureWeaponId({ id: 'avatar_999999', name: 'Inconnu' }), null);
    assert.equal(getSignatureWeaponId(null), null);
  });

  it('devrait auto-détecter et synchroniser automatiquement les armes signatures pour les nouveaux personnages 5★', async () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        element TEXT,
        rarity INTEGER NOT NULL,
        weapon_type TEXT,
        icon TEXT NOT NULL,
        data_json TEXT
      );
      CREATE TABLE IF NOT EXISTS character_signatures (
        character_id INTEGER PRIMARY KEY,
        weapon_id INTEGER NOT NULL,
        source TEXT DEFAULT 'seed',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1. Simuler un nouveau personnage 5★ et une nouvelle arme 5★ dans catalog_items
    db.prepare(`
      INSERT OR REPLACE INTO catalog_items (id, category, name, element, rarity, weapon_type, icon, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('avatar_999001', 'character', 'Nouveau Perso 5★', 'Pyro', 5, 'WEAPON_POLE', 'icon_new_char', '{}');

    db.prepare(`
      INSERT OR REPLACE INTO catalog_items (id, category, name, element, rarity, weapon_type, icon, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('weapon_999001', 'weapon', 'Nouvelle Lance 5★', null, 5, 'WEAPON_POLE', 'icon_new_wep', '{}');

    const { autoDetectSignatureWeapons } = await import('../scripts/sync-catalog.js');
    const detected = autoDetectSignatureWeapons(db);

    assert.equal(detected[999001], 999001);

    // 2. Vérifier que c'est bien persisté dans SQLite
    const saved = db.prepare('SELECT weapon_id, source FROM character_signatures WHERE character_id = ?').get(999001);
    assert.ok(saved);
    assert.equal(saved.weapon_id, 999001);
    assert.equal(saved.source, 'auto_detected');
  });
});




