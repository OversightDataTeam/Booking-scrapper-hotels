const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const {BigQuery} = require('@google-cloud/bigquery');

// BigQuery configuration
const bigquery = new BigQuery({
  projectId: 'oversight-datalake',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Vérifier les credentials
console.log('🔑 Checking BigQuery credentials...');
console.log('Project ID:', bigquery.projectId);
console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Vérifier si le fichier de credentials existe
const fs = require('fs');
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const stats = fs.statSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('✅ Credentials file exists, size:', stats.size, 'bytes');
  } catch (error) {
    console.error('❌ Credentials file not found:', error.message);
  }
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
    // Ajouter un délai court entre 2 et 5 secondes
    const delay = Math.floor(Math.random() * 3000) + 2000;
    console.log(`⏳ Waiting ${delay}ms before inserting data for arrondissement ${arrondissement}...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    const [job] = await bigquery
      .dataset(datasetId)
      .table(tableId)
      .insert(rows);
    
    console.log(`💾 Inserted data for arrondissement ${arrondissement} with ${propertiesCount} properties at ${observationDate}`);
    
    return job;
  } catch (error) {
    console.error('❌ Error inserting data to BigQuery:', error.message);
    if (error.errors) {
      console.error('BigQuery errors:', JSON.stringify(error.errors, null, 2));
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

async function scrapeBookingHotels(url, arrondissement, checkinDate, checkoutDate) {
  console.log(`🚀 Starting scraping process for ${arrondissement}e arrondissement...`);
  console.log(`📝 Target URL: ${url}`);
  console.log(`📅 Dates - Check-in: ${checkinDate}, Check-out: ${checkoutDate}`);

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--start-maximized'
    ]
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('🌐 Navigating to:', url);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

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
      // Log explicitement les h1 dans le contexte navigateur
      console.log('🔍 [browser context] h1s:', h1s);
      const match = h1s.map(title => title.match(/(\d+)\s+(?:properties|établissements?|exact matches?)\s+(?:found|trouvés)/i)).find(Boolean);
      return match ? parseInt(match[1]) : 0;
    });

    console.log(`📊 Found ${propertiesCount} properties in ${arrondissement}e arrondissement`);

    // Insert data into BigQuery
    await insertIntoBigQuery(arrondissement, propertiesCount);

    return propertiesCount;

  } catch (error) {
    console.error(`❌ Error occurred for ${arrondissement}e arrondissement:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

function generateBookingUrl(arrondissement) {
  // Calculate dates
  const today = new Date();
  const checkin = new Date(today);
  checkin.setDate(today.getDate() + 180); // 180 days from now
  
  const checkout = new Date(checkin);
  checkout.setDate(checkin.getDate() + 1); // Next day after check-in

  // Format dates as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const checkinDate = formatDate(checkin);
  const checkoutDate = formatDate(checkout);

  // URL exacte de Booking.com
  const baseUrl = 'https://www.booking.com/searchresults.en-gb.html';
  const params = {
    ss: `${arrondissement}e+Arrondissement%2C+Parijs%2C+Ile+de+France%2C+Frankrijk`,
    ssne: 'Paris',
    ssne_untouched: 'Paris',
    label: 'gen173nr-1BCAEoggI46AdIM1gEaGyIAQGYAQm4AQfIAQzYAQHoAQGIAgGoAgO4Ar7Hvr8GwAIB0gIkOGIyNGEwNTAtMDk2Yy00ZWI4LWIzZjYtMTMwZDczODU0MzM12AIF4AIB',
    sid: '2077e49c9dfef2d8cef83f8cf65103b6',
    aid: '304142',
    lang: 'en-gb',
    sb: '1',
    src_elem: 'sb',
    src: 'searchresults',
    dest_id: arrondissement.toString(),
    dest_type: 'district',
    ac_position: '1',
    ac_click_type: 'b',
    ac_langcode: 'nl',
    ac_suggestion_list_length: '4',
    search_selected: 'true',
    checkin: checkinDate,
    checkout: checkoutDate,
    group_adults: '2',
    no_rooms: '1',
    group_children: '0',
    nflt: 'ht_id%3D204'
  };

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return {
    url: `${baseUrl}?${queryString}`,
    checkinDate,
    checkoutDate
  };
}

// Array of arrondissements to scrape
const arrondissements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Function to scrape all arrondissements
async function scrapeAllArrondissements() {
  for (const arrondissement of arrondissements) {
    const bookingData = generateBookingUrl(arrondissement);
    try {
      await scrapeBookingHotels(bookingData.url, arrondissement, bookingData.checkinDate, bookingData.checkoutDate);
      console.log(`✅ Terminé pour le ${arrondissement}e arrondissement`);
    } catch (error) {
      console.error(`❌ Erreur pour le ${arrondissement}e arrondissement:`, error);
    }
  }
  console.log('✅ Scraping terminé pour tous les arrondissements');
}

// Initialize scraping process
async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Configurer le user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  // Configurer les timeouts
  await page.setDefaultNavigationTimeout(60000);
  await page.setDefaultTimeout(30000);
  
  try {
    // S'assurer que la table existe avant de commencer
    await ensureTableExists();
    
    for (let i = 1; i <= 20; i++) {
      await scrapeArrondissement(page, i);
      
      // Attendre entre 5 et 10 secondes entre chaque arrondissement
      const waitTime = Math.floor(Math.random() * 5000) + 5000;
      console.log(`⏳ Waiting ${waitTime}ms before next arrondissement...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  } catch (error) {
    console.error('❌ Error in main process:', error);
  } finally {
    await browser.close();
  }
}

// Start the scraping process
main();

async function scrapeArrondissement(page, arrondissement) {
  console.log(`🚀 Starting scraping process for ${arrondissement}e arrondissement...`);
  
  const url = `https://www.booking.com/searchresults.en-gb.html?ss=${arrondissement}e+Arrondissement%2C+Parijs%2C+Ile+de+France%2C+Frankrijk&ssne=Paris&ssne_untouched=Paris&label=gen173nr-1BCAEoggI46AdIM1gEaGyIAQGYAQm4AQfIAQzYAQHoAQGIAgGoAgO4Ar7Hvr8GwAIB0gIkOGIyNGEwNTAtMDk2Yy00ZWI4LWIzZjYtMTMwZDczODU0MzM12AIF4AIB&sid=2077e49c9dfef2d8cef83f8cf65103b6&aid=304142&lang=en-gb&sb=1&src_elem=sb&src=searchresults&dest_id=${arrondissement}&dest_type=district&ac_position=1&ac_click_type=b&ac_langcode=nl&ac_suggestion_list_length=4&search_selected=true&checkin=2025-12-02&checkout=2025-12-03&group_adults=2&no_rooms=1&group_children=0&nflt=ht_id%3D204`;
  
  console.log(`📝 Target URL: ${url}`);
  console.log(`📅 Dates - Check-in: 2025-12-02, Check-out: 2025-12-03`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    console.log(`🌐 Current URL: ${page.url()}`);
    
    // Vérifier si on est bloqué
    const content = await page.content();
    if (content.includes('bot detection') || content.includes('access denied')) {
      console.log('⚠️ Bot detection active, skipping this arrondissement');
      return;
    }
    
    // Attendre que le contenu soit chargé
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Récupérer tous les h1
    const h1Elements = await page.$$eval('h1', elements => elements.map(el => el.textContent));
    console.log(`🔍 Tous les h1 récupérés :`, h1Elements);
    
    // Extraire le nombre de propriétés
    const h1Text = h1Elements[0];
    let propertyCount = '0';
    
    // Gérer différents formats de texte
    if (h1Text.includes('arr.:')) {
      propertyCount = h1Text.match(/arr\.:\s*(\d+)/)?.[1] || '0';
    } else if (h1Text.includes('exact matches')) {
      propertyCount = h1Text.match(/(\d+)\s+exact matches/)?.[1] || '0';
    } else if (h1Text.includes('properties found')) {
      propertyCount = h1Text.match(/(\d+)\s+properties found/)?.[1] || '0';
    } else {
      // Fallback : chercher n'importe quel nombre dans le texte
      propertyCount = h1Text.match(/(\d+)/)?.[1] || '0';
    }
    
    console.log(`📊 Found ${propertyCount} properties in ${arrondissement}e arrondissement`);
    
    // Attendre un peu avant d'insérer les données
    const waitTime = Math.floor(Math.random() * 2000) + 3000;
    console.log(`⏳ Waiting ${waitTime}ms before inserting data for arrondissement ${arrondissement}...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    try {
      // Insérer les données dans BigQuery
      const rows = [{
        ObservationDate: new Date().toISOString(),
        Arrondissement: `${arrondissement}e`,
        PropertiesCount: parseInt(propertyCount)
      }];
      
      console.log('📝 Attempting to insert data:', rows);
      
      await bigquery
        .dataset(datasetId)
        .table(tableId)
        .insert(rows);
        
      console.log(`💾 Inserted data for arrondissement ${arrondissement} with ${propertyCount} properties at ${new Date().toLocaleString()}`);
    } catch (bigQueryError) {
      console.error(`❌ BigQuery Error for arrondissement ${arrondissement}:`, bigQueryError.message);
      if (bigQueryError.errors) {
        console.error('Detailed errors:', bigQueryError.errors);
      }
      throw bigQueryError;
    }
    
  } catch (error) {
    console.error(`❌ Error scraping arrondissement ${arrondissement}:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
  
  console.log(`✅ Terminé pour le ${arrondissement}e arrondissement`);
} 