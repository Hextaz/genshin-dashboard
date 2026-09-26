<script setup>
import { ref, computed } from 'vue';
import {
  getIconUrl,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  getElementIconUrl,
  WEAPON_LABELS,
  WEAPON_SVGS
} from '../api.js';
import CharacterDrawer from '../components/CharacterDrawer.vue';

const props = defineProps({
  characters: {
    type: Array,
    default: () => []
  },
  weapons: {
    type: Array,
    default: () => []
  },
  reliquaries: {
    type: Array,
    default: () => []
  },
  loadouts: {
    type: Array,
    default: () => []
  },
  ownership: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['refresh-loadouts', 'toggle-ownership']);

const searchQuery = ref('');
const selectedElement = ref('ALL');
const selectedWeapon = ref('ALL');
const selectedRarity = ref('ALL');
const statusFilter = ref('ALL'); // 'ALL', 'OWNED', 'HAS_BUILD'
const activeCharacter = ref(null);

const elementsList = ['ALL', 'Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];
const weaponsList = ['ALL', 'WEAPON_SWORD_ONE_HAND', 'WEAPON_CLAYMORE', 'WEAPON_POLE', 'WEAPON_BOW', 'WEAPON_CATALYST'];

// Comptage des loadouts par character_id
const loadoutCountMap = computed(() => {
  const map = {};
  for (const l of props.loadouts) {
    map[l.character_id] = (map[l.character_id] || 0) + 1;
  }
  return map;
});

const filteredCharacters = computed(() => {
  return props.characters.filter(char => {
    const rawId = Number(char.id.replace('avatar_', ''));
    
    // Filtre statut : possédés / avec build
    if (statusFilter.value === 'OWNED') {
      if (!props.ownership[rawId]?.is_owned) return false;
    } else if (statusFilter.value === 'HAS_BUILD') {
      if (!loadoutCountMap.value[rawId]) return false;
    }

    // Recherche par nom
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      if (!char.name.toLowerCase().includes(q)) return false;
    }

    // Filtre élément
    if (selectedElement.value !== 'ALL') {
      const charEl = ELEMENT_LABELS[char.element] || char.element;
      if (charEl !== selectedElement.value) return false;
    }

    // Filtre arme
    if (selectedWeapon.value !== 'ALL' && char.weapon_type !== selectedWeapon.value) {
      return false;
    }

    // Filtre rareté
    if (selectedRarity.value !== 'ALL' && char.rarity !== Number(selectedRarity.value)) {
      return false;
    }

    return true;
  });
});

function toggleCharacter(char) {
  if (activeCharacter.value && activeCharacter.value.id === char.id) {
    activeCharacter.value = null; // Recliquer ferme le volet
  } else {
    activeCharacter.value = char;
  }
}
</script>

<template>
  <div class="characters-view">
    <!-- Barre de filtres moderne Genshin -->
    <div class="filter-panel">
      <!-- Recherche & Filtres Rapides de statut -->
      <div class="filter-row top-row">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Rechercher un personnage (ex: Raiden, Hu Tao, Furina, Xilonen)..."
            class="search-input"
          />
        </div>

        <div class="status-pills">
          <button
            type="button"
            :class="['status-pill', { active: statusFilter === 'ALL' }]"
            @click="statusFilter = 'ALL'"
          >
            Tous ({{ characters.length }})
          </button>
          <button
            type="button"
            :class="['status-pill', { active: statusFilter === 'OWNED' }]"
            @click="statusFilter = 'OWNED'"
          >
            ★ Possédés
          </button>
          <button
            type="button"
            :class="['status-pill', { active: statusFilter === 'HAS_BUILD' }]"
            @click="statusFilter = 'HAS_BUILD'"
          >
            🛠️ Avec build
          </button>
        </div>
      </div>

      <!-- Filtres Éléments avec VRAIS insignes officiels Yatta -->
      <div class="filter-row">
        <span class="filter-label">Élément :</span>
        <div class="pill-group">
          <button
            v-for="el in elementsList"
            :key="el"
            type="button"
            :class="['filter-pill', { active: selectedElement === el }]"
            :style="selectedElement === el && el !== 'ALL' ? { borderColor: ELEMENT_COLORS[el], color: ELEMENT_COLORS[el], background: `${ELEMENT_COLORS[el]}18` } : {}"
            @click="selectedElement = el"
          >
            <img
              v-if="el !== 'ALL'"
              :src="getElementIconUrl(el)"
              alt=""
              aria-hidden="true"
              class="official-el-icon"
            />
            <span>{{ el === 'ALL' ? 'Tous' : (ELEMENT_LABELS[el] || el) }}</span>
          </button>
        </div>
      </div>

      <!-- Filtres Armes & Rareté -->
      <div class="filter-row">
        <span class="filter-label">Arme & Rareté :</span>
        <div class="pill-group">
          <button
            v-for="w in weaponsList"
            :key="w"
            type="button"
            :class="['filter-pill', { active: selectedWeapon === w }]"
            @click="selectedWeapon = w"
          >
            <svg v-if="w !== 'ALL'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="el-svg">
              <path :d="WEAPON_SVGS[w]" />
            </svg>
            <span>{{ w === 'ALL' ? 'Toutes armes' : WEAPON_LABELS[w] }}</span>
          </button>
          <div class="separator"></div>
          <button
            v-for="r in ['ALL', '5', '4']"
            :key="r"
            type="button"
            :class="['filter-pill', { active: selectedRarity === r }]"
            @click="selectedRarity = r"
          >
            {{ r === 'ALL' ? 'Toutes' : `${r}★` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Disposition Grille + Volet Latéral (Drawer) -->
    <div class="view-layout">
      <!-- Grille des personnages style officiel Genshin -->
      <div class="characters-grid-area">
        <div class="grid-header-meta">
          <span>{{ filteredCharacters.length }} personnage{{ filteredCharacters.length > 1 ? 's' : '' }}</span>
          <span v-if="activeCharacter" class="hint-active-text">
            Fiche active : <strong>{{ activeCharacter.name }}</strong> (cliquez à nouveau pour fermer)
          </span>
        </div>

        <div class="characters-grid">
          <button
            v-for="char in filteredCharacters"
            :key="char.id"
            type="button"
            :class="['char-card card', {
              active: activeCharacter && activeCharacter.id === char.id,
              owned: ownership[Number(char.id.replace('avatar_', ''))]?.is_owned
            }]"
            :style="{ '--el-color': ELEMENT_COLORS[char.element] || '#7CF0D0' }"
            @click="toggleCharacter(char)"
          >
            <!-- Bannière avec fond dégradé selon la rareté Genshin -->
            <div class="char-banner" :class="`rarity-${char.rarity}`">
              <!-- Étoile de possession en haut à gauche -->
              <button
                type="button"
                :class="['star-toggle-btn', { active: ownership[Number(char.id.replace('avatar_', ''))]?.is_owned }]"
                title="Basculer possédé / non possédé"
                @click.stop="$emit('toggle-ownership', Number(char.id.replace('avatar_', '')))"
              >
                ★
              </button>

              <!-- Insigne officiel Genshin en haut à droite -->
              <div class="card-element-badge" :style="{ borderColor: ELEMENT_COLORS[char.element] }">
                <img :src="getElementIconUrl(char.element)" :alt="ELEMENT_LABELS[char.element]" class="badge-el-img" />
              </div>

              <!-- Portrait Yatta (cadré sans rognage) -->
              <img
                :src="getIconUrl(char.icon)"
                :alt="char.name"
                class="char-img"
                loading="lazy"
              />

              <!-- Badge du nombre de builds en bas à gauche -->
              <span
                v-if="loadoutCountMap[Number(char.id.replace('avatar_', ''))]"
                class="loadouts-badge"
              >
                {{ loadoutCountMap[Number(char.id.replace('avatar_', ''))] }} build{{ loadoutCountMap[Number(char.id.replace('avatar_', ''))] > 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Fiche info sous la bannière -->
            <div class="char-info">
              <span class="char-card-name">{{ char.name }}</span>
              <div class="char-sub">
                <span class="rarity-text" :class="`text-rarity-${char.rarity}`">{{ char.rarity }}★</span>
                <span class="dot-separator">•</span>
                <span class="weapon-label">{{ WEAPON_LABELS[char.weapon_type] || '' }}</span>
              </div>
            </div>
          </button>
        </div>

        <div v-if="filteredCharacters.length === 0" class="empty-state">
          Aucun personnage ne correspond à vos filtres actuels.
        </div>
      </div>

      <!-- Volet Coulissant Latéral (Drawer) pour les Builds -->
      <CharacterDrawer
        v-if="activeCharacter"
        :character="activeCharacter"
        :weapons="weapons"
        :reliquaries="reliquaries"
        :is-owned="Boolean(ownership[Number(activeCharacter.id.replace('avatar_', ''))]?.is_owned)"
        @close="activeCharacter = null"
        @loadouts-updated="$emit('refresh-loadouts')"
        @toggle-ownership="$emit('toggle-ownership', Number(activeCharacter.id.replace('avatar_', '')))"
      />
    </div>
  </div>
</template>

<style scoped>
.characters-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.top-row {
  justify-content: space-between;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.65rem 1rem;
  flex: 1;
  max-width: 480px;
}

.search-icon {
  opacity: 0.5;
  color: var(--accent-mint);
}

.search-input {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.95rem;
  width: 100%;
  outline: none;
}

.status-pills {
  display: flex;
  gap: 0.5rem;
}

.status-pill {
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-pill:hover {
  color: var(--text-main);
  border-color: var(--border-accent);
}

.status-pill.active {
  background: #172425;
  color: var(--accent-mint);
  border-color: var(--accent-mint);
  box-shadow: 0 0 12px rgba(124, 240, 208, 0.2);
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  min-width: 110px;
}

.pill-group {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}

.separator {
  width: 1px;
  height: 20px;
  background: var(--border-subtle);
  margin: 0 0.4rem;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  color: var(--text-main);
  border-color: var(--border-accent);
}

.filter-pill.active {
  background: var(--bg-surface);
  color: #fff;
  border-color: var(--accent-mint);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.official-el-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

.el-svg {
  flex-shrink: 0;
}

/* Layout Grille + Volet */
.view-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  position: relative;
}

.characters-grid-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.grid-header-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-dim);
  padding: 0 0.25rem;
}

.hint-active-text {
  color: var(--accent-mint);
}

/* Grille des cartes de personnages authentiques Genshin */
.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1rem;
}

.char-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-align: left;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  padding: 0;
  position: relative;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
}

.char-card:hover {
  transform: translateY(-3px);
  border-color: var(--el-color);
  box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.6), 0 0 14px var(--el-color)30;
}

.char-card.active {
  border-color: var(--accent-mint);
  box-shadow: 0 0 0 2px var(--accent-mint), 0 12px 28px rgba(0, 0, 0, 0.7);
}

.char-card.owned {
  border-color: rgba(243, 197, 82, 0.4);
}

.char-banner {
  aspect-ratio: 1;
  position: relative;
  background: #181d28;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Dégradés officiels de rareté Genshin */
.char-banner.rarity-5 {
  background: radial-gradient(circle, #7e4b17 0%, #1a1622 100%);
}

.char-banner.rarity-4 {
  background: radial-gradient(circle, #52296e 0%, #141724 100%);
}

/* Portrait Yatta : object-position top center pour éviter tout crop de tête */
.char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
}

.char-card:hover .char-img {
  transform: scale(1.08);
}

/* Étoile de possession interactive */
.star-toggle-btn {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(11, 13, 18, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-dim);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: all 0.2s ease;
  line-height: 1;
}

.star-toggle-btn:hover {
  transform: scale(1.15);
  border-color: var(--accent-gold);
  color: var(--accent-gold);
}

.star-toggle-btn.active {
  background: rgba(243, 197, 82, 0.2);
  color: var(--accent-gold);
  border-color: var(--accent-gold);
  box-shadow: 0 0 10px rgba(243, 197, 82, 0.4);
}

/* Insigne officiel élément */
.card-element-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(11, 13, 18, 0.8);
  border: 1.5px solid #2A3040;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.badge-el-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

/* Badge du nombre de builds */
.loadouts-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(11, 13, 18, 0.85);
  border: 1px solid rgba(124, 240, 208, 0.4);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--accent-mint);
  z-index: 2;
}

/* Fiche info texte */
.char-info {
  padding: 0.6rem;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  border-top: 1px solid var(--border-subtle);
}

.char-card-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-sub {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-dim);
}

.rarity-text {
  font-weight: 700;
}

.text-rarity-5 {
  color: var(--accent-gold);
}

.text-rarity-4 {
  color: #C29BFF;
}

.dot-separator {
  opacity: 0.4;
}

.weapon-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-dim);
  background: var(--bg-surface);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-md);
}

@media (max-width: 900px) {
  .view-layout {
    flex-direction: column;
  }
}
</style>
