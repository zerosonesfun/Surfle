const WEBRING_JSON_URL = 'https://raw.githubusercontent.com/zerosonesfun/surfle/refs/heads/main/webring.json';
let sites = [], bookmarksSites = [], currentIndex = 0;
let surfleMode = true, selectedFolderId = null, started = false;

function getTreeAsync() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((nodes) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(nodes);
    });
  });
}

function getChildrenAsync(id) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(id, (children) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(children);
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
    if (Array.isArray(children)) {
      bookmarksSites = children.filter(n => n.url);
    } else {
      bookmarksSites = [];
    }
  } catch (e) {
    console.error('loadBookmarks error', e);
    bookmarksSites = [];
  }
  currentIndex = 0;
}

function openSiteAtIndex(idx) {
  if (!started) return;
  if (surfleMode) {
    if (sites.length) {
      currentIndex = (idx + sites.length) % sites.length;
      chrome.tabs.update({ url: sites[currentIndex] });
    }
  } else {
    if (bookmarksSites.length) {
      currentIndex = (idx + bookmarksSites.length) % bookmarksSites.length;
      chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
    }
  }
}

function goNext() { openSiteAtIndex(currentIndex + 1); }
function goPrev() { openSiteAtIndex(currentIndex - 1); }

chrome.runtime.onInstalled.addListener(() => {
  fetchWebring();
  chrome.storage.sync.set({ surfleMode: true, started: false });
});
chrome.runtime.onStartup.addListener(fetchWebring);

chrome.storage.sync.get(['surfleMode','selectedFolderId','started'], data => {
  surfleMode = data.surfleMode ?? true;
  selectedFolderId = data.selectedFolderId || null;
  started = data.started ?? false;
  if (!surfleMode && selectedFolderId) loadBookmarks();
  fetchWebring();
});

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
      case 'toggleStart':
        started = !started;
        chrome.storage.sync.set({ started });
        if (started) {
          if (surfleMode) openSiteAtIndex(0);
          else { await loadBookmarks(); openSiteAtIndex(0); }
        }
        sendResponse({ started });
        break;
      case 'goNext':
        goNext();
        sendResponse({ success: true });
        break;
      case 'goPrev':
        goPrev();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({});
    }
  })();
  return true;
});