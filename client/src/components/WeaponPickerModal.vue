<script setup>
import { ref, computed } from 'vue';
import { getIconUrl, WEAPON_LABELS, getSignatureWeaponId } from '../api.js';

const props = defineProps({
  weapons: {
    type: Array,
    default: () => []
  },
  weaponType: {
    type: String,
    default: ''
  },
  currentWeaponId: {
    type: [Number, String],
    default: null
  },
  character: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['select', 'close']);

const searchQuery = ref('');
const selectedRarity = ref('ALL');

const signatureWeaponId = computed(() => {
  return props.character ? getSignatureWeaponId(props.character) : null;
});

const compatibleWeapons = computed(() => {
  const filtered = props.weapons.filter(w => {
    if (props.weaponType && w.weapon_type !== props.weaponType) return false;
    if (selectedRarity.value !== 'ALL' && w.rarity !== Number(selectedRarity.value)) return false;
    if (searchQuery.value.trim() && !w.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false;
    return true;
  });

  const sigId = signatureWeaponId.value;
  return filtered.sort((a, b) => {
    const rawA = Number(a.id.replace('weapon_', ''));
    const rawB = Number(b.id.replace('weapon_', ''));
    // 1. Arme signature officielle en tout premier
    if (sigId) {
      if (rawA === sigId) return -1;
      if (rawB === sigId) return 1;
    }
    // 2. Rareté décroissante (5★ > 4★ > 3★)
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    // 3. Ordre alphabétique français
    return a.name.localeCompare(b.name, 'fr');
  });
});

function pickWeapon(w) {
  const rawId = Number(w.id.replace('weapon_', ''));
  emit('select', rawId);
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="picker-dialog" role="dialog" aria-modal="true">
        <div class="picker-content">
          <div class="picker-header">
            <div>
              <h3 class="picker-title">Sélectionner une arme</h3>
              <span class="picker-sub">
                {{ WEAPON_LABELS[weaponType] || 'Toutes les armes' }} ({{ compatibleWeapons.length }} disponibles)
              </span>
            </div>
            <button type="button" class="btn-close" @click="$emit('close')">✕</button>
          </div>

          <!-- Barre de recherche et filtres de rareté -->
          <div class="picker-filters">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Rechercher une arme..."
              class="picker-search"
            />
            <div class="rarity-pills">
              <button
                v-for="r in ['ALL', '5', '4', '3']"
                :key="r"
                type="button"
                :class="['rarity-pill', { active: selectedRarity === r }]"
                @click="selectedRarity = r"
              >
                {{ r === 'ALL' ? 'Toutes' : `${r}★` }}
              </button>
            </div>
          </div>

          <!-- Grille des armes -->
          <div class="weapons-grid">
            <button
              v-for="w in compatibleWeapons"
              :key="w.id"
              type="button"
              :class="[
                'weapon-card',
                {
                  selected: currentWeaponId === Number(w.id.replace('weapon_', '')),
                  'is-signature': signatureWeaponId === Number(w.id.replace('weapon_', ''))
                }
              ]"
              @click="pickWeapon(w)"
            >
              <div :class="['weapon-img-box', `rarity-${w.rarity}`]">
                <img :src="getIconUrl(w.icon)" :alt="w.name" class="weapon-img" loading="lazy" />
                <span class="weapon-star">{{ w.rarity }}★</span>
                <span
                  v-if="signatureWeaponId === Number(w.id.replace('weapon_', ''))"
                  class="signature-badge"
                  title="Arme signature officielle"
                >
                  Signature
                </span>
              </div>
              <span class="weapon-name">{{ w.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.picker-dialog {
  width: 680px;
  max-width: 95vw;
  background: var(--bg-surface);
  border: 1px solid var(--border-accent);
  border-radius: var(--radius-lg);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.picker-content {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.picker-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-title {
  font-size: 1.15rem;
  font-weight: 700;
}

.picker-sub {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.btn-close {
  color: var(--text-dim);
  font-size: 1.25rem;
}
.btn-close:hover {
  color: #fff;
}

.picker-filters {
  padding: 0.85rem 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  background: var(--bg-surface-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.picker-search {
  flex: 1;
  padding: 0.45rem 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  outline: none;
  font-size: 0.85rem;
}

.rarity-pills {
  display: flex;
  gap: 0.35rem;
}

.rarity-pill {
  padding: 0.3rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
}

.rarity-pill.active {
  background: var(--bg-surface-active);
  color: #fff;
  border-color: var(--color-hydro);
}

.weapons-grid {
  padding: 1.25rem;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.85rem;
}

.weapon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem;
  border-radius: var(--radius-sm);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  text-align: center;
}

.weapon-card:hover {
  border-color: var(--color-hydro);
  transform: translateY(-2px);
}

.weapon-card.selected {
  border-color: var(--color-anemo);
  box-shadow: 0 0 12px rgba(51, 230, 184, 0.3);
}

.weapon-card.is-signature {
  border-color: #F3C552;
  background: rgba(243, 197, 82, 0.06);
  box-shadow: 0 0 12px rgba(243, 197, 82, 0.2);
}

.signature-badge {
  position: absolute;
  top: 3px;
  left: 3px;
  padding: 1px 4px;
  background: linear-gradient(135deg, #F3C552 0%, #D49E24 100%);
  color: #0B0D12;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  border-radius: 3px;
  text-transform: uppercase;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.weapon-img-box {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}

.weapon-img-box.rarity-5 { background: radial-gradient(circle, #7e4b17 0%, #1a1622 100%); }
.weapon-img-box.rarity-4 { background: radial-gradient(circle, #52296e 0%, #141724 100%); }
.weapon-img-box.rarity-3 { background: radial-gradient(circle, #1e457e 0%, #101524 100%); }

.weapon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.weapon-star {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #fde047;
}

.weapon-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.2;
}
</style>
