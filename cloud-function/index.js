const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { BigQuery } = require('@google-cloud/bigquery');

puppeteer.use(StealthPlugin());

// Configuration BigQuery
const bigquery = new BigQuery();
const datasetId = 'booking_data';
const tableId = 'legal_info';

/**
 * Cloud Function HTTP entry point
 */
exports.scrapeBookingData = async (req, res) => {
    // CORS headers pour permettre les appels depuis Cloud Scheduler
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        console.log('🚀 Starting Booking.com scraper...');
        
        // URLs à scraper (vous pouvez les passer en paramètre ou les stocker en variable d'environnement)
        const urls = process.env.SCRAPING_URLS ? 
            process.env.SCRAPING_URLS.split(',') : 
            [
                'https://www.booking.com/hotel/fr/example1.html',
                'https://www.booking.com/hotel/fr/example2.html'
            ];

        console.log(`📋 Found ${urls.length} URLs to process`);

        const results = await scrapeUrls(urls);
        
        // Insérer les résultats dans BigQuery
        await insertToBigQuery(results);
        
        console.log(`✅ Scraping completed successfully. ${results.length} results processed.`);
        
        res.status(200).json({
            success: true,
            message: `Scraping completed successfully`,
            resultsCount: results.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in Cloud Function:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Fonction principale de scraping
 */
async function scrapeUrls(urls) {
    const browser = await puppeteer.launch({
        headless: true, // Important pour Cloud Functions
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    });

    try {
        const allResults = [];
        
        // Traiter les URLs une par une (limite de concurrence pour éviter les timeouts)
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`🌐 Processing ${i + 1}/${urls.length}: ${url}`);
            
            const result = await scrapeSingleUrl(url, browser, i, urls.length);
            allResults.push(result);
            
            // Petite pause entre les requêtes pour éviter d'être bloqué
            if (i < urls.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return allResults;

    } finally {
        await browser.close();
    }
}

/**
 * Scraper une URL individuelle
 */
async function scrapeSingleUrl(url, browser, index, total) {
    let page = null;
    try {
        page = await browser.newPage();
        
        // Timeout plus court pour Cloud Functions
        page.setDefaultTimeout(20000);
        
        console.log(`🌐 Processing ${index + 1}/${total}: ${url}`);
        
        // 1. Aller sur la page
        console.log('Navigating to Booking.com page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 20000
        });

        // Attendre que la page soit chargée
        await page.waitForTimeout(3000);

        // 2. Identifier et cliquer sur le bouton "See business details"
        console.log('Looking for "See business details" button...');
        
        try {
            // Attendre que le bouton soit visible
            await page.waitForSelector('[data-testid="trader-information-modal-button"]', { timeout: 10000 });
            
            // Cliquer sur le bouton
            console.log('Clicking on "See business details" button...');
            await page.click('[data-testid="trader-information-modal-button"]');

            // 3. Attendre que la modale apparaisse
            console.log('Waiting for modal to appear...');
            await page.waitForSelector('[data-testid="trader-information-modal"]', { timeout: 10000 });
            
            // Attendre un peu pour que la modale soit complètement chargée
            await page.waitForTimeout(2000);

            // 4. Cliquer sur le bouton "Business details" pour déployer les informations
            console.log('Looking for "Business details" expand button...');
            await page.waitForSelector('[data-testid="show-host-detail-button"]', { timeout: 10000 });
            
            console.log('Clicking on "Business details" expand button...');
            await page.click('[data-testid="show-host-detail-button"]');

            // Attendre que les détails se déploient
            await page.waitForTimeout(2000);

            // 5. Récupérer les informations
            console.log('Extracting business information...');
            
            const businessInfo = await page.evaluate(() => {
                const modal = document.querySelector('[data-testid="trader-information-modal"]');
                if (!modal) return null;

                // Récupérer l'email
                const emailElement = modal.querySelector('[data-testid="host-details-email"]');
                const email = emailElement ? emailElement.textContent.trim() : null;
                
                // Récupérer le téléphone
                const phoneElement = modal.querySelector('[data-testid="host-details-phone"]');
                const phone = phoneElement ? phoneElement.textContent.trim() : null;
                
                // Récupérer l'adresse
                let address = null;
                const addressElements = modal.querySelectorAll('div');
                for (let element of addressElements) {
                    const text = element.textContent;
                    // Chercher une adresse avec un code postal
                    const addressMatch = text.match(/([A-Za-z\s,]+,\s*[A-Z]{1,2}\d{1,2}\s*[A-Z]{1,2}\s*[A-Za-z\s]+)/);
                    if (addressMatch && text.length < 200) {
                        address = addressMatch[1].trim();
                        break;
                    }
                }
                
                // Récupérer le numéro de registre du commerce
                let registerNumber = null;
                const registerMatch = modal.textContent.match(/registre du commerce[:\s]*(\d+)/i);
                if (registerMatch) {
                    registerNumber = registerMatch[1];
                }

                // Essayer de récupérer le nom de l'entreprise
                const businessNameMatch = modal.textContent.match(/([A-Za-z\s&]+(?:Ltd|Limited|LIMITED|Inc|LLC|Corp|Corporation|Accor|Group|Company|Co))/);
                const businessName = businessNameMatch ? businessNameMatch[1].trim() : null;

                return {
                    url: window.location.href,
                    businessName: businessName,
                    address: address,
                    email: email,
                    phone: phone,
                    registerNumber: registerNumber,
                    scrapedAt: new Date().toISOString()
                };
            });

            if (businessInfo) {
                console.log('✅ Success: Business information found');
                console.log(JSON.stringify(businessInfo, null, 2));
                return businessInfo;
            } else {
                console.log('❌ No business information found');
                return {
                    url: url,
                    businessName: null,
                    address: null,
                    email: null,
                    phone: null,
                    registerNumber: null,
                    scrapedAt: new Date().toISOString(),
                    error: 'No business information found'
                };
            }

        } catch (modalError) {
            console.log('❌ No legal information section found');
            return {
                url: url,
                businessName: null,
                address: null,
                email: null,
                phone: null,
                registerNumber: null,
                scrapedAt: new Date().toISOString(),
                error: 'No legal information section found'
            };
        }

    } catch (pageError) {
        console.error(`❌ Error processing ${url}:`, pageError.message);
        return {
            url: url,
            businessName: null,
            address: null,
            email: null,
            phone: null,
            registerNumber: null,
            scrapedAt: new Date().toISOString(),
            error: pageError.message
        };
    } finally {
        if (page) {
            await page.close();
        }
    }
}

/**
 * Insérer les données dans BigQuery
 */
async function insertToBigQuery(results) {
    try {
        console.log('📊 Inserting data into BigQuery...');
        
        // Créer le dataset s'il n'existe pas
        const dataset = bigquery.dataset(datasetId);
        const [datasetExists] = await dataset.exists();
        if (!datasetExists) {
            console.log(`Creating dataset ${datasetId}...`);
            await dataset.create();
        }

        // Créer la table si elle n'existe pas
        const table = dataset.table(tableId);
        const [tableExists] = await table.exists();
        if (!tableExists) {
            console.log(`Creating table ${tableId}...`);
            const schema = [
                { name: 'url', type: 'STRING' },
                { name: 'businessName', type: 'STRING' },
                { name: 'address', type: 'STRING' },
                { name: 'email', type: 'STRING' },
                { name: 'phone', type: 'STRING' },
                { name: 'registerNumber', type: 'STRING' },
                { name: 'scrapedAt', type: 'TIMESTAMP' },
                { name: 'error', type: 'STRING' }
            ];
            await table.create({ schema });
        }

        // Insérer les données
        const rows = results.map(result => ({
            url: result.url,
            businessName: result.businessName,
            address: result.address,
            email: result.email,
            phone: result.phone,
            registerNumber: result.registerNumber,
            scrapedAt: result.scrapedAt,
            error: result.error || null
        }));

        await table.insert(rows);
        console.log(`✅ Successfully inserted ${rows.length} rows into BigQuery`);
        
    } catch (error) {
        console.error('❌ Error inserting into BigQuery:', error);
        throw error;
    }
}

