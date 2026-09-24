<script setup>
import { ref, computed } from 'vue';
import { getIconUrl, ELEMENT_COLORS, ELEMENT_LABELS, WEAPON_LABELS } from '../api.js';
import CharacterModal from '../components/CharacterModal.vue';

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
  }
});

const emit = defineEmits(['refresh-loadouts']);

const searchQuery = ref('');
const selectedElement = ref('ALL');
const selectedWeapon = ref('ALL');
const selectedRarity = ref('ALL');
const activeCharacter = ref(null);

const elements = ['ALL', 'Fire', 'Water', 'Wind', 'Electric', 'Grass', 'Ice', 'Rock'];
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
    // Recherche par nom
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      if (!char.name.toLowerCase().includes(q)) return false;
    }
    // Filtre élément
    if (selectedElement.value !== 'ALL' && char.element !== selectedElement.value) {
      return false;
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

function openCharacter(char) {
  activeCharacter.value = char;
}

function closeCharacter() {
  activeCharacter.value = null;
}
</script>

<template>
  <div class="characters-view">
    <!-- Barre de recherche et filtres modernes -->
    <div class="filter-panel">
      <search class="search-box">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Rechercher un personnage (ex: Raiden, Hu Tao, Kazuha)..."
          class="search-input"
        />
      </search>

      <!-- Filtres Éléments -->
      <div class="filter-row">
        <span class="filter-label">Élément :</span>
        <div class="pill-group">
          <button
            v-for="el in elements"
            :key="el"
            type="button"
            :class="['filter-pill', { active: selectedElement === el }]"
            :style="selectedElement === el && el !== 'ALL' ? { borderColor: ELEMENT_COLORS[el], color: ELEMENT_COLORS[el] } : {}"
            @click="selectedElement = el"
          >
            {{ el === 'ALL' ? 'Tous' : (ELEMENT_LABELS[el] || el) }}
          </button>
        </div>
      </div>

      <!-- Filtres Rareté & Arme -->
      <div class="filter-row">
        <span class="filter-label">Type & Rareté :</span>
        <div class="pill-group">
          <button
            v-for="w in weaponsList"
            :key="w"
            type="button"
            :class="['filter-pill', { active: selectedWeapon === w }]"
            @click="selectedWeapon = w"
          >
            {{ w === 'ALL' ? 'Toutes armes' : WEAPON_LABELS[w] }}
          </button>
          <div class="separator"></div>
          <button
            v-for="r in ['ALL', '5', '4']"
            :key="r"
            type="button"
            :class="['filter-pill', { active: selectedRarity === r }]"
            @click="selectedRarity = r"
          >
            {{ r === 'ALL' ? 'Toutes raretés' : `${r}★` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Grille des personnages -->
    <div class="characters-grid">
      <button
        v-for="char in filteredCharacters"
        :key="char.id"
        type="button"
        class="char-card card"
        :style="{ '--el-color': ELEMENT_COLORS[char.element] || '#fff' }"
        @click="openCharacter(char)"
      >
        <div class="char-banner" :class="`rarity-${char.rarity}`">
          <img
            :src="getIconUrl(char.icon)"
            :alt="char.name"
            class="char-img"
            loading="lazy"
          />
          <span class="element-indicator" :style="{ background: ELEMENT_COLORS[char.element] }"></span>
          <span v-if="loadoutCountMap[Number(char.id.replace('avatar_', ''))]" class="loadouts-badge">
            {{ loadoutCountMap[Number(char.id.replace('avatar_', ''))] }} build{{ loadoutCountMap[Number(char.id.replace('avatar_', ''))] > 1 ? 's' : '' }}
          </span>
        </div>
        <div class="char-info">
          <span class="char-card-name">{{ char.name }}</span>
          <div class="char-sub">
            <span>{{ char.rarity }}★</span>
            <span>•</span>
            <span>{{ WEAPON_LABELS[char.weapon_type] || '' }}</span>
          </div>
        </div>
      </button>
    </div>

    <!-- Modal Détail & Loadouts -->
    <CharacterModal
      v-if="activeCharacter"
      :character="activeCharacter"
      :weapons="weapons"
      :reliquaries="reliquaries"
      @close="closeCharacter"
      @loadouts-updated="$emit('refresh-loadouts')"
    />
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

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.65rem 1rem;
}

.search-icon {
  font-size: 1rem;
  opacity: 0.6;
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

.filter-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  min-width: 90px;
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
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  transition: all 0.15s ease;
}

.filter-pill:hover {
  color: var(--text-main);
  border-color: var(--border-accent);
}

.filter-pill.active {
  background: var(--bg-surface-active);
  color: #fff;
  border-color: var(--border-accent);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

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
  position: relative;
}

.char-card:hover {
  transform: translateY(-2px);
  border-color: var(--el-color);
  box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.5);
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

.char-banner.rarity-5 {
  background: radial-gradient(circle, #7e4b17 0%, #1a1622 100%);
}

.char-banner.rarity-4 {
  background: radial-gradient(circle, #52296e 0%, #141724 100%);
}

.char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.char-card:hover .char-img {
  transform: scale(1.06);
}

.element-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}

.loadouts-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-anemo);
}

.char-info {
  padding: 0.6rem;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.char-card-name {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}

.char-sub {
  font-size: 0.7rem;
  color: var(--text-dim);
  display: flex;
  gap: 0.35rem;
  align-items: center;
}
</style>
