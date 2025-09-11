# Scraper Légal Booking.com

Ce scraper automatise la récupération des informations légales des hôtels sur Booking.com.

## 🎯 Fonctionnalités

Le scraper suit ces étapes automatiquement :

1. **Navigation** : Va sur la page de l'hôtel McMullens
2. **Identification** : Trouve la section "Legal information"
3. **Interaction** : Clique sur "See business details"
4. **Extraction** : Récupère les informations de la modale
5. **Sauvegarde** : Enregistre les données en JSON et CSV

## 📊 Données récupérées

- **Nom de l'entreprise** : McMullen & Sons Ltd
- **Adresse** : McMullens & Sons 26 Old Cross, SG14 1RD Hertford, Hertfordshire
- **Email** : contact@mcmullens.co.uk
- **Téléphone** : +4401992584911
- **Numéro de registre** : 00051456 (si disponible)

## 🚀 Utilisation

### Prérequis

```bash
npm install
```

### Exécution

```bash
# Version simple
node legal-scraper-simple.js

# Version robuste (recommandée)
node legal-scraper-robust.js
```

## 📁 Fichiers générés

- `legal-business-info.json` : Données au format JSON
- `legal-business-info.csv` : Données au format CSV
- `legal-modal-screenshot.png` : Capture d'écran de la modale
- `error-screenshot.png` : Capture d'écran en cas d'erreur

## 🔧 Configuration

### Options disponibles

- `headless: false` : Affiche le navigateur (pour debug)
- `timeout: 15000` : Délai d'attente pour les éléments
- `waitForTimeout: 3000` : Pause entre les actions

### Personnalisation

Pour scraper un autre hôtel, modifiez l'URL dans le script :

```javascript
await page.goto('https://www.booking.com/hotel/gb/mcmullens.fr.html', {
    waitUntil: 'networkidle2',
    timeout: 30000
});
```

## 🛡️ Gestion d'erreurs

Le scraper inclut :
- Gestion des timeouts
- Captures d'écran en cas d'erreur
- Logs détaillés avec emojis
- Fermeture propre du navigateur

## 📋 Exemple de sortie

```json
{
  "businessName": "McMullen & Sons Ltd",
  "address": "McMullens & Sons 26 Old Cross, SG14 1RD Hertford, Hertfordshire",
  "email": "contact@mcmullens.co.uk",
  "phone": "+4401992584911",
  "registerNumber": null,
  "scrapedAt": "2025-07-27T21:18:48.281Z"
}
```

## 🔍 Dépannage

### Problèmes courants

1. **Élément non trouvé** : Augmentez le timeout
2. **Page non chargée** : Vérifiez la connexion internet
3. **Détection de bot** : Utilisez le mode stealth (déjà configuré)

### Logs utiles

- 🌐 Navigation vers la page
- 🔍 Recherche des éléments
- 🖱️ Clics sur les boutons
- 📊 Extraction des données
- 💾 Sauvegarde des fichiers

## 📝 Notes

- Le scraper utilise Puppeteer avec le plugin Stealth
- Les données sont sauvegardées automatiquement
- Les captures d'écran permettent de vérifier le bon fonctionnement
- Le scraper est conçu pour être robuste et gérer les erreurs 