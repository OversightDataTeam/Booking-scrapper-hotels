const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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

async function appendToCSV(arrondissement, propertiesCount, filename) {
  const today = new Date();
  const date = today.toISOString().split('T')[0]; // Format YYYY-MM-DD

  // Add header if file doesn't exist
  if (!fs.existsSync(filename)) {
    const header = '"Arrondissement";"Nombre de propriétés";"Date"\n';
    fs.writeFileSync(filename, header);
  }

  const csvContent = `"${arrondissement}";"${propertiesCount}";"${date}"\n`;
  fs.appendFileSync(filename, csvContent);
  console.log(`💾 Added summary for arrondissement ${arrondissement} with ${propertiesCount} properties`);
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

    // Save summary for this arrondissement
    await appendToCSV(arrondissement, propertiesCount, 'arrondissements_summary.csv');

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

  return `${baseUrl}?${queryString}`;
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
      const url = generateBookingUrl(arrondissement);
      return scrapeBookingHotels(url, arrondissement);
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

// Start scraping all arrondissements
scrapeAllArrondissements(); 