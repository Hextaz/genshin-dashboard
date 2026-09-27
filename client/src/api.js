// Gestion centralisée des appels API vers le serveur Hono

const API_BASE = '/api';

export const YATTA_ASSET_BASE = 'https://gi.yatta.moe/assets/UI';

export function getIconUrl(icon, category = '') {
  if (!icon) return '';
  if (icon.startsWith('http')) return icon;
  // Les artéfacts sont stockés sous le sous-dossier /reliquary/ sur le CDN Yatta
  if (category === 'reliquary' || icon.startsWith('UI_RelicIcon')) {
    return `${YATTA_ASSET_BASE}/reliquary/${icon}.png`;
  }
  return `${YATTA_ASSET_BASE}/${icon}.png`;
}

// Couleurs officielles et esthétique Teyvat Hub par élément
export const ELEMENT_COLORS = {
  Fire: '#FF7A52',
  Pyro: '#FF7A52',
  Water: '#4FB2FF',
  Hydro: '#4FB2FF',
  Wind: '#4BE3B8',
  Anemo: '#4BE3B8',
  'Anémo': '#4BE3B8',
  Electric: '#B98CFF',
  Electro: '#B98CFF',
  'Électro': '#B98CFF',
  Grass: '#A6E05A',
  Dendro: '#A6E05A',
  Ice: '#9FE6FF',
  Cryo: '#9FE6FF',
  Rock: '#F3C552',
  Geo: '#F3C552',
  'Géo': '#F3C552'
};

export const ELEMENT_LABELS = {
  Fire: 'Pyro',
  Pyro: 'Pyro',
  Water: 'Hydro',
  Hydro: 'Hydro',
  Wind: 'Anémo',
  Anemo: 'Anémo',
  'Anémo': 'Anémo',
  Electric: 'Électro',
  Electro: 'Électro',
  'Électro': 'Électro',
  Grass: 'Dendro',
  Dendro: 'Dendro',
  Ice: 'Cryo',
  Cryo: 'Cryo',
  Rock: 'Géo',
  Geo: 'Géo',
  'Géo': 'Géo'
};

// Dictionnaire de canonisation des éléments (indépendant des accents ou des noms API)
export const CANONICAL_ELEMENTS = {
  Fire: 'Pyro',
  Pyro: 'Pyro',
  Water: 'Hydro',
  Hydro: 'Hydro',
  Wind: 'Anemo',
  Anemo: 'Anemo',
  'Anémo': 'Anemo',
  Electric: 'Electro',
  Electro: 'Electro',
  'Électro': 'Electro',
  Grass: 'Dendro',
  Dendro: 'Dendro',
  Ice: 'Cryo',
  Cryo: 'Cryo',
  Rock: 'Geo',
  Geo: 'Geo',
  'Géo': 'Geo'
};

export function normalizeElement(el) {
  if (!el) return '';
  return CANONICAL_ELEMENTS[el] || el;
}

// Insignes élémentaires officiels de Genshin Impact (CDN Yatta 200 OK)
export const ELEMENT_OFFICIAL_ICONS = {
  Pyro: `${YATTA_ASSET_BASE}/UI_Buff_Element_Fire.png`,
  Fire: `${YATTA_ASSET_BASE}/UI_Buff_Element_Fire.png`,
  Hydro: `${YATTA_ASSET_BASE}/UI_Buff_Element_Water.png`,
  Water: `${YATTA_ASSET_BASE}/UI_Buff_Element_Water.png`,
  Anemo: `${YATTA_ASSET_BASE}/UI_Buff_Element_Wind.png`,
  Wind: `${YATTA_ASSET_BASE}/UI_Buff_Element_Wind.png`,
  Electro: `${YATTA_ASSET_BASE}/UI_Buff_Element_Electric.png`,
  Electric: `${YATTA_ASSET_BASE}/UI_Buff_Element_Electric.png`,
  Dendro: `${YATTA_ASSET_BASE}/UI_Buff_Element_Grass.png`,
  Grass: `${YATTA_ASSET_BASE}/UI_Buff_Element_Grass.png`,
  Cryo: `${YATTA_ASSET_BASE}/UI_Buff_Element_Ice.png`,
  Ice: `${YATTA_ASSET_BASE}/UI_Buff_Element_Ice.png`,
  Geo: `${YATTA_ASSET_BASE}/UI_Buff_Element_Rock.png`,
  Rock: `${YATTA_ASSET_BASE}/UI_Buff_Element_Rock.png`
};

export function getElementIconUrl(element) {
  const norm = normalizeElement(element);
  return ELEMENT_OFFICIAL_ICONS[norm] || ELEMENT_OFFICIAL_ICONS[element] || '';
}

// Parseur sécurisé de statistiques principales (supporte le JSON direct ou double-sérialisé)
export function parseMainStats(raw) {
  if (!raw) return null;
  try {
    let res = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof res === 'string') res = JSON.parse(res);
    if (res && typeof res === 'object' && (res.sands || res.goblet || res.circlet)) {
      return res;
    }
  } catch {
    return null;
  }
  return null;
}

// Tracés SVG des éléments de la maquette
export const ELEMENT_SVGS = {
  Pyro: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z',
  Fire: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z',
  Hydro: 'M12 3.5c3 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.5 6-10.5z',
  Water: 'M12 3.5c3 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.5 6-10.5z',
  Anemo: 'M4 9h10a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M5 17h6',
  Wind: 'M4 9h10a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M5 17h6',
  Electro: 'M13 3 5 14h6l-1 7 8-11h-6l1-7z',
  Electric: 'M13 3 5 14h6l-1 7 8-11h-6l1-7z',
  Dendro: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8',
  Grass: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8',
  Cryo: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  Ice: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  Geo: 'M12 3l7 6-7 12-7-12 7-6zM5 9h14',
  Rock: 'M12 3l7 6-7 12-7-12 7-6zM5 9h14'
};


// SVGs des types d'armes
export const WEAPON_SVGS = {
  WEAPON_SWORD_ONE_HAND: 'M18.5 3.5h2v2L9 17l-2-2L18.5 3.5zM5.5 13.5l5 5M4 20l3-3',
  WEAPON_CLAYMORE: 'M20 4v3.5L9.5 18 6 14.5 16.5 4H20zM4.5 13l6.5 6.5M3.5 20.5l3-3',
  WEAPON_POLE: 'M3.5 20.5 16 8M16 8l1-4.5L21 3l-.5 4L16 8zM13 7.5l3.5 3.5',
  WEAPON_BOW: 'M7 3c6 2.5 8 6 8 9s-2 6.5-8 9M7 3v18M3 12h16M16 9l3 3-3 3',
  WEAPON_CATALYST: 'M12 2.5 19.5 7v10L12 21.5 4.5 17V7L12 2.5zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z'
};

export const WEAPON_LABELS = {
  WEAPON_SWORD_ONE_HAND: 'Épée à une main',
  WEAPON_CLAYMORE: 'Épée à deux mains',
  WEAPON_POLE: 'Arme d\'hast',
  WEAPON_BOW: 'Arc',
  WEAPON_CATALYST: 'Catalyseur'
};

// Stats principales de Genshin
export const SANDS_STATS = [
  'Recharge d\'énergie %',
  'ATQ %',
  'PV %',
  'DÉF %',
  'Maîtrise élémentaire'
];

export const GOBLET_STATS = [
  'Bonus DGT Pyro %',
  'Bonus DGT Hydro %',
  'Bonus DGT Cryo %',
  'Bonus DGT Électro %',
  'Bonus DGT Anémo %',
  'Bonus DGT Géo %',
  'Bonus DGT Dendro %',
  'DGT Physiques %',
  'ATQ %',
  'PV %',
  'DÉF %',
  'Maîtrise élémentaire'
];

export const CIRCLET_STATS = [
  'Taux CRIT %',
  'DGT CRIT %',
  'Bonus de soins %',
  'ATQ %',
  'PV %',
  'DÉF %',
  'Maîtrise élémentaire'
];

// Résonances officielles
export const ELEMENT_RESONANCES = {
  Pyro: { name: 'Flammes ferventes', desc: 'ATQ +25 %' },
  Hydro: { name: 'Eau médicinale', desc: 'PV max +25 %' },
  Anemo: { name: 'Vents de la célérité', desc: 'Endurance −15 %, Vitesse +10 %, TdR −5 %' },
  Electro: { name: 'Tonnerre puissant', desc: 'Génère des particules lors des réactions Électro' },
  Dendro: { name: 'Plantes grimpantes', desc: 'Maîtrise élémentaire +50 (jusqu\'à +80 via réactions)' },
  Cryo: { name: 'Glace brisante', desc: 'Taux CRIT +15 % contre les ennemis Cryo ou Gelés' },
  Geo: { name: 'Roc inébranlable', desc: 'Force du bouclier +15 %, DGT +15 % sous bouclier' }
};

// Réactions élémentaires
export const ELEMENT_REACTIONS = [
  { elements: ['Pyro', 'Hydro'], name: 'Vaporisation', color: '#ff9a6a' },
  { elements: ['Pyro', 'Cryo'], name: 'Fonte', color: '#ffb38a' },
  { elements: ['Pyro', 'Electro'], name: 'Surcharge', color: '#ff6fa8' },
  { elements: ['Hydro', 'Electro'], name: 'Électrocharge', color: '#b98cff' },
  { elements: ['Hydro', 'Cryo'], name: 'Gel', color: '#9fe6ff' },
  { elements: ['Cryo', 'Electro'], name: 'Supraconduction', color: '#b7b2ff' },
  { elements: ['Dendro', 'Pyro'], name: 'Brûlure', color: '#ff8a4a' },
  { elements: ['Dendro', 'Hydro'], name: 'Fleurissement', color: '#a6e05a' },
  { elements: ['Dendro', 'Electro'], name: 'Stimulation', color: '#7fe08a' }
];

// Armes signatures officielles Genshin Impact par ID de personnage
export const SIGNATURE_WEAPONS = {
  // Épées à une main (SWORD)
  10000003: 11501, // Jean -> Épée du faucon
  10000047: 11503, // Kaedehara Kazuha -> Serment de la liberté
  10000002: 11509, // Kamisato Ayaka -> Reflet de tranche-brume
  10000066: 11510, // Kamisato Ayato -> Lune ondulante de Futsu
  10000070: 11511, // Nilou -> Clé de Khaj-Nisut
  10000078: 11512, // Alhaitham -> Lumière d'incision foliaire
  10000089: 11513, // Furina -> Splendeur des eaux calmes
  10000094: 11514, // Chiori -> Uraku Misugiri
  10000098: 11515, // Clorinde -> Absolution
  10000103: 11516, // Xilonen -> Chanson de patrouille de sommet
  10000038: 11415, // Albedo -> Fuseau de cinabre
  10000042: 11505, // Keqing -> Coupeur de jade primordial
  10000035: 11501, // Qiqi -> Épée du faucon

  // Épées à deux mains (CLAYMORE)
  10000016: 12502, // Diluc -> Mort-du-loup
  10000051: 12503, // Eula -> Ode au chant du vent
  10000057: 12510, // Arataki Itto -> Brise-pierre de corne rouge
  10000079: 12511, // Dehya -> Balise de la mer de roseaux
  10000091: 12512, // Navia -> Condamneur
  10000101: 12513, // Kinich -> Croc du roi de la montagne
  10000106: 12514, // Mavuika -> Mille soleils brûlants

  // Armes d'hast (POLE)
  10000046: 13501, // Hu Tao -> Bâton de Homa
  10000030: 13504, // Zhongli -> Perceur prismatique
  10000026: 13505, // Xiao -> Lance de jade ailée
  10000063: 13507, // Shenhe -> Étouffeur de calamités
  10000052: 13509, // Shogun Raiden -> Lumière du faucheur
  10000071: 13511, // Cyno -> Bâton des sables écarlates
  10000096: 13512, // Arlecchino -> Semblance de la lune écarlate
  10000099: 13513, // Émilie -> Élégie de Lumidouce

  // Catalyseurs (CATALYST)
  10000041: 14501, // Mona -> Atlas de la Voûte d'Azur
  10000029: 14502, // Klee -> L'origine des Quatre Vents
  10000082: 14505, // Baizhu -> Splendeur de l'azur
  10000054: 14506, // Sangonomiya Kokomi -> Lueur de la lune éternelle
  10000058: 14509, // Yae Miko -> Vérité de Kagura
  10000073: 14511, // Nahida -> Mille rêves flottants
  10000075: 14512, // Nomade -> Mémoire de Tulaytullah
  10000086: 14513, // Wriothesley -> Supervision de trésorerie
  10000087: 14514, // Neuvillette -> Tome du flux éternel
  10000093: 14515, // Xianyun -> Écho de la grue
  10000102: 14516, // Mualani -> Instant surfant
  10000107: 14517, // Citlali -> Veillée d'appel d'étoiles

  // Arcs (BOW)
  10000037: 15502, // Ganyu -> Arc d'Amos
  10000022: 15503, // Venti -> Ultime soupir
  10000033: 15507, // Tartaglia -> Étoile polaire
  10000060: 15508, // Yelan -> Simulacre d'eau
  10000049: 15509, // Yoimiya -> Pulsation du tonnerre
  10000069: 15511, // Tighnari -> La voie du chasseur
  10000084: 15512, // Lyney -> La première grande magie
  10000095: 15513, // Sigewinne -> Corde de pluie blanche
  10000104: 15514, // Chasca -> Plumage cramoisi du vautour astral
  10000031: 15412  // Fischl -> Valse nocturne
};

export function getSignatureWeaponId(character) {
  if (!character) return null;
  const rawId = typeof character === 'object'
    ? Number(String(character.id || '').replace('avatar_', '').split('-')[0])
    : Number(String(character).replace('avatar_', '').split('-')[0]);
  return SIGNATURE_WEAPONS[rawId] || null;
}

export function computeSynergies(characterElements) {
  const counts = {};
  for (const el of characterElements) {
    if (!el) continue;
    const standard = ELEMENT_LABELS[el] || el;
    counts[standard] = (counts[standard] || 0) + 1;
  }

  const resonances = [];
  for (const [el, cnt] of Object.entries(counts)) {
    if (cnt >= 2 && ELEMENT_RESONANCES[el]) {
      resonances.push({
        element: el,
        name: ELEMENT_RESONANCES[el].name,
        desc: ELEMENT_RESONANCES[el].desc,
        color: ELEMENT_COLORS[el]
      });
    }
  }

  const activeElements = new Set(Object.keys(counts));
  const reactions = [];
  for (const rx of ELEMENT_REACTIONS) {
    if (rx.elements.every(e => activeElements.has(e))) {
      reactions.push(rx);
    }
  }

  return { resonances, reactions };
}

// ==========================================
// APPELS API HTTP
// ==========================================
export async function fetchCatalog(category) {
  const url = category ? `${API_BASE}/catalog?category=${category}` : `${API_BASE}/catalog`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchCatalogItem(id) {
  const res = await fetch(`${API_BASE}/catalog/${id}`);
  return res.json();
}

// Armes signatures dynamiques (synchronisées depuis SQLite)
export async function fetchSignatureWeapons() {
  try {
    const res = await fetch(`${API_BASE}/signature_weapons`);
    if (res.ok) {
      const data = await res.json();
      Object.assign(SIGNATURE_WEAPONS, data);
      return data;
    }
  } catch (e) {
    // Mode hors-ligne ou fallback sur SIGNATURE_WEAPONS statique
  }
  return SIGNATURE_WEAPONS;
}

// Ownership (Personnages possédés ⭐)
export async function fetchOwnership() {
  const res = await fetch(`${API_BASE}/ownership`);
  return res.json();
}

export async function updateOwnership(characterId, data) {
  const res = await fetch(`${API_BASE}/ownership/${characterId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// Loadouts
export async function fetchLoadouts(characterId) {
  const url = characterId ? `${API_BASE}/loadouts?character_id=${characterId}` : `${API_BASE}/loadouts`;
  const res = await fetch(url);
  return res.json();
}

export async function createLoadout(data) {
  const res = await fetch(`${API_BASE}/loadouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateLoadout(id, data) {
  const res = await fetch(`${API_BASE}/loadouts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteLoadout(id) {
  const res = await fetch(`${API_BASE}/loadouts/${id}`, { method: 'DELETE' });
  return res.json();
}

// Teams
export async function fetchTeams() {
  const res = await fetch(`${API_BASE}/teams`);
  return res.json();
}

export async function createTeam(data) {
  const res = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateTeam(id, data) {
  const res = await fetch(`${API_BASE}/teams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteTeam(id) {
  const res = await fetch(`${API_BASE}/teams/${id}`, { method: 'DELETE' });
  return res.json();
}

// Planner
export async function fetchPlanner() {
  const res = await fetch(`${API_BASE}/planner`);
  return res.json();
}

export async function createPlannerItem(data) {
  const res = await fetch(`${API_BASE}/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updatePlannerItem(id, data) {
  const res = await fetch(`${API_BASE}/planner/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deletePlannerItem(id) {
  const res = await fetch(`${API_BASE}/planner/${id}`, { method: 'DELETE' });
  return res.json();
}

// Calcul adaptatif et intelligent de la progression des objectifs
export function calculatePlannerProgress(item) {
  if (!item) return { done: 0, total: 1, pct: 0, completed: false };

  if (item.target_type === 'weapon') {
    const hasLevel = item.current_level < item.target_level;
    const tasks = [];
    if (hasLevel) {
      tasks.push({ key: 'is_level_done', done: !!item.is_level_done });
    }
    tasks.push({ key: 'is_weapon_done', done: !!item.is_weapon_done });
    const done = tasks.filter(t => t.done).length;
    const total = tasks.length;
    return { done, total, pct: Math.round((done / total) * 100), completed: done === total };
  }

  const hasLevel = item.current_level < item.target_level;
  const hasTalents = (item.talent_normal_current || 1) < (item.talent_normal_target || 1) ||
                     (item.talent_skill_current || 1) < (item.talent_skill_target || 1) ||
                     (item.talent_burst_current || 1) < (item.talent_burst_target || 1);
  const hasArtifacts = item.artifact_action && item.artifact_action !== 'none';

  const tasks = [];
  if (hasLevel) {
    tasks.push({ key: 'is_level_done', done: !!item.is_level_done });
  }
  if (hasTalents) {
    tasks.push({ key: 'is_talents_done', done: !!item.is_talents_done });
  }
  if (hasArtifacts) {
    tasks.push({ key: 'is_artifacts_done', done: !!item.is_artifacts_done });
  }

  if (tasks.length === 0) {
    return { done: 1, total: 1, pct: 100, completed: true };
  }

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  return { done, total, pct: Math.round((done / total) * 100), completed: done === total };
}

// Endgame
export async function fetchEndgame(mode) {
  const res = await fetch(`${API_BASE}/endgame/${mode}`);
  return res.json();
}

export async function saveEndgame(mode, data) {
  const res = await fetch(`${API_BASE}/endgame/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchAbyssMeta() {
  const res = await fetch(`${API_BASE}/endgame/abyss_meta`);
  return res.json();
}

// Wishlist
export async function fetchWishlist() {
  const res = await fetch(`${API_BASE}/wishlist`);
  return res.json();
}

export async function createWishlistItem(data) {
  const res = await fetch(`${API_BASE}/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function reorderWishlist(ids) {
  const res = await fetch(`${API_BASE}/wishlist/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  return res.json();
}

export async function updateWishlistItem(id, data) {
  const res = await fetch(`${API_BASE}/wishlist/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteWishlistItem(id) {
  const res = await fetch(`${API_BASE}/wishlist/${id}`, { method: 'DELETE' });
  return res.json();
}

// -------------------------------------------------------------
// FILTRAGE AVANCÉ DE PERSONNAGES & ARMES (ROADMAP DE VŒUX)
// -------------------------------------------------------------
export function filterWishCharacters(characters, { query = '', element = 'ALL', rarity = 'ALL', weapon = 'ALL', ownershipFilter = 'ALL', ownership = {} } = {}) {
  const normQ = (query || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return (characters || []).filter(c => {
    const rawId = Number(String(c.id).replace('avatar_', ''));
    const isOwned = Boolean(ownership[rawId]?.is_owned);

    // Filtre statut de possession
    if (ownershipFilter === 'OWNED' && !isOwned) return false;
    if (ownershipFilter === 'NOT_OWNED' && isOwned) return false;

    // Filtre élément canonique
    if (element !== 'ALL') {
      const normCharEl = normalizeElement(c.element);
      const normFilterEl = normalizeElement(element);
      if (normCharEl !== normFilterEl) return false;
    }

    // Filtre rareté
    if (rarity !== 'ALL' && c.rarity !== Number(rarity)) {
      return false;
    }

    // Filtre type d'arme
    if (weapon !== 'ALL' && c.weapon_type !== weapon) {
      return false;
    }

    // Recherche textuelle insensible aux accents et à la casse
    if (normQ) {
      const normName = (c.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!normName.includes(normQ)) return false;
    }

    return true;
  }).sort((a, b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    return (a.name || '').localeCompare(b.name || '', 'fr');
  });
}

export function filterWishWeapons(weapons, { query = '', weaponType = 'ALL', rarity = 'ALL' } = {}) {
  const normQ = (query || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return (weapons || []).filter(w => {
    // Filtre type d'arme
    if (weaponType !== 'ALL' && w.weapon_type !== weaponType) {
      return false;
    }

    // Filtre rareté
    if (rarity !== 'ALL' && w.rarity !== Number(rarity)) {
      return false;
    }

    // Recherche textuelle insensible aux accents et à la casse
    if (normQ) {
      const normName = (w.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!normName.includes(normQ)) return false;
    }

    return true;
  }).sort((a, b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    return (a.name || '').localeCompare(b.name || '', 'fr');
  });
}

// -------------------------------------------------------------
// GESTION DES CONSTELLATIONS (C0 À C6)
// -------------------------------------------------------------
export function calculateNextConstellation(currentConstellation = 0, delta = 0) {
  const current = Number(currentConstellation) || 0;
  return Math.max(0, Math.min(6, current + delta));
}
