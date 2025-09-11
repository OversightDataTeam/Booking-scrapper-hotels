const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const {BigQuery} = require('@google-cloud/bigquery');
const express = require('express');

const app = express();
app.use(express.json());

// Configuration BigQuery
const bigquery = new BigQuery({
  projectId: 'oversight-datalake',
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
    }
  } catch (error) {
    console.error('❌ Error ensuring table exists:', error.message);
    throw error;
  }
}

// Insérer dans BigQuery
async function insertIntoBigQuery(arrondissement, propertiesCount) {
  const now = new Date();
  const parisTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  const observationDate = parisTime.toISOString().replace('T', ' ').split('.')[0];
  
  const rows = [{
    ObservationDate: observationDate,
    Arrondissement: arrondissement.toString(),
    PropertiesCount: propertiesCount
  }];

  try {
    console.log('📝 Préparation des données pour BigQuery:', JSON.stringify(rows, null, 2));
    
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);
    
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
    throw error;
  }
}

// Scraper un arrondissement
async function scrapeBookingHotels(url, arrondissement) {
  console.log(`🚀 Starting scraping process for ${arrondissement}e arrondissement...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
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
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);

      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      });

      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.send('Network.clearBrowserCache');

      console.log('🌐 Navigating to:', url);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

      const currentUrl = await page.url();
      const urlWithoutDates = currentUrl.replace(/&checkin=\d{4}-\d{2}-\d{2}&checkout=\d{4}-\d{2}-\d{2}/, '');
      if (currentUrl !== urlWithoutDates) {
        console.log('🔄 Nettoyage de l\'URL des dates...');
        await page.goto(urlWithoutDates, { waitUntil: 'networkidle0', timeout: 60000 });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      await page.waitForSelector('h1', { timeout: 30000, visible: true });

      propertiesCount = await page.evaluate(() => {
        const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
        const match = h1s.map(title => {
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

    return propertiesCount;
  } catch (error) {
    console.error(`❌ Error occurred for ${arrondissement}e arrondissement:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Générer l'URL Booking.com pour un arrondissement
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
    
  return { url: `${baseUrl}?${queryString}` };
}

// Route principale
app.post('/scrape', async (req, res) => {
  try {
    console.log('🚀 Cloud Run started');
    
    await ensureTableExists();
    
    const results = [];
    const startArrondissement = req.body.startArrondissement || 1;
    const endArrondissement = req.body.endArrondissement || 20;
    const concurrentLimit = req.body.concurrentLimit || 4;
    
    console.log(`📊 Processing arrondissements ${startArrondissement} to ${endArrondissement}`);
    
    for (let arrondissement = startArrondissement; arrondissement <= endArrondissement; arrondissement++) {
      const bookingData = generateBookingUrl(arrondissement);
      const propertiesCount = await scrapeBookingHotels(bookingData.url, arrondissement);
      
      await insertIntoBigQuery(arrondissement, propertiesCount);
      
      results.push({
        arrondissement,
        propertiesCount,
        timestamp: new Date().toISOString()
      });
      
      if (arrondissement < endArrondissement) {
        const waitTime = Math.floor(Math.random() * 4000) + 3000;
        console.log(`⏳ Waiting ${waitTime}ms before next arrondissement...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    console.log('✅ Scraping terminé pour tous les arrondissements');
    
    res.status(200).json({
      success: true,
      message: 'Scraping completed successfully',
      results: results,
      totalProcessed: results.length
    });
    
  } catch (error) {
    console.error('❌ Error in Cloud Run:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Scraping failed'
    });
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

