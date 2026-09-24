# Commande `/resolve-issue` - Résolution d'Issue Structurée (Rituel 5 Phases)

Déclenche la résolution méthodique de l'issue GitHub n° `$ARGUMENTS`.

## Instructions :
1. **Phase 1 : Cadrage Git & Analyse** :
   - Vérifier la branche (`git branch --show-current`). Si sur `main`, créer `feature/issue-$ARGUMENTS`.
   - Lire le ticket avec `gh issue view $ARGUMENTS`.
   - Inspecter les fichiers et schémas impactés.
2. **Phase 2 : STOP & PLAN D'IMPLÉMENTATION (Obligatoire)** :
   - Présenter le récapitulatif complet et le plan technique.
   - **ATTENDRE LA VALIDATION EXPLICITE DE L'UTILISATEUR.**
3. **Phase 3 : Implémentation & TDD** :
   - Appliquer la règle anti-bandaids.
   - Respecter le budget mémoire (< 50 Mo de RAM).
4. **Phase 4 : Porte de Vérification (Evidence Before Claims)** :
   - `npm run build` et `node --test`.
5. **Phase 5 : Bilan sans commit automatique** :
   - Mini-rapport et proposition de commit.
