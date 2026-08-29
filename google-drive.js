/**
 * google-drive.js
 * Lists photos and videos from a public Google Drive folder using API key auth.
 * Photos are served via direct lh3.googleusercontent.com URLs.
 * Videos are proxied through /api/drive/stream/:fileId to support Range requests.
 */

const https = require("https");

const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || "AIzaSyA85lx66T1E4QqDkVyj759HF2IM5p1JQWE";
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "16o6pBVa0A6ozFDumES5sUtrIfPp8N0nN";

function isDriveConfigured() {
  return !!(DRIVE_API_KEY && DRIVE_FOLDER_ID);
}

/**
 * Fetches the list of all media files (images + videos) from the Drive folder.
 * Returns an array of normalized media objects compatible with the /api/media response format.
 */
async function listDriveMedia() {
  if (!isDriveConfigured()) return [];

  const mimeFilter = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
  ].map(m => `mimeType='${m}'`).join(" or ");

  const query = encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and (${mimeFilter}) and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,createdTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200&key=${DRIVE_API_KEY}`;

  const data = await fetchJson(url);
  const files = data.files || [];

  return files.map(file => {
    const isVideo = file.mimeType.startsWith("video/");
    return {
      id: `drive_${file.id}`,
      driveFileId: file.id,
      type: isVideo ? "VIDEO" : "IMAGE",
      title: file.name.replace(/\.[^/.]+$/, ""), // strip extension from title
      createdAt: file.createdTime,
      // Photos: direct high-res URL; Videos: proxied through server
      url: isVideo
        ? `/api/drive/stream/${file.id}`
        : `https://lh3.googleusercontent.com/u/0/d/${file.id}=w1600`,
    };
  });
}

/**
 * Simple promise-based HTTPS GET that returns parsed JSON.
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", chunk => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error("Failed to parse Drive API response: " + body.slice(0, 200)));
        }
      });
    }).on("error", reject);
  });
}

module.exports = { isDriveConfigured, listDriveMedia };
