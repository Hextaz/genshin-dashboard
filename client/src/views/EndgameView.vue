<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  getIconUrl,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  getElementIconUrl,
  WEAPON_LABELS,
  WEAPON_SVGS,
  fetchEndgame,
  saveEndgame,
  fetchAbyssMeta
} from '../api.js';

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
  teams: {
    type: Array,
    default: () => []
  }
});

const currentMode = ref('abyss'); // 'abyss' (2 teams) ou 'carnage' (3 teams)
const selectedFloor = ref(12); // 11 ou 12 dans les Abysses
const activeSlot = ref({ teamKey: 'team1', slotIndex: 0 }); // Emplacement actif pour sélection
const rosterElementFilter = ref('ALL');
const saving = ref(false);
const saveSuccess = ref(false);

const abyssMeta = ref(null);

// Volet d'inspection de loadout escamotable (afficher / masquer)
const inspectedSlot = ref(null); // { teamKey, slotIndex, character, loadout }

// Modale d'importation de preset
const showImportModal = ref(false);
const importTargetTeamKey = ref('team1');

// Modale de sélection de build dans Endgame
const activeBuildPicker = ref(null); // { teamKey, slotIndex, character, currentLoadoutId }

const setup = ref({
  team1: [null, null, null, null],
  team2: [null, null, null, null],
  team3: [null, null, null, null]
});

// Map des personnages
const charactersMap = computed(() => {
  const map = {};
  for (const c of props.characters) {
    const rawId = Number(c.id.replace('avatar_', ''));
    map[rawId] = c;
  }
  return map;
});

// Map des loadouts
const loadoutsMap = computed(() => {
  const map = {};
  for (const l of props.loadouts) {
    map[l.id] = l;
  }
  return map;
});

// Map des armes
const weaponsMap = computed(() => {
  const map = {};
  for (const w of props.weapons) {
    const rawId = Number(w.id.replace('weapon_', ''));
    map[rawId] = w;
  }
  return map;
});

// Map des sets d'artéfacts
const relicsMap = computed(() => {
  const map = {};
  for (const r of props.reliquaries) {
    const rawId = Number(r.id.replace('relic_', ''));
    map[rawId] = r;
  }
  return map;
});

function getLoadoutsForCharacter(charId) {
  return props.loadouts.filter(l => l.character_id === Number(charId));
}

// Chargement des données Endgame
async function loadEndgameSetup() {
  try {
    const data = await fetchEndgame(currentMode.value);
    if (data && typeof data === 'object') {
      setup.value = {
        team1: Array.isArray(data.team1) ? data.team1 : [null, null, null, null],
        team2: Array.isArray(data.team2) ? data.team2 : [null, null, null, null],
        team3: Array.isArray(data.team3) ? data.team3 : [null, null, null, null]
      };
    } else {
      setup.value = {
        team1: [null, null, null, null],
        team2: [null, null, null, null],
        team3: [null, null, null, null]
      };
    }
  } catch (err) {
    console.error('Erreur chargement endgame setup:', err);
  }
}

watch(currentMode, () => {
  activeSlot.value = { teamKey: 'team1', slotIndex: 0 };
  inspectedSlot.value = null;
  loadEndgameSetup();
});

onMounted(async () => {
  loadEndgameSetup();
  try {
    abyssMeta.value = await fetchAbyssMeta();
  } catch (err) {
    console.error('Erreur chargement abyss meta:', err);
  }
});

// Données officielles de l'étage sélectionné
const currentFloorData = computed(() => {
  if (!abyssMeta.value?.data) return null;
  return selectedFloor.value === 11 ? abyssMeta.value.data.floor11 : abyssMeta.value.data.floor12;
});

const currentFloorDisorders = computed(() => {
  const disorders = currentFloorData.value?.leyLineDisorder || [];
  return disorders.filter(d => d.description && d.description.trim()).map(d => d.description);
});

// -------------------------------------------------------------
// DÉTECTION ET EXCLUSION STRICTE DES DOUBLONS
// -------------------------------------------------------------
const activeTeamKeys = computed(() => {
  return currentMode.value === 'carnage' ? ['team1', 'team2', 'team3'] : ['team1', 'team2'];
});

const characterTeamOwners = computed(() => {
  const owners = {};
  activeTeamKeys.value.forEach((teamKey, tIdx) => {
    const teamSlots = setup.value[teamKey] || [];
    teamSlots.forEach(s => {
      if (s?.character_id) {
        if (!owners[s.character_id]) owners[s.character_id] = [];
        owners[s.character_id].push(tIdx);
      }
    });
  });
  return owners;
});

const totalDuplicatesCount = computed(() => {
  let dups = 0;
  activeTeamKeys.value.forEach((teamKey, tIdx) => {
    const slots = setup.value[teamKey] || [];
    slots.forEach(s => {
      if (s?.character_id) {
        const ow = characterTeamOwners.value[s.character_id] || [];
        if (ow[0] < tIdx) {
          dups++;
        }
      }
    });
  });
  return dups;
});

function getOtherTeamAssignment(charId, currentTeamKey) {
  const currentTeamIdx = activeTeamKeys.value.indexOf(currentTeamKey);
  const ow = characterTeamOwners.value[charId] || [];
  const otherIdx = ow.find(idx => idx !== currentTeamIdx);
  if (otherIdx !== undefined) {
    return otherIdx + 1; // 1-indexed (Team 1, 2, 3)
  }
  return null;
}

// -------------------------------------------------------------
// SÉLECTION INTERACTIVE DE PERSONNAGES (SANS SELECT)
// -------------------------------------------------------------
function selectSlot(teamKey, index) {
  activeSlot.value = { teamKey, slotIndex: index };
}

function clearSlot(teamKey, index) {
  setup.value[teamKey][index] = null;
  if (inspectedSlot.value?.teamKey === teamKey && inspectedSlot.value?.slotIndex === index) {
    inspectedSlot.value = null;
  }
  handleAutoSave();
}

function openBuildPickerEndgame(teamKey, index) {
  const slot = setup.value[teamKey][index];
  if (!slot?.character_id) return;
  activeBuildPicker.value = {
    teamKey,
    slotIndex: index,
    character: charactersMap.value[slot.character_id],
    currentLoadoutId: slot.loadout_id
  };
}

function applyBuildForSlot(buildId) {
  if (!activeBuildPicker.value) return;
  const { teamKey, slotIndex } = activeBuildPicker.value;
  setup.value[teamKey][slotIndex].loadout_id = buildId;
  activeBuildPicker.value = null;
  handleAutoSave();
}

function toggleInspectSlot(teamKey, index) {
  const slot = setup.value[teamKey][index];
  if (!slot?.character_id) return;
  if (inspectedSlot.value && inspectedSlot.value.teamKey === teamKey && inspectedSlot.value.slotIndex === index) {
    inspectedSlot.value = null; // Recliquer masque le volet
  } else {
    inspectedSlot.value = {
      teamKey,
      slotIndex: index,
      character: charactersMap.value[slot.character_id],
      loadout: loadoutsMap.value[slot.loadout_id] || null
    };
  }
}

function pickCharacterFromRoster(char) {
  const rawId = Number(char.id.replace('avatar_', ''));
  const { teamKey, slotIndex } = activeSlot.value;

  if (setup.value[teamKey][slotIndex]?.character_id === rawId) {
    clearSlot(teamKey, slotIndex);
    return;
  }

  const otherTeamNum = getOtherTeamAssignment(rawId, teamKey);
  if (otherTeamNum) {
    return;
  }

  const builds = getLoadoutsForCharacter(rawId);
  setup.value[teamKey][slotIndex] = {
    character_id: rawId,
    loadout_id: builds[0]?.id || null
  };

  handleAutoSave();

  const nextEmpty = setup.value[teamKey].findIndex(s => !s);
  if (nextEmpty >= 0) {
    activeSlot.value = { teamKey, slotIndex: nextEmpty };
  }
}

function swapTeams12() {
  const t1 = setup.value.team1.slice();
  setup.value.team1 = setup.value.team2.slice();
  setup.value.team2 = t1;
  handleAutoSave();
}

function clearEntireTeam(teamKey) {
  setup.value[teamKey] = [null, null, null, null];
  if (inspectedSlot.value?.teamKey === teamKey) {
    inspectedSlot.value = null;
  }
  handleAutoSave();
}

function openPresetModal(teamKey) {
  importTargetTeamKey.value = teamKey;
  showImportModal.value = true;
}

function applyPreset(preset) {
  if (!preset || !importTargetTeamKey.value) return;
  const newSlots = [1, 2, 3, 4].map(s => {
    const cid = preset[`slot${s}_character_id`];
    const lid = preset[`slot${s}_loadout_id`];
    return cid ? { character_id: cid, loadout_id: lid } : null;
  });
  setup.value[importTargetTeamKey.value] = newSlots;
  showImportModal.value = false;
  handleAutoSave();
}

function countPresetConflicts(preset, targetTeamKey) {
  let conflicts = 0;
  for (let s = 1; s <= 4; s++) {
    const charId = preset[`slot${s}_character_id`];
    if (charId && getOtherTeamAssignment(charId, targetTeamKey)) {
      conflicts++;
    }
  }
  return conflicts;
}

async function handleAutoSave() {
  try {
    await saveEndgame(currentMode.value, setup.value);
  } catch (err) {
    console.error('Erreur sauvegarde automatique:', err);
  }
}

async function handleManualSave() {
  saving.value = true;
  saveSuccess.value = false;
  try {
    await saveEndgame(currentMode.value, setup.value);
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (err) {
    console.error('Erreur sauvegarde:', err);
  } finally {
    saving.value = false;
  }
}

const filteredRoster = computed(() => {
  return props.characters.filter(c => {
    if (rosterElementFilter.value === 'ALL') return true;
    const el = ELEMENT_LABELS[c.element] || c.element;
    return el === rosterElementFilter.value;
  });
});
</script>

<template>
  <div class="endgame-view">
    <!-- Barre Supérieure : Sélecteur de Mode + Actions + Badge Statut Doublon -->
    <div class="endgame-top-bar">
      <div class="top-controls-left">
        <!-- Onglets Modes de Jeu -->
        <div class="mode-tabs-wrap">
          <button
            type="button"
            :class="['mode-tab', { active: currentMode === 'abyss' }]"
            @click="currentMode = 'abyss'"
          >
            Profondeurs Spiralées
            <span class="mode-tab-sub">(2 Teams)</span>
          </button>
          <button
            type="button"
            :class="['mode-tab', { active: currentMode === 'carnage' }]"
            @click="currentMode = 'carnage'"
          >
            Carnage Chtonien
            <span class="mode-tab-sub">(3 Teams)</span>
          </button>
        </div>

        <!-- Bouton Échanger Team 1 et 2 en 1 clic -->
        <button
          v-if="currentMode === 'abyss'"
          type="button"
          class="btn-swap-teams"
          @click="swapTeams12"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />
          </svg>
          Échanger Team 1 et Team 2
        </button>
      </div>

      <!-- Statut de conformité des doublons -->
      <div class="status-badge-container">
        <div
          v-if="totalDuplicatesCount === 0"
          class="status-pill status-valid"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span>Composition valide · aucun doublon</span>
        </div>

        <div
          v-else
          class="status-pill status-conflict"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4 2.5 20h19L12 4zM12 10v4.5M12 17.5v.5" />
          </svg>
          <span>{{ totalDuplicatesCount }} doublon{{ totalDuplicatesCount > 1 ? 's' : '' }} à remplacer</span>
        </div>

        <button
          type="button"
          class="btn-save-endgame"
          :disabled="saving"
          @click="handleManualSave"
        >
          {{ saveSuccess ? '✓ Enregistré !' : (saving ? 'Sauvegarde...' : '💾 Sauvegarder') }}
        </button>
      </div>
    </div>

    <!-- Bannière Officielle Période, Étage 11/12 & Anomalies Yatta -->
    <div class="period-banner">
      <div class="banner-col period-col">
        <span class="banner-kicker">Période</span>
        <h3 class="banner-heading">{{ currentMode === 'abyss' ? `Abysses — Étage ${selectedFloor}` : 'Carnage Chtonien' }}</h3>
        
        <!-- Sélecteur Étage 11 / Étage 12 dans les Abysses (Demande utilisateur) -->
        <div v-if="currentMode === 'abyss'" class="floor-selector-wrap">
          <button
            type="button"
            :class="['floor-pill-btn', { active: selectedFloor === 11 }]"
            @click="selectedFloor = 11"
          >
            Étage 11
          </button>
          <button
            type="button"
            :class="['floor-pill-btn', { active: selectedFloor === 12 }]"
            @click="selectedFloor = 12"
          >
            Étage 12
          </button>
        </div>

        <span class="banner-sub">Rotation officielle Yatta</span>
      </div>

      <div class="banner-col">
        <span class="banner-kicker text-mint">Bénédictions de la Lune</span>
        <p class="banner-desc">
          {{ currentMode === 'abyss' ? (currentFloorData?.blessing?.description || 'Les réactions élémentaires génèrent des ondes de choc infligeant des DGT réels aux cibles proches.') : 'Bonus d\'adaptation et amplifications selon les phases I, II et III.' }}
        </p>
      </div>

      <div class="banner-col">
        <span class="banner-kicker text-gold">Anomalies énergétiques (Étage {{ selectedFloor }})</span>
        <div v-if="currentFloorDisorders.length > 0" class="disorders-list">
          <p v-for="(disorder, dIdx) in currentFloorDisorders" :key="dIdx" class="banner-desc disorder-item">
            • {{ disorder }}
          </p>
        </div>
        <p v-else class="banner-desc">
          {{ currentMode === 'abyss' ? (selectedFloor === 11 ? 'Bonus DGT Pyro & Hydro +60% sur tout l\'étage.' : 'Aucune anomalie globale — adaptation de résistance élémentaire selon les vagues.') : 'Phase I, II et III avec adaptation de résistance élémentaire.' }}
        </p>
      </div>
    </div>

    <!-- Disposition Équipes + Volet d'Inspection Escamotable -->
    <div class="endgame-main-layout">
      <div class="endgame-columns-area">
        <!-- Colonnes des Équipes (2 colonnes pour Abysses, 3 pour Carnage) -->
        <div :class="['teams-columns-grid', { 'three-columns': currentMode === 'carnage' }]">
          <section
            v-for="(teamKey, tIdx) in activeTeamKeys"
            :key="teamKey"
            class="team-column-card"
          >
            <div class="column-header">
              <div>
                <h3 class="column-title">
                  {{ teamKey === 'team1' ? 'Team 1 (1re moitié)' : (teamKey === 'team2' ? 'Team 2 (2e moitié)' : 'Team 3 (Boss 3)') }}
                </h3>
                <span class="column-count">
                  {{ setup[teamKey].filter(Boolean).length }}/4 personnages
                </span>
              </div>

              <div class="column-actions">
                <button
                  type="button"
                  class="btn-col-action"
                  title="Vider cette équipe"
                  :disabled="!setup[teamKey].some(Boolean)"
                  @click="clearEntireTeam(teamKey)"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- 4 Slots de personnages cliquables (SANS SELECT) avec Arme & Artéfacts -->
            <div class="slots-grid">
              <div
                v-for="(slot, sIdx) in setup[teamKey]"
                :key="sIdx"
                class="slot-wrapper"
              >
                <div
                  :class="[
                    'slot-card',
                    {
                      active: activeSlot.teamKey === teamKey && activeSlot.slotIndex === sIdx,
                      duplicate: slot && characterTeamOwners[slot.character_id]?.[0] < tIdx,
                      inspected: inspectedSlot && inspectedSlot.teamKey === teamKey && inspectedSlot.slotIndex === sIdx
                    }
                  ]"
                  @click="selectSlot(teamKey, sIdx)"
                >
                  <!-- Slot avec personnage -->
                  <template v-if="slot && charactersMap[slot.character_id]">
                    <div
                      class="slot-avatar-ring"
                      :style="{
                        borderColor: ELEMENT_COLORS[charactersMap[slot.character_id].element],
                        boxShadow: `0 0 14px ${ELEMENT_COLORS[charactersMap[slot.character_id].element]}40`
                      }"
                    >
                      <img
                        :src="getIconUrl(charactersMap[slot.character_id].icon)"
                        :alt="charactersMap[slot.character_id].name"
                        class="avatar-img"
                      />
                    </div>

                    <span class="slot-name-text">
                      {{ charactersMap[slot.character_id].name }}
                    </span>

                    <!-- Vignettes d'arme et de set d'artéfacts -->
                    <div class="slot-gear-chips" v-if="slot.loadout_id && loadoutsMap[slot.loadout_id]">
                      <!-- Arme -->
                      <div
                        v-if="weaponsMap[loadoutsMap[slot.loadout_id].weapon_id]"
                        class="mini-gear-chip"
                        :title="`${weaponsMap[loadoutsMap[slot.loadout_id].weapon_id].name} (R${loadoutsMap[slot.loadout_id].weapon_refinement || 1})`"
                      >
                        <img :src="getIconUrl(weaponsMap[loadoutsMap[slot.loadout_id].weapon_id].icon)" class="mini-gear-img" />
                        <span class="mini-gear-text">R{{ loadoutsMap[slot.loadout_id].weapon_refinement || 1 }}</span>
                      </div>

                      <!-- Artéfact Set -->
                      <div
                        v-if="relicsMap[loadoutsMap[slot.loadout_id].artifact_set_1_id]"
                        class="mini-gear-chip"
                        :title="relicsMap[loadoutsMap[slot.loadout_id].artifact_set_1_id].name"
                      >
                        <img :src="getIconUrl(relicsMap[loadoutsMap[slot.loadout_id].artifact_set_1_id].icon)" class="mini-gear-img" />
                        <span class="mini-gear-text">{{ loadoutsMap[slot.loadout_id].artifact_set_2_id ? '2p' : '4p' }}</span>
                      </div>
                    </div>

                    <!-- Bouton Inspecter le build (Ouvre le volet de détail) -->
                    <button
                      type="button"
                      class="btn-inspect-slot"
                      title="Afficher/masquer les détails du loadout"
                      @click.stop="toggleInspectSlot(teamKey, sIdx)"
                    >
                      👁️ Détails
                    </button>

                    <!-- Avertissement de doublon visuel -->
                    <span
                      v-if="characterTeamOwners[slot.character_id]?.[0] < tIdx"
                      class="duplicate-warn-tag"
                    >
                      Déjà en Team {{ characterTeamOwners[slot.character_id][0] + 1 }}
                    </span>
                  </template>

                  <!-- Slot vide -->
                  <template v-else>
                    <div class="slot-empty-circle">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                    <span class="slot-empty-text">Slot vide</span>
                  </template>
                </div>

                <!-- Bouton Loadout (Ouvre la modale de sélection de build) -->
                <button
                  type="button"
                  class="slot-lo-btn"
                  :disabled="!slot"
                  :title="slot ? 'Changer de build via modale' : ''"
                  @click="openBuildPickerEndgame(teamKey, sIdx)"
                >
                  <span class="lo-btn-text">{{ (slot && loadoutsMap[slot.loadout_id]?.name) || 'Build 1' }}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Bouton Importer une team préconfigurée (ouvre une vraie modale) -->
            <button
              type="button"
              class="btn-open-import"
              @click="openPresetModal(teamKey)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
              </svg>
              Importer une team préconfigurée
            </button>
          </section>
        </div>

        <!-- Grille de sélection de personnages (Roster Remplaçant Tous les Select) -->
        <div class="roster-selection-panel">
          <div class="roster-panel-header">
            <div>
              <h3 class="roster-panel-title">Sélection du Personnage</h3>
              <span class="roster-hint">
                Emplacement actif : <strong>{{ activeSlot.teamKey === 'team1' ? 'Team 1' : (activeSlot.teamKey === 'team2' ? 'Team 2' : 'Team 3') }}, Slot {{ activeSlot.slotIndex + 1 }}</strong> · Cliquez pour assigner. Les persos déjà pris dans une autre équipe sont verrouillés.
              </span>
            </div>

            <!-- Filtres éléments officiels Yatta -->
            <div class="roster-filters">
              <button
                v-for="el in ['ALL', 'Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo']"
                :key="el"
                type="button"
                :class="['roster-filter-chip', { active: rosterElementFilter === el }]"
                @click="rosterElementFilter = el"
              >
                <img
                  v-if="el !== 'ALL'"
                  :src="getElementIconUrl(el)"
                  class="filter-chip-img"
                />
                <span>{{ el === 'ALL' ? 'Tous' : (ELEMENT_LABELS[el] || el) }}</span>
              </button>
            </div>
          </div>

          <div class="roster-grid">
            <button
              v-for="char in filteredRoster"
              :key="char.id"
              type="button"
              :class="[
                'roster-card',
                {
                  assigned: characterTeamOwners[Number(char.id.replace('avatar_', ''))]?.length > 0,
                  locked: getOtherTeamAssignment(Number(char.id.replace('avatar_', '')), activeSlot.teamKey)
                }
              ]"
              :disabled="Boolean(getOtherTeamAssignment(Number(char.id.replace('avatar_', '')), activeSlot.teamKey))"
              @click="pickCharacterFromRoster(char)"
            >
              <div
                class="roster-avatar-wrap"
                :style="{
                  borderColor: ELEMENT_COLORS[char.element] || '#7CF0D0',
                  boxShadow: `0 0 10px ${ELEMENT_COLORS[char.element]}30`
                }"
              >
                <img
                  :src="getIconUrl(char.icon)"
                  :alt="char.name"
                  class="avatar-img"
                  loading="lazy"
                />
              </div>

              <span class="roster-name">{{ char.name }}</span>

              <!-- Badge d'assignation ou de blocage -->
              <span
                v-if="getOtherTeamAssignment(Number(char.id.replace('avatar_', '')), activeSlot.teamKey)"
                class="roster-badge badge-locked"
              >
                T{{ getOtherTeamAssignment(Number(char.id.replace('avatar_', '')), activeSlot.teamKey) }}
              </span>

              <span
                v-else-if="characterTeamOwners[Number(char.id.replace('avatar_', ''))]?.length > 0"
                class="roster-badge badge-assigned"
              >
                T{{ characterTeamOwners[Number(char.id.replace('avatar_', ''))][0] + 1 }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- VOLET D'INSPECTION ESCAMOTABLE DU LOADOUT (DEMANDE UTILISATEUR) -->
      <!-- ============================================================= -->
      <aside v-if="inspectedSlot" class="inspected-loadout-drawer">
        <div class="drawer-top">
          <div class="drawer-char-summary">
            <div
              class="drawer-char-ring"
              :style="{ borderColor: ELEMENT_COLORS[inspectedSlot.character.element] }"
            >
              <img :src="getIconUrl(inspectedSlot.character.icon)" class="avatar-img" />
            </div>
            <div>
              <h3 class="drawer-char-name">{{ inspectedSlot.character.name }}</h3>
              <span class="drawer-char-sub">
                {{ inspectedSlot.teamKey === 'team1' ? 'Team 1' : (inspectedSlot.teamKey === 'team2' ? 'Team 2' : 'Team 3') }} · Slot {{ inspectedSlot.slotIndex + 1 }}
              </span>
            </div>
          </div>

          <button type="button" class="btn-close-drawer" @click="inspectedSlot = null">✕</button>
        </div>

        <div v-if="inspectedSlot.loadout" class="drawer-content">
          <div class="drawer-section">
            <span class="section-label">NOM DU BUILD</span>
            <div class="drawer-pill-highlight">
              <strong>{{ inspectedSlot.loadout.name }}</strong>
            </div>
          </div>

          <!-- Détail Arme -->
          <div class="drawer-section">
            <span class="section-label">ARME ÉQUIPÉE</span>
            <div v-if="weaponsMap[inspectedSlot.loadout.weapon_id]" class="drawer-equipment-card">
              <img :src="getIconUrl(weaponsMap[inspectedSlot.loadout.weapon_id].icon)" class="drawer-equip-img" />
              <div class="drawer-equip-text">
                <span class="drawer-equip-name">{{ weaponsMap[inspectedSlot.loadout.weapon_id].name }}</span>
                <span class="drawer-equip-sub">Raffinement R{{ inspectedSlot.loadout.weapon_refinement || 1 }}</span>
              </div>
            </div>
            <span v-else class="text-dim-hint">Aucune arme assignée</span>
          </div>

          <!-- Détail Artéfacts -->
          <div class="drawer-section">
            <span class="section-label">SETS D'ARTÉFACTS</span>
            <div class="drawer-relics-list">
              <div v-if="relicsMap[inspectedSlot.loadout.artifact_set_1_id]" class="drawer-equipment-card">
                <img :src="getIconUrl(relicsMap[inspectedSlot.loadout.artifact_set_1_id].icon)" class="drawer-equip-img" />
                <div class="drawer-equip-text">
                  <span class="drawer-equip-name">{{ relicsMap[inspectedSlot.loadout.artifact_set_1_id].name }}</span>
                  <span class="drawer-equip-sub">{{ inspectedSlot.loadout.artifact_set_2_id ? 'Bonus 2 pièces' : 'Bonus 4 pièces' }}</span>
                </div>
              </div>

              <div v-if="inspectedSlot.loadout.artifact_set_2_id && relicsMap[inspectedSlot.loadout.artifact_set_2_id]" class="drawer-equipment-card">
                <img :src="getIconUrl(relicsMap[inspectedSlot.loadout.artifact_set_2_id].icon)" class="drawer-equip-img" />
                <div class="drawer-equip-text">
                  <span class="drawer-equip-name">{{ relicsMap[inspectedSlot.loadout.artifact_set_2_id].name }}</span>
                  <span class="drawer-equip-sub">Bonus 2 pièces</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats Principales -->
          <div v-if="inspectedSlot.loadout.main_stats" class="drawer-section">
            <span class="section-label">STATISTIQUES PRINCIPALES</span>
            <div class="stats-preview-box">
              <span class="stats-line">{{ inspectedSlot.loadout.main_stats }}</span>
            </div>
          </div>

          <!-- Notes de build -->
          <div v-if="inspectedSlot.loadout.notes" class="drawer-section">
            <span class="section-label">NOTES</span>
            <p class="drawer-notes-p">{{ inspectedSlot.loadout.notes }}</p>
          </div>
        </div>

        <div v-else class="drawer-empty-notice">
          <p>Aucun build personnalisé associé à ce personnage.</p>
        </div>
      </aside>
    </div>

    <!-- ============================================================= -->
    <!-- MODALE IMPORTER UNE TEAM PRÉCONFIGURÉE (DEMANDE UTILISATEUR) -->
    <!-- ============================================================= -->
    <div
      v-if="showImportModal"
      class="modal-backdrop"
      @click.self="showImportModal = false"
    >
      <div class="import-modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">
              Importer une team dans {{ importTargetTeamKey === 'team1' ? 'Team 1 (1re moitié)' : (importTargetTeamKey === 'team2' ? 'Team 2 (2e moitié)' : 'Team 3 (Boss 3)') }}
            </h3>
            <span class="modal-sub">Sélectionnez une composition enregistrée parmi vos presets</span>
          </div>

          <button type="button" class="btn-close-modal" @click="showImportModal = false">✕</button>
        </div>

        <div class="presets-modal-list">
          <div
            v-for="preset in teams"
            :key="preset.id"
            class="preset-card-item"
            @click="applyPreset(preset)"
          >
            <div class="preset-card-left">
              <div class="preset-name-row">
                <span class="preset-card-name">{{ preset.name }}</span>
                <span
                  :class="['conflict-pill', {
                    'ok': countPresetConflicts(preset, importTargetTeamKey) === 0,
                    'conflict': countPresetConflicts(preset, importTargetTeamKey) > 0
                  }]"
                >
                  {{ countPresetConflicts(preset, importTargetTeamKey) === 0 ? '✓ Aucun doublon' : `⚠️ ${countPresetConflicts(preset, importTargetTeamKey)} doublon(s)` }}
                </span>
              </div>

              <!-- 4 Avatars des persos de la team -->
              <div class="preset-avatars-row">
                <div
                  v-for="s in [1, 2, 3, 4]"
                  :key="s"
                  class="preset-avatar-circle"
                  :style="{
                    borderColor: preset[`slot${s}_character_id`] ? ELEMENT_COLORS[charactersMap[preset[`slot${s}_character_id`]]?.element] : '#2A3040'
                  }"
                >
                  <img
                    v-if="preset[`slot${s}_character_id`] && charactersMap[preset[`slot${s}_character_id`]]"
                    :src="getIconUrl(charactersMap[preset[`slot${s}_character_id`]].icon)"
                    class="avatar-img"
                  />
                  <span v-else class="empty-dot">•</span>
                </div>
              </div>
            </div>

            <button type="button" class="btn-import-action">
              Importer
            </button>
          </div>

          <div v-if="teams.length === 0" class="empty-modal-notice">
            <p>Aucune équipe n'est encore configurée dans vos presets.</p>
            <span>Rendez-vous dans l'onglet <strong>Presets de Teams</strong> pour composer vos premières équipes.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODALE SÉLECTION DE BUILD DANS ENDGAME -->
    <!-- ============================================================= -->
    <div
      v-if="activeBuildPicker"
      class="modal-backdrop"
      @click.self="activeBuildPicker = null"
    >
      <div class="build-picker-card">
        <div class="picker-header">
          <div class="picker-char-summary">
            <div
              class="picker-char-ring"
              :style="{ borderColor: ELEMENT_COLORS[activeBuildPicker.character?.element] }"
            >
              <img :src="getIconUrl(activeBuildPicker.character?.icon)" class="avatar-img" />
            </div>
            <div>
              <h3 class="picker-title">Changer le build de {{ activeBuildPicker.character?.name }}</h3>
              <span class="picker-sub">Pour ce slot de {{ activeBuildPicker.teamKey === 'team1' ? 'Team 1' : 'Team 2' }}</span>
            </div>
          </div>

          <button type="button" class="btn-close-modal" @click="activeBuildPicker = null">✕</button>
        </div>

        <div class="picker-builds-list">
          <div
            v-for="b in getLoadoutsForCharacter(activeBuildPicker.character ? Number(activeBuildPicker.character.id.replace('avatar_', '')) : 0)"
            :key="b.id"
            :class="['build-option-card', { active: activeBuildPicker.currentLoadoutId === b.id }]"
            @click="applyBuildForSlot(b.id)"
          >
            <div class="build-option-top">
              <span class="build-option-name">{{ b.name }}</span>
              <button type="button" class="btn-apply-build">
                {{ activeBuildPicker.currentLoadoutId === b.id ? '✓ Actif' : 'Sélectionner' }}
              </button>
            </div>

            <div class="build-gear-row">
              <div v-if="weaponsMap[b.weapon_id]" class="gear-detail-pill">
                <img :src="getIconUrl(weaponsMap[b.weapon_id].icon)" class="gear-detail-img" />
                <div class="gear-detail-info">
                  <span class="gear-title">{{ weaponsMap[b.weapon_id].name }}</span>
                  <span class="gear-meta">R{{ b.weapon_refinement || 1 }}</span>
                </div>
              </div>

              <div v-if="relicsMap[b.artifact_set_1_id]" class="gear-detail-pill">
                <img :src="getIconUrl(relicsMap[b.artifact_set_1_id].icon)" class="gear-detail-img" />
                <div class="gear-detail-info">
                  <span class="gear-title">{{ relicsMap[b.artifact_set_1_id].name }}</span>
                  <span class="gear-meta">{{ b.artifact_set_2_id ? '2p' : '4p' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="getLoadoutsForCharacter(activeBuildPicker.character ? Number(activeBuildPicker.character.id.replace('avatar_', '')) : 0).length === 0"
            class="empty-picker-notice"
          >
            <p>Aucun build alternatif pour ce personnage.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.endgame-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.endgame-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.top-controls-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mode-tabs-wrap {
  display: flex;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 3px;
}

.mode-tab {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mode-tab-sub {
  font-size: 0.72rem;
  opacity: 0.7;
}

.mode-tab.active {
  background: var(--bg-card);
  color: var(--accent-mint);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.btn-swap-teams {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-swap-teams:hover {
  color: var(--text-main);
  border-color: var(--border-accent);
}

.status-badge-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  border-radius: 9999px;
}

.status-valid {
  background: rgba(124, 240, 208, 0.12);
  color: var(--accent-mint);
  border: 1px solid rgba(124, 240, 208, 0.3);
}

.status-conflict {
  background: rgba(255, 90, 54, 0.15);
  color: #ff5a36;
  border: 1px solid rgba(255, 90, 54, 0.4);
}

.btn-save-endgame {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-save-endgame:hover {
  border-color: var(--accent-mint);
}

/* Bannière Période */
.period-banner {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  gap: 1.5rem;
  align-items: center;
}

.banner-col {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.banner-kicker {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.banner-heading {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.banner-sub {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.floor-selector-wrap {
  display: flex;
  gap: 0.4rem;
  margin: 0.2rem 0;
}

.floor-pill-btn {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.floor-pill-btn.active {
  background: #172425;
  color: var(--accent-mint);
  border-color: var(--accent-mint);
}

.banner-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.text-mint {
  color: var(--accent-mint);
}

.text-gold {
  color: var(--accent-gold);
}

/* Layout principal */
.endgame-main-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  position: relative;
}

.endgame-columns-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.teams-columns-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.teams-columns-grid.three-columns {
  grid-template-columns: repeat(3, 1fr);
}

.team-column-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
}

.column-count {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.btn-col-action {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 0.75rem;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
}

.slot-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slot-card {
  background: var(--bg-card);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  position: relative;
  text-align: center;
  transition: all 0.15s ease;
}

.slot-card:hover {
  border-color: #3F475D;
}

.slot-card.active {
  border-color: var(--accent-mint);
  box-shadow: 0 0 12px rgba(124, 240, 208, 0.25);
}

.slot-card.inspected {
  border-color: var(--accent-gold);
}

.slot-card.duplicate {
  border-color: #ff5a36;
  background: rgba(255, 90, 54, 0.08);
}

.slot-avatar-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  background: var(--bg-dark);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.slot-name-text {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.slot-gear-chips {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.mini-gear-chip {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mini-gear-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-gear-text {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.85);
  font-size: 0.5rem;
  font-weight: 800;
  color: var(--accent-mint);
  line-height: 1;
  padding: 0 1px;
}

.btn-inspect-slot {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 0.62rem;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-inspect-slot:hover {
  color: var(--accent-gold);
  border-color: var(--accent-gold);
}

.duplicate-warn-tag {
  font-size: 0.6rem;
  font-weight: 800;
  color: #ff5a36;
  background: rgba(255, 90, 54, 0.2);
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.slot-empty-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px dashed var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
}

.slot-empty-text {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.slot-lo-btn {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: 9999px;
  font-size: 0.68rem;
  color: var(--accent-mint);
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  max-width: 100%;
}

.lo-btn-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}

.btn-open-import {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.55rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-open-import:hover {
  color: var(--text-main);
  border-color: var(--accent-mint);
}

/* Panneau de sélection du Roster */
.roster-selection-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.roster-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.roster-panel-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
}

.roster-hint {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.roster-filters {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.roster-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  cursor: pointer;
}

.roster-filter-chip.active {
  border-color: var(--accent-mint);
  color: var(--accent-mint);
}

.filter-chip-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 0.6rem;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.roster-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.roster-card:hover:not(:disabled) {
  border-color: var(--accent-mint);
  transform: translateY(-2px);
}

.roster-card.locked {
  opacity: 0.35;
  filter: grayscale(0.85);
  cursor: not-allowed;
}

.roster-avatar-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid;
  overflow: hidden;
  background: var(--bg-dark);
}

.roster-name {
  font-size: 0.68rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 72px;
  text-align: center;
}

.roster-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  font-size: 0.58rem;
  font-weight: 800;
  padding: 1px 3px;
  border-radius: 3px;
  line-height: 1;
}

.badge-locked {
  background: rgba(255, 90, 54, 0.4);
  color: #ff5a36;
}

.badge-assigned {
  background: rgba(124, 240, 208, 0.3);
  color: var(--accent-mint);
}

/* ================= VOLET D'INSPECTION ESCAMOTABLE ================= */
.inspected-loadout-drawer {
  width: 320px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.drawer-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-char-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.drawer-char-ring {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
}

.drawer-char-name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
}

.drawer-char-sub {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.btn-close-drawer {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.section-label {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.drawer-pill-highlight {
  background: #172425;
  color: var(--accent-mint);
  border: 1px solid rgba(124, 240, 208, 0.3);
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.drawer-equipment-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
}

.drawer-equip-img {
  width: 34px;
  height: 34px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--bg-dark);
}

.drawer-equip-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-main);
}

.drawer-equip-sub {
  font-size: 0.68rem;
  color: var(--accent-mint);
}

.drawer-relics-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.stats-preview-box {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.7rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.drawer-notes-p {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.7rem;
}

/* ================= MODALE IMPORTER PRESET ================= */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.85);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.import-modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.modal-sub {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.presets-modal-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  max-height: 55vh;
}

.preset-card-item {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-card-item:hover {
  border-color: var(--accent-mint);
  transform: translateY(-2px);
}

.preset-card-left {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.preset-name-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.preset-card-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-main);
}

.conflict-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.conflict-pill.ok {
  background: rgba(124, 240, 208, 0.15);
  color: var(--accent-mint);
}

.conflict-pill.conflict {
  background: rgba(255, 90, 54, 0.15);
  color: #ff5a36;
}

.preset-avatars-row {
  display: flex;
  gap: 0.4rem;
}

.preset-avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid;
  overflow: hidden;
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-import-action {
  background: var(--accent-mint);
  color: #0B0D12;
  font-weight: 700;
  font-size: 0.8rem;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.empty-modal-notice {
  text-align: center;
  padding: 2rem;
  color: var(--text-dim);
}

@media (max-width: 900px) {
  .period-banner {
    grid-template-columns: 1fr;
  }
  .teams-columns-grid {
    grid-template-columns: 1fr;
  }
  .endgame-main-layout {
    flex-direction: column;
  }
  .inspected-loadout-drawer {
    width: 100%;
  }
}
</style>
