<script setup>
import { ref, computed } from 'vue';
import {
  getIconUrl,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  WEAPON_LABELS,
  WEAPON_SVGS,
  fetchPlanner,
  createPlannerItem,
  updatePlannerItem,
  deletePlannerItem
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
  }
});

const plannerItems = ref([]);
const loading = ref(false);
const showModal = ref(false);
const editingItemId = ref(null);

const TIERS = [
  { id: 'S', title: 'Tier S', sub: 'Priorité haute', color: '#FF7A52' },
  { id: 'A', title: 'Tier A', sub: 'Moyen', color: '#F3C552' },
  { id: 'B', title: 'Tier B', sub: 'Futur', color: '#4FB2FF' }
];

const LEVEL_STEPS = [1, 20, 40, 50, 60, 70, 80, 90];

const TAG_CONFIG = {
  set_change: { label: 'Changement de set', color: '#FFA05A' },
  upgrade_levels: { label: 'Amélioration pièces', color: '#6FB8FF' },
  substat_farm: { label: 'Optimisation stats', color: '#C29BFF' }
};

// Map des personnages et sets
const charactersMap = computed(() => {
  const map = {};
  for (const c of props.characters) {
    const rawId = Number(c.id.replace('avatar_', ''));
    map[rawId] = c;
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

const weaponsMap = computed(() => {
  const map = {};
  for (const w of props.weapons) {
    const rawId = Number(w.id.replace('weapon_', ''));
    map[rawId] = w;
  }
  return map;
});

async function loadPlanner() {
  loading.value = true;
  try {
    plannerItems.value = await fetchPlanner();
  } catch (err) {
    console.error('Erreur chargement planner:', err);
  } finally {
    loading.value = false;
  }
}

loadPlanner();

const itemsByTier = computed(() => {
  return {
    S: plannerItems.value.filter(i => i.tier === 'S'),
    A: plannerItems.value.filter(i => i.tier === 'A'),
    B: plannerItems.value.filter(i => i.tier === 'B')
  };
});

// Calcul de progression (fraction x/y et %)
function getItemProgress(item) {
  if (item.target_type === 'character') {
    const total = 3;
    const done = (item.is_level_done ? 1 : 0) + (item.is_talents_done ? 1 : 0) + (item.is_artifacts_done ? 1 : 0);
    return { done, total, pct: Math.round((done / total) * 100), completed: done === total };
  } else {
    const total = 2;
    const done = (item.is_level_done ? 1 : 0) + (item.is_weapon_done ? 1 : 0);
    return { done, total, pct: Math.round((done / total) * 100), completed: done === total };
  }
}

// Toggle d'une checkbox avec mise à jour immédiate
async function toggleCheck(item, field) {
  item[field] = item[field] ? 0 : 1;
  const prog = getItemProgress(item);
  item.is_completed = prog.completed ? 1 : 0;

  try {
    await updatePlannerItem(item.id, {
      ...item,
      [field]: item[field],
      is_completed: item.is_completed
    });
  } catch (err) {
    console.error('Erreur mise à jour checklist:', err);
  }
}

// -------------------------------------------------------------
// ÉDITEUR MODAL DU PLANIFICATEUR (ZÉRO SELECT)
// -------------------------------------------------------------
const modalForm = ref({
  id: null,
  target_type: 'character',
  character_id: null,
  weapon_id: null,
  name: '',
  icon: '',
  tier: 'S',
  current_level: 80,
  target_level: 90,
  talent_normal_target: 1,
  talent_skill_target: 9,
  talent_burst_target: 10,
  weapon_target_level: 90,
  weapon_refinement: 1,
  artifact_set_id: null,
  artifact_action: 'substat_farm',
  artifact_notes: '',
  is_level_done: 0,
  is_talents_done: 0,
  is_weapon_done: 0,
  is_artifacts_done: 0
});

function openNewGoal(tierId = 'S') {
  editingItemId.value = null;
  const defChar = props.characters[0];
  const rawCharId = defChar ? Number(defChar.id.replace('avatar_', '')) : null;
  const defRelic = props.reliquaries[0];
  const rawRelicId = defRelic ? Number(defRelic.id.replace('relic_', '')) : null;

  modalForm.value = {
    id: null,
    target_type: 'character',
    character_id: rawCharId,
    weapon_id: null,
    name: defChar ? defChar.name : '',
    icon: defChar ? defChar.icon : '',
    tier: tierId,
    current_level: 80,
    target_level: 90,
    talent_normal_target: 1,
    talent_skill_target: 9,
    talent_burst_target: 10,
    weapon_target_level: 90,
    weapon_refinement: 1,
    artifact_set_id: rawRelicId,
    artifact_action: 'substat_farm',
    artifact_notes: '',
    is_level_done: 0,
    is_talents_done: 0,
    is_weapon_done: 0,
    is_artifacts_done: 0
  };
  showModal.value = true;
}

function openEditGoal(item) {
  editingItemId.value = item.id;
  modalForm.value = {
    ...item,
    weapon_refinement: item.weapon_refinement || 1,
    artifact_set_id: item.artifact_set_id || (props.reliquaries[0] ? Number(props.reliquaries[0].id.replace('relic_', '')) : null)
  };
  showModal.value = true;
}

function selectCharacterInModal(c) {
  const rawId = Number(c.id.replace('avatar_', ''));
  modalForm.value.character_id = rawId;
  modalForm.value.name = c.name;
  modalForm.value.icon = c.icon;
}

function selectWeaponInModal(w) {
  const rawId = Number(w.id.replace('weapon_', ''));
  modalForm.value.weapon_id = rawId;
  modalForm.value.name = w.name;
  modalForm.value.icon = w.icon;
}

// Steppers Niveaux
function stepLevel(field, delta) {
  const curIdx = LEVEL_STEPS.indexOf(modalForm.value[field]);
  const newIdx = curIdx + delta;
  if (newIdx >= 0 && newIdx < LEVEL_STEPS.length) {
    modalForm.value[field] = LEVEL_STEPS[newIdx];
    if (field === 'current_level' && modalForm.value.current_level > modalForm.value.target_level) {
      modalForm.value.target_level = modalForm.value.current_level;
    }
    if (field === 'target_level' && modalForm.value.target_level < modalForm.value.current_level) {
      modalForm.value.current_level = modalForm.value.target_level;
    }
  }
}

// Steppers Talents
function stepTalent(field, delta) {
  const val = modalForm.value[field] + delta;
  if (val >= 1 && val <= 10) {
    modalForm.value[field] = val;
  }
}

async function handleSaveGoal() {
  const isChar = modalForm.value.target_type === 'character';
  const payload = {
    target_type: modalForm.value.target_type,
    character_id: isChar ? modalForm.value.character_id : null,
    weapon_id: !isChar ? modalForm.value.weapon_id : null,
    name: modalForm.value.name,
    icon: modalForm.value.icon,
    tier: modalForm.value.tier,
    current_level: modalForm.value.current_level,
    target_level: modalForm.value.target_level,
    talent_normal_target: modalForm.value.talent_normal_target,
    talent_skill_target: modalForm.value.talent_skill_target,
    talent_burst_target: modalForm.value.talent_burst_target,
    weapon_target_level: modalForm.value.target_level,
    weapon_refinement: modalForm.value.weapon_refinement,
    artifact_action: modalForm.value.artifact_action,
    artifact_set_id: modalForm.value.artifact_set_id,
    artifact_notes: modalForm.value.artifact_notes,
    is_level_done: modalForm.value.is_level_done,
    is_talents_done: modalForm.value.is_talents_done,
    is_weapon_done: modalForm.value.is_weapon_done,
    is_artifacts_done: modalForm.value.is_artifacts_done,
    is_completed: modalForm.value.is_completed
  };

  try {
    if (editingItemId.value) {
      await updatePlannerItem(editingItemId.value, payload);
    } else {
      await createPlannerItem(payload);
    }
    await loadPlanner();
    showModal.value = false;
  } catch (err) {
    console.error('Erreur sauvegarde objectif:', err);
  }
}

async function handleDeleteGoal() {
  if (!editingItemId.value) return;
  try {
    await deletePlannerItem(editingItemId.value);
    await loadPlanner();
    showModal.value = false;
  } catch (err) {
    console.error('Erreur suppression objectif:', err);
  }
}
</script>

<template>
  <div class="planner-view">
    <!-- 3 Colonnes de Tiers S / A / B -->
    <div class="tiers-grid">
      <section
        v-for="tier in TIERS"
        :key="tier.id"
        class="tier-column"
        :style="{ '--tier-color': tier.color }"
      >
        <!-- En-tête de Colonne -->
        <div class="tier-header">
          <div class="tier-title-wrap">
            <span class="tier-dot"></span>
            <h2 class="tier-title">{{ tier.title }}</h2>
            <span class="tier-sub">({{ tier.sub }})</span>
          </div>

          <button
            type="button"
            class="btn-add-goal"
            :title="`Ajouter un objectif en ${tier.title}`"
            @click="openNewGoal(tier.id)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <!-- Cartes d'objectifs -->
        <div class="goals-list">
          <article
            v-for="item in itemsByTier[tier.id]"
            :key="item.id"
            :class="['goal-card', { completed: getItemProgress(item).completed }]"
          >
            <div class="goal-header-row">
              <!-- Avatar ou Icône Arme -->
              <div
                class="goal-avatar-wrap"
                :class="{ 'is-weapon': item.target_type === 'weapon' }"
                :style="{
                  borderColor: item.target_type === 'character' ? (ELEMENT_COLORS[charactersMap[item.character_id]?.element] || '#7CF0D0') : '#F3C552'
                }"
              >
                <img
                  v-if="item.icon"
                  :src="getIconUrl(item.icon)"
                  :alt="item.name"
                  class="avatar-img"
                />
              </div>

              <!-- Titre et type -->
              <div class="goal-info">
                <span class="goal-name">{{ item.name }}</span>
                <span class="goal-sub">
                  {{ item.target_type === 'character' ? `Personnage · ${ELEMENT_LABELS[charactersMap[item.character_id]?.element] || ''}` : `Arme · ${WEAPON_LABELS[weaponsMap[item.weapon_id]?.weapon_type] || ''}` }}
                </span>
              </div>

              <!-- Fraction d'accomplissement -->
              <span
                class="progress-fraction"
                :class="{ 'text-mint': getItemProgress(item).completed }"
              >
                {{ getItemProgress(item).done }} / {{ getItemProgress(item).total }}
              </span>

              <!-- Bouton Modifier -->
              <button
                type="button"
                class="btn-edit-goal"
                title="Modifier l'objectif"
                @click="openEditGoal(item)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                </svg>
              </button>
            </div>

            <!-- Barre de progression néon -->
            <div class="progress-track">
              <div
                class="progress-bar-fill"
                :style="{
                  width: `${getItemProgress(item).pct}%`,
                  background: getItemProgress(item).completed ? '#7CF0D0' : tier.color,
                  boxShadow: `0 0 10px ${getItemProgress(item).completed ? '#7CF0D0' : tier.color}`
                }"
              ></div>
            </div>

            <!-- Checklist interactive -->
            <div class="checklist">
              <!-- Item Niveau -->
              <div class="check-row" @click="toggleCheck(item, 'is_level_done')">
                <input
                  type="checkbox"
                  :checked="!!item.is_level_done"
                  class="check-box"
                />
                <span class="check-label">Niveau</span>
                <span :class="['check-value', { done: item.is_level_done }]">
                  Niv. {{ item.current_level }} → {{ item.target_level }}
                </span>
              </div>

              <!-- Si Personnage : Talents et Artéfacts -->
              <template v-if="item.target_type === 'character'">
                <div class="check-row" @click="toggleCheck(item, 'is_talents_done')">
                  <input
                    type="checkbox"
                    :checked="!!item.is_talents_done"
                    class="check-box"
                  />
                  <span class="check-label">Talents</span>
                  <div :class="['talents-badges', { done: item.is_talents_done }]">
                    <span class="tal-badge">Att. {{ item.talent_normal_target }}</span>
                    <span class="tal-badge">E {{ item.talent_skill_target }}</span>
                    <span class="tal-badge">Q {{ item.talent_burst_target }}</span>
                  </div>
                </div>

                <div class="check-row" @click="toggleCheck(item, 'is_artifacts_done')">
                  <input
                    type="checkbox"
                    :checked="!!item.is_artifacts_done"
                    class="check-box"
                  />
                  <span class="check-label">Artéfacts</span>
                  <div :class="['artifact-badges', { done: item.is_artifacts_done }]">
                    <span
                      v-if="TAG_CONFIG[item.artifact_action]"
                      class="tag-badge"
                      :style="{
                        color: TAG_CONFIG[item.artifact_action].color,
                        background: `${TAG_CONFIG[item.artifact_action].color}15`,
                        borderColor: `${TAG_CONFIG[item.artifact_action].color}50`
                      }"
                    >
                      [{{ TAG_CONFIG[item.artifact_action].label }}]
                    </span>
                  </div>
                </div>
              </template>

              <!-- Si Arme : Raffinement -->
              <template v-else>
                <div class="check-row" @click="toggleCheck(item, 'is_weapon_done')">
                  <input
                    type="checkbox"
                    :checked="!!item.is_weapon_done"
                    class="check-box"
                  />
                  <span class="check-label">Raffinement</span>
                  <span :class="['check-value', { done: item.is_weapon_done }]">
                    R{{ item.weapon_refinement || 1 }}
                  </span>
                </div>
              </template>
            </div>
          </article>

          <!-- Bouton vide si aucun objectif -->
          <button
            v-if="!itemsByTier[tier.id] || itemsByTier[tier.id].length === 0"
            type="button"
            class="empty-tier-box"
            @click="openNewGoal(tier.id)"
          >
            Aucun objectif — cliquez pour ajouter
          </button>
        </div>
      </section>
    </div>

    <!-- ============================================================= -->
    <!-- MODALE ÉDITEUR D'OBJECTIF VISUELLE (ZÉRO SELECT) -->
    <!-- ============================================================= -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="planner-dialog scroll">
        <div class="dialog-header">
          <div class="header-left">
            <h2 class="dialog-title">{{ editingItemId ? 'Modifier l\'objectif' : 'Nouvel objectif' }}</h2>
            <!-- Bascule Personnage vs Arme -->
            <div v-if="!editingItemId" class="kind-pills">
              <button
                type="button"
                :class="['kind-btn', { active: modalForm.target_type === 'character' }]"
                @click="modalForm.target_type = 'character'"
              >
                Personnage
              </button>
              <button
                type="button"
                :class="['kind-btn', { active: modalForm.target_type === 'weapon' }]"
                @click="modalForm.target_type = 'weapon'"
              >
                Arme
              </button>
            </div>
          </div>

          <button type="button" class="btn-close-dialog" @click="showModal = false">✕</button>
        </div>

        <div class="dialog-body">
          <div class="dialog-layout">
            <!-- Colonne Gauche : Sélection visuelle du Personnage ou de l'Arme -->
            <div class="dialog-pick-column">
              <span class="column-pick-label">
                {{ modalForm.target_type === 'character' ? 'Choisir un personnage' : 'Choisir une arme' }}
              </span>

              <!-- Grille des personnages à cliquer -->
              <div v-if="modalForm.target_type === 'character'" class="dialog-chars-grid scroll">
                <button
                  v-for="c in characters"
                  :key="c.id"
                  type="button"
                  :class="['dialog-char-tile', { active: modalForm.character_id === Number(c.id.replace('avatar_', '')) }]"
                  @click="selectCharacterInModal(c)"
                >
                  <div class="tile-avatar-wrap" :style="{ borderColor: ELEMENT_COLORS[c.element] }">
                    <img :src="getIconUrl(c.icon)" class="avatar-img" />
                  </div>
                  <span class="tile-char-name">{{ c.name }}</span>
                </button>
              </div>

              <!-- Grille des armes à cliquer -->
              <div v-else class="dialog-weapons-grid scroll">
                <button
                  v-for="w in weapons"
                  :key="w.id"
                  type="button"
                  :class="['dialog-weapon-tile', { active: modalForm.weapon_id === Number(w.id.replace('weapon_', '')) }]"
                  @click="selectWeaponInModal(w)"
                >
                  <div class="tile-weapon-icon" :class="`rarity-${w.rarity}`">
                    <img :src="getIconUrl(w.icon)" class="avatar-img" />
                  </div>
                  <div class="tile-weapon-text">
                    <span class="tile-weapon-name">{{ w.name }}</span>
                    <span class="tile-weapon-sub">{{ WEAPON_LABELS[w.weapon_type] || '' }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Colonne Droite : Paramètres et Steppers -->
            <div class="dialog-params-column">
              <!-- Priorité (Tier S, A, B) -->
              <div class="param-group">
                <span class="param-label">Priorité</span>
                <div class="tier-pick-row">
                  <button
                    v-for="t in TIERS"
                    :key="t.id"
                    type="button"
                    :class="['tier-btn-choice', { active: modalForm.tier === t.id }]"
                    :style="modalForm.tier === t.id ? { color: t.color, borderColor: t.color, background: `${t.color}15` } : {}"
                    @click="modalForm.tier = t.id"
                  >
                    {{ t.title }}
                  </button>
                </div>
              </div>

              <!-- Steppers Niveaux Actuel et Objectif -->
              <div class="param-group">
                <span class="param-label">Niveaux</span>
                <div class="steppers-grid">
                  <div class="stepper-box">
                    <span class="stepper-title">Actuel</span>
                    <div class="stepper-controls">
                      <button type="button" class="btn-step" @click="stepLevel('current_level', -1)">−</button>
                      <span class="stepper-val">{{ modalForm.current_level }}</span>
                      <button type="button" class="btn-step" @click="stepLevel('current_level', 1)">+</button>
                    </div>
                  </div>

                  <div class="stepper-box">
                    <span class="stepper-title">Objectif</span>
                    <div class="stepper-controls">
                      <button type="button" class="btn-step" @click="stepLevel('target_level', -1)">−</button>
                      <span class="stepper-val">{{ modalForm.target_level }}</span>
                      <button type="button" class="btn-step" @click="stepLevel('target_level', 1)">+</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Si Personnage : Steppers des Talents -->
              <div v-if="modalForm.target_type === 'character'" class="param-group">
                <span class="param-label">Objectif des Talents (1 à 10)</span>
                <div class="steppers-grid three-grid">
                  <div class="stepper-box">
                    <span class="stepper-title">Att. normale</span>
                    <div class="stepper-controls">
                      <button type="button" class="btn-step" @click="stepTalent('talent_normal_target', -1)">−</button>
                      <span class="stepper-val">{{ modalForm.talent_normal_target }}</span>
                      <button type="button" class="btn-step" @click="stepTalent('talent_normal_target', 1)">+</button>
                    </div>
                  </div>

                  <div class="stepper-box">
                    <span class="stepper-title">Compétence (E)</span>
                    <div class="stepper-controls">
                      <button type="button" class="btn-step" @click="stepTalent('talent_skill_target', -1)">−</button>
                      <span class="stepper-val">{{ modalForm.talent_skill_target }}</span>
                      <button type="button" class="btn-step" @click="stepTalent('talent_skill_target', 1)">+</button>
                    </div>
                  </div>

                  <div class="stepper-box">
                    <span class="stepper-title">Burst (Q)</span>
                    <div class="stepper-controls">
                      <button type="button" class="btn-step" @click="stepTalent('talent_burst_target', -1)">−</button>
                      <span class="stepper-val">{{ modalForm.talent_burst_target }}</span>
                      <button type="button" class="btn-step" @click="stepTalent('talent_burst_target', 1)">+</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Si Personnage : Action sur les artéfacts -->
              <div v-if="modalForm.target_type === 'character'" class="param-group">
                <span class="param-label">Action sur les artéfacts</span>
                <div class="artifact-actions-row">
                  <button
                    v-for="(cfg, key) in TAG_CONFIG"
                    :key="key"
                    type="button"
                    :class="['tag-choice-btn', { active: modalForm.artifact_action === key }]"
                    :style="modalForm.artifact_action === key ? { color: cfg.color, borderColor: cfg.color, background: `${cfg.color}15` } : {}"
                    @click="modalForm.artifact_action = key"
                  >
                    {{ cfg.label }}
                  </button>
                </div>
              </div>

              <!-- Si Arme : Raffinement visé (R1 à R5) -->
              <div v-if="modalForm.target_type === 'weapon'" class="param-group">
                <span class="param-label">Raffinement visé</span>
                <div class="refinement-pills-row">
                  <button
                    v-for="r in [1, 2, 3, 4, 5]"
                    :key="r"
                    type="button"
                    :class="['ref-pill-btn', { active: modalForm.weapon_refinement === r }]"
                    @click="modalForm.weapon_refinement = r"
                  >
                    R{{ r }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pied de page -->
        <div class="dialog-footer">
          <button
            v-if="editingItemId"
            type="button"
            class="btn-delete-goal"
            @click="handleDeleteGoal"
          >
            Supprimer l'objectif
          </button>

          <div class="footer-actions-right">
            <button type="button" class="btn-cancel" @click="showModal = false">
              Annuler
            </button>
            <button type="button" class="btn-save-goal" @click="handleSaveGoal">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.planner-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tiers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: start;
}

.tier-column {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding: 1.15rem;
  border-radius: 18px;
  background: #0F1218;
  border: 1px solid #1C2029;
}

.tier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.25rem;
}

.tier-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.tier-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--tier-color);
  box-shadow: 0 0 10px var(--tier-color);
}

.tier-title {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #F2F3F7;
}

.tier-sub {
  font-size: 0.78rem;
  color: #8F97AA;
}

.btn-add-goal {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px dashed #343B4D;
  background: transparent;
  color: #C9CEDA;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-goal:hover {
  color: #7CF0D0;
  border-color: #7CF0D0;
}

/* Cartes d'objectifs */
.goals-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.goal-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 14px;
  background: #12151C;
  border: 1px solid #1F2430;
  transition: border-color 0.15s ease;
}

.goal-card.completed {
  border-color: rgba(124, 240, 208, 0.45);
}

.goal-header-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.goal-avatar-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  background: #0B0D12;
  flex-shrink: 0;
}

.goal-avatar-wrap.is-weapon {
  border-radius: 10px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.goal-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.goal-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #F2F3F7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goal-sub {
  font-size: 0.72rem;
  color: #8F97AA;
}

.progress-fraction {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: #8F97AA;
}

.progress-fraction.text-mint {
  color: #7CF0D0;
}

.btn-edit-goal {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #2A3040;
  background: #161A23;
  color: #C9CEDA;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-edit-goal:hover {
  color: #7CF0D0;
  border-color: #7CF0D0;
}

/* Jauge de progression */
.progress-track {
  height: 4px;
  border-radius: 4px;
  background: #1F2430;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.25s ease;
}

/* Checklist */
.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-top: 0.25rem;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  user-select: none;
}

.check-box {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #7CF0D0;
  cursor: pointer;
}

.check-label {
  width: 72px;
  font-size: 0.75rem;
  color: #8F97AA;
}

.check-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: #E7E9EE;
}

.check-value.done {
  text-decoration: line-through;
  color: #6E768A;
}

.talents-badges {
  display: flex;
  gap: 0.35rem;
}

.tal-badge {
  padding: 2px 6px;
  border-radius: 5px;
  background: #181C25;
  border: 1px solid #262B38;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: #D5D9E3;
}

.talents-badges.done .tal-badge {
  opacity: 0.45;
  text-decoration: line-through;
}

.tag-badge {
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid;
  font-size: 0.68rem;
  font-weight: 700;
}

.artifact-badges.done .tag-badge {
  opacity: 0.45;
  text-decoration: line-through;
}

.empty-tier-box {
  padding: 2rem 1rem;
  text-align: center;
  border-radius: 12px;
  border: 1px dashed #2A3040;
  background: transparent;
  color: #6E768A;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.empty-tier-box:hover {
  border-color: #7CF0D0;
  color: #7CF0D0;
}

/* Modale */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(5, 6, 10, 0.82);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.planner-dialog {
  width: 980px;
  max-height: 92vh;
  background: #10131A;
  border: 1px solid #262B38;
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.dialog-title {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: #F2F3F7;
}

.kind-pills {
  display: flex;
  gap: 0.25rem;
  padding: 2px;
  background: #0B0D12;
  border: 1px solid #1F2430;
  border-radius: 8px;
}

.kind-btn {
  height: 28px;
  padding: 0 0.85rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #8F97AA;
  cursor: pointer;
}

.kind-btn.active {
  color: #0B0D12;
  background: #7CF0D0;
}

.btn-close-dialog {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #2A3040;
  background: transparent;
  color: #8F97AA;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dialog-body {
  display: flex;
  flex-direction: column;
}

.dialog-layout {
  display: flex;
  gap: 1.5rem;
}

.dialog-pick-column {
  width: 440px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.column-pick-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #7A8296;
}

.dialog-chars-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.dialog-char-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.25rem;
  border-radius: 10px;
  background: #141821;
  border: 1px solid #222734;
  color: #E7E9EE;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dialog-char-tile.active {
  border-color: #7CF0D0;
  background: rgba(124, 240, 208, 0.08);
}

.tile-avatar-wrap {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
}

.tile-char-name {
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.dialog-weapons-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.dialog-weapon-tile {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem;
  border-radius: 10px;
  background: #141821;
  border: 1px solid #222734;
  color: #E7E9EE;
  cursor: pointer;
  text-align: left;
}

.dialog-weapon-tile.active {
  border-color: #F3C552;
  background: rgba(243, 197, 82, 0.08);
}

.tile-weapon-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #0B0D12;
  border: 1px solid #2A3040;
  overflow: hidden;
  flex-shrink: 0;
}

.tile-weapon-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.tile-weapon-name {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-weapon-sub {
  font-size: 0.68rem;
  color: #8F97AA;
}

/* Paramètres */
.dialog-params-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.param-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #7A8296;
}

.tier-pick-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.tier-btn-choice {
  height: 36px;
  border-radius: 8px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #8F97AA;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.steppers-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.steppers-grid.three-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stepper-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: #0F1218;
  border: 1px solid #1F2430;
}

.stepper-title {
  font-size: 0.72rem;
  color: #8F97AA;
}

.stepper-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-step {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #2A3040;
  background: #161A23;
  color: #E7E9EE;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.stepper-val {
  width: 26px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88rem;
  font-weight: 700;
  color: #E7E9EE;
}

.artifact-actions-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}

.tag-choice-btn {
  height: 34px;
  padding: 0 0.5rem;
  border-radius: 7px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #8F97AA;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.refinement-pills-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.4rem;
}

.ref-pill-btn {
  height: 34px;
  border-radius: 7px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #8F97AA;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.ref-pill-btn.active {
  color: #0B0D12;
  background: #F3C552;
  border-color: #F3C552;
}

/* Footer Dialog */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid #1F2430;
}

.btn-delete-goal {
  height: 38px;
  padding: 0 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.4);
  background: transparent;
  color: #FF8A8A;
  font-size: 0.8rem;
  font-weight: 600;
}

.footer-actions-right {
  display: flex;
  gap: 0.65rem;
  margin-left: auto;
}

.btn-cancel {
  height: 38px;
  padding: 0 1.15rem;
  border-radius: 8px;
  border: 1px solid #2A3040;
  background: transparent;
  color: #D5D9E3;
  font-size: 0.82rem;
  font-weight: 600;
}

.btn-save-goal {
  height: 38px;
  padding: 0 1.35rem;
  border-radius: 8px;
  border: 1px solid #7CF0D0;
  background: #7CF0D0;
  color: #0B0D12;
  font-size: 0.85rem;
  font-weight: 700;
}
</style>
