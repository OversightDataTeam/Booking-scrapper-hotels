# 🔧 Configuration GitHub Actions pour Cloud Run

## 📋 Prérequis

1. **Repository GitHub** : ✅ Déjà configuré
2. **Projet Google Cloud** : `oversight-datalake` ou `pptr-382219`
3. **Service Account** avec les permissions Cloud Run

## 🔑 Configuration des Secrets GitHub

### Étape 1 : Créer un Service Account

1. **Allez sur [Google Cloud Console](https://console.cloud.google.com/)**
2. **IAM & Admin > Service Accounts**
3. **Cliquez sur "Create Service Account"**
4. **Nom** : `github-actions-deploy`
5. **Description** : `Service account for GitHub Actions deployment`

### Étape 2 : Attribuer les Rôles

Ajoutez ces rôles au service account :
- `Cloud Run Admin`
- `Service Account User`
- `Storage Admin`
- `Cloud Build Editor`

### Étape 3 : Créer une Clé JSON

1. **Cliquez sur le service account créé**
2. **Onglet "Keys"**
3. **"Add Key" > "Create new key"**
4. **Type** : JSON
5. **Téléchargez le fichier JSON**

### Étape 4 : Ajouter le Secret sur GitHub

1. **Allez sur votre repository GitHub**
2. **Settings > Secrets and variables > Actions**
3. **"New repository secret"**
4. **Nom** : `GCP_SA_KEY`
5. **Valeur** : Copiez tout le contenu du fichier JSON téléchargé

## 🚀 Déploiement

Une fois les secrets configurés :

1. **Poussez du code** dans le dossier `scrapers/arrondissement-count/`
2. **GitHub Actions se déclenche automatiquement**
3. **Le service est déployé sur Cloud Run**

## 🧪 Test du Déploiement

Après le déploiement, testez avec :

```bash
curl -X POST https://arrondissement-scraper-xxxxx-uc.a.run.app/scrape \
  -H 'Content-Type: application/json' \
  -d '{
    "startArrondissement": 1,
    "endArrondissement": 5,
    "concurrentLimit": 4
  }'
```

## 📊 Avantages de cette Approche

✅ **Déploiement automatique** à chaque push  
✅ **Pas besoin de Docker local**  
✅ **Configuration centralisée** dans GitHub  
✅ **Logs de déploiement** visibles dans GitHub Actions  
✅ **Rollback facile** via l'historique Git  
