<script setup>
import { ref, computed } from 'vue';
import {
  getIconUrl,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  WEAPON_LABELS,
  WEAPON_SVGS,
  fetchWishlist,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  reorderWishlist
} from '../api.js';

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
const viewMode = ref('sequential'); // 'sequential' | 'tiers'

const TIERS = [
  { key: 'S', label: 'Tier S', sub: 'Priorité Absolue', icon: '🔥', color: '#FF6B6B' },
  { key: 'A', label: 'Tier A', sub: 'Priorité Moyenne', icon: '⭐', color: '#F3C552' },
  { key: 'B', label: 'Tier B', sub: 'Futur / Attente', icon: '💤', color: '#7CF0D0' }
];

const BADGE_MAP = {
  character: { label: 'Personnage', color: '#7CF0D0' },
  weapon: { label: 'Arme', color: '#F3C552' },
  constellation: { label: 'Constellation', color: '#C29BFF' }
};

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

const totalCount = computed(() => wishlist.value.length);
const obtainedCount = computed(() => wishlist.value.filter(i => i.status === 'obtained').length);
const progressPercent = computed(() => totalCount.value > 0 ? Math.round((obtainedCount.value / totalCount.value) * 100) : 0);

const pendingList = computed(() => wishlist.value.filter(i => i.status !== 'obtained'));

const itemsByTier = computed(() => ({
  S: wishlist.value.filter(i => (i.priority_tier || 'S') === 'S'),
  A: wishlist.value.filter(i => i.priority_tier === 'A'),
  B: wishlist.value.filter(i => i.priority_tier === 'B')
}));

const nextTarget = computed(() => {
  if (pendingList.value.length === 0) return 'Tout est obtenu ! 🎉';
  const first = pendingList.value[0];
  const tag = first.item_type === 'constellation' ? `C${first.constellation_level}` : (first.item_type === 'weapon' ? 'R1' : 'C0');
  return `${first.name} ${tag}`;
});

const typeCounts = computed(() => {
  const map = { character: 0, weapon: 0, constellation: 0 };
  wishlist.value.forEach(w => {
    if (map[w.item_type] !== undefined) map[w.item_type]++;
  });
  return [
    { type: 'character', label: 'Personnage', color: '#7CF0D0', count: map.character },
    { type: 'weapon', label: 'Arme', color: '#F3C552', count: map.weapon },
    { type: 'constellation', label: 'Constellation', color: '#C29BFF', count: map.constellation }
  ];
});

async function toggleStatus(item) {
  const nextStatus = item.status === 'obtained' ? 'active' : 'obtained';
  item.status = nextStatus;
  try {
    await updateWishlistItem(item.id, {
      ...item,
      status: nextStatus
    });
  } catch (err) {
    console.error('Erreur mise à jour statut:', err);
  }
}

async function updateTier(item, newTier) {
  item.priority_tier = newTier;
  try {
    await updateWishlistItem(item.id, {
      priority_tier: newTier
    });
  } catch (err) {
    console.error('Erreur mise à jour tier:', err);
  }
}

async function moveItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= wishlist.value.length) return;

  const list = wishlist.value.slice();
  const temp = list[index];
  list[index] = list[newIndex];
  list[newIndex] = temp;
  wishlist.value = list;

  try {
    const ids = list.map(i => i.id);
    await reorderWishlist(ids);
  } catch (err) {
    console.error('Erreur réordonnancement:', err);
  }
}

async function removeItem(id) {
  try {
    await deleteWishlistItem(id);
    wishlist.value = wishlist.value.filter(i => i.id !== id);
  } catch (err) {
    console.error('Erreur suppression:', err);
  }
}

// -------------------------------------------------------------
// MODALE D'AJOUT RAPIDE
// -------------------------------------------------------------
const addForm = ref({
  item_type: 'character',
  item_id: null,
  name: '',
  icon: '',
  constellation_level: 1,
  priority_tier: 'S',
  notes: ''
});

function openModal() {
  const defChar = props.characters[0];
  addForm.value = {
    item_type: 'character',
    item_id: defChar ? Number(defChar.id.replace('avatar_', '')) : null,
    name: defChar ? defChar.name : '',
    icon: defChar ? defChar.icon : '',
    constellation_level: 1,
    priority_tier: 'S',
    notes: ''
  };
  showAddModal.value = true;
}

function selectCharForWish(c) {
  addForm.value.item_id = Number(c.id.replace('avatar_', ''));
  addForm.value.name = c.name;
  addForm.value.icon = c.icon;
}

function selectWeaponForWish(w) {
  addForm.value.item_id = Number(w.id.replace('weapon_', ''));
  addForm.value.name = w.name;
  addForm.value.icon = w.icon;
}

async function handleSaveNewWish() {
  if (!addForm.value.name) return;
  const payload = {
    item_type: addForm.value.item_type,
    item_id: addForm.value.item_id,
    name: addForm.value.name,
    icon: addForm.value.icon,
    constellation_level: addForm.value.item_type === 'constellation' ? addForm.value.constellation_level : null,
    priority_tier: addForm.value.priority_tier || 'S',
    notes: addForm.value.notes
  };

  try {
    const res = await createWishlistItem(payload);
    payload.id = res.id;
    payload.status = 'active';
    wishlist.value.push(payload);
    showAddModal.value = false;
  } catch (err) {
    console.error('Erreur création souhait:', err);
  }
}
</script>

<template>
  <div class="wishlist-view">
    <!-- Barre Supérieure de Navigation & Actions -->
    <div class="wishlist-top-bar">
      <div class="view-mode-tabs">
        <button
          type="button"
          :class="['mode-tab', { active: viewMode === 'sequential' }]"
          @click="viewMode = 'sequential'"
        >
          <span class="tab-icon">📋</span>
          <span>Ordre Séquentiel (#1, #2...)</span>
        </button>
        <button
          type="button"
          :class="['mode-tab', { active: viewMode === 'tiers' }]"
          @click="viewMode = 'tiers'"
        >
          <span class="tab-icon">🔥</span>
          <span>Vue par Tiers (S / A / B)</span>
        </button>
      </div>

      <button type="button" class="btn-add-wish" @click="openModal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nouveau souhait
      </button>
    </div>

    <!-- VUE 1 : ORDRE SÉQUENTIEL -->
    <template v-if="viewMode === 'sequential'">
      <!-- Fil d'ordre horizontal (Breadcrumb de priorité) -->
      <div class="priority-path-banner">
        <span class="path-title">ORDRE :</span>
        <div class="path-scroll-area">
          <template v-for="(item, idx) in pendingList" :key="item.id">
            <span
              class="path-chip"
              :style="{
                color: BADGE_MAP[item.item_type]?.color || '#E7E9EE',
                background: `${BADGE_MAP[item.item_type]?.color || '#7CF0D0'}15`
              }"
            >
              {{ item.name }} {{ item.item_type === 'constellation' ? `C${item.constellation_level}` : (item.item_type === 'weapon' ? 'R1' : 'C0') }}
            </span>
            <span v-if="idx < pendingList.length - 1" class="path-arrow">›</span>
          </template>
          <span v-if="pendingList.length === 0" class="path-done-msg">
            Tous vos vœux programmés ont été réalisés !
          </span>
        </div>
      </div>

      <!-- Disposition : Liste Principale + Panneau Métriques à droite -->
      <div class="wishlist-layout">
        <!-- Liste ordonnée des souhaits -->
        <ol class="wishes-list">
          <li
            v-for="(item, idx) in wishlist"
            :key="item.id"
            :class="['wish-row-card', { obtained: item.status === 'obtained' }]"
          >
            <!-- Numéro d'ordre (01, 02, ...) -->
            <span class="rank-badge">
              {{ (idx + 1) < 10 ? '0' + (idx + 1) : (idx + 1) }}
            </span>

            <!-- Avatar / Icône Arme -->
            <div
              class="wish-avatar-frame"
              :class="{ 'is-weapon': item.item_type === 'weapon' }"
              :style="{
                borderColor: BADGE_MAP[item.item_type]?.color || '#7CF0D0'
              }"
            >
              <img
                v-if="item.icon"
                :src="getIconUrl(item.icon)"
                :alt="item.name"
                class="avatar-img"
              />
            </div>

            <!-- Détails du Souhait -->
            <div class="wish-main-info">
              <div class="name-line">
                <span class="wish-item-name">{{ item.name }}</span>
                <span class="target-tag">
                  {{ item.item_type === 'constellation' ? `C${item.constellation_level}` : (item.item_type === 'weapon' ? 'R1' : 'C0') }}
                </span>
              </div>
              <span class="wish-sub-notes">
                {{ item.notes || (item.item_type === 'character' ? 'Personnage 5★' : (item.item_type === 'weapon' ? 'Arme 5★' : `Constellation ${item.constellation_level}`)) }}
              </span>
            </div>

            <!-- Badge Catégorie -->
            <span
              class="category-badge"
              :style="{
                color: BADGE_MAP[item.item_type]?.color || '#7CF0D0',
                borderColor: `${BADGE_MAP[item.item_type]?.color || '#7CF0D0'}45`,
                background: `${BADGE_MAP[item.item_type]?.color || '#7CF0D0'}15`
              }"
            >
              {{ BADGE_MAP[item.item_type]?.label || item.item_type }}
            </span>

            <!-- Sélecteur rapide de Tier (S / A / B) -->
            <div class="tier-quick-pick" title="Changer le Tier de priorité">
              <button
                v-for="t in TIERS"
                :key="t.key"
                type="button"
                :class="['tier-mini-pill', { active: (item.priority_tier || 'S') === t.key }]"
                :style="(item.priority_tier || 'S') === t.key ? { color: t.color, borderColor: t.color, background: `${t.color}20` } : {}"
                @click="updateTier(item, t.key)"
              >
                {{ t.key }}
              </button>
            </div>

            <!-- Boutons de réorganisation immédiate ↑ et ↓ -->
            <div class="reorder-btns">
              <button
                type="button"
                class="btn-order"
                :disabled="idx === 0"
                title="Monter la priorité"
                @click="moveItem(idx, -1)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                class="btn-order"
                :disabled="idx === wishlist.length - 1"
                title="Baisser la priorité"
                @click="moveItem(idx, 1)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </button>
            </div>

            <!-- Bouton Toggle Obtenu -->
            <button
              type="button"
              :class="['btn-toggle-status', { active: item.status === 'obtained' }]"
              @click="toggleStatus(item)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {{ item.status === 'obtained' ? 'Obtenu' : 'Marquer obtenu' }}
            </button>

            <!-- Bouton Supprimer -->
            <button
              type="button"
              class="btn-remove-wish"
              title="Supprimer ce souhait"
              @click="removeItem(item.id)"
            >
              ✕
            </button>
          </li>

          <li v-if="wishlist.length === 0" class="empty-wishes-box">
            Aucun souhait programmé. Cliquez sur « Nouveau souhait » pour planifier votre roadmap.
          </li>
        </ol>

        <!-- Panneau Latéral : Progression & Prochaine Cible -->
        <aside class="wishlist-sidebar">
          <!-- Progression globale -->
          <div class="sidebar-block">
            <span class="block-kicker">Progression</span>
            <div class="progress-big-number">
              <span class="stat-number">{{ obtainedCount }}</span>
              <span class="stat-total">/ {{ totalCount }} obtenus</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <!-- Prochaine cible -->
          <div class="sidebar-block">
            <span class="block-kicker">Prochaine cible</span>
            <div class="next-target-text">{{ nextTarget }}</div>
          </div>

          <div class="sidebar-divider"></div>

          <!-- Répartition par Types -->
          <div class="sidebar-block">
            <span class="block-kicker">Répartition</span>
            <div class="types-breakdown">
              <div
                v-for="t in typeCounts"
                :key="t.type"
                class="type-count-row"
              >
                <span
                  class="type-pill-badge"
                  :style="{ color: t.color, background: `${t.color}15`, borderColor: `${t.color}45` }"
                >
                  {{ t.label }}
                </span>
                <span class="type-num">{{ t.count }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>

    <!-- VUE 2 : PAR TIERS DE PRIORITÉ (S / A / B) -->
    <template v-else>
      <div class="tiers-grid">
        <div
          v-for="t in TIERS"
          :key="t.key"
          class="tier-column"
        >
          <!-- En-tête de Tier -->
          <div class="tier-col-header" :style="{ borderTopColor: t.color }">
            <div class="tier-header-info">
              <span class="tier-icon">{{ t.icon }}</span>
              <div>
                <h3 class="tier-title" :style="{ color: t.color }">{{ t.label }}</h3>
                <span class="tier-sub">{{ t.sub }}</span>
              </div>
            </div>
            <span class="tier-count-badge" :style="{ color: t.color, background: `${t.color}18`, borderColor: `${t.color}35` }">
              {{ itemsByTier[t.key].length }}
            </span>
          </div>

          <!-- Liste des cartes dans ce Tier -->
          <div class="tier-items-list">
            <div
              v-for="item in itemsByTier[t.key]"
              :key="item.id"
              :class="['tier-item-card', { obtained: item.status === 'obtained' }]"
            >
              <div class="tier-card-main">
                <!-- Avatar / Arme -->
                <div
                  class="wish-avatar-frame"
                  :class="{ 'is-weapon': item.item_type === 'weapon' }"
                  :style="{
                    borderColor: BADGE_MAP[item.item_type]?.color || '#7CF0D0'
                  }"
                >
                  <img
                    v-if="item.icon"
                    :src="getIconUrl(item.icon)"
                    :alt="item.name"
                    class="avatar-img"
                  />
                </div>

                <!-- Informations -->
                <div class="tier-card-info">
                  <div class="name-line">
                    <span class="wish-item-name">{{ item.name }}</span>
                    <span class="target-tag">
                      {{ item.item_type === 'constellation' ? `C${item.constellation_level}` : (item.item_type === 'weapon' ? 'R1' : 'C0') }}
                    </span>
                  </div>
                  <span class="wish-sub-notes">
                    {{ item.notes || (item.item_type === 'character' ? 'Personnage 5★' : (item.item_type === 'weapon' ? 'Arme 5★' : `Constellation ${item.constellation_level}`)) }}
                  </span>
                </div>

                <!-- Bouton Supprimer -->
                <button
                  type="button"
                  class="btn-remove-wish"
                  title="Supprimer ce souhait"
                  @click="removeItem(item.id)"
                >
                  ✕
                </button>
              </div>

              <!-- Barre inférieure de la carte Tier : Transfert de Tier + Statut -->
              <div class="tier-card-footer">
                <div class="tier-switch-pills">
                  <span class="tier-move-label">Tier:</span>
                  <button
                    v-for="targetTier in TIERS"
                    :key="targetTier.key"
                    type="button"
                    :class="['tier-mini-pill', { active: (item.priority_tier || 'S') === targetTier.key }]"
                    :style="(item.priority_tier || 'S') === targetTier.key ? { color: targetTier.color, borderColor: targetTier.color, background: `${targetTier.color}25` } : {}"
                    :title="`Déplacer vers ${targetTier.label}`"
                    @click="updateTier(item, targetTier.key)"
                  >
                    {{ targetTier.key }}
                  </button>
                </div>

                <button
                  type="button"
                  :class="['btn-toggle-status-compact', { active: item.status === 'obtained' }]"
                  @click="toggleStatus(item)"
                >
                  {{ item.status === 'obtained' ? '✓ Obtenu' : 'Marquer obtenu' }}
                </button>
              </div>
            </div>

            <div v-if="itemsByTier[t.key].length === 0" class="tier-empty-slot">
              Aucun vœu dans ce Tier
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============================================================= -->
    <!-- MODALE NOUVEAU SOUHAIT (ZÉRO SELECT) -->
    <!-- ============================================================= -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="wish-dialog scroll">
        <div class="dialog-header">
          <h2 class="dialog-title">Ajouter à la Roadmap</h2>
          <button type="button" class="btn-close-dialog" @click="showAddModal = false">✕</button>
        </div>

        <div class="dialog-body">
          <!-- Type de Souhait : Personnage / Arme / Constellation -->
          <div class="form-group">
            <label class="input-label">Catégorie</label>
            <div class="kind-pick-pills">
              <button
                type="button"
                :class="['kind-choice', { active: addForm.item_type === 'character' }]"
                @click="addForm.item_type = 'character'"
              >
                Personnage
              </button>
              <button
                type="button"
                :class="['kind-choice', { active: addForm.item_type === 'constellation' }]"
                @click="addForm.item_type = 'constellation'"
              >
                Constellation
              </button>
              <button
                type="button"
                :class="['kind-choice', { active: addForm.item_type === 'weapon' }]"
                @click="addForm.item_type = 'weapon'"
              >
                Arme
              </button>
            </div>
          </div>

          <!-- Choix du Tier de Priorité -->
          <div class="form-group">
            <label class="input-label">Priorité (Tier)</label>
            <div class="tier-choice-pills">
              <button
                v-for="t in TIERS"
                :key="t.key"
                type="button"
                :class="['tier-choice-btn', { active: addForm.priority_tier === t.key }]"
                :style="addForm.priority_tier === t.key ? { color: t.color, borderColor: t.color, background: `${t.color}20` } : {}"
                @click="addForm.priority_tier = t.key"
              >
                <span class="tier-choice-icon">{{ t.icon }}</span>
                <div class="tier-choice-text">
                  <span class="tier-choice-name">{{ t.label }}</span>
                  <span class="tier-choice-sub">{{ t.sub }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Si Constellation : Niveau C1..C6 -->
          <div v-if="addForm.item_type === 'constellation'" class="form-group">
            <label class="input-label">Niveau de Constellation visé</label>
            <div class="cons-pills-row">
              <button
                v-for="c in [1, 2, 3, 4, 5, 6]"
                :key="c"
                type="button"
                :class="['cons-pill', { active: addForm.constellation_level === c }]"
                @click="addForm.constellation_level = c"
              >
                C{{ c }}
              </button>
            </div>
          </div>

          <!-- Grille de sélection de Personnage ou Arme -->
          <div class="form-group">
            <label class="input-label">
              {{ addForm.item_type === 'weapon' ? 'Sélectionnez l\'arme' : 'Sélectionnez le personnage' }}
            </label>

            <!-- Grille des personnages -->
            <div v-if="addForm.item_type !== 'weapon'" class="pick-grid-scroll scroll">
              <button
                v-for="c in characters"
                :key="c.id"
                type="button"
                :class="['pick-tile', { active: addForm.name === c.name }]"
                @click="selectCharForWish(c)"
              >
                <div class="tile-avatar-ring" :style="{ borderColor: ELEMENT_COLORS[c.element] }">
                  <img :src="getIconUrl(c.icon)" class="avatar-img" />
                </div>
                <span class="tile-name">{{ c.name }}</span>
              </button>
            </div>

            <!-- Grille des armes -->
            <div v-else class="pick-grid-scroll scroll">
              <button
                v-for="w in weapons"
                :key="w.id"
                type="button"
                :class="['pick-tile-weapon', { active: addForm.name === w.name }]"
                @click="selectWeaponForWish(w)"
              >
                <div class="tile-weapon-frame" :class="`rarity-${w.rarity}`">
                  <img :src="getIconUrl(w.icon)" class="avatar-img" />
                </div>
                <div class="tile-w-info">
                  <span class="tile-w-name">{{ w.name }}</span>
                  <span class="tile-w-sub">{{ WEAPON_LABELS[w.weapon_type] || '' }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label class="input-label">Notes & Pity (Optionnel)</label>
            <input
              v-model="addForm.notes"
              type="text"
              class="input-field"
              placeholder="ex: Garanti à 50 de pity, viser l'arme signature ensuite..."
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-cancel" @click="showAddModal = false">
            Annuler
          </button>
          <button type="button" class="btn-save" :disabled="!addForm.name" @click="handleSaveNewWish">
            Ajouter à la liste
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wishlist-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Barre Supérieure & Commutateur de Mode */
.wishlist-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-mode-tabs {
  display: flex;
  gap: 0.35rem;
  background: #10131A;
  border: 1px solid #1F2430;
  border-radius: 10px;
  padding: 4px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: #8F97AA;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-tab:hover {
  color: #E7E9EE;
}

.mode-tab.active {
  background: #181D28;
  color: #F2F3F7;
  border-color: #262E3E;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

.tab-icon {
  font-size: 0.95rem;
}

/* Quick Pick de Tier dans la liste séquentielle */
.tier-quick-pick {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.tier-mini-pill {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #262B38;
  background: #0F1218;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  color: #7A8296;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tier-mini-pill:hover {
  border-color: #4A5165;
  color: #E7E9EE;
}

/* Grille des Tiers (S / A / B) */
.tiers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .tiers-grid {
    grid-template-columns: 1fr;
  }
}

.tier-column {
  background: #12151C;
  border: 1px solid #1F2430;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tier-col-header {
  padding: 1rem 1.25rem;
  border-top: 3px solid;
  background: #151922;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #1F2430;
}

.tier-header-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.tier-icon {
  font-size: 1.25rem;
}

.tier-title {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
}

.tier-sub {
  font-size: 0.72rem;
  color: #8F97AA;
}

.tier-count-badge {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  border: 1px solid;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 700;
}

.tier-items-list {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 120px;
}

.tier-item-card {
  background: #161A24;
  border: 1px solid #222836;
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  transition: all 0.15s ease;
}

.tier-item-card.obtained {
  opacity: 0.45;
  background: #0E1016;
  border-color: #1A1E27;
}

.tier-card-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tier-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tier-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.55rem;
  border-top: 1px solid #1E2330;
}

.tier-switch-pills {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.tier-move-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #7A8296;
  text-transform: uppercase;
}

.btn-toggle-status-compact {
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  border: 1px solid rgba(124, 240, 208, 0.4);
  background: transparent;
  color: #7CF0D0;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-toggle-status-compact.active {
  background: #7CF0D0;
  color: #0B0D12;
}

.tier-empty-slot {
  padding: 2.5rem 1rem;
  text-align: center;
  border: 1px dashed #222836;
  border-radius: 10px;
  color: #6B7280;
  font-size: 0.82rem;
}

/* Choix de Tier dans la Modale */
.tier-choice-pills {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.tier-choice-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  border-radius: 9px;
  border: 1px solid #262B38;
  background: #0F1218;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.tier-choice-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
}

.tier-choice-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tier-choice-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #E7E9EE;
}

.tier-choice-sub {
  font-size: 0.68rem;
  color: #8F97AA;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Bannière d'ordre */
.priority-path-banner {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.15rem 1.4rem;
  border-radius: 16px;
  background: #12151C;
  border: 1px solid #1F2430;
}

.path-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7A8296;
  flex-shrink: 0;
}

.path-scroll-area {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  white-space: nowrap;
}

.path-chip {
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
}

.path-arrow {
  color: #4A5165;
  font-weight: 700;
}

.path-done-msg {
  font-size: 0.82rem;
  color: #7CF0D0;
}

.btn-add-wish {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 38px;
  padding: 0 1rem;
  border-radius: 9px;
  border: 1px solid #7CF0D0;
  background: #7CF0D0;
  color: #0B0D12;
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-wish:hover {
  filter: brightness(1.1);
}

/* Layout */
.wishlist-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.wishes-list {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.wish-row-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.15rem;
  border-radius: 14px;
  background: #12151C;
  border: 1px solid #1F2430;
  transition: all 0.15s ease;
}

.wish-row-card.obtained {
  background: #0E1016;
  border-color: #1A1E27;
  opacity: 0.45;
}

.rank-badge {
  width: 26px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88rem;
  font-weight: 700;
  color: #7CF0D0;
}

.wish-row-card.obtained .rank-badge {
  color: #4A5165;
}

.wish-avatar-frame {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  background: #0B0D12;
  flex-shrink: 0;
}

.wish-avatar-frame.is-weapon {
  border-radius: 10px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.wish-main-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wish-item-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #F2F3F7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wish-row-card.obtained .wish-item-name {
  text-decoration: line-through;
}

.target-tag {
  padding: 1px 6px;
  border-radius: 5px;
  background: #181C25;
  border: 1px solid #2A3040;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  color: #D5D9E3;
}

.wish-sub-notes {
  font-size: 0.75rem;
  color: #8F97AA;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-badge {
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.reorder-btns {
  display: flex;
  gap: 0.35rem;
}

.btn-order {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #2A3040;
  background: #161A23;
  color: #C9CEDA;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-order:disabled {
  opacity: 0.25;
  cursor: default;
}

.btn-toggle-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 34px;
  padding: 0 0.95rem;
  border-radius: 8px;
  border: 1px solid rgba(124, 240, 208, 0.45);
  background: transparent;
  color: #7CF0D0;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-toggle-status.active {
  background: #7CF0D0;
  color: #0B0D12;
}

.btn-remove-wish {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #2A3040;
  background: transparent;
  color: #8F97AA;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
}

.btn-remove-wish:hover {
  color: #FF8A8A;
  border-color: #FF8A8A;
}

.empty-wishes-box {
  padding: 3rem;
  text-align: center;
  border: 1px dashed #2A3040;
  border-radius: 14px;
  color: #8F97AA;
  font-size: 0.9rem;
}

/* Sidebar Métriques */
.wishlist-sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.35rem;
  border-radius: 18px;
  background: #12151C;
  border: 1px solid #1F2430;
}

.sidebar-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.block-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7A8296;
}

.progress-big-number {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.stat-number {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #7CF0D0;
}

.stat-total {
  font-size: 0.85rem;
  color: #8F97AA;
}

.progress-track {
  height: 4px;
  border-radius: 4px;
  background: #1F2430;
  overflow: hidden;
  margin-top: 0.25rem;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: #7CF0D0;
  box-shadow: 0 0 10px #7CF0D0;
  transition: width 0.25s ease;
}

.sidebar-divider {
  height: 1px;
  background: #1F2430;
}

.next-target-text {
  font-size: 1.05rem;
  font-weight: 700;
  color: #F2F3F7;
}

.types-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.type-count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.type-pill-badge {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.72rem;
  font-weight: 700;
}

.type-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: #8F97AA;
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

.wish-dialog {
  width: 780px;
  max-height: 90vh;
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

.dialog-title {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: #F2F3F7;
}

.btn-close-dialog {
  width: 32px;
  height: 32px;
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
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.input-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #7A8296;
}

.kind-pick-pills {
  display: flex;
  gap: 0.4rem;
}

.kind-choice {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #8F97AA;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.kind-choice.active {
  color: #0B0D12;
  background: #7CF0D0;
  border-color: #7CF0D0;
}

.cons-pills-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.45rem;
}

.cons-pill {
  height: 36px;
  border-radius: 7px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #8F97AA;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.cons-pill.active {
  color: #0B0D12;
  background: #C29BFF;
  border-color: #C29BFF;
}

.pick-grid-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
  max-height: 240px;
  overflow-y: auto;
  padding: 0.35rem;
  background: #0B0D12;
  border: 1px solid #1F2430;
  border-radius: 12px;
}

.pick-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.25rem;
  border-radius: 9px;
  background: #141821;
  border: 1px solid #222734;
  color: #E7E9EE;
  cursor: pointer;
}

.pick-tile.active {
  border-color: #7CF0D0;
  background: rgba(124, 240, 208, 0.08);
}

.tile-avatar-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
}

.tile-name {
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.pick-tile-weapon {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem;
  border-radius: 9px;
  background: #141821;
  border: 1px solid #222734;
  color: #E7E9EE;
  cursor: pointer;
  text-align: left;
}

.pick-tile-weapon.active {
  border-color: #F3C552;
  background: rgba(243, 197, 82, 0.08);
}

.tile-weapon-frame {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1px solid;
  overflow: hidden;
  flex-shrink: 0;
}

.tile-w-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tile-w-name {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-w-sub {
  font-size: 0.65rem;
  color: #8F97AA;
}

.input-field {
  height: 40px;
  padding: 0 0.85rem;
  border-radius: 8px;
  border: 1px solid #262B38;
  background: #0F1218;
  color: #E7E9EE;
  font-size: 0.85rem;
  outline: none;
}

.input-field:focus {
  border-color: #7CF0D0;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 0.75rem;
  border-top: 1px solid #1F2430;
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

.btn-save {
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
