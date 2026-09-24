<script setup>
import { ref, computed } from 'vue';
import { getIconUrl, ELEMENT_COLORS, fetchPlanner, createPlannerItem, updatePlannerItem, deletePlannerItem } from '../api.js';

const props = defineProps({
  characters: {
    type: Array,
    default: () => []
  },
  weapons: {
    type: Array,
    default: () => []
  }
});

const plannerItems = ref([]);
const loading = ref(false);
const showAddModal = ref(false);

const newGoal = ref({
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
  artifact_action: 'substat_farm',
  artifact_notes: ''
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

function onSelectTarget(e) {
  const val = e.target.value;
  if (!val) return;
  const [type, idStr] = val.split('_');
  if (type === 'avatar') {
    const char = props.characters.find(c => c.id === val);
    if (char) {
      newGoal.value.target_type = 'character';
      newGoal.value.character_id = Number(idStr);
      newGoal.value.name = char.name;
      newGoal.value.icon = char.icon;
    }
  } else if (type === 'weapon') {
    const wep = props.weapons.find(w => w.id === val);
    if (wep) {
      newGoal.value.target_type = 'weapon';
      newGoal.value.weapon_id = Number(idStr);
      newGoal.value.name = wep.name;
      newGoal.value.icon = wep.icon;
    }
  }
}

async function addGoal() {
  await createPlannerItem(newGoal.value);
  showAddModal.value = false;
  await loadPlanner();
}

async function toggleCheck(item, field) {
  const newVal = item[field] ? 0 : 1;
  item[field] = newVal;
  await updatePlannerItem(item.id, { [field]: newVal });
}

async function changeTier(item, newTier) {
  item.tier = newTier;
  await updatePlannerItem(item.id, { tier: newTier });
  await loadPlanner();
}

async function removeGoal(id) {
  if (confirm('Supprimer cet objectif de montée ?')) {
    await deletePlannerItem(id);
    await loadPlanner();
  }
}

const artifactActionLabels = {
  none: 'Aucune action',
  set_change: '🔄 Changement de set',
  upgrade_levels: '⬆️ Up +20 des pièces',
  substat_farm: '🎯 Optimisation sous-stats',
  completed: '✅ Set prêt'
};
</script>

<template>
  <div class="planner-view">
    <div class="header-actions">
      <div>
        <h2 class="section-heading">📈 Planificateur de Montée</h2>
        <p class="section-sub">Priorisez vos investissements de résine par Tier et suivez vos paliers précis.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="showAddModal = true">
        + Ajouter un objectif
      </button>
    </div>

    <!-- Sections par Tier -->
    <div class="tiers-container">
      <!-- Tier S -->
      <section class="tier-section">
        <div class="tier-header tier-s">
          <span class="tier-badge">TIER S</span>
          <span class="tier-desc">Priorité Absolue • Farm immédiat</span>
          <span class="tier-count">({{ itemsByTier.S.length }})</span>
        </div>

        <div v-if="itemsByTier.S.length === 0" class="empty-tier">
          Aucun objectif en Tier S.
        </div>
        <div class="goals-grid">
          <div v-for="item in itemsByTier.S" :key="item.id" class="goal-card card">
            <div class="goal-main">
              <div class="goal-avatar-box">
                <img :src="getIconUrl(item.icon)" :alt="item.name" class="goal-avatar" />
              </div>
              <div class="goal-info">
                <div class="goal-top-row">
                  <h3 class="goal-name">{{ item.name }}</h3>
                  <div class="tier-changer">
                    <button type="button" class="tier-btn" @click="changeTier(item, 'A')">→ A</button>
                    <button type="button" class="tier-btn" @click="changeTier(item, 'B')">→ B</button>
                    <button type="button" class="btn-del" @click="removeGoal(item.id)">✕</button>
                  </div>
                </div>

                <!-- Checklists d'objectifs -->
                <div class="checklist">
                  <!-- Niveau -->
                  <label class="check-item">
                    <input
                      type="checkbox"
                      :checked="!!item.is_level_done"
                      @change="toggleCheck(item, 'is_level_done')"
                    />
                    <span class="check-text">
                      Niveau : <strong>{{ item.current_level }} → {{ item.target_level }}</strong>
                    </span>
                  </label>

                  <!-- Aptitudes -->
                  <label v-if="item.target_type === 'character'" class="check-item">
                    <input
                      type="checkbox"
                      :checked="!!item.is_talents_done"
                      @change="toggleCheck(item, 'is_talents_done')"
                    />
                    <span class="check-text">
                      Aptitudes : <strong>{{ item.talent_normal_target }} / {{ item.talent_skill_target }} / {{ item.talent_burst_target }}</strong>
                    </span>
                  </label>

                  <!-- Arme -->
                  <label class="check-item">
                    <input
                      type="checkbox"
                      :checked="!!item.is_weapon_done"
                      @change="toggleCheck(item, 'is_weapon_done')"
                    />
                    <span class="check-text">
                      Arme : <strong>Niv. {{ item.weapon_target_level }}</strong>
                    </span>
                  </label>

                  <!-- Artéfacts -->
                  <div class="artifact-goal-row">
                    <label class="check-item">
                      <input
                        type="checkbox"
                        :checked="!!item.is_artifacts_done"
                        @change="toggleCheck(item, 'is_artifacts_done')"
                      />
                      <span class="check-text">Artéfacts :</span>
                    </label>
                    <span class="artifact-badge">{{ artifactActionLabels[item.artifact_action] || item.artifact_action }}</span>
                  </div>
                  <p v-if="item.artifact_notes" class="artifact-note">💬 {{ item.artifact_notes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Tier A -->
      <section class="tier-section">
        <div class="tier-header tier-a">
          <span class="tier-badge">TIER A</span>
          <span class="tier-desc">Prochains sur la liste • Secondaire</span>
          <span class="tier-count">({{ itemsByTier.A.length }})</span>
        </div>

        <div v-if="itemsByTier.A.length === 0" class="empty-tier">
          Aucun objectif en Tier A.
        </div>
        <div class="goals-grid">
          <div v-for="item in itemsByTier.A" :key="item.id" class="goal-card card">
            <div class="goal-main">
              <div class="goal-avatar-box">
                <img :src="getIconUrl(item.icon)" :alt="item.name" class="goal-avatar" />
              </div>
              <div class="goal-info">
                <div class="goal-top-row">
                  <h3 class="goal-name">{{ item.name }}</h3>
                  <div class="tier-changer">
                    <button type="button" class="tier-btn" @click="changeTier(item, 'S')">↑ S</button>
                    <button type="button" class="tier-btn" @click="changeTier(item, 'B')">↓ B</button>
                    <button type="button" class="btn-del" @click="removeGoal(item.id)">✕</button>
                  </div>
                </div>

                <div class="checklist">
                  <label class="check-item">
                    <input type="checkbox" :checked="!!item.is_level_done" @change="toggleCheck(item, 'is_level_done')" />
                    <span class="check-text">Niv : {{ item.current_level }} → {{ item.target_level }}</span>
                  </label>
                  <label v-if="item.target_type === 'character'" class="check-item">
                    <input type="checkbox" :checked="!!item.is_talents_done" @change="toggleCheck(item, 'is_talents_done')" />
                    <span class="check-text">Aptitudes : {{ item.talent_normal_target }}/{{ item.talent_skill_target }}/{{ item.talent_burst_target }}</span>
                  </label>
                  <div class="artifact-goal-row">
                    <label class="check-item">
                      <input type="checkbox" :checked="!!item.is_artifacts_done" @change="toggleCheck(item, 'is_artifacts_done')" />
                      <span class="check-text">Artéfacts :</span>
                    </label>
                    <span class="artifact-badge">{{ artifactActionLabels[item.artifact_action] }}</span>
                  </div>
                  <p v-if="item.artifact_notes" class="artifact-note">💬 {{ item.artifact_notes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Tier B -->
      <section class="tier-section">
        <div class="tier-header tier-b">
          <span class="tier-badge">TIER B</span>
          <span class="tier-desc">Backlog • Futur investissement</span>
          <span class="tier-count">({{ itemsByTier.B.length }})</span>
        </div>

        <div v-if="itemsByTier.B.length === 0" class="empty-tier">
          Aucun objectif en Tier B.
        </div>
        <div class="goals-grid">
          <div v-for="item in itemsByTier.B" :key="item.id" class="goal-card card">
            <div class="goal-main">
              <div class="goal-avatar-box">
                <img :src="getIconUrl(item.icon)" :alt="item.name" class="goal-avatar" />
              </div>
              <div class="goal-info">
                <div class="goal-top-row">
                  <h3 class="goal-name">{{ item.name }}</h3>
                  <div class="tier-changer">
                    <button type="button" class="tier-btn" @click="changeTier(item, 'S')">↑ S</button>
                    <button type="button" class="tier-btn" @click="changeTier(item, 'A')">↑ A</button>
                    <button type="button" class="btn-del" @click="removeGoal(item.id)">✕</button>
                  </div>
                </div>

                <div class="checklist">
                  <label class="check-item">
                    <input type="checkbox" :checked="!!item.is_level_done" @change="toggleCheck(item, 'is_level_done')" />
                    <span class="check-text">Niv : {{ item.current_level }} → {{ item.target_level }}</span>
                  </label>
                  <label v-if="item.target_type === 'character'" class="check-item">
                    <input type="checkbox" :checked="!!item.is_talents_done" @change="toggleCheck(item, 'is_talents_done')" />
                    <span class="check-text">Aptitudes : {{ item.talent_normal_target }}/{{ item.talent_skill_target }}/{{ item.talent_burst_target }}</span>
                  </label>
                  <div class="artifact-goal-row">
                    <span class="artifact-badge">{{ artifactActionLabels[item.artifact_action] }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modal Ajout Objectif -->
    <dialog v-if="showAddModal" open class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Ajouter un objectif de farm</h2>
          <button type="button" class="btn-close" @click="showAddModal = false">✕</button>
        </div>

        <form class="modal-form" @submit.prevent="addGoal">
          <label class="form-group">
            <span class="label-text">Choisir une cible (Personnage ou Arme)</span>
            <select class="input-field select-field" required @change="onSelectTarget">
              <option value="">-- Sélectionner dans le jeu --</option>
              <optgroup label="Personnages">
                <option v-for="c in characters" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.element }})
                </option>
              </optgroup>
              <optgroup label="Armes">
                <option v-for="w in weapons" :key="w.id" :value="w.id">
                  {{ w.rarity }}★ {{ w.name }}
                </option>
              </optgroup>
            </select>
          </label>

          <div class="grid-2">
            <label class="form-group">
              <span class="label-text">Tier de Priorité</span>
              <select v-model="newGoal.tier" class="input-field select-field">
                <option value="S">🔥 Tier S (Priorité Absolue)</option>
                <option value="A">⭐ Tier A (Prochains)</option>
                <option value="B">💤 Tier B (Secondaire / Backlog)</option>
              </select>
            </label>

            <label class="form-group">
              <span class="label-text">Action Artéfacts</span>
              <select v-model="newGoal.artifact_action" class="input-field select-field">
                <option value="none">Aucune</option>
                <option value="set_change">🔄 Changement complet de set</option>
                <option value="upgrade_levels">⬆️ Amélioration +20</option>
                <option value="substat_farm">🎯 Farm de sous-stats</option>
                <option value="completed">✅ Déjà terminé</option>
              </select>
            </label>
          </div>

          <div class="grid-2">
            <label class="form-group">
              <span class="label-text">Niveau Actuel</span>
              <input v-model.number="newGoal.current_level" type="number" min="1" max="90" class="input-field" />
            </label>
            <label class="form-group">
              <span class="label-text">Niveau Cible</span>
              <input v-model.number="newGoal.target_level" type="number" min="1" max="90" class="input-field" />
            </label>
          </div>

          <div v-if="newGoal.target_type === 'character'" class="grid-3">
            <label class="form-group">
              <span class="label-text">Attaque Normale (Cible)</span>
              <input v-model.number="newGoal.talent_normal_target" type="number" min="1" max="10" class="input-field" />
            </label>
            <label class="form-group">
              <span class="label-text">Compétence E (Cible)</span>
              <input v-model.number="newGoal.talent_skill_target" type="number" min="1" max="10" class="input-field" />
            </label>
            <label class="form-group">
              <span class="label-text">Déchaînement Q (Cible)</span>
              <input v-model.number="newGoal.talent_burst_target" type="number" min="1" max="10" class="input-field" />
            </label>
          </div>

          <label class="form-group">
            <span class="label-text">Précisions Artéfacts & Notes</span>
            <input v-model="newGoal.artifact_notes" type="text" class="input-field" placeholder="ex: Viser 70% TC / 140% DC, besoin sablier RE..." />
          </label>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Ajouter au planificateur</button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.planner-view {
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

.tiers-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tier-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.tier-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-sm);
}

.tier-header.tier-s { background: rgba(239, 68, 68, 0.15); border-left: 4px solid var(--tier-s); }
.tier-header.tier-a { background: rgba(245, 158, 11, 0.15); border-left: 4px solid var(--tier-a); }
.tier-header.tier-b { background: rgba(59, 130, 246, 0.15); border-left: 4px solid var(--tier-b); }

.tier-badge {
  font-weight: 800;
  font-size: 0.9rem;
}

.tier-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.tier-count {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin-left: auto;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.goal-card {
  padding: 1rem;
}

.goal-main {
  display: flex;
  gap: 0.85rem;
}

.goal-avatar-box {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-sm);
  background: #181d28;
  border: 1px solid var(--border-accent);
  overflow: hidden;
  flex-shrink: 0;
}

.goal-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.goal-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.goal-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.goal-name {
  font-size: 0.95rem;
  font-weight: 700;
}

.tier-changer {
  display: flex;
  gap: 0.25rem;
}

.tier-btn {
  padding: 2px 6px;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
}
.tier-btn:hover {
  color: #fff;
  border-color: var(--border-accent);
}

.btn-del {
  padding: 2px 6px;
  color: var(--text-dim);
  font-size: 0.75rem;
}
.btn-del:hover {
  color: #ef4444;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  cursor: pointer;
}

.check-item input[type="checkbox"] {
  accent-color: var(--color-anemo);
  cursor: pointer;
}

.artifact-goal-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.15rem;
}

.artifact-badge {
  font-size: 0.7rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-hydro);
}

.artifact-note {
  font-size: 0.72rem;
  color: var(--text-dim);
  margin-top: 0.15rem;
}

.empty-tier {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-dim);
  background: var(--bg-surface);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-sm);
}

.modal-dialog {
  width: 580px;
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
  font-size: 1.2rem;
  font-weight: 700;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
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
</style>
