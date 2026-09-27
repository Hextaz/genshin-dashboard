<script setup>
import { ref, computed, watch } from 'vue';
import {
  getIconUrl,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  getElementIconUrl,
  WEAPON_LABELS,
  WEAPON_SVGS,
  SANDS_STATS,
  GOBLET_STATS,
  CIRCLET_STATS,
  fetchLoadouts,
  createLoadout,
  updateLoadout,
  deleteLoadout,
  getSignatureWeaponId,
  parseMainStats
} from '../api.js';
import WeaponPickerModal from './WeaponPickerModal.vue';
import ArtifactPickerModal from './ArtifactPickerModal.vue';

const props = defineProps({
  character: {
    type: Object,
    required: true
  },
  weapons: {
    type: Array,
    default: () => []
  },
  reliquaries: {
    type: Array,
    default: () => []
  },
  isOwned: {
    type: Boolean,
    default: false
  },
  constellation: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['close', 'loadouts-updated', 'toggle-ownership']);

const loadouts = ref([]);
const activeIndex = ref(0);
const loading = ref(false);
const showWeaponPicker = ref(false);
const showArtifactPicker = ref(false);
const activeArtifactSlotIndex = ref(0);

const formData = ref({
  id: null,
  name: 'Nouveau Build',
  weapon_id: null,
  weapon_refinement: 1,
  artifact_set_1_id: null,
  artifact_set_2_id: null,
  mode: '4p',
  main_stats: { sands: SANDS_STATS[0], goblet: GOBLET_STATS[0], circlet: CIRCLET_STATS[0] },
  notes: ''
});

// Map des armes et sets
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

async function loadBuilds() {
  if (!props.character) return;
  loading.value = true;
  const rawId = Number(props.character.id.replace('avatar_', ''));
  try {
    const list = await fetchLoadouts(rawId);
    loadouts.value = list;
    if (list.length > 0) {
      selectBuild(0);
    } else {
      initNewBuild();
    }
  } catch (err) {
    console.error('Erreur chargement loadouts:', err);
  } finally {
    loading.value = false;
  }
}

watch(() => props.character, () => {
  loadBuilds();
}, { immediate: true });

function selectBuild(index) {
  activeIndex.value = index;
  const b = loadouts.value[index];
  if (!b) return;

  const parsed = parseMainStats(b.main_stats);
  const parsedStats = parsed
    ? { sands: parsed.sands || SANDS_STATS[0], goblet: parsed.goblet || GOBLET_STATS[0], circlet: parsed.circlet || CIRCLET_STATS[0] }
    : { sands: SANDS_STATS[0], goblet: GOBLET_STATS[0], circlet: CIRCLET_STATS[0] };

  formData.value = {
    id: b.id,
    name: b.name,
    weapon_id: b.weapon_id,
    weapon_refinement: b.weapon_refinement || 1,
    artifact_set_1_id: b.artifact_set_1_id,
    artifact_set_2_id: b.artifact_set_2_id,
    mode: b.artifact_set_2_id ? '2+2' : '4p',
    main_stats: parsedStats,
    notes: b.notes || ''
  };
}

function initNewBuild() {
  // Sélectionner l'arme signature en priorité si disponible, sinon la 1ère compatible
  const sigId = getSignatureWeaponId(props.character);
  const sigWeapon = sigId ? props.weapons.find(w => Number(w.id.replace('weapon_', '')) === sigId) : null;
  const compatWeapon = sigWeapon || props.weapons.find(w => w.weapon_type === props.character.weapon_type);
  const defaultWeaponId = compatWeapon ? Number(compatWeapon.id.replace('weapon_', '')) : null;
  const defaultRelicId = props.reliquaries.length > 0 ? Number(props.reliquaries[0].id.replace('relic_', '')) : null;

  formData.value = {
    id: null,
    name: `Build ${loadouts.value.length + 1}`,
    weapon_id: defaultWeaponId,
    weapon_refinement: 1,
    artifact_set_1_id: defaultRelicId,
    artifact_set_2_id: null,
    mode: '4p',
    main_stats: { sands: SANDS_STATS[0], goblet: GOBLET_STATS[0], circlet: CIRCLET_STATS[0] },
    notes: ''
  };
  activeIndex.value = -1;
}

function setMode(mode) {
  formData.value.mode = mode;
  if (mode === '4p') {
    formData.value.artifact_set_2_id = null;
  } else if (!formData.value.artifact_set_2_id && props.reliquaries.length > 1) {
    const second = props.reliquaries.find(r => Number(r.id.replace('relic_', '')) !== formData.value.artifact_set_1_id);
    formData.value.artifact_set_2_id = second ? Number(second.id.replace('relic_', '')) : null;
  }
}

function openArtifactPicker(slotIndex) {
  activeArtifactSlotIndex.value = slotIndex;
  showArtifactPicker.value = true;
}

function onWeaponPicked(weaponId) {
  formData.value.weapon_id = weaponId;
  showWeaponPicker.value = false;
}

function onArtifactPicked(relicId) {
  if (activeArtifactSlotIndex.value === 0) {
    formData.value.artifact_set_1_id = relicId;
  } else {
    formData.value.artifact_set_2_id = relicId;
  }
  showArtifactPicker.value = false;
}

async function handleSave() {
  const rawCharId = Number(props.character.id.replace('avatar_', ''));
  const payload = {
    character_id: rawCharId,
    character_name: props.character.name,
    name: formData.value.name.trim() || 'Build sans nom',
    weapon_id: formData.value.weapon_id,
    weapon_refinement: formData.value.weapon_refinement,
    artifact_set_1_id: formData.value.artifact_set_1_id,
    artifact_set_2_id: formData.value.mode === '2+2' ? formData.value.artifact_set_2_id : null,
    main_stats: JSON.stringify(formData.value.main_stats),
    notes: formData.value.notes
  };

  try {
    if (formData.value.id) {
      await updateLoadout(formData.value.id, payload);
    } else {
      const res = await createLoadout(payload);
      formData.value.id = res.id;
    }
    await loadBuilds();
    emit('loadouts-updated');
  } catch (err) {
    console.error('Erreur sauvegarde loadout:', err);
  }
}

async function handleDelete() {
  if (!formData.value.id) return;
  try {
    await deleteLoadout(formData.value.id);
    await loadBuilds();
    emit('loadouts-updated');
  } catch (err) {
    console.error('Erreur suppression loadout:', err);
  }
}
</script>

<template>
  <aside class="character-drawer" :style="{ '--hero-color': ELEMENT_COLORS[character.element] || '#7CF0D0' }">
    <!-- Barre néon lumineuse supérieure -->
    <div class="top-glow-bar"></div>

    <div class="drawer-inner scroll">
      <!-- En-tête avec avatar 68px circulaire et halo néon -->
      <div class="drawer-header">
        <div class="avatar-box">
          <div class="avatar-halo">
            <img
              :src="getIconUrl(character.icon)"
              :alt="character.name"
              class="avatar-img"
            />
          </div>
          <div class="header-info">
            <h2 class="hero-name">{{ character.name }}</h2>
            <div class="hero-meta">
              <span class="meta-element">
                <img :src="getElementIconUrl(character.element)" class="el-icon-img" />
                {{ ELEMENT_LABELS[character.element] || character.element }}
              </span>
              <span class="meta-sep">·</span>
              <span class="meta-weapon">
                {{ WEAPON_LABELS[character.weapon_type] || '' }}
              </span>
              <span class="meta-sep">·</span>
              <span class="meta-rarity" :class="`rarity-${character.rarity}`">
                {{ character.rarity }}★
              </span>
              <span class="meta-sep">·</span>
              <span class="meta-constellation-badge">
                C{{ constellation }}
              </span>
            </div>
          </div>
        </div>

        <button type="button" class="btn-close" @click="$emit('close')" title="Fermer la fiche">✕</button>
      </div>

      <!-- Onglets des Builds (Loadouts) -->
      <div class="section-block">
        <div class="section-head">
          <span class="section-title">LOADOUTS</span>
          <button type="button" class="btn-new-build" @click="initNewBuild">
            + Nouveau build
          </button>
        </div>
        <div class="build-tabs">
          <button
            v-for="(b, i) in loadouts"
            :key="b.id"
            type="button"
            :class="['build-tab', { active: activeIndex === i }]"
            @click="selectBuild(i)"
          >
            {{ b.name }}
          </button>
        </div>
      </div>

      <!-- Formulaire du Build actif -->
      <form class="build-form" @submit.prevent="handleSave">
        <!-- Nom du build -->
        <div class="form-group">
          <span class="label-text">Nom du build</span>
          <input
            v-model="formData.name"
            type="text"
            class="input-field"
            placeholder="ex: DPS Burst, Hyperbloom ME..."
            required
          />
        </div>

        <!-- Section Arme avec raffinement R1-R5 en un clic -->
        <div class="section-block">
          <span class="section-title">ARME ÉQUIPÉE</span>
          <div class="weapon-box">
            <div class="weapon-display" @click="showWeaponPicker = true">
              <div class="weapon-icon-frame" :class="`rarity-${weaponsMap[formData.weapon_id]?.rarity || 4}`">
                <img
                  v-if="weaponsMap[formData.weapon_id]"
                  :src="getIconUrl(weaponsMap[formData.weapon_id].icon)"
                  :alt="weaponsMap[formData.weapon_id].name"
                  class="weapon-img"
                />
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path :d="WEAPON_SVGS[character.weapon_type]" />
                </svg>
              </div>
              <div class="weapon-text-info">
                <div class="weapon-title">
                  {{ weaponsMap[formData.weapon_id]?.name || 'Choisir une arme...' }}
                </div>
                <div class="weapon-sub">
                  {{ WEAPON_LABELS[character.weapon_type] || '' }}
                  <span
                    v-if="formData.weapon_id === getSignatureWeaponId(character)"
                    class="signature-indicator"
                  >
                    ★ Signature
                  </span>
                </div>
              </div>
              <button type="button" class="btn-change-item" @click.stop="showWeaponPicker = true">
                Changer
              </button>
            </div>

            <!-- Boutons de raffinement R1 à R5 (1 clic direct) -->
            <div class="refinement-bar">
              <span class="ref-label">Raffinement :</span>
              <div class="ref-buttons">
                <button
                  v-for="r in [1, 2, 3, 4, 5]"
                  :key="r"
                  type="button"
                  :class="['ref-btn', { active: formData.weapon_refinement === r }]"
                  @click="formData.weapon_refinement = r"
                >
                  R{{ r }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Artéfacts (4p vs 2p+2p) -->
        <div class="section-block">
          <div class="section-head">
            <span class="section-title">SETS D'ARTÉFACTS</span>
            <div class="mode-toggle">
              <button
                type="button"
                :class="['mode-btn', { active: formData.mode === '4p' }]"
                @click="setMode('4p')"
              >
                4 pièces
              </button>
              <button
                type="button"
                :class="['mode-btn', { active: formData.mode === '2+2' }]"
                @click="setMode('2+2')"
              >
                2p + 2p
              </button>
            </div>
          </div>

          <!-- Slot 1 (Principal) -->
          <div class="artifact-card">
            <div class="artifact-row">
              <div class="artifact-icon-frame">
                <img
                  v-if="relicsMap[formData.artifact_set_1_id]"
                  :src="getIconUrl(relicsMap[formData.artifact_set_1_id].icon, 'reliquary')"
                  :alt="relicsMap[formData.artifact_set_1_id].name"
                  class="relic-img"
                />
              </div>
              <div class="artifact-text-info">
                <div class="artifact-title">
                  {{ relicsMap[formData.artifact_set_1_id]?.name || 'Choisir un set...' }}
                </div>
                <div class="artifact-sub text-mint">
                  {{ formData.mode === '4p' ? 'Set 4 pièces actif' : 'Set 2 pièces' }}
                </div>
              </div>
              <button type="button" class="btn-change-item" @click="openArtifactPicker(0)">
                Changer
              </button>
            </div>
          </div>

          <!-- Slot 2 (Si 2p + 2p) -->
          <div v-if="formData.mode === '2+2'" class="artifact-card">
            <div class="artifact-row">
              <div class="artifact-icon-frame">
                <img
                  v-if="relicsMap[formData.artifact_set_2_id]"
                  :src="getIconUrl(relicsMap[formData.artifact_set_2_id].icon, 'reliquary')"
                  :alt="relicsMap[formData.artifact_set_2_id].name"
                  class="relic-img"
                />
              </div>
              <div class="artifact-text-info">
                <div class="artifact-title">
                  {{ relicsMap[formData.artifact_set_2_id]?.name || 'Choisir le second set...' }}
                </div>
                <div class="artifact-sub text-gold">
                  Second set 2 pièces
                </div>
              </div>
              <button type="button" class="btn-change-item" @click="openArtifactPicker(1)">
                Changer
              </button>
            </div>
          </div>
        </div>

        <!-- Section Statistiques Principales (3 cartes compactes élégantes) -->
        <div class="section-block">
          <span class="section-title">STATS PRINCIPALES CONSEILLÉES</span>
          <div class="main-stats-list">
            <div class="stat-select-row">
              <div class="stat-slot-info">
                <span class="stat-slot-icon">⏳</span>
                <span class="stat-label">Sablier</span>
              </div>
              <div class="stat-select-wrapper">
                <select v-model="formData.main_stats.sands" class="stat-select">
                  <option v-for="stat in SANDS_STATS" :key="stat" :value="stat">{{ stat }}</option>
                </select>
                <svg class="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>

            <div class="stat-select-row">
              <div class="stat-slot-info">
                <span class="stat-slot-icon">🍷</span>
                <span class="stat-label">Coupe</span>
              </div>
              <div class="stat-select-wrapper">
                <select v-model="formData.main_stats.goblet" class="stat-select">
                  <option v-for="stat in GOBLET_STATS" :key="stat" :value="stat">{{ stat }}</option>
                </select>
                <svg class="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>

            <div class="stat-select-row">
              <div class="stat-slot-info">
                <span class="stat-slot-icon">👑</span>
                <span class="stat-label">Diadème</span>
              </div>
              <div class="stat-select-wrapper">
                <select v-model="formData.main_stats.circlet" class="stat-select">
                  <option v-for="stat in CIRCLET_STATS" :key="stat" :value="stat">{{ stat }}</option>
                </select>
                <svg class="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes libres -->
        <div class="form-group">
          <span class="label-text">Notes & Rotations</span>
          <textarea
            v-model="formData.notes"
            rows="1"
            class="input-field textarea-field"
            placeholder="ex: Viser 220% Recharge, jouer avec Bennett et Kazuha..."
          ></textarea>
        </div>

        <!-- Boutons d'action -->
        <div class="drawer-footer">
          <button
            v-if="formData.id"
            type="button"
            class="btn-delete"
            @click="handleDelete"
          >
            Supprimer ce build
          </button>
          <button type="submit" class="btn-save">
            Enregistrer le build
          </button>
        </div>
      </form>
    </div>

    <!-- Modale de sélection d'arme -->
    <WeaponPickerModal
      v-if="showWeaponPicker"
      :weapons="weapons"
      :weapon-type="character.weapon_type"
      :character="character"
      :current-weapon-id="formData.weapon_id"
      @select="onWeaponPicked"
      @close="showWeaponPicker = false"
    />

    <!-- Modale de sélection d'artéfacts -->
    <ArtifactPickerModal
      v-if="showArtifactPicker"
      :reliquaries="reliquaries"
      :current-set-id="activeArtifactSlotIndex === 0 ? formData.artifact_set_1_id : formData.artifact_set_2_id"
      @select="onArtifactPicked"
      @close="showArtifactPicker = false"
    />
  </aside>
</template>

<style scoped>
.character-drawer {
  width: 440px;
  flex-shrink: 0;
  background: #12151C;
  border: 1px solid #1F2430;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 75px;
  align-self: flex-start;
  max-height: calc(100vh - 90px);
  z-index: 20;
}

.top-glow-bar {
  height: 3px;
  background: var(--hero-color);
  box-shadow: 0 0 14px var(--hero-color);
}

.drawer-inner {
  padding: 0.85rem 1.1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: calc(100vh - 95px);
  overflow-y: auto;
}

/* En-tête */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid #1A1E27;
}

.avatar-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.avatar-halo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--hero-color);
  box-shadow: 0 0 12px rgba(124, 240, 208, 0.2);
  background: #0B0D12;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.hero-name {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #F2F3F7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  color: #8F97AA;
}

.meta-element {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--hero-color);
  font-weight: 600;
}

.el-icon-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.meta-sep {
  color: #3A4256;
}

.meta-rarity.rarity-5 {
  color: #F3C552;
  font-weight: 700;
}

.meta-rarity.rarity-4 {
  color: #B98CFF;
  font-weight: 700;
}

.meta-constellation-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  color: #C29BFF;
  background: rgba(194, 155, 255, 0.12);
  border: 1px solid rgba(194, 155, 255, 0.35);
  border-radius: 4px;
  padding: 1px 5px;
  line-height: 1.2;
}

.btn-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #262B38;
  background: transparent;
  color: #8F97AA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-close:hover {
  color: #E7E9EE;
  border-color: #3A4256;
}

/* Sections */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8296;
}

.btn-new-build {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  height: 24px;
  padding: 0 0.55rem;
  border-radius: 5px;
  border: 1px dashed #343B4D;
  background: transparent;
  color: #B7BECC;
  font-size: 0.72rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.btn-new-build:hover {
  color: #7CF0D0;
  border-color: #7CF0D0;
}

.build-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.build-tab {
  height: 28px;
  padding: 0 0.75rem;
  border-radius: 6px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #8F97AA;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.build-tab:hover {
  color: #E7E9EE;
  border-color: #3A4256;
}

.build-tab.active {
  color: var(--hero-color);
  background: rgba(124, 240, 208, 0.08);
  border-color: var(--hero-color);
}

/* Formulaire */
.build-form {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label-text {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8296;
}

.input-field {
  height: 32px;
  padding: 0 0.75rem;
  border-radius: 7px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #E7E9EE;
  font-size: 0.82rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.input-field:focus {
  border-color: #7CF0D0;
}

.textarea-field {
  height: 34px;
  min-height: 34px;
  padding: 0.35rem 0.75rem;
  resize: vertical;
  line-height: 1.35;
  transition: height 0.2s ease, border-color 0.15s ease;
}

.textarea-field:focus {
  height: 56px;
}

/* Box Arme */
.weapon-box {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: #0F1218;
  border: 1px solid #1F2430;
}

.weapon-display {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
}

.weapon-icon-frame {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #141821;
  border: 1px solid #262B38;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.weapon-icon-frame.rarity-5 {
  border-color: #F3C552;
  box-shadow: 0 0 8px rgba(243, 197, 82, 0.25);
}

.weapon-icon-frame.rarity-4 {
  border-color: #B98CFF;
}

.weapon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.weapon-text-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.weapon-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #E7E9EE;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weapon-sub {
  font-size: 0.7rem;
  color: #8F97AA;
  display: flex;
  align-items: center;
}

.signature-indicator {
  margin-left: 0.4rem;
  color: #F3C552;
  font-weight: 700;
  font-size: 0.68rem;
  text-shadow: 0 0 8px rgba(243, 197, 82, 0.4);
}

.btn-change-item {
  height: 26px;
  padding: 0 0.65rem;
  border-radius: 6px;
  border: 1px solid #2A3040;
  background: #161A23;
  color: #C9CEDA;
  font-size: 0.72rem;
  font-weight: 600;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-change-item:hover {
  color: #7CF0D0;
  border-color: #7CF0D0;
}

.refinement-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding-top: 0.35rem;
  border-top: 1px solid #1A1E27;
}

.ref-label {
  font-size: 0.7rem;
  color: #8F97AA;
}

.ref-buttons {
  display: flex;
  gap: 0.25rem;
}

.ref-btn {
  width: 28px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid #262B38;
  background: #12151C;
  color: #8F97AA;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  transition: all 0.15s ease;
}

.ref-btn:hover {
  color: #E7E9EE;
  border-color: #3A4256;
}

.ref-btn.active {
  color: #0B0D12;
  background: #F3C552;
  border-color: #F3C552;
}

/* Artéfacts */
.mode-toggle {
  display: flex;
  gap: 0.2rem;
  padding: 2px;
  background: #0B0D12;
  border: 1px solid #1F2430;
  border-radius: 6px;
}

.mode-btn {
  height: 22px;
  padding: 0 0.55rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #8F97AA;
  transition: all 0.15s ease;
}

.mode-btn.active {
  color: #0B0D12;
  background: #7CF0D0;
}

.artifact-card {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  background: #0F1218;
  border: 1px solid #1F2430;
}

.artifact-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.artifact-icon-frame {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #141821;
  border: 1px solid #262B38;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.relic-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.artifact-text-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.artifact-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #E7E9EE;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artifact-sub {
  font-size: 0.68rem;
  font-weight: 600;
}

.text-mint {
  color: #7CF0D0;
}

.text-gold {
  color: #F3C552;
}

/* Main Stats */
.main-stats-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-select-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.65rem;
  height: 32px;
  border-radius: 8px;
  background: #0F1218;
  border: 1px solid #1F2430;
  transition: border-color 0.15s ease;
}

.stat-select-row:focus-within {
  border-color: #7CF0D0;
}

.stat-slot-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 84px;
  flex-shrink: 0;
}

.stat-slot-icon {
  font-size: 0.85rem;
}

.stat-label {
  font-size: 0.7rem;
  color: #8F97AA;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-select-wrapper {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  align-items: center;
}

.stat-select {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  outline: none;
  color: #E7E9EE;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  padding-right: 1.25rem;
}

.select-chevron {
  position: absolute;
  right: 0.2rem;
  pointer-events: none;
  color: #8F97AA;
}

.stat-select option {
  background: #12151C;
  color: #E7E9EE;
  padding: 0.3rem;
}

/* Footer */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding-top: 0.45rem;
  border-top: 1px solid #1A1E27;
  position: sticky;
  bottom: 0;
  background: #12151C;
  z-index: 10;
}

.btn-delete {
  height: 34px;
  padding: 0 0.8rem;
  border-radius: 7px;
  border: 1px solid rgba(255, 107, 107, 0.4);
  background: transparent;
  color: #FF8A8A;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.btn-delete:hover {
  background: rgba(255, 107, 107, 0.1);
}

.btn-save {
  margin-left: auto;
  height: 34px;
  padding: 0 1.15rem;
  border-radius: 7px;
  border: 1px solid #7CF0D0;
  background: #7CF0D0;
  color: #0B0D12;
  font-size: 0.8rem;
  font-weight: 700;
  transition: all 0.15s ease;
}

.btn-save:hover {
  filter: brightness(1.1);
}
</style>
