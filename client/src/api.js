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
  Electric: '#B98CFF',
  Electro: '#B98CFF',
  Grass: '#A6E05A',
  Dendro: '#A6E05A',
  Ice: '#9FE6FF',
  Cryo: '#9FE6FF',
  Rock: '#F3C552',
  Geo: '#F3C552'
};

export const ELEMENT_LABELS = {
  Fire: 'Pyro',
  Pyro: 'Pyro',
  Water: 'Hydro',
  Hydro: 'Hydro',
  Wind: 'Anémo',
  Anemo: 'Anémo',
  Electric: 'Électro',
  Electro: 'Électro',
  Grass: 'Dendro',
  Dendro: 'Dendro',
  Ice: 'Cryo',
  Cryo: 'Cryo',
  Rock: 'Géo',
  Geo: 'Géo'
};

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
  return ELEMENT_OFFICIAL_ICONS[element] || '';
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
