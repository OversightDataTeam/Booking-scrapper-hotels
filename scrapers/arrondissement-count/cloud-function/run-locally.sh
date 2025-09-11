#!/bin/bash

# Script pour exécuter le scraper localement avec connexion BigQuery
# Ce script simule l'exécution d'une Cloud Function en local

echo "🚀 Exécution locale du scraper d'arrondissements avec BigQuery"
echo "============================================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "index.js" ]; then
    echo "❌ Erreur: index.js non trouvé"
    echo "   Assurez-vous d'être dans le répertoire cloud-function-arrondissement/"
    exit 1
fi

# Vérifier que les credentials BigQuery existent
if [ ! -f "../config/bigquery-credentials.json" ]; then
    echo "❌ Erreur: bigquery-credentials.json non trouvé"
    echo "   Copiez le fichier depuis bigquery-credentials.json.example"
    exit 1
fi

# Définir la variable d'environnement pour les credentials
export GOOGLE_APPLICATION_CREDENTIALS="../config/bigquery-credentials.json"

echo "✅ Credentials BigQuery configurés: $GOOGLE_APPLICATION_CREDENTIALS"
echo "📊 Projet BigQuery: oversight-datalake"
echo "📊 Dataset: MarketData"
echo "📊 Table: ArrondissementSummary"
echo ""

# Créer un script Node.js temporaire pour simuler l'appel de la Cloud Function
cat > test-function.js << 'EOF'
const { scrapeArrondissements } = require('./index.js');

// Simuler un objet req et res
const mockReq = {
  method: 'POST',
  body: {
    startArrondissement: 1,
    endArrondissement: 5  // Test avec seulement 5 arrondissements
  }
};

const mockRes = {
  set: (key, value) => console.log(`Setting header: ${key} = ${value}`),
  status: (code) => ({
    json: (data) => {
      console.log(`\n📊 Résultat (Status ${code}):`);
      console.log(JSON.stringify(data, null, 2));
    }
  })
};

// Exécuter la fonction
scrapeArrondissements(mockReq, mockRes)
  .then(() => {
    console.log('\n✅ Test terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors du test:', error);
    process.exit(1);
  });
EOF

echo "🧪 Test de la fonction avec les arrondissements 1 à 5..."
echo "   (Appuyez sur Ctrl+C pour arrêter)"
echo ""

# Exécuter le test
node test-function.js

# Nettoyer le fichier temporaire
rm -f test-function.js

echo ""
echo "✅ Test terminé !"
echo "📊 Vérifiez les données dans BigQuery:"
echo "   - Projet: oversight-datalake"
echo "   - Dataset: MarketData"
echo "   - Table: ArrondissementSummary"
