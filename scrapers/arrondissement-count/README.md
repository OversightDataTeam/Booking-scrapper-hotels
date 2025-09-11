# Scraper d'Arrondissements Paris - Booking.com

Ce scraper compte le nombre de propriétés disponibles sur Booking.com pour chaque arrondissement de Paris (1er au 20ème).

## 🎯 Objectif

Récupérer le nombre de propriétés par arrondissement et les insérer dans BigQuery pour analyse.

## 📁 Structure

```
arrondissement-count/
├── README.md                    # Ce fichier
├── local/                       # Version locale
│   ├── arrondissement-scraper-optimized.js
│   └── start-scraper.sh
└── cloud-function/              # Version Cloud Function
    ├── index.js
    ├── package.json
    ├── deploy.sh
    └── run-locally.sh
```

## 🚀 Options d'Exécution

### 1. Version Locale (Recommandée pour les tests)

**Avantages :**
- ✅ Exécution immédiate
- ✅ Sauvegarde locale en CSV
- ✅ Insertion BigQuery en temps réel
- ✅ Parallélisation (4 processus)

**Utilisation :**
```bash
cd local/
./start-scraper.sh
```

**Résultats :**
- 📁 `../../data/arrondissement-results.csv`
- 📁 `../../data/arrondissement-results.json`
- 📊 BigQuery: `oversight-datalake.MarketData.ArrondissementSummary`

### 2. Version Cloud Function

**Avantages :**
- ✅ Exécution dans le cloud
- ✅ Déclenchement par cron
- ✅ Scalabilité automatique
- ✅ Pas de dépendance locale

**Utilisation :**

#### Test Local de la Cloud Function :
```bash
cd cloud-function/
./run-locally.sh
```

#### Déploiement sur Google Cloud :
```bash
cd cloud-function/
./deploy.sh
```

**Prérequis pour le déploiement :**
- Projet Google Cloud avec billing activé
- APIs Cloud Functions et BigQuery activées
- Credentials BigQuery configurés

## ⚙️ Configuration

### Credentials BigQuery

1. Copiez le fichier d'exemple :
```bash
cp ../../config/bigquery-credentials.json.example ../../config/bigquery-credentials.json
```

2. Ajoutez vos vraies credentials dans le fichier

### Variables d'Environnement

La variable `GOOGLE_APPLICATION_CREDENTIALS` est automatiquement configurée par les scripts.

## 📊 Données Collectées

Pour chaque arrondissement :
- **ObservationDate** : Date et heure de l'observation (heure de Paris)
- **Arrondissement** : Numéro de l'arrondissement (1-20)
- **PropertiesCount** : Nombre de propriétés trouvées

## 🔧 Personnalisation

### Modifier la plage d'arrondissements

**Version locale :**
Modifiez la boucle dans `local/arrondissement-scraper-optimized.js` :
```javascript
for (let arrondissement = 1; arrondissement <= 20; arrondissement++) {
```

**Version Cloud Function :**
Passez les paramètres dans la requête :
```json
{
  "startArrondissement": 1,
  "endArrondissement": 10
}
```

### Modifier la parallélisation

Dans `local/arrondissement-scraper-optimized.js` :
```javascript
const CONCURRENT_LIMIT = 2; // Nombre de processus parallèles
```

## 🐛 Dépannage

### Erreur de credentials BigQuery
```
❌ Missing project_id in credentials file
```
**Solution :** Vérifiez que `../../config/bigquery-credentials.json` contient vos vraies credentials.

### Erreur de permissions BigQuery
```
❌ Permission denied to enable service
```
**Solution :** Vérifiez que votre compte a les permissions sur le projet `oversight-datalake`.

### Détection de bot
```
⚠️ Possible bot detection or access denied!
```
**Solution :** Le scraper gère automatiquement les retry. Si le problème persiste, augmentez les délais.

## 📈 Performance

- **Version locale :** ~1-2 minutes pour 20 arrondissements
- **Version Cloud Function :** ~2-3 minutes pour 20 arrondissements
- **Parallélisation :** 4 processus simultanés
- **Délais :** 3-7 secondes entre chaque arrondissement

## 🔄 Automatisation

### Cron Local
```bash
# Exécuter tous les jours à 6h
0 6 * * * cd /path/to/arrondissement-count/local && ./start-scraper.sh
```

### Cloud Scheduler (après déploiement)
```bash
gcloud scheduler jobs create http arrondissement-scraper-job \
    --schedule='0 6 * * *' \
    --uri=https://europe-west1-YOUR-PROJECT.cloudfunctions.net/arrondissement-scraper \
    --http-method=POST \
    --headers='Content-Type=application/json' \
    --message-body='{"startArrondissement": 1, "endArrondissement": 20}'
```

## 📞 Support

En cas de problème, vérifiez :
1. Les credentials BigQuery
2. La connexion internet
3. Les permissions sur le projet Google Cloud
4. Les logs de la console

---

**Développé par :** Corentin Robert  
**Dernière mise à jour :** Septembre 2025
