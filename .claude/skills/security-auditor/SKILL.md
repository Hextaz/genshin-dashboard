---
name: security-auditor
description: Skill d'audit de sécurité offensif/défensif pour Genshin Dashboard. Vérifie l'exposition Cloudflare Zero Trust, la protection contre les injections SQLite, la validation des entrées JSON, la gestion des en-têtes CORS et l'intégrité du serveur exposé sur le domaine hextaz.dev.
---

# 🛡️ Security Auditor - Genshin Dashboard

Ce skill audite la sécurité globale du dashboard exposé publiquement via **Cloudflare Zero Trust Tunnel** sous le domaine `*.hextaz.dev`.

---

## 🔍 Points de Contrôle Critiques

### 1. Injections SQL & Intégrité SQLite
* **Vérification** : Chaque requête SQLite dans `server/db.js` et `server/index.js` doit impérativement utiliser des paramètres préparés (`?`).
* **Interdit** : Toute interpolation de chaîne (`db.exec("SELECT * WHERE id = " + id)`).
* **Typage** : Cast explicite des identifiants numériques avec `Number()`.

### 2. Validation des Entrées (Input Sanitization)
* Validation stricte des données reçues dans les requêtes `POST`, `PUT`, `PATCH`.
* Protection contre les payloads JSON volumineux qui pourraient saturer la mémoire du serveur Celeron.
* Rejet des champs inattendus dans les mises à jour partielles.

### 3. Exposition Réseau & Cloudflare Zero Trust
* Le port `3002` ne doit écouter que sur `localhost` ou `127.0.0.1` sans ouverture de port sur la box Internet.
* Vérification que le tunnel Cloudflare gère le chiffrement TLS et le pare-feu WAF en amont.
* En-têtes CORS configurés de façon sûre.

### 4. Résilience & Déni de Service Local (DoS)
* Limite de taille mémoire fixée à V8 (`--max-old-space-size=48`).
* Redémarrage garanti par PM2 en cas de tentative de saturation mémoire.
