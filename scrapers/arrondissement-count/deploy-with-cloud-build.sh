#!/bin/bash

# Script pour déployer avec Cloud Build (sans Docker local)

echo "☁️ Déploiement avec Google Cloud Build"
echo "====================================="

# Configuration
PROJECT_ID="pptr-382219"
SERVICE_NAME="arrondissement-scraper"
REGION="europe-west1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "📊 Configuration:"
echo "   - Projet: $PROJECT_ID"
echo "   - Service: $SERVICE_NAME"
echo "   - Région: $REGION"
echo "   - Image: $IMAGE_NAME"
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

# Activer les APIs nécessaires
echo "🔌 Activation des APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Construire l'image avec Cloud Build
echo "🔨 Construction de l'image avec Cloud Build..."
gcloud builds submit --tag $IMAGE_NAME .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Image construite avec succès !"
    echo ""
    echo "📊 Informations de l'image:"
    echo "   - URL: $IMAGE_NAME"
    echo "   - Projet: $PROJECT_ID"
    echo ""
    echo "🚀 Maintenant, dans la console Google Cloud:"
    echo "   1. Allez sur Cloud Run"
    echo "   2. Cliquez sur 'Deploy container'"
    echo "   3. Collez cette URL: $IMAGE_NAME"
    echo "   4. Configurez le service et déployez"
    echo ""
    echo "🧪 Test après déploiement:"
    echo "   curl -X POST https://$SERVICE_NAME-xxxxx-uc.a.run.app/scrape \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"startArrondissement\": 1, \"endArrondissement\": 5, \"concurrentLimit\": 4}'"
else
    echo "❌ Erreur lors de la construction de l'image"
    exit 1
fi

echo ""
echo "🎉 Script terminé !"
