# Genshin Dashboard • Lordi Edition

Mini dashboard personnel ultra-léger dédié à Genshin Impact, conçu pour tourner 24/7 sur une machine à ressources limitées (serveur personnel Windows 11, Intel Celeron, 4 Go de RAM) avec une contrainte de consommation mémoire minimale (< 50 Mo de RAM).

---

## ⚡ Caractéristiques & Architecture

- **Stack Ultra-Sobre** : 
  - **Backend** : Node.js (v20+ / v24) avec **Hono** (`@hono/node-server`).
  - **Base de données** : SQLite natif (`node:sqlite`), aucun binaire lourd ni compilation `node-gyp`. Base complète de ~300 Ko.
  - **Frontend** : SPA moderne ultra-rapide (Vite + Vue 3), pré-compilée en bundle statique de **~38 Ko (gzip)**.
  - **Images & Assets** : Chargés directement depuis les CDN publics Cloudflare de Project Amber / Yatta (`gi.yatta.moe`) et Enka.Network. **0 Mo d'images stockées en RAM ou sur disque**.
- **Gestionnaire de processus** : PM2 natif via `ecosystem.config.cjs`.
- **Exposition** : Cloudflare Zero Trust Tunnel pointant sur `http://localhost:3002` (domaine `*.hextaz.dev`).

---

## 🎮 Fonctionnalités

1. **Personnages & Multi-Loadouts** :
   - Catalogue complet des personnages avec filtres par élément, rareté et arme.
   - Création et gestion de multiples builds (loadouts) par personnage (ex: *Raiden Hypercarry* vs *Raiden Hyperbloom*).
   - Association de l'arme (R1 à R5), des sets d'artéfacts (4 pièces ou 2p+2p) et des stats cibles.
2. **Presets d'Équipes (Team Presets)** :
   - Compositions nommées à 4 slots.
   - Choix du loadout spécifique pour chaque personnage dans l'équipe.
3. **Planificateur de Montée (Upgrade Planner)** :
   - Organisation par **Tiers de priorité** (🔥 Tier S, ⭐ Tier A, 💤 Tier B).
   - Objectifs détaillés : Niveau cible (ex: 80 → 90), Aptitudes (Normal / E / Q), Arme (Niv 90), Action artéfacts (🔄 Changement de set, ⬆️ Up +20, 🎯 Optimisation sous-stats, ✅ Prêt).
   - Checkboxes interactives par palier atteint.
4. **Endgame (Abysses & Carnage Chtonien)** :
   - Onglet **Profondeurs Spiralées** (2 équipes - 8 persos) et **Carnage Chtonien** (3 équipes - 12 persos).
   - **Exclusion mutuelle stricte** : un personnage assigné dans une équipe ne peut pas être sélectionné dans une autre.
   - **Import express de presets** avec détection automatique des conflits.
   - Affichage des anomalies énergétiques officielles du jeu.
5. **Roadmap d'Invocations (Wishlist séquentielle)** :
   - Ordre de priorité granulaire (Personnage C0 > Arme Signature R1 > C1 > etc.).
   - Réordonnancement dynamique (Monter / Descendre) et suivi de statut (🎯 En cours, ✅ Obtenu).

---

## 🚀 Démarrage & Déploiement

### 1. Installation & Synchronisation initiale
```bash
# Installation des dépendances
npm install

# Synchronisation du catalogue Genshin (personnages, armes, sets, abysses)
npm run sync
```

### 2. Développement local
```bash
# Terminal 1 : Backend Hono (port 3002)
npm run dev:server

# Terminal 2 : Frontend Vite (port 3000 avec proxy /api -> 3002)
npm run dev
```

### 3. Déploiement sur le serveur "Lordi" (Windows 11)

```bash
# 1. Compiler le frontend SPA
npm run build

# 2. Démarrer avec PM2
pm2 start ecosystem.config.cjs

# 3. Sauvegarder l'état PM2 sous Windows
pm2 save
```

### 4. Configuration Cloudflare Zero Trust Tunnel
- **Service Type** : `HTTP`
- **URL** : `localhost:3002`
- **Public Hostname** : `genshin.hextaz.dev` (ou selon vos préférences)
