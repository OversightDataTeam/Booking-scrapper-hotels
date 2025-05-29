const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const axios = require('axios');

// Webhook configuration for 180 days data
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

function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

async function sendToWebhook(arrondissement, propertiesCount, checkinDate) {
    const checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkoutDate.getDate() + 1);

    const data = {
        arrondissement,
        propertiesCount,
        checkinDate: formatDate(checkinDate),
        checkoutDate: formatDate(checkoutDate),
        scrapingDate: getCurrentDateTime()
    };

    try {
        const response = await axios.post(WEBHOOK_URL, data, {
            headers: {
                'Content-Type': 'application/json',
            },
            params: {
                'callback': 'callback'
            }
        });

        console.log(`💾 Sent data for arrondissement ${arrondissement}:`);
        console.log(`   Properties: ${propertiesCount}`);
        console.log(`   Check-in: ${data.checkinDate}`);
        console.log(`   Check-out: ${data.checkoutDate}`);
        console.log(`   Scraping date: ${data.scrapingDate}`);

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
        return null;
    }
}

async function scrapeBookingHotels(url, arrondissement, checkinDate, checkoutDate) {
    console.log(`🌐 URL: ${url}`);

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

        console.log('⏳ Loading page...');
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log('⏳ Waiting for page to stabilize...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Log the page content for debugging
        const pageContent = await page.content();
        const pageContentLower = pageContent.toLowerCase();
        if (pageContentLower.includes('robot') || pageContentLower.includes('captcha') || pageContentLower.includes('access denied')) {
            console.warn('⚠️ WARNING: Possible bot detection or access denied!');
        }

        // Log all h1 contents
        const h1Contents = await page.evaluate(() => Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()));
        console.log('🔍 Found H1 elements:', h1Contents);

        // Wait for the title element that contains the number of properties
        await page.waitForSelector('h1', {
            timeout: 30000,
            visible: true
        });

        // Extract the number of properties from the title
        const propertiesCount = await page.evaluate(() => {
            const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
            const match = h1s.map(title => title.match(/(\d+)\s+(?:properties|établissements?)\s+(?:found|trouvés)/)).find(Boolean);
            return match ? parseInt(match[1]) : 0;
        });

        console.log(`✅ Found ${propertiesCount} properties`);

        // Send data to webhook
        console.log('📤 Sending data to webhook...');
        await sendToWebhook(arrondissement, propertiesCount, checkinDate);
        console.log('✅ Data sent successfully');

        return propertiesCount;

    } catch (error) {
        console.error(`❌ Error in arrondissement ${arrondissement}:`, error);
        throw error;
    } finally {
        await browser.close();
    }
}

function generateBookingUrl(arrondissement, checkinDate, checkoutDate) {
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
const arrondissements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

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
    console.log('\n🏙️ SCRAPING SESSION');
    console.log('==================');
    console.log(`Date range: ${checkinDate} to ${checkoutDate}`);
    console.log(`Time started: ${getCurrentDateTime()}`);
    console.log('==================');

    const promises = arrondissements.map(arrondissement => {
        console.log(`\n📍 Processing arrondissement ${arrondissement}`);
        console.log('------------------');
        const url = generateBookingUrl(arrondissement, checkinDate, checkoutDate);
        return scrapeBookingHotels(url, arrondissement, checkinDate, checkoutDate);
    });

    try {
        const results = await Promise.all(promises);
        console.log('\n📊 SCRAPING RESULTS');
        console.log('==================');
        results.forEach((count, index) => {
            console.log(`Arrondissement ${arrondissements[index]}: ${count} properties`);
        });
        console.log('==================\n');
    } catch (error) {
        console.error('\n❌ ERROR SUMMARY');
        console.error('==================');
        console.error(`Error occurred at: ${getCurrentDateTime()}`);
        console.error(`Error details:`, error);
        console.error('==================\n');
    }
}

// Initialize scraping process
async function main() {
    try {
        const dates = generateDates();
        console.log(`Generated ${dates.length} date pairs`);
        
        // Traiter chaque paire de dates
        for (const datePair of dates) {
            console.log(`\n[${new Date().toISOString()}] Processing dates: ${datePair.checkin} to ${datePair.checkout}`);
            
            // Traiter tous les arrondissements en parallèle
            const promises = arrondissements.map(arrondissement => 
                scrapeArrondissement(arrondissement, datePair.checkin, datePair.checkout)
            );
            
            // Attendre que tous les arrondissements soient traités
            await Promise.all(promises);
            
            // Attendre 10 secondes entre chaque paire de dates
            console.log(`Waiting 10 seconds before processing next date pair...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        console.log('\nScraping completed successfully!');
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

// Start the scraping process
main();

async function scrapeArrondissement(arrondissement, checkIn, checkOut) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        const url = generateBookingUrl(arrondissement, checkIn, checkOut);
        console.log(`\n[${new Date().toISOString()}] Scraping arrondissement ${arrondissement} for dates ${checkIn} to ${checkOut}`);
        console.log(`URL: ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        
        // Vérifier si nous sommes détectés comme un bot
        const pageContent = await page.content();
        if (pageContent.includes('bot') || pageContent.includes('captcha')) {
            console.log(`⚠️ Possible bot detection for arrondissement ${arrondissement}`);
            console.log('Page content preview:', pageContent.substring(0, 500));
            return;
        }
        
        // Attendre que les h1 soient chargés
        await page.waitForSelector('h1', { timeout: 10000 });
        
        // Récupérer tous les h1
        const h1Elements = await page.$$eval('h1', h1s => h1s.map(h1 => h1.textContent));
        console.log(`Found ${h1Elements.length} h1 elements:`, h1Elements);
        
        // Extraire le nombre de propriétés
        const h1Text = h1Elements[0] || '';
        const match = h1Text.match(/(\d+)\s+(?:properties|établissements?)\s+(?:found|trouvés)/);
        const numProperties = match ? parseInt(match[1]) : 0;
        
        console.log(`Found ${numProperties} properties in arrondissement ${arrondissement}`);
        
        // Envoyer les données une par une avec un délai
        const data = {
            arrondissement,
            checkIn,
            checkOut,
            numProperties,
            timestamp: new Date().toISOString()
        };
        
        console.log(`Sending data to webhook for arrondissement ${arrondissement}...`);
        await sendToWebhook(data);
        console.log(`✅ Data sent successfully for arrondissement ${arrondissement}`);
        
        // Attendre 2 secondes avant de passer à l'arrondissement suivant
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error(`Error scraping arrondissement ${arrondissement}:`, error.message);
    } finally {
        await browser.close();
    }
} 