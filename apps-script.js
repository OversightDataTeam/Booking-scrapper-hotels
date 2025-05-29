// Configuration
const SHEET_NAME = 'Sheet1'; // Nom de la feuille par défaut
const SPREADSHEET_ID = '1PL7GjOp99vJZBQFIzV0GcN2kQn1wxjj7U2c7z8f22P4';

// Fonction principale qui sera appelée par le webhook
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('RawData');
    
    if (!sheet) {
      // Si la feuille n'existe pas, on la crée
      const newSheet = ss.insertSheet('RawData');
      // Ajouter les en-têtes
      newSheet.appendRow(['ObservationDate', 'Arrondissement', 'PropertiesCount']);
      return doPost(e);
    }
    
    // Format the date as ISO DATETIME (YYYY-MM-DDTHH:mm:ss)
    const now = new Date();
    const observationDate = now.toISOString().slice(0, 19).replace('T', ' '); // Format: "2024-03-29 14:30:00"
    
    // Prepare the row data with proper types
    const rowData = [
      observationDate,  // DATETIME in ISO format
      data.arrondissement.toString(),  // Text
      data.properties_count  // Number
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
    typeof data.properties_count === 'number' &&
    data.date
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
      data.date,                    // ObservationDate
      data.arrondissement,          // Arrondissement
      data.properties_count         // PropertiesCount
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
    'ObservationDate',
    'Arrondissement',
    'PropertiesCount'
  ]);
  
  // Formater les en-têtes
  sheet.getRange(1, 1, 1, 3)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');
  
  // Ajuster la largeur des colonnes
  sheet.autoResizeColumns(1, 3);
  
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
    arrondissement: 1,
    properties_count: 123,
    date: new Date().toISOString().split('T')[0]
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(e);
  console.log('Test response:', response.getContent());
} 