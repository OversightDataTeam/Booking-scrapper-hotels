#!/usr/bin/env node

// Test simple pour vérifier l'insertion dans BigQuery
const {BigQuery} = require('@google-cloud/bigquery');

console.log('🧪 Test d\'insertion BigQuery - Une seule ligne');
console.log('===============================================');

// Configuration BigQuery
const bigquery = new BigQuery({
  projectId: 'oversight-datalake',
  keyFilename: '../../config/bigquery-credentials.json'
});

const datasetId = 'MarketData';
const tableId = 'ArrondissementSummary';

// Schéma de la table
const schema = {
  fields: [
    {name: 'ObservationDate', type: 'DATETIME', mode: 'NULLABLE'},
    {name: 'Arrondissement', type: 'STRING', mode: 'NULLABLE'},
    {name: 'PropertiesCount', type: 'INTEGER', mode: 'NULLABLE'}
  ]
};

// Créer la table si elle n'existe pas
async function ensureTableExists() {
  try {
    const dataset = bigquery.dataset(datasetId);
    const [exists] = await dataset.table(tableId).exists();
    if (!exists) {
      console.log(`📊 Creating table ${datasetId}.${tableId}...`);
      await dataset.createTable(tableId, { schema: schema });
      console.log(`✅ Table ${datasetId}.${tableId} created successfully`);
    } else {
      console.log(`✅ Table ${datasetId}.${tableId} already exists`);
    }
  } catch (error) {
    console.error('❌ Error ensuring table exists:', error.message);
    throw error;
  }
}

// Insérer une ligne de test
async function insertTestData() {
  const now = new Date();
  // Convertir en heure de Paris (UTC+2)
  const parisTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  // Format DATETIME pour BigQuery (YYYY-MM-DD HH:mm:ss)
  const observationDate = parisTime.toISOString().replace('T', ' ').split('.')[0];
  
  const testData = [{
    ObservationDate: observationDate,
    Arrondissement: "TEST",
    PropertiesCount: 999
  }];

  try {
    console.log('📝 Données de test à insérer:', JSON.stringify(testData, null, 2));
    
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);
    
    console.log('💾 Insertion des données de test...');
    const [job] = await table.insert(testData);
    
    console.log('✅ Données de test insérées avec succès !');
    console.log('📊 Détails:', {
      jobId: job.id,
      timestamp: observationDate,
      arrondissement: "TEST",
      propertiesCount: 999
    });
    
    return job;
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion:', error.message);
    if (error.errors) {
      console.error('Détails des erreurs BigQuery:', JSON.stringify(error.errors, null, 2));
    }
    throw error;
  }
}

// Fonction principale
async function main() {
  try {
    console.log('🔑 Vérification des credentials...');
    console.log('Project ID:', bigquery.projectId);
    console.log('Credentials path: ../../config/bigquery-credentials.json');
    
    // Vérifier que le fichier de credentials existe
    const fs = require('fs');
    const credentialsPath = '../../config/bigquery-credentials.json';
    if (fs.existsSync(credentialsPath)) {
      const stats = fs.statSync(credentialsPath);
      console.log('✅ Credentials file exists, size:', stats.size, 'bytes');
    } else {
      console.error('❌ Credentials file not found');
      process.exit(1);
    }
    
    console.log('\n📊 Vérification/Création de la table...');
    await ensureTableExists();
    
    console.log('\n🧪 Insertion des données de test...');
    await insertTestData();
    
    console.log('\n🎉 Test terminé avec succès !');
    console.log('\n📋 Pour vérifier dans BigQuery, exécutez cette requête :');
    console.log('SELECT * FROM `oversight-datalake.MarketData.ArrondissementSummary`');
    console.log('WHERE Arrondissement = "TEST"');
    console.log('ORDER BY ObservationDate DESC LIMIT 1;');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
main();
