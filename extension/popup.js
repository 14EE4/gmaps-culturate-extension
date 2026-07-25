/**
 * GMap Review Decoder - Popup JS Controller
 * Dual Structure: v2 Aspect Importance Weights (A) vs Overseas Food Adaptation (B)
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const selectCulture = document.getElementById('select-culture');
  const inputBackend = document.getElementById('input-backend');
  const btnSave = document.getElementById('btn-save');

  // Section A: v2 Importance Weights (1~5)
  const weightT = document.getElementById('weight-t');
  const weightS = document.getElementById('weight-s');
  const weightV = document.getElementById('weight-v');
  const weightA = document.getElementById('weight-a');

  const valWeightT = document.getElementById('val-weight-t');
  const valWeightS = document.getElementById('val-weight-s');
  const valWeightV = document.getElementById('val-weight-v');
  const valWeightA = document.getElementById('val-weight-a');

  // Section B: Overseas Food Adaptation Preferences (1~5 Sliders)
  const tasteAuth = document.getElementById('taste-authenticity');
  const tasteGreasy = document.getElementById('taste-greasiness');
  const tasteSpicy = document.getElementById('taste-spiciness');
  const tasteHerbs = document.getElementById('taste-herbs');

  const valTasteAuth = document.getElementById('val-taste-authenticity');
  const valTasteGreasy = document.getElementById('val-taste-greasiness');
  const valTasteSpicy = document.getElementById('val-taste-spiciness');
  const valTasteHerbs = document.getElementById('val-taste-herbs');

  const authText = {
    1: '20% (Familiar KR)',
    2: '40% (Light Local)',
    3: '60% (Balanced)',
    4: '80% (Authentic)',
    5: '100% (Pure Local)'
  };

  const greasyText = {
    1: '20% (Light & Clean)',
    2: '40% (Mild)',
    3: '60% (Moderate)',
    4: '80% (Rich)',
    5: '100% (Rich & Heavy)'
  };

  const spicyText = {
    1: '20% (Not Spicy)',
    2: '40% (Mild)',
    3: '60% (Medium)',
    4: '80% (Spicy)',
    5: '100% (Very Spicy)'
  };

  const herbsText = {
    1: '20% (Sensitive / No Cilantro)',
    2: '40% (Light Herbs)',
    3: '60% (Moderate)',
    4: '80% (Herbal)',
    5: '100% (Strong Herbs)'
  };

  const updateBadges = () => {
    // Section A Badges
    if (weightT && valWeightT) valWeightT.textContent = `Weight: ${weightT.value} / 5`;
    if (weightS && valWeightS) valWeightS.textContent = `Weight: ${weightS.value} / 5`;
    if (weightV && valWeightV) valWeightV.textContent = `Weight: ${weightV.value} / 5`;
    if (weightA && valWeightA) valWeightA.textContent = `Weight: ${weightA.value} / 5`;

    // Section B Badges
    if (tasteAuth && valTasteAuth) valTasteAuth.textContent = authText[tasteAuth.value] || `${tasteAuth.value * 20}%`;
    if (tasteGreasy && valTasteGreasy) valTasteGreasy.textContent = greasyText[tasteGreasy.value] || `${tasteGreasy.value * 20}%`;
    if (tasteSpicy && valTasteSpicy) valTasteSpicy.textContent = spicyText[tasteSpicy.value] || `${tasteSpicy.value * 20}%`;
    if (tasteHerbs && valTasteHerbs) valTasteHerbs.textContent = herbsText[tasteHerbs.value] || `${tasteHerbs.value * 20}%`;
  };

  // Load existing settings
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['isEnabled', 'targetCulture', 'backendUrl', 'userProfile'], (res) => {
      if (res.isEnabled !== undefined) toggleEnabled.checked = res.isEnabled;
      if (res.targetCulture) selectCulture.value = res.targetCulture;
      if (res.backendUrl) inputBackend.value = res.backendUrl;

      // Restore userProfile (importanceWeights & tastePreferences)
      if (res.userProfile) {
        if (res.userProfile.importanceWeights) {
          const w = res.userProfile.importanceWeights;
          if (w.t !== undefined && weightT) weightT.value = w.t;
          if (w.s !== undefined && weightS) weightS.value = w.s;
          if (w.v !== undefined && weightV) weightV.value = w.v;
          if (w.a !== undefined && weightA) weightA.value = w.a;
        }

        if (res.userProfile.tastePreferences) {
          const p = res.userProfile.tastePreferences;
          if (p.authenticity !== undefined && tasteAuth) tasteAuth.value = p.authenticity;
          if (p.greasiness !== undefined && tasteGreasy) tasteGreasy.value = p.greasiness;
          if (p.spiciness !== undefined && tasteSpicy) tasteSpicy.value = p.spiciness;
          if (p.herbs !== undefined && tasteHerbs) tasteHerbs.value = p.herbs;
        }
      }
      updateBadges();
    });
  }

  // Bind slider input events for live badge update & auto save
  const allSliders = [weightT, weightS, weightV, weightA, tasteAuth, tasteGreasy, tasteSpicy, tasteHerbs];
  allSliders.forEach((slider) => {
    if (slider) {
      slider.addEventListener('input', () => {
        updateBadges();
        savePreferences();
      });
    }
  });

  // Helper function to save current state
  const savePreferences = () => {
    const isEnabled = toggleEnabled.checked;
    const targetCulture = selectCulture.value;
    const backendUrl = inputBackend.value.trim() || 'http://localhost:8000';

    const userProfile = {
      targetCulture: targetCulture === 'Korean' ? 'KR' : (targetCulture === 'Japanese' ? 'JP' : 'US'),
      importanceWeights: {
        t: parseInt(weightT ? weightT.value : 5, 10),
        s: parseInt(weightS ? weightS.value : 3, 10),
        v: parseInt(weightV ? weightV.value : 4, 10),
        a: parseInt(weightA ? weightA.value : 2, 10)
      },
      tastePreferences: {
        authenticity: parseInt(tasteAuth ? tasteAuth.value : 5, 10),
        greasiness: parseInt(tasteGreasy ? tasteGreasy.value : 3, 10),
        spiciness: parseInt(tasteSpicy ? tasteSpicy.value : 4, 10),
        herbs: parseInt(tasteHerbs ? tasteHerbs.value : 1, 10)
      }
    };

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        isEnabled,
        targetCulture,
        backendUrl,
        userProfile
      }, () => {
        btnSave.textContent = 'Saved! ✓';
        btnSave.style.background = '#22c55e';
        setTimeout(() => {
          btnSave.textContent = 'Save Settings';
          btnSave.style.background = '';
        }, 1500);
      });
    }
  };

  // Save settings on button click
  btnSave.addEventListener('click', savePreferences);
  if (toggleEnabled) toggleEnabled.addEventListener('change', savePreferences);
  if (selectCulture) selectCulture.addEventListener('change', savePreferences);

  updateBadges();
});

