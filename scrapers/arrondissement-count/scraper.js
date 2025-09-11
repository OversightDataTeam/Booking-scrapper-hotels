const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

// Configuration
const CONFIG = {
  ARRONDISSEMENTS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  CONCURRENT_LIMIT: 3,  // 3 workers en parallèle
  DELAY_BETWEEN_BATCHES: 5000,  // 5 secondes entre les lots
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

// Schéma de la table
const schema = {
  fields: [
    {name: 'ObservationDate', type: 'DATETIME', mode: 'NULLABLE'},
    {name: 'Arrondissement', type: 'STRING', mode: 'NULLABLE'},
    {name: 'PropertiesCount', type: 'INTEGER', mode: 'NULLABLE'}
  ]
};

// Fonction pour générer l'URL Booking.com
function generateBookingUrl(arrondissement) {
  const baseUrl = 'https://www.booking.com/searchresults.en-gb.html';
  const params = {
    ss: `${arrondissement}e+arr.%2C+Paris%2C+Ile+de+France%2C+France`,
    dest_id: arrondissement.toString(),
    dest_type: 'district',
    group_adults: '2',
    no_rooms: '1',
    group_children: '0',
    nflt: 'ht_id%3D204'
  };

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

// Fonction pour scraper un arrondissement
async function scrapeArrondissement(arrondissement) {
  console.log(`🏠 Scraping arrondissement ${arrondissement}...`);
  
  const url = generateBookingUrl(arrondissement);
  console.log(`📝 Target URL: ${url}`);

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--incognito'
    ]
  });

  try {
    let propertiesCount = 0;
    let retryCount = 0;
    const maxRetries = 3;

    while (propertiesCount === 0 && retryCount < maxRetries) {
      if (retryCount > 0) {
        console.log(`🔄 Retry #${retryCount} for arrondissement ${arrondissement}...`);
        const retryDelay = Math.floor(Math.random() * 5000) + 5000;
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);

      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Supprimer tous les cookies et le cache
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      });

      // Supprimer les cookies via CDP
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.send('Network.clearBrowserCache');

      console.log('🌐 Navigating to:', url);
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });

      // Nettoyer l'URL des paramètres de date
      const currentUrl = await page.url();
      const urlWithoutDates = currentUrl.replace(/&checkin=\d{4}-\d{2}-\d{2}&checkout=\d{4}-\d{2}-\d{2}/, '');
      if (currentUrl !== urlWithoutDates) {
        console.log('🔄 Nettoyage de l\'URL des dates...');
        await page.goto(urlWithoutDates, { 
          waitUntil: 'networkidle0',
          timeout: 60000 
        });
      }

      console.log('🌐 Current URL:', await page.url());
      
      // Add a delay to ensure the page is fully loaded
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Wait for the title element that contains the number of properties
      await page.waitForSelector('h1', { 
        timeout: 30000,
        visible: true 
      });

      // Extract the number of properties from the title
      propertiesCount = await page.evaluate(() => {
        const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
        console.log('🔍 [browser context] h1s:', h1s);
        const match = h1s.map(title => {
          // Essayer différents formats
          const patterns = [
            /(\d+)\s+(?:properties|établissements?|exact matches?)\s+(?:found|trouvés)/i,
            /(\d+)\s+exact matches/i,
            /(\d+)\s+properties found/i,
            /(\d+)\s+établissements trouvés/i
          ];
          
          for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) return match[1];
          }
          return null;
        }).find(Boolean);
        
        return match ? parseInt(match) : 0;
      });

      console.log(`📊 Found ${propertiesCount} properties in ${arrondissement}e arrondissement`);

      await page.close();

      if (propertiesCount === 0) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⚠️ No properties found, will retry (${retryCount}/${maxRetries})...`);
        } else {
          console.log(`❌ No properties found after ${maxRetries} attempts`);
        }
      }
    }

    return {
      arrondissement,
      propertyCount: propertiesCount,
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

// Créer la table si elle n'existe pas
async function ensureTableExists() {
  try {
    const dataset = bigquery.dataset(CONFIG.DATASET_ID);
    const [exists] = await dataset.table(CONFIG.TABLE_ID).exists();
    
    if (!exists) {
      console.log(`📊 Creating table ${CONFIG.DATASET_ID}.${CONFIG.TABLE_ID}...`);
      await dataset.createTable(CONFIG.TABLE_ID, {
        schema: schema
      });
      console.log(`✅ Table ${CONFIG.DATASET_ID}.${CONFIG.TABLE_ID} created successfully`);
    }
  } catch (error) {
    console.error('❌ Error ensuring table exists:', error.message);
    throw error;
  }
}

// Fonction pour insérer dans BigQuery
async function insertToBigQuery(arrondissement, propertiesCount) {
  const now = new Date();
  // Convertir en heure de Paris (UTC+2)
  const parisTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  // Format DATETIME pour BigQuery (YYYY-MM-DD HH:mm:ss)
  const observationDate = parisTime.toISOString().replace('T', ' ').split('.')[0];

  const rows = [{
    ObservationDate: observationDate,
    Arrondissement: arrondissement.toString(),
    PropertiesCount: propertiesCount
  }];

  try {
    console.log('📝 Préparation des données pour BigQuery:', JSON.stringify(rows, null, 2));
    
    // Ajouter un délai court entre 2 et 5 secondes
    const delay = Math.floor(Math.random() * 3000) + 2000;
    console.log(`⏳ Waiting ${delay}ms before inserting data for arrondissement ${arrondissement}...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log('🔌 Tentative de connexion à BigQuery...');
    const dataset = bigquery.dataset(CONFIG.DATASET_ID);
    const table = dataset.table(CONFIG.TABLE_ID);
    
    console.log('📊 Vérification de l\'existence de la table...');
    const [exists] = await table.exists();
    if (!exists) {
      console.log('⚠️ La table n\'existe pas, création en cours...');
      await ensureTableExists();
    }

    console.log('💾 Insertion des données...');
    const [job] = await table.insert(rows);
    
    console.log(`✅ Données insérées avec succès pour l'arrondissement ${arrondissement}:`, {
      jobId: job.id,
      timestamp: observationDate,
      propertiesCount: propertiesCount
    });
    
    return job;
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion dans BigQuery:', error.message);
    if (error.errors) {
      console.error('Détails des erreurs BigQuery:', JSON.stringify(error.errors, null, 2));
    }
    if (error.response) {
      console.error('Réponse de l\'API:', JSON.stringify(error.response, null, 2));
    }
    // Ne pas throw l'erreur pour continuer le scraping même si l'insertion échoue
    return null;
  }
}

// Fonction pour traiter un arrondissement complet (scraping + BigQuery)
async function processArrondissement(arrondissement) {
  try {
    console.log(`🏠 Processing arrondissement ${arrondissement}...`);
    const result = await scrapeArrondissement(arrondissement);
    
    // Insérer les données dans BigQuery
    await insertToBigQuery(arrondissement, result.propertyCount);
    
    console.log(`✅ Arrondissement ${arrondissement} completed: ${result.propertyCount} properties`);
    return result;
  } catch (error) {
    console.error(`❌ Error processing arrondissement ${arrondissement}:`, error.message);
    return {
      arrondissement,
      propertyCount: 0,
      error: error.message,
      scrapedAt: new Date().toISOString()
    };
  }
}

// Fonction principale avec traitement parallèle
async function main() {
  try {
    console.log('🚀 Démarrage du scraper d\'arrondissements');
    console.log(`📊 Configuration: ${CONFIG.CONCURRENT_LIMIT} workers en parallèle, ${CONFIG.ARRONDISSEMENTS.length} arrondissements`);
    
    // S'assurer que la table existe avant de commencer
    await ensureTableExists();
    
    const results = [];
    
    // Traiter les arrondissements par lots de 3
    for (let i = 0; i < CONFIG.ARRONDISSEMENTS.length; i += CONFIG.CONCURRENT_LIMIT) {
      const batch = CONFIG.ARRONDISSEMENTS.slice(i, i + CONFIG.CONCURRENT_LIMIT);
      const batchNumber = Math.floor(i / CONFIG.CONCURRENT_LIMIT) + 1;
      const totalBatches = Math.ceil(CONFIG.ARRONDISSEMENTS.length / CONFIG.CONCURRENT_LIMIT);
      
      console.log(`\n🔄 Traitement du lot ${batchNumber}/${totalBatches}: arrondissements ${batch.join(', ')}`);
      
      // Traiter le lot en parallèle
      const batchPromises = batch.map(arrondissement => processArrondissement(arrondissement));
      const batchResults = await Promise.all(batchPromises);
      
      // Ajouter les résultats
      results.push(...batchResults);
      
      // Délai entre les lots (sauf pour le dernier)
      if (i + CONFIG.CONCURRENT_LIMIT < CONFIG.ARRONDISSEMENTS.length) {
        console.log(`⏳ Attente ${CONFIG.DELAY_BETWEEN_BATCHES}ms avant le prochain lot...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Résumé final
    console.log('\n📊 Résumé final:');
    results.forEach(result => {
      if (result.error) {
        console.log(`   Arrondissement ${result.arrondissement}: ❌ Erreur - ${result.error}`);
      } else {
        console.log(`   Arrondissement ${result.arrondissement}: ${result.propertyCount} propriétés`);
      }
    });
    
    const totalProperties = results.reduce((sum, result) => sum + (result.propertyCount || 0), 0);
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.log(`\n🎉 Total: ${totalProperties} propriétés trouvées sur ${successCount} arrondissements réussis`);
    if (errorCount > 0) {
      console.log(`⚠️ ${errorCount} arrondissements en erreur`);
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error in main process:', error);
    throw error;
  }
}

// Exécution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeArrondissement };
