# 🏠 Paris Arrondissement Scrapers

Collection de scrapers pour analyser les données des arrondissements parisiens sur Booking.com.

## 📁 Structure

```
.
├── simple-scraper/          # Scraper simple (comptage)
│   ├── scraper.js          # Code du scraper
│   ├── package.json        # Dépendances
│   └── README.md           # Documentation
├── scrapers/legal-info/    # Scraper avancé (180 jours)
│   ├── scraper.js          # Code du scraper
│   ├── package.json        # Dépendances
│   └── README.md           # Documentation
├── .github/workflows/      # GitHub Actions
│   ├── daily-scraper.yml   # Workflow simple (6h00)
│   └── legal-scraper.yml   # Workflow avancé (2h00)
└── README.md               # Ce fichier
```

## 🚀 Utilisation

### Scraper Simple (Comptage)
```bash
cd simple-scraper
npm install
node scraper.js
```

### Scraper Avancé (180 jours)
```bash
cd scrapers/legal-info
npm install
node scraper.js
```

### Daily (GitHub Actions)
- **Scraper simple** : Tous les jours à 6h00
- **Scraper avancé** : Tous les jours à 2h00

## 📊 Données

### Scraper Simple
- **Source** : Booking.com
- **Destination** : BigQuery (`oversight-datalake.MarketData.ArrondissementSummary`)
- **Fréquence** : Quotidienne
- **Données** : Nombre de propriétés par arrondissement

### Scraper Avancé
- **Source** : Booking.com
- **Destination** : BigQuery (`oversight-datalake.MarketData.Arrondissement`)
- **Fréquence** : Quotidienne
- **Données** : Nombre de propriétés par arrondissement et par date (180 jours)

## 🔧 Configuration

- **Arrondissements** : 1-20
- **Workers parallèles** : 3 (simple) / 15 (avancé)
- **Volume** : 20 requêtes (simple) / 3,600 requêtes (avancé)
