# 🏛️ Paris Arrondissement Legal Info Scraper

Scraper avancé pour collecter les informations légales des arrondissements parisiens sur 180 jours.

## 🚀 Utilisation

### Local
```bash
cd scrapers/legal-info
npm install
node scraper.js
```

### Cloud Run (via GitHub Actions)
Le scraper se lance automatiquement tous les jours à 6h00.

## 📊 Données

- **Source** : Booking.com
- **Destination** : BigQuery (`oversight-datalake.MarketData.Arrondissement`)
- **Fréquence** : Quotidienne
- **Période** : 180 jours de données

## 🔧 Configuration

- **Arrondissements** : 1-20
- **Workers parallèles** : 15
- **Période** : 180 jours
- **Webhook** : Google Apps Script intégré

## 📈 Volume de données

- **20 arrondissements** × **180 jours** = **3,600 requêtes par exécution**
- **Temps estimé** : ~6-8 heures
- **Données** : Nombre de propriétés par arrondissement et par date
