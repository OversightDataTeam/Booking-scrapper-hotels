// Configuration
const DAILY_SHEET = 'RawData';
const DAYS180_SHEET = '180DaysData';
const SPREADSHEET_ID = '1PL7GjOp99vJZBQFIzV0GcN2kQn1wxjj7U2c7z8f22P4';

// Fonction pour vérifier si une donnée existe déjà
function dataExists(sheet, arrondissement, date) {
  const data = sheet.getDataRange().getValues();
  // Pour les données quotidiennes, vérifier l'arrondissement et la date d'observation
  if (sheet.getName() === DAILY_SHEET) {
    return data.some(row => row[1] === date && row[2] === arrondissement.toString());
  }
  // Pour les données 180 jours, vérifier l'arrondissement et la date de check-in
  else {
    return data.some(row => row[0] === arrondissement.toString() && row[2] === date);
  }
}

// Fonction principale qui sera appelée par le webhook
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Déterminer le type de données et la feuille correspondante
    let sheetName, rowData, date;
    
    if (data.properties_count !== undefined) {
      // Format pour scraper.js (données quotidiennes)
      sheetName = DAILY_SHEET;
      const now = new Date();
      date = now.toISOString().slice(0, 19).replace('T', ' ');
      rowData = [
        date,
        data.arrondissement.toString(),
        data.properties_count
      ];
    } else {
      // Format pour scraper2.js (données sur 180 jours)
      sheetName = DAYS180_SHEET;
      date = data.checkinDate;
      rowData = [
        data.arrondissement.toString(),
        data.propertiesCount,
        data.checkinDate,
        data.checkoutDate,
        data.scrapingDate
      ];
    }
    
    // Obtenir ou créer la feuille appropriée
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Ajouter les en-têtes appropriés
      if (sheetName === DAILY_SHEET) {
        sheet.appendRow(['ObservationDate', 'Arrondissement', 'PropertiesCount']);
      } else {
        sheet.appendRow(['arrondissement', 'propertiesCount', 'check-in date', 'check-out date', 'scraping date']);
      }
      // Formater les en-têtes
      const numColumns = sheetName === DAILY_SHEET ? 3 : 5;
      sheet.getRange(1, 1, 1, numColumns)
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      sheet.autoResizeColumns(1, numColumns);
    }
    
    // Vérifier si la donnée existe déjà
    if (dataExists(sheet, data.arrondissement, date)) {
      return ContentService.createTextOutput(JSON.stringify({
        'status': 'skipped',
        'message': 'Data already exists for this arrondissement and date'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Ajouter les données
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

// Fonction pour tester le webhook avec les données quotidiennes
function testDailyWebhook() {
  const testData = {
    arrondissement: 1,
    properties_count: 123
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(e);
  console.log('Test response:', response.getContent());
}

// Fonction pour tester le webhook avec les données sur 180 jours
function test180DaysWebhook() {
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