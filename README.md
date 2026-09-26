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
   - Catalogue complet des personnages avec filtres par élément, rareté (4★ / 5★), type d'arme et **statut possédé (⭐)**.
   - Création et gestion de multiples builds (loadouts) par personnage (ex: *Raiden Hypercarry* vs *Raiden Hyperbloom*).
   - **Suppression du build unique** autorisée pour corriger les missclicks sans contrainte.
   - **Tiroir de build ultra-ergonomique** : disposition compacte sans scroll vertical obligatoire, intitulé complet des stats principales (ex: *Bonus de DGT Pyro %*), et barre d'actions sticky.
   - **Armes Signatures prioritaires** : détection autonome et badge doré « Signature » en tête du sélecteur d'armes pour chaque personnage 5★.
   - Association de l'arme (R1 à R5), des sets d'artéfacts (4 pièces ou 2p+2p) et des stats principales cibles.
2. **Presets d'Équipes (Team Presets)** :
   - Compositions nommées à 4 slots avec barre de recherche et filtres rapides.
   - Choix du loadout spécifique pour chaque personnage dans l'équipe.
   - **Vignettes d'équipements grand format (44px)** : fonds avec dégradés de rareté Genshin (5★ doré, 4★ violet), badges de raffinement (`R1`–`R5`) et indicateurs de sets (`4p` / `2p+2p`).
   - Alignement rigoureux des 4 fiches de personnages sur la même ligne de base.
3. **Planificateur de Montée (Upgrade Planner)** :
   - Organisation par **Tiers de priorité** (🔥 Tier S, ⭐ Tier A, 💤 Tier B) avec filtres par nom, rareté, arme et élément.
   - **Suivi précis des paliers d'aptitudes** : gestion des niveaux actuels et cibles pour l'Attaque Normale, la Compétence et le Déchaînement (ex: `1/8/8` → `6/9/10`) avec contrôles ergonomiques.
   - **Progression adaptative intelligente** : calcul automatique et proportionnel du pourcentage d'achèvement en fonction des seuls objectifs actifs (niveau de personnage, aptitudes, et/ou action artéfacts).
   - Objectifs détaillés : Niveau cible (ex: 80 → 90), Arme (Niv 90), Action artéfacts (🔄 Changement de set, ⬆️ Up +20, 🎯 Optimisation sous-stats, ✅ Prêt).
4. **Endgame (Abysses & Carnage Chtonien)** :
   - Onglet **Profondeurs Spiralées** (2 équipes - 8 persos) et **Carnage Chtonien** (3 équipes - 12 persos).
   - **Disposition Split-View ergonomique** : équipes empilées verticalement à gauche (sans écrasement horizontal, même à 3 équipes en Carnage) et panneau de sélection de personnages **sticky** à droite avec recherche et filtres complets.
   - **Exclusion mutuelle stricte** : détection et blocage en temps réel des doublons entre équipes.
   - **Sélecteur officiel Étage 11 / Étage 12** pour les Abysses avec affichage des anomalies énergétiques et bénédictions officielles Yatta.
   - **Sélecteur de builds harmonisé** : choix direct du loadout par simple clic sur l'avatar du slot (arme, raffinement R1–R5, artéfacts 2p/4p).
   - **Import express de presets** avec détection automatique des conflits.
5. **Roadmap d'Invocations (Wishlist séquentielle & par Tiers)** :
   - Organisation double vue : **Ordre séquentiel** (#1, #2...) et **Vue par Tiers** (🔥 Tier S, ⭐ Tier A, 💤 Tier B).
   - Granularité par palier : Personnage C0 > Arme Signature R1 > Constellations C1 à C6.
   - **Recherche en temps réel & filtres multi-critères** dans la modale d'ajout :
     - Pour les personnages/constellations : recherche textuelle insensible à la casse et aux accents, filtre de possession (`★ Non possédés` pour de nouveaux personnages ou `★ Possédés` pour cibler des constellations), éléments avec insignes officiels Yatta, rareté (4★/5★) et types d'armes.
     - Pour les armes : recherche textuelle, types d'armes avec icônes SVG et rareté (3★ à 5★).
   - Réordonnancement dynamique instantané et suivi de statut (🎯 En cours, ✅ Obtenu).

---

## 🚀 Démarrage & Déploiement

### 1. Installation & Synchronisation initiale
```bash
# Installation des dépendances
npm install

# Synchronisation du catalogue Genshin (personnages, armes, sets, abysses, armes signatures)
npm run sync
```

### 2. Tests automatisés
```bash
# Exécution de la suite de 15 tests natifs (node:test, node:assert)
npm test
```

### 3. Développement local
```bash
# Terminal 1 : Backend Hono (port 3002)
npm run dev:server

# Terminal 2 : Frontend Vite (port 3000 avec proxy /api -> 3002)
npm run dev
```

### 4. Déploiement sur le serveur "Lordi" (Windows 11)

```bash
# 1. Compiler le frontend SPA
npm run build

# 2. Démarrer avec PM2 (profil mémoire sobre < 50 Mo de RAM)
pm2 start ecosystem.config.cjs

# 3. Sauvegarder l'état PM2 sous Windows
pm2 save
```

### 5. Configuration Cloudflare Zero Trust Tunnel
- **Service Type** : `HTTP`
- **URL** : `localhost:3002`
- **Public Hostname** : `genshin.hextaz.dev` (ou selon vos préférences)
