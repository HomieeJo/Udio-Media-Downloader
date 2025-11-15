// ------------------------------
// Media URL Cache (per tab)
// ------------------------------
const mediaCache = {};
const MAX_MEDIA = 20;

function addMedia(tabId, url) {
  if (!mediaCache[tabId]) mediaCache[tabId] = [];

  const list = mediaCache[tabId];

  if (!list.includes(url)) {
    list.unshift(url);
    if (list.length > MAX_MEDIA) list.pop();
  }
}

// ------------------------------
// Helpers
// ------------------------------

function cleanUrl(url) {
  try {
    return decodeURIComponent(url.split("?")[0].split("#")[0]);
  } catch(e) {
    return url.split("?")[0].split("#")[0];
  }
}

function isMediaByExtension(url) {
  const base = cleanUrl(url);
  return /\.(mp4|mp3|wav)$/i.test(base);
}

function isMediaByMime(ct) {
  if (!ct) return false;
  ct = ct.toLowerCase();

  return (
    ct.includes("audio/") ||
    ct.includes("video/") ||
    ct.includes("application/octet-stream")
  );
}

// ------------------------------
// Intercept headers to detect media
// ------------------------------

browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    const ctHeader = details.responseHeaders.find(
      (h) => h.name.toLowerCase() === "content-type"
    );
    const ct = ctHeader ? ctHeader.value : "";

    if (isMediaByMime(ct) || isMediaByExtension(details.url)) {
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]) {
          addMedia(tabs[0].id, details.url);
        }
      });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ------------------------------
// Handle requests from popup
// ------------------------------

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_MEDIA_LIST") {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tabId = tabs[0]?.id;
      sendResponse({ urls: mediaCache[tabId] || [] });
    });
    return true;
  }

  if (message.type === "DOWNLOAD_URL") {
    browser.downloads.download({
      url: message.url,
      saveAs: true,
    });
  }
});

