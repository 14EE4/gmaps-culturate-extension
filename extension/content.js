/**
 * GMap Review Decoder - Content Script
 * Manifest V3 Google Maps Cultural Review Decoder Extension
 */

(function () {
  'use strict';

  // State Management
  let currentGMapId = null;
  let currentPlaceName = null;
  let isEnabled = true;
  let targetCulture = 'Korean';
  let observer = null;
  let debounceTimer = null;
  let shadowHost = null;
  let shadowRoot = null;
  let lastProcessedKey = null;

  // Dynamic Mock Dataset loaded asynchronously from single JSON file (extension/data/sample_places.json)
  let MOCK_DATASET = {};

  async function loadMockDataset() {
    try {
      const url = chrome.runtime.getURL('data/sample_places.json');
      const response = await fetch(url);
      if (response.ok) {
        MOCK_DATASET = await response.json();
      }
    } catch (e) {
      console.log('[GMap Review Decoder] data/sample_places.json 로드 중 예외 발생:', e);
    }
  }

  // Initial load of standalone JSON dataset
  loadMockDataset();

  /**
   * 1. URL 패턴에서 gmap_id 정규식 추출
   * 패턴: !1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)
   */
  function extractGMapId(url) {
    if (!url) return null;
    const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // 대체 파라미터 패턴 (ftid=0x... 또는 query=0x...)
    const altMatch = url.match(/(0x[0-9a-fA-F]{12,18}:0x[0-9a-fA-F]{12,18})/);
    return altMatch ? altMatch[1] : null;
  }

  /**
   * DOM에서 장소 이름 fallback 추출
   */
  function extractPlaceNameFromDOM() {
    // Google Maps 주 h1 요소 구문 검사
    const h1Elements = Array.from(document.querySelectorAll('h1'));
    for (const h1 of h1Elements) {
      const text = h1.textContent.trim();
      if (text && text !== 'Google Maps' && text !== '구글 지도' && text.length > 1) {
        return text;
      }
    }
    // fallback 클래스 검색
    const titleEl = document.querySelector('.DUwfxb, .fontHeadlineLarge, [role="main"] h1');
    return titleEl ? titleEl.textContent.trim() : null;
  }

  /**
   * 2. 백엔드 API 또는 Dynamic Mock Data 통신
   */
  async function fetchCulturalAnalysis(gmapId, placeName) {
    const backendUrl = `http://localhost:8000/api/analyze`;
    const queryParam = gmapId ? `gmap_id=${encodeURIComponent(gmapId)}` : `place_name=${encodeURIComponent(placeName || '')}`;
    const targetUrl = `${backendUrl}?${queryParam}&target_culture=${encodeURIComponent(targetCulture)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout for fast response

      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { data, isMock: false };
      }
    } catch (e) {
      console.log('[GMap Review Decoder] FastAPI 백엔드 미연결. Mock Data 모드로 실행합니다.');
    }

    // Fallback to Mock Data Engine
    return { data: generateMockData(gmapId, placeName), isMock: true };
  }

  /**
   * Dynamic Mock Data Generator
   */
  function generateMockData(gmapId, placeName) {
    // 1. UCSD Dataset Key에 일치하는 데이터가 있을 경우 우선 반환
    if (gmapId && MOCK_DATASET[gmapId]) {
      return MOCK_DATASET[gmapId];
    }

    // 2. 동적 Mock 생성
    const displayName = placeName || (gmapId ? `장소 (${gmapId.substring(0, 10)}...)` : '선택된 장소');
    
    // Hash-based deterministic values
    const hash = simpleHash(displayName + (gmapId || ''));
    const localRating = (4.0 + (hash % 10) / 10).toFixed(1);
    const krAdjustment = ((hash % 7) * 0.1 + 0.3).toFixed(1);
    const koreanRating = (Math.max(3.2, parseFloat(localRating) - parseFloat(krAdjustment))).toFixed(1);

    return {
      gmap_id: gmapId || `0x${hash.toString(16)}:0x${(hash * 31).toString(16)}`,
      place_name: displayName,
      local_rating: parseFloat(localRating),
      korean_rating: parseFloat(koreanRating),
      culture_summary: `${displayName}의 현지 구글 평점 대비 한국인 평점은 가성비 및 음식의 간(짠맛/단맛) 기준 차이로 인해 보정되었습니다.`,
      metrics: {
        taste: { local: (4.2 + (hash % 6) / 10).toFixed(1), kr: (3.8 + (hash % 5) / 10).toFixed(1) },
        service: { local: (4.0 + (hash % 5) / 10).toFixed(1), kr: (3.5 + (hash % 6) / 10).toFixed(1) },
        value: { local: (4.1 + (hash % 7) / 10).toFixed(1), kr: (3.4 + (hash % 5) / 10).toFixed(1) },
        atmosphere: { local: 4.5, kr: 4.2 }
      },
      nuance_tags: [
        {
          literal: '#간이 매우 센 편 (현지 규격)',
          meaning: '음식이 한국인 입맛 기준 다소 짜거나 달아서 밥이나 음료 추가 필요.'
        },
        {
          literal: '#팁 포함 가성비 고려 필요',
          meaning: '가격 대비 양이나 서비스 만족도가 보통 수준임.'
        },
        {
          literal: '#웨이팅 대비 평범함',
          meaning: '대기 시간이 30분 이상일 경우 한국인 만족도 급감 위험.'
        }
      ]
    };
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * 3. Shadow DOM 초기화 및 사이드바 UI 렌더링
   */
  function initShadowDOM() {
    if (shadowHost) return;

    shadowHost = document.createElement('div');
    shadowHost.id = 'gmap-review-decoder-host';
    shadowHost.style.position = 'absolute';
    shadowHost.style.top = '0';
    shadowHost.style.left = '0';
    shadowHost.style.zIndex = '2147483647';
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // Inject Isolated Stylesheet
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = chrome.runtime.getURL('styles.css');
    shadowRoot.appendChild(linkEl);

    const container = document.createElement('div');
    container.id = 'gmap-decoder-root';
    shadowRoot.appendChild(container);
  }

  function renderSidebar(analysis, isMock) {
    initShadowDOM();

    const rootEl = shadowRoot.querySelector('#gmap-decoder-root');
    if (!rootEl) return;

    const data = analysis;
    const delta = (data.korean_rating - data.local_rating).toFixed(1);
    const deltaClass = delta >= 0 ? 'delta-up' : 'delta-down';
    const deltaSign = delta >= 0 ? `+${delta}` : delta;

    rootEl.innerHTML = `
      <div id="gmap-decoder-sidebar">
        <!-- Header -->
        <div class="decoder-header">
          <div class="header-title-group">
            <div class="header-logo">🔍</div>
            <div>
              <div class="header-title">GMap Review Decoder</div>
              <div class="header-subtitle">한국인(KR) 문화권 맞춤 분석</div>
            </div>
          </div>
          <div class="header-actions">
            <button class="action-btn" id="btn-refresh" title="새로고침">🔄</button>
            <button class="action-btn" id="btn-close" title="닫기">✖</button>
          </div>
        </div>

        <!-- Body -->
        <div class="decoder-body">
          <!-- Place Title Card -->
          <div class="place-card">
            <div class="place-name">${escapeHTML(data.place_name)}</div>
            <div class="place-meta">
              <span>📍 위치 선택 완료</span>
            </div>
            ${data.gmap_id ? `<div class="gmap-id-tag" title="UCSD Dataset Key">ID: ${data.gmap_id}</div>` : ''}
          </div>

          <!-- Rating Comparison Grid -->
          <div class="ratings-container">
            <div class="rating-box">
              <div class="rating-label">🌐 현지 구글 평점</div>
              <div class="rating-score">
                <span class="stars">★</span> ${data.local_rating} <span class="max">/ 5.0</span>
              </div>
            </div>

            <div class="rating-box korean-box">
              <div class="rating-label">🇰🇷 한국인 보정 평점</div>
              <div class="rating-score">
                <span class="stars">★</span> ${data.korean_rating} <span class="max">/ 5.0</span>
              </div>
              <div class="rating-delta ${deltaClass}">${deltaSign} 보정됨</div>
            </div>
          </div>

          <!-- Rationale Box -->
          <div class="rationale-box">
            <div class="rationale-title">💡 문화권 평점 보정 요약</div>
            ${escapeHTML(data.culture_summary)}
          </div>

          <!-- Comparative Metrics -->
          <div>
            <div class="section-title">
              <span>📊 항목별 인식 비교</span>
              <span style="font-size: 10px; color: #9ca3af; font-weight: normal;">(회색: 현지 / 보라: 한국인)</span>
            </div>
            <div class="metrics-list">
              ${renderMetricBar('맛 (Taste)', data.metrics.taste)}
              ${renderMetricBar('서비스 (Service)', data.metrics.service)}
              ${renderMetricBar('가성비 (Value)', data.metrics.value)}
              ${renderMetricBar('분위기 (Atmosphere)', data.metrics.atmosphere)}
            </div>
          </div>

          <!-- Nuance Decoder Tags -->
          <div>
            <div class="section-title">💡 뉘앙스 디코딩 태그</div>
            <div class="tags-grid">
              ${data.nuance_tags.map(tag => `
                <div class="nuance-tag-card">
                  <div class="tag-literal">${escapeHTML(tag.literal)}</div>
                  <div class="tag-meaning"><strong>#실제 의미:</strong> ${escapeHTML(tag.meaning)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="decoder-footer">
          <div class="status-indicator">
            <span class="dot ${isMock ? 'mock-dot' : ''}"></span>
            <span>${isMock ? 'Mock Fallback Engine (UCSD Key)' : 'FastAPI 백엔드 연결됨'}</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    `;

    // Event Listeners for Overlay
    const closeBtn = rootEl.querySelector('#btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        rootEl.innerHTML = '';
      });
    }

    const refreshBtn = rootEl.querySelector('#btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        processPlaceDetection(true);
      });
    }
  }

  function renderMetricBar(name, metric) {
    const localVal = parseFloat(metric.local);
    const krVal = parseFloat(metric.kr);
    const localPct = (localVal / 5.0) * 100;
    const krPct = (krVal / 5.0) * 100;

    return `
      <div class="metric-item">
        <div class="metric-header">
          <span class="metric-name">${name}</span>
          <div class="metric-values">
            <span class="val-local">${localVal}</span>
            <span class="val-kr">★ ${krVal}</span>
          </div>
        </div>
        <div class="bar-track">
          <div class="bar-fill-local" style="width: ${localPct}%;"></div>
          <div class="bar-fill-kr" style="width: ${krPct}%;"></div>
        </div>
      </div>
    `;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 장소 선택 URL 유효성 검사
   * - /maps/place/ 포함 여부 및 gmap_id 정규식 존재 여부 검사
   */
  function isPlaceSelected(url) {
    if (!url) return false;
    const hasPlacePath = url.includes('/maps/place/');
    const hasGMapId = !!extractGMapId(url);
    return hasPlacePath || hasGMapId;
  }

  /**
   * 사이드바 패널 제거 및 상태 초기화
   */
  function clearSidebar() {
    lastProcessedKey = null;
    currentGMapId = null;
    currentPlaceName = null;
    if (shadowRoot) {
      const rootEl = shadowRoot.querySelector('#gmap-decoder-root');
      if (rootEl) {
        rootEl.innerHTML = '';
      }
    }
  }

  /**
   * 4. 메인 감지 프로세스 (URL & DOM Observer)
   */
  async function processPlaceDetection(forceRefresh = false) {
    if (!isEnabled) {
      clearSidebar();
      return;
    }

    const currentUrl = window.location.href;

    // 1. 단순 지도 이동/확대/축소 URL인 경우 (장소 미선택 상태 -> 패널 숨김)
    if (!isPlaceSelected(currentUrl)) {
      clearSidebar();
      return;
    }

    // 2. 장소 정보 및 gmap_id 추출
    const gmapId = extractGMapId(currentUrl);
    const placeName = extractPlaceNameFromDOM();

    // Unique key identifying the place
    const processKey = gmapId || placeName;

    // 장소 식별 실패 시 패널 숨김
    if (!processKey) {
      clearSidebar();
      return;
    }

    if (!forceRefresh && processKey === lastProcessedKey) return;

    lastProcessedKey = processKey;
    currentGMapId = gmapId;
    currentPlaceName = placeName;

    console.log(`[GMap Review Decoder] 유효한 장소 감지됨 - gmap_id: ${gmapId || '없음(Fallback)'}, place_name: ${placeName || '없음'}`);

    const { data, isMock } = await fetchCulturalAnalysis(gmapId, placeName);
    renderSidebar(data, isMock);
  }

  /**
   * Observer 및 Event Listener 등록
   */
  function startMonitoring() {
    // Initial check
    setTimeout(() => processPlaceDetection(), 1000);

    // MutationObserver to watch Google Maps DOM updates
    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processPlaceDetection();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // SPA 히스토리 변경 (pushState/replaceState) 커스텀 감지
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event('gmap_locationchange'));
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('gmap_locationchange'));
    };

    window.addEventListener('gmap_locationchange', () => {
      processPlaceDetection();
    });

    // Handle URL changes via history state updates (popstate)
    window.addEventListener('popstate', () => {
      setTimeout(() => processPlaceDetection(), 300);
    });
  }

  // Load User Preferences from Storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['isEnabled', 'targetCulture'], (res) => {
      if (res.isEnabled !== undefined) isEnabled = res.isEnabled;
      if (res.targetCulture) targetCulture = res.targetCulture;
      startMonitoring();
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isEnabled) isEnabled = changes.isEnabled.newValue;
      if (changes.targetCulture) targetCulture = changes.targetCulture.newValue;
      if (isEnabled) {
        processPlaceDetection(true);
      } else {
        clearSidebar();
      }
    });
  } else {
    startMonitoring();
  }
})();
