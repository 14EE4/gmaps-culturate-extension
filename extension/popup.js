/**
 * GMap Review Decoder - Popup JS Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const selectCulture = document.getElementById('select-culture');
  const inputBackend = document.getElementById('input-backend');
  const btnSave = document.getElementById('btn-save');
  const aspectCheckboxes = document.querySelectorAll('.aspect-checkbox');

  // Sliders
  const sliderSpiciness = document.getElementById('slider-spiciness');
  const sliderSaltiness = document.getElementById('slider-saltiness');
  const sliderPortion = document.getElementById('slider-portion');

  const valSpiciness = document.getElementById('val-spiciness');
  const valSaltiness = document.getElementById('val-saltiness');
  const valPortion = document.getElementById('val-portion');

  const spicinessText = {
    1: '20% (Not Spicy)',
    2: '40% (Mild)',
    3: '60% (Medium)',
    4: '80% (Spicy)',
    5: '100% (Extremely Spicy)'
  };

  const saltinessText = {
    1: '20% (Very Bland)',
    2: '40% (Light)',
    3: '60% (Balanced)',
    4: '80% (Salty)',
    5: '100% (Very Salty)'
  };

  const portionText = {
    1: '20% (Very Small)',
    2: '40% (Light)',
    3: '60% (Medium)',
    4: '80% (Filling)',
    5: '100% (Very Hearty)'
  };

  const updateBadges = () => {
    if (sliderSpiciness && valSpiciness) {
      valSpiciness.textContent = spicinessText[sliderSpiciness.value] || `${sliderSpiciness.value * 20}%`;
    }
    if (sliderSaltiness && valSaltiness) {
      valSaltiness.textContent = saltinessText[sliderSaltiness.value] || `${sliderSaltiness.value * 20}%`;
    }
    if (sliderPortion && valPortion) {
      valPortion.textContent = portionText[sliderPortion.value] || `${sliderPortion.value * 20}%`;
    }
  };

  // Load existing settings
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['isEnabled', 'targetCulture', 'backendUrl', 'userProfile'], (res) => {
      if (res.isEnabled !== undefined) toggleEnabled.checked = res.isEnabled;
      if (res.targetCulture) selectCulture.value = res.targetCulture;
      if (res.backendUrl) inputBackend.value = res.backendUrl;

      // Restore userProfile preferredAspects & aspectLevels
      if (res.userProfile) {
        if (Array.isArray(res.userProfile.preferredAspects)) {
          aspectCheckboxes.forEach((cb) => {
            cb.checked = res.userProfile.preferredAspects.includes(cb.value);
          });
        }
        if (res.userProfile.aspectLevels) {
          if (res.userProfile.aspectLevels.spiciness && sliderSpiciness) {
            sliderSpiciness.value = res.userProfile.aspectLevels.spiciness;
          }
          if (res.userProfile.aspectLevels.saltiness && sliderSaltiness) {
            sliderSaltiness.value = res.userProfile.aspectLevels.saltiness;
          }
          if (res.userProfile.aspectLevels.portion && sliderPortion) {
            sliderPortion.value = res.userProfile.aspectLevels.portion;
          }
        }
      }
      updateBadges();
    });
  }

  // Bind slider input events
  [sliderSpiciness, sliderSaltiness, sliderPortion].forEach((slider) => {
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
    const preferredAspects = Array.from(aspectCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    const aspectLevels = {
      spiciness: parseInt(sliderSpiciness.value, 10),
      saltiness: parseInt(sliderSaltiness.value, 10),
      portion: parseInt(sliderPortion.value, 10)
    };

    const userProfile = {
      targetCulture: targetCulture === 'Korean' ? 'KR' : (targetCulture === 'Japanese' ? 'JP' : 'US'),
      preferredAspects,
      aspectLevels
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

  // Instant save on aspect checkbox toggles
  aspectCheckboxes.forEach((cb) => {
    cb.addEventListener('change', savePreferences);
  });

  updateBadges();
});

