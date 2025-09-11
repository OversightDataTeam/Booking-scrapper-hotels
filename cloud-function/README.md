# Booking.com Scraper - Google Cloud Function

Ce projet déploie un scraper Booking.com en tant que Google Cloud Function avec intégration BigQuery et planification automatique via Cloud Scheduler.

## 🏗️ Architecture

```
Google Cloud Scheduler (Cron) 
    ↓ (HTTP POST)
Google Cloud Function (Scraper)
    ↓ (Insert Data)
BigQuery (Storage)
```

## 📋 Prérequis

1. **Google Cloud SDK** installé et configuré
2. **Projet Google Cloud** avec les APIs suivantes activées :
   - Cloud Functions API
   - Cloud Scheduler API
   - BigQuery API
3. **Permissions** : Cloud Functions Admin, Cloud Scheduler Admin, BigQuery Admin

## 🚀 Déploiement

### 1. Configuration initiale

```bash
# Se connecter à Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Activer les APIs nécessaires
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable bigquery.googleapis.com
```

### 2. Déploiement de la Cloud Function

```bash
cd cloud-function
./deploy.sh
```

### 3. Configuration du scheduler

```bash
./setup-scheduler.sh
```

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` basé sur `env.example` :

```bash
cp env.example .env
# Éditez .env avec vos valeurs
```

### URLs à scraper

Vous pouvez définir les URLs de deux façons :

1. **Variable d'environnement** (recommandé) :
   ```bash
   gcloud functions deploy scrapeBookingData --set-env-vars SCRAPING_URLS="url1,url2,url3"
   ```

2. **Modification du code** dans `index.js` ligne 15-18

## 📊 BigQuery

### Structure de la table

La fonction crée automatiquement :
- **Dataset** : `booking_data`
- **Table** : `legal_info`

**Schéma** :
- `url` (STRING) : URL de l'hôtel
- `businessName` (STRING) : Nom de l'entreprise
- `address` (STRING) : Adresse
- `email` (STRING) : Email
- `phone` (STRING) : Téléphone
- `registerNumber` (STRING) : Numéro de registre du commerce
- `scrapedAt` (TIMESTAMP) : Date/heure du scraping
- `error` (STRING) : Message d'erreur si applicable

### Requêtes BigQuery utiles

```sql
-- Voir tous les résultats
SELECT * FROM `your-project.booking_data.legal_info` 
ORDER BY scrapedAt DESC;

-- Compter les succès vs erreurs
SELECT 
  COUNTIF(error IS NULL) as success_count,
  COUNTIF(error IS NOT NULL) as error_count
FROM `your-project.booking_data.legal_info`;

-- Dernières données par hôtel
SELECT 
  url,
  businessName,
  email,
  phone,
  scrapedAt
FROM `your-project.booking_data.legal_info`
WHERE error IS NULL
ORDER BY scrapedAt DESC;
```

## 🔧 Gestion et monitoring

### Commandes utiles

```bash
# Voir les logs de la Cloud Function
gcloud functions logs read scrapeBookingData --region=europe-west1

# Exécuter manuellement le scraper
curl -X POST https://YOUR_FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Voir les jobs de scheduler
gcloud scheduler jobs list --location=europe-west1

# Exécuter manuellement le job
gcloud scheduler jobs run booking-scraper-daily --location=europe-west1

# Voir les logs BigQuery
gcloud logging read 'resource.type=bigquery_resource' --limit=20
```

### Monitoring dans la console

1. **Cloud Functions** : https://console.cloud.google.com/functions
2. **Cloud Scheduler** : https://console.cloud.google.com/cloudscheduler
3. **BigQuery** : https://console.cloud.google.com/bigquery

## 🛠️ Développement local

Pour tester localement :

```bash
# Installer les dépendances
npm install

# Tester la fonction
node index.js
```

## 📈 Optimisations

### Performance
- **Timeout** : 540s (9 minutes) pour traiter plusieurs URLs
- **Memory** : 1GB pour Puppeteer
- **Concurrence** : Traitement séquentiel pour éviter les blocages

### Coûts
- **Cloud Function** : Pay-per-use (très économique)
- **BigQuery** : Stockage et requêtes payants
- **Cloud Scheduler** : 3 jobs gratuits par mois

## 🚨 Limitations

1. **Rate limiting** : Booking.com peut bloquer les requêtes trop fréquentes
2. **Timeout** : Maximum 9 minutes d'exécution
3. **Memory** : Limité à 1GB (suffisant pour Puppeteer)

## 🔄 Mise à jour

Pour mettre à jour la fonction :

```bash
# Modifier le code
# Puis redéployer
./deploy.sh
```

## 🆘 Dépannage

### Erreurs communes

1. **"Function timeout"** : Réduire le nombre d'URLs ou optimiser le code
2. **"Permission denied"** : Vérifier les permissions BigQuery
3. **"No business information found"** : Booking.com a changé sa structure HTML

### Logs détaillés

```bash
# Logs en temps réel
gcloud functions logs tail scrapeBookingData --region=europe-west1

# Logs avec filtres
gcloud logging read 'resource.type=cloud_function AND severity>=ERROR' --limit=50
```

