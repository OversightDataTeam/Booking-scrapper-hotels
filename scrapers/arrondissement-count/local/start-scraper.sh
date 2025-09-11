#!/bin/bash

# Script de démarrage pour le scraper d'arrondissements optimisé
# Ce script lance le scraper avec les bonnes variables d'environnement

echo "🚀 Démarrage du scraper d'arrondissements optimisé"
echo "=================================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "arrondissement-scraper-optimized.js" ]; then
    echo "❌ Erreur: arrondissement-scraper-optimized.js non trouvé"
    echo "   Assurez-vous d'être dans le répertoire scrapers/arrondissement-count/"
    exit 1
fi

# Vérifier que les credentials BigQuery existent
if [ ! -f "../../../config/bigquery-credentials.json" ]; then
    echo "❌ Erreur: bigquery-credentials.json non trouvé"
    echo "   Copiez le fichier depuis bigquery-credentials.json.example"
    echo "   et ajoutez vos vraies credentials"
    exit 1
fi

# Définir la variable d'environnement pour les credentials
export GOOGLE_APPLICATION_CREDENTIALS="../../../config/bigquery-credentials.json"

echo "✅ Credentials BigQuery configurés: $GOOGLE_APPLICATION_CREDENTIALS"
echo "📊 Projet BigQuery: oversight-datalake"
echo "📊 Dataset: MarketData"
echo "📊 Table: ArrondissementSummary"
echo ""

# Créer le dossier data s'il n'existe pas
mkdir -p ../../../data

echo "🎯 Configuration:"
echo "   - 4 processus parallèles"
echo "   - Délais équilibrés (3-7s entre batches)"
echo "   - Timeouts fiables (60s)"
echo "   - Sauvegarde progressive en CSV"
echo "   - Insertion BigQuery en temps réel"
echo ""

# Demander confirmation
read -p "Voulez-vous lancer le scraper ? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Scraping annulé"
    exit 0
fi

echo ""
echo "🚀 Lancement du scraper..."
echo "   (Appuyez sur Ctrl+C pour arrêter)"
echo ""

# Lancer le scraper
node arrondissement-scraper-optimized.js

echo ""
echo "✅ Scraping terminé !"
echo "📁 Résultats sauvegardés dans:"
echo "   - ../../../data/arrondissement-results.json"
echo "   - ../../../data/arrondissement-results.csv"
echo "📊 Données insérées dans BigQuery: oversight-datalake.MarketData.ArrondissementSummary"
