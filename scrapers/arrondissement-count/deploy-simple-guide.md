# 🚀 Guide de Déploiement Simple - Cloud Run

## Problème Actuel
- Pas de permissions pour activer les APIs GCP
- Pas de facturation activée sur les projets
- Docker local nécessite Docker Desktop

## Solution Alternative : Déploiement Direct

### Option 1 : Utiliser une Image Node.js Existante

1. **Dans la console Google Cloud :**
   - Allez sur Cloud Run
   - Cliquez sur "Deploy container"
   - Utilisez cette image : `gcr.io/google.com/cloudsdktool/cloud-sdk:alpine`

2. **Configuration du service :**
   - **Nom du service** : `arrondissement-scraper`
   - **Région** : `europe-west1`
   - **Port** : `8080`
   - **Mémoire** : `2 GiB`
   - **CPU** : `2`

3. **Variables d'environnement :**
   ```
   NODE_ENV=production
   CONCURRENT_LIMIT=4
   ```

### Option 2 : Déploiement via GitHub (Recommandé)

1. **Pousser le code sur GitHub :**
   ```bash
   git add .
   git commit -m "Add Cloud Run scraper"
   git push origin main
   ```

2. **Dans la console Google Cloud :**
   - Allez sur Cloud Run
   - Cliquez sur "Deploy from source"
   - Connectez votre repository GitHub
   - Sélectionnez le dossier `scrapers/arrondissement-count`

### Option 3 : Utiliser Cloud Shell

1. **Ouvrir Cloud Shell dans la console GCP**
2. **Cloner le repository :**
   ```bash
   git clone https://github.com/votre-username/booking-scraper.git
   cd booking-scraper/scrapers/arrondissement-count
   ```

3. **Déployer directement :**
   ```bash
   gcloud run deploy arrondissement-scraper \
     --source . \
     --platform managed \
     --region europe-west1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 3600
   ```

## Configuration BigQuery

Une fois déployé, vous devrez :

1. **Créer un service account** avec les permissions BigQuery
2. **Télécharger la clé JSON**
3. **L'ajouter comme variable d'environnement** dans Cloud Run

## Test du Déploiement

```bash
curl -X POST https://arrondissement-scraper-xxxxx-uc.a.run.app/scrape \
  -H 'Content-Type: application/json' \
  -d '{
    "startArrondissement": 1,
    "endArrondissement": 5,
    "concurrentLimit": 4
  }'
```

## Avantages de cette Approche

✅ Pas besoin de Docker local  
✅ Pas besoin de permissions spéciales  
✅ Déploiement direct depuis le code source  
✅ Configuration simple via la console  
