#!/bin/bash

# Script principal pour lancer le scraper d'arrondissements
# Ce script permet de choisir entre les différentes options d'exécution

echo "🚀 Scraper d'Arrondissements Paris - Booking.com"
echo "================================================"
echo ""
echo "Ce scraper compte le nombre de propriétés disponibles sur Booking.com"
echo "pour chaque arrondissement de Paris (1er au 20ème)."
echo ""
echo "📊 Résultats :"
echo "   - Sauvegarde locale en CSV/JSON"
echo "   - Insertion dans BigQuery (oversight-datalake.MarketData.ArrondissementSummary)"
echo ""

# Vérifier que les credentials BigQuery existent
if [ ! -f "../../config/bigquery-credentials.json" ]; then
    echo "⚠️  Attention: bigquery-credentials.json non trouvé"
    echo "   Copiez le fichier depuis bigquery-credentials.json.example"
    echo "   et ajoutez vos vraies credentials"
    echo ""
fi

echo "🎯 Choisissez votre option d'exécution :"
echo ""
echo "1) 🏠 Version Locale (Recommandée)"
echo "   - Exécution immédiate"
echo "   - Sauvegarde locale + BigQuery"
echo "   - Parallélisation (4 processus)"
echo "   - ~1-2 minutes pour 20 arrondissements"
echo ""
echo "2) ☁️  Test Cloud Function (Local)"
echo "   - Test de la fonction cloud en local"
echo "   - Même fonctionnalités que la version locale"
echo "   - Utile pour tester avant déploiement"
echo ""
echo "3) 🚀 Déployer Cloud Function"
echo "   - Déploiement sur Google Cloud Platform"
echo "   - Nécessite un projet avec billing activé"
echo "   - Permet l'automatisation avec Cloud Scheduler"
echo ""
echo "4) 📖 Afficher l'aide"
echo "   - Documentation complète"
echo ""

read -p "Votre choix (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🏠 Lancement de la version locale..."
        cd local/
        ./start-scraper.sh
        ;;
    2)
        echo ""
        echo "☁️  Test de la Cloud Function en local..."
        cd cloud-function/
        ./run-locally.sh
        ;;
    3)
        echo ""
        echo "🚀 Déploiement de la Cloud Function..."
        echo "⚠️  Assurez-vous d'avoir un projet Google Cloud avec billing activé"
        read -p "Continuer ? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd cloud-function/
            ./deploy.sh
        else
            echo "❌ Déploiement annulé"
        fi
        ;;
    4)
        echo ""
        echo "📖 Documentation complète :"
        echo ""
        cat README.md
        ;;
    *)
        echo ""
        echo "❌ Choix invalide. Veuillez choisir entre 1 et 4."
        exit 1
        ;;
esac

echo ""
echo "✅ Opération terminée !"
echo ""
echo "📊 Vérifiez vos données :"
echo "   - Fichiers locaux : ../../data/"
echo "   - BigQuery : oversight-datalake.MarketData.ArrondissementSummary"
