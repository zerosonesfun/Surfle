const WEBRING_JSON_URL = 'https://raw.githubusercontent.com/zerosonesfun/surfle/refs/heads/main/webring.json';

let sites = [], bookmarksSites = [];
let surfleMode = true, selectedFolderId = null, started = false, randomMode = false;

// For Random Mode history
let historySites = [], historyPos = -1;

// Helper to promisify bookmark APIs
function getTreeAsync() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree(nodes => {
      chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(nodes);
    });
  });
}
function getChildrenAsync(id) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(id, children => {
      chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(children);
    });
  });
}

async function fetchWebring() {
  try {
    const res = await fetch(WEBRING_JSON_URL);
    const data = await res.json();
    sites = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('fetchWebring error', e);
    sites = [];
  }
}

async function findWebringFolders() {
  try {
    const roots = await getTreeAsync();
    const folders = [];
    (function recurse(nodes) {
      for (const n of nodes) {
        if (!n.url && n.title && n.title.toLowerCase().includes('webring')) {
          folders.push({ id: n.id, title: n.title });
        }
        if (n.children) recurse(n.children);
      }
    })(roots);
    return folders;
  } catch (e) {
    console.error('findWebringFolders error', e);
    return [];
  }
}

async function loadBookmarks() {
  bookmarksSites = [];
  if (!selectedFolderId) return;
  try {
    const children = await getChildrenAsync(selectedFolderId);
    bookmarksSites = Array.isArray(children)
      ? children.filter(n => n.url)
      : [];
  } catch (e) {
    console.error('loadBookmarks error', e);
    bookmarksSites = [];
  }
}

// Utility
function getRandomIndex(max) {
  return Math.floor(Math.random() * max);
}

// Navigate to the next site
function openNext() {
  if (!started) return;

  if (randomMode) {
    // advance in history if possible
    if (historyPos < historySites.length - 1) {
      historyPos++;
    } else {
      // pick new random
      const pool = surfleMode
        ? sites
        : bookmarksSites.map(b => b.url);
      const idx = getRandomIndex(pool.length);
      historySites.push(pool[idx]);
      historyPos++;
    }
    chrome.tabs.update({ url: historySites[historyPos] });

  } else {
    // linear flow
    if (surfleMode && sites.length) {
      historyPos = -1; // not used in linear
      currentIndex = (currentIndex + 1) % sites.length;
      chrome.tabs.update({ url: sites[currentIndex] });
    }
    if (!surfleMode && bookmarksSites.length) {
      historyPos = -1;
      currentIndex = (currentIndex + 1) % bookmarksSites.length;
      chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
    }
  }
}

// Navigate to the previous site
function openPrev() {
  if (!started) return;

  if (randomMode) {
    if (historyPos > 0) {
      historyPos--;
      chrome.tabs.update({ url: historySites[historyPos] });
    }
  } else {
    if (surfleMode && sites.length) {
      currentIndex = (currentIndex - 1 + sites.length) % sites.length;
      chrome.tabs.update({ url: sites[currentIndex] });
    }
    if (!surfleMode && bookmarksSites.length) {
      currentIndex = (currentIndex - 1 + bookmarksSites.length) % bookmarksSites.length;
      chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
    }
  }
}

// Start or stop Surfle
async function toggleStart() {
  if (!started) {
    // START SURFLE
    // ensure data loaded
    await fetchWebring();
    if (!surfleMode) await loadBookmarks();

    started = true;
    chrome.storage.sync.set({ started });

    // reset history / index
    historySites = [];
    historyPos = -1;
    currentIndex = 0;

    // first nav
    openNext();

  } else {
    // STOP SURFLE
    started = false;
    chrome.storage.sync.set({ started });
  }
}

// Initial load
chrome.runtime.onInstalled.addListener(() => {
  fetchWebring();
  chrome.storage.sync.set({
    surfleMode: true,
    selectedFolderId: null,
    started: false,
    randomMode: false
  });
});

chrome.runtime.onStartup.addListener(fetchWebring);

chrome.storage.sync.get(
  ['surfleMode','selectedFolderId','started','randomMode'],
  data => {
    surfleMode      = data.surfleMode ?? true;
    selectedFolderId= data.selectedFolderId || null;
    started         = data.started ?? false;
    randomMode      = data.randomMode ?? false;
    if (!surfleMode && selectedFolderId) loadBookmarks();
    fetchWebring();
  }
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.action) {
      case 'getWebringFolders':
        sendResponse({ folders: await findWebringFolders() });
        break;

      case 'toggleSurfleMode':
        surfleMode = msg.value;
        chrome.storage.sync.set({ surfleMode });
        sendResponse({ success: true });
        break;

      case 'setSelectedFolder':
        selectedFolderId = msg.folderId;
        chrome.storage.sync.set({ selectedFolderId });
        await loadBookmarks();
        sendResponse({ success: true });
        break;

      case 'toggleRandomMode':
        randomMode = msg.value;
        chrome.storage.sync.set({ randomMode });
        sendResponse({ success: true });
        break;

      case 'toggleStart':
        await toggleStart();
        sendResponse({ started });
        break;

      case 'goNext':
        openNext();
        sendResponse({ success: true });
        break;

      case 'goPrev':
        openPrev();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({});
    }
  })();
  return true;
});
