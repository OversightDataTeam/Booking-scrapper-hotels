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

async function appendToCSV(hotels, filename, arrondissement, searchUrl, checkinDate, checkoutDate) {
  if (hotels.length > 0) {
    // Add header if file doesn't exist
    if (!fs.existsSync(filename)) {
      const header = '"Arrondissement";"Nombre de propriétés";"URL de recherche";"Date check-in";"Date check-out";"Date et heure du scraping"\n';
      fs.writeFileSync(filename, header);
    }

    const scrapingDateTime = getCurrentDateTime();
    console.log(`📅 Writing to CSV with dates - Check-in: ${checkinDate}, Check-out: ${checkoutDate}, Scraping: ${scrapingDateTime}`);

    const csvContent = hotels.map(hotel => 
      `"${arrondissement}";"${hotels.length}";"${searchUrl}";"${checkinDate}";"${checkoutDate}";"${scrapingDateTime}"`
    ).join('\n') + '\n';
    
    fs.appendFileSync(filename, csvContent);
    console.log(`💾 Added ${hotels.length} new unique hotels to CSV for arrondissement ${arrondissement}`);
  } else {
    console.log(`ℹ️ No new hotels to add to CSV for arrondissement ${arrondissement}`);
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
      `--window-position=${(arrondissement % 5) * 300},0` // Position windows side by side
    ]
  });
  console.log(`🌐 Browser launched for ${arrondissement}e arrondissement`);

  try {
    const page = await browser.newPage();
    console.log(`📄 New page created for ${arrondissement}e arrondissement`);

    // Set a longer timeout for navigation
    page.setDefaultNavigationTimeout(60000);

    console.log(`⏳ Navigating to URL for ${arrondissement}e arrondissement...`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    console.log(`✅ Page loaded successfully for ${arrondissement}e arrondissement`);

    // Wait for hotel cards with retry mechanism
    const cardSelector = await waitForHotelCards(page);

    let hasMoreResults = true;
    let allFoundHotels = new Map(); // Map to store all found hotels with their data
    let lastHeight = 0;
    let pageCount = 1;

    // Create CSV file with fixed name
    const filename = 'hotel_url.csv';
    console.log(`📝 Using CSV file: ${filename}`);

    // First phase: collect all hotels
    console.log('📥 Starting hotel collection phase...');
    while (hasMoreResults) {
      console.log(`\n📃 Processing page ${pageCount}...`);
      
      // Get all current listings
      const listings = await page.$$(cardSelector);
      console.log(`📊 Found ${listings.length} listings on current page`);
      
      if (listings.length === 0) {
        console.log('⚠️ No listings found, waiting for content...');
        await page.waitForTimeout(5000);
        continue;
      }

      // Scroll through each listing quickly
      console.log('🔄 Starting quick scroll through listings...');
      for (let i = 0; i < listings.length; i += 3) {
        const listing = listings[i];
        await listing.scrollIntoView({ behavior: 'auto', block: 'center' });
        console.log(`   ⏳ Scrolled to listing ${i + 1}/${listings.length}`);
        await page.waitForTimeout(100);
      }
      console.log('✅ Finished scrolling through listings');

      // Wait for any new content to load
      console.log('⏳ Waiting for new content to load...');
      await page.waitForTimeout(1000);

      // Extract current page hotel data
      console.log('🔍 Extracting hotel data from current page...');
      const currentPageHotels = await page.evaluate(() => {
        const hotels = [];
        const cards = document.querySelectorAll('[data-testid="property-card"]');
        
        cards.forEach(card => {
          const titleLink = card.querySelector('a[data-testid="title-link"]');
          if (!titleLink) return;

          const url = titleLink.href;
          const name = titleLink.querySelector('[data-testid="title"]')?.textContent?.trim() || '';
          
          // Get rating - keep the full rating value
          const ratingElement = card.querySelector('[data-testid="review-score"]');
          let rating = '';
          if (ratingElement) {
            const ratingText = ratingElement.textContent.trim();
            // Extract the full rating value (e.g., "7,9" from "Avec une note de 7,9")
            const ratingMatch = ratingText.match(/(\d+[,.]\d+)/);
            rating = ratingMatch ? ratingMatch[1] : '';
          }

          hotels.push({ url, name, rating });
        });
        
        return hotels;
      });
      console.log(`📊 Found ${currentPageHotels.length} hotels on current page`);

      // Add all found hotels to our map
      currentPageHotels.forEach(hotel => {
        if (!allFoundHotels.has(hotel.url)) {
          allFoundHotels.set(hotel.url, hotel);
        }
      });
      console.log(`📈 Total unique hotels found so far: ${allFoundHotels.size}`);

      // Try to click the "Show more results" button
      console.log('🔍 Looking for "Show more results" button...');
      try {
        const showMoreButton = await page.waitForSelector('button.de576f5064, button[data-testid="pagination-next"]', { timeout: 5000 });
        if (showMoreButton) {
          console.log('✅ Found "Show more results" button, clicking...');
          await showMoreButton.click();
          console.log('⏳ Waiting for new results to load...');
          await page.waitForTimeout(1000);
        } else {
          console.log('❌ No more results button found');
          hasMoreResults = false;
        }
      } catch (error) {
        console.log('❌ No more results button found (timeout)');
        hasMoreResults = false;
      }

      // Check if we've reached the bottom
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === lastHeight) {
        console.log('📏 Page height unchanged, reached the end');
        hasMoreResults = false;
      }
      lastHeight = newHeight;
      pageCount++;
    }

    // Second phase: process and save new unique hotels
    console.log('\n📝 Starting hotel processing phase...');
    const existingUrls = readExistingUrls(filename);
    console.log(`📚 Found ${existingUrls.size} existing hotels in CSV`);

    // Find new unique hotels
    const newHotels = Array.from(allFoundHotels.values())
      .filter(hotel => !existingUrls.has(hotel.url));
    console.log(`📈 Found ${newHotels.length} new unique hotels to add`);

    // Save new hotels to CSV with arrondissement, search URL and dates
    if (newHotels.length > 0) {
      console.log(`📅 Saving with dates - Check-in: ${checkinDate}, Check-out: ${checkoutDate}`);
      await appendToCSV(newHotels, filename, arrondissement, url, checkinDate, checkoutDate);
    }

    console.log('\n📊 Scraping completed!');
    console.log(`📈 Total unique hotels found: ${allFoundHotels.size}`);
    console.log(`💾 Added ${newHotels.length} new hotels to ${filename}`);

    return Array.from(allFoundHotels.values());

  } catch (error) {
    console.error(`❌ Error occurred for ${arrondissement}e arrondissement:`, error);
    throw error;
  } finally {
    console.log(`🔄 Closing browser for ${arrondissement}e arrondissement...`);
    await browser.close();
    console.log(`✅ Browser closed for ${arrondissement}e arrondissement`);
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

// Start scraping all arrondissements
scrapeAllArrondissements(); 