# 🚀 Déploiement via la Console Google Cloud

## Étapes pour déployer via la console

### 1. Accéder à Cloud Functions
- Allez sur [Google Cloud Console](https://console.cloud.google.com/)
- Projet : `oversight-datalake`
- Menu : Cloud Functions

### 2. Créer une nouvelle fonction
- Cliquez sur "Créer une fonction"
- Nom : `arrondissement-scraper`
- Région : `europe-west1`
- Runtime : `Node.js 20`

### 3. Configuration du code
- **Source** : Inline Editor
- **Point d'entrée** : `scrapeArrondissements`
- **Fichier principal** : `index.js`

### 4. Copier le code
Copiez le contenu de `cloud-function/index.js` dans l'éditeur

### 5. Configuration avancée
- **Mémoire** : 2 GB
- **Timeout** : 540 secondes
- **Variables d'environnement** :
  - `GOOGLE_APPLICATION_CREDENTIALS` : `bigquery-credentials.json`

### 6. Déclencheur
- **Type** : HTTP
- **Authentification** : Autoriser les invocations non authentifiées

### 7. Déployer
- Cliquez sur "Déployer"

## Avantages de cette méthode
✅ Pas besoin de permissions CLI  
✅ Interface graphique intuitive  
✅ Gestion des credentials intégrée  
✅ Déploiement direct depuis la console  

## Test après déploiement
```bash
curl -X POST https://europe-west1-oversight-datalake.cloudfunctions.net/arrondissement-scraper \
     -H 'Content-Type: application/json' \
     -d '{"startArrondissement": 1, "endArrondissement": 5, "concurrentLimit": 4}'
```

