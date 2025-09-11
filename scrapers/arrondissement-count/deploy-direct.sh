#!/bin/bash

# Script de déploiement direct sans activation d'APIs
# Ce script essaie de déployer directement la Cloud Function

echo "🚀 Déploiement direct sur oversight-datalake"
echo "==========================================="

# Configuration
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

# Vérifier que gcloud est installé et configuré
if ! command -v gcloud &> /dev/null; then
    echo "❌ Erreur: gcloud CLI n'est pas installé"
    exit 1
fi

# Vérifier l'authentification
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Erreur: Vous n'êtes pas authentifié avec gcloud"
    echo "   Connectez-vous avec: gcloud auth login"
    exit 1
fi

# Définir le projet
echo "🔧 Configuration du projet..."
gcloud config set project $PROJECT_ID

# Vérifier que les credentials BigQuery existent
if [ ! -f "../../config/bigquery-credentials.json" ]; then
    echo "❌ Erreur: bigquery-credentials.json non trouvé"
    echo "   Copiez le fichier depuis bigquery-credentials.json.example"
    exit 1
fi

# Copier les credentials dans le dossier de déploiement
echo "📋 Copie des credentials BigQuery..."
cp ../../config/bigquery-credentials.json cloud-function/bigquery-credentials.json

# Essayer de déployer directement sans activer les APIs
echo "🚀 Tentative de déploiement direct..."
cd cloud-function/
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
    echo "   - Projet BigQuery: oversight-datalake"
    echo "   - Dataset: MarketData"
    echo "   - Table: ArrondissementSummary"
    echo ""
    echo "🧪 Test de la fonction:"
    echo "   curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"startArrondissement\": 1, \"endArrondissement\": 5, \"concurrentLimit\": 4}'"
    echo ""
    echo "📊 Vérification des données:"
    echo "   - BigQuery: oversight-datalake.MarketData.ArrondissementSummary"
    echo "   - Console: https://console.cloud.google.com/bigquery"
else
    echo "❌ Erreur lors du déploiement"
    echo ""
    echo "🔍 Solutions possibles:"
    echo "   1. Demandez à l'administrateur du projet d'activer les APIs:"
    echo "      - cloudfunctions.googleapis.com"
    echo "      - bigquery.googleapis.com"
    echo "   2. Ou utilisez un projet où vous avez les permissions"
    echo "   3. Ou déployez manuellement via la console Google Cloud"
fi

# Nettoyer le fichier de credentials temporaire
rm -f cloud-function/bigquery-credentials.json

echo ""
echo "🎉 Script terminé !"
