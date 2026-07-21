/**
 * GMap Review Decoder - Popup JS Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const selectCulture = document.getElementById('select-culture');
  const inputBackend = document.getElementById('input-backend');
  const btnSave = document.getElementById('btn-save');

  // Load existing settings
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['isEnabled', 'targetCulture', 'backendUrl'], (res) => {
      if (res.isEnabled !== undefined) toggleEnabled.checked = res.isEnabled;
      if (res.targetCulture) selectCulture.value = res.targetCulture;
      if (res.backendUrl) inputBackend.value = res.backendUrl;
    });
  }

  // Save settings
  btnSave.addEventListener('click', () => {
    const isEnabled = toggleEnabled.checked;
    const targetCulture = selectCulture.value;
    const backendUrl = inputBackend.value.trim() || 'http://localhost:8000';

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        isEnabled,
        targetCulture,
        backendUrl
      }, () => {
        btnSave.textContent = '저장 완료! ✓';
        btnSave.style.background = '#22c55e';
        setTimeout(() => {
          btnSave.textContent = '설정 저장';
          btnSave.style.background = '';
        }, 1500);
      });
    }
  });
});
