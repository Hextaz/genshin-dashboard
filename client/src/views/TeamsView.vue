<script setup>
import { ref, computed } from 'vue';
import {
  getIconUrl,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  getElementIconUrl,
  WEAPON_LABELS,
  WEAPON_SVGS,
  computeSynergies,
  createTeam,
  updateTeam,
  deleteTeam
} from '../api.js';

const props = defineProps({
  teams: {
    type: Array,
    default: () => []
  },
  characters: {
    type: Array,
    default: () => []
  },
  loadouts: {
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
  }
});

const emit = defineEmits(['refresh-teams']);

// Map des personnages par id numérique
const charactersMap = computed(() => {
  const map = {};
  for (const c of props.characters) {
    const rawId = Number(c.id.replace('avatar_', ''));
    map[rawId] = c;
  }
  return map;
});

// Map des loadouts par id
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

// 7 éléments pour le graphe heptagramme
const EL_ORDER = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];
const EL_POS = {
  Pyro: { x: 80, y: 24, ix: 72, iy: 16 },
  Hydro: { x: 124, y: 45, ix: 116, iy: 37 },
  Electro: { x: 135, y: 94, ix: 127, iy: 86 },
  Dendro: { x: 104, y: 132, ix: 96, iy: 124 },
  Cryo: { x: 56, y: 132, ix: 48, iy: 124 },
  Geo: { x: 25, y: 94, ix: 17, iy: 86 },
  Anemo: { x: 36, y: 45, ix: 28, iy: 37 }
};

// Données de synergie complètes d'une équipe
function getTeamSynergyData(teamSlots) {
  const elements = teamSlots
    .map(s => s?.character_id)
    .filter(Boolean)
    .map(id => {
      const el = charactersMap.value[id]?.element;
      return ELEMENT_LABELS[el] || el;
    });

  const syn = computeSynergies(elements);
  const activeSet = new Set(elements);

  // Lignes entre éléments actifs
  const activeArr = Array.from(activeSet);
  const lines = [];
  for (let i = 0; i < activeArr.length; i++) {
    for (let j = i + 1; j < activeArr.length; j++) {
      const e1 = activeArr[i];
      const e2 = activeArr[j];
      if (EL_POS[e1] && EL_POS[e2]) {
        lines.push({
          x1: EL_POS[e1].x,
          y1: EL_POS[e1].y,
          x2: EL_POS[e2].x,
          y2: EL_POS[e2].y,
          color: ELEMENT_COLORS[e1] || '#7CF0D0'
        });
      }
    }
  }

  const nodes = EL_ORDER.map(el => {
    const pos = EL_POS[el];
    const on = activeSet.has(el);
    return {
      name: el,
      x: pos.x,
      y: pos.y,
      ix: pos.ix,
      iy: pos.iy,
      icon: getElementIconUrl(el),
      active: on,
      color: ELEMENT_COLORS[el]
    };
  });

  return {
    ...syn,
    nodes,
    lines,
    headline: syn.reactions.map(r => r.name).slice(0, 3).join(' · ') || (elements.length ? 'Synergie équilibrée' : 'Équipe vide')
  };
}

// -------------------------------------------------------------
// MODALE DE SÉLECTION DU BUILD POUR UN PERSONNAGE D'UNE TEAM
// -------------------------------------------------------------
const activeBuildPicker = ref(null); // { team, slotNum, character, currentLoadoutId }

function openBuildPicker(team, slotNum) {
  const charId = team[`slot${slotNum}_character_id`];
  if (!charId) return;
  activeBuildPicker.value = {
    team,
    slotNum,
    character: charactersMap.value[charId],
    currentLoadoutId: team[`slot${slotNum}_loadout_id`]
  };
}

async function selectBuildForTeam(buildId) {
  if (!activeBuildPicker.value) return;
  const { team, slotNum } = activeBuildPicker.value;
  const payload = {
    name: team.name,
    description: team.description,
    slot1_character_id: team.slot1_character_id,
    slot1_loadout_id: slotNum === 1 ? buildId : team.slot1_loadout_id,
    slot2_character_id: team.slot2_character_id,
    slot2_loadout_id: slotNum === 2 ? buildId : team.slot2_loadout_id,
    slot3_character_id: team.slot3_character_id,
    slot3_loadout_id: slotNum === 3 ? buildId : team.slot3_loadout_id,
    slot4_character_id: team.slot4_character_id,
    slot4_loadout_id: slotNum === 4 ? buildId : team.slot4_loadout_id
  };

  try {
    await updateTeam(team.id, payload);
    emit('refresh-teams');
  } catch (err) {
    console.error('Erreur mise à jour build équipe:', err);
  } finally {
    activeBuildPicker.value = null;
  }
}

// -------------------------------------------------------------
// ÉDITEUR MODAL DE TEAM SANS AUCUN <SELECT>
// -------------------------------------------------------------
const showEditModal = ref(false);
const editingTeamId = ref(null);
const editorActiveSlot = ref(1); // 1, 2, 3 ou 4
const editorElementFilter = ref('ALL');

const editorForm = ref({
  name: 'Nouvelle Team',
  description: '',
  slots: [null, null, null, null] // [{ character_id, loadout_id }, ...]
});

function openNewTeamModal() {
  editingTeamId.value = null;
  editorActiveSlot.value = 1;
  editorElementFilter.value = 'ALL';
  editorForm.value = {
    name: 'Nouvelle Team',
    description: '',
    slots: [null, null, null, null]
  };
  showEditModal.value = true;
}

function openEditTeamModal(team) {
  editingTeamId.value = team.id;
  editorActiveSlot.value = 1;
  editorElementFilter.value = 'ALL';
  editorForm.value = {
    name: team.name,
    description: team.description || '',
    slots: [1, 2, 3, 4].map(s => {
      const cid = team[`slot${s}_character_id`];
      const lid = team[`slot${s}_loadout_id`];
      return cid ? { character_id: cid, loadout_id: lid } : null;
    })
  };
  showEditModal.value = true;
}

const editorSynergies = computed(() => {
  return getTeamSynergyData(editorForm.value.slots);
});

const editorFilteredCharacters = computed(() => {
  return props.characters.filter(c => {
    if (editorElementFilter.value === 'ALL') return true;
    const el = ELEMENT_LABELS[c.element] || c.element;
    return el === editorElementFilter.value;
  });
});

function pickCharacterForEditor(char) {
  const rawId = Number(char.id.replace('avatar_', ''));
  const currentSlotIndex = editorActiveSlot.value - 1;

  if (editorForm.value.slots[currentSlotIndex]?.character_id === rawId) {
    editorForm.value.slots[currentSlotIndex] = null;
    return;
  }

  const otherSlotIndex = editorForm.value.slots.findIndex(s => s?.character_id === rawId);
  if (otherSlotIndex >= 0) {
    editorForm.value.slots[otherSlotIndex] = null;
  }

  const builds = getLoadoutsForCharacter(rawId);
  editorForm.value.slots[currentSlotIndex] = {
    character_id: rawId,
    loadout_id: builds[0]?.id || null
  };

  const nextEmpty = editorForm.value.slots.findIndex(s => !s);
  if (nextEmpty >= 0) {
    editorActiveSlot.value = nextEmpty + 1;
  }
}

function clearEditorSlot(index) {
  editorForm.value.slots[index] = null;
}

async function saveEditorTeam() {
  const payload = {
    name: editorForm.value.name.trim() || 'Team sans nom',
    description: editorForm.value.description,
    slot1_character_id: editorForm.value.slots[0]?.character_id || null,
    slot1_loadout_id: editorForm.value.slots[0]?.loadout_id || null,
    slot2_character_id: editorForm.value.slots[1]?.character_id || null,
    slot2_loadout_id: editorForm.value.slots[1]?.loadout_id || null,
    slot3_character_id: editorForm.value.slots[2]?.character_id || null,
    slot3_loadout_id: editorForm.value.slots[2]?.loadout_id || null,
    slot4_character_id: editorForm.value.slots[3]?.character_id || null,
    slot4_loadout_id: editorForm.value.slots[3]?.loadout_id || null
  };

  if (editingTeamId.value) {
    await updateTeam(editingTeamId.value, payload);
  } else {
    await createTeam(payload);
  }

  showEditModal.value = false;
  emit('refresh-teams');
}

async function deleteEditorTeam() {
  if (!editingTeamId.value) return;
  await deleteTeam(editingTeamId.value);
  showEditModal.value = false;
  emit('refresh-teams');
}
</script>

<template>
  <div class="teams-view">
    <!-- En-tête avec bouton Créer une team -->
    <div class="teams-header-bar">
      <div>
        <span class="sub-kicker">VUE 2 · COMPOSITIONS</span>
        <h2 class="view-main-title">Presets de Teams</h2>
        <p class="view-main-desc">Vos équipes enregistrées, leurs armes, sets d'artéfacts et synergie élémentaire active.</p>
      </div>

      <button type="button" class="btn-create-team" @click="openNewTeamModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Créer une team
      </button>
    </div>

    <!-- Liste des Teams -->
    <div class="teams-list">
      <article
        v-for="team in teams"
        :key="team.id"
        class="team-card"
      >
        <!-- Section Gauche : Infos Team + 4 Slots avec Avatars, Armes & Artéfacts -->
        <div class="team-left-section">
          <div class="team-title-row">
            <div class="team-title-wrap">
              <h3 class="team-name">{{ team.name }}</h3>
              <span class="team-synergy-headline">
                {{ getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).headline }}
              </span>
            </div>

            <button type="button" class="btn-edit-team" @click="openEditTeamModal(team)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
              </svg>
              Modifier
            </button>
          </div>

          <!-- 4 Slots Personnages avec Équipements complets -->
          <div class="team-slots-grid">
            <div
              v-for="s in [1, 2, 3, 4]"
              :key="s"
              class="team-slot-card"
            >
              <!-- Slot Rempli -->
              <template v-if="team[`slot${s}_character_id`] && charactersMap[team[`slot${s}_character_id`]]">
                <!-- Avatar du personnage cliquable pour changer de build -->
                <div class="slot-avatar-container" @click="openBuildPicker(team, s)" title="Cliquer pour changer de build">
                  <div
                    class="avatar-circle-ring"
                    :style="{
                      borderColor: ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element],
                      boxShadow: `0 0 16px ${ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element]}40`
                    }"
                  >
                    <img
                      :src="getIconUrl(charactersMap[team[`slot${s}_character_id`]].icon)"
                      :alt="charactersMap[team[`slot${s}_character_id`]].name"
                      class="avatar-img"
                    />
                  </div>

                  <!-- Insigne de l'élément officiel -->
                  <div class="slot-mini-el" :style="{ borderColor: ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element] }">
                    <img :src="getElementIconUrl(charactersMap[team[`slot${s}_character_id`]].element)" class="slot-mini-el-img" />
                  </div>
                </div>

                <span class="slot-char-name">
                  {{ charactersMap[team[`slot${s}_character_id`]].name }}
                </span>

                <!-- Vignettes d'équipements : Arme + Set d'artéfacts -->
                <div class="slot-gear-preview" v-if="team[`slot${s}_loadout_id`] && loadoutsMap[team[`slot${s}_loadout_id`]]">
                  <!-- Arme -->
                  <div
                    v-if="weaponsMap[loadoutsMap[team[`slot${s}_loadout_id`]].weapon_id]"
                    class="gear-icon-chip"
                    :title="`${weaponsMap[loadoutsMap[team[`slot${s}_loadout_id`]].weapon_id].name} (R${loadoutsMap[team[`slot${s}_loadout_id`]].weapon_refinement || 1})`"
                  >
                    <img :src="getIconUrl(weaponsMap[loadoutsMap[team[`slot${s}_loadout_id`]].weapon_id].icon)" class="gear-img" />
                    <span class="gear-sub-tag">R{{ loadoutsMap[team[`slot${s}_loadout_id`]].weapon_refinement || 1 }}</span>
                  </div>

                  <!-- Artéfact Set 1 -->
                  <div
                    v-if="relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_1_id]"
                    class="gear-icon-chip"
                    :title="`${relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_1_id].name}`"
                  >
                    <img :src="getIconUrl(relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_1_id].icon)" class="gear-img" />
                    <span class="gear-sub-tag">{{ loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_2_id ? '2p' : '4p' }}</span>
                  </div>

                  <!-- Artéfact Set 2 (si 2+2) -->
                  <div
                    v-if="loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_2_id && relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_2_id]"
                    class="gear-icon-chip"
                    :title="`${relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_2_id].name}`"
                  >
                    <img :src="getIconUrl(relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_2_id].icon)" class="gear-img" />
                    <span class="gear-sub-tag">2p</span>
                  </div>
                </div>

                <!-- Bouton Nom du Build qui ouvre la modale de sélection de build -->
                <button
                  type="button"
                  class="slot-loadout-pill"
                  :style="{
                    color: ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element],
                    background: `${ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element]}15`,
                    borderColor: `${ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element]}40`
                  }"
                  title="Cliquer pour choisir un autre build"
                  @click="openBuildPicker(team, s)"
                >
                  <span class="pill-name-truncate">
                    {{ (team[`slot${s}_loadout_id`] && loadoutsMap[team[`slot${s}_loadout_id`]]?.name) || 'Choisir un build' }}
                  </span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </template>

              <!-- Slot Vide -->
              <template v-else>
                <div class="empty-slot-wrap" @click="openEditTeamModal(team)">
                  <div class="empty-circle-dashed">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <span class="empty-text">Slot vide</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- Section Droite : Roue de Synergies Heptagramme SVG -->
        <div class="team-synergies-section">
          <div class="synergy-wheel-area">
            <svg width="140" height="140" viewBox="0 0 160 160" class="heptagram-svg">
              <circle cx="80" cy="80" r="56" fill="none" stroke="#1F2430" stroke-width="1" />
              <!-- Lignes reliant les éléments actifs -->
              <line
                v-for="(ln, idx) in getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).lines"
                :key="idx"
                :x1="ln.x1"
                :y1="ln.y1"
                :x2="ln.x2"
                :y2="ln.y2"
                :stroke="ln.color"
                stroke-width="2"
                stroke-opacity="0.8"
                stroke-linecap="round"
              />
              <!-- 7 Nœuds des éléments -->
              <g
                v-for="nd in getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).nodes"
                :key="nd.name"
              >
                <circle
                  :cx="nd.x"
                  :cy="nd.y"
                  r="13"
                  :fill="nd.active ? `${nd.color}30` : '#141821'"
                  :stroke="nd.active ? nd.color : '#2A3040'"
                  :stroke-width="nd.active ? '2.5' : '1.2'"
                />
                <image
                  :x="nd.ix"
                  :y="nd.iy"
                  width="16"
                  height="16"
                  :href="nd.icon"
                  :opacity="nd.active ? 1 : 0.4"
                />
              </g>
            </svg>
            <span class="synergies-sub-label">Synergies</span>
          </div>

          <!-- Badges des Résonances & Réactions Actives -->
          <div class="synergies-badges-list">
            <div
              v-for="res in getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).resonances"
              :key="res.name"
              class="synergy-chip resonance-chip"
              :style="{ borderColor: res.color, color: res.color, background: `${res.color}15` }"
            >
              <span class="chip-type">RÉSONANCE</span>
              <span class="chip-name">{{ res.name }}</span>
            </div>

            <div
              v-for="rx in getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).reactions"
              :key="rx.name"
              class="synergy-chip reaction-chip"
              :style="{ borderColor: rx.color, color: rx.color, background: `${rx.color}12` }"
            >
              <span class="chip-type">RÉACTION</span>
              <span class="chip-name">{{ rx.name }}</span>
            </div>

            <div
              v-if="getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).resonances.length === 0 && getTeamSynergyData([1, 2, 3, 4].map(s => ({ character_id: team[`slot${s}_character_id`] }))).reactions.length === 0"
              class="no-synergy-hint"
            >
              Complétez l'équipe pour activer résonances et réactions.
            </div>
          </div>
        </div>
      </article>

      <div v-if="teams.length === 0" class="empty-teams-box">
        <p>Aucune équipe enregistrée. Cliquez sur « Créer une team » pour composer votre première composition.</p>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODALE DE SÉLECTION DU BUILD D'UN PERSONNAGE (DEMANDE UTILISATEUR) -->
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
              <img :src="getIconUrl(activeBuildPicker.character?.icon)" class="picker-char-img" />
            </div>
            <div>
              <h3 class="picker-title">Choisir un build pour {{ activeBuildPicker.character?.name }}</h3>
              <span class="picker-sub">Sélectionnez le loadout avec ses armes et artéfacts associés</span>
            </div>
          </div>

          <button type="button" class="btn-close-modal" @click="activeBuildPicker = null">✕</button>
        </div>

        <div class="picker-builds-list">
          <div
            v-for="b in getLoadoutsForCharacter(activeBuildPicker.character ? Number(activeBuildPicker.character.id.replace('avatar_', '')) : 0)"
            :key="b.id"
            :class="['build-option-card', { active: activeBuildPicker.currentLoadoutId === b.id }]"
            @click="selectBuildForTeam(b.id)"
          >
            <div class="build-option-top">
              <div class="build-option-name-wrap">
                <span class="build-option-name">{{ b.name }}</span>
                <span v-if="activeBuildPicker.currentLoadoutId === b.id" class="active-badge">✓ Actif</span>
              </div>

              <button type="button" class="btn-apply-build">
                {{ activeBuildPicker.currentLoadoutId === b.id ? 'Sélectionné' : 'Choisir ce build' }}
              </button>
            </div>

            <!-- Équipements de ce build avec vraies images -->
            <div class="build-gear-row">
              <!-- Arme -->
              <div v-if="weaponsMap[b.weapon_id]" class="gear-detail-pill">
                <img :src="getIconUrl(weaponsMap[b.weapon_id].icon)" class="gear-detail-img" />
                <div class="gear-detail-info">
                  <span class="gear-title">{{ weaponsMap[b.weapon_id].name }}</span>
                  <span class="gear-meta">Raffinement R{{ b.weapon_refinement || 1 }}</span>
                </div>
              </div>

              <!-- Artéfact Set 1 -->
              <div v-if="relicsMap[b.artifact_set_1_id]" class="gear-detail-pill">
                <img :src="getIconUrl(relicsMap[b.artifact_set_1_id].icon)" class="gear-detail-img" />
                <div class="gear-detail-info">
                  <span class="gear-title">{{ relicsMap[b.artifact_set_1_id].name }}</span>
                  <span class="gear-meta">{{ b.artifact_set_2_id ? 'Bonus 2 pièces' : 'Bonus 4 pièces' }}</span>
                </div>
              </div>

              <!-- Artéfact Set 2 (si 2+2) -->
              <div v-if="b.artifact_set_2_id && relicsMap[b.artifact_set_2_id]" class="gear-detail-pill">
                <img :src="getIconUrl(relicsMap[b.artifact_set_2_id].icon)" class="gear-detail-img" />
                <div class="gear-detail-info">
                  <span class="gear-title">{{ relicsMap[b.artifact_set_2_id].name }}</span>
                  <span class="gear-meta">Bonus 2 pièces</span>
                </div>
              </div>
            </div>

            <!-- Stats principales -->
            <div v-if="b.main_stats" class="build-stats-preview">
              <span>Stats : {{ b.main_stats }}</span>
            </div>
          </div>

          <div
            v-if="getLoadoutsForCharacter(activeBuildPicker.character ? Number(activeBuildPicker.character.id.replace('avatar_', '')) : 0).length === 0"
            class="empty-picker-notice"
          >
            <p>Aucun build n'est encore configuré pour {{ activeBuildPicker.character?.name }}.</p>
            <span>Rendez-vous dans l'onglet <strong>Personnages & Builds</strong> pour lui assigner une arme et des artéfacts.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- MODALE CRÉATION / MODIFICATION D'ÉQUIPE (ZÉRO SELECT) -->
    <!-- ============================================================= -->
    <div
      v-if="showEditModal"
      class="modal-backdrop"
      @click.self="showEditModal = false"
    >
      <div class="team-editor-card">
        <div class="editor-header">
          <h2 class="editor-title">{{ editingTeamId ? 'Modifier l\'équipe' : 'Créer une équipe' }}</h2>
          <button type="button" class="btn-close-modal" @click="showEditModal = false">✕</button>
        </div>

        <form @submit.prevent="saveEditorTeam">
          <div class="editor-field-row">
            <label class="form-label">
              <span>Nom de la team</span>
              <input
                v-model="editorForm.name"
                type="text"
                class="form-input"
                placeholder="ex: Raiden National, Freeze Ayaka, Neuvillette Hyper..."
                required
              />
            </label>
          </div>

          <!-- 4 Slots interactifs dans l'éditeur -->
          <div class="editor-slots-row">
            <div
              v-for="s in [1, 2, 3, 4]"
              :key="s"
              :class="['editor-slot-box', { active: editorActiveSlot === s }]"
              @click="editorActiveSlot = s"
            >
              <div class="slot-badge-num">{{ s }}</div>

              <template v-if="editorForm.slots[s - 1]?.character_id && charactersMap[editorForm.slots[s - 1].character_id]">
                <div
                  class="editor-slot-avatar"
                  :style="{ borderColor: ELEMENT_COLORS[charactersMap[editorForm.slots[s - 1].character_id].element] }"
                >
                  <img
                    :src="getIconUrl(charactersMap[editorForm.slots[s - 1].character_id].icon)"
                    class="avatar-img"
                  />
                </div>
                <span class="editor-slot-name">
                  {{ charactersMap[editorForm.slots[s - 1].character_id].name }}
                </span>
                <button
                  type="button"
                  class="btn-remove-slot"
                  title="Retirer"
                  @click.stop="clearEditorSlot(s - 1)"
                >
                  ✕
                </button>
              </template>

              <template v-else>
                <div class="editor-slot-empty">
                  <span>+ Choisir</span>
                </div>
                <span class="editor-slot-sub">Slot {{ s }}</span>
              </template>
            </div>
          </div>

          <!-- Grille de sélection des personnages sans aucun <select> -->
          <div class="editor-roster-section">
            <div class="editor-roster-header">
              <span class="roster-instruction">
                Cliquez pour assigner au <strong>Slot {{ editorActiveSlot }}</strong> :
              </span>

              <!-- Filtres Éléments -->
              <div class="roster-el-filters">
                <button
                  v-for="el in ['ALL', 'Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo']"
                  :key="el"
                  type="button"
                  :class="['roster-filter-btn', { active: editorElementFilter === el }]"
                  @click="editorElementFilter = el"
                >
                  {{ el === 'ALL' ? 'Tous' : (ELEMENT_LABELS[el] || el) }}
                </button>
              </div>
            </div>

            <div class="editor-roster-grid">
              <button
                v-for="char in editorFilteredCharacters"
                :key="char.id"
                type="button"
                :class="['roster-char-item', {
                  selected: editorForm.slots.some(s => s?.character_id === Number(char.id.replace('avatar_', '')))
                }]"
                @click="pickCharacterForEditor(char)"
              >
                <div
                  class="roster-char-ring"
                  :style="{ borderColor: ELEMENT_COLORS[char.element] }"
                >
                  <img :src="getIconUrl(char.icon)" class="avatar-img" />
                </div>
                <span class="roster-char-name">{{ char.name }}</span>
              </button>
            </div>
          </div>

          <!-- Actions de sauvegarde -->
          <div class="editor-bottom-actions">
            <button
              v-if="editingTeamId"
              type="button"
              class="btn-danger-link"
              @click="deleteEditorTeam"
            >
              Supprimer cette équipe
            </button>
            <div style="margin-left: auto; display: flex; gap: 0.75rem">
              <button type="button" class="btn-cancel" @click="showEditModal = false">Annuler</button>
              <button type="submit" class="btn-submit">Enregistrer l'équipe</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.teams-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.teams-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.sub-kicker {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent-mint);
  text-transform: uppercase;
}

.view-main-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-main);
  margin-top: 0.2rem;
}

.view-main-desc {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.btn-create-team {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent-mint);
  color: #0B0D12;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-create-team:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(124, 240, 208, 0.3);
}

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.team-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  gap: 2rem;
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.team-card:hover {
  border-color: #2F3648;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

.team-left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.team-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.team-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.team-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
}

.team-synergy-headline {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent-mint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-edit-team {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-edit-team:hover {
  color: var(--text-main);
  border-color: var(--border-accent);
}

.team-slots-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.team-slot-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 0.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  text-align: center;
}

.slot-avatar-container {
  position: relative;
  width: 56px;
  height: 56px;
  cursor: pointer;
}

.avatar-circle-ring {
  width: 56px;
  height: 56px;
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

.slot-mini-el {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-dark);
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-mini-el-img {
  width: 12px;
  height: 12px;
  object-fit: contain;
}

.slot-char-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Vignettes d'équipements */
.slot-gear-preview {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
}

.gear-icon-chip {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.gear-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gear-sub-tag {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  font-size: 0.55rem;
  font-weight: 800;
  padding: 0 2px;
  line-height: 1;
  color: var(--accent-mint);
  border-top-left-radius: 3px;
}

/* Pilule du build */
.slot-loadout-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  max-width: 100%;
  transition: all 0.2s ease;
}

.slot-loadout-pill:hover {
  transform: translateY(-1px);
  filter: brightness(1.15);
}

.pill-name-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

/* Slot Vide */
.empty-slot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  padding: 0.75rem 0;
}

.empty-circle-dashed {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 1.5px dashed var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
}

.empty-slot-wrap:hover .empty-circle-dashed {
  border-color: var(--accent-mint);
  color: var(--accent-mint);
}

.empty-text {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.section-divider {
  width: 1px;
  background: var(--border-subtle);
}

/* Section Synergies */
.team-synergies-section {
  width: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.synergy-wheel-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.synergies-sub-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
}

.synergies-badges-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.synergy-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid;
  font-size: 0.75rem;
}

.chip-type {
  font-size: 0.62rem;
  font-weight: 800;
  opacity: 0.8;
}

.chip-name {
  font-weight: 700;
}

.no-synergy-hint {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-align: center;
}

/* ================= MODALE SÉLECTION DE BUILD ================= */
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

.build-picker-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
}

.picker-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-char-summary {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.picker-char-ring {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  background: var(--bg-dark);
}

.picker-char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.picker-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
}

.picker-sub {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.4rem;
}

.picker-builds-list {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.build-option-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.build-option-card:hover {
  border-color: var(--accent-mint);
  transform: translateY(-2px);
}

.build-option-card.active {
  border-color: var(--accent-mint);
  box-shadow: 0 0 0 1px var(--accent-mint), 0 8px 20px rgba(0, 0, 0, 0.4);
}

.build-option-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.build-option-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-main);
}

.active-badge {
  margin-left: 0.5rem;
  background: #172425;
  color: var(--accent-mint);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-apply-build {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.build-gear-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.gear-detail-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.6rem;
}

.gear-detail-img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--bg-dark);
}

.gear-detail-info {
  display: flex;
  flex-direction: column;
}

.gear-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-main);
}

.gear-meta {
  font-size: 0.68rem;
  color: var(--accent-mint);
}

.build-stats-preview {
  font-size: 0.72rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.empty-picker-notice {
  text-align: center;
  padding: 2rem;
  color: var(--text-dim);
}

/* ================= MODALE ÉDITEUR D'ÉQUIPE ================= */
.team-editor-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.25rem;
  overflow-y: auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
}

.form-input {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  padding: 0.65rem 0.9rem;
  font-size: 0.9rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--accent-mint);
}

.editor-slots-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.editor-slot-box {
  background: var(--bg-dark);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.editor-slot-box.active {
  border-color: var(--accent-mint);
  box-shadow: 0 0 14px rgba(124, 240, 208, 0.25);
}

.slot-badge-num {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--text-dim);
}

.editor-slot-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
}

.editor-slot-name {
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.btn-remove-slot {
  background: rgba(255, 90, 54, 0.2);
  border: 1px solid rgba(255, 90, 54, 0.4);
  color: #ff5a36;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.editor-slot-empty {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px dashed var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: var(--accent-mint);
}

.editor-slot-sub {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.editor-roster-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.9rem;
}

.editor-roster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.roster-instruction {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.roster-el-filters {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.roster-filter-btn {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  cursor: pointer;
}

.roster-filter-btn.active {
  border-color: var(--accent-mint);
  color: var(--accent-mint);
}

.editor-roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 0.5rem;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.roster-char-item {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.roster-char-item:hover {
  background: var(--bg-surface);
  border-color: var(--border-accent);
}

.roster-char-item.selected {
  opacity: 0.4;
  filter: grayscale(0.8);
}

.roster-char-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid;
  overflow: hidden;
  background: var(--bg-dark);
}

.roster-char-name {
  font-size: 0.68rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 65px;
  text-align: center;
}

.editor-bottom-actions {
  display: flex;
  align-items: center;
  padding-top: 0.5rem;
}

.btn-danger-link {
  background: transparent;
  border: none;
  color: #ff5a36;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-cancel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 0.55rem 1.1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-submit {
  background: var(--accent-mint);
  color: #0B0D12;
  font-weight: 700;
  border: none;
  padding: 0.55rem 1.25rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

@media (max-width: 900px) {
  .team-card {
    flex-direction: column;
  }
  .section-divider {
    width: 100%;
    height: 1px;
  }
  .team-synergies-section {
    width: 100%;
  }
  .team-slots-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
