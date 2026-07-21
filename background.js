/**
 * GMap Review Decoder - Background Service Worker
 * Manifest V3
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[GMap Review Decoder] Service Worker가 설치되었습니다.');

  // Set default settings
  chrome.storage.local.set({
    isEnabled: true,
    targetCulture: 'Korean',
    backendUrl: 'http://localhost:8000'
  });
});
