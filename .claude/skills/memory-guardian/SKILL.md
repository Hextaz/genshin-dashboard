---
name: memory-guardian
description: Skill de surveillance et d'optimisation de la mémoire vive pour Genshin Dashboard. Garantit le respect absolu de la contrainte < 50 Mo de RAM sur le serveur Windows 11 / Intel Celeron (Lordi). Audite la taille du heap V8, la mémoire résidente (RSS), les options de garbage collection et les paramètres PM2.
---

# 🛡️ Memory Guardian - Genshin Dashboard

La contrainte d'exploitation sur la machine hôte ("Lordi", Windows 11, Intel Celeron, 4 Go RAM) impose un plafond strict : **le processus ne doit jamais excéder 50 Mo de RAM**.

Ce skill fournit les outils et procédures d'audit pour garantir cette sobriété à chaque évolution du code.

---

## 🔍 Procédure d'Audit Mémoire

### 1. Mesure directe de l'empreinte résidente (RSS)
```bash
node --max-old-space-size=48 --optimize-for-size server/index.js &
PID=$!
sleep 2
ps -p $PID -o pid,rss,vsz,comm
kill $PID
```
* **Seuil cible** : RSS < 40 000 Ko (~38-40 Mo).
* **Seuil d'alerte** : RSS > 50 000 Ko.

### 2. Règles d'or d'ingénierie mémoire
1. **Zéro mise en cache d'images en RAM** :
   - Les URLs d'images pointent toujours vers les CDN publics (`https://gi.yatta.moe/assets/UI/...`).
   - Le serveur Hono ne bufferise aucun blob ni flux binaire d'image.
2. **SQLite en mode sobre** :
   - `PRAGMA cache_size = -2000;` (limite le cache de pages SQLite à 2 Mo max).
   - Mode `WAL` activé pour des lectures sans blocage.
3. **Frontend 100% Statique** :
   - Tout le travail de rendu DOM, de réactivité et de filtrage est exécuté sur le navigateur du client.
   - Le serveur se contente de délivrer les fichiers compilés du dossier `dist/`.
4. **V8 Flags sous PM2** :
   - `--max-old-space-size=48` : force le ramasse-miettes V8 à collecter agressivement avant 48 Mo.
   - `--optimize-for-size` : favorise la compacité mémoire du moteur V8 plutôt que la vitesse brute JIT.
