<script setup>
defineProps({
  currentView: {
    type: String,
    required: true
  },
  counts: {
    type: Object,
    default: () => ({ characters: 0, teams: 0, loadouts: 0, goals: 0 })
  }
});

defineEmits(['change-view']);

const navItems = [
  { id: 'characters', label: 'Personnages & Builds', kicker: 'Vue 1 · Loadouts' },
  { id: 'teams', label: 'Presets de Teams', kicker: 'Vue 2 · Compositions' },
  { id: 'planner', label: 'Upgrade Planner', kicker: 'Vue 3 · Montée' },
  { id: 'endgame', label: 'Endgame', kicker: 'Vue 4 · Abysses & Carnage' },
  { id: 'wishlist', label: 'Roadmap d\'Invocations', kicker: 'Vue 5 · Souhaits' }
];
</script>

<template>
  <header class="navbar">
    <div class="nav-container">
      <!-- Logo Teyvat Hub -->
      <div class="brand">
        <div class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.5 14.2 9.8 21.5 12l-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2L12 2.5z" />
          </svg>
        </div>
        <div class="brand-text">
          <h1 class="brand-title">Teyvat Hub</h1>
          <span class="brand-subtitle">Genshin Impact · Dashboard</span>
        </div>
      </div>

      <!-- Navigation tabs -->
      <nav class="nav-links" aria-label="Navigation principale">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          :class="['nav-button', { active: currentView === item.id }]"
          @click="$emit('change-view', item.id)"
        >
          <span v-if="currentView === item.id" class="nav-active-bar"></span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Résumé rapide -->
      <div class="nav-summary">
        <div class="summary-pill" title="Personnages au catalogue">
          <span class="summary-k">Persos</span>
          <span class="summary-v">{{ counts.characters }}</span>
        </div>
        <div class="summary-pill" title="Équipes préconfigurées">
          <span class="summary-k">Teams</span>
          <span class="summary-v text-mint">{{ counts.teams }}</span>
        </div>
        <div class="summary-pill" title="Builds enregistrés">
          <span class="summary-k">Builds</span>
          <span class="summary-v text-gold">{{ counts.loadouts }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  background: #0E1117;
  border-bottom: 1px solid #1F2430;
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-container {
  max-width: 1560px;
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
  border-radius: 10px;
  background: #141821;
  border: 1px solid #2A3040;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7CF0D0;
  box-shadow: 0 0 14px rgba(124, 240, 208, 0.2);
}

.brand-title {
  margin: 0;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #F2F3F7;
}

.brand-subtitle {
  font-size: 0.7rem;
  color: #8A92A6;
  font-weight: 500;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #12151C;
  border: 1px solid #1F2430;
  border-radius: 12px;
  padding: 3px;
}

.nav-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 38px;
  padding: 0 1rem;
  border-radius: 9px;
  color: #9AA2B5;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.nav-button:hover {
  color: #E7E9EE;
  background: #161A23;
}

.nav-button.active {
  color: #F2F3F7;
  background: rgba(124, 240, 208, 0.09);
}

.nav-active-bar {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  border-radius: 2px;
  background: #7CF0D0;
  box-shadow: 0 0 10px #7CF0D0;
}

.nav-summary {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.summary-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  background: #12151C;
  border: 1px solid #1F2430;
  font-size: 0.75rem;
}

.summary-k {
  color: #6E768A;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.68rem;
}

.summary-v {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: #E7E9EE;
}

.text-mint {
  color: #7CF0D0;
}

.text-gold {
  color: #F3C552;
}

@media (max-width: 1024px) {
  .nav-summary {
    display: none;
  }
}
</style>
