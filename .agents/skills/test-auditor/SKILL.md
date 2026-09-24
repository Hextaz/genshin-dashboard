---
name: test-auditor
description: Skill d'audit et de génération de tests automatisés pour Genshin Dashboard. Utilise le runner natif Node.js (node:test et node:assert) pour une exécution ultra-rapide en quelques millisecondes et une consommation mémoire nulle. Couvre la base SQLite, les règles d'exclusion mutuelle endgame et les endpoints REST.
---

# 🧪 Test Auditor - Genshin Dashboard

Ce skill garantit la couverture et la non-régression du dashboard en exploitant le runner natif de Node.js (`node:test` et `node:assert`).

---

## ⚡ Pourquoi le runner natif `node:test` ?
- **0 dépendance NPM** supplémentaire (pas de Jest, pas de Vitest lourd côté serveur).
- **Vitesse d'exécution** : tests exécutés en moins de 100 ms.
- **Consommation mémoire** : < 15 Mo pendant la suite de tests.

---

## 📋 Périmètres de Test Prioritaires

1. **Règles d'Exclusion Mutuelle (Endgame)** :
   - Tester qu'un personnage ne peut pas être dupliqué entre l'Équipe 1 et l'Équipe 2 en Abysses.
   - Idem pour le mode Carnage Chtonien (12 personnages uniques répartis sur 3 équipes).
2. **Opérations SQLite (CRUD)** :
   - Création, mise à jour et suppression d'un loadout de personnage.
   - Respect des clés étrangères et nettoyage en cascade.
3. **Planificateur de Montée (Planner)** :
   - Triage correct par Tiers (`S` > `A` > `B`).
   - Mises à jour partielles (`PATCH`) des cases à cocher.
4. **Roadmap d'Invocations (Wishlist)** :
   - Réordonnancement séquentiel des priorités.

---

## 🚀 Commande de Test
```bash
node --test
```
