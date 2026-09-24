<script setup>
import { ref, computed } from 'vue';
import { getIconUrl } from '../api.js';

const props = defineProps({
  reliquaries: {
    type: Array,
    default: () => []
  },
  currentSetId: {
    type: [Number, String],
    default: null
  }
});

const emit = defineEmits(['select', 'close']);

const searchQuery = ref('');

const filteredSets = computed(() => {
  if (!searchQuery.value.trim()) return props.reliquaries;
  const q = searchQuery.value.toLowerCase();
  return props.reliquaries.filter(r => r.name.toLowerCase().includes(q));
});

function pickSet(r) {
  const rawId = Number(r.id.replace('relic_', ''));
  emit('select', rawId);
}
</script>

<template>
  <dialog open class="picker-dialog" @click.self="$emit('close')">
    <div class="picker-content">
      <div class="picker-header">
        <div>
          <h3 class="picker-title">Sélectionner un set d'artéfacts</h3>
          <span class="picker-sub">{{ filteredSets.length }} sets disponibles</span>
        </div>
        <button type="button" class="btn-close" @click="$emit('close')">✕</button>
      </div>

      <div class="picker-filters">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Rechercher un set (ex: Emblème, Maréchaussée, Doré)..."
          class="picker-search"
        />
      </div>

      <!-- Grille des sets -->
      <div class="sets-grid">
        <button
          v-for="r in filteredSets"
          :key="r.id"
          type="button"
          :class="['set-card', { selected: currentSetId === Number(r.id.replace('relic_', '')) }]"
          @click="pickSet(r)"
        >
          <div class="set-img-box">
            <img :src="getIconUrl(r.icon)" :alt="r.name" class="set-img" loading="lazy" />
          </div>
          <span class="set-name">{{ r.name }}</span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.picker-dialog {
  width: 720px;
  max-width: 95vw;
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
  background: var(--bg-surface-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.picker-search {
  width: 100%;
  padding: 0.5rem 0.85rem;
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  outline: none;
  font-size: 0.85rem;
}

.sets-grid {
  padding: 1.25rem;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.85rem;
}

.set-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--bg-dark);
  border: 1px solid var(--border-subtle);
  text-align: center;
}

.set-card:hover {
  border-color: var(--color-hydro);
  transform: translateY(-2px);
}

.set-card.selected {
  border-color: var(--color-anemo);
  box-shadow: 0 0 12px rgba(51, 230, 184, 0.3);
}

.set-img-box {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #181d28;
  border: 1px solid var(--border-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.set-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.set-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.25;
}
</style>
