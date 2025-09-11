require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const pLimit = require('p-limit'); // Problème avec ES modules
const {BigQuery} = require('@google-cloud/bigquery');
puppeteer.use(StealthPlugin());
const axios = require('axios');

// BigQuery configuration
const bigquery = new BigQuery({
  projectId: 'oversight-datalake',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './scrapers/hotel-data-180days/bigquery-credentials.json'
});

// Vérifier les credentials
console.log('🔑 Checking BigQuery credentials...');
console.log('Project ID:', bigquery.projectId);
console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS || './scrapers/hotel-data-180days/bigquery-credentials.json');

// Vérifier si le fichier de credentials existe
const fs = require('fs');
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './scrapers/hotel-data-180days/bigquery-credentials.json';
if (credentialsPath) {
  try {
    const stats = fs.statSync(credentialsPath);
    console.log('✅ Credentials file exists, size:', stats.size, 'bytes');
  } catch (error) {
    console.error('❌ Credentials file not found:', error.message);
  }
}

const datasetId = 'MarketData';
const tableId = 'Arrondissement';

// Schéma de la table
const schema = {
  fields: [
    {name: 'ObservationDate', type: 'DATETIME', mode: 'NULLABLE'},
    {name: 'Arrondissement', type: 'STRING', mode: 'NULLABLE'},
    {name: 'CheckinDate', type: 'DATETIME', mode: 'NULLABLE'},
    {name: 'PropertiesCount', type: 'INTEGER', mode: 'NULLABLE'},
    {name: 'CheckoutDate', type: 'DATETIME', mode: 'NULLABLE'}
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

// Webhook configuration
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzcZasnLmEpMTWYu6afYZqAketTr7j4plp0xvCRdykVU1qu9pMxRTJb27-xahGZDlwI/exec';

function normalizeUrl(url) {
  // Extract the hotel path from the URL
  const match = url.match(/\/hotel\/[^?]+/);
  return match ? match[0] : url;
}

function getCurrentDateTime() {
  const now = new Date();
  // Convertir en heure de Paris (UTC+2)
  const parisTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  const year = parisTime.getFullYear();
  const month = String(parisTime.getMonth() + 1).padStart(2, '0');
  const day = String(parisTime.getDate()).padStart(2, '0');
  const hours = String(parisTime.getHours()).padStart(2, '0');
  const minutes = String(parisTime.getMinutes()).padStart(2, '0');
  const seconds = String(parisTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function formatDateTimeForBigQuery(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function sendToWebhook(arrondissement, propertiesCount, checkinDate, checkoutDate) {
  const data = {
    arrondissement: arrondissement.toString(),
    propertiesCount: propertiesCount,
    checkinDate: formatDateTimeForBigQuery(checkinDate),
    checkoutDate: formatDateTimeForBigQuery(checkoutDate),
    scrapingDate: getCurrentDateTime()
  };

  try {
    const delay = 200; // 200 ms seulement
    await new Promise(resolve => setTimeout(resolve, delay));

    const response = await axios.post(WEBHOOK_URL, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Important pour Google Apps Script
      params: {
        'callback': 'callback'
      }
    });
    
    console.log(
      `[${arrondissement}e] ✅ ${propertiesCount} properties | ${formatDateTime(checkinDate)} → ${formatDateTime(checkoutDate)} | Webhook: ${response?.status || 'N/A'}`
    );
    
    // Vérifier si la réponse contient une erreur
    if (response.data && response.data.error) {
      throw new Error(response.data.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error sending data to webhook:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    // Ne pas throw l'erreur pour continuer le scraping même si l'envoi échoue
    return null;
  }
}

async function insertIntoBigQuery(arrondissement, propertiesCount, checkinDate, checkoutDate) {
  const now = new Date();
  // Convertir en heure de Paris (UTC+2)
  const parisTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  const formattedDate = parisTime.toISOString().replace('T', ' ').replace('Z', '');
  const formattedCheckin = new Date(checkinDate).toISOString().replace('T', ' ').replace('Z', '');
  const formattedCheckout = new Date(checkoutDate).toISOString().replace('T', ' ').replace('Z', '');
  
  const rows = [{
    ObservationDate: formattedDate,
    Arrondissement: arrondissement.toString(),
    CheckinDate: formattedCheckin,
    PropertiesCount: parseInt(propertiesCount),
    CheckoutDate: formattedCheckout
  }];
  
  try {
    console.log('📝 Attempting to insert data:', JSON.stringify(rows, null, 2));
    
    await bigquery
      .dataset(datasetId)
      .table(tableId)
      .insert(rows);
      
    console.log(`💾 Inserted data for arrondissement ${arrondissement} with ${propertiesCount} properties`);
  } catch (error) {
    console.error('❌ Error inserting data to BigQuery:', error.message);
    if (error.errors) {
      console.error('BigQuery errors:', JSON.stringify(error.errors, null, 2));
    }
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response, null, 2));
    }
    // Ne pas throw l'erreur pour continuer le scraping même si l'insertion échoue
    return null;
  }
}

async function scrapeBookingHotels(arrondissement, checkinDate, checkoutDate) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ]
    // Supprimé userDataDir pour éviter les conflits sur macOS
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Augmenter les timeouts à 60 secondes
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);

    const url = generateBookingUrl(arrondissement, checkinDate, checkoutDate);
    console.log(`🌐 Navigating to: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    } catch (error) {
      // En cas d'erreur, logger le contenu de la page
      const content = await page.content();
      console.error(`❌ Error loading page for ${arrondissement}e arrondissement. Page content:`, content.slice(0, 1000));
      throw error;
    }

    // Attendre plus longtemps pour le h1
    const h1Selector = await page.waitForSelector('h1', { timeout: 60000 });
    if (!h1Selector) {
      throw new Error('Could not find h1 element');
    }

    const h1Text = await page.$eval('h1', el => el.textContent);
    console.log(`🔍 Tous les h1 récupérés : [ '${h1Text}' ]`);

    // Extraire le nombre de propriétés
    const match = h1Text.match(/(\d+)\s+(?:properties|exact matches)/i);
    const propertiesCount = match ? parseInt(match[1]) : 0;

    console.log(`📊 Found ${propertiesCount} properties in ${arrondissement}e arrondissement`);

    // Préparer les données pour BigQuery
    const data = [{
      ObservationDate: new Date().toISOString().replace('Z', ''),
      Arrondissement: arrondissement.toString(),
      CheckinDate: checkinDate + ' 00:00:00.000',
      PropertiesCount: propertiesCount,
      CheckoutDate: checkoutDate + ' 00:00:00.000'
    }];

    console.log('📝 Attempting to insert data:', JSON.stringify(data, null, 2));

    // Insérer dans BigQuery
    await insertIntoBigQuery(arrondissement, propertiesCount, checkinDate, checkoutDate);
    console.log(`💾 Inserted data for arrondissement ${arrondissement} with ${propertiesCount} properties`);

    return propertiesCount;
  } catch (error) {
    console.error(`❌ Error scraping ${arrondissement}e arrondissement:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

function generateBookingUrl(arrondissement, checkinDate, checkoutDate) {
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
    nflt: 'ht_id%3D204'  // Filtre pour n'afficher que les hôtels
  };

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

// Function to generate dates for the next 2 days (TEST VERSION)
function generateDates() {
  const dates = [];
  const today = new Date();

  console.log('\n📅 GENERATING DATES (TEST VERSION - 2 DAYS ONLY)');
  console.log('==================');
  console.log(`Today's date: ${today.toISOString().split('T')[0]}`);

  for (let i = 0; i < 2; i++) {  // Seulement 2 jours pour le test
    const checkin = new Date(today);
    checkin.setDate(today.getDate() + i);

    const checkout = new Date(checkin);
    checkout.setDate(checkin.getDate() + 1);

    dates.push({
      checkin: checkin.toISOString().split('T')[0],
      checkout: checkout.toISOString().split('T')[0]
    });
  }

  console.log(`Generated ${dates.length} date pairs`);
  console.log(`First date: ${dates[0].checkin} - ${dates[0].checkout}`);
  console.log(`Last date: ${dates[dates.length - 1].checkin} - ${dates[dates.length - 1].checkout}`);
  console.log('==================\n');

  return dates;
}

async function scrapeAllArrondissements() {
  const arrondissements = [1, 2]; // Seulement 2 arrondissements pour le test
  const dates = generateDates(); // 2 paires de dates pour le test
  
  // Traitement séquentiel pour le test (plus sûr)
  for (const datePair of dates) {
    for (const arrondissement of arrondissements) {
      try {
        console.log(`🔄 Processing: ${arrondissement}e arrondissement, ${datePair.checkin} → ${datePair.checkout}`);
        
        // Délai entre les requêtes pour éviter la détection
        await new Promise(r => setTimeout(r, Math.random() * 5000 + 3000)); // 3-8 secondes
        
        const count = await scrapeBookingHotels(arrondissement, datePair.checkin, datePair.checkout);
        console.log(`✅ Completed: ${arrondissement}e arrondissement, ${datePair.checkin} → ${datePair.checkout}`);
      } catch (error) {
        console.error(`❌ Error: ${arrondissement}e arrondissement, ${datePair.checkin} → ${datePair.checkout}:`, error);
      }
    }
  }
  
  console.log(`✅ Completed all test requests`);
}

// Initialize scraping process
async function main() {
  try {
    // S'assurer que la table existe avant de commencer
    await ensureTableExists();
    
    await scrapeAllArrondissements();
    console.log('\nScraping completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Start the scraping process
main();
