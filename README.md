# Booking.com Scrapers

Ce projet contient plusieurs scrapers pour différents objectifs liés à Booking.com.

## 📁 Structure du projet

```
booking/
├── scrapers/                    # Tous les scrapers organisés par type
│   ├── legal-info/             # Scraper pour informations légales
│   │   ├── scraper3.js         # Scraper principal
│   │   ├── scraper-with-cron.js # Version avec cron jobs
│   │   └── start-cron-scraper.sh
│   ├── arrondissement-count/   # Scraper pour compter propriétés par arrondissement
│   │   ├── arrondissement-scraper.js
│   │   └── start-arrondissement-scraper.sh
│   └── hotel-rooms/            # Scraper pour types de chambres (à venir)
├── config/                     # Fichiers de configuration
│   └── bigquery-credentials.json.example
├── data/                       # Données et fichiers de sortie
│   ├── hotel_room_types.csv
│   ├── url.txt
│   └── legal-results-*.csv
├── cloud-function/             # Version Cloud Function (pour déploiement)
└── package.json
```

## 🎯 Types de scrapers

### 1. **Legal Info Scraper** (`scrapers/legal-info/`)
**Objectif** : Extraire les informations légales des hôtels (email, téléphone, nom entreprise, etc.)

**Fonctionnalités** :
- ✅ Scraping des informations légales
- ✅ Cron jobs automatiques (quotidien à 8h00)
- ✅ Sauvegarde CSV/JSON
- ✅ Gestion d'erreurs robuste

**Utilisation** :
```bash
cd scrapers/legal-info
./start-cron-scraper.sh
```

### 2. **Arrondissement Count Scraper** (`scrapers/arrondissement-count/`)
**Objectif** : Compter le nombre de propriétés hôtelières par arrondissement de Paris

**Fonctionnalités** :
- ✅ Scraping des 20 arrondissements de Paris
- ✅ Intégration BigQuery (projet oversight-datalake)
- ✅ Comptage automatique des propriétés
- ✅ Insertion en base de données

**Utilisation** :
```bash
cd scrapers/arrondissement-count
./start-arrondissement-scraper.sh
```

**Prérequis** :
- Credentials BigQuery configurés
- Variable `GOOGLE_APPLICATION_CREDENTIALS` définie

### 3. **Hotel Rooms Scraper** (`scrapers/hotel-rooms/`)
**Objectif** : Scraper les types de chambres et prix (à développer)

## 🔧 Configuration

### BigQuery Credentials
1. Copiez `config/bigquery-credentials.json.example` vers `config/bigquery-credentials.json`
2. Remplissez avec vos vraies credentials
3. Ou définissez la variable d'environnement :
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json
   ```

### Dépendances
```bash
npm install
```

## 🚀 Démarrage rapide

### Scraper Legal Info (avec cron jobs)
```bash
cd scrapers/legal-info
./start-cron-scraper.sh
```

### Scraper Arrondissement (BigQuery)
```bash
cd scrapers/arrondissement-count
./start-arrondissement-scraper.sh
```

## 📊 BigQuery

### Dataset : `MarketData`
### Table : `ArrondissementSummary`

**Schéma** :
- `ObservationDate` (DATETIME) : Date/heure de l'observation
- `Arrondissement` (STRING) : Numéro de l'arrondissement (1-20)
- `PropertiesCount` (INTEGER) : Nombre de propriétés trouvées

### Requêtes utiles
```sql
-- Voir les dernières données
SELECT * FROM `oversight-datalake.MarketData.ArrondissementSummary` 
ORDER BY ObservationDate DESC 
LIMIT 20;

-- Compter les propriétés par arrondissement (dernière observation)
SELECT 
  Arrondissement,
  PropertiesCount,
  ObservationDate
FROM `oversight-datalake.MarketData.ArrondissementSummary` 
WHERE ObservationDate = (
  SELECT MAX(ObservationDate) 
  FROM `oversight-datalake.MarketData.ArrondissementSummary`
)
ORDER BY CAST(Arrondissement AS INT64);
```

## 🔄 Cron Jobs

### Local (node-cron)
- **Legal Info** : Tous les jours à 8h00 (heure de Paris)
- **Arrondissement** : Manuel ou via GitHub Actions

### Cloud (Google Cloud Scheduler)
- Configuration disponible dans `cloud-function/`
- Nécessite un projet Google Cloud avec facturation

## 📝 Logs et monitoring

### Logs locaux
- Tous les scrapers affichent des logs détaillés
- Fichiers de sortie dans `data/`

### BigQuery
- Données historiques stockées automatiquement
- Requêtes de monitoring disponibles

## 🛠️ Développement

### Ajouter un nouveau scraper
1. Créer un dossier dans `scrapers/`
2. Ajouter le script principal
3. Créer un script de démarrage
4. Documenter dans ce README

### Tests
```bash
# Test legal info
cd scrapers/legal-info
node scraper-with-cron.js test

# Test arrondissement (nécessite credentials BigQuery)
cd scrapers/arrondissement-count
node arrondissement-scraper.js
```