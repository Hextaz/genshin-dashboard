import db from '../server/db.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchJson(endpoint) {
  const url = `https://gi.yatta.moe/api/v2/fr/${endpoint}`;
  console.log(`[Sync] Fetching ${url}...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': UA }
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} fetching ${url}`);
  }
  const json = await res.json();
  return json.data?.items || json.data;
}

async function sync() {
  console.log('--- Début de la synchronisation du catalogue Genshin ---');
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO catalog_items (id, category, name, element, rarity, weapon_type, icon, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    // 1. Personnages (Avatar)
    const characters = await fetchJson('avatar');
    let charCount = 0;
    for (const [id, char] of Object.entries(characters)) {
      insertStmt.run(
        `avatar_${id}`,
        'character',
        char.name || '',
        char.element || 'None',
        char.rank || 4,
        char.weaponType || '',
        char.icon || '',
        JSON.stringify(char)
      );
      charCount++;
    }
    console.log(`✓ ${charCount} personnages synchronisés.`);

    // 2. Armes (Weapon)
    const weapons = await fetchJson('weapon');
    let weaponCount = 0;
    for (const [id, wep] of Object.entries(weapons)) {
      insertStmt.run(
        `weapon_${id}`,
        'weapon',
        wep.name || '',
        null,
        wep.rank || 1,
        wep.type || '',
        wep.icon || '',
        JSON.stringify(wep)
      );
      weaponCount++;
    }
    console.log(`✓ ${weaponCount} armes synchronisées.`);

    // 3. Artéfacts (Reliquary)
    const reliquaries = await fetchJson('reliquary');
    let relicCount = 0;
    for (const [id, relic] of Object.entries(reliquaries)) {
      insertStmt.run(
        `relic_${id}`,
        'reliquary',
        relic.name || '',
        null,
        relic.levelList?.[relic.levelList.length - 1] || 5,
        null,
        relic.icon || '',
        JSON.stringify(relic)
      );
      relicCount++;
    }
    console.log(`✓ ${relicCount} sets d'artéfacts synchronisés.`);

    // 4. Données des Abysses
    const tower = await fetchJson('tower');
    const towerStmt = db.prepare(`
      INSERT OR REPLACE INTO endgame_setups (id, mode, data_json, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    towerStmt.run('abyss_meta', 'abyss_meta', JSON.stringify(tower));
    console.log(`✓ Données officielles des Abysses sauvegardées.`);

    // 5. Armes Signatures Autonomes (Détection et Appairage Automatique)
    autoDetectSignatureWeapons(db);

    // 6. Version Hash
    try {
      const vRes = await fetch('https://gi.yatta.moe/api/v2/static/version', { headers: { 'User-Agent': UA } });
      if (vRes.ok) {
        const vData = await vRes.json();
        const vh = vData.data?.vh || '';
        db.prepare('INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run('catalog_vh', vh);
        db.prepare('INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run('last_sync_time', new Date().toISOString());
        console.log(`✓ Hash version Yatta sauvegardé : ${vh}`);
      }
    } catch (e) {
      console.warn('Impossible de sauvegarder la version Yatta:', e.message);
    }

    console.log('--- Synchronisation terminée avec succès ! ---');
    return true;
  } catch (err) {
    console.error('Erreur lors de la synchronisation:', err);
    throw err;
  }
}

// Dictionnaire de référence des 50 armes signatures canoniques
export const KNOWN_SIGNATURES = {
  10000003: 11501, 10000047: 11503, 10000002: 11509, 10000066: 11510,
  10000070: 11511, 10000078: 11512, 10000089: 11513, 10000094: 11514,
  10000098: 11515, 10000103: 11516, 10000038: 11415, 10000042: 11505,
  10000035: 11501, 10000016: 12502, 10000051: 12503, 10000057: 12510,
  10000079: 12511, 10000091: 12512, 10000101: 12513, 10000106: 12514,
  10000046: 13501, 10000030: 13504, 10000026: 13505, 10000063: 13507,
  10000052: 13509, 10000071: 13511, 10000096: 13512, 10000099: 13513,
  10000041: 14501, 10000029: 14502, 10000082: 14505, 10000054: 14506,
  10000058: 14509, 10000073: 14511, 10000075: 14512, 10000086: 14513,
  10000087: 14514, 10000093: 14515, 10000102: 14516, 10000107: 14517,
  10000037: 15502, 10000022: 15503, 10000033: 15507, 10000060: 15508,
  10000049: 15509, 10000069: 15511, 10000084: 15512, 10000095: 15513,
  10000104: 15514, 10000031: 15412
};

export function autoDetectSignatureWeapons(database = db) {
  // 1. Inscrire les signatures canoniques si pas déjà présentes
  const insertStmt = database.prepare(`
    INSERT OR IGNORE INTO character_signatures (character_id, weapon_id, source)
    VALUES (?, ?, ?)
  `);
  for (const [charId, wepId] of Object.entries(KNOWN_SIGNATURES)) {
    insertStmt.run(Number(charId), Number(wepId), 'seed');
  }

  // 2. Détecter les personnages 5★ sans arme signature
  const unassigned5Stars = database.prepare(`
    SELECT id, name, weapon_type
    FROM catalog_items
    WHERE category = 'character' AND rarity = 5
      AND CAST(REPLACE(id, 'avatar_', '') AS INTEGER) NOT IN (SELECT character_id FROM character_signatures)
  `).all();

  // 3. Trouver les armes 5★ non encore associées
  const unassignedWeapons = database.prepare(`
    SELECT id, name, weapon_type
    FROM catalog_items
    WHERE category = 'weapon' AND rarity = 5
      AND CAST(REPLACE(id, 'weapon_', '') AS INTEGER) NOT IN (SELECT weapon_id FROM character_signatures)
  `).all();

  const detected = {};
  for (const char of unassigned5Stars) {
    const rawCharId = Number(char.id.replace('avatar_', '').split('-')[0]);
    if (isNaN(rawCharId) || rawCharId <= 0 || char.id.includes('-')) continue;

    // Trouver l'arme 5★ du même type (la plus récente par ID)
    const matchingWeapons = unassignedWeapons
      .filter(w => w.weapon_type === char.weapon_type)
      .sort((a, b) => Number(b.id.replace('weapon_', '')) - Number(a.id.replace('weapon_', '')));

    if (matchingWeapons.length > 0) {
      const chosenWeapon = matchingWeapons[0];
      const rawWepId = Number(chosenWeapon.id.replace('weapon_', ''));
      insertStmt.run(rawCharId, rawWepId, 'auto_detected');
      detected[rawCharId] = rawWepId;
      console.log(`[Sync] ✨ Arme signature auto-détectée pour ${char.name} : ${chosenWeapon.name} (ID: ${rawWepId})`);
    }
  }

  console.log(`✓ Synchronisation des signatures terminée (${Object.keys(detected).length} nouvelles auto-détectées).`);
  return detected;
}

export { sync as syncCatalog };

// Exécution directe via CLI
if (process.argv[1] && process.argv[1].endsWith('sync-catalog.js')) {
  sync().catch(() => process.exit(1));
}
