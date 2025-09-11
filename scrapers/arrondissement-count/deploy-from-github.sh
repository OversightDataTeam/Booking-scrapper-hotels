#!/bin/bash

# Script pour déployer depuis GitHub
# Ce script déploie la Cloud Function directement depuis un repository GitHub

echo "🚀 Déploiement depuis GitHub"
echo "============================"

# Configuration
PROJECT_ID="oversight-datalake"
FUNCTION_NAME="arrondissement-scraper"
REGION="europe-west1"
MEMORY="2GB"
TIMEOUT="540s"

# Remplacez par votre repository GitHub
GITHUB_REPO="votre-username/votre-repo"
GITHUB_BRANCH="main"
SOURCE_PATH="scrapers/arrondissement-count/cloud-function"

echo "📊 Configuration:"
echo "   - Projet: $PROJECT_ID"
echo "   - Fonction: $FUNCTION_NAME"
echo "   - Région: $REGION"
echo "   - Repository: $GITHUB_REPO"
echo "   - Branche: $GITHUB_BRANCH"
echo "   - Chemin source: $SOURCE_PATH"
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

# Déployer depuis GitHub
echo "🚀 Déploiement depuis GitHub..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=nodejs20 \
    --region=$REGION \
    --source="https://source.developers.google.com/projects/$PROJECT_ID/repos/github_$(echo $GITHUB_REPO | tr '/' '_')/moveable-aliases/$GITHUB_BRANCH/paths/$SOURCE_PATH" \
    --entry-point=scrapeArrondissements \
    --trigger-http \
    --memory=$MEMORY \
    --timeout=$TIMEOUT \
    --allow-unauthenticated

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cloud Function déployée avec succès depuis GitHub !"
    echo ""
    echo "📊 Informations de déploiement:"
    echo "   - URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    echo "   - Source: GitHub repository $GITHUB_REPO"
    echo "   - Projet BigQuery: oversight-datalake"
    echo ""
    echo "🧪 Test de la fonction:"
    echo "   curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"startArrondissement\": 1, \"endArrondissement\": 5, \"concurrentLimit\": 4}'"
else
    echo "❌ Erreur lors du déploiement depuis GitHub"
    echo ""
    echo "🔍 Solutions possibles:"
    echo "   1. Vérifiez que le repository GitHub est connecté à Google Cloud"
    echo "   2. Vérifiez les permissions sur le repository"
    echo "   3. Essayez de déployer manuellement via la console Google Cloud"
fi

echo ""
echo "🎉 Script terminé !"

