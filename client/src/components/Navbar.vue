<script setup>
defineProps({
  currentView: {
    type: String,
    required: true
  }
});

defineEmits(['change-view']);

const navItems = [
  { id: 'characters', label: 'Personnages & Builds', icon: '👤' },
  { id: 'teams', label: 'Presets d\'Équipes', icon: '🛡️' },
  { id: 'planner', label: 'Planificateur de Montée', icon: '📈' },
  { id: 'endgame', label: 'Abysses & Carnage', icon: '⚔️' },
  { id: 'wishlist', label: 'Roadmap Vœux', icon: '🌟' }
];
</script>

<template>
  <header class="navbar">
    <div class="nav-container">
      <div class="brand">
        <div class="brand-icon">✦</div>
        <div>
          <h1 class="brand-title">GENSHIN DASHBOARD</h1>
          <span class="brand-subtitle">Lordi Server • Mode Sobre</span>
        </div>
      </div>

      <nav class="nav-links" aria-label="Navigation principale">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          :class="['nav-button', { active: currentView === item.id }]"
          @click="$emit('change-view', item.id)"
        >
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  background: rgba(18, 24, 36, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 40;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #e59b35, #ff5a36);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #fff;
  font-size: 1.25rem;
  box-shadow: 0 0 15px rgba(229, 155, 53, 0.4);
}

.brand-title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
}

.brand-subtitle {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-links {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.nav-button:hover {
  color: var(--text-main);
  background: var(--bg-surface-hover);
}

.nav-button.active {
  color: #fff;
  background: var(--bg-surface-active);
  box-shadow: inset 0 0 0 1px var(--border-accent);
}

.nav-icon {
  font-size: 1rem;
}

@media (max-width: 900px) {
  .nav-container {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.75rem 1rem;
  }
  .nav-links {
    width: 100%;
  }
}
</style>
