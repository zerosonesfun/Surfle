let tapCount = 0, tapTimeout;

function handleTapLikeAction() {
  tapCount++;
  clearTimeout(tapTimeout);
  tapTimeout = setTimeout(() => {
    if (tapCount === 3) chrome.runtime.sendMessage({ action: 'goNext' });
    if (tapCount === 4) chrome.runtime.sendMessage({ action: 'goPrev' });
    tapCount = 0;
  }, 500);
}

document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.isComposing) return;
  if (e.key === 'ArrowRight') chrome.runtime.sendMessage({ action: 'goNext' });
  if (e.key === 'ArrowLeft') chrome.runtime.sendMessage({ action: 'goPrev' });
});

document.addEventListener('touchstart', handleTapLikeAction);
document.addEventListener('click', handleTapLikeAction);
