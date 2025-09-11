// Utilitaires partagés pour le scraper d'arrondissements
const fs = require('fs');
const config = require('./config');

/**
 * Génère l'URL Booking.com pour un arrondissement donné
 * @param {number} arrondissement - Numéro de l'arrondissement (1-20)
 * @returns {object} Objet contenant l'URL générée
 */
function generateBookingUrl(arrondissement) {
  const params = {
    ss: `${arrondissement}e+arr.%2C+Paris%2C+Ile+de+France%2C+France`,
    dest_id: arrondissement.toString(),
    dest_type: 'district',
    ...config.URLS.DEFAULT_PARAMS
  };
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
    
  return { url: `${config.URLS.BASE_URL}?${queryString}` };
}

/**
 * Obtient la date et heure actuelles en heure de Paris
 * @returns {string} Date au format YYYY-MM-DD HH:mm:ss
 */
function getCurrentDateTime() {
  const now = new Date();
  // Convertir en heure de Paris (UTC+2)
  const parisTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  return parisTime.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Sauvegarde un résultat dans le fichier CSV
 * @param {number} arrondissement - Numéro de l'arrondissement
 * @param {number} propertiesCount - Nombre de propriétés trouvées
 */
function saveToCSV(arrondissement, propertiesCount) {
  const csvFile = config.OUTPUT.CSV_FILE;
  const timestamp = getCurrentDateTime();
  
  // Créer le dossier data s'il n'existe pas
  const dataDir = csvFile.split('/').slice(0, -1).join('/');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Vérifier si le fichier existe
  const fileExists = fs.existsSync(csvFile);
  
  // Ajouter l'en-tête si le fichier n'existe pas
  if (!fileExists) {
    fs.writeFileSync(csvFile, 'ObservationDate,Arrondissement,PropertiesCount\n');
    console.log('📝 CSV créé avec l\'arrondissement', arrondissement);
  } else {
    console.log('📝 Arrondissement', arrondissement, 'ajouté au CSV');
  }
  
  // Ajouter la ligne de données
  const csvLine = `${timestamp},${arrondissement},${propertiesCount}\n`;
  fs.appendFileSync(csvFile, csvLine);
}

/**
 * Sauvegarde tous les résultats dans le fichier JSON
 * @param {Array} results - Tableau des résultats
 */
function saveToJSON(results) {
  const jsonFile = config.OUTPUT.JSON_FILE;
  
  // Créer le dossier data s'il n'existe pas
  const dataDir = jsonFile.split('/').slice(0, -1).join('/');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
}

/**
 * Génère un délai aléatoire entre min et max
 * @param {number} min - Délai minimum en millisecondes
 * @param {number} max - Délai maximum en millisecondes
 * @returns {number} Délai aléatoire
 */
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Attend un délai aléatoire
 * @param {number} min - Délai minimum en millisecondes
 * @param {number} max - Délai maximum en millisecondes
 * @returns {Promise} Promise qui se résout après le délai
 */
function waitRandomDelay(min, max) {
  const delay = getRandomDelay(min, max);
  console.log(`⏳ Waiting ${delay}ms...`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Configure une page Puppeteer pour éviter la détection
 * @param {Object} page - Page Puppeteer
 * @returns {Promise} Promise qui se résout quand la configuration est terminée
 */
async function configurePage(page) {
  // Set user agent
  await page.setUserAgent(config.PUPPETEER.USER_AGENT);
  
  // Supprimer tous les cookies et le cache
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  // Supprimer les cookies via CDP
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await client.send('Network.clearBrowserCache');
}

/**
 * Vérifie si la page contient des signes de détection de bot
 * @param {string} content - Contenu HTML de la page
 * @returns {boolean} True si détection de bot détectée
 */
function detectBotDetection(content) {
  const contentLower = content.toLowerCase();
  return config.PATTERNS.BOT_DETECTION.some(pattern => 
    contentLower.includes(pattern)
  );
}

/**
 * Extrait le nombre de propriétés du contenu de la page
 * @param {string} content - Contenu HTML de la page
 * @returns {number} Nombre de propriétés trouvées
 */
function extractPropertiesCount(content) {
  // Cette fonction sera appelée dans le contexte du navigateur
  // via page.evaluate(), donc elle doit être définie dans le navigateur
  return 0; // Placeholder - la vraie logique est dans page.evaluate()
}

/**
 * Logique d'extraction des propriétés pour page.evaluate()
 * @returns {string} Code JavaScript à exécuter dans le navigateur
 */
function getExtractionCode() {
  return `
    (() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
      console.log('🔍 [browser context] h1s:', h1s);
      
      const patterns = [
        /(\\d+)\\s+(?:properties|établissements?|exact matches?)\\s+(?:found|trouvés)/i,
        /(\\d+)\\s+exact matches/i,
        /(\\d+)\\s+properties found/i,
        /(\\d+)\\s+établissements trouvés/i
      ];
      
      const match = h1s.map(title => {
        for (const pattern of patterns) {
          const match = title.match(pattern);
          if (match) return match[1];
        }
        return null;
      }).find(Boolean);
      
      return match ? parseInt(match) : 0;
    })()
  `;
}

module.exports = {
  generateBookingUrl,
  getCurrentDateTime,
  saveToCSV,
  saveToJSON,
  getRandomDelay,
  waitRandomDelay,
  configurePage,
  detectBotDetection,
  extractPropertiesCount,
  getExtractionCode
};

