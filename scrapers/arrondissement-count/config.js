// Configuration partagée pour le scraper d'arrondissements
// Ce fichier contient toutes les constantes et paramètres

module.exports = {
  // Configuration BigQuery
  BIGQUERY: {
    PROJECT_ID: 'oversight-datalake',
    DATASET_ID: 'MarketData',
    TABLE_ID: 'ArrondissementSummary',
    SCHEMA: {
      fields: [
        {name: 'ObservationDate', type: 'DATETIME', mode: 'NULLABLE'},
        {name: 'Arrondissement', type: 'STRING', mode: 'NULLABLE'},
        {name: 'PropertiesCount', type: 'INTEGER', mode: 'NULLABLE'}
      ]
    }
  },

  // Configuration du scraping
  SCRAPING: {
    MIN_ARRONDISSEMENT: 1,
    MAX_ARRONDISSEMENT: 20,
    CONCURRENT_LIMIT: 4, // Nombre de processus parallèles
    RETRY_ATTEMPTS: 3,
    NAVIGATION_TIMEOUT: 60000, // 60 secondes
    PAGE_LOAD_DELAY: 5000, // 5 secondes
    MIN_DELAY_BETWEEN_REQUESTS: 3000, // 3 secondes
    MAX_DELAY_BETWEEN_REQUESTS: 7000, // 7 secondes
    MIN_RETRY_DELAY: 5000, // 5 secondes
    MAX_RETRY_DELAY: 10000 // 10 secondes
  },

  // Configuration des URLs
  URLS: {
    BASE_URL: 'https://www.booking.com/searchresults.en-gb.html',
    DEFAULT_PARAMS: {
      group_adults: '2',
      no_rooms: '1',
      group_children: '0',
      nflt: 'ht_id%3D204' // Hotels only
    }
  },

  // Configuration des fichiers de sortie
  OUTPUT: {
    CSV_FILE: '../../../data/arrondissement-results.csv',
    JSON_FILE: '../../../data/arrondissement-results.json',
    CREDENTIALS_FILE: '../../../config/bigquery-credentials.json'
  },

  // Configuration Puppeteer
  PUPPETEER: {
    HEADLESS: "new",
    VIEWPORT: null,
    ARGS: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--incognito'
    ],
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  },

  // Patterns de détection des propriétés
  PATTERNS: {
    PROPERTY_COUNT: [
      /(\d+)\s+(?:properties|établissements?|exact matches?)\s+(?:found|trouvés)/i,
      /(\d+)\s+exact matches/i,
      /(\d+)\s+properties found/i,
      /(\d+)\s+établissements trouvés/i
    ],
    BOT_DETECTION: ['robot', 'captcha', 'access denied']
  }
};
