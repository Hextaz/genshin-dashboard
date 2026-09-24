# Commande `/code-review` - Revue de Code Intransigeante (Genshin Dashboard)

Déclenche un audit approfondi et intransigeant sur le code : `$ARGUMENTS`.

## Instructions pour Claude / Antigravity :
1. **Détection du Périmètre** :
   * Si `$ARGUMENTS` vaut `--full` : audit global (API Hono, SQLite, Vues Vue 3, bundle Vite).
   * Si `$ARGUMENTS` est un chemin de fichier : audit ciblé de ce fichier.
   * Si `$ARGUMENTS` est vide ou `--diff` : audit du `git diff` courant.
2. **Critères d'évaluation** :
   * Respect de la contrainte mémoire (< 50 Mo de RAM).
   * Intégrité SQLite avec requêtes préparées (`node:sqlite`).
   * Clean Code, absence de band-aids (`?.` de camouflage, `try/catch` vides).
   * Performance et accessibilité frontend.
3. **Restitution** :
   * Scorecard tabulaire /100 avec Verdict (🟢 EXCELLENT, 🟡 ACCEPTABLE, 🔴 BLOQUANT).
   * Répertoire des anomalies avec diffs correctifs.
