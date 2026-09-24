<script setup>
import { ref, computed, watch } from 'vue';
import { getIconUrl, ELEMENT_COLORS, fetchEndgame, saveEndgame } from '../api.js';

const props = defineProps({
  characters: {
    type: Array,
    default: () => []
  },
  teams: {
    type: Array,
    default: () => []
  },
  loadouts: {
    type: Array,
    default: () => []
  }
});

const currentMode = ref('abyss'); // 'abyss' (2 teams) ou 'carnage' (3 teams)
const abyssMeta = ref(null);
const saving = ref(false);
const saveSuccess = ref(false);

// Structure de composition
const setup = ref({
  team1: [null, null, null, null],
  team2: [null, null, null, null],
  team3: [null, null, null, null], // Utilisé pour le Carnage
  notes: ''
});

// Map des personnages par ID numérique
const charactersMap = computed(() => {
  const map = {};
  for (const c of props.characters) {
    const rawId = Number(c.id.replace('avatar_', ''));
    map[rawId] = c;
  }
  return map;
});

// Map des loadouts par ID string
const loadoutsMap = computed(() => {
  const map = {};
  for (const l of props.loadouts) {
    map[l.id] = l;
  }
  return map;
});

// Récupération des données sauvegardées
async function loadSavedSetup() {
  try {
    const res = await fetchEndgame(currentMode.value);
    if (res.data) {
      setup.value.team1 = res.data.team1 || [null, null, null, null];
      setup.value.team2 = res.data.team2 || [null, null, null, null];
      setup.value.team3 = res.data.team3 || [null, null, null, null];
      setup.value.notes = res.data.notes || '';
    } else {
      setup.value = {
        team1: [null, null, null, null],
        team2: [null, null, null, null],
        team3: [null, null, null, null],
        notes: ''
      };
    }
  } catch (err) {
    console.error('Erreur chargement setup endgame:', err);
  }
}

// Récupérer les métadonnées officielles des abysses
async function loadAbyssMeta() {
  try {
    const res = await fetchEndgame('abyss_meta');
    if (res.data) {
      abyssMeta.value = res.data;
    }
  } catch (err) {
    console.error('Erreur chargement meta abysses:', err);
  }
}

loadAbyssMeta();
watch(currentMode, () => {
  loadSavedSetup();
}, { immediate: true });

// Calcul des personnages déjà assignés dans CHAQUE équipe
const assignedInTeam1 = computed(() => new Set(setup.value.team1.filter(Boolean).map(s => s.character_id)));
const assignedInTeam2 = computed(() => new Set(setup.value.team2.filter(Boolean).map(s => s.character_id)));
const assignedInTeam3 = computed(() => new Set(setup.value.team3.filter(Boolean).map(s => s.character_id)));

// Vérifier si un personnage est pris dans une AUTRE équipe
function isCharacterAssignedElsewhere(charId, currentTeamKey) {
  if (!charId) return false;
  if (currentTeamKey !== 'team1' && assignedInTeam1.value.has(charId)) return 'Team 1';
  if (currentTeamKey !== 'team2' && assignedInTeam2.value.has(charId)) return 'Team 2';
  if (currentMode.value === 'carnage' && currentTeamKey !== 'team3' && assignedInTeam3.value.has(charId)) return 'Team 3';
  return false;
}

// Conflits détectés dans chaque équipe
const teamConflicts = computed(() => {
  const checkConflicts = (teamKey) => {
    const list = [];
    const currentTeam = setup.value[teamKey];
    for (let i = 0; i < currentTeam.length; i++) {
      const slot = currentTeam[i];
      if (slot && slot.character_id) {
        const other = isCharacterAssignedElsewhere(slot.character_id, teamKey);
        if (other) {
          const charName = charactersMap.value[slot.character_id]?.name || 'Personnage';
          list.push(`${charName} est aussi en ${other}`);
        }
      }
    }
    return list;
  };

  return {
    team1: checkConflicts('team1'),
    team2: checkConflicts('team2'),
    team3: checkConflicts('team3')
  };
});

// Import d'un preset d'équipe dans une team spécifique
function importPreset(teamKey, preset) {
  if (!preset) return;
  const newSlots = [1, 2, 3, 4].map(s => {
    const charId = preset[`slot${s}_character_id`];
    const loadoutId = preset[`slot${s}_loadout_id`];
    if (!charId) return null;
    return {
      character_id: charId,
      loadout_id: loadoutId
    };
  });
  setup.value[teamKey] = newSlots;
}

// Retirer un slot
function clearSlot(teamKey, index) {
  setup.value[teamKey][index] = null;
}

// Assignation manuelle d'un slot
function setSlotCharacter(teamKey, index, charId) {
  if (!charId) {
    setup.value[teamKey][index] = null;
    return;
  }
  const builds = props.loadouts.filter(l => l.character_id === Number(charId));
  setup.value[teamKey][index] = {
    character_id: Number(charId),
    loadout_id: builds[0]?.id || null
  };
}

async function handleSave() {
  saving.value = true;
  saveSuccess.value = false;
  try {
    await saveEndgame(currentMode.value, setup.value);
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (err) {
    console.error('Erreur sauvegarde endgame:', err);
  } finally {
    saving.value = false;
  }
}

// Anomalie énergétique du dernier étage d'abysse (Floor 12 ou 11)
const leyLineDisorder = computed(() => {
  if (!abyssMeta.value?.items) return null;
  const items = abyssMeta.value.items;
  const lastKey = Object.keys(items).pop();
  const floorList = items[lastKey]?.entrance?.floorList;
  if (!floorList || floorList.length === 0) return null;
  const lastFloor = floorList[floorList.length - 1];
  return lastFloor.leyLineDisorder || [];
});
</script>

<template>
  <div class="endgame-view">
    <!-- En-tête et sélecteur de mode -->
    <div class="endgame-header">
      <div>
        <h2 class="section-heading">⚔️ Composition Endgame</h2>
        <p class="section-sub">Préparez vos équipes pour les Abysses ou le Carnage Chtonien avec garantie zéro doublon.</p>
      </div>

      <!-- Onglets Abysses vs Carnage -->
      <div class="mode-tabs">
        <button
          type="button"
          :class="['mode-tab', { active: currentMode === 'abyss' }]"
          @click="currentMode = 'abyss'"
        >
          🌌 Profondeurs Spiralées (2 Teams)
        </button>
        <button
          type="button"
          :class="['mode-tab', { active: currentMode === 'carnage' }]"
          @click="currentMode = 'carnage'"
        >
          👹 Carnage Chtonien (3 Teams)
        </button>
      </div>
    </div>

    <!-- Bannière d'informations Abysses -->
    <div v-if="currentMode === 'abyss' && leyLineDisorder && leyLineDisorder.length > 0" class="abyss-banner card">
      <div class="banner-badge">✦ Anomalies Énergétiques Actuelles (Étage 12)</div>
      <div class="banner-buffs">
        <p v-for="(buff, idx) in leyLineDisorder" :key="idx" class="buff-item">
          • {{ buff.description }}
        </p>
      </div>
    </div>

    <!-- Grille des colonnes d'équipes -->
    <div :class="['teams-columns', { 'three-cols': currentMode === 'carnage' }]">
      <!-- TEAM 1 -->
      <div class="team-column card">
        <div class="col-header">
          <div>
            <h3 class="col-title">Équipe 1 {{ currentMode === 'carnage' ? '(Boss 1)' : '(Première moitié)' }}</h3>
            <span class="col-sub">{{ setup.team1.filter(Boolean).length }}/4 personnages</span>
          </div>
          <!-- Import Preset -->
          <div class="preset-picker">
            <select class="input-sm select-field" @change="(e) => { importPreset('team1', teams.find(t => t.id === e.target.value)); e.target.value = ''; }">
              <option value="">📥 Importer un preset...</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <!-- Alerte conflit de doublon -->
        <div v-if="teamConflicts.team1.length > 0" class="conflict-alert">
          ⚠️ Conflit détecté : {{ teamConflicts.team1.join(', ') }}
        </div>

        <!-- 4 Slots -->
        <div class="slots-list">
          <div
            v-for="(slot, idx) in setup.team1"
            :key="idx"
            :class="['slot-row card', { conflict: slot && isCharacterAssignedElsewhere(slot.character_id, 'team1') }]"
          >
            <template v-if="slot && charactersMap[slot.character_id]">
              <div class="slot-avatar-mini" :style="{ borderColor: ELEMENT_COLORS[charactersMap[slot.character_id].element] }">
                <img :src="getIconUrl(charactersMap[slot.character_id].icon)" :alt="charactersMap[slot.character_id].name" class="img-mini" />
              </div>
              <div class="slot-detail">
                <span class="slot-name">{{ charactersMap[slot.character_id].name }}</span>
                <span v-if="slot.loadout_id && loadoutsMap[slot.loadout_id]" class="slot-build-tag">
                  {{ loadoutsMap[slot.loadout_id].name }}
                </span>
              </div>
              <button type="button" class="btn-clear" @click="clearSlot('team1', idx)">✕</button>
            </template>
            <template v-else>
              <select
                class="slot-select input-field"
                @change="(e) => setSlotCharacter('team1', idx, e.target.value)"
              >
                <option value="">+ Choisir Slot {{ idx + 1 }}...</option>
                <option
                  v-for="c in characters"
                  :key="c.id"
                  :value="Number(c.id.replace('avatar_', ''))"
                  :disabled="!!isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team1')"
                >
                  {{ c.name }} {{ isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team1') ? `(Pris en ${isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team1')})` : '' }}
                </option>
              </select>
            </template>
          </div>
        </div>
      </div>

      <!-- TEAM 2 -->
      <div class="team-column card">
        <div class="col-header">
          <div>
            <h3 class="col-title">Équipe 2 {{ currentMode === 'carnage' ? '(Boss 2)' : '(Seconde moitié)' }}</h3>
            <span class="col-sub">{{ setup.team2.filter(Boolean).length }}/4 personnages</span>
          </div>
          <div class="preset-picker">
            <select class="input-sm select-field" @change="(e) => { importPreset('team2', teams.find(t => t.id === e.target.value)); e.target.value = ''; }">
              <option value="">📥 Importer un preset...</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="teamConflicts.team2.length > 0" class="conflict-alert">
          ⚠️ Conflit détecté : {{ teamConflicts.team2.join(', ') }}
        </div>

        <div class="slots-list">
          <div
            v-for="(slot, idx) in setup.team2"
            :key="idx"
            :class="['slot-row card', { conflict: slot && isCharacterAssignedElsewhere(slot.character_id, 'team2') }]"
          >
            <template v-if="slot && charactersMap[slot.character_id]">
              <div class="slot-avatar-mini" :style="{ borderColor: ELEMENT_COLORS[charactersMap[slot.character_id].element] }">
                <img :src="getIconUrl(charactersMap[slot.character_id].icon)" :alt="charactersMap[slot.character_id].name" class="img-mini" />
              </div>
              <div class="slot-detail">
                <span class="slot-name">{{ charactersMap[slot.character_id].name }}</span>
                <span v-if="slot.loadout_id && loadoutsMap[slot.loadout_id]" class="slot-build-tag">
                  {{ loadoutsMap[slot.loadout_id].name }}
                </span>
              </div>
              <button type="button" class="btn-clear" @click="clearSlot('team2', idx)">✕</button>
            </template>
            <template v-else>
              <select
                class="slot-select input-field"
                @change="(e) => setSlotCharacter('team2', idx, e.target.value)"
              >
                <option value="">+ Choisir Slot {{ idx + 1 }}...</option>
                <option
                  v-for="c in characters"
                  :key="c.id"
                  :value="Number(c.id.replace('avatar_', ''))"
                  :disabled="!!isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team2')"
                >
                  {{ c.name }} {{ isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team2') ? `(Pris en ${isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team2')})` : '' }}
                </option>
              </select>
            </template>
          </div>
        </div>
      </div>

      <!-- TEAM 3 (Spécifique au Carnage Chtonien) -->
      <div v-if="currentMode === 'carnage'" class="team-column card">
        <div class="col-header">
          <div>
            <h3 class="col-title">Équipe 3 (Boss 3)</h3>
            <span class="col-sub">{{ setup.team3.filter(Boolean).length }}/4 personnages</span>
          </div>
          <div class="preset-picker">
            <select class="input-sm select-field" @change="(e) => { importPreset('team3', teams.find(t => t.id === e.target.value)); e.target.value = ''; }">
              <option value="">📥 Importer un preset...</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="teamConflicts.team3.length > 0" class="conflict-alert">
          ⚠️ Conflit détecté : {{ teamConflicts.team3.join(', ') }}
        </div>

        <div class="slots-list">
          <div
            v-for="(slot, idx) in setup.team3"
            :key="idx"
            :class="['slot-row card', { conflict: slot && isCharacterAssignedElsewhere(slot.character_id, 'team3') }]"
          >
            <template v-if="slot && charactersMap[slot.character_id]">
              <div class="slot-avatar-mini" :style="{ borderColor: ELEMENT_COLORS[charactersMap[slot.character_id].element] }">
                <img :src="getIconUrl(charactersMap[slot.character_id].icon)" :alt="charactersMap[slot.character_id].name" class="img-mini" />
              </div>
              <div class="slot-detail">
                <span class="slot-name">{{ charactersMap[slot.character_id].name }}</span>
                <span v-if="slot.loadout_id && loadoutsMap[slot.loadout_id]" class="slot-build-tag">
                  {{ loadoutsMap[slot.loadout_id].name }}
                </span>
              </div>
              <button type="button" class="btn-clear" @click="clearSlot('team3', idx)">✕</button>
            </template>
            <template v-else>
              <select
                class="slot-select input-field"
                @change="(e) => setSlotCharacter('team3', idx, e.target.value)"
              >
                <option value="">+ Choisir Slot {{ idx + 1 }}...</option>
                <option
                  v-for="c in characters"
                  :key="c.id"
                  :value="Number(c.id.replace('avatar_', ''))"
                  :disabled="!!isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team3')"
                >
                  {{ c.name }} {{ isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team3') ? `(Pris en ${isCharacterAssignedElsewhere(Number(c.id.replace('avatar_', '')), 'team3')})` : '' }}
                </option>
              </select>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Barre d'action de sauvegarde -->
    <div class="bottom-bar card">
      <div class="save-status">
        <span v-if="saveSuccess" class="text-success">✓ Composition enregistrée sur Lordi !</span>
      </div>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="handleSave">
        {{ saving ? 'Sauvegarde en cours...' : '💾 Sauvegarder la composition' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.endgame-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.endgame-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-heading {
  font-size: 1.5rem;
  font-weight: 800;
}

.section-sub {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.mode-tabs {
  display: flex;
  gap: 0.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.35rem;
}

.mode-tab {
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: all 0.15s;
}

.mode-tab.active {
  background: var(--bg-surface-active);
  color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
}

.abyss-banner {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8));
  border-left: 4px solid var(--color-anemo);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.banner-badge {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-anemo);
  letter-spacing: 0.05em;
}

.banner-buffs {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.buff-item {
  font-size: 0.85rem;
  color: var(--text-main);
}

.teams-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.teams-columns.three-cols {
  grid-template-columns: repeat(3, 1fr);
}

.team-column {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.col-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.col-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.col-sub {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.input-sm {
  padding: 0.35rem 0.6rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.75rem;
  outline: none;
}

.conflict-alert {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  background: var(--bg-dark);
}

.slot-row.conflict {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.slot-avatar-mini {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  border: 2px solid;
  overflow: hidden;
  background: #181d28;
  flex-shrink: 0;
}

.img-mini {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slot-detail {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  overflow: hidden;
}

.slot-name {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-build-tag {
  font-size: 0.7rem;
  color: var(--color-anemo);
}

.btn-clear {
  color: var(--text-dim);
  padding: 0.35rem;
  font-size: 0.8rem;
}
.btn-clear:hover {
  color: #ef4444;
}

.slot-select {
  width: 100%;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  background: var(--bg-dark);
  border: 1px dashed var(--border-accent);
  color: var(--text-muted);
}

.bottom-bar {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.text-success {
  color: var(--color-dendro);
  font-size: 0.85rem;
  font-weight: 600;
}

@media (max-width: 900px) {
  .teams-columns, .teams-columns.three-cols {
    grid-template-columns: 1fr;
  }
}
</style>
