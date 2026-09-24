# Commande `/audit-memory` - Audit Mémoire & Benchmark Lordi

Vérifie l'empreinte résidente (RSS) du serveur sur le port 3002.

## Instructions :
1. Démarrer le serveur avec les flags PM2 :
   ```bash
   node --max-old-space-size=48 --optimize-for-size server/index.js &
   PID=$!
   sleep 2
   ps -p $PID -o pid,rss,vsz,comm
   kill $PID
   ```
2. Analyser la consommation :
   - Cible : < 40 Mo RSS.
   - Alerte : > 50 Mo RSS.
3. Vérifier la taille du bundle frontend :
   - Fichiers dans `dist/assets/` inférieurs à 50 Ko gzip.
