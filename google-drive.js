const fs = require("fs");
const { google } = require("googleapis");

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "16o6pBVa0A6ozFDumES5sUtrIfPp8N0nN";

function getServiceAccountCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  return null;
}

function isDriveConfigured() {
  return Boolean(getServiceAccountCredentials());
}

function getDriveClient() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) return null;

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"]
  });

  return google.drive({ version: "v3", auth });
}

async function uploadMediaToDrive(filePath, fileName, mimeType) {
  const drive = getDriveClient();
  if (!drive) throw new Error("Google Drive credentials are not configured");

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [DRIVE_FOLDER_ID]
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath)
    },
    fields: "id,name,mimeType"
  });

  const fileId = uploaded.data.id;
  await drive.permissions.create({
    fileId,
    requestBody: { type: "anyone", role: "reader" }
  });

  return {
    id: fileId,
    name: uploaded.data.name,
    mimeType: uploaded.data.mimeType,
    mediaUrl: `https://drive.google.com/uc?export=${mimeType.startsWith("video/") ? "download" : "view"}&id=${fileId}`
  };
}

module.exports = { isDriveConfigured, uploadMediaToDrive };
