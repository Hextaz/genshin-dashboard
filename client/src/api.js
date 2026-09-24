// Gestion centralisée des appels API vers le serveur Hono

const API_BASE = '/api';

export const YATTA_ASSET_BASE = 'https://gi.yatta.moe/assets/UI';

export function getIconUrl(icon) {
  if (!icon) return '';
  if (icon.startsWith('http')) return icon;
  return `${YATTA_ASSET_BASE}/${icon}.png`;
}

export const ELEMENT_COLORS = {
  Fire: '#ff5a36',
  Pyro: '#ff5a36',
  Water: '#00c0ff',
  Hydro: '#00c0ff',
  Wind: '#33e6b8',
  Anemo: '#33e6b8',
  Electric: '#b370ff',
  Electro: '#b370ff',
  Grass: '#7bd42b',
  Dendro: '#7bd42b',
  Ice: '#98d8ff',
  Cryo: '#98d8ff',
  Rock: '#e6b033',
  Geo: '#e6b033'
};

export const ELEMENT_LABELS = {
  Fire: 'Pyro',
  Water: 'Hydro',
  Wind: 'Anémo',
  Electric: 'Électro',
  Grass: 'Dendro',
  Ice: 'Cryo',
  Rock: 'Géo'
};

export const WEAPON_LABELS = {
  WEAPON_SWORD_ONE_HAND: 'Épée',
  WEAPON_CLAYMORE: 'Épée à deux mains',
  WEAPON_POLE: 'Arme d\'hast',
  WEAPON_BOW: 'Arc',
  WEAPON_CATALYST: 'Catalyseur'
};

export async function fetchCatalog(category) {
  const url = category ? `${API_BASE}/catalog?category=${category}` : `${API_BASE}/catalog`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchCatalogItem(id) {
  const res = await fetch(`${API_BASE}/catalog/${id}`);
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
