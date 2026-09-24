<script setup>
import { ref, computed, watch } from 'vue';
import { getIconUrl, ELEMENT_COLORS, ELEMENT_LABELS, WEAPON_LABELS, fetchLoadouts, createLoadout, updateLoadout, deleteLoadout } from '../api.js';

const props = defineProps({
  character: {
    type: Object,
    default: null
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

const emit = defineEmits(['close', 'loadouts-updated']);

const loadouts = ref([]);
const activeLoadoutId = ref(null);
const loading = ref(false);

const formData = ref({
  id: null,
  name: 'Nouveau Build',
  weapon_id: '',
  weapon_refinement: 1,
  artifact_set_1_id: '',
  artifact_set_2_id: '',
  main_stats: { sands: '', goblet: '', circlet: '' },
  notes: ''
});

// Filtrer uniquement les armes compatibles avec le type d'arme du perso
const compatibleWeapons = computed(() => {
  if (!props.character?.weapon_type) return props.weapons;
  return props.weapons.filter(w => w.weapon_type === props.character.weapon_type);
});

async function loadCharacterLoadouts() {
  if (!props.character) return;
  loading.value = true;
  const rawId = props.character.id.replace('avatar_', '');
  try {
    const list = await fetchLoadouts(rawId);
    loadouts.value = list;
    if (list.length > 0) {
      selectLoadout(list[0]);
    } else {
      initNewLoadout();
    }
  } catch (err) {
    console.error('Erreur chargement loadouts:', err);
  } finally {
    loading.value = false;
  }
}

watch(() => props.character, () => {
  if (props.character) {
    loadCharacterLoadouts();
  }
}, { immediate: true });

function selectLoadout(loadout) {
  activeLoadoutId.value = loadout.id;
  formData.value = {
    id: loadout.id,
    name: loadout.name,
    weapon_id: loadout.weapon_id || '',
    weapon_refinement: loadout.weapon_refinement || 1,
    artifact_set_1_id: loadout.artifact_set_1_id || '',
    artifact_set_2_id: loadout.artifact_set_2_id || '',
    main_stats: loadout.main_stats ? JSON.parse(loadout.main_stats) : { sands: '', goblet: '', circlet: '' },
    notes: loadout.notes || ''
  };
}

function initNewLoadout() {
  activeLoadoutId.value = null;
  formData.value = {
    id: null,
    name: `Build ${loadouts.value.length + 1}`,
    weapon_id: compatibleWeapons.value[0]?.id ? Number(compatibleWeapons.value[0].id.replace('weapon_', '')) : '',
    weapon_refinement: 1,
    artifact_set_1_id: '',
    artifact_set_2_id: '',
    main_stats: { sands: '', goblet: '', circlet: '' },
    notes: ''
  };
}

async function handleSave() {
  if (!props.character) return;
  const rawId = Number(props.character.id.replace('avatar_', ''));
  const payload = {
    ...formData.value,
    character_id: rawId,
    character_name: props.character.name
  };

  if (formData.value.id) {
    await updateLoadout(formData.value.id, payload);
  } else {
    const res = await createLoadout(payload);
    formData.value.id = res.id;
  }
  await loadCharacterLoadouts();
  emit('loadouts-updated');
}

async function handleDelete(id) {
  if (confirm('Voulez-vous supprimer ce build ?')) {
    await deleteLoadout(id);
    await loadCharacterLoadouts();
    emit('loadouts-updated');
  }
}
</script>

<template>
  <dialog v-if="character" open class="modal-dialog">
    <div class="modal-content">
      <!-- En-tête du personnage -->
      <div class="modal-header">
        <div class="char-summary">
          <div class="char-avatar-box" :style="{ borderColor: ELEMENT_COLORS[character.element] || '#fff' }">
            <img :src="getIconUrl(character.icon)" :alt="character.name" class="char-avatar" />
          </div>
          <div>
            <h2 class="char-name">{{ character.name }}</h2>
            <div class="char-tags">
              <span class="element-badge" :style="{ color: ELEMENT_COLORS[character.element] || '#fff' }">
                ● {{ ELEMENT_LABELS[character.element] || character.element }}
              </span>
              <span class="weapon-badge">
                ⚔️ {{ WEAPON_LABELS[character.weapon_type] || character.weapon_type }}
              </span>
              <span class="rarity-badge">{{ character.rarity }}★</span>
            </div>
          </div>
        </div>
        <button type="button" class="btn-close" @click="$emit('close')" aria-label="Fermer">✕</button>
      </div>

      <!-- Navigation des Loadouts -->
      <div class="loadout-bar">
        <div class="loadout-tabs">
          <button
            v-for="l in loadouts"
            :key="l.id"
            type="button"
            :class="['loadout-tab', { active: activeLoadoutId === l.id }]"
            @click="selectLoadout(l)"
          >
            {{ l.name }}
          </button>
          <button type="button" class="loadout-tab new-tab" @click="initNewLoadout">
            + Nouveau Build
          </button>
        </div>
      </div>

      <!-- Formulaire du Build -->
      <form class="loadout-form" @submit.prevent="handleSave">
        <div class="form-row">
          <label class="form-group flex-1">
            <span class="label-text">Nom du Build / Loadout</span>
            <input v-model="formData.name" type="text" class="input-field" placeholder="ex: Hyperbloom ME, DPS Burst..." required />
          </label>
        </div>

        <!-- Section Arme -->
        <div class="form-section">
          <h3 class="section-title">🗡️ Arme Équipée</h3>
          <div class="grid-2">
            <label class="form-group">
              <span class="label-text">Choix de l'arme</span>
              <select v-model="formData.weapon_id" class="input-field select-field">
                <option value="">-- Aucune arme sélectionnée --</option>
                <option v-for="w in compatibleWeapons" :key="w.id" :value="Number(w.id.replace('weapon_', ''))">
                  {{ w.rarity }}★ {{ w.name }}
                </option>
              </select>
            </label>
            <label class="form-group">
              <span class="label-text">Raffinement</span>
              <select v-model="formData.weapon_refinement" class="input-field select-field">
                <option :value="1">R1 (Rang 1)</option>
                <option :value="2">R2 (Rang 2)</option>
                <option :value="3">R3 (Rang 3)</option>
                <option :value="4">R4 (Rang 4)</option>
                <option :value="5">R5 (Rang 5)</option>
              </select>
            </label>
          </div>
        </div>

        <!-- Section Artéfacts -->
        <div class="form-section">
          <h3 class="section-title">🏺 Sets d'Artéfacts</h3>
          <div class="grid-2">
            <label class="form-group">
              <span class="label-text">Set Principal (4 pièces ou premier 2p)</span>
              <select v-model="formData.artifact_set_1_id" class="input-field select-field">
                <option value="">-- Aucun set --</option>
                <option v-for="r in reliquaries" :key="r.id" :value="Number(r.id.replace('relic_', ''))">
                  {{ r.name }}
                </option>
              </select>
            </label>
            <label class="form-group">
              <span class="label-text">Second Set (Optionnel, si 2p + 2p)</span>
              <select v-model="formData.artifact_set_2_id" class="input-field select-field">
                <option value="">-- Aucun (Set 4 pièces actif) --</option>
                <option v-for="r in reliquaries" :key="r.id" :value="Number(r.id.replace('relic_', ''))">
                  {{ r.name }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <!-- Stats principales cibles -->
        <div class="form-section">
          <h3 class="section-title">🎯 Statistiques Principales Conseillées</h3>
          <div class="grid-3">
            <label class="form-group">
              <span class="label-text">Sablier</span>
              <input v-model="formData.main_stats.sands" type="text" class="input-field" placeholder="ex: RE%, ATQ%, ME" />
            </label>
            <label class="form-group">
              <span class="label-text">Coupe</span>
              <input v-model="formData.main_stats.goblet" type="text" class="input-field" placeholder="ex: DGT Électro, PV%" />
            </label>
            <label class="form-group">
              <span class="label-text">Couronne</span>
              <input v-model="formData.main_stats.circlet" type="text" class="input-field" placeholder="ex: Taux CRIT, DGT CRIT" />
            </label>
          </div>
        </div>

        <!-- Notes -->
        <label class="form-group">
          <span class="label-text">Notes & Objectifs de stats</span>
          <textarea v-model="formData.notes" rows="2" class="input-field" placeholder="ex: Viser 250% RE minimum, jouer avec Furina..."></textarea>
        </label>

        <!-- Actions -->
        <div class="form-actions">
          <button v-if="formData.id" type="button" class="btn btn-danger" @click="handleDelete(formData.id)">
            Supprimer ce build
          </button>
          <div class="actions-right">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary">
              💾 Enregistrer le build
            </button>
          </div>
        </div>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.modal-dialog {
  width: 720px;
}

.modal-content {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  background: var(--bg-surface-elevated);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.char-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.char-avatar-box {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-sm);
  border: 2px solid;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
}

.char-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-name {
  font-size: 1.25rem;
  font-weight: 700;
}

.char-tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.btn-close {
  font-size: 1.25rem;
  color: var(--text-dim);
  padding: 0.5rem;
  line-height: 1;
  transition: color 0.15s;
}
.btn-close:hover {
  color: #fff;
}

.loadout-bar {
  background: var(--bg-surface);
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.loadout-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
}

.loadout-tab {
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  transition: all 0.15s;
}

.loadout-tab:hover {
  color: var(--text-main);
  border-color: var(--border-accent);
}

.loadout-tab.active {
  color: #fff;
  background: var(--bg-surface-active);
  border-color: var(--color-hydro);
}

.loadout-tab.new-tab {
  border-style: dashed;
  color: var(--color-anemo);
}

.loadout-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.input-field {
  padding: 0.6rem 0.85rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.input-field:focus {
  border-color: var(--color-hydro);
}

.select-field {
  cursor: pointer;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.actions-right {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.15s;
}

.btn-primary {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #fff;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
}

.btn-secondary {
  background: var(--bg-surface-hover);
  color: var(--text-muted);
}
.btn-secondary:hover {
  color: var(--text-main);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}
</style>
