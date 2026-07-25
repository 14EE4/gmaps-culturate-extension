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
  let userProfile = { targetCulture: 'KR', preferredAspects: [] };
  let observer = null;
  let debounceTimer = null;
  let shadowHost = null;
  let shadowRoot = null;
  let lastProcessedKey = null;
  let currentAnalysisData = null;
  let currentIsMock = true;
  let retryTimers = [];
  let showAllReviews = false;

  // Data Spec v2 Engine States & Helpers
  let extensionData = null;
  let mvpPayload = null;
  let isDebugMode = false;
  let cachedCheesecakeReviews = null;

  async function loadCheesecakeReviews() {
    if (cachedCheesecakeReviews) return cachedCheesecakeReviews;
    try {
      const url = chrome.runtime.getURL('data/cheesecake_factory_reviews.json');
      const res = await fetch(url);
      cachedCheesecakeReviews = await res.json();
    } catch (e) {
      console.warn('[GMap Review Decoder] Failed to load cheesecake_factory_reviews.json:', e);
      cachedCheesecakeReviews = [];
    }
    return cachedCheesecakeReviews;
  }

  async function loadExtensionData() {
    if (extensionData) return extensionData;
    try {
      const url = chrome.runtime.getURL('data/extension_data.json');
      const res = await fetch(url);
      extensionData = await res.json();
      console.log(`[GMap Review Decoder] ✅ Loaded dataset extension_data.json (${Object.keys(extensionData?.places || {}).length} places, ${Object.keys(extensionData?.place_index || {}).length} index entries)`);
    } catch (e) {
      console.warn('[GMap Review Decoder] Failed to load extension_data.json:', e);
      extensionData = null;
    }
    return extensionData;
  }

  async function loadMvpPayload() {
    if (mvpPayload) return mvpPayload;
    try {
      const url = chrome.runtime.getURL('data/mvp_payload.json');
      const res = await fetch(url);
      mvpPayload = await res.json();
      console.log(`[GMap Review Decoder] ✅ Loaded payload dataset mvp_payload.json (${Object.keys(mvpPayload || {}).length} items)`);
    } catch (e) {
      console.warn('[GMap Review Decoder] Failed to load mvp_payload.json:', e);
      mvpPayload = null;
    }
    return mvpPayload;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function resolve(gmapId, googleRating) {
    const data = extensionData;
    if (!data || !gmapId) return { tier: 'none', entry: null, indexEntry: null };

    const indexEntry = data.place_index ? data.place_index[gmapId] : null;

    if (data.places && data.places[gmapId]) {
      return { tier: 'measured', entry: data.places[gmapId], indexEntry };
    }

    const category = indexEntry?.c;
    const catStat = (category && data.categories) ? data.categories[category] : undefined;
    if (catStat) {
      if (catStat.status === 'significant') {
        const corrected = clamp(googleRating + catStat.rel_gap, 0, 5);
        return { tier: 'category', entry: catStat, category, corrected, rel_gap: catStat.rel_gap, indexEntry };
      }
      if (catStat.status === 'not_significant') {
        return { tier: 'category_ns', entry: catStat, category, indexEntry };
      }
    }

    return { tier: 'none', entry: null, indexEntry };
  }

  function adjustedRating(gmapId, googleRating) {
    const data = extensionData;
    if (!data || !gmapId || typeof googleRating !== 'number' || isNaN(googleRating)) return null;
    const place = data.places ? data.places[gmapId] : null;
    if (place) return clamp(googleRating + place.rel_gap, 0, 5);
    const catName = data.place_index ? data.place_index[gmapId]?.c : null;
    const cat = catName && data.categories ? data.categories[catName] : null;
    if (cat && cat.status === 'significant') return clamp(googleRating + cat.rel_gap, 0, 5);
    return googleRating;
  }

  const ASPECT_THRESHOLDS = {
    t: { full: 30, min: 10 },
    s: { full: 30, min: 10 },
    v: { full: null, min: 10 },
    a: { full: null, min: 10 }
  };
  const ASPECT_LABELS = { t: 'Taste', s: 'Service', v: 'Value', a: 'Atmosphere' };
  const ASPECT_KEY_MAP = { '맛': 't', '서비스': 's', '가성비': 'v', '분위기': 'a' };

  function aspectTier(key, n) {
    const th = ASPECT_THRESHOLDS[key];
    if (!th || n < th.min) return 'none';
    if (th.full !== null && n < th.full) return 'partial';
    return 'full';
  }

  function renderAspectChip(indexEntry, key) {
    const n = indexEntry?.n?.[key] ?? 0;
    const tier = aspectTier(key, n);
    const z = indexEntry?.z?.[key];
    const label = ASPECT_LABELS[key] || key;

    if (tier === 'none') {
      return `<div class="aspect-chip aspect-none">${label} <span class="aspect-sub">–</span></div>`;
    }
    const zText = (z === undefined)
      ? 'avg'
      : (z > 0 ? `+${z.toFixed(2)}` : z.toFixed(2));
    const strength = (z === undefined) ? 'avg' : (z >= 0.3 ? 'strong' : z <= -0.3 ? 'weak' : 'mid');
    const faded = tier === 'partial' ? 'aspect-partial' : '';
    return `<div class="aspect-chip aspect-${strength} ${faded}" title="${n} mentions">
      ${label} <span class="aspect-z">${zText}</span>
      ${tier === 'partial' ? '<span class="aspect-sub">(ref)</span>' : ''}
    </div>`;
  }

  function zForFit(indexEntry, key) {
    const n = indexEntry?.n?.[key] ?? 0;
    if (n < ASPECT_THRESHOLDS[key]?.min) return 0;
    return indexEntry?.z?.[key] ?? 0;
  }

  function fitScore(indexEntry, chips) {
    if (!chips || chips.length === 0) return 0;
    const mappedKeys = chips.map(c => ASPECT_KEY_MAP[c] || c).filter(k => ASPECT_THRESHOLDS[k]);
    if (mappedKeys.length === 0) return 0;
    const zs = mappedKeys.map(k => zForFit(indexEntry, k));
    return zs.reduce((a, b) => a + b, 0) / mappedKeys.length;
  }

  function norm(x, all) {
    const valid = all.filter(v => typeof v === 'number' && !isNaN(v));
    if (valid.length === 0) return 0.5;
    const min = Math.min(...valid), max = Math.max(...valid);
    if (max === min) return 0.5;
    if (typeof x !== 'number' || isNaN(x)) return 0.5;
    return (x - min) / (max - min);
  }

  function sortScore(ratingNorm, fNorm) {
    const r = (ratingNorm === null || isNaN(ratingNorm)) ? 0.5 : ratingNorm;
    return 0.5 * r + 0.5 * fNorm;
  }

  function percentileRank(F, allF) {
    if (allF.length <= 1) return null;
    const countLE = allF.filter(f => f <= F).length;
    return Math.round((countLE / allF.length) * 100);
  }

  /**
   * 사용자 프로필(적응 취향 & 중요도)과 한국인 리뷰 본문 간의 키워드 매칭 분석
   */
  function analyzeReviewTasteMatches(reviewText, userProfile) {
    if (!reviewText || !userProfile) return [];
    const text = reviewText.toLowerCase();
    const matches = [];

    const tastePrefs = userProfile.tastePreferences || {};
    const impWeights = userProfile.importanceWeights || {};

    // 1. Spiciness (매운맛)
    if (tastePrefs.spiciness && tastePrefs.spiciness >= 3) {
      if (/(맵|매콤|매운|얼큰|신라면|spicy|hot)/i.test(text)) {
        matches.push('🌶️ Spiciness');
      }
    }
    // 2. Herbs & Spices (향신료)
    if (tastePrefs.herbs) {
      if (/(고수|향신료|특유|향이|향은|cilantro|herb)/i.test(text)) {
        matches.push('🌿 Herbs & Spices');
      }
    }
    // 3. Greasiness / Richness (기름진/느끼/담백)
    if (tastePrefs.greasiness) {
      if (/(느끼|기름|담백|진한|고소|greasy|heavy|rich)/i.test(text)) {
        matches.push('🥑 Richness');
      }
    }
    // 4. Local Authenticity (현지식/현지인)
    if (tastePrefs.authenticity) {
      if (/(현지|로컬|익숙|한국인|본토|authentic|local)/i.test(text)) {
        matches.push('🏮 Local Authenticity');
      }
    }

    // 5. High Importance Aspects (Weights >= 4)
    if (impWeights.s >= 4 && /(친절|불친절|직원|서비스|팁|waiter|service|tip)/i.test(text)) {
      matches.push('💁 Service');
    }
    if (impWeights.v >= 4 && /(가성비|비싸|싸|양|가격|price|portion|cheap|expensive)/i.test(text)) {
      matches.push('💰 Value');
    }
    if (impWeights.t >= 4 && /(맛|존맛|소스|간|짜|싱겁|delicious|tasty|flavor)/i.test(text)) {
      matches.push('🍱 Taste');
    }
    if (impWeights.a >= 4 && /(분위기|인테리어|뷰|매장|vibes|atmosphere)/i.test(text)) {
      matches.push('✨ Atmosphere');
    }

    return Array.from(new Set(matches));
  }

  function buildAnalysisFromResolved(gmapId, placeName, resolved, googleRating) {
    const payloadItem = mvpPayload ? mvpPayload[gmapId] : null;
    const hasPayload = !!payloadItem;
    const indexEntry = resolved.indexEntry || (extensionData?.place_index ? extensionData.place_index[gmapId] : null);
    let localRating = googleRating || 4.0;
    let koreanRating = null;
    let cultureSummary = '';
    let statusBadge = '';
    let relGap = null;

    if (!hasPayload) {
      console.log(`[GMap Review Decoder] ⚠️ [Payload Missing] No mvp_payload.json entry found for gmap_id: ${gmapId}`);
    }

    if (resolved.tier === 'measured') {
      const p = resolved.entry;
      localRating = googleRating || p.en_mean || 4.0;
      relGap = (p.rel_gap !== undefined && p.rel_gap !== null) ? p.rel_gap : null;
      koreanRating = relGap !== null ? clamp(localRating + relGap, 0, 5) : p.ko_mean;
      cultureSummary = `${p.name || placeName} (2021 Data): Korean avg ★${p.ko_mean.toFixed(1)} (${p.ko_n} reviews) vs English avg ★${p.en_mean.toFixed(1)} (${p.en_n} reviews). g-gap: ${relGap >= 0 ? '+' : ''}${relGap.toFixed(3)}`;
      if (p.status === 'significant') {
        statusBadge = 'Statistically Significant Difference';
      } else if (p.status === 'low_sample') {
        statusBadge = 'Low Sample Count (Reference Only)';
      } else {
        statusBadge = 'No Significant Difference';
      }
    } else if (resolved.tier === 'category') {
      relGap = resolved.rel_gap;
      koreanRating = clamp(localRating + relGap, 0, 5);
      const dir = relGap >= 0 ? 'less deducted' : 'more deducted';
      cultureSummary = `${resolved.category} is ${relGap >= 0 ? '+' : ''}${relGap.toFixed(2)} pts ${dir} compared to baseline. Google rating ★${localRating.toFixed(1)} + g(${relGap >= 0 ? '+' : ''}${relGap.toFixed(3)}) → Adjusted ★${koreanRating.toFixed(2)}.`;
      statusBadge = 'Category Level Adjustment';
    } else if (resolved.tier === 'category_ns') {
      relGap = 0;
      koreanRating = localRating;
      cultureSummary = `For ${resolved.category}, no statistically significant rating difference was found between Korean and English reviews.`;
      statusBadge = 'No Category Rating Gap';
    } else {
      koreanRating = null;
      relGap = null;
      cultureSummary = payloadItem?.s || 'No past dataset rating analysis available for this location.';
      statusBadge = 'No Analysis Data Available';
    }

    if (payloadItem?.s && resolved.tier !== 'measured') {
      cultureSummary = payloadItem.s;
    }

    return {
      gmap_id: gmapId,
      resolved: resolved,
      has_payload: hasPayload,
      place_name: placeName || (resolved.entry?.name) || 'Selected Place',
      address: 'Google Maps Location',
      category: resolved.category || resolved.entry?.category || indexEntry?.c || 'Point of Interest',
      local_rating: localRating,
      korean_rating: koreanRating,
      rel_gap: relGap,
      g_value: relGap,
      kr_avg: koreanRating,
      kr_count: resolved.entry?.ko_n || 0,
      hasKoreanData: koreanRating !== null,
      culture_summary: cultureSummary,
      status_badge: statusBadge,
      index_entry: indexEntry,
      metrics: {
        taste: {
          local: localRating.toFixed(1),
          kr: (koreanRating !== null && indexEntry?.z?.t !== undefined) ? clamp(localRating + indexEntry.z.t, 1, 5).toFixed(1) : (koreanRating ? koreanRating.toFixed(1) : '-')
        },
        service: {
          local: localRating.toFixed(1),
          kr: (koreanRating !== null && indexEntry?.z?.s !== undefined) ? clamp(localRating + indexEntry.z.s, 1, 5).toFixed(1) : (koreanRating ? koreanRating.toFixed(1) : '-')
        },
        value: {
          local: localRating.toFixed(1),
          kr: (koreanRating !== null && indexEntry?.z?.v !== undefined) ? clamp(localRating + indexEntry.z.v, 1, 5).toFixed(1) : (koreanRating ? koreanRating.toFixed(1) : '-')
        },
        atmosphere: {
          local: localRating.toFixed(1),
          kr: (koreanRating !== null && indexEntry?.z?.a !== undefined) ? clamp(localRating + indexEntry.z.a, 1, 5).toFixed(1) : (koreanRating ? koreanRating.toFixed(1) : '-')
        }
      },
      nuance_tags: [
        {
          tag_id: 1,
          literal: statusBadge || '💬 Cultural Review Analysis',
          meaning: cultureSummary
        }
      ]
    };
  }



  /**
   * 1. 사전 분석 데이터 구조의 가변성 대응 (Adapter Pattern)
   * @param {Object} pastData
   * @returns {{ pastKrCount: number, pastKrRating: number }}
   */
  function extractPastKrData(pastData) {
    if (!pastData) return { pastKrCount: 0, pastKrRating: 0 };
    const pastKrCount = pastData?.kr_count ?? pastData?.passed_min_reviews ?? pastData?.korean_review_count ?? (pastData?.korean_rating ? 15 : 0);
    const pastKrRating = pastData?.kr_avg ?? pastData?.avg_rating ?? pastData?.korean_rating ?? 0;
    return { pastKrCount: Number(pastKrCount) || 0, pastKrRating: Number(pastKrRating) || 0 };
  }

  /**
   * 2. 사전 분석 데이터(~21.09)와 실시간 DOM 데이터(21.09~)의 한국인 평점 가중 통합 계산 (Weighted Average)
   * @param {Object} pastData
   * @param {Array<{rating: number|null}>} liveKrReviews
   * @returns {{ combinedRating: number|null, totalKrCount: number, pastKrCount: number, liveKrCount: number, pastKrRating: number, liveKrRating: number|null }}
   */
  function calculateCombinedKrRating(pastData, liveKrReviews = []) {
    const { pastKrCount, pastKrRating } = extractPastKrData(pastData);

    const validLiveReviews = (liveKrReviews || []).filter(r => typeof r.rating === 'number' && !isNaN(r.rating) && r.rating > 0);
    const liveKrCount = validLiveReviews.length;
    const liveKrScoreSum = validLiveReviews.reduce((sum, r) => sum + r.rating, 0);
    const liveKrRating = liveKrCount > 0 ? parseFloat((liveKrScoreSum / liveKrCount).toFixed(1)) : null;

    const pastKrScoreSum = pastKrRating * pastKrCount;
    const totalKrCount = pastKrCount + liveKrCount;

    let combinedRating = null;
    if (totalKrCount > 0) {
      const rawAvg = (pastKrScoreSum + liveKrScoreSum) / totalKrCount;
      combinedRating = parseFloat(rawAvg.toFixed(1));
    }

    return {
      combinedRating,
      totalKrCount,
      pastKrCount,
      liveKrCount,
      pastKrRating,
      liveKrRating
    };
  }

  /**
   * 1. URL 패턴에서 gmap_id 정규식 추출
   * 히스토리/경로 이전 장소 파라미터 대신, URL 내 가장 마지막(현재 선택된 장소) gmap_id 파라미터 반환
   */
  function extractGMapId(url) {
    if (!url) return null;

    // URL 내 모든 0x...:0x... hex ID 파라미터 검색 (matchAll)
    const matches = Array.from(url.matchAll(/(0x[0-9a-fA-F]{12,18}:0x[0-9a-fA-F]{12,18})/gi));
    if (matches.length > 0) {
      // 복수 gmap_id 존재 시 (예: Jimmy John's 검색 후 CAVA 클릭 시) 가장 마지막(현재 장소) ID 선택
      return matches[matches.length - 1][1];
    }

    return null;
  }

  /**
   * DOM에서 장소 이름 추출 (스폰서/광고 라벨 예외 처리)
   */
  /**
   * document.title에서 장소 이름 추출 (Fallback)
   */
  function extractPlaceNameFromTitle() {
    const rawTitle = document.title || '';
    if (!rawTitle) return null;

    let clean = rawTitle.replace(/\s*-\s*(Google Maps|구글 지도).*$/i, '').trim();
    if (!clean || clean === 'Google Maps' || clean === '구글 지도') return null;

    const parts = clean.split(/\s+-\s+/);
    if (parts.length > 0 && parts[0].trim()) {
      const candidate = parts[0].trim();
      if (candidate && candidate !== 'Google Maps' && candidate !== '구글 지도' && candidate !== 'Reviews' && candidate !== '리뷰') {
        return candidate;
      }
    }
    return clean;
  }

  /**
   * DOM에서 장소 이름 추출 (스폰서/광고 라벨 및 리뷰 탭 헤더 예외 처리)
   */
  function extractPlaceNameFromDOM() {
    // 1. h1 셀렉터 탐색 (h1.DU314e, h1.fontTitleLarge, h1.DUwfxb, [role="main"] h1, h1)
    const h1Elements = Array.from(document.querySelectorAll('h1.DU314e, h1.fontTitleLarge, h1.DUwfxb, [role="main"] h1, h1'));

    for (const h1 of h1Elements) {
      let text = (h1.innerText || h1.textContent || '').trim();
      if (!text) continue;

      // 스폰서 및 광고 뱃지 키워드 정문화 (스폰서, Sponsor, Ad, 광고)
      let cleanName = text
        .replace(/^(스폰서|Sponsor|Ad|광고)\s*/gi, '')
        .replace(/\n(스폰서|Sponsor|Ad|광고)/gi, '')
        .replace(/(스폰서|Sponsor|Ad|광고)\s*/gi, '')
        .replace(/^리뷰\s*-\s*/gi, '')
        .replace(/^Reviews\s*(?:for)?\s*/gi, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (cleanName && cleanName !== 'Google Maps' && cleanName !== '구글 지도' && cleanName !== 'Reviews' && cleanName !== '리뷰' && cleanName.length > 1) {
        return cleanName;
      }
    }

    // 2. Fallback 클래스 탐색
    const titleEl = document.querySelector('.DUwfxb, .fontHeadlineLarge, .DU314e, .hfN2eb');
    if (titleEl) {
      let cleanName = (titleEl.innerText || titleEl.textContent || '')
        .replace(/^(스폰서|Sponsor|Ad|광고)\s*/gi, '')
        .replace(/\n(스폰서|Sponsor|Ad|광고)/gi, '')
        .replace(/(스폰서|Sponsor|Ad|광고)\s*/gi, '')
        .replace(/^리뷰\s*-\s*/gi, '')
        .replace(/^Reviews\s*(?:for)?\s*/gi, '')
        .replace(/\n+/g, ' ')
        .trim();
      if (cleanName && cleanName !== 'Google Maps' && cleanName !== '구글 지도' && cleanName !== 'Reviews' && cleanName !== '리뷰') {
        return cleanName;
      }
    }

    // 3. Fallback to document.title
    return extractPlaceNameFromTitle();
  }

  /**
   * 주소 텍스트 정화 (Google Material Symbols 아이콘 폰트 특수문자 및 네모 박스 제거)
   */
  function cleanAddressText(str) {
    if (!str) return '';
    return str
      .replace(/[\uE000-\uF8FF]/g, '') // Google Symbols / Font Awesome Private Use Area 특수 기호 제거
      .replace(/^[^\w\d\uAC00-\uD7A3가-힣]+/, '') // 문장 앞단 아이콘 기호 제거
      .replace(/^(주소|Address):\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * DOM에서 장소 주소 추출
   * (Google Maps data-item-id="address" 버튼 및 aria-label / .Io6YTe 기반)
   */
  function extractAddressFromDOM() {
    try {
      // 1. data-item-id="address" 및 data-tooltip="주소 복사" 셀렉터 우선 검사
      const addressBtn = document.querySelector('button[data-item-id="address"], [data-item-id="address"], button[data-tooltip="주소 복사"], button[data-tooltip="Copy address"]');
      if (addressBtn) {
        // .Io6YTe 텍스트 엘리먼트 우선 선택
        const ioEl = addressBtn.querySelector('.Io6YTe');
        if (ioEl && ioEl.textContent.trim()) {
          const cleaned = cleanAddressText(ioEl.textContent);
          if (cleaned) return cleaned;
        }

        // 일반 하위 텍스트 엘리먼트 (.rogA2c, div)
        const textEl = addressBtn.querySelector('.rogA2c, div');
        if (textEl && textEl.textContent.trim()) {
          const cleaned = cleanAddressText(textEl.textContent);
          if (cleaned) return cleaned;
        }

        // aria-label 파싱 ("주소: 3201 S Hoover St..." 또는 "Address: 3201 S Hoover St...")
        const ariaLabel = addressBtn.getAttribute('aria-label') || '';
        if (ariaLabel) {
          const cleaned = cleanAddressText(ariaLabel);
          if (cleaned) return cleaned;
        }
      }

      // 2. aria-label 기반 Fallback 검색 ([aria-label*="주소:"], [aria-label*="Address:"])
      const ariaEl = document.querySelector('[aria-label*="주소:"], [aria-label*="Address:"]');
      if (ariaEl) {
        const label = ariaEl.getAttribute('aria-label') || '';
        const cleaned = cleanAddressText(label);
        if (cleaned) return cleaned;
      }
    } catch (e) {
      console.log('[GMap Review Decoder] DOM 주소 추출 중 오류:', e);
    }
    return null;
  }

  /**
   * DOM에서 장소 카테고리 추출
   * (Google Maps button.DkEaL 및 jsaction*="category" 기반)
   */
  function extractCategoryFromDOM() {
    try {
      const categoryBtns = Array.from(document.querySelectorAll('button.DkEaL, button[jsaction*="category"]'));
      if (categoryBtns.length > 0) {
        const categories = categoryBtns
          .map(btn => (btn.innerText || btn.textContent || '').trim())
          .filter(text => text && text.length > 0 && !text.includes('·'));
        if (categories.length > 0) {
          return Array.from(new Set(categories)).join(', ');
        }
      }
    } catch (e) {
      console.log('[GMap Review Decoder] DOM 카테고리 추출 중 오류:', e);
    }
    return null;
  }

  /**
   * 다국어 aria-label에서 별점 점수(1.0~5.0) 추출
   * 예: "4 stars", "4.0 out of 5 stars", "Rated 4 out of 5", "별표 5개 중 4개", "4/5", "4점", "4개"
   */
  function parseRatingFromAriaLabel(ariaLabel) {
    if (!ariaLabel) return null;

    // 한국어 패턴: "별표 5개 중 4개" -> "중 4개"
    const krJungMatch = ariaLabel.match(/중\s*(\d(\.\d)?)/);
    if (krJungMatch) {
      const val = parseFloat(krJungMatch[1]);
      if (!isNaN(val) && val >= 1.0 && val <= 5.0) return val;
    }

    // 다국어 패턴 (영어/한국어 등): "4 stars", "4.0 out of 5 stars", "Rated 4 out of 5", "4/5", "4개", "4점"
    const match = ariaLabel.match(/(\d(\.\d)?)\s*(stars|out of|\/|개|점)/i) || ariaLabel.match(/(\d(\.\d)?)/);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val >= 1.0 && val <= 5.0) return val;
    }

    return null;
  }

  /**
   * DOM에서 실제 구글 맵스 현지 평점(예: "4.7") 파싱 (다국어 지원 & fontDisplayLarge 대응)
   */
  function extractRatingFromDOM() {
    try {
      // 우선순위 1: 구글 맵스 장소 상세 패널 컨테이너
      const mainPane = document.querySelector('[role="main"], #QA0Sfe, .m6QEdf');
      const root = mainPane || document;

      // 1-1. 최상위 장소 헤더/리뷰 요약 전용 클래스 검사 (fontDisplayLarge, div.F72Y3c, span.ceW3ed 등)
      const primaryRatingEls = Array.from(root.querySelectorAll('div.fontDisplayLarge, span.fontDisplayLarge, .fontDisplayLarge, div.F72Y3c, span.ceW3ed'));
      for (const el of primaryRatingEls) {
        const val = parseFloat((el.textContent || '').trim());
        if (!isNaN(val) && val >= 1.0 && val <= 5.0) return val;
      }

      // 1-2. 장소 헤더 컨테이너 내부의 aria-label 기반 평점 추출 (개별 리뷰 카드 내 별점 제외)
      const ariaElements = Array.from(root.querySelectorAll('div.F72Y3c [aria-label], div.fontBodyMedium [aria-label], [aria-label*="별표"], [aria-label*="star"], [aria-label*="stars"], [aria-label*="out of"], [aria-label*="Rated"]'));
      for (const ariaEl of ariaElements) {
        // 개별 리뷰 카드(div.jftiEf 등) 내부의 별점은 전체 장소 평점이 아니므로 건너뜀
        if (ariaEl.closest && ariaEl.closest('div.jftiEf, div[data-review-id], [role="article"]')) continue;

        const label = ariaEl.getAttribute('aria-label') || '';
        const val = parseRatingFromAriaLabel(label);
        if (val !== null) return val;
      }

      // 1-3. span[aria-hidden="true"] 중 소수점 평점 형태(/^[1-5]\.\d$/) 검색 (개별 리뷰 카드 제외)
      const spanElements = Array.from(root.querySelectorAll('span[aria-hidden="true"], span'));
      for (const span of spanElements) {
        if (span.closest && span.closest('div.jftiEf, div[data-review-id], [role="article"]')) continue;
        const text = span.textContent.trim();
        if (/^[1-5]\.\d$/.test(text)) {
          const val = parseFloat(text);
          if (!isNaN(val) && val >= 1.0 && val <= 5.0) return val;
        }
      }
    } catch (e) {
      console.log('[GMap Review Decoder] DOM 평점 추출 중 오류:', e);
    }
    return null;
  }

  /**
   * 구글 맵스 시스템 UI 키워드 및 메타데이터 제거 (Clean/Text Stripping)
   * @param {string} rawText
   * @param {string} author
   * @returns {string} pureText
   */
  function cleanReviewText(rawText, author = '') {
    if (!rawText) return '';

    console.log(`[cleanReviewText] 🧼 세탁 시작 - 입력 원본:`, JSON.stringify(rawText));

    let pureText = rawText.replace(/\u00A0/g, ' ');

    if (author && author !== '익명') {
      pureText = pureText.replace(author, '');
    }

    // 1. 프로필 메타데이터, 작성일, 시스템 뱃지 및 라벨 제거
    pureText = pureText
      .replace(/^[\s\S]*?(?:수정일:|Edited\s*)?\b(?:\d+|a|an)\s*(?:년|개월|주|일|시간|years?|months?|weeks?|days?|hours?|mins?|minutes?)\s*(?:전|ago)\s*/gi, '')
      .replace(/^(신규|New)\s*/gi, '')
      .replace(/(?:^|\s+)(?:신규|New)(?=\s+|$)/gi, ' ')
      .replace(/지역 가이드\s*·\s*리뷰\s*\d+개(\s*·\s*사진\s*\d+장)?/gi, '')
      .replace(/(?:지역 가이드|Local Guide)\s*(?:·\s*)?/gi, '')
      .replace(/[\d,]+\s*(?:개|장|reviews?|photos?|사진)(?:\s*·\s*)?/gi, '');
    console.log(`[cleanReviewText]   ├ Step 1 (헤더/작성일 제거 후):`, JSON.stringify(pureText));

    // 2. 리뷰 하단 액션 블록 (\n\n1\n\n공유 -,  1  공유 -, 좋아요, 공유 등) 전면 절단
    // 주의: 한글 단어(공유, 좋아요) 뒤에는 \b 가 동작하지 않으므로 (?![가-힣a-zA-Z]) 사용
    pureText = pureText
      .replace(/(?:\r?\n+|\s+|[\uE000-\uF8FF\u2600-\u27BF\uE800-\uE8FF\uEA00-\uEAFF])*(?:|)?\s*(?:\d+\s*)?(?:좋아요\s+)?(?:\d+\s*)?(?:공유|Share)(?![가-힣a-zA-Z])[\s\S]*$/i, '')
      .replace(/(?:\r?\n+|\s+|[\uE000-\uF8FF\u2600-\u27BF\uE800-\uE8FF\uEA00-\uEAFF])*(?:|)?\s*(?:좋아요|Like)(?![가-힣a-zA-Z])[\s\S]*$/i, '');
    console.log(`[cleanReviewText]   ├ Step 2 (하단 액션버튼 절단 후):`, JSON.stringify(pureText));

    // 3. UI 버튼, 설문/폼 항목 (자세히 보기, 식사 유형, 대기 시간 등) 절단 (Cut-off)
    const uiCutoffRegex = /(?:자세히 보기|간단히 보기|업체 대표 응답|식사 유형|주문 유형|음식점 유형|점심 식사|저녁 식사|아침 식사|브런치|야식|매장 내 식사|테이크아웃|배달|포장|1인당 가격|가격대|음식:|서비스:|분위기:|대기 시간|소음 수준|그룹 크기|주차 공간|주차 옵션|추천 메뉴|방문 목적|Google 제공 번역|Google 제공|Google 번역|More|Less|See translation|See original|Translated by Google|Rate and review|Response from the owner|Owner response|Price per person|Food:|Service:|Atmosphere:)/i;

    if (uiCutoffRegex.test(pureText)) {
      pureText = pureText.split(uiCutoffRegex)[0];
    }
    console.log(`[cleanReviewText]   ├ Step 3 (UI 버튼/폼 절단 후):`, JSON.stringify(pureText));

    // 4. 줄바꿈 및 연속 공백 일차 정돈 (모든 줄바꿈을 공백으로 통일)
    pureText = pureText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

    // 5. 문장 끝단 잔여 키워드, 특수문자, 대시(-) 및 단독 숫자 찌꺼기 2중 제거
    pureText = pureText
      .replace(/(?:식사 유형|주문 유형|음식점 유형|1인당 가격|대기 시간)\s*(?:점심 식사|저녁 식사|아침 식사|브런치|야식|매장 내 식사|테이크아웃|배달|포장)?/gi, '')
      .replace(/(?:점심 식사|저녁 식사|아침 식사|브런치|야식|매장 내 식사|테이크아웃|배달|포장)/gi, '')
      .replace(/(?:수정일:|Edited:)/gi, '')
      .replace(/\b\d+:\d+\b/g, '')
      .replace(/\+\d+/g, '')
      .replace(/[\s\-\u2010-\u2015\uE000-\uF8FF\u2600-\u27BF]+$/g, '')
      .replace(/\s+\d+\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`[cleanReviewText]   ├ Step 5 (잔여 찌꺼기/대시 제거 후):`, JSON.stringify(pureText));

    // 6. 세탁 후 빈 문자열이거나 의미 없는 특수문자/숫자뿐이라면 빈 값("") 처리
    if (!pureText || !/[a-zA-Z\uAC00-\uD7A3]/.test(pureText)) {
      pureText = '';
    }

    console.log(`[cleanReviewText] ✨ 세탁 완료 - 최종 결과:`, JSON.stringify(pureText));

    return pureText;
  }

  /**
   * 1. 리뷰 카드 DOM이 원문 한국어 리뷰인지 판별 (진단 로그 포함)
   */
  function isNativeKoreanReview(reviewEl, logReason = false) {
    if (!reviewEl) return false;

    const fullText = (reviewEl.innerText || reviewEl.textContent || '').trim();
    if (!fullText) return false;

    // 외국어 리뷰가 한국어로 자동 번역된 명확한 뱃지/문구 제외 (한국어 & 영어 UI 지원)
    const machineTranslationBadges = [
      'Google 제공 번역',
      'Google 제공',
      'Google에서 번역한 내용',
      'Google에서 번역함',
      'Google 번역됨',
      'Google에서 번역',
      'Google 번역',
      '에서 번역됨',
      '자동 번역됨',
      '원본 보기',
      '원본(',
      'Translated by Google',
      'See original'
    ];

    const lowerText = fullText.toLowerCase();
    for (const keyword of machineTranslationBadges) {
      if (lowerText.includes(keyword.toLowerCase())) {
        if (logReason) {
          console.log(`  [KR Review Filter ❌] 제외됨 (이유: 한국어 기계번역 뱃지 '${keyword}' 포함)`);
          console.log(`    └ [미리보기]: "${fullText.substring(0, 80).replace(/\n/g, ' ')}..."`);
        }
        return false;
      }
    }

    // 작성자 닉네임 추출
    let author = '익명';
    const authorEl = reviewEl.querySelector('.d4r55, button.alhrr, .X43fe-geL2f-haAclf, [class*="author"]');
    if (authorEl && authorEl.textContent.trim()) {
      author = authorEl.textContent.trim();
    }

    // 주변 장소 디렉토리 리스트 카드 예외 처리 (영업 종료/영업 시작 등 매장 정보 포함 및 리뷰 작성자 부재)
    const isStoreDirectoryCard = (author === '익명') && /(?:영업\s*종료|영업\s*시작|곧\s*영업|체육관|음식점|전문점|카페|베이커리|\d+\(\d+\)\s*·\s*\$\$)/i.test(fullText);
    if (isStoreDirectoryCard) {
      if (logReason) {
        console.log(`  [KR Review Filter ❌] 제외됨 (이유: 주변 장소/디렉토리 리스트 카드)`);
        console.log(`    └ [미리보기]: "${fullText.substring(0, 80).replace(/\n/g, ' ')}..."`);
      }
      return false;
    }

    // 리뷰 본문 전용 엘리먼트(.wiYeB 등) 타겟팅 파싱 (헤더/하단 버튼 블록 원천 분리)
    const bodyEl = reviewEl.querySelector('.wiYeB, span.wiYeB, div.My8ZBd, .KT6Ld, [class*="text"], span[lang]');
    const rawBodyText = bodyEl ? (bodyEl.innerText || bodyEl.textContent || '').trim() : fullText;
    const pureText = cleanReviewText(rawBodyText, author);

    // 순수 본문(pureText) 검사 후 한글 유니코드 존재 여부 확인
    const hasKoreanChar = /[\uAC00-\uD7A3]/.test(pureText);
    if (!hasKoreanChar) {
      if (logReason) {
        console.log(`  [KR Review Filter ❌] 제외됨 (이유: UI 키워드 제거 후 순수 본문에 한글 유니코드 미포함)`);
        console.log(`    └ [원본 텍스트]: "${fullText.substring(0, 80).replace(/\n/g, ' ')}..."`);
        console.log(`    └ [세탁 후 본문]: "${pureText}"`);
      }
      return false;
    }

    if (logReason) {
      console.log(`  [KR Review Filter ✅] 통과됨 (한국어 원문 리뷰 탐지 성공)`);
    }

    return true;
  }

  /**
   * 2. DOM에서 순수 한국인 리뷰 카드 파싱 (상세 진단 로그 포함)
   * @returns {Array<{author: string, rating: number|null, text: string}>}
   */
  function extractNativeKoreanReviewsFromDOM() {
    const reviews = [];
    const seenKeys = new Set();

    try {
      // 리뷰 카드(div.jftiEf, div[data-review-id])가 존재하는 '리뷰 전용 스크롤 DOM 컨테이너'만 정밀 타겟팅
      let reviewContainer = null;
      const sampleCard = document.querySelector('div.jftiEf, div[data-review-id]');
      if (sampleCard) {
        let curr = sampleCard.parentElement;
        while (curr && curr !== document.body) {
          if (curr.classList.contains('m6QEdf') || curr.getAttribute('role') === 'region' || curr.getAttribute('tabindex') === '-1') {
            reviewContainer = curr;
            break;
          }
          curr = curr.parentElement;
        }
      }

      const root = reviewContainer || document.querySelector('[role="main"]') || document;

      // 구글 맵스 순수 리뷰 카드 선택자 (jftiEf, data-review-id)
      let rawCards = Array.from(root.querySelectorAll('div.jftiEf, div[data-review-id]'));

      // Fallback: jftiEf 클래스가 탐지되지 않는 경계선 경우 대체 선택자 사용
      if (rawCards.length === 0) {
        rawCards = Array.from(root.querySelectorAll('div.WMD5W, div.xiA35c, [role="article"]'));
      }

      // 중첩 child 요소 제거 (상위 jftiEf 카드만 필터링하여 중복 파싱 차단)
      const reviewCards = rawCards.filter(card => {
        const parentCard = card.parentElement ? card.parentElement.closest('div.jftiEf, div[data-review-id]') : null;
        return !parentCard;
      });

      console.log(`[KR Reviews Diagnostics] DOM 내 리뷰 카드 후보 탐지: 총 ${reviewCards.length}개 발견`);

      if (reviewCards.length === 0) {
        console.log(`[KR Reviews Diagnostics] ⚠️ 현재 DOM에서 리뷰 카드 요소를 찾지 못함 (DOM 미렌더링 상태 또는 선택자 미매칭)`);
      }

      reviewCards.forEach((card, index) => {
        console.log(`--------------------------------------------------`);
        console.log(`[KR Review #${index + 1} 검사 중]`);

        if (!isNativeKoreanReview(card, true)) return;

        // 작성자 닉네임 추출
        let author = '익명';
        const authorEl = card.querySelector('.d4r55, button.alhrr, .X43fe-geL2f-haAclf, [class*="author"]');
        if (authorEl && authorEl.textContent.trim()) {
          author = authorEl.textContent.trim();
        }

        // 별점 점수 추출 (다국어 aria-label 파싱)
        let rating = null;
        const ratingEl = card.querySelector('span.kvMYJc[aria-label], span[role="img"][aria-label], [aria-label*="별표"], [aria-label*="star"], [aria-label*="stars"], [aria-label*="out of"], [aria-label*="Rated"]');
        if (ratingEl) {
          const ariaText = ratingEl.getAttribute('aria-label') || '';
          rating = parseRatingFromAriaLabel(ariaText);
        }

        const rawCardText = (card.innerText || card.textContent || '').trim();
        // 리뷰 본문 전용 엘리먼트(.wiYeB 등) 타겟팅 파싱 (하단 버튼/작성자 헤더 원천 분리)
        const bodyEl = card.querySelector('.wiYeB, span.wiYeB, div.My8ZBd, .KT6Ld, [class*="text"], span[lang]');
        const rawBodyText = bodyEl ? (bodyEl.innerText || bodyEl.textContent || '').trim() : rawCardText;

        // 텍스트 정화 (cleanReviewText 사용)
        const text = cleanReviewText(rawBodyText, author);

        if (!text || !/[\uAC00-\uD7A3]/.test(text)) {
          console.log(`  [KR Review Filter ❌] 제외됨 (이유: 세탁 후 한글 본문 소실)`);
          return;
        }

        // 상대 작성일자 추출 (예: 7개월 전 / 7 months ago / 수정일: 2주 전)
        let date = '';
        const dateEl = card.querySelector('.r7bNeb, span.r7bNeb, [class*="date"], .xRvfT');
        if (dateEl && dateEl.textContent.trim()) {
          date = dateEl.textContent.trim();
        } else {
          const dateMatch = rawCardText.match(/(?:수정일:|Edited\s*)?\b(?:\d+|a|an)\s*(?:년|개월|주|일|시간|years?|months?|weeks?|days?|hours?|mins?|minutes?)\s*(?:전|ago)/i);
          if (dateMatch) {
            date = dateMatch[0].trim();
          }
        }

        console.log(`  👤 작성자: ${author} ${date ? `(${date})` : ''} | 별점: ★ ${rating || '미기재'}`);
        console.log(`  ├ [원본 DOM]:`, JSON.stringify(rawBodyText));
        console.log(`  └ [세탁 후]:`, JSON.stringify(text));

        // 중복 방지 키 생성 (author + text 30자)
        const uniqueKey = `${author}_${text.substring(0, 30)}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          reviews.push({
            author,
            rating,
            text,
            date
          });
        }
      });

      console.log(`--------------------------------------------------`);
      console.log(`[KR Reviews Summary] 최종 추출된 한국인 원문 리뷰: 총 ${reviews.length}건`);
      if (reviews.length > 0) {
        console.log(`[KR Reviews Details]:`, reviews);
      }

      if (currentAnalysisData) {
        const prevReviewsStr = JSON.stringify(currentAnalysisData.native_korean_reviews || []);
        const newReviewsStr = JSON.stringify(reviews);
        const prevRating = currentAnalysisData.korean_rating;

        currentAnalysisData.native_korean_reviews = reviews;

        // 실시간 추출된 한국인 원문 리뷰가 존재하는 경우에만 가중결합 수행
        if (reviews.length > 0) {
          const combined = calculateCombinedKrRating(currentAnalysisData, reviews);
          if (combined.combinedRating !== null) {
            currentAnalysisData.korean_rating = combined.combinedRating;
            currentAnalysisData.total_kr_count = combined.totalKrCount;
            currentAnalysisData.past_kr_count = combined.pastKrCount;
            currentAnalysisData.live_kr_count = combined.liveKrCount;
            currentAnalysisData.hasKoreanData = true;
            currentAnalysisData.isRealKoreanReviewsReflected = true;

            if (combined.pastKrCount > 0 && combined.liveKrCount > 0) {
              currentAnalysisData.culture_summary = `Weighted average combining ${combined.pastKrCount} past reviews (★${combined.pastKrRating}) and ${combined.liveKrCount} live reviews (★${combined.liveKrRating}) → combined score ★${combined.combinedRating}.`;
            } else if (combined.liveKrCount > 0) {
              currentAnalysisData.culture_summary = `Live-extracted native Korean reviews: ${combined.liveKrCount} reviews averaged at ★${combined.combinedRating}.`;
            }
          }
        } else {
          // 실시간 한국어 리뷰가 0건인 경우, resolved 규칙(업종 보정/실측)에 의해 계산된 보정 평점을 훼손하지 않고 100% 보존
          if (currentAnalysisData.resolved) {
            if (currentAnalysisData.resolved.tier === 'category') {
              currentAnalysisData.korean_rating = clamp(currentAnalysisData.local_rating + currentAnalysisData.resolved.rel_gap, 0, 5);
            } else if (currentAnalysisData.resolved.tier === 'measured') {
              currentAnalysisData.korean_rating = currentAnalysisData.resolved.entry.ko_mean;
            }
          }
        }

        const isDataChanged = (prevReviewsStr !== newReviewsStr) || (prevRating !== currentAnalysisData.korean_rating);

        if (isDataChanged && shadowRoot) {
          renderSidebar(currentAnalysisData, currentIsMock);
        }
      }
    } catch (e) {
      console.error('[KR Reviews] 리뷰 파싱 중 오류:', e);
    }

    return reviews;
  }

  /**
   * DOM에서 파싱한 실제 평점을 analysis data에 적용 및 한국인 보정 평점 재계산
   */
  function applyDOMRating(data) {
    if (!data) return false;
    const rawRating = extractRatingFromDOM();
    if (rawRating !== null) {
      const oldLocal = data.local_rating;
      data.local_rating = rawRating;

      // v2 rel_gap (g_value) 기반 정확한 보정 평점 재계산 (구글 실시간 평점 + g)
      if (typeof data.rel_gap === 'number') {
        data.korean_rating = clamp(rawRating + data.rel_gap, 0, 5);
      } else if (data.resolved) {
        if (data.resolved.tier === 'measured') {
          data.korean_rating = data.resolved.entry.ko_mean;
        } else if (data.resolved.tier === 'category') {
          data.korean_rating = clamp(rawRating + data.resolved.rel_gap, 0, 5);
        }
      }

      data.isDOMParsed = true;
      console.log(`[GMap Review Decoder] 실제 DOM 평점 파싱 완료: ${rawRating} (g: ${data.rel_gap}), KR Adjusted: ${data.korean_rating}`);
      return true;
    }
    return false;
  }

  function clearRetryTimers() {
    retryTimers.forEach(id => clearTimeout(id));
    retryTimers = [];
  }

  function scheduleRatingRetry(data, isMock) {
    clearRetryTimers();
    // DOM 로딩 지연 대응: 300ms, 700ms, 1200ms, 2000ms, 3500ms 시점에 retry
    const delays = [300, 700, 1200, 2000, 3500];
    delays.forEach(delay => {
      const timerId = setTimeout(() => {
        if (!isEnabled || !shadowRoot) return;
        const currentDOMRating = extractRatingFromDOM();
        if (currentDOMRating !== null && data.local_rating !== currentDOMRating) {
          applyDOMRating(data);
          renderSidebar(data, isMock);
        }
        extractNativeKoreanReviewsFromDOM();

        // 장소명, 주소 또는 카테고리가 뒤늦게 렌더링된 경우 업데이트
        const freshAddr = extractAddressFromDOM();
        let isAddrUpdated = false;
        if (freshAddr && (!data.address || data.address === 'Google Maps Location' || data.address === 'Google Maps Place')) {
          data.address = freshAddr;
          isAddrUpdated = true;
        }

        const freshCat = extractCategoryFromDOM();
        if (freshCat && (!data.category || data.category === 'Restaurant, Point of Interest')) {
          data.category = freshCat;
          isAddrUpdated = true;
        }

        if (data.place_name && data.place_name.startsWith('장소 (')) {
          const freshName = extractPlaceNameFromDOM();
          if (freshName && !freshName.startsWith('장소 (')) {
            data.place_name = freshName;
            currentPlaceName = freshName;
            isAddrUpdated = true;
          }
        }

        if (isAddrUpdated) {
          renderSidebar(data, isMock);
        }
      }, delay);
      retryTimers.push(timerId);
    });
  }

  /**
   * 리뷰 카드를 기준으로 실제 overflow-y 스크롤이 발동하는 부모 DOM 컨테이너를 탐색
   */
  function getReviewScrollParent() {
    const card = document.querySelector('div.jftiEf, div[data-review-id], div.My8ZBd, div.gWSYe, [role="article"]');
    if (card) {
      let curr = card.parentElement;
      while (curr && curr !== document.body) {
        const style = window.getComputedStyle(curr);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') || (curr.scrollHeight > curr.clientHeight && curr.clientHeight > 0)) {
          return curr;
        }
        curr = curr.parentElement;
      }
    }

    // Fallback: 구글 맵스 주요 스크롤 대상 검색
    return document.querySelector('div.m6QEdf[role="region"], div.m6QEdf[tabindex="-1"], div.m6QEdf.aria-container, #QA0Sfe');
  }

  /**
   * 구글 지도 네트워크 응답 후 DOM에 리뷰 카드(div.jftiEf 등)가 실제 로드될 때까지 100ms 간격으로 비동기 대기
   */
  async function waitForReviewCards(timeoutMs = 2500) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const cards = document.querySelectorAll('div.jftiEf, div[data-review-id], div.My8ZBd, div.gWSYe, [role="article"]');
      if (cards.length > 0) {
        console.log(`[GMap Review Decoder] 리뷰 카드 DOM 로드 완료 (${cards.length}개 발견, 소요시간: ${Date.now() - startTime}ms)`);
        return true;
      }
      await new Promise(res => setTimeout(res, 100));
    }
    console.log('[GMap Review Decoder] 리뷰 카드 DOM 로드 타임아웃');
    return false;
  }

  /**
   * 사용자가 '리뷰 더 불러오기' 버튼을 클릭했을 때만 작동하는 수동 수집 및 정밀 스크롤 함수
   */
  async function autoFetchKoreanReviews(btnElement = null) {
    try {
      console.log('[GMap Review Decoder] 📥 수동 리뷰 더보기(Fetch More) 실행...');

      if (btnElement) {
        btnElement.disabled = true;
        btnElement.dataset.originalText = btnElement.innerHTML;
        btnElement.innerHTML = '⏳ 수집 중...';
      }

      // 1. 구글 맵스 개요(Overview) 탭에서 리뷰(Reviews) 탭으로 전환 시도
      const tabs = Array.from(document.querySelectorAll('button[role="tab"], div[role="tab"], button[data-tab-index], button'));
      const reviewsTab = tabs.find(el => {
        const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        return (text.includes('reviews') || text.includes('리뷰')) && !text.includes('decoder') && !text.includes('수집');
      });

      if (reviewsTab) {
        reviewsTab.click();
        reviewsTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        console.log('[GMap Review Decoder] 리뷰 탭 클릭 완료. 구글 지도 AJAX 응답 및 DOM 렌더링 대기 중...');
      }

      // 2. 구글 지도 네트워크 통신 및 리뷰 카드 DOM 출현 대기 (최대 2.5초 폴링)
      await waitForReviewCards(2500);

      // 3. 리뷰 카드가 DOM에 생성된 후, 실제 스크롤 부모 컨테이너 탐지 및 스크롤 다운 실행
      const scrollParent = getReviewScrollParent();
      if (scrollParent) {
        scrollParent.scrollTop = scrollParent.scrollHeight;
        scrollParent.dispatchEvent(new Event('scroll', { bubbles: true }));
        scrollParent.dispatchEvent(new WheelEvent('wheel', { deltaY: 3000, bubbles: true }));
        console.log('[GMap Review Decoder] 1차 스크롤 다운 완료 (target:', scrollParent.className, ')');
      }

      // 4. 600ms 후 2차 추가 스크롤 및 실시간 리뷰 추출
      await new Promise(resolve => setTimeout(resolve, 600));

      const scrollParent2 = getReviewScrollParent();
      if (scrollParent2) {
        scrollParent2.scrollTop = scrollParent2.scrollHeight;
        scrollParent2.dispatchEvent(new Event('scroll', { bubbles: true }));
      }

      const extracted = extractNativeKoreanReviewsFromDOM();
      console.log(`[GMap Review Decoder] 수동 수집 완료: 총 ${extracted.length}건 수집됨`);

      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = btnElement.dataset.originalText || '📥 Load More';
      }
    } catch (err) {
      console.warn('[GMap Review Decoder] Error while loading more reviews:', err);
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerHTML = '📥 Load More';
      }
    }
  }

  async function fetchCulturalAnalysis(gmapId, placeName) {
    // 1. Team-provided extension_data.json & mvp_payload.json first
    await loadExtensionData();
    await loadMvpPayload();

    const googleRating = extractRatingFromDOM() || 4.0;

    if (extensionData && gmapId) {
      const resolved = resolve(gmapId, googleRating);
      
      if (resolved.tier === 'measured') {
        console.log(`[GMap Review Decoder] 🎯 [Tier 1 Measured Data Used] gmap_id: ${gmapId}, place: "${resolved.entry.name}", ko_mean: ${resolved.entry.ko_mean}, en_mean: ${resolved.entry.en_mean}`);
      } else if (resolved.tier === 'category') {
        console.log(`[GMap Review Decoder] 📊 [Tier 2 Category Estimate Used] gmap_id: ${gmapId}, category: "${resolved.category}", rel_gap: ${resolved.rel_gap}, adjusted: ${resolved.corrected}`);
      } else if (resolved.tier === 'category_ns') {
        console.log(`[GMap Review Decoder] ℹ️ [Tier 2 Category (No Significant Diff)] category: "${resolved.category}"`);
      } else {
        console.log(`[GMap Review Decoder] 🚫 [Tier 3 No Past Data Available] gmap_id: ${gmapId}`);
      }

      if (mvpPayload && mvpPayload[gmapId]) {
        console.log(`[GMap Review Decoder] 📦 [Payload Active] Found s text in mvp_payload.json for gmap_id: ${gmapId}`);
      } else {
        console.log(`[GMap Review Decoder] ⚠️ [Payload Missing] No s text in mvp_payload.json for gmap_id: ${gmapId}`);
      }

      const analysisData = buildAnalysisFromResolved(gmapId, placeName, resolved, googleRating);

      // Check Debug Mode Override for The Cheesecake Factory
      if (isDebugMode && (gmapId === '0x80c2b92fc2d303c3:0x17a5bf3c12b6eeb5' || (placeName && placeName.toLowerCase().includes('cheesecake factory')))) {
        const csvReviews = await loadCheesecakeReviews();
        if (csvReviews && csvReviews.length > 0) {
          analysisData.native_korean_reviews = csvReviews;
          analysisData.is_debug_override = true;
          console.log(`[GMap Review Decoder] 🐞 [Debug Mode Active] Overridden Cheesecake Factory reviews with ${csvReviews.length} CSV items.`);
        }
      }

      return { data: analysisData, isMock: false };
    }

    // 2. FastAPI backend fallback (if running)
    const backendUrl = `http://localhost:8000/api/analyze`;
    const queryParam = gmapId ? `gmap_id=${encodeURIComponent(gmapId)}` : `place_name=${encodeURIComponent(placeName || '')}`;
    const targetUrl = `${backendUrl}?${queryParam}&target_culture=${encodeURIComponent(targetCulture)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { data, isMock: false };
      }
    } catch (e) {
      console.log('[GMap Review Decoder] FastAPI backend disconnected.');
    }

    // Fallback: Dataset resolution (No Mock Data)
    const fallbackResolved = resolve(gmapId, googleRating);
    const fallbackData = buildAnalysisFromResolved(gmapId, placeName, fallbackResolved, googleRating);

    if (isDebugMode && (gmapId === '0x80c2b92fc2d303c3:0x17a5bf3c12b6eeb5' || (placeName && placeName.toLowerCase().includes('cheesecake factory')))) {
      const csvReviews = await loadCheesecakeReviews();
      if (csvReviews && csvReviews.length > 0) {
        fallbackData.native_korean_reviews = csvReviews;
        fallbackData.is_debug_override = true;
      }
    }

    return { data: fallbackData, isMock: false };
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
    const hasKoreanData = typeof data.korean_rating === 'number' && !isNaN(data.korean_rating);
    const delta = hasKoreanData ? (data.korean_rating - data.local_rating).toFixed(1) : '0.0';
    const deltaClass = delta >= 0 ? 'delta-up' : 'delta-down';
    const deltaSign = delta >= 0 ? `+${delta}` : delta;

    const indexEntry = data.index_entry || (data.gmap_id && extensionData?.place_index ? extensionData.place_index[data.gmap_id] : null);

    const importanceWeights = (userProfile && userProfile.importanceWeights) ? userProfile.importanceWeights : { t: 5, s: 3, v: 4, a: 2 };
    const tastePreferences = (userProfile && userProfile.tastePreferences) ? userProfile.tastePreferences : { authenticity: 5, greasiness: 3, spiciness: 4, herbs: 1 };

    // Section A: High Importance Aspect Chips (Weights >= 4)
    const weightChips = [];
    if (importanceWeights.t >= 4) weightChips.push(`🍱 Taste (${importanceWeights.t}/5)`);
    if (importanceWeights.s >= 4) weightChips.push(`💁 Service (${importanceWeights.s}/5)`);
    if (importanceWeights.v >= 4) weightChips.push(`💰 Value (${importanceWeights.v}/5)`);
    if (importanceWeights.a >= 4) weightChips.push(`✨ Atmosphere (${importanceWeights.a}/5)`);

    // Section B: Overseas Food Adaptation Preferences Chips
    const adaptationChips = [];
    if (tastePreferences.authenticity) adaptationChips.push(`🏮 Local ${tastePreferences.authenticity * 20}%`);
    if (tastePreferences.greasiness) adaptationChips.push(`🥑 Richness ${tastePreferences.greasiness * 20}%`);
    if (tastePreferences.spiciness) adaptationChips.push(`🌶️ Spicy ${tastePreferences.spiciness * 20}%`);
    if (tastePreferences.herbs) adaptationChips.push(`🌿 Herbs ${tastePreferences.herbs * 20}%`);

    const resolvedTier = data.resolved ? data.resolved.tier : 'none';
    let tierClass = 'none';
    let tierIcon = '🔴';
    let tierTitle = 'No Cultural Dataset Found for this Place';

    if (resolvedTier === 'measured') {
      tierClass = 'measured';
      tierIcon = '🟢';
      tierTitle = 'Measured Place Data Available (Tier 1)';
    } else if (resolvedTier === 'category') {
      tierClass = 'category';
      tierIcon = '🔵';
      tierTitle = 'Category Estimate Data Available (Tier 2)';
    } else if (resolvedTier === 'category_ns') {
      tierClass = 'category_ns';
      tierIcon = 'ℹ️';
      tierTitle = 'Category Match (No Rating Gap)';
    } else {
      tierClass = 'none';
      tierIcon = '🔴';
      tierTitle = 'No Cultural Dataset Available (Tier 3)';
    }

    // 기존 사이드바가 존재하는지 검사하여 중복 슬라이드 애니메이션(깜빡임) 차단
    const existingSidebar = rootEl.querySelector('#gmap-decoder-sidebar');
    const isUpdate = !!existingSidebar;

    rootEl.innerHTML = `
      <div id="gmap-decoder-sidebar" style="${isUpdate ? 'animation: none !important;' : ''}">
        <!-- Header -->
        <div class="decoder-header">
          <div class="header-title-group">
            <div class="header-logo">🔍</div>
            <div>
              <div class="header-title">GMap Review Decoder</div>
              <div class="header-subtitle">Korean Cultural Adjuster</div>
            </div>
          </div>
          <div class="header-actions">
            <button class="action-btn" id="btn-refresh" title="Refresh">🔄</button>
            <button class="action-btn" id="btn-close" title="Close">✖</button>
          </div>
        </div>

        <!-- Body -->
        <div class="decoder-body">
          <!-- Place Title & ID -->
          <div class="place-card">
            <div class="place-name">${escapeHTML(data.place_name || currentPlaceName || 'Selected Place')}</div>
            <div class="place-meta">
              <span>📍 ${escapeHTML(data.address || 'Google Maps Place')}</span>
              ${data.category ? `<br><span style="font-size: 11px; opacity: 0.85;">🏷️ ${escapeHTML(data.category)}</span>` : ''}
            </div>
            ${data.gmap_id ? `<div class="gmap-id-tag">ID: ${escapeHTML(data.gmap_id)}</div>` : ''}
          </div>

          <!-- Dataset Availability Status Banner -->
          <div class="data-status-banner data-status-${tierClass}">
            <span class="status-icon">${tierIcon}</span>
            <span class="status-text">${tierTitle}</span>
          </div>

          <!-- User Preferences & Adaptation Profile Highlight -->
          ${(weightChips.length > 0 || adaptationChips.length > 0) ? `
            <div class="user-preferences-box">
              <div class="preferences-title">🎯 Your Preferences &amp; Adaptation Profile</div>
              <div class="pref-tags-list">
                ${weightChips.map(chip => `
                  <span class="pref-tag-chip profile-chip-weight">${escapeHTML(chip)}</span>
                `).join('')}
                ${adaptationChips.map(chip => `
                  <span class="pref-tag-chip level-chip profile-chip-adaptation">${escapeHTML(chip)}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Dual Rating System Badges -->
          <div class="ratings-container">
            <!-- Local Rating -->
            <div class="rating-box">
              <div class="rating-label">🌐 Local Rating</div>
              <div class="rating-score">
                ${data.local_rating.toFixed(1)}
                <span class="stars">★</span>
                <span class="max">/5</span>
              </div>
              <div class="rating-delta delta-none">Google Rating</div>
            </div>

            <!-- Korean Culture Rating -->
            <div class="rating-box korean-box">
              <div class="rating-label">🇰🇷 KR Adjusted Rating</div>
              <div class="rating-score">
                ${hasKoreanData ? data.korean_rating.toFixed(2) : 'N/A'}
                <span class="stars">★</span>
                ${hasKoreanData ? '<span class="max">/5</span>' : ''}
              </div>
              <div class="rating-delta ${deltaClass}">
                ${hasKoreanData ? `g-gap: ${typeof data.rel_gap === 'number' ? (data.rel_gap >= 0 ? '+' : '') + data.rel_gap.toFixed(3) : 'N/A'}` : 'No data'}
              </div>
            </div>
          </div>

          <!-- Formula Calculation Display Box -->
          ${typeof data.rel_gap === 'number' ? `
            <div class="formula-box">
              <div class="formula-title">🧮 Score Formula: Google + Dataset g = Final</div>
              <div class="formula-content">
                <span class="formula-part">Google: <strong>${data.local_rating.toFixed(1)}★</strong></span>
                <span class="formula-op">+</span>
                <span class="formula-part" title="Relative gap (g) from dataset">Dataset g: <strong>${data.rel_gap >= 0 ? '+' : ''}${data.rel_gap.toFixed(3)}</strong></span>
                <span class="formula-op">=</span>
                <span class="formula-result">Adjusted: <strong>${hasKoreanData ? data.korean_rating.toFixed(2) : 'N/A'}★</strong></span>
              </div>
            </div>
          ` : ''}

          <!-- Aspect Score Chips (z/n Spec v2) -->
          <div class="aspect-chips-section">
            <div class="section-title">
              <span>📌 Aspect Strengths</span>
              <span class="data-year-badge">Based on 2021 reviews</span>
            </div>
            <div class="aspect-chips-grid">
              ${['t','s','v','a'].map(k => renderAspectChip(indexEntry, k)).join('')}
            </div>
          </div>

          <!-- Native Korean Reviews Section -->
          ${(() => {
            const rawReviews = data.native_korean_reviews || [];
            // Process review taste profile matches
            const processedReviews = rawReviews.map(r => {
              const matchedTags = analyzeReviewTasteMatches(r.text, userProfile);
              return { ...r, matchedTags, hasMatch: matchedTags.length > 0 };
            });

            // Sort taste-matched reviews first
            const sortedReviews = [...processedReviews].sort((a, b) => (b.matchedTags.length - a.matchedTags.length));
            const displayReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 3);
            const matchedCount = processedReviews.filter(r => r.hasMatch).length;

            return `
              <div class="native-reviews-container">
                ${data.is_debug_override ? `
                  <div class="debug-banner">
                    <span>🐞 [Debug Mode Active] Overridden with Cheesecake Factory Local CSV (${rawReviews.length} Reviews)</span>
                  </div>
                ` : ''}
                <div class="section-title">
                  <span>💬 Native Korean Reviews (${rawReviews.length}) ${matchedCount > 0 ? `<span style="font-size: 10px; color: #f0abfc; font-weight: normal;">(🎯 ${matchedCount} match your profile)</span>` : ''}</span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <button id="btn-fetch-more" class="btn-fetch-more" title="Auto-scroll Google Maps panel to load more Korean reviews">📥 Load More</button>
                    ${rawReviews.length > 3 ? 
                      `<button id="btn-toggle-reviews" class="btn-toggle-reviews">${showAllReviews ? 'Collapse ▲' : 'Show All ▼'}</button>` : ''
                    }
                  </div>
                </div>
                <div class="native-reviews-section">
                  ${displayReviews.length > 0 ? 
                    displayReviews.map(r => `
                      <div class="native-review-card ${r.hasMatch ? 'taste-matched-card' : ''}">
                        ${r.hasMatch ? `
                          <div class="taste-match-badge">
                            🎯 Matches your profile: ${r.matchedTags.join(', ')}
                          </div>
                        ` : ''}
                        <div class="native-review-header">
                          <span class="native-review-author">👤 ${escapeHTML(r.author)}${r.date ? ` <span class="native-review-date">· ${escapeHTML(r.date)}</span>` : ''}</span>
                          ${r.rating ? `<span class="native-review-rating">★ ${r.rating}.0</span>` : ''}
                        </div>
                        <div class="native-review-text">${escapeHTML(r.text)}</div>
                      </div>
                    `).join('') :
                    `<div class="native-review-empty">
                       <div style="margin-bottom: 8px;">💬 No native Korean reviews visible yet. (English UI sorted first)</div>
                       <button id="btn-fetch-more-empty" class="btn-fetch-more-large">📥 Auto-click 'More reviews' &amp; scroll</button>
                     </div>`
                  }
                </div>
              </div>
            `;
          })()}

          <!-- Rationale Box -->
          <div class="rationale-box">
            <div class="rationale-title">💡 Cultural Rating Summary <span class="data-year-badge">2021 Data</span></div>
            ${escapeHTML(data.culture_summary)}
          </div>

          <!-- Comparative Metrics -->
          <div>
            <div class="section-title">
              <span>📊 Aspect Comparison</span>
              <span style="font-size: 10px; color: #9ca3af; font-weight: normal;">(Gray: Local / Purple: Korean)</span>
            </div>
            <div class="metrics-list">
              ${renderMetricBar('Taste', data.metrics.taste)}
              ${renderMetricBar('Service', data.metrics.service)}
              ${renderMetricBar('Value for Money', data.metrics.value)}
              ${renderMetricBar('Atmosphere', data.metrics.atmosphere)}
            </div>
          </div>

          <!-- Nuance Decoder Tags -->
          <div>
            <div class="section-title">💡 Nuance Decoding Tags</div>
            <div class="tags-grid">
              ${data.nuance_tags.map(tag => `
                <div class="nuance-tag-card">
                  <div class="tag-literal">${escapeHTML(tag.literal)}</div>
                  <div class="tag-meaning"><strong>#What it actually means:</strong> ${escapeHTML(tag.meaning)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="decoder-footer">
          <div class="status-indicator">
            <span class="dot ${isMock ? 'mock-dot' : ''}"></span>
            <span>${isMock ? 'Fallback Mock Engine' : (data.status_badge || 'UCSD Dataset Engine (2021)')}</span>
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

    const toggleReviewsBtn = rootEl.querySelector('#btn-toggle-reviews');
    if (toggleReviewsBtn) {
      toggleReviewsBtn.addEventListener('click', () => {
        showAllReviews = !showAllReviews;
        renderSidebar(currentAnalysisData, currentIsMock);
      });
    }

    const fetchMoreBtn = rootEl.querySelector('#btn-fetch-more');
    if (fetchMoreBtn) {
      fetchMoreBtn.addEventListener('click', (e) => {
        autoFetchKoreanReviews(e.currentTarget);
      });
    }

    const fetchMoreEmptyBtn = rootEl.querySelector('#btn-fetch-more-empty');
    if (fetchMoreEmptyBtn) {
      fetchMoreEmptyBtn.addEventListener('click', (e) => {
        autoFetchKoreanReviews(e.currentTarget);
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
    clearRetryTimers();
    lastProcessedKey = null;
    currentGMapId = null;
    currentPlaceName = null;
    currentAnalysisData = null;
    showAllReviews = false;
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

    // 이미 처리된 장소인 경우에도, DOM 평점 및 한국어 리뷰가 뒤늦게 표시되었는지 동적 파싱
    if (!forceRefresh && processKey === lastProcessedKey && currentAnalysisData) {
      const isRatingUpdated = applyDOMRating(currentAnalysisData);
      extractNativeKoreanReviewsFromDOM();

      // 장소 이름이 처음에 '장소 (0x...)' Fallback으로 생성되었다면 새로 감지된 장소명으로 업데이트
      let isNameUpdated = false;
      if (currentAnalysisData.place_name && (currentAnalysisData.place_name.startsWith('장소 (') || currentAnalysisData.place_name.startsWith('Selected Place ('))) {
        const freshPlaceName = extractPlaceNameFromDOM();
        if (freshPlaceName && !freshPlaceName.startsWith('장소 (') && !freshPlaceName.startsWith('Selected Place (')) {
          currentAnalysisData.place_name = freshPlaceName;
          currentPlaceName = freshPlaceName;
          isNameUpdated = true;
        }
      }

      if (isRatingUpdated || isNameUpdated) {
        renderSidebar(currentAnalysisData, currentIsMock);
      }
      return;
    }

    lastProcessedKey = processKey;
    currentGMapId = gmapId;
    currentPlaceName = placeName;

    console.log(`[GMap Review Decoder] 유효한 장소 감지됨 - gmap_id: ${gmapId || '없음(Fallback)'}, place_name: ${placeName || '없음'}`);

    const { data, isMock } = await fetchCulturalAnalysis(gmapId, placeName);
    currentAnalysisData = data;
    currentIsMock = isMock;

    // DOM에서 실제 주소, 카테고리, 현지 평점 및 한국어 리뷰 파싱 시도
    const liveAddr = extractAddressFromDOM();
    if (liveAddr) {
      currentAnalysisData.address = liveAddr;
    }

    const liveCat = extractCategoryFromDOM();
    if (liveCat) {
      currentAnalysisData.category = liveCat;
    }

    applyDOMRating(currentAnalysisData);
    extractNativeKoreanReviewsFromDOM();

    renderSidebar(currentAnalysisData, currentIsMock);

    // DOM 평점이 즉시 파싱되지 않은 경우 비동기 Retry 로직 가동
    scheduleRatingRetry(currentAnalysisData, currentIsMock);
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
    chrome.storage.local.get(['isEnabled', 'isDebugMode', 'targetCulture', 'userProfile'], (res) => {
      if (res.isEnabled !== undefined) isEnabled = res.isEnabled;
      if (res.isDebugMode !== undefined) isDebugMode = res.isDebugMode;
      if (res.targetCulture) targetCulture = res.targetCulture;
      if (res.userProfile) userProfile = res.userProfile;
      startMonitoring();
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isEnabled) isEnabled = changes.isEnabled.newValue;
      if (changes.isDebugMode) isDebugMode = changes.isDebugMode.newValue;
      if (changes.targetCulture) targetCulture = changes.targetCulture.newValue;
      if (changes.userProfile) userProfile = changes.userProfile.newValue;

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
