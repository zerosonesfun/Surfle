const WEBRING_JSON_URL = 'https://raw.githubusercontent.com/zerosonesfun/surfle/refs/heads/main/webring.json';
let sites = [], bookmarksSites = [], currentIndex = 0;
let surfleMode = true, selectedFolderId = null, started = false;

function getTreeAsync() { return new Promise(resolve => chrome.bookmarks.getTree(resolve)); }
function getChildrenAsync(id) { return new Promise(resolve => chrome.bookmarks.getChildren(id, resolve)); }

async function fetchWebring() {
  try {
    const res = await fetch(WEBRING_JSON_URL);
    const data = await res.json();
    sites = Array.isArray(data) ? data : [];
  } catch (e) { console.error('fetchWebring', e); }
}
async function findWebringFolders() {
  const roots = await getTreeAsync(), folders = [];
  (function recurse(nodes) {
    for (const n of nodes) {
      if (!n.url && n.title && n.title.toLowerCase().includes('webring')) {
        folders.push({ id: n.id, title: n.title });
      }
      if (n.children) recurse(n.children);
    }
  })(roots);
  return folders;
}
async function loadBookmarks() {
  bookmarksSites = [];
  if (!selectedFolderId) return;
  const children = await getChildrenAsync(selectedFolderId);
  bookmarksSites = children.filter(n => n.url);
  currentIndex = 0;
}
function openSiteAtIndex(idx) {
  if (!started) return;
  if (surfleMode && sites.length) {
    currentIndex = (idx + sites.length) % sites.length;
    chrome.tabs.update({ url: sites[currentIndex] });
  } else if (!surfleMode && bookmarksSites.length) {
    currentIndex = (idx + bookmarksSites.length) % bookmarksSites.length;
    chrome.tabs.update({ url: bookmarksSites[currentIndex].url });
  }
}
chrome.runtime.onInstalled.addListener(() => { fetchWebring(); chrome.storage.sync.set({ surfleMode:true, started:false }); });
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
    if (msg.action === 'getWebringFolders') {
      const folders = await findWebringFolders();
      sendResponse({ folders });
    } else if (msg.action === 'toggleSurfleMode') {
      surfleMode = msg.value;
      chrome.storage.sync.set({ surfleMode });
      sendResponse({ success: true });
    } else if (msg.action === 'setSelectedFolder') {
      selectedFolderId = msg.folderId;
      chrome.storage.sync.set({ selectedFolderId });
      await loadBookmarks();
      sendResponse({ success: true });
    } else if (msg.action === 'toggleStart') {
      started = !started;
      chrome.storage.sync.set({ started });
      if (started) {
        if (surfleMode) openSiteAtIndex(0);
        else { await loadBookmarks(); openSiteAtIndex(0); }
      }
      sendResponse({ started });
    } else if (msg.action === 'goNext') {
      openSiteAtIndex(currentIndex + 1);
      sendResponse({ success: true });
    } else if (msg.action === 'goPrev') {
      openSiteAtIndex(currentIndex - 1);
      sendResponse({ success: true });
    } else {
      sendResponse({}); // default
    }
  })();
  return true;
});