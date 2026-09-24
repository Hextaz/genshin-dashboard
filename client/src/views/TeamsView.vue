<script setup>
import { ref, computed } from 'vue';
import { getIconUrl, ELEMENT_COLORS, createTeam, updateTeam, deleteTeam } from '../api.js';

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

const showModal = ref(false);
const editingTeamId = ref(null);

const teamForm = ref({
  name: 'Nouvelle Équipe',
  description: '',
  slot1_character_id: null,
  slot1_loadout_id: null,
  slot2_character_id: null,
  slot2_loadout_id: null,
  slot3_character_id: null,
  slot3_loadout_id: null,
  slot4_character_id: null,
  slot4_loadout_id: null
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

// Map des armes et reliques
const weaponsMap = computed(() => {
  const map = {};
  for (const w of props.weapons) {
    const rawId = Number(w.id.replace('weapon_', ''));
    map[rawId] = w;
  }
  return map;
});

const relicsMap = computed(() => {
  const map = {};
  for (const r of props.reliquaries) {
    const rawId = Number(r.id.replace('relic_', ''));
    map[rawId] = r;
  }
  return map;
});

function getLoadoutsForCharacter(charId) {
  if (!charId) return [];
  return props.loadouts.filter(l => l.character_id === Number(charId));
}

function openNewTeamModal() {
  editingTeamId.value = null;
  teamForm.value = {
    name: 'Nouvelle Équipe',
    description: '',
    slot1_character_id: null,
    slot1_loadout_id: null,
    slot2_character_id: null,
    slot2_loadout_id: null,
    slot3_character_id: null,
    slot3_loadout_id: null,
    slot4_character_id: null,
    slot4_loadout_id: null
  };
  showModal.value = true;
}

function editTeam(t) {
  editingTeamId.value = t.id;
  teamForm.value = {
    name: t.name,
    description: t.description || '',
    slot1_character_id: t.slot1_character_id,
    slot1_loadout_id: t.slot1_loadout_id,
    slot2_character_id: t.slot2_character_id,
    slot2_loadout_id: t.slot2_loadout_id,
    slot3_character_id: t.slot3_character_id,
    slot3_loadout_id: t.slot3_loadout_id,
    slot4_character_id: t.slot4_character_id,
    slot4_loadout_id: t.slot4_loadout_id
  };
  showModal.value = true;
}

// Auto-sélectionner le 1er build si un perso est choisi
function onCharacterSelected(slotNum, charId) {
  if (!charId) {
    teamForm.value[`slot${slotNum}_loadout_id`] = null;
    return;
  }
  const builds = getLoadoutsForCharacter(charId);
  if (builds.length > 0) {
    teamForm.value[`slot${slotNum}_loadout_id`] = builds[0].id;
  } else {
    teamForm.value[`slot${slotNum}_loadout_id`] = null;
  }
}

async function saveTeam() {
  if (editingTeamId.value) {
    await updateTeam(editingTeamId.value, teamForm.value);
  } else {
    await createTeam(teamForm.value);
  }
  showModal.value = false;
  emit('refresh-teams');
}

async function removeTeam(id) {
  if (confirm('Voulez-vous supprimer cette équipe ?')) {
    await deleteTeam(id);
    emit('refresh-teams');
  }
}
</script>

<template>
  <div class="teams-view">
    <div class="header-actions">
      <div>
        <h2 class="section-heading">🛡️ Presets d'Équipes</h2>
        <p class="section-sub">Configurez vos compositions et associez précisément le build de chaque personnage.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="openNewTeamModal">
        + Créer une équipe
      </button>
    </div>

    <!-- Liste des Teams -->
    <div v-if="teams.length === 0" class="empty-state card">
      <p>Aucun preset d'équipe pour le moment. Cliquez sur "Créer une équipe" pour démarrer !</p>
    </div>

    <div class="teams-list">
      <div v-for="team in teams" :key="team.id" class="team-card card">
        <div class="team-header">
          <div>
            <h3 class="team-name">{{ team.name }}</h3>
            <p v-if="team.description" class="team-desc">{{ team.description }}</p>
          </div>
          <div class="team-actions">
            <button type="button" class="btn-sm btn-secondary" @click="editTeam(team)">✏️ Modifier</button>
            <button type="button" class="btn-sm btn-danger" @click="removeTeam(team.id)">🗑️</button>
          </div>
        </div>

        <!-- 4 Slots de persos -->
        <div class="slots-grid">
          <div
            v-for="s in [1, 2, 3, 4]"
            :key="s"
            class="slot-box"
          >
            <template v-if="team[`slot${s}_character_id`] && charactersMap[team[`slot${s}_character_id`]]">
              <div class="slot-avatar-wrap" :style="{ borderColor: ELEMENT_COLORS[charactersMap[team[`slot${s}_character_id`]].element] }">
                <img
                  :src="getIconUrl(charactersMap[team[`slot${s}_character_id`]].icon)"
                  :alt="charactersMap[team[`slot${s}_character_id`]].name"
                  class="slot-avatar"
                />
              </div>
              <span class="slot-char-name">{{ charactersMap[team[`slot${s}_character_id`]].name }}</span>
              
              <!-- Badge du Loadout actif -->
              <span v-if="team[`slot${s}_loadout_id`] && loadoutsMap[team[`slot${s}_loadout_id`]]" class="loadout-tag">
                🎯 {{ loadoutsMap[team[`slot${s}_loadout_id`]].name }}
              </span>
              <span v-else class="loadout-tag unassigned">
                Build par défaut
              </span>

              <!-- Détails arme & sets du build -->
              <div v-if="team[`slot${s}_loadout_id`] && loadoutsMap[team[`slot${s}_loadout_id`]]" class="slot-equip-preview">
                <span v-if="weaponsMap[loadoutsMap[team[`slot${s}_loadout_id`]].weapon_id]" class="equip-item" title="Arme équipée">
                  🗡️ {{ weaponsMap[loadoutsMap[team[`slot${s}_loadout_id`]].weapon_id].name }}
                  (R{{ loadoutsMap[team[`slot${s}_loadout_id`]].weapon_refinement }})
                </span>
                <span v-if="relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_1_id]" class="equip-item" title="Set d'artéfacts principal">
                  🏺 {{ relicsMap[loadoutsMap[team[`slot${s}_loadout_id`]].artifact_set_1_id].name }}
                </span>
              </div>
            </template>
            <div v-else class="empty-slot">
              <span class="empty-plus">+</span>
              <span class="empty-text">Slot {{ s }} libre</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'édition d'équipe -->
    <dialog v-if="showModal" open class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">{{ editingTeamId ? 'Modifier l\'équipe' : 'Créer une nouvelle équipe' }}</h2>
          <button type="button" class="btn-close" @click="showModal = false">✕</button>
        </div>

        <form class="team-form" @submit.prevent="saveTeam">
          <div class="form-row">
            <label class="form-group flex-1">
              <span class="label-text">Nom de la Team</span>
              <input v-model="teamForm.name" type="text" class="input-field" placeholder="ex: National Raiden, Freeze Ayaka..." required />
            </label>
            <label class="form-group flex-1">
              <span class="label-text">Description / Rotations</span>
              <input v-model="teamForm.description" type="text" class="input-field" placeholder="ex: Raiden E > Bennett Q > Xiangling Q..." />
            </label>
          </div>

          <!-- Configuration des 4 slots -->
          <div class="form-slots">
            <div v-for="s in [1, 2, 3, 4]" :key="s" class="slot-config-card card">
              <h4 class="slot-config-title">Slot {{ s }}</h4>
              
              <label class="form-group">
                <span class="label-text">Personnage</span>
                <select
                  v-model="teamForm[`slot${s}_character_id`]"
                  class="input-field select-field"
                  @change="onCharacterSelected(s, teamForm[`slot${s}_character_id`])"
                >
                  <option :value="null">-- Aucun --</option>
                  <option v-for="c in characters" :key="c.id" :value="Number(c.id.replace('avatar_', ''))">
                    {{ c.name }} ({{ c.element }})
                  </option>
                </select>
              </label>

              <label v-if="teamForm[`slot${s}_character_id`]" class="form-group">
                <span class="label-text">Build / Loadout associé</span>
                <select v-model="teamForm[`slot${s}_loadout_id`]" class="input-field select-field">
                  <option :value="null">-- Aucun / Standard --</option>
                  <option
                    v-for="l in getLoadoutsForCharacter(teamForm[`slot${s}_character_id`])"
                    :key="l.id"
                    :value="l.id"
                  >
                    {{ l.name }}
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Annuler</button>
            <button type="submit" class="btn btn-primary">💾 Sauvegarder l'équipe</button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.teams-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-actions {
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

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.team-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.team-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.team-name {
  font-size: 1.15rem;
  font-weight: 700;
}

.team-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.team-actions {
  display: flex;
  gap: 0.5rem;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.slot-box {
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.4rem;
}

.slot-avatar-wrap {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  border: 2px solid;
  overflow: hidden;
  background: #181d28;
}

.slot-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slot-char-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
}

.loadout-tag {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-anemo);
  background: rgba(51, 230, 184, 0.1);
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid rgba(51, 230, 184, 0.2);
}

.loadout-tag.unassigned {
  color: var(--text-dim);
  background: transparent;
  border-color: var(--border-subtle);
}

.slot-equip-preview {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.7rem;
  color: var(--text-dim);
  margin-top: 0.25rem;
  width: 100%;
}

.equip-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-slot {
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--text-dim);
  border: 1px dashed var(--border-subtle);
  width: 100%;
  border-radius: var(--radius-sm);
}

.empty-plus {
  font-size: 1.5rem;
  line-height: 1;
}

.empty-text {
  font-size: 0.75rem;
}

.modal-dialog {
  width: 760px;
}

.modal-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.slot-config-card {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.slot-config-title {
  font-size: 0.85rem;
  color: var(--color-hydro);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.input-field {
  padding: 0.5rem 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
}

.select-field {
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
}

.btn-sm {
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--text-dim);
}

@media (max-width: 768px) {
  .slots-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-slots {
    grid-template-columns: 1fr;
  }
}
</style>
