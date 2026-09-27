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

  it('devrait calculer intelligemment la progression adaptative du planificateur', async () => {
    const { calculatePlannerProgress } = await import('../client/src/api.js');

    // 1. Personnage complet (Niveau 1->90, Talents 1->10, Artéfacts à farm) -> 3 tâches
    const fullChar = {
      target_type: 'character',
      current_level: 1,
      target_level: 90,
      talent_normal_current: 1,
      talent_normal_target: 6,
      talent_skill_current: 1,
      talent_skill_target: 9,
      talent_burst_current: 1,
      talent_burst_target: 10,
      artifact_action: 'substat_farm',
      is_level_done: 1,
      is_talents_done: 1,
      is_artifacts_done: 0
    };
    const resFull = calculatePlannerProgress(fullChar);
    assert.equal(resFull.total, 3);
    assert.equal(resFull.done, 2);
    assert.equal(resFull.pct, 67);
    assert.equal(resFull.completed, false);

    // 2. Personnage avec Artéfacts seuls (Niveau déjà 90 et Talents déjà maxés) -> 1 seule tâche
    const relicOnly = {
      target_type: 'character',
      current_level: 90,
      target_level: 90,
      talent_normal_current: 10,
      talent_normal_target: 10,
      talent_skill_current: 10,
      talent_skill_target: 10,
      talent_burst_current: 10,
      talent_burst_target: 10,
      artifact_action: 'substat_farm',
      is_artifacts_done: 0
    };
    const resRelic = calculatePlannerProgress(relicOnly);
    assert.equal(resRelic.total, 1);
    assert.equal(resRelic.done, 0);
    assert.equal(resRelic.completed, false);
    relicOnly.is_artifacts_done = 1;
    assert.equal(calculatePlannerProgress(relicOnly).pct, 100);
    assert.equal(calculatePlannerProgress(relicOnly).completed, true);

    // 3. Personnage avec Talents seuls (Niveau déjà 90 et aucune action artéfact) -> 1 seule tâche
    const talentOnly = {
      target_type: 'character',
      current_level: 90,
      target_level: 90,
      talent_normal_current: 1,
      talent_normal_target: 1,
      talent_skill_current: 6,
      talent_skill_target: 9,
      talent_burst_current: 8,
      talent_burst_target: 10,
      artifact_action: 'none',
      is_talents_done: 1
    };
    const resTalent = calculatePlannerProgress(talentOnly);
    assert.equal(resTalent.total, 1);
    assert.equal(resTalent.done, 1);
    assert.equal(resTalent.pct, 100);
    assert.equal(resTalent.completed, true);
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

  it('devrait parser et normaliser correctement les statistiques principales sans double sérialisation', async () => {
    const { parseMainStats } = await import('../client/src/api.js');

    // 1. Test avec objet direct
    const objStats = { sands: "Recharge d'énergie %", goblet: "Bonus DGT Dendro %", circlet: "DGT CRIT %" };
    assert.deepEqual(parseMainStats(objStats), objStats);

    // 2. Test avec chaîne JSON standard
    const jsonStr = JSON.stringify(objStats);
    assert.deepEqual(parseMainStats(jsonStr), objStats);

    // 3. Test avec chaîne doublement sérialisée (bug historique)
    const doubleStr = JSON.stringify(jsonStr);
    assert.deepEqual(parseMainStats(doubleStr), objStats);

    // 4. Test avec valeurs nulles ou invalides
    assert.equal(parseMainStats(null), null);
    assert.equal(parseMainStats(''), null);
    assert.equal(parseMainStats('invalid json'), null);
  });

  it('devrait persister les niveaux de talents actuels et cibles dans upgrade_planner', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS upgrade_planner_full (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT DEFAULT 'S',
        current_level INTEGER DEFAULT 1,
        target_level INTEGER DEFAULT 90,
        talent_normal_current INTEGER DEFAULT 1,
        talent_normal_target INTEGER DEFAULT 1,
        talent_skill_current INTEGER DEFAULT 1,
        talent_skill_target INTEGER DEFAULT 1,
        talent_burst_current INTEGER DEFAULT 1,
        talent_burst_target INTEGER DEFAULT 1,
        artifact_action TEXT DEFAULT 'none',
        is_completed INTEGER DEFAULT 0
      );
    `);

    const insert = db.prepare(`
      INSERT INTO upgrade_planner_full (
        id, name, current_level, target_level,
        talent_normal_current, talent_normal_target,
        talent_skill_current, talent_skill_target,
        talent_burst_current, talent_burst_target,
        artifact_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('plan-alhaitham', 'Alhaitham', 80, 90, 1, 6, 8, 9, 8, 10, 'none');

    const row = db.prepare('SELECT * FROM upgrade_planner_full WHERE id = ?').get('plan-alhaitham');
    assert.equal(row.name, 'Alhaitham');
    assert.equal(row.talent_normal_current, 1);
    assert.equal(row.talent_normal_target, 6);
    assert.equal(row.talent_skill_current, 8);
    assert.equal(row.talent_skill_target, 9);
    assert.equal(row.talent_burst_current, 8);
    assert.equal(row.talent_burst_target, 10);
    assert.equal(row.artifact_action, 'none');
  });

  it('devrait filtrer les personnages et les armes pour la roadmap de vœux avec recherche et critères multiples', async () => {
    const { filterWishCharacters, filterWishWeapons } = await import('../client/src/api.js');

    const sampleChars = [
      { id: 'avatar_10000046', name: 'Hu Tao', element: 'Pyro', rarity: 5, weapon_type: 'WEAPON_POLE' },
      { id: 'avatar_10000052', name: 'Shogun Raiden', element: 'Electro', rarity: 5, weapon_type: 'WEAPON_POLE' },
      { id: 'avatar_10000034', name: 'Noëlle', element: 'Geo', rarity: 4, weapon_type: 'WEAPON_CLAYMORE' },
      { id: 'avatar_10000089', name: 'Furina', element: 'Hydro', rarity: 5, weapon_type: 'WEAPON_SWORD_ONE_HAND' },
      { id: 'avatar_10000021', name: 'Xiangling', element: 'Pyro', rarity: 4, weapon_type: 'WEAPON_POLE' }
    ];

    const sampleOwnership = {
      10000046: { is_owned: 1 }, // Hu Tao possédée
      10000034: { is_owned: 1 }  // Noëlle possédée
      // Shogun Raiden, Furina, Xiangling non possédées
    };

    // 1. Recherche insensible à la casse et aux accents
    const searchNoelle = filterWishCharacters(sampleChars, { query: 'noelle' });
    assert.equal(searchNoelle.length, 1);
    assert.equal(searchNoelle[0].name, 'Noëlle');

    // 2. Filtre par Élément (Pyro)
    const pyroChars = filterWishCharacters(sampleChars, { element: 'Pyro' });
    assert.equal(pyroChars.length, 2); // Hu Tao & Xiangling

    // 3. Filtre par Rareté (5★)
    const fiveStarChars = filterWishCharacters(sampleChars, { rarity: '5' });
    assert.equal(fiveStarChars.length, 3); // Hu Tao, Shogun Raiden, Furina

    // 4. Filtre par Type d'arme (Arme d'hast)
    const polearmChars = filterWishCharacters(sampleChars, { weapon: 'WEAPON_POLE' });
    assert.equal(polearmChars.length, 3); // Hu Tao, Shogun Raiden, Xiangling

    // 5. Filtre par Possession (Possédés vs Non possédés)
    const ownedChars = filterWishCharacters(sampleChars, { ownershipFilter: 'OWNED', ownership: sampleOwnership });
    assert.equal(ownedChars.length, 2);
    assert.deepEqual(ownedChars.map(c => c.name), ['Hu Tao', 'Noëlle']);

    const notOwnedChars = filterWishCharacters(sampleChars, { ownershipFilter: 'NOT_OWNED', ownership: sampleOwnership });
    assert.equal(notOwnedChars.length, 3);

    // 6. Armes : recherche, rareté et type
    const sampleWeapons = [
      { id: 'weapon_13501', name: 'Bâton de Homa', rarity: 5, weapon_type: 'WEAPON_POLE' },
      { id: 'weapon_11503', name: 'Serment de la liberté', rarity: 5, weapon_type: 'WEAPON_SWORD_ONE_HAND' },
      { id: 'weapon_13401', name: 'Fléau du dragon', rarity: 4, weapon_type: 'WEAPON_POLE' },
      { id: 'weapon_12301', name: 'Épée de la raison', rarity: 3, weapon_type: 'WEAPON_SWORD_ONE_HAND' }
    ];

    const homa = filterWishWeapons(sampleWeapons, { query: 'homa' });
    assert.equal(homa.length, 1);
    assert.equal(homa[0].name, 'Bâton de Homa');

    const polearms = filterWishWeapons(sampleWeapons, { weaponType: 'WEAPON_POLE' });
    assert.equal(polearms.length, 2);
    assert.equal(polearms[0].rarity, 5); // Trié par rareté décroissante

    const swords5 = filterWishWeapons(sampleWeapons, { weaponType: 'WEAPON_SWORD_ONE_HAND', rarity: '5' });
    assert.equal(swords5.length, 1);
    assert.equal(swords5[0].name, 'Serment de la liberté');
  });

  it('devrait persister et ajuster les niveaux de constellations (C0 à C6) pour chaque personnage', async () => {
    const { calculateNextConstellation } = await import('../client/src/api.js');

    // 1. Calculs des bornes strictes (0 à 6)
    assert.equal(calculateNextConstellation(0, 1), 1);
    assert.equal(calculateNextConstellation(5, 1), 6);
    assert.equal(calculateNextConstellation(6, 1), 6); // Max 6
    assert.equal(calculateNextConstellation(6, -1), 5);
    assert.equal(calculateNextConstellation(1, -1), 0);
    assert.equal(calculateNextConstellation(0, -1), 0); // Min 0

    // 2. Persistance dans SQLite
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_ownership_test (
        character_id INTEGER PRIMARY KEY,
        is_owned INTEGER DEFAULT 0,
        constellation INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const upsert = db.prepare(`
      INSERT INTO character_ownership_test (character_id, is_owned, constellation, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(character_id) DO UPDATE SET
        is_owned = excluded.is_owned,
        constellation = excluded.constellation,
        updated_at = CURRENT_TIMESTAMP
    `);

    // Alhaitham à C0
    upsert.run(10000078, 1, 0);
    let row = db.prepare('SELECT * FROM character_ownership_test WHERE character_id = ?').get(10000078);
    assert.equal(row.is_owned, 1);
    assert.equal(row.constellation, 0);

    // Incrémenter à C1
    upsert.run(10000078, 1, calculateNextConstellation(row.constellation, 1));
    row = db.prepare('SELECT * FROM character_ownership_test WHERE character_id = ?').get(10000078);
    assert.equal(row.constellation, 1);

    // Incrémenter à C6
    upsert.run(10000078, 1, 6);
    row = db.prepare('SELECT * FROM character_ownership_test WHERE character_id = ?').get(10000078);
    assert.equal(row.constellation, 6);
  });
});




