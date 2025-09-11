#!/bin/bash

# Script pour démarrer le scraper avec cron jobs
echo "🚀 Démarrage du scraper Booking.com avec cron jobs"
echo ""

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js d'abord."
    exit 1
fi

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "⏰ Configuration du cron job :"
echo "   - Planification : Tous les jours à 8h00 (heure de Paris)"
echo "   - Fichiers de sortie : legal-results-cron.csv et legal-results-cron.json"
echo ""

# Demander à l'utilisateur ce qu'il veut faire
echo "Que voulez-vous faire ?"
echo "1) Démarrer le scheduler (cron jobs automatiques)"
echo "2) Exécuter un test immédiat"
echo "3) Voir la configuration actuelle"
echo ""
read -p "Choisissez une option (1-3): " choice

case $choice in
    1)
        echo "🔄 Démarrage du scheduler..."
        echo "💡 Le scraper s'exécutera automatiquement tous les jours à 8h00"
        echo "⏹️  Appuyez sur Ctrl+C pour arrêter"
        node scraper-with-cron.js
        ;;
    2)
        echo "🧪 Exécution d'un test immédiat..."
        node scraper-with-cron.js test
        ;;
    3)
        echo "📋 Configuration actuelle :"
        echo "   - Planification : 0 8 * * * (tous les jours à 8h00)"
        echo "   - URLs configurées : Voir le fichier scraper-with-cron.js ligne 8-11"
        echo "   - Fichiers de sortie : legal-results-cron.csv, legal-results-cron.json"
        ;;
    *)
        echo "❌ Option invalide"
        exit 1
        ;;
esac
