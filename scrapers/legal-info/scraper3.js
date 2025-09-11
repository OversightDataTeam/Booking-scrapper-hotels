const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Fonction pour lire les URLs du fichier
function readUrlsFromFile(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n').filter(url => url.trim() !== '');
}

// Fonction pour sauvegarder un résultat dans le CSV
function saveResultToCSV(result, isFirst = false) {
    const csvLine = `"${result.url}","${result.businessName || ''}","${result.address || ''}","${result.email || ''}","${result.phone || ''}","${result.registerNumber || ''}","${result.scrapedAt}","${result.error || ''}"`;
    
    if (isFirst) {
        // Créer le fichier avec l'en-tête
        const csvHeader = 'url,businessName,address,email,phone,registerNumber,scrapedAt,error\n';
        fs.writeFileSync('legal-results.csv', csvHeader + csvLine + '\n');
    } else {
        // Ajouter à la fin du fichier
        fs.appendFileSync('legal-results.csv', csvLine + '\n');
    }
}

// Fonction pour scraper une URL individuelle
async function scrapeSingleUrl(url, browser, index, total) {
    let page = null;
    try {
        page = await browser.newPage();
        
        console.log(`🌐 Processing ${index + 1}/${total}: ${url}`);
        
        // 1. Aller sur la page
        console.log('Navigating to Booking.com page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
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

async function scrapeLegalInfo() {
    const urls = readUrlsFromFile('url.txt');
    console.log(`📋 Found ${urls.length} URLs to process`);
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const allResults = [];
        
        // Traiter les URLs une par une
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`\n🌐 Processing ${i + 1}/${urls.length}: ${url}`);
            
            const result = await scrapeSingleUrl(url, browser, i, urls.length);
            
            // Sauvegarder progressivement dans le CSV
            const isFirst = (i === 0);
            saveResultToCSV(result, isFirst);
            
            allResults.push(result);
            
            // Sauvegarder aussi en JSON progressivement
            fs.writeFileSync('legal-results.json', JSON.stringify(allResults, null, 2));
            
            // Afficher le progrès
            if ((i + 1) % 10 === 0 || (i + 1) === urls.length) {
                console.log(`📊 Progress: ${i + 1}/${urls.length} (${Math.round((i + 1)/urls.length*100)}%)`);
            }
        }

        console.log(`\n📊 Final Summary:`);
        console.log(`📋 Total processed: ${allResults.length}`);
        console.log('💾 Results saved to legal-results.csv and legal-results.json');

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

// Exécuter le scraper
scrapeLegalInfo().catch(console.error); 