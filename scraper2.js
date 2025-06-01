const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const pLimit = require('p-limit');
puppeteer.use(StealthPlugin());
const axios = require('axios');

// Webhook configuration
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzcZasnLmEpMTWYu6afYZqAketTr7j4plp0xvCRdykVU1qu9pMxRTJb27-xahGZDlwI/exec';

function normalizeUrl(url) {
  // Extract the hotel path from the URL
  const match = url.match(/\/hotel\/[^?]+/);
  return match ? match[0] : url;
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

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

async function sendToWebhook(arrondissement, propertiesCount, checkinDate, checkoutDate) {
  const data = {
    arrondissement: arrondissement.toString(),
    propertiesCount: propertiesCount,
    checkinDate: formatDate(checkinDate),
    checkoutDate: formatDate(checkoutDate),
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
      `[${arrondissement}e] ✅ ${propertiesCount} properties | ${formatDate(checkinDate)} → ${formatDate(checkoutDate)} | Webhook: ${response?.status || 'N/A'}`
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

async function scrapeBookingHotels(url, arrondissement, checkinDate, checkoutDate) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🏙️  [${arrondissement}e] Scraping: ${checkinDate} → ${checkoutDate}`);
  console.log(`URL: ${url}`);

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

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('🌐 Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('🌐 Current URL:', await page.url());
    
    // Add a delay to ensure the page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 1000));

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
    await page.waitForSelector('h1', { timeout: 5000, visible: true });

    // Extract the number of properties from the title
    const propertiesCount = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
      // Log explicitement les h1 dans le contexte navigateur
      console.log('🔍 [browser context] h1s:', h1s);
      const match = h1s.map(title => title.match(/(\d+)\s+(?:properties|établissements?)\s+(?:found|trouvés)/)).find(Boolean);
      return match ? parseInt(match[1]) : 0;
    });

    console.log(`📊 Found ${propertiesCount} properties in ${arrondissement}e arrondissement`);

    // Send data to webhook
    await sendToWebhook(arrondissement, propertiesCount, checkinDate, checkoutDate);

    return propertiesCount;

  } catch (error) {
    console.log(
      `[${arrondissement}e] ❌ ERROR | ${formatDate(checkinDate)} → ${formatDate(checkoutDate)} | ${error.message}`
    );
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
    group_children: '0'
  };

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

// Array of arrondissements to scrape
const arrondissements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Function to generate dates for the next 180 days
function generateDates() {
  const dates = [];
  const today = new Date();

  console.log('\n📅 GENERATING DATES');
  console.log('==================');
  console.log(`Today's date: ${today.toISOString().split('T')[0]}`);

  for (let i = 0; i < 180; i++) {
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

// Function to scrape all arrondissements for a specific date
async function scrapeAllArrondissementsForDate(checkinDate, checkoutDate) {
  console.log(`\n🔄 Starting scraping for all arrondissements (5 en parallèle) pour les dates ${checkinDate} à ${checkoutDate}`);
  const limit = pLimit(5); // Limite à 5 arrondissements en parallèle
  const tasks = arrondissements.map(arrondissement =>
    limit(async () => {
      const url = generateBookingUrl(arrondissement, checkinDate, checkoutDate);
      try {
        await scrapeBookingHotels(url, arrondissement, checkinDate, checkoutDate);
        console.log(`✅ Completed scraping for ${arrondissement}e arrondissement for dates ${checkinDate} to ${checkoutDate}`);
      } catch (error) {
        console.error(`❌ Error scraping ${arrondissement}e arrondissement:`, error);
      }
    })
  );
  await Promise.all(tasks);
  console.log(`✅ Completed scraping for all arrondissements for dates ${checkinDate} to ${checkoutDate}\n`);
}

// Initialize scraping process
async function main() {
  try {
    const today = new Date();
    const checkin = today.toISOString().split('T')[0];
    const checkout = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`\n[${new Date().toISOString()}] Processing dates: ${checkin} to ${checkout}`);
    await scrapeAllArrondissementsForDate(checkin, checkout);
    console.log('\nScraping completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Start the scraping process
main(); 