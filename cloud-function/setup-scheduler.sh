#!/bin/bash

# Script pour configurer Google Cloud Scheduler
# Ce script crée un job cron qui appelle votre Cloud Function

echo "⏰ Configuration de Google Cloud Scheduler..."

# Variables de configuration
JOB_NAME="booking-scraper-daily"
FUNCTION_NAME="scrapeBookingData"
REGION="europe-west1"
PROJECT_ID=$(gcloud config get-value project)

# Vérifier que le projet est configuré
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Aucun projet Google Cloud configuré. Exécutez: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Projet: $PROJECT_ID"
echo "📋 Région: $REGION"
echo "📋 Fonction: $FUNCTION_NAME"

# Récupérer l'URL de la Cloud Function
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(httpsTrigger.url)")

if [ -z "$FUNCTION_URL" ]; then
    echo "❌ Impossible de récupérer l'URL de la Cloud Function. Assurez-vous qu'elle est déployée."
    exit 1
fi

echo "🌐 URL de la fonction: $FUNCTION_URL"

# Créer le job de scheduler
echo "📅 Création du job cron (tous les jours à 8h00 UTC)..."
gcloud scheduler jobs create http $JOB_NAME \
  --schedule="0 8 * * *" \
  --uri="$FUNCTION_URL" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"triggered_by":"cloud_scheduler"}' \
  --time-zone="Europe/Paris" \
  --description="Job quotidien pour scraper Booking.com" \
  --location=$REGION

if [ $? -eq 0 ]; then
    echo "✅ Job de scheduler créé avec succès!"
    echo ""
    echo "📋 Détails du job:"
    echo "   - Nom: $JOB_NAME"
    echo "   - Planification: Tous les jours à 8h00 (heure de Paris)"
    echo "   - URL: $FUNCTION_URL"
    echo ""
    echo "🔧 Commandes utiles:"
    echo "   - Voir les jobs: gcloud scheduler jobs list --location=$REGION"
    echo "   - Exécuter manuellement: gcloud scheduler jobs run $JOB_NAME --location=$REGION"
    echo "   - Supprimer le job: gcloud scheduler jobs delete $JOB_NAME --location=$REGION"
    echo "   - Voir les logs: gcloud logging read 'resource.type=cloud_function' --limit=50"
    
else
    echo "❌ Erreur lors de la création du job de scheduler"
    exit 1
fi

