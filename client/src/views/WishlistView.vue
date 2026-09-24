<script setup>
import { ref } from 'vue';
import { getIconUrl, fetchWishlist, createWishlistItem, updateWishlistItem, deleteWishlistItem, reorderWishlist } from '../api.js';

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

const wishlist = ref([]);
const loading = ref(false);
const showAddModal = ref(false);

const newItem = ref({
  item_type: 'character',
  selected_id: '',
  name: '',
  icon: '',
  constellation_level: 1,
  notes: ''
});

async function loadWishlist() {
  loading.value = true;
  try {
    wishlist.value = await fetchWishlist();
  } catch (err) {
    console.error('Erreur chargement wishlist:', err);
  } finally {
    loading.value = false;
  }
}

loadWishlist();

function onSelectionChange(e) {
  const val = e.target.value;
  if (!val) return;
  const [type, idStr] = val.split('_');
  if (type === 'avatar') {
    const char = props.characters.find(c => c.id === val);
    if (char) {
      newItem.value.name = char.name;
      newItem.value.icon = char.icon;
      newItem.value.item_id = Number(idStr);
    }
  } else if (type === 'weapon') {
    const wep = props.weapons.find(w => w.id === val);
    if (wep) {
      newItem.value.name = wep.name;
      newItem.value.icon = wep.icon;
      newItem.value.item_id = Number(idStr);
    }
  }
}

async function addItem() {
  const payload = {
    item_type: newItem.value.item_type,
    item_id: newItem.value.item_id,
    name: newItem.value.name,
    icon: newItem.value.icon,
    constellation_level: newItem.value.item_type === 'constellation' ? newItem.value.constellation_level : null,
    notes: newItem.value.notes
  };

  await createWishlistItem(payload);
  showAddModal.value = false;
  await loadWishlist();
}

async function move(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= wishlist.value.length) return;

  const temp = wishlist.value[index];
  wishlist.value[index] = wishlist.value[targetIndex];
  wishlist.value[targetIndex] = temp;

  const ids = wishlist.value.map(i => i.id);
  await reorderWishlist(ids);
  await loadWishlist();
}

async function setStatus(item, status) {
  item.status = status;
  await updateWishlistItem(item.id, { status });
}

async function removeItem(id) {
  if (confirm('Supprimer cette priorité de la roadmap ?')) {
    await deleteWishlistItem(id);
    await loadWishlist();
  }
}
</script>

<template>
  <div class="wishlist-view">
    <div class="header-actions">
      <div>
        <h2 class="section-heading">🌟 Roadmap d'Invocations</h2>
        <p class="section-sub">Définissez l'ordre exact de vos priorités (Perso > Arme > C1...) et suivez vos paliers.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="showAddModal = true">
        + Ajouter une priorité
      </button>
    </div>

    <!-- Liste ordonnée de la Roadmap -->
    <div v-if="wishlist.length === 0" class="empty-state card">
      <p>Aucune priorité définie. Cliquez sur "+ Ajouter une priorité" pour planifier vos prochains vœux !</p>
    </div>

    <div class="roadmap-list">
      <div
        v-for="(item, idx) in wishlist"
        :key="item.id"
        :class="['roadmap-item card', { obtained: item.status === 'obtained' }]"
      >
        <!-- Numéro d'ordre séquentiel -->
        <div class="order-badge">
          #{{ idx + 1 }}
        </div>

        <!-- Icône de la cible -->
        <div class="item-avatar-box">
          <img :src="getIconUrl(item.icon)" :alt="item.name" class="item-avatar" />
        </div>

        <!-- Détails de la priorité -->
        <div class="item-details">
          <div class="item-name-row">
            <h3 class="item-title">{{ item.name }}</h3>
            <span v-if="item.item_type === 'character'" class="type-tag tag-char">👤 Personnage (C0)</span>
            <span v-else-if="item.item_type === 'constellation'" class="type-tag tag-const">⭐ Constellation C{{ item.constellation_level }}</span>
            <span v-else-if="item.item_type === 'weapon'" class="type-tag tag-weapon">🗡️ Arme Signature</span>
          </div>
          <p v-if="item.notes" class="item-notes">💬 {{ item.notes }}</p>
        </div>

        <!-- Statut d'avancement -->
        <div class="status-actions">
          <button
            type="button"
            :class="['status-btn', { active: item.status === 'active' }]"
            @click="setStatus(item, 'active')"
          >
            🎯 En cours
          </button>
          <button
            type="button"
            :class="['status-btn', { active: item.status === 'obtained' }]"
            @click="setStatus(item, 'obtained')"
          >
            ✅ Obtenu
          </button>
        </div>

        <!-- Boutons de réordonnancement -->
        <div class="reorder-actions">
          <button
            type="button"
            class="arrow-btn"
            :disabled="idx === 0"
            @click="move(idx, -1)"
            title="Monter la priorité"
          >
            ▲
          </button>
          <button
            type="button"
            class="arrow-btn"
            :disabled="idx === wishlist.length - 1"
            @click="move(idx, 1)"
            title="Descendre la priorité"
          >
            ▼
          </button>
          <button
            type="button"
            class="del-btn"
            @click="removeItem(item.id)"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Modal d'ajout de priorité -->
    <dialog v-if="showAddModal" open class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Ajouter une priorité d'invocation</h2>
          <button type="button" class="btn-close" @click="showAddModal = false">✕</button>
        </div>

        <form class="modal-form" @submit.prevent="addItem">
          <div class="grid-2">
            <label class="form-group">
              <span class="label-text">Type d'objectif</span>
              <select v-model="newItem.item_type" class="input-field select-field">
                <option value="character">👤 Personnage (C0)</option>
                <option value="constellation">⭐ Constellation spécifique</option>
                <option value="weapon">🗡️ Arme Signature</option>
              </select>
            </label>

            <label v-if="newItem.item_type === 'constellation'" class="form-group">
              <span class="label-text">Niveau de Constellation</span>
              <select v-model.number="newItem.constellation_level" class="input-field select-field">
                <option :value="1">C1</option>
                <option :value="2">C2</option>
                <option :value="3">C3</option>
                <option :value="4">C4</option>
                <option :value="5">C5</option>
                <option :value="6">C6</option>
              </select>
            </label>
          </div>

          <!-- Sélection de l'item selon le type -->
          <label class="form-group">
            <span class="label-text">Cible</span>
            <select class="input-field select-field" required @change="onSelectionChange">
              <option value="">-- Choisir dans la liste --</option>
              <optgroup v-if="newItem.item_type !== 'weapon'" label="Personnages">
                <option v-for="c in characters" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.element }})
                </option>
              </optgroup>
              <optgroup v-if="newItem.item_type === 'weapon'" label="Armes">
                <option v-for="w in weapons" :key="w.id" :value="w.id">
                  {{ w.rarity }}★ {{ w.name }}
                </option>
              </optgroup>
            </select>
          </label>

          <label class="form-group">
            <span class="label-text">Notes & Remarques</span>
            <input v-model="newItem.notes" type="text" class="input-field" placeholder="ex: Garder pour la bannière 5.3..." />
          </label>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showAddModal = false">Annuler</button>
            <button type="submit" class="btn btn-primary">Ajouter à la roadmap</button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.wishlist-view {
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

.roadmap-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.roadmap-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
}

.roadmap-item.obtained {
  opacity: 0.55;
  background: rgba(18, 24, 36, 0.4);
}

.order-badge {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-hydro);
  width: 45px;
  text-align: center;
}

.item-avatar-box {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  background: #181d28;
  border: 1px solid var(--border-accent);
  overflow: hidden;
  flex-shrink: 0;
}

.item-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.item-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.item-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.type-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
}

.tag-char { background: rgba(51, 230, 184, 0.15); color: #6ee7b7; border: 1px solid rgba(51, 230, 184, 0.3); }
.tag-const { background: rgba(229, 155, 53, 0.15); color: #fde047; border: 1px solid rgba(229, 155, 53, 0.3); }
.tag-weapon { background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3); }

.item-notes {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.status-actions {
  display: flex;
  gap: 0.35rem;
}

.status-btn {
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  transition: all 0.15s;
}

.status-btn.active {
  background: var(--bg-surface-active);
  color: #fff;
  border-color: var(--border-accent);
}

.reorder-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.arrow-btn {
  padding: 0.35rem 0.55rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.arrow-btn:hover:not(:disabled) {
  color: #fff;
  border-color: var(--border-accent);
}

.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.del-btn {
  padding: 0.35rem 0.55rem;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.del-btn:hover {
  color: #ef4444;
}

.modal-dialog {
  width: 540px;
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

.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--text-dim);
}
</style>
