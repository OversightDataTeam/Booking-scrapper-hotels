const fs = require('fs');
const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Fonction pour extraire des détails spécifiques de la page en utilisant Puppeteer
const extractDetailsFromPage = async (page) => {
    try {
        await page.waitForSelector('div[data-testid="property-section--content"]', { timeout: 5000 });

        // Initialiser un objet pour contenir les détails extraits
        const extractedData = {
            nearbyPlaces: [],
            naturalEnvironment: [],
            skiLifts: [],
            popularFacilities: [],
            additionalTexts: [],
            petsAllowed: false,
            description: '' // Ajout d'un champ pour la description de l'hôtel
        };

        const contentText = await page.evaluate(() => {
            return document.body.innerText;
        });

        // Vérifier la présence d'animaux de compagnie
        extractedData.petsAllowed = contentText.includes("animali domestici sono ammessi");

        // Obtenir les sections des lieux à proximité
        const nearbyPlacesSection = await page.$('div[data-testid="property-section--content"] div.d31796cb42:nth-child(1)');
        if (nearbyPlacesSection) {
            const listItems = await nearbyPlacesSection.$$('ul[data-location-block-list="true"] li');
            extractedData.nearbyPlaces = await Promise.all(listItems.map(async (item) => {
                const placeName = await item.$eval('div.dc5041d860', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown place';
                const distance = await item.$eval('div.a53cbfa6de', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown distance';
                return `${placeName} (${distance})`;
            }));
        }

        // Obtenir l'environnement naturel
        const naturalEnvironmentSection = await page.$('div[data-testid="property-section--content"] div.d31796cb42:nth-child(3)');
        if (naturalEnvironmentSection) {
            const listItems = await naturalEnvironmentSection.$$('ul[data-location-block-list="true"] li');
            extractedData.naturalEnvironment = await Promise.all(listItems.map(async (item) => {
                const placeName = await item.$eval('div.dc5041d860', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown place';
                const distance = await item.$eval('div.a53cbfa6de', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown distance';
                return `${placeName} (${distance})`;
            }));
        }

        // Obtenir les remontées mécaniques
        const skiLiftsSection = await page.$('div[data-testid="property-section--content"] div.d31796cb42:nth-child(4)');
        if (skiLiftsSection) {
            const listItems = await skiLiftsSection.$$('ul[data-location-block-list="true"] li');
            extractedData.skiLifts = await Promise.all(listItems.map(async (item) => {
                const placeName = await item.$eval('div.dc5041d860', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown place';
                const distance = await item.$eval('div.a53cbfa6de', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown distance';
                return `${placeName} (${distance})`;
            }));
        }

        // Obtenir les facilités les plus populaires
        const popularFacilitiesSection = await page.$('div[data-testid="property-most-popular-facilities-wrapper"]');
        if (popularFacilitiesSection) {
            const listItems = await popularFacilitiesSection.$$('ul li');
            extractedData.popularFacilities = await Promise.all(listItems.map(async (item) => {
                const facilityName = await item.$eval('.a5a5a75131', el => el.innerText.trim().replace(/\s+/g, ' ')) || 'Unknown facility';
                return facilityName;
            }));
        }

        // Obtenir les textes supplémentaires
        const additionalTextElements = await page.$$('.e50d7535fa li');
        extractedData.additionalTexts = await Promise.all(additionalTextElements.map(async (element) => {
            return await element.evaluate(el => el.innerText.trim().replace(/\s+/g, ' '));
        }));

        // Extraire la description de l'hôtel
        const descriptionElement = await page.$('p[data-testid="property-description"]');
        if (descriptionElement) {
            extractedData.description = await descriptionElement.evaluate(el => el.innerText.trim().replace(/\s+/g, ' ')) || 'No description available';
        }

        // Formater les résultats en chaînes
        extractedData.nearbyPlaces = extractedData.nearbyPlaces.join('; ');
        extractedData.naturalEnvironment = extractedData.naturalEnvironment.join('; ');
        extractedData.skiLifts = extractedData.skiLifts.join('; ');
        extractedData.popularFacilities = extractedData.popularFacilities.join('; ');
        extractedData.additionalTexts = extractedData.additionalTexts.join('; ');

        return extractedData;
    } catch (error) {
        console.error('Error extracting details:', error);
        return {
            nearbyPlaces: 'Not found',
            naturalEnvironment: 'Not found',
            skiLifts: 'Not found',
            popularFacilities: 'Not found',
            additionalTexts: 'Not found',
            petsAllowed: false,
            description: 'Not found' // Valeur par défaut pour la description
        };
    }
};

// Fonction pour écrire les données dans un fichier CSV
const writeToCSV = async (data) => {
    const csvFilePath = 'output.csv';
    const csvWriter = createCsvWriter({
        path: csvFilePath,
        header: [
            { id: 'inputUrl', title: 'Input URL' },
            { id: 'nearbyPlaces', title: 'Nearby Places' },
            { id: 'naturalEnvironment', title: 'Natural Environment' },
            { id: 'skiLifts', title: 'Ski Lifts' },
            { id: 'popularFacilities', title: 'Popular Facilities' },
            { id: 'additionalTexts', title: 'Additional Texts' },
            { id: 'petsAllowed', title: 'Pets' },
            { id: 'description', title: 'Description' } // Ajout d'une colonne pour la description de l'hôtel
        ],
        append: true
    });

    const csvData = {
        inputUrl: data.inputUrl,
        nearbyPlaces: `[${data.nearbyPlaces}]`,
        naturalEnvironment: `[${data.naturalEnvironment}]`,
        skiLifts: `[${data.skiLifts}]`,
        popularFacilities: `[${data.popularFacilities}]`,
        additionalTexts: `[${data.additionalTexts}]`,
        petsAllowed: data.petsAllowed,
        description: data.description // Ajout de la description dans les données CSV
    };

    try {
        await csvWriter.writeRecords([csvData]);
    } catch (error) {
        console.error('Error writing to CSV:', error);
    }
};

// Fonction pour traiter une seule URL
const processURL = async (url) => {
    console.log(`Processing URL: ${url}`);
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'networkidle2' });
        const info = await extractDetailsFromPage(page);
        info.inputUrl = url;

        await writeToCSV(info);
        await browser.close();

    } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
    }
};

// Fonction pour lire les URLs à partir d'un fichier (url.txt)
const readURLsFromFile = (filePath) => {
    return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
};

// Fonction pour ajouter un délai
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour traiter les URLs par lots
const processURLsInBatches = async (urls, batchSize = 3, delayBetweenBatches = 2000) => {
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await Promise.all(batch.map(url => processURL(url)));
        await sleep(delayBetweenBatches);
    }
};

// Fonction principale
const main = async () => {
    const urls = readURLsFromFile('url.txt');
    await processURLsInBatches(urls, 5);
};

main().catch(console.error);
