---
name: catalog-sync
description: Skill de gestion et synchronisation des données du jeu Genshin Impact pour Genshin Dashboard. Met à jour les personnages, armes, sets d'artéfacts et anomalies des Abysses via l'API Yatta / Project Amber sans altérer les configurations utilisateur existantes.
---

# 🔄 Catalog Sync - Genshin Dashboard

Ce skill gère le rafraîchissement des métadonnées officielles du jeu (nouvelles versions de Genshin, nouveaux personnages, armes, sets d'artéfacts et rotation des Abysses).

---

## 🌐 Endpoints Utilisés (Yatta / Project Amber)

Base URL : `https://gi.yatta.moe/api/v2/fr/`
User-Agent requis : Navigateur moderne pour éviter le blocage Cloudflare WAF 403.

| Ressource | Endpoint | Rôle |
| :--- | :--- | :--- |
| Personnages | `/avatar` | Nom FR, élément, type d'arme, rareté, icône UI |
| Armes | `/weapon` | Nom FR, type d'arme, rareté, icône UI |
| Artéfacts | `/reliquary` | Nom FR, effets 2 pièces & 4 pièces, icône |
| Abysses | `/tower` | Données de schedule, monstres, anomalies énergétiques |

---

## 🛠️ Exécution de la Synchronisation

Pour lancer la synchronisation complète :
```bash
npm run sync
```

### Intégrité des données utilisateur :
- La synchronisation utilise `INSERT OR REPLACE INTO catalog_items`.
- Les tables utilisateur (`character_loadouts`, `teams`, `upgrade_planner`, `wish_roadmap`) utilisent des IDs stables et ne sont **jamais écrasées** lors d'une synchronisation du catalogue.

### 🗡️ Armes Signatures :
- Lors de l'ajout de nouveaux personnages 5★ et de leurs armes signatures associées, enrichir le dictionnaire `SIGNATURE_WEAPONS` dans `client/src/api.js` afin qu'elles continuent d'apparaître en priorité 0 dans la sélection d'équipement.
