const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const {BigQuery} = require('@google-cloud/bigquery');

// BigQuery configuration
let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Si on est dans GitHub Actions, utiliser BIGQUERY_CREDENTIALS
if (process.env.BIGQUERY_CREDENTIALS) {
  console.log('🔧 Running in GitHub Actions environment');
  const fs = require('fs');
  credentialsPath = '/tmp/gcloud.json';
  fs.writeFileSync(credentialsPath, process.env.BIGQUERY_CREDENTIALS);
  console.log('✅ Created temporary credentials file for GitHub Actions');
}

const bigquery = new BigQuery({
  projectId: 'oversight-datalake',
  keyFilename: credentialsPath
});

// Vérifier les credentials
console.log('🔑 Checking BigQuery credentials...');
console.log('Project ID:', bigquery.projectId);
console.log('Credentials path:', credentialsPath);

// Vérifier si le fichier de credentials existe et est valide
const fs = require('fs');
if (credentialsPath) {
  try {
    const stats = fs.statSync(credentialsPath);
    console.log('✅ Credentials file exists, size:', stats.size, 'bytes');
    
    // Lire et vérifier le contenu du fichier
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (!credentials.project_id) {
      console.error('❌ Missing project_id in credentials file');
      process.exit(1);
    }
    if (!credentials.private_key) {
      console.error('❌ Missing private_key in credentials file');
      process.exit(1);
    }
    if (!credentials.client_email) {
      console.error('❌ Missing client_email in credentials file');
      process.exit(1);
    }
    console.log('✅ Credentials file is valid');
  } catch (error) {
    console.error('❌ Error with credentials file:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ No credentials path found. Please set either GOOGLE_APPLICATION_CREDENTIALS or BIGQUERY_CREDENTIALS');
  process.exit(1);
}

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
      await dataset.createTable(tableId, {
        schema: schema
      });
      console.log(`✅ Table ${datasetId}.${tableId} created successfully`);
    }
  } catch (error) {
    console.error('❌ Error ensuring table exists:', error.message);
    throw error;
  }
}

function normalizeUrl(url) {
  // Extract the hotel path from the URL
  const match = url.match(/\/hotel\/[^?]+/);
  return match ? match[0] : url;
}

function readExistingUrls(filename) {
  if (!fs.existsSync(filename)) {
    return new Set();
  }
  const content = fs.readFileSync(filename, 'utf-8');
  // Skip header line when reading existing URLs
  return new Set(content.split('\n')
    .slice(1) // Skip header
    .filter(line => line.trim())
    .map(line => {
      const [url] = line.split(';').map(field => field.replace(/^"|"$/g, ''));
      return url;
    }));
}

function getCurrentDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

async function insertIntoBigQuery(arrondissement, propertiesCount) {
  const now = new Date();
  // Format DATETIME pour BigQuery (YYYY-MM-DD HH:mm:ss)
  const observationDate = now.toISOString().replace('T', ' ').split('.')[0];

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
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);
    
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

async function waitForHotelCards(page) {
  console.log('🔍 Waiting for hotel cards to load...');
  
  // Try different possible selectors
  const selectors = [
    '[data-testid="property-card"]',
    '.sr_property_block',
    '.sr-card',
    '[data-testid="title-link"]',
    '.sr-hotel__row'
  ];

  for (const selector of selectors) {
    try {
      console.log(`Trying selector: ${selector}`);
      await page.waitForSelector(selector, { timeout: 10000 });
      console.log(`✅ Found cards with selector: ${selector}`);
      return selector;
    } catch (error) {
      console.log(`❌ Selector ${selector} not found, trying next...`);
    }
  }

  throw new Error('No hotel card selectors found');
}

async function scrapeBookingHotels(url, arrondissement) {
  console.log(`🚀 Starting scraping process for ${arrondissement}e arrondissement...`);
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

    // Log the page content for debugging
    const pageContent = await page.content();
    const pageContentLower = pageContent.toLowerCase();
    if (pageContentLower.includes('robot') || pageContentLower.includes('captcha') || pageContentLower.includes('access denied')) {
      console.warn('⚠️ Possible bot detection or access denied!');
    }
    console.log('📄 Page content (first 500 chars):', pageContent.substring(0, 500) + '...');

    // Log all h1 contents
    const h1Contents = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()));
    console.log('🔍 Tous les h1 récupérés :', h1Contents);

    // Wait for the title element that contains the number of properties
    await page.waitForSelector('h1', { 
      timeout: 30000,
      visible: true 
    });

    // Extract the number of properties from the title
    const propertiesCount = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
      console.log('🔍 [browser context] h1s:', h1s);
      const match = h1s.map(title => title.match(/(\d+)\s+(?:properties|établissements?|exact matches?)\s+(?:found|trouvés)/i)).find(Boolean);
      return match ? parseInt(match[1]) : 0;
    });

    console.log(`📊 Found ${propertiesCount} properties in ${arrondissement}e arrondissement`);

    return propertiesCount;

  } catch (error) {
    console.error(`❌ Error occurred for ${arrondissement}e arrondissement:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

function generateBookingUrl(arrondissement) {
  // URL minimale de Booking.com
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

  return {
    url: `${baseUrl}?${queryString}`
  };
}

// Scraper tous les arrondissements de 1 à 20
async function main() {
  try {
    // S'assurer que la table existe avant de commencer
    await ensureTableExists();
    
    for (let arrondissement = 1; arrondissement <= 20; arrondissement++) {
      const bookingData = generateBookingUrl(arrondissement);
      const propertiesCount = await scrapeBookingHotels(bookingData.url, arrondissement);
      
      // Insérer les données dans BigQuery
      await insertIntoBigQuery(arrondissement, propertiesCount);
      
      // Délai aléatoire entre 3 et 7 secondes
      const waitTime = Math.floor(Math.random() * 4000) + 3000;
      console.log(`⏳ Waiting ${waitTime}ms before next arrondissement...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    console.log('✅ Scraping terminé pour tous les arrondissements');
  } catch (error) {
    console.error('❌ Error in main process:', error);
  }
}

// Start the scraping process
main(); 