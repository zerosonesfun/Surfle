// background.js

const DEFAULT_WEBRING = 'webring.json';

let sites = [];
let bookmarksSites = [];
let surfleMode = true;
let selectedFolderId = null;
let started = false;
let randomMode = false;
let historySites = [];
let historyPos = -1;
let currentIndex = 0;
let lastRandomSite = null;
let webringFile = DEFAULT_WEBRING;

// Promise wrappers for chrome APIs
function getFromStorage(key) {
  return new Promise(resolve => chrome.storage.sync.get(key, items => resolve(items[key])));
}
function setInStorage(obj) {
  return new Promise(resolve => chrome.storage.sync.set(obj, resolve));
}
function getTreeAsync() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree(nodes =>
      chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(nodes)
    );
  });
}
function getChildrenAsync(id) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(id, children =>
      chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(children)
    );
  });
}

// Always reload the correct file before fetching
async function fetchWebring(forceRefresh = false) {
  // 1) Read the latest selected filename
  const stored = await getFromStorage('webringFile');
  webringFile = stored || DEFAULT_WEBRING;

  // 2) Fetch that JSON
  try {
    let url = `https://cdn.jsdelivr.net/gh/zerosonesfun/Surfle@latest/${webringFile}`;
    let fetchOptions = undefined;
    if (forceRefresh) {
      url += `?cb=${Date.now()}`;
      fetchOptions = { cache: "no-store" };
    }
    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    sites = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('fetchWebring error', e);
    sites = [];
  }
}

// Find all bookmark folders, listing those with 'webring' in the name first
async function findWebringFolders() {
  try {
    const roots = await getTreeAsync();
    const webringFolders = [];
    const otherFolders = [];
    (function recurse(nodes) {
      for (const n of nodes) {
        if (!n.url) {
          if (n.title.toLowerCase().includes('webring')) {
            webringFolders.push({ id: n.id, title: n.title });
          } else if (n.title && n.title.trim() !== '') {
            otherFolders.push({ id: n.id, title: n.title });
          }
        }
        if (n.children) recurse(n.children);
      }
    })(roots);
    // Remove duplicates (in case of overlap)
    const seen = new Set();
    const allFolders = [...webringFolders, ...otherFolders].filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
    return allFolders;
  } catch (e) {
    console.error('findWebringFolders error', e);
    return [];
  }
}

// Load bookmarks mode list
async function loadBookmarks() {
  if (!selectedFolderId) {
    bookmarksSites = [];
    return;
  }
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

function getRandomIndex(max, excludeIndex = -1) {
  if (max <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * max);
  } while (idx === excludeIndex);
  return idx;
}

async function openFirst() {
  if (!started) return;

  if (randomMode) {
    const pool = surfleMode ? sites : bookmarksSites.map(b => b.url);
    if (pool.length === 0) return;
    
    const idx = getRandomIndex(pool.length);
    const selectedSite = pool[idx];
    lastRandomSite = selectedSite;
    historySites = [selectedSite];
    historyPos = 0;
    chrome.tabs.update({ url: historySites[historyPos] });
  } else {
    if (surfleMode && sites.length) {
      historyPos = -1;
      await setInStorage({ currentIndex });
      chrome.tabs.update({ url: sites[currentIndex] });
    }
    if (!surfleMode && bookmarksSites.length) {
      historyPos = -1;
      await setInStorage({ currentIndex });
      chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
    }
  }
}

async function openNext() {
  if (!started) return;

  if (randomMode) {
    if (historyPos < historySites.length - 1) {
      historyPos++;
    } else {
      const pool = surfleMode ? sites : bookmarksSites.map(b => b.url);
      if (pool.length === 0) return;
      
      // Find the index of the last site to avoid repetition
      let excludeIndex = -1;
      if (lastRandomSite && pool.length > 1) {
        excludeIndex = pool.indexOf(lastRandomSite);
      }
      
      const idx = getRandomIndex(pool.length, excludeIndex);
      const selectedSite = pool[idx];
      lastRandomSite = selectedSite;
      historySites.push(selectedSite);
      historyPos++;
    }
    chrome.tabs.update({ url: historySites[historyPos] });
  } else {
    if (surfleMode && sites.length) {
      historyPos = -1;
      currentIndex = (currentIndex + 1) % sites.length;
      await setInStorage({ currentIndex });
      chrome.tabs.update({ url: sites[currentIndex] });
    }
    if (!surfleMode && bookmarksSites.length) {
      historyPos = -1;
      currentIndex = (currentIndex + 1) % bookmarksSites.length;
      await setInStorage({ currentIndex });
      chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
    }
  }
}

async function openPrev() {
  if (!started) return;

  if (randomMode) {
    if (historyPos > 0) {
      historyPos--;
      chrome.tabs.update({ url: historySites[historyPos] });
    }
  } else {
    if (surfleMode && sites.length) {
      currentIndex = (currentIndex - 1 + sites.length) % sites.length;
      await setInStorage({ currentIndex });
      chrome.tabs.update({ url: sites[currentIndex] });
    }
    if (!surfleMode && bookmarksSites.length) {
      currentIndex = (currentIndex - 1 + bookmarksSites.length) % bookmarksSites.length;
      await setInStorage({ currentIndex });
      chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
    }
  }
}

async function toggleStart() {
  if (!started) {
    // Always use the latest file from storage
    webringFile = await getFromStorage('webringFile') || DEFAULT_WEBRING;
    // Force refresh cache when starting Surfle
    await fetchWebring(true);
    if (!surfleMode) await loadBookmarks();
    started = true;
    await setInStorage({ started });
    historySites = [];
    historyPos = -1;
    currentIndex = 0;
    lastRandomSite = null;
    openFirst();
  } else {
    started = false;
    await setInStorage({ started });
  }
}

// On install, set defaults
chrome.runtime.onInstalled.addListener(async () => {
  await setInStorage({
    surfleMode,
    selectedFolderId,
    started: false,
    randomMode,
    webringFile: DEFAULT_WEBRING
  });
  await fetchWebring();
});

// On startup
chrome.runtime.onStartup.addListener(fetchWebring);

// Load saved state & fetch initial list
chrome.storage.sync.get(
  ['surfleMode','selectedFolderId','started','randomMode','webringFile','currentIndex'],
  async data => {
    surfleMode = data.surfleMode ?? true;
    selectedFolderId = data.selectedFolderId || null;
    started = data.started ?? false;
    randomMode = data.randomMode ?? false;
    currentIndex = data.currentIndex ?? 0;
    webringFile = data.webringFile || DEFAULT_WEBRING;

    if (!surfleMode && selectedFolderId) await loadBookmarks();
    await fetchWebring();
  }
);

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.action) {
      case 'getWebringFolders':
        sendResponse({ folders: await findWebringFolders() });
        break;
      case 'toggleSurfleMode':
        surfleMode = msg.value;
        await setInStorage({ surfleMode });
        sendResponse({ success: true });
        break;
      case 'setSelectedFolder':
        selectedFolderId = msg.folderId;
        await setInStorage({ selectedFolderId });
        await loadBookmarks();
        sendResponse({ success: true });
        break;
      case 'toggleRandomMode':
        randomMode = msg.value;
        await setInStorage({ randomMode });
        sendResponse({ success: true });
        break;
      case 'toggleStart':
        await toggleStart();
        sendResponse({ started });
        break;
      case 'goNext':
        await openNext();
        sendResponse({ success: true });
        break;
      case 'goPrev':
        await openPrev();
        sendResponse({ success: true });
        break;
      case 'setWebringFile':
        webringFile = msg.filename;
        await setInStorage({ webringFile });
        // refetch now so the new JSON is ready for the next start
        await fetchWebring();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({});
    }
  })();
  return true;
});
