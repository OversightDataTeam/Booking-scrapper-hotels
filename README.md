# Paris Hotels Market Data Scraper (Booking.com)

Ce projet scrape le nombre de propriétés disponibles sur Booking.com pour chaque arrondissement de Paris et envoie les données directement vers BigQuery.

## Configuration

### Prérequis

* Node.js
* Google Cloud Project avec BigQuery activé
* Service account avec accès BigQuery

### Installation

1. Cloner le repository
```bash
git clone https://github.com/rcoco78/paris-hotels-scraper.git
cd paris-hotels-scraper
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les credentials BigQuery
- Créer un fichier `credentials.json` dans le dossier `booking` avec les credentials de votre service account

## Utilisation

```bash
node scraper.js
```

Le script va :
1. Scraper les données pour chaque arrondissement
2. Insérer directement les données dans BigQuery

## Structure des données BigQuery

Table : `oversight-datalake.MarketData.ArrondissementSummary`

| Colonne | Type | Description |
|---------|------|-------------|
| ObservationDate | DATETIME | Date et heure de l'observation |
| Arrondissement | STRING | Numéro de l'arrondissement |
| PropertiesCount | INTEGER | Nombre de propriétés trouvées |

## Limitations

* Booking.com peut détecter le scraping massif
* Les données sont envoyées en temps réel à BigQuery
* Pour une intégration BigQuery sans erreur, toutes les dates doivent être au format `YYYY-MM-DD HH:mm:ss`

---

## Licence

Usage privé ou adaptation open source selon vos besoins. (Aucune licence explicite fournie dans ce dépôt.)

---

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub. 