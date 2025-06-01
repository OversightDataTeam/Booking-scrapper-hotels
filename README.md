# Paris Hotels Market Data Scraper (Booking.com, 180 Days)

Ce projet scrape le nombre de propriétés disponibles sur Booking.com pour chaque arrondissement de Paris, sur 180 jours glissants, et envoie les données vers Google Sheets puis BigQuery.

---

## 🗺️ Workflow

```
[Scraper Node.js] → [Google Apps Script Webhook] → [Google Sheets] → [BigQuery]
```

---

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

1. Mettre à jour l'URL du webhook dans `scraper.js` ou `scraper2.js` :
```javascript
const WEBHOOK_URL = 'votre-url-de-deploiement';
```

---

## Utilisation

### Scraping d'une seule date (scraper.js)
```bash
node scraper.js
```

### Scraping sur 180 jours (scraper2.js)
```bash
node scraper2.js
```

Le script va :
1. Scraper les données pour chaque arrondissement et chaque date
2. Envoyer les données au webhook
3. Les données seront stockées dans la feuille 'RawData' ou '180DaysData'
4. BigQuery Connector synchronisera automatiquement les données vers BigQuery

---

## Structure des données

### Google Sheet (RawData)
- ObservationDate (DATETIME, format : `YYYY-MM-DD HH:mm:ss`)
- Arrondissement (TEXT)
- PropertiesCount (NUMBER)

### Google Sheet (180DaysData)
- arrondissement (TEXT)
- propertiesCount (NUMBER)
- check-in date (DATETIME, format : `YYYY-MM-DD HH:mm:ss`)
- check-out date (DATETIME, format : `YYYY-MM-DD HH:mm:ss`)
- scraping date (DATETIME, format : `YYYY-MM-DD HH:mm:ss`)

### Exemple de ligne de données
| ObservationDate        | Arrondissement | PropertiesCount |
|-----------------------|----------------|----------------|
| 2025-06-01 10:08:27   | 1              | 102            |

---

## Conseils & Limitations
- Booking.com peut détecter le scraping massif : privilégier un parallélisme raisonnable (5 à 10).
- Les données sont envoyées en temps réel à Google Sheets, attention aux quotas Google Apps Script.
- Pour une intégration BigQuery sans erreur, toutes les dates doivent être au format `YYYY-MM-DD HH:mm:ss`.

---

## Licence

Usage privé ou adaptation open source selon vos besoins. (Aucune licence explicite fournie dans ce dépôt.)

---

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub. 