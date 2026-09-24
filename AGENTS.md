# Genshin Dashboard - Directives pour Claude Code & Antigravity

## 📌 Vue d'ensemble du Projet

**Genshin Dashboard** est un mini site web / dashboard personnel ultra-léger dédié à Genshin Impact. Il permet de gérer des multi-builds (loadouts) par personnage, des presets d'équipes nommées, un planificateur de montée en niveau/talents/armes/artéfacts par Tiers de priorité, un gestionnaire endgame pour les Abysses (2 équipes) et le Carnage Chtonien (3 équipes) avec détection et blocage strict des doublons, et une roadmap d'invocations ordonnée.

### Architecture du Projet
* **`server/`** :
  * `db.js` : Couche de persistance SQLite utilisant le module natif Node.js (`node:sqlite`). Configuration mémoire ultra-sobre (`PRAGMA cache_size = -2000;`, mode WAL).
  * `index.js` : API REST Hono (`@hono/node-server`) servant à la fois les routes d'API et les fichiers statiques de production du dossier `dist/`.
* **`client/`** :
  * Frontend SPA moderne écrit en Vue 3 avec Vite.
  * `src/api.js` : Client API unifié et résolveur d'icônes CDN Yatta/Amber (`https://gi.yatta.moe/assets/UI/...`).
  * `src/style.css` : Thème sombre inspiré de Genshin avec design tokens par élément (Pyro, Hydro, Anémo, etc.).
  * `src/views/` :
    * `CharactersView.vue` : Catalogue filtrable et gestion des builds par personnage.
    * `TeamsView.vue` : Presets d'équipes à 4 slots avec association des builds spécifiques.
    * `PlannerView.vue` : Planificateur de montée par Tiers (🔥 Tier S, ⭐ Tier A, 💤 Tier B).
    * `EndgameView.vue` : Composition Abysses (2 teams) et Carnage (3 teams) avec exclusion mutuelle stricte.
    * `WishlistView.vue` : Roadmap séquentielle de souhaits (Perso > Arme > C1...).
* **`scripts/`** :
  * `sync-catalog.js` : Script de synchronisation des données officielles Genshin depuis l'API Yatta en français.
* **`data/`** :
  * `genshin.db` : Fichier SQLite de persistance (~300 Ko).
* **`ecosystem.config.cjs`** : Configuration PM2 pour le serveur de production Windows 11 avec plafond de 48 Mo de RAM.

---

## 🌐 Environnement d'Hébergement & Services Homelab (24/7)

L'application tourne 24h/24 sur le serveur personnel **"Lordi"** sous Windows 11 (processeur Intel Celeron, 4 Go de RAM), accessible publiquement via **Cloudflare Zero Trust Tunnel** sur le port interne `localhost:3002`.

### Services Homelab & Synergies

| Service | URL / Destination | Rôle pour Genshin Dashboard |
| :--- | :--- | :--- |
| **CI/CD & GitOps** | `https://deploy.hextaz.dev` | Webhook GitHub. Déploie automatiquement l'application (`git pull`, `npm run build`, `pm2 restart genshin-dashboard`) à chaque push sur `main`. |
| **Monitoring & Uptime** | `https://status.hextaz.dev` | Uptime Kuma surveillant la disponibilité du port 3002 et la santé de SQLite. |
| **Productivité & Logs** | `https://bin.hextaz.dev` | MicroBin pour partager des logs d'erreurs ou des dumps d'état. |
| **Notes & Backlog** | `https://notes.hextaz.dev` | Memos pour noter des idées de builds ou de fonctionnalités. |

---

## ⚡ Règle Absolue : Contrainte Mémoire (< 50 Mo de RAM)

La machine hôte disposant d'un processeur modeste et de 4 Go de RAM globale pour l'ensemble des services, **le processus Node.js ne doit jamais dépasser 50 Mo de mémoire résidente (RSS)**.

1. **Aucune image en local** : Les portraits et icônes d'armes/artéfacts sont servis directement depuis le CDN public `https://gi.yatta.moe/assets/UI/` vers le navigateur client. Zéro buffer d'image en RAM côté serveur.
2. **Frontend 100% Statique** : La SPA est pré-compilée (`npm run build`) en un bundle statique de **~38 Ko gzip**. Le serveur Hono ne fait aucun SSR.
3. **SQLite Sobre** : Requêtes préparées avec `node:sqlite`, taille de cache limitée à 2 Mo (`PRAGMA cache_size = -2000;`).
4. **V8 Flags sous PM2** : `--max-old-space-size=48 --optimize-for-size`.

---

## 🥋 Rituel Obligatoire pour Résoudre une Issue

> [!IMPORTANT]
> **Avant de coder pour résoudre une issue, appliquer le rituel en 5 phases :**
> * Skill : `.agents/skills/issue-ritual/SKILL.md` (ou commande `/resolve-issue <NUMERO>`)

1. **Phase 1 : Cadrage Git & Inspection** :
   - Vérifier la branche (`git branch --show-current`). Si sur `main`, créer `feature/issue-<NUMERO>`.
   - Inspecter `gh issue view <NUMERO>`, les schémas SQLite (`server/db.js`) et l'API (`server/index.js`).
2. **Phase 2 : 🛑 RÉCAPITULATIF & PLAN (Point d'arrêt obligatoire)** :
   - Présenter le plan : fichiers impactés, évolution DB, cas limites, impact mémoire (< 50 Mo), tests.
   - **STOP : Attendre l'accord explicite de l'utilisateur.**
3. **Phase 3 : Implémentation & TDD Strict** :
   - TDD : écrire le test d'abord dans `test/` avec `node:test`, vérifier l'échec pour la raison attendue.
   - Loi d'airain Anti-Band-Aids : interdiction de masquer une exception par un `?.` sauvage ou un `try/catch` vide.
4. **Phase 4 : Porte de Vérification (Evidence Before Claims)** :
   - `npm test` (tests unitaires avec runner natif Node.js).
   - `npm run build` (validation du bundle Vite).
   - `node -c server/index.js` (syntaxe JS).
5. **Phase 5 : Bilan sans commit automatique** :
   - `git diff` audité sans résidus de debug.
   - **PAS D'AUTO-COMMIT** : proposer la commande de commit prête à exécuter.

---

## 🧰 Skills & Commandes Rapides Disponibles

Les compétences d'ingénierie sont installées dans `.agents/skills/` et `.claude/skills/` :

* **`/code-review`** (`code-reviewer`) : Audit intransigeant Staff Engineer (Architecture Hono, intégrité SQLite, réactivité Vue 3, mémoire, absence de band-aids).
* **`/resolve-issue`** (`issue-ritual`) : Cycle de résolution d'issue en 5 phases avec gate d'approbation.
* **`/test-audit`** (`test-auditor`) : Exécution et enrichissement de la suite de tests natifs `node:test`.
* **`/security-audit`** (`security-auditor`) : Audit de sécurité (CORS, injections SQL, validation JSON, exposition tunnel Cloudflare).
* **`/audit-memory`** (`memory-guardian`) : Mesure de l'empreinte RSS et benchmark de conformité < 50 Mo de RAM.
* **`catalog-sync`** : Procédures de mise à jour des données Genshin Impact via l'API Yatta.
