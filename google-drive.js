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
  return Boolean(getServiceAccountCredentials() || process.env.GOOGLE_API_KEY);
}

function getDriveClient() {
  const credentials = getServiceAccountCredentials();
  if (credentials) {
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"]
    });
    return google.drive({ version: "v3", auth });
  }

  if (process.env.GOOGLE_API_KEY) {
    return google.drive({ version: "v3", auth: process.env.GOOGLE_API_KEY });
  }

  return null;
}

/**
 * Fetch all media files directly from the Google Drive Folder
 */
async function listDriveMedia() {
  const apiKey = process.env.GOOGLE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DRIVE_FOLDER_ID;

  if (apiKey) {
    // Direct REST API fetch with API Key
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,createdTime)&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return (data.files || []).map(file => formatDriveFile(file));
  }

  const drive = getDriveClient();
  if (!drive) return [];

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, thumbnailLink, webContentLink, createdTime)"
  });

  return (response.data.files || []).map(file => formatDriveFile(file));
}

function formatDriveFile(file) {
  const isVideo = (file.mimeType || "").startsWith("video/");
  return {
    id: `gdrive_${file.id}`,
    driveId: file.id,
    title: file.name ? file.name.replace(/\.[^/.]+$/, "") : "Tournament Highlight",
    type: isVideo ? "VIDEO" : "IMAGE",
    mimeType: file.mimeType,
    // Google Drive direct embed / thumbnail URL
    url: isVideo
      ? `https://drive.google.com/uc?export=download&id=${file.id}`
      : `https://lh3.googleusercontent.com/u/0/d/${file.id}=w1600`,
    thumbnail: file.thumbnailLink || `https://lh3.googleusercontent.com/u/0/d/${file.id}=w800`,
    createdAt: file.createdTime || new Date().toISOString(),
    isDrive: true
  };
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

  return formatDriveFile({
    id: fileId,
    name: uploaded.data.name,
    mimeType: uploaded.data.mimeType
  });
}

module.exports = { isDriveConfigured, listDriveMedia, uploadMediaToDrive };
