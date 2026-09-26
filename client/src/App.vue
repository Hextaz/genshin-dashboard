<script setup>
import { ref, onMounted } from 'vue';
import Navbar from './components/Navbar.vue';
import CharactersView from './views/CharactersView.vue';
import TeamsView from './views/TeamsView.vue';
import PlannerView from './views/PlannerView.vue';
import EndgameView from './views/EndgameView.vue';
import WishlistView from './views/WishlistView.vue';
import {
  fetchCatalog,
  fetchTeams,
  fetchLoadouts,
  fetchOwnership,
  updateOwnership,
  fetchSignatureWeapons
} from './api.js';

const currentView = ref('characters');
const loading = ref(true);

const characters = ref([]);
const weapons = ref([]);
const reliquaries = ref([]);
const teams = ref([]);
const loadouts = ref([]);
const ownership = ref({});

async function loadAllData() {
  try {
    const [allCatalog, loadedTeams, loadedLoadouts, loadedOwnership] = await Promise.all([
      fetchCatalog(),
      fetchTeams(),
      fetchLoadouts(),
      fetchOwnership(),
      fetchSignatureWeapons()
    ]);

    characters.value = allCatalog.filter(i => i.category === 'character');
    weapons.value = allCatalog.filter(i => i.category === 'weapon');
    reliquaries.value = allCatalog.filter(i => i.category === 'reliquary');
    teams.value = loadedTeams;
    loadouts.value = loadedLoadouts;
    ownership.value = loadedOwnership || {};
  } catch (err) {
    console.error('Erreur chargement données:', err);
  } finally {
    loading.value = false;
  }
}

async function refreshTeams() {
  teams.value = await fetchTeams();
}

async function refreshLoadouts() {
  loadouts.value = await fetchLoadouts();
}

async function toggleOwnership(charId) {
  const current = ownership.value[charId]?.is_owned ? 1 : 0;
  const next = current ? 0 : 1;
  // Mise à jour optimiste immédiate dans l'UI
  ownership.value = {
    ...ownership.value,
    [charId]: { ...ownership.value[charId], is_owned: next }
  };
  try {
    await updateOwnership(charId, { is_owned: next });
  } catch (err) {
    console.error('Erreur mise à jour ownership:', err);
  }
}

onMounted(() => {
  loadAllData();
});
</script>

<template>
  <div class="app-root">
    <Navbar
      :current-view="currentView"
      :counts="{ characters: characters.length, teams: teams.length, loadouts: loadouts.length }"
      @change-view="(v) => currentView = v"
    />

    <main class="main-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Connexion à Lordi & Chargement des données Genshin...</p>
      </div>

      <template v-else>
        <!-- Vue 1: Personnages & Builds -->
        <CharactersView
          v-show="currentView === 'characters'"
          :characters="characters"
          :weapons="weapons"
          :reliquaries="reliquaries"
          :loadouts="loadouts"
          :ownership="ownership"
          @refresh-loadouts="refreshLoadouts"
          @toggle-ownership="toggleOwnership"
        />

        <!-- Vue 2: Presets d'Équipes -->
        <TeamsView
          v-show="currentView === 'teams'"
          :teams="teams"
          :characters="characters"
          :loadouts="loadouts"
          :weapons="weapons"
          :reliquaries="reliquaries"
          @refresh-teams="refreshTeams"
        />

        <!-- Vue 3: Planificateur de Montée (Tiers S/A/B) -->
        <PlannerView
          v-show="currentView === 'planner'"
          :characters="characters"
          :weapons="weapons"
          :reliquaries="reliquaries"
        />

        <!-- Vue 4: Endgame (Abysses & Carnage) -->
        <EndgameView
          v-show="currentView === 'endgame'"
          :characters="characters"
          :teams="teams"
          :loadouts="loadouts"
          :weapons="weapons"
          :reliquaries="reliquaries"
          :ownership="ownership"
        />

        <!-- Vue 5: Roadmap Vœux -->
        <WishlistView
          v-show="currentView === 'wishlist'"
          :characters="characters"
          :weapons="weapons"
        />
      </template>
    </main>

    <footer class="app-footer">
      <div class="footer-container">
        <span>Genshin Dashboard • Hébergé sur Serveur Lordi (Windows 11)</span>
        <span class="footer-meta">Exposition Cloudflare Zero Trust • Port 3002</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
  gap: 1.25rem;
  color: var(--text-muted);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--color-anemo);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.app-footer {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-dim);
  font-size: 0.75rem;
  padding: 1rem 0;
  margin-top: 2rem;
}

.footer-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
  .footer-container {
    flex-direction: column;
    text-align: center;
  }
}
</style>
