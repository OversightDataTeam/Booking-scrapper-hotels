// Configuration
const SHEET_NAME = '180DaysData'; // Nom de la feuille pour les données sur 180 jours
const SPREADSHEET_ID = '1PL7GjOp99vJZBQFIzV0GcN2kQn1wxjj7U2c7z8f22P4';

// Fonction principale qui sera appelée par le webhook
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // Si la feuille n'existe pas, on la crée
      const newSheet = ss.insertSheet(SHEET_NAME);
      // Ajouter les en-têtes
      newSheet.appendRow(['arrondissement', 'propertiesCount', 'check-in date', 'check-out date', 'scraping date']);
      return doPost(e);
    }
    
    // Prepare the row data with proper types
    const rowData = [
      data.arrondissement.toString(),  // arrondissement
      data.propertiesCount,            // propertiesCount
      data.checkinDate,               // check-in date
      data.checkoutDate,              // check-out date
      data.scrapingDate               // scraping date
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'message': 'Data received and stored successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fonction pour valider les données reçues
function validateData(data) {
  return (
    data &&
    typeof data.arrondissement === 'number' &&
    typeof data.propertiesCount === 'number' &&
    data.checkinDate &&
    data.checkoutDate &&
    data.scrapingDate
  );
}

// Fonction pour ajouter les données à la feuille
function appendToSheet(data) {
  try {
    console.log('📊 Attempting to append data to sheet');
    
    // Obtenir la feuille de calcul
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('📑 Opened spreadsheet');
    
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    console.log('Sheet exists:', !!sheet);
    
    // Si la feuille n'existe pas, la créer
    if (!sheet) {
      console.log('Creating new sheet...');
      createSheet();
      sheet = spreadsheet.getSheetByName(SHEET_NAME);
    }
    
    // Préparer les données à ajouter dans le bon ordre
    const rowData = [
      data.arrondissement,          // arrondissement
      data.propertiesCount,         // propertiesCount
      data.checkinDate,            // check-in date
      data.checkoutDate,           // check-out date
      data.scrapingDate            // scraping date
    ];
    
    // Ajouter les données
    sheet.appendRow(rowData);
    
    // Logger l'ajout
    console.log(`✅ Data added for arrondissement ${data.arrondissement}`);
  } catch (error) {
    console.error('❌ Error in appendToSheet:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Fonction pour créer la feuille si elle n'existe pas
function createSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.insertSheet(SHEET_NAME);
  
  // Ajouter les en-têtes dans le bon ordre
  sheet.appendRow([
    'arrondissement',
    'propertiesCount',
    'check-in date',
    'check-out date',
    'scraping date'
  ]);
  
  // Formater les en-têtes
  sheet.getRange(1, 1, 1, 5)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');
  
  // Ajuster la largeur des colonnes
  sheet.autoResizeColumns(1, 5);
  
  console.log(`Feuille ${SHEET_NAME} créée avec succès`);
}

// Fonction pour créer une réponse HTTP
function createResponse(statusCode, message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: statusCode,
    message: message
  }))
  .setMimeType(ContentService.MimeType.JSON);
}

// Fonction pour tester le script
function testWebhook() {
  const testData = {
    arrondissement: 4,
    propertiesCount: 92,
    checkinDate: "23/11/2025",
    checkoutDate: "24/11/2025",
    scrapingDate: "27-05-2025 14:57"
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(e);
  console.log('Test response:', response.getContent());
} 