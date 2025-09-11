#!/bin/bash

# Script pour tester le déploiement cloud
# Ce script teste la Cloud Function déployée

echo "🧪 Test du déploiement cloud"
echo "============================"

# Configuration
PROJECT_ID="oversight-datalake"
FUNCTION_NAME="arrondissement-scraper"
REGION="europe-west1"

# URL de la Cloud Function
FUNCTION_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"

echo "📊 Configuration:"
echo "   - Projet: $PROJECT_ID"
echo "   - Fonction: $FUNCTION_NAME"
echo "   - Région: $REGION"
echo "   - URL: $FUNCTION_URL"
echo ""

# Test avec seulement 3 arrondissements pour vérifier que ça fonctionne
echo "🧪 Test avec les arrondissements 1, 2, 3..."
echo "   (Test rapide pour vérifier le déploiement)"
echo ""

# Données de test
TEST_PAYLOAD='{
  "startArrondissement": 1,
  "endArrondissement": 3,
  "concurrentLimit": 2
}'

echo "📝 Payload de test:"
echo "$TEST_PAYLOAD" | jq . 2>/dev/null || echo "$TEST_PAYLOAD"
echo ""

# Exécuter le test
echo "🚀 Exécution du test..."
echo "   (Cela peut prendre 1-2 minutes)"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" \
  --max-time 300 \
  --show-error \
  --fail-with-body

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test réussi !"
    echo ""
    echo "📊 Vérifiez les données dans BigQuery:"
    echo "   SELECT * FROM \`oversight-datalake.MarketData.ArrondissementSummary\`"
    echo "   WHERE DATE(ObservationDate) = CURRENT_DATE('Europe/Brussels')"
    echo "   ORDER BY ObservationDate DESC;"
    echo ""
    echo "🌐 Console BigQuery:"
    echo "   https://console.cloud.google.com/bigquery?project=$PROJECT_ID"
else
    echo ""
    echo "❌ Test échoué !"
    echo ""
    echo "🔍 Vérifications possibles:"
    echo "   1. La Cloud Function est-elle déployée ?"
    echo "   2. Les credentials BigQuery sont-ils corrects ?"
    echo "   3. Le projet a-t-il le billing activé ?"
    echo ""
    echo "📋 Logs de la Cloud Function:"
    echo "   gcloud functions logs read $FUNCTION_NAME --region=$REGION --limit=50"
fi

