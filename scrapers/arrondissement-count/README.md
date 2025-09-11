# 🏠 Paris Arrondissement Count Scraper

Scraper simple pour compter les propriétés par arrondissement sur Booking.com.

## 🚀 Utilisation

### Local
```bash
cd scrapers/arrondissement-count
npm install
node scraper.js
```

### Cloud Run (via GitHub Actions)
Le scraper se lance automatiquement tous les jours à 6h00.

## 📊 Données

- **Source** : Booking.com
- **Destination** : BigQuery (`oversight-datalake.MarketData.ArrondissementSummary`)
- **Fréquence** : Quotidienne

## 🔧 Configuration

- **Arrondissements** : 1-20
- **Workers parallèles** : 4
- **Délai entre requêtes** : 2 secondes
