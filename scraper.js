const puppeteer = require('puppeteer');
const {BigQuery} = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: 'your-project-id', // Replace with your GCP project ID
  keyFilename: 'path/to/your/service-account-key.json' // Replace with your service account key path
});

const datasetId = 'paris_hotels';
const tableId = 'arrondissements_summary';

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

async function ensureTableExists() {
  try {
    // Check if dataset exists, create if it doesn't
    const [datasets] = await bigquery.getDatasets();
    const datasetExists = datasets.some(dataset => dataset.id === datasetId);
    
    if (!datasetExists) {
      await bigquery.createDataset(datasetId);
      console.log(`✅ Created dataset ${datasetId}`);
    }

    // Check if table exists, create if it doesn't
    const [tables] = await bigquery.dataset(datasetId).getTables();
    const tableExists = tables.some(table => table.id === tableId);
    
    if (!tableExists) {
      const schema = {
        fields: [
          {name: 'arrondissement', type: 'INTEGER'},
          {name: 'properties_count', type: 'INTEGER'},
          {name: 'scraping_date', type: 'DATE'}
        ]
      };

      await bigquery.dataset(datasetId).createTable(tableId, {schema});
      console.log(`✅ Created table ${tableId}`);
    }
  } catch (error) {
    console.error('❌ Error ensuring table exists:', error);
    throw error;
  }
}

async function appendToBigQuery(arrondissement, propertiesCount) {
  const today = new Date();
  const date = today.toISOString().split('T')[0]; // Format YYYY-MM-DD

  const rows = [{
    arrondissement: arrondissement,
    properties_count: propertiesCount,
    scraping_date: date
  }];

  try {
    await bigquery.dataset(datasetId).table(tableId).insert(rows);
    console.log(`💾 Added data for arrondissement ${arrondissement} with ${propertiesCount} properties`);
  } catch (error) {
    console.error('❌ Error inserting data:', error);
    throw error;
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
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,800',
      `--window-position=${(arrondissement % 5) * 300},0`
    ]
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    // Wait for the title element that contains the number of properties
    await page.waitForSelector('h1[aria-live="assertive"]', { timeout: 10000 });

    // Extract the number of properties from the title
    const propertiesCount = await page.evaluate(() => {
      const title = document.querySelector('h1[aria-live="assertive"]').textContent;
      const match = title.match(/(\d+)\s+établissements?/);
      return match ? parseInt(match[1]) : 0;
    });

    console.log(`📊 Found ${propertiesCount} properties in ${arrondissement}e arrondissement`);

    // Save summary for this arrondissement to BigQuery
    await appendToBigQuery(arrondissement, propertiesCount);

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
    group_children: '0'
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
  for (let i = 0; i < arrondissements.length; i += 5) {
    const batch = arrondissements.slice(i, i + 5);
    console.log(`\n🔄 Starting batch of arrondissements: ${batch.join(', ')}`);
    
    // Create an array of promises for the current batch
    const promises = batch.map(arrondissement => {
      console.log(`🏙️ Initializing scraping for ${arrondissement}e arrondissement...`);
      const bookingData = generateBookingUrl(arrondissement);
      console.log(`📅 Using dates - Check-in: ${bookingData.checkinDate}, Check-out: ${bookingData.checkoutDate}`);
      return scrapeBookingHotels(bookingData.url, arrondissement, bookingData.checkinDate, bookingData.checkoutDate);
    });

    // Wait for all promises in the current batch to complete
    try {
      await Promise.all(promises);
      console.log(`✅ Completed batch of arrondissements: ${batch.join(', ')}\n`);
    } catch (error) {
      console.error(`❌ Error in batch ${batch.join(', ')}:`, error);
    }

    // Add a small delay between batches to avoid overwhelming the system
    if (i + 5 < arrondissements.length) {
      console.log('⏳ Waiting 5 seconds before starting next batch...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Initialize BigQuery table before starting scraping
async function main() {
  try {
    await ensureTableExists();
    await scrapeAllArrondissements();
  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Start the scraping process
main(); 