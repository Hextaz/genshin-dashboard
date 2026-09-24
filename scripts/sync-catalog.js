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

    console.log('--- Synchronisation terminée avec succès ! ---');
  } catch (err) {
    console.error('Erreur lors de la synchronisation:', err);
    process.exit(1);
  }
}

sync();
