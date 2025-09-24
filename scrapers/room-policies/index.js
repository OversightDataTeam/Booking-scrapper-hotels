const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const { parse } = require('csv-parse/sync');
puppeteer.use(StealthPlugin());

// Configuration exécutable via variables d'environnement
// - BATCH_LIMIT: limite le nombre d'hôtels à traiter (0 = tous)
// - BATCH_SIZE: nombre d'hôtels traités en parallèle (défaut 4)
// - DATE_DAYS: nombre de jours à couvrir à partir d'aujourd'hui (défaut 180)
// - START_OFFSET: décalage en jours avant le premier checkin (défaut 0)
// - STAY_NIGHTS: nombre de nuits par séjour (défaut 1)
// - DATES_LIMIT: limite de dates à traiter (0 = toutes générées)
const MAX_HOTELS = parseInt(process.env.BATCH_LIMIT || '0', 10);
const PARALLEL_BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '4', 10);
const DATE_DAYS = parseInt(process.env.DATE_DAYS || '180', 10);
const START_OFFSET = parseInt(process.env.START_OFFSET || '0', 10);
const STAY_NIGHTS = parseInt(process.env.STAY_NIGHTS || '1', 10);
const DATES_LIMIT = parseInt(process.env.DATES_LIMIT || '0', 10);

function formatDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function generateDateRanges() {
  const today = new Date();
  const ranges = [];
  for (let i = 0; i < DATE_DAYS; i++) {
    const start = addDays(today, START_OFFSET + i);
    const end = addDays(start, STAY_NIGHTS);
    ranges.push({
      checkin: formatDateYYYYMMDD(start),
      checkout: formatDateYYYYMMDD(end),
    });
  }
  return DATES_LIMIT > 0 ? ranges.slice(0, DATES_LIMIT) : ranges;
}

async function handleCookieModal(page) {
  try {
    const cookieSelectors = [
      '[data-testid="accept-cookie-notification"]',
      '#onetrust-accept-btn-handler',
      'button[aria-label*="Accept" i]',
      'button[aria-label*="accepter" i]',
      'button:has-text("Accept")',
      'button:has-text("Accepter")'
    ];

    for (const selector of cookieSelectors) {
      const el = await page.$(selector);
      if (el) {
        await el.click({ delay: 50 });
        await delay(300);
        return true;
      }
    }
  } catch (_) {}
  return false;
}

async function waitForAnySelector(page, selectors, timeoutMs) {
  const start = Date.now();
  for (;;) {
    for (const selector of selectors) {
      const found = await page.$(selector);
      if (found) return selector;
    }
    if (Date.now() - start > timeoutMs) break;
    await delay(200);
  }
  return null;
}

function decomposeBookingUrl(url) {
  console.log('🔍 Décomposition de l\'URL:', url);
  
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    const decomposedUrl = {
      baseUrl: urlObj.origin + urlObj.pathname,
      params: {
        aid: params.get('aid'),
        label: params.get('label'),
        sid: params.get('sid'),
        checkin: params.get('checkin'),
        checkout: params.get('checkout'),
        dest_id: params.get('dest_id'),
        dest_type: params.get('dest_type'),
        group_adults: params.get('group_adults'),
        group_children: params.get('group_children'),
        no_rooms: params.get('no_rooms'),
        room1: params.get('room1'),
        sb_price_type: params.get('sb_price_type'),
        sr_order: params.get('sr_order'),
        type: params.get('type')
      }
    };

    console.log('📊 URL décomposée:', JSON.stringify(decomposedUrl, null, 2));
    return decomposedUrl;
  } catch (error) {
    console.error('❌ Erreur lors de la décomposition de l\'URL:', error);
    throw error;
  }
}

function classifyCancellationPolicy(text) {
  if (!text) return "Not available";
  
  const textLower = text.toLowerCase();
  
  if (textLower.includes("non remboursable") || textLower.includes("non-refundable")) {
    return "Non-Flexible";
  }
  
  if (textLower.includes("annulation gratuite") || 
      textLower.includes("remboursable") || 
      textLower.includes("free cancellation")) {
    return "Flexible";
  }
  
  return "Not available";
}

async function scrapeHotelRoom(url, roomTypes) {
  console.log('🚀 Démarrage du scraping de la chambre...');
  let browser;
  let page;

  try {
    // Décomposition de l'URL
    const decomposedUrl = decomposeBookingUrl(url);
    console.log(`📝 URL cible: ${decomposedUrl.baseUrl}`);

    browser = await puppeteer.launch({
      headless: "new", // Nouveau mode headless
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-plugins',
        '--disable-extensions',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ]
    });

    console.log('🌐 Création de la nouvelle page...');
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    // Configuration du user agent
    console.log('👤 Configuration du user agent...');
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Nettoyage des cookies et du cache
    console.log('🧹 Nettoyage des cookies et du cache...');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    });

    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');

    // Construction de l'URL avec les paramètres
    const fullUrl = `${decomposedUrl.baseUrl}?${new URLSearchParams({ ...decomposedUrl.params, lang: 'fr', selected_currency: 'EUR' }).toString()}`;
    console.log('🌐 Navigation vers:', fullUrl);
    
    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: 90000
    });

    // Gérer la modale cookies si présente
    await handleCookieModal(page);

    // Cliquer sur "Voir les disponibilités" si présent pour charger les chambres
    try {
      const availabilitySelectors = [
        'a[data-testid="availability-cta"]',
        'button[data-testid="availability-cta"]',
        'a[aria-label*="availability" i]',
        'button[aria-label*="availability" i]',
        'a:has-text("See availability")',
        'button:has-text("See availability")',
        'a:has-text("Voir les disponibilités")',
        'button:has-text("Voir les disponibilités")'
      ];
      for (const sel of availabilitySelectors) {
        const el = await page.$(sel);
        if (el) {
          await el.click({ delay: 50 });
          await delay(1200);
          await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
          break;
        }
      }
    } catch (_) {}

    // Second niveau: expansion de la section chambres si nécessaire
    try {
      const expandSelectors = [
        'a:has-text("Choisir une chambre")',
        'button:has-text("Choisir une chambre")',
        'a:has-text("Select your room")',
        'button:has-text("Select your room")',
        '[data-testid="show-rooms"]',
        '[data-testid="availability-rooms-cta"]'
      ];
      for (const sel of expandSelectors) {
        const el = await page.$(sel);
        if (el) {
          await el.click({ delay: 50 });
          await delay(1000);
          await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
          break;
        }
      }
    } catch (_) {}

    // Scroll pour forcer le lazy-load éventuel
    try {
      await page.evaluate(async () => {
        await new Promise(resolve => {
          let total = 0;
          const distance = 600;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            total += distance;
            if (total > 4000) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
        });
      });
      await delay(500);
    } catch (_) {}

    console.log('⏳ Attente du chargement des éléments...');
    const containerSelector = await waitForAnySelector(page, [
      '.hprt-block',
      '.js-hprt-table',
      '#hprt-form',
      // Nouveaux conteneurs potentiels (mise à jour Booking)
      '[data-component="hotel/new-rooms-table"]',
      '[data-testid="rooms-table"]',
      '[data-section="roomlist"]',
      '[data-testid="property-availability-table"]',
      '#maxotelRoomArea',
      'section.roomstable',
      '[data-testid="rt-name-link"]'
    ], 30000);
    if (!containerSelector) {
      console.warn('⚠️ Structure de page inattendue: sélecteurs de chambres non trouvés');
      return {
        urlInfo: decomposedUrl,
        roomInfo: {
          roomName: 'nothing',
          cancellationText: 'Not available',
          price: '',
          status: 'structure_mismatch',
          checkin: decomposedUrl.params.checkin,
          checkout: decomposedUrl.params.checkout,
          baseUrl: decomposedUrl.baseUrl
        }
      };
    }

    // Attendre que les conditions d'annulation soient chargées (si présent)
    await page.waitForSelector('.hprt-table-cell-conditions', { timeout: 15000 }).catch(() => {});
    await delay(1000);

    console.log('🔍 Extraction des informations...');
    const roomInfo = await page.evaluate((roomTypes) => {
      const normalize = (s) => (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Étendre les cibles avec synonymes courants
      const synonyms = {
        'double': ['double', 'double standard', 'standard double', 'double or twin', 'double/twin'],
        'standard': ['standard', 'classique', 'classic'],
        'classic': ['classic', 'classique', 'standard']
      };
      const expandWithSynonyms = (phrase) => {
        const base = normalize(phrase);
        const words = base.split(' ');
        const expanded = new Set([base]);
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          if (synonyms[w]) {
            for (const syn of synonyms[w]) {
              const variant = words.map((x, idx) => (idx === i ? syn : x)).join(' ');
              expanded.add(variant);
            }
          }
        }
        return Array.from(expanded);
      };

      const normalizedTargets = roomTypes.flatMap(t => expandWithSynonyms(t));

      const toTokenSet = (s) => new Set(normalize(s).split(' ').filter(w => w.length >= 3));
      const jaccard = (a, b) => {
        const setA = toTokenSet(a);
        const setB = toTokenSet(b);
        if (setA.size === 0 || setB.size === 0) return 0;
        let inter = 0;
        for (const t of setA) if (setB.has(t)) inter++;
        const union = setA.size + setB.size - inter;
        return inter / union;
      };
      // Vérifier si la page/ligne indique indisponible et récupérer malgré tout un nom de chambre si présent
      const unavailableElement = document.querySelector('.b99b6ef58f.b6e8474a49');
      if (unavailableElement && /not available|indisponible/i.test(unavailableElement.textContent)) {
        const fallbackName =
          document.querySelector('a[data-testid="rt-name-link"] .b08850ce41')?.textContent.trim() ||
          document.querySelector('.hprt-roomtype-name')?.textContent.trim() ||
          '';
        return {
          roomName: fallbackName,
          cancellationText: 'Not available',
          price: '',
          status: 'unavailable'
        };
      }

      // Recherche spécifique des chambres selon les types configurés
      let roomBlocks = document.querySelectorAll('.hprt-block');

      // Si aucun .hprt-block, tenter les nouvelles cartes/champs
      if (!roomBlocks || roomBlocks.length === 0) {
        const modernBlocks = document.querySelectorAll('[data-testid="room-info"]')
          || document.querySelectorAll('[data-testid^="room-"]')
          || document.querySelectorAll('[data-component="hotel/new-rooms-table"] [role="row"]')
          || document.querySelectorAll('#maxotelRoomArea section.roomstable .f6e3a11b0d');
        roomBlocks = modernBlocks;
      }
      let targetRoomFound = null;
      
      for (const roomBlock of roomBlocks) {
        let roomNameElement = roomBlock.querySelector('.hprt-roomtype-name');
        if (!roomNameElement) {
          roomNameElement = roomBlock.querySelector('[data-testid="room-name"]')
            || roomBlock.querySelector('[data-testid^="room-name-"]')
            || roomBlock.querySelector('a[data-testid="rt-name-link"] .b08850ce41')
            || roomBlock.querySelector('h3, h4');
        }
        if (roomNameElement) {
          const roomName = roomNameElement.textContent.trim();
          const normRoom = normalize(roomName);
          
          // Correspondance assouplie: inclusion bi-directionnelle + Jaccard tokens
          const foundRoomType = normalizedTargets.find(t => {
            if (!t) return false;
            if (normRoom.includes(t) || t.includes(normRoom)) return true;
            const overlap = jaccard(normRoom, t);
            if (overlap >= 0.5) return true;
            // Règle: au moins 2 tokens communs significatifs
            const setR = new Set(normRoom.split(' ').filter(w => w.length >= 3));
            const setT = new Set(t.split(' ').filter(w => w.length >= 3));
            let inter = 0;
            for (const w of setR) if (setT.has(w)) inter++;
            return inter >= 2;
          });
          
          if (foundRoomType) {
            targetRoomFound = roomBlock;
            break;
          }
        }
      }
      
      // Si aucune chambre du type recherché n'est trouvée, retourner "nothing"
      if (!targetRoomFound) {
        return {
          roomName: 'nothing',
          cancellationText: 'Not available',
          price: '',
          status: 'no_target_room_found'
        };
      }

      // Extraction des informations de la chambre trouvée
      const roomName = targetRoomFound.querySelector('.hprt-roomtype-name')?.textContent.trim() || '';
      
      // Vérification des conditions d'annulation pour cette chambre spécifique
      let conditionCells = targetRoomFound.querySelectorAll('.hprt-table-cell.hprt-table-cell-conditions');
      if (!conditionCells || conditionCells.length === 0) {
        conditionCells = targetRoomFound.querySelectorAll('[data-testid*="cancellation" i], [data-testid*="policy" i]');
      }
      let cancellationText = '';
      conditionCells.forEach(cell => {
        const text = cell.innerText.toLowerCase();
        if (text.includes('free cancellation') || text.includes('no prepayment needed') || text.includes('annulation gratuite') || text.includes('aucun prépaiement requis')) {
          cancellationText = 'Flexible';
        } else if (text.includes('non-refundable') || text.includes('non remboursable')) {
          cancellationText = 'Non-Flexible';
        }
      });
      if (!cancellationText) {
        cancellationText = 'Not available';
      }
      console.log('🔎 Politique d\'annulation trouvée:', cancellationText);

      // Extraction du prix pour cette chambre spécifique
      // Chercher le prix dans la ligne de la chambre trouvée
      let priceElement = targetRoomFound.closest('tr')?.querySelector('.bui-price-display__value');
      if (!priceElement) {
        priceElement = targetRoomFound.querySelector('[data-testid="price-and-discounted-price"]')
          || targetRoomFound.querySelector('[data-testid^="price-amount"]')
          || targetRoomFound.querySelector('[aria-label*="price" i]');
      }
      const priceText = priceElement ? priceElement.textContent.trim() : '';
      const price = priceText.replace(/[^\d]/g, '');

      return {
        roomName,
        cancellationText,
        price,
        status: 'available'
      };
    }, roomTypes);

    // Classification des conditions d'annulation
    const cancellationPolicy = classifyCancellationPolicy(roomInfo.cancellationText);
    console.log('📋 Politique d\'annulation classifiée:', cancellationPolicy);

    const finalRoomInfo = {
      ...roomInfo,
      checkin: decomposedUrl.params.checkin,
      checkout: decomposedUrl.params.checkout,
      baseUrl: decomposedUrl.baseUrl
    };

    console.log('📊 Informations extraites:', JSON.stringify(finalRoomInfo, null, 2));

    return {
      urlInfo: decomposedUrl,
      roomInfo: finalRoomInfo
    };

  } catch (error) {
    console.error('❌ Erreur lors du scraping:', error);
    if (page) {
      try {
        const screenshotPath = path.join(__dirname, 'logs', 'error-screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Capture d\'écran sauvegardée dans ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('❌ Erreur lors de la capture d\'écran:', screenshotError);
      }
    }
    return {
      urlInfo: null,
      roomInfo: {
        roomName: 'nothing',
        cancellationText: 'Not available',
        price: '',
        status: 'runtime_error'
      }
    };
  } finally {
    if (browser) {
      console.log('👋 Fermeture du navigateur...');
      await browser.close();
    }
  }
}

// Fonction pour ajouter les paramètres à l'URL
function addParamsToUrl(baseUrl, checkin, checkout) {
  const params = {
    aid: '304142',
    label: 'gen173nr-1FCAsoTUIIbWFqZXN0aWNICVgEaE2IAQGYAQ24AQfIAQzYAQHoAQH4AQOIAgGoAgO4AuXtxMIGwAIB0gIkYjg2NTJiMTMtNmRmYy00MjQ3LTg2ZDktOTAxNTk1NzU4MDQy2AIF4AIB',
    sid: '634f3085b48729bd279b8eaca5de7152',
    checkin: checkin,
    checkout: checkout,
    dest_id: '-1456928',
    dest_type: 'city',
    group_adults: '2',
    group_children: '0',
    no_rooms: '1',
    room1: 'A,A',
    sb_price_type: 'total',
    sr_order: 'popularity',
    type: 'total'
  };

  // Supprimer les paramètres existants de l'URL de base
  const baseUrlWithoutParams = baseUrl.split('?')[0];
  return `${baseUrlWithoutParams}?${new URLSearchParams(params).toString()}`;
}

// Lecture du CSV pour générer hotelConfigs dynamiquement
const csvPath = path.join(__dirname, 'inputs', 'hotel_room_types.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvData, {
  delimiter: ';',
  columns: false,
  skip_empty_lines: true,
  from_line: 2  // Ignore la première ligne (en-tête)
});

const hotelConfigs = records.map(row => ({
  url: row[0],
  roomTypes: row.slice(1).filter(Boolean)
}));

// Écriture CSV des résultats dans results/room_policies_results.csv (délimiteur ;)
const resultsDir = path.join(__dirname, 'results');
const resultsCsvPath = path.join(resultsDir, 'room_policies_results.csv');

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeCsvValue(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/;/g, ',')
    .trim();
}

function writeResultsToCsv(rows) {
  ensureDirectoryExists(resultsDir);
  const headers = [
    'baseUrl',
    'checkin',
    'checkout',
    'roomName',
    'cancellation',
    'price',
    'status',
    'fullUrl',
    'error'
  ];

  const needsHeader = !fs.existsSync(resultsCsvPath);
  const lines = [];
  if (needsHeader) {
    lines.push(headers.join(';'));
  }

  for (const row of rows) {
    const values = [
      sanitizeCsvValue(row.baseUrl),
      sanitizeCsvValue(row.checkin),
      sanitizeCsvValue(row.checkout),
      sanitizeCsvValue(row.roomName),
      sanitizeCsvValue(row.cancellation),
      sanitizeCsvValue(row.price),
      sanitizeCsvValue(row.status),
      sanitizeCsvValue(row.fullUrl),
      sanitizeCsvValue(row.error)
    ];
    lines.push(values.join(';'));
  }

  fs.appendFileSync(resultsCsvPath, lines.join('\n') + '\n', 'utf8');
  console.log(`📄 Résultats écrits dans ${resultsCsvPath}`);
}

// Fonction principale pour traiter plusieurs hôtels en parallèle
async function processHotels(hotelConfigs) {
  console.log('🎬 Démarrage du traitement des hôtels...');
  
  const limitedHotelConfigs = MAX_HOTELS > 0 ? hotelConfigs.slice(0, MAX_HOTELS) : hotelConfigs;
  const dateRanges = generateDateRanges();

  // Créer la liste de tâches (produit cartésien dates x hôtels)
  const tasks = [];
  for (const date of dateRanges) {
    for (const hotel of limitedHotelConfigs) {
      tasks.push({ hotelConfig: hotel, checkin: date.checkin, checkout: date.checkout });
    }
  }

  console.log(`📋 Tâches à traiter: ${tasks.length} (hôtels=${limitedHotelConfigs.length} × dates=${dateRanges.length})`);
  console.log(`⚡ Traitement en parallèle par groupes de ${PARALLEL_BATCH_SIZE}`);

  const batchSize = PARALLEL_BATCH_SIZE;
  const results = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tasks.length / batchSize);
    console.log(`\n🔄 Lot ${batchNumber}/${totalBatches} (tâches ${i + 1}-${Math.min(i + batchSize, tasks.length)})`);
    
    const batchPromises = batch.map(async (task, batchIndex) => {
      const globalIndex = i + batchIndex;
      const { hotelConfig, checkin, checkout } = task;
      try {
        console.log(`🏨 [${globalIndex + 1}/${tasks.length}] ${hotelConfig.url} | ${checkin} → ${checkout}`);
        console.log(`🔍 Types: ${hotelConfig.roomTypes.join(', ')}`);
        
        const fullUrl = addParamsToUrl(hotelConfig.url, checkin, checkout);
        const result = await scrapeHotelRoom(fullUrl, hotelConfig.roomTypes);
        
        const resultWithConfig = {
          ...result,
          hotelConfig,
          fullUrl
        };

        // Écrire les données immédiatement dans le CSV
        const r = resultWithConfig;
        writeResultsToCsv([
          {
            baseUrl: r.urlInfo?.baseUrl || r.hotelConfig.url,
            checkin: r.roomInfo?.checkin || checkin,
            checkout: r.roomInfo?.checkout || checkout,
            roomName: r.roomInfo?.roomName || '',
            cancellation: r.roomInfo?.cancellationText || '',
            price: r.roomInfo?.price || '',
            status: r.roomInfo?.status || 'unknown',
            fullUrl: r.fullUrl,
            error: ''
          }
        ]);
        
        return resultWithConfig;
      } catch (error) {
        console.error(`❌ [${globalIndex + 1}] Erreur:`, error);
        const errorResult = {
          hotelConfig,
          fullUrl: addParamsToUrl(hotelConfig.url, checkin, checkout),
          error: error.message
        };
        
        // Écrire l'erreur aussi dans le CSV
        writeResultsToCsv([
          {
            baseUrl: errorResult.hotelConfig.url,
            checkin,
            checkout,
            roomName: 'nothing',
            cancellation: 'Not available',
            price: '',
            status: 'error',
            fullUrl: errorResult.fullUrl,
            error: errorResult.error
          }
        ]);
        
        return errorResult;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    if (i + batchSize < tasks.length) {
      console.log(`⏳ Pause 2s avant le prochain lot...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n✅ Traitement terminé pour ${results.length} tâches`);
  return results;
}

// Exécution du traitement
console.log('🎬 Démarrage du script...');
processHotels(hotelConfigs)
  .then(() => {
    console.log('✅ Traitement terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
