---
name: issue-crafter
description: Skill de création et de cadrage d'issues GitHub pour Genshin Dashboard. Formate les tickets avec user stories claires, critères d'acceptation, cas limites identifiés et contraintes de mémoire (< 50 Mo RAM).
---

# 📝 Issue Crafter - Genshin Dashboard

Ce skill génère des issues GitHub claires, actionnables et parfaitement documentées pour le projet.

---

## 📋 Structure Standard d'une Issue

```markdown
### 🎯 Contexte & Objectif
Description concise du besoin utilisateur (ex: ajout d'une option de filtrage, synchronisation d'une nouvelle version de Genshin, amélioration de la vue Carnage).

### 👤 User Story
En tant que joueur de Genshin Impact,
Je veux pouvoir [action],
Afin de [bénéfice / objectif].

### 🛠️ Périmètre Technique
- Fichiers impactés : `server/...`, `client/...`
- Base de données : Nouveaux champs ou tables SQLite ?
- Consommation mémoire : Impact nul / contrôlé sur les < 50 Mo de RAM.

### 🧪 Critères d'Acceptation
- [ ] Critère 1 : Fonctionnement nominal
- [ ] Critère 2 : Gestion du cas limite (absence de données, doublon, etc.)
- [ ] Critère 3 : Tests de non-régression passés (`npm run build`, `node --test`)
```
