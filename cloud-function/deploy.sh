#!/bin/bash

# Script de déploiement pour la Cloud Function
# Assurez-vous d'être connecté à gcloud et d'avoir les bonnes permissions

echo "🚀 Déploiement de la Cloud Function pour le scraper Booking.com..."

# Variables de configuration
FUNCTION_NAME="scrapeBookingData"
REGION="europe-west1"
MEMORY="1GB"
TIMEOUT="540s"
RUNTIME="nodejs20"

# Déployer la Cloud Function
echo "📦 Déploiement de la fonction..."
gcloud functions deploy $FUNCTION_NAME \
  --runtime $RUNTIME \
  --trigger-http \
  --allow-unauthenticated \
  --memory $MEMORY \
  --timeout $TIMEOUT \
  --region $REGION \
  --source . \
  --entry-point scrapeBookingData

if [ $? -eq 0 ]; then
    echo "✅ Cloud Function déployée avec succès!"
    
    # Récupérer l'URL de la fonction
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(httpsTrigger.url)")
    echo "🌐 URL de la fonction: $FUNCTION_URL"
    
    # Tester la fonction
    echo "🧪 Test de la fonction..."
    curl -X POST $FUNCTION_URL \
      -H "Content-Type: application/json" \
      -d '{"test": true}'
    
    echo ""
    echo "📋 Prochaines étapes:"
    echo "1. Configurez Google Cloud Scheduler pour appeler cette fonction"
    echo "2. Définissez les URLs à scraper dans les variables d'environnement"
    echo "3. Vérifiez que BigQuery est configuré correctement"
    
else
    echo "❌ Erreur lors du déploiement"
    exit 1
fi
