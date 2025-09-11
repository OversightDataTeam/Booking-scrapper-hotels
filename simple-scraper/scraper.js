const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { BigQuery } = require('@google-cloud/bigquery');

// Configuration
const CONFIG = {
  ARRONDISSEMENTS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  CONCURRENT_LIMIT: 4,
  DELAY_BETWEEN_REQUESTS: 2000,
  PROJECT_ID: 'oversight-datalake',
  DATASET_ID: 'MarketData',
  TABLE_ID: 'ArrondissementSummary'
};

// Configuration Puppeteer
puppeteer.use(StealthPlugin());

// Configuration BigQuery
const bigquery = new BigQuery({
  projectId: CONFIG.PROJECT_ID,
  keyFilename: './bigquery-credentials.json'
});

// Fonction pour scraper un arrondissement
async function scrapeArrondissement(arrondissement) {
  console.log(`🏠 Scraping arrondissement ${arrondissement}...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // URL de recherche pour l'arrondissement
    const url = `https://www.booking.com/searchresults.fr.html?ss=Paris%2C+France&checkin=2024-12-01&checkout=2024-12-02&group_adults=2&no_rooms=1&group_children=0&sb_travel_purpose=leisure&nflt=district%3D${arrondissement}`;
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Attendre que les résultats se chargent
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // Compter les propriétés
    const propertyCount = await page.evaluate(() => {
      const properties = document.querySelectorAll('[data-testid="property-card"]');
      return properties.length;
    });
    
    console.log(`✅ Arrondissement ${arrondissement}: ${propertyCount} propriétés trouvées`);
    
    return {
      arrondissement,
      propertyCount,
      scrapedAt: new Date().toISOString(),
      url
    };
    
  } catch (error) {
    console.error(`❌ Erreur arrondissement ${arrondissement}:`, error.message);
    return {
      arrondissement,
      propertyCount: 0,
      error: error.message,
      scrapedAt: new Date().toISOString()
    };
  } finally {
    await browser.close();
  }
}

// Fonction pour insérer dans BigQuery
async function insertToBigQuery(data) {
  try {
    const dataset = bigquery.dataset(CONFIG.DATASET_ID);
    const table = dataset.table(CONFIG.TABLE_ID);
    
    await table.insert([data]);
    console.log(`📊 Données insérées dans BigQuery pour l'arrondissement ${data.arrondissement}`);
  } catch (error) {
    console.error('❌ Erreur BigQuery:', error.message);
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage du scraper d\'arrondissements');
  console.log(`📊 Configuration: ${CONFIG.CONCURRENT_LIMIT} workers, ${CONFIG.ARRONDISSEMENTS.length} arrondissements`);
  
  const results = [];
  
  // Traiter les arrondissements par lots
  for (let i = 0; i < CONFIG.ARRONDISSEMENTS.length; i += CONFIG.CONCURRENT_LIMIT) {
    const batch = CONFIG.ARRONDISSEMENTS.slice(i, i + CONFIG.CONCURRENT_LIMIT);
    
    console.log(`\n🔄 Traitement du lot ${Math.floor(i/CONFIG.CONCURRENT_LIMIT) + 1}/${Math.ceil(CONFIG.ARRONDISSEMENTS.length/CONFIG.CONCURRENT_LIMIT)}`);
    
    // Traiter le lot en parallèle
    const batchPromises = batch.map(arrondissement => 
      scrapeArrondissement(arrondissement)
        .then(result => {
          results.push(result);
          return insertToBigQuery(result);
        })
    );
    
    await Promise.all(batchPromises);
    
    // Délai entre les lots
    if (i + CONFIG.CONCURRENT_LIMIT < CONFIG.ARRONDISSEMENTS.length) {
      console.log(`⏳ Attente ${CONFIG.DELAY_BETWEEN_REQUESTS}ms avant le prochain lot...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
    }
  }
  
  // Résumé final
  console.log('\n📊 Résumé final:');
  results.forEach(result => {
    console.log(`   Arrondissement ${result.arrondissement}: ${result.propertyCount} propriétés`);
  });
  
  const totalProperties = results.reduce((sum, result) => sum + result.propertyCount, 0);
  console.log(`\n🎉 Total: ${totalProperties} propriétés trouvées sur ${results.length} arrondissements`);
  
  return results;
}

// Exécution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeArrondissement };
