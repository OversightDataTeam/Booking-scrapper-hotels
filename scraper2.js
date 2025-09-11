const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrapeHotelInfo() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // URL de l'hôtel à scraper
        const url = 'https://www.booking.com/hotel/gb/camden-kings-cross-luxury-ensuit-rooms.fr.html';
        
        console.log('🌐 Navigating to:', url);
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Attendre que la page soit chargée
        await page.waitForTimeout(3000);

        // Chercher le bouton "Legal information" ou "See business details"
        console.log('🔍 Looking for legal information button...');
        
        try {
            // Attendre que le bouton soit visible
            await page.waitForSelector('[data-testid="trader-information-modal-button"]', { timeout: 10000 });
            
            // Cliquer sur le bouton
            console.log('✅ Clicking on legal information button...');
            await page.click('[data-testid="trader-information-modal-button"]');

            // Attendre que la modale apparaisse
            console.log('⏳ Waiting for modal to appear...');
            await page.waitForSelector('[data-testid="trader-information-modal"]', { timeout: 10000 });
            
            // Attendre un peu pour que la modale soit complètement chargée
            await page.waitForTimeout(2000);

            // Chercher le bouton "Business details" pour déployer les informations
            console.log('🔍 Looking for "Business details" expand button...');
            await page.waitForSelector('[data-testid="show-host-detail-button"]', { timeout: 10000 });
            
            console.log('✅ Clicking on "Business details" expand button...');
            await page.click('[data-testid="show-host-detail-button"]');

            // Attendre que les détails se déploient
            await page.waitForTimeout(2000);

            // Récupérer les informations
            console.log('📋 Extracting business information...');
            
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
                return null;
            }

        } catch (error) {
            console.log('❌ No legal information section found');
            return null;
        }

    } catch (error) {
        console.error('❌ Error during scraping:', error);
        return null;
    } finally {
        await browser.close();
    }
}

// Exécuter le scraper
scrapeHotelInfo().catch(console.error); 