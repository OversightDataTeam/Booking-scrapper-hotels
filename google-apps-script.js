// Google Apps Script pour recevoir les données du webhook et les écrire dans Google Sheets

function doPost(e) {
  try {
    // Récupérer les données JSON envoyées
    const jsonData = JSON.parse(e.postData.contents);
    const timestamp = jsonData.timestamp;
    const data = jsonData.data;
    
    // ID de ton Google Sheets (à remplacer)
    const spreadsheetId = 'YOUR_SPREADSHEET_ID';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();
    
    // En-têtes des colonnes
    const headers = [
      'Timestamp',
      'Hotel URL',
      'Full URL Used',
      'Room Name',
      'Price',
      'Cancellation Policy',
      'Status',
      'Check-in',
      'Check-out',
      'Room Types Searched',
      'Error'
    ];
    
    // Vérifier si les en-têtes existent déjà
    const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (existingHeaders[0] !== headers[0]) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Préparer les données à écrire
    const rowsToAdd = [];
    
    data.forEach(item => {
      const row = [
        timestamp, // Timestamp
        item.hotelConfig?.url || item.urlInfo?.baseUrl || '', // Hotel URL
        item.fullUrl || '', // Full URL Used
        item.roomInfo?.roomName || '', // Room Name
        item.roomInfo?.price || '', // Price
        item.roomInfo?.cancellationText || '', // Cancellation Policy
        item.roomInfo?.status || '', // Status
        item.roomInfo?.checkin || '', // Check-in
        item.roomInfo?.checkout || '', // Check-out
        item.hotelConfig?.roomTypes?.join(', ') || '', // Room Types Searched
        item.error || '' // Error
      ];
      rowsToAdd.push(row);
    });
    
    // Écrire les données dans le sheet
    if (rowsToAdd.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsToAdd.length, headers.length).setValues(rowsToAdd);
    }
    
    // Retourner une réponse de succès
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, rowsAdded: rowsToAdd.length }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erreur dans le script Google Apps Script:', error);
    
    // Retourner une réponse d'erreur
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Fonction de test pour vérifier que le script fonctionne
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'OK', 
      message: 'Webhook Google Apps Script is running' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
} 