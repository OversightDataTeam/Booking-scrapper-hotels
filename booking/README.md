# Booking.com Paris Arrondissements Scraper

Ce projet scrape le nombre de propriétés disponibles sur Booking.com pour chaque arrondissement de Paris.

## Configuration

### Prérequis
- Node.js
- Google Cloud Project avec BigQuery activé
- Google Sheet avec BigQuery Connector

### Installation

1. Cloner le repository
```bash
git clone [repository-url]
cd booking
```

2. Installer les dépendances
```bash
npm install
```

### Configuration Google Apps Script

1. Créer un nouveau projet dans [Google Apps Script](https://script.google.com)
2. Copier le contenu de `apps-script.js` dans l'éditeur
3. Déployer en tant qu'application web :
   - Cliquer sur "Deploy" > "New deployment"
   - Choisir "Web app"
   - Configurer :
     - Execute as: "Me"
     - Who has access: "Anyone"
   - Cliquer sur "Deploy"
4. Copier l'URL de déploiement

### Configuration Google Sheet

1. Créer une nouvelle feuille de calcul Google
2. Installer l'extension "BigQuery Connector" :
   - Extensions > Add-ons > Get add-ons
   - Rechercher "BigQuery Connector"
   - Installer
3. Configurer la connexion BigQuery :
   - Extensions > BigQuery Connector > Connect to BigQuery
   - Sélectionner le projet
   - Configurer la synchronisation de la feuille 'RawData' vers BigQuery

### Configuration du Scraper

1. Mettre à jour l'URL du webhook dans `scraper.js` :
```javascript
const WEBHOOK_URL = 'votre-url-de-deploiement';
```

## Utilisation

Lancer le scraper :
```bash
node scraper.js
```

Le script va :
1. Scraper les données pour chaque arrondissement
2. Envoyer les données au webhook
3. Les données seront stockées dans la feuille 'RawData'
4. BigQuery Connector synchronisera automatiquement les données vers BigQuery

## Structure des données

### Google Sheet (RawData)
- ObservationDate (DATETIME)
- Arrondissement (TEXT)
- PropertiesCount (NUMBER)

### BigQuery Table
- ObservationDate (DATETIME)
- Arrondissement (STRING)
- PropertiesCount (INT64)

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub. 