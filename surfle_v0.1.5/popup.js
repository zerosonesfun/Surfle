const s = id=>document.getElementById(id);
const surfleCheckbox = s('surfleMode'), bookmarksCheckbox = s('bookmarksMode');
const folderSelect = s('bookmarksFolderSelect'), startBtn = s('startBtn');
const prevBtn = s('prevBtn'), nextBtn = s('nextBtn');

function updateUI(started) {
  surfleCheckbox.disabled = started;
  bookmarksCheckbox.disabled = started;
  folderSelect.disabled = !bookmarksCheckbox.checked || started;
  startBtn.textContent = started?'Stop Surfle':'Start Surfle';
  prevBtn.disabled = !started; nextBtn.disabled = !started;
  folderSelect.style.display = bookmarksCheckbox.checked?'block':'none';
}

function loadFolders() {
  folderSelect.innerHTML='<option>Loading folders...</option>';
  chrome.runtime.sendMessage({action:'getWebringFolders'})
    .then(res=>{
      const folders=res?.folders||[];
      folderSelect.innerHTML='';
      if(folders.length){
        folders.forEach(f=>{
          const o=document.createElement('option');
          o.value=f.id; o.textContent=f.title; folderSelect.appendChild(o);
        });
        chrome.storage.sync.get('selectedFolderId',d=>{
          if(d.selectedFolderId) folderSelect.value=d.selectedFolderId;
          else {
            folderSelect.value=folders[0].id;
            chrome.runtime.sendMessage({action:'setSelectedFolder',folderId:folders[0].id});
          }
        });
      } else {
        const o=document.createElement('option');
        o.textContent='No webring folders'; o.disabled=true;
        folderSelect.appendChild(o);
      }
    }).catch(err=>{
      console.error('loadFolders err',err);
      folderSelect.innerHTML='<option>Error loading</option>';
    });
}

surfleCheckbox.addEventListener('change',()=>{
  if(surfleCheckbox.checked) bookmarksCheckbox.checked=false;
  chrome.runtime.sendMessage({action:'toggleSurfleMode',value:surfleCheckbox.checked});
  updateUI(false);
});
bookmarksCheckbox.addEventListener('change',()=>{
  if(bookmarksCheckbox.checked) surfleCheckbox.checked=false;
  chrome.runtime.sendMessage({action:'toggleSurfleMode',value:!bookmarksCheckbox.checked});
  updateUI(false);
  if(bookmarksCheckbox.checked) loadFolders();
});
folderSelect.addEventListener('change',()=>{
  chrome.runtime.sendMessage({action:'setSelectedFolder',folderId:folderSelect.value});
});
startBtn.addEventListener('click',()=>{
  chrome.runtime.sendMessage({action:'toggleStart'})
    .then(res=>updateUI(res.started)).catch(console.error);
});
prevBtn.addEventListener('click',()=>chrome.runtime.sendMessage({action:'goPrev'}));
nextBtn.addEventListener('click',()=>chrome.runtime.sendMessage({action:'goNext'}));

chrome.storage.sync.get(['surfleMode','started'],d=>{
  surfleCheckbox.checked=d.surfleMode??true;
  bookmarksCheckbox.checked=!surfleCheckbox.checked;
  updateUI(d.started??false);
  if(bookmarksCheckbox.checked) loadFolders();
});