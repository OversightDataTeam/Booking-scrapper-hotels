#!/bin/bash

# Script de déploiement pour la Cloud Function de scraping d'arrondissements
# Ce script déploie la fonction sur Google Cloud Platform

echo "🚀 Déploiement de la Cloud Function pour le scraping d'arrondissements"
echo "====================================================================="

# Vérifier que gcloud est installé
if ! command -v gcloud &> /dev/null; then
    echo "❌ Erreur: gcloud CLI n'est pas installé"
    echo "   Installez-le avec: brew install google-cloud-sdk"
    exit 1
fi

# Vérifier que nous sommes authentifiés
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Erreur: Vous n'êtes pas authentifié avec gcloud"
    echo "   Connectez-vous avec: gcloud auth login"
    exit 1
fi

# Définir le projet
PROJECT_ID="oversight-datalake"
FUNCTION_NAME="arrondissement-scraper"
REGION="europe-west1"
MEMORY="2GB"
TIMEOUT="540s"

echo "📊 Configuration:"
echo "   - Projet: $PROJECT_ID"
echo "   - Fonction: $FUNCTION_NAME"
echo "   - Région: $REGION"
echo "   - Mémoire: $MEMORY"
echo "   - Timeout: $TIMEOUT"
echo ""

# Vérifier que le projet existe et est accessible
echo "🔍 Vérification du projet..."
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo "❌ Erreur: Le projet $PROJECT_ID n'est pas accessible"
    echo "   Vérifiez que vous avez les permissions sur ce projet"
    exit 1
fi

# Définir le projet actif
gcloud config set project $PROJECT_ID

# Activer les APIs nécessaires
echo "🔧 Activation des APIs nécessaires..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable bigquery.googleapis.com

# Vérifier que les credentials BigQuery existent
if [ ! -f "../config/bigquery-credentials.json" ]; then
    echo "❌ Erreur: bigquery-credentials.json non trouvé"
    echo "   Copiez le fichier depuis bigquery-credentials.json.example"
    echo "   et ajoutez vos vraies credentials"
    exit 1
fi

# Copier les credentials dans le dossier de déploiement
echo "📋 Copie des credentials BigQuery..."
cp ../config/bigquery-credentials.json ./bigquery-credentials.json

# Déployer la Cloud Function
echo "🚀 Déploiement de la Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=nodejs20 \
    --region=$REGION \
    --source=. \
    --entry-point=scrapeArrondissements \
    --trigger-http \
    --memory=$MEMORY \
    --timeout=$TIMEOUT \
    --set-env-vars="GOOGLE_APPLICATION_CREDENTIALS=bigquery-credentials.json" \
    --allow-unauthenticated

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cloud Function déployée avec succès !"
    echo ""
    echo "📊 Informations de déploiement:"
    echo "   - URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    echo "   - Projet BigQuery: $PROJECT_ID"
    echo "   - Dataset: MarketData"
    echo "   - Table: ArrondissementSummary"
    echo ""
    echo "🧪 Test de la fonction:"
    echo "   curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"startArrondissement\": 1, \"endArrondissement\": 5}'"
    echo ""
    echo "📅 Pour programmer avec Cloud Scheduler:"
    echo "   gcloud scheduler jobs create http arrondissement-scraper-job \\"
    echo "        --schedule='0 6 * * *' \\"
    echo "        --uri=https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "        --http-method=POST \\"
    echo "        --headers='Content-Type=application/json' \\"
    echo "        --message-body='{\"startArrondissement\": 1, \"endArrondissement\": 20}'"
else
    echo "❌ Erreur lors du déploiement"
    exit 1
fi

# Nettoyer le fichier de credentials temporaire
rm -f ./bigquery-credentials.json

echo ""
echo "🎉 Déploiement terminé !"
