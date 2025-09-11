#!/bin/bash

# Script de déploiement complet sur Google Cloud Platform
# Ce script déploie la Cloud Function et configure l'automatisation

echo "🚀 Déploiement complet sur Google Cloud Platform"
echo "==============================================="

# Configuration
PROJECT_ID="oversight-datalake"
FUNCTION_NAME="arrondissement-scraper"
REGION="europe-west1"
SCHEDULER_JOB_NAME="arrondissement-scraper-daily"
SCHEDULE="0 6 * * *"  # Tous les jours à 6h du matin

echo "📊 Configuration:"
echo "   - Projet: $PROJECT_ID"
echo "   - Fonction: $FUNCTION_NAME"
echo "   - Région: $REGION"
echo "   - Planification: $SCHEDULE (tous les jours à 6h)"
echo ""

# Vérifier que gcloud est installé et configuré
if ! command -v gcloud &> /dev/null; then
    echo "❌ Erreur: gcloud CLI n'est pas installé"
    echo "   Installez-le avec: brew install google-cloud-sdk"
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
echo "🔧 Activation des APIs nécessaires..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable bigquery.googleapis.com

# Déployer la Cloud Function
echo "🚀 Déploiement de la Cloud Function..."
cd cloud-function/
./deploy.sh

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du déploiement de la Cloud Function"
    exit 1
fi

cd ..

# Créer le job Cloud Scheduler
echo "📅 Configuration de Cloud Scheduler..."

# Supprimer le job existant s'il existe
gcloud scheduler jobs delete $SCHEDULER_JOB_NAME --location=$REGION --quiet 2>/dev/null || true

# Créer le nouveau job
gcloud scheduler jobs create http $SCHEDULER_JOB_NAME \
    --location=$REGION \
    --schedule="$SCHEDULE" \
    --time-zone="Europe/Paris" \
    --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"startArrondissement": 1, "endArrondissement": 20, "concurrentLimit": 4}' \
    --description="Scraper quotidien des arrondissements de Paris"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement terminé avec succès !"
    echo ""
    echo "📊 Informations de déploiement:"
    echo "   - Cloud Function URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    echo "   - Planification: $SCHEDULE (tous les jours à 6h)"
    echo "   - Timezone: Europe/Paris"
    echo "   - Configuration: 4 workers, 20 arrondissements"
    echo ""
    echo "🧪 Test manuel de la fonction:"
    echo "   curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"startArrondissement\": 1, \"endArrondissement\": 5, \"concurrentLimit\": 4}'"
    echo ""
    echo "📅 Gestion du scheduler:"
    echo "   - Voir les jobs: gcloud scheduler jobs list --location=$REGION"
    echo "   - Exécuter maintenant: gcloud scheduler jobs run $SCHEDULER_JOB_NAME --location=$REGION"
    echo "   - Supprimer: gcloud scheduler jobs delete $SCHEDULER_JOB_NAME --location=$REGION"
    echo ""
    echo "📊 Vérification des données:"
    echo "   - BigQuery: oversight-datalake.MarketData.ArrondissementSummary"
    echo "   - Console: https://console.cloud.google.com/bigquery"
else
    echo "❌ Erreur lors de la configuration de Cloud Scheduler"
    exit 1
fi

echo ""
echo "🎉 Votre scraper est maintenant déployé et automatisé !"
echo "   Il s'exécutera automatiquement tous les jours à 6h du matin."
