#!/bin/bash

# Script pour configurer un cron job local
# Ce script configure l'exécution automatique du scraper local

echo "🕐 Configuration du cron job local"
echo "=================================="

# Vérifier que le script local existe
if [ ! -f "local/start-scraper.sh" ]; then
    echo "❌ Erreur: local/start-scraper.sh non trouvé"
    exit 1
fi

# Obtenir le chemin absolu du script
SCRIPT_PATH=$(pwd)/local/start-scraper.sh
echo "📁 Chemin du script: $SCRIPT_PATH"

# Créer le cron job (tous les jours à 6h du matin)
CRON_JOB="0 6 * * * cd $(pwd) && $SCRIPT_PATH >> $(pwd)/logs/cron.log 2>&1"

echo "📋 Cron job à ajouter:"
echo "   $CRON_JOB"
echo ""

# Créer le dossier de logs s'il n'existe pas
mkdir -p logs

# Ajouter le cron job
echo "🔧 Ajout du cron job..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job ajouté avec succès !"
    echo ""
    echo "📊 Configuration:"
    echo "   - Exécution: Tous les jours à 6h du matin"
    echo "   - Script: $SCRIPT_PATH"
    echo "   - Logs: $(pwd)/logs/cron.log"
    echo ""
    echo "🔍 Vérification:"
    echo "   crontab -l"
    echo ""
    echo "🧪 Test manuel:"
    echo "   $SCRIPT_PATH"
    echo ""
    echo "📝 Logs en temps réel:"
    echo "   tail -f $(pwd)/logs/cron.log"
else
    echo "❌ Erreur lors de l'ajout du cron job"
    exit 1
fi

echo "🎉 Configuration terminée !"

