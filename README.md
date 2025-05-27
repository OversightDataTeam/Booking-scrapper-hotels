# Paris Hotels Scraper 🏨

Un scraper intelligent pour collecter les informations des hôtels de Paris par arrondissement, utilisant Puppeteer pour l'automatisation.

## 🌟 Fonctionnalités

- Scraping parallèle de 5 arrondissements simultanément
- Collecte des informations détaillées :
  - URL de l'hôtel
  - Nom de l'hôtel
  - Note de l'hôtel
  - Arrondissement
  - Nombre de propriétés par arrondissement
  - URL de recherche
  - Dates de check-in/check-out
  - Date et heure du scraping
- Gestion automatique des dates (check-in = demain, check-out = après-demain)
- Déduplication automatique des hôtels
- Export au format CSV avec séparateur point-virgule

## 📋 Prérequis

- Node.js (version 14 ou supérieure)
- npm (généralement installé avec Node.js)

## 🚀 Installation

1. Clonez le repository :
```bash
git clone [URL_DU_REPO]
cd [NOM_DU_REPO]
```

2. Installez les dépendances :
```bash
npm install
```

## 💻 Utilisation

1. Lancez le scraper :
```bash
node scraper.js
```

Le script va :
- Scraper les 20 arrondissements de Paris
- Traiter 5 arrondissements en parallèle
- Sauvegarder les résultats dans `hotel_url.csv`

## 📊 Format du CSV

Le fichier CSV généré contient les colonnes suivantes :
- URL : Lien vers l'hôtel sur Booking.com
- Nom : Nom de l'hôtel
- Note : Note de l'hôtel
- Arrondissement : Numéro de l'arrondissement
- Nombre de propriétés : Nombre total d'hôtels dans l'arrondissement
- URL de recherche : URL utilisée pour la recherche
- Date check-in : Date de check-in (demain)
- Date check-out : Date de check-out (après-demain)
- Date et heure du scraping : Moment exact du scraping

## ⚙️ Configuration

Vous pouvez modifier les paramètres suivants dans `scraper.js` :
- Nombre d'arrondissements à scraper
- Taille des lots parallèles
- Délai entre les lots
- Format des dates

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement

Ce script est fourni à des fins éducatives uniquement. Assurez-vous de respecter les conditions d'utilisation de Booking.com et les lois en vigueur concernant le scraping de données. 