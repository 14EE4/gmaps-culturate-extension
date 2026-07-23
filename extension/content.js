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
  let currentAnalysisData = null;
  let currentIsMock = true;
  let retryTimers = [];
  let showAllReviews = false;

  // Built-in Offline Fallback Mock Dataset (Works 100% without backend server)
  const MOCK_DATASET = {
    // CAVA (USC Village LA) - Main Test Sample
    '0x80c2c7e5bd221ad7:0x6975adb8d798ea0b': {
      gmap_id: '0x80c2c7e5bd221ad7:0x6975adb8d798ea0b',
      place_name: 'CAVA (USC Village)',
      local_rating: 4.4,
      korean_rating: 3.8,
      culture_summary: '지중해식 샐러드 커스텀 볼 전문점. 현지 대학생 및 직장인에게 대인기이나, 한국인 기준 딥 소스의 간이 짤 수 있고 토핑 옵션 커스텀 주문 난이도가 있음.',
      metrics: {
        taste: { local: 4.5, kr: 3.8 },
        service: { local: 4.2, kr: 3.9 },
        value: { local: 4.1, kr: 3.5 },
        atmosphere: { local: 4.4, kr: 4.2 }
      },
      nuance_tags: [
        {
          literal: '"Fully customizable fresh Mediterranean bowl"',
          meaning: '서브웨이처럼 베이스, 딥(Dip), 토핑, 드레싱을 계속 선택해야 해서 주문 난이도가 있음.'
        },
        {
          literal: '"Pita chips and Crazy Feta are top tier"',
          meaning: '드레싱과 페타 치즈 간이 강한 편이므로 드레싱은 옆에 따로(Side) 요청하는 것 추천.'
        },
        {
          literal: '"Super fast line even when crowded"',
          meaning: 'USC 캠퍼스 인근으로 점심시간 줄은 기나 패스트 카주얼 방식으로 회전율은 빠름.'
        }
      ]
    },

    // LA Sun Nong Dan (선농단 K-Town)
    '0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3': {
      gmap_id: '0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3',
      place_name: 'Sun Nong Dan (선농단 LA)',
      local_rating: 4.6,
      korean_rating: 4.4,
      culture_summary: '갈비찜과 치즈 사리의 높은 완성도. 현지인과 한국인 모두 최상위 평가이나 극심한 대기 시간과 주차 난이도에 엄격함.',
      metrics: {
        taste: { local: 4.8, kr: 4.7 },
        service: { local: 4.3, kr: 3.8 },
        value: { local: 4.2, kr: 3.9 },
        atmosphere: { local: 4.1, kr: 3.6 }
      },
      nuance_tags: [
        {
          literal: '"Portions are huge, order for groups"',
          meaning: '치즈 갈비찜 소자도 2-3인용. 양이 매우 많아 가성비 양호함.'
        },
        {
          literal: '"Waited 45 mins, staff is super rushed"',
          meaning: '회전율을 극대화하기 위해 친절한 서비스는 기대하기 힘들고 분위기가 다소 어수선함.'
        }
      ]
    },

    // LA BCD Tofu House (북창동순두부 Wilshire)
    '0x80c2c7c594236e71:0x5e2b036577317ba9': {
      gmap_id: '0x80c2c7c594236e71:0x5e2b036577317ba9',
      place_name: 'BCD Tofu House (북창동순두부)',
      local_rating: 4.5,
      korean_rating: 3.9,
      culture_summary: '외국인에게는 표준 K-Food 기준점이나, 한국인 기준으로는 본국 순두부 전문점 대비 깊은 국물 맛이 다소 아쉽고 과도한 팁이 부담됨.',
      metrics: {
        taste: { local: 4.6, kr: 3.9 },
        service: { local: 4.4, kr: 3.8 },
        value: { local: 4.2, kr: 3.4 },
        atmosphere: { local: 4.3, kr: 4.0 }
      },
      nuance_tags: [
        {
          literal: '"Authentic Korean comfort food"',
          meaning: '외국인 입맛에 표준화된 한국 맛. 한국 본토 맛을 원하면 무난하거나 평범함.'
        }
      ]
    },

    // LA BCD Tofu House (북창동 순두부 LA) - User Requested URL
    '0x80c2b8831c5ab3a1:0xe81dfbb2ef41329a': {
      gmap_id: '0x80c2b8831c5ab3a1:0xe81dfbb2ef41329a',
      place_name: '북창동 순두부 (BCD Tofu House LA)',
      local_rating: 4.5,
      korean_rating: 4.0,
      culture_summary: 'LA 한인타운의 대표 순두부 전문점. 외국인에게는 대표 K-Food 코스이나, 한국인 기준으로는 본국 매장 대비 다소 평범한 국물 맛과 긴 대기시간에 엄격함.',
      metrics: {
        taste: { local: 4.6, kr: 4.0 },
        service: { local: 4.3, kr: 3.8 },
        value: { local: 4.1, kr: 3.5 },
        atmosphere: { local: 4.4, kr: 4.0 }
      },
      nuance_tags: [
        {
          literal: '"Best BCD Tofu in K-Town LA"',
          meaning: 'LA 대표 한식 전문점으로 쾌적하고 넓으나 점심/저녁 피크타임 대기시간 길음.'
        },
        {
          literal: '"Authentic Korean spicy tofu stew"',
          meaning: '매운 맛 조절이 가능하나 한국인 입맛에는 보통 맛이 심심할 수 있어 매운맛(Spicy) 추천.'
        }
      ]
    },

    // Peter Luger Steak House NY
    '0x89c259837920ab4d:0xcf20c1507df05e54': {
      gmap_id: '0x89c259837920ab4d:0xcf20c1507df05e54',
      place_name: 'Peter Luger Steak House',
      local_rating: 4.4,
      korean_rating: 3.7,
      culture_summary: '역사적인 드라이에이징 스테이크 전문점. 구글 평점은 높으나 Cash Only(현금 결제 전용) 및 고압적인 서비스로 한국인 가성비 평가 하락.',
      metrics: {
        taste: { local: 4.7, kr: 4.2 },
        service: { local: 4.1, kr: 2.9 },
        value: { local: 3.9, kr: 3.1 },
        atmosphere: { local: 4.5, kr: 4.1 }
      },
      nuance_tags: [
        {
          literal: '"Classic waiter service with Brooklyn attitude"',
          meaning: '친절함보다는 무뚝뚝하고 틀에 박힌 서비스. 팁 결제 시 부담스러울 수 있음.'
        },
        {
          literal: '"Cash or debit only, be prepared!"',
          meaning: '신용카드 불가로 현금 미소지 시 큰 불편 유발.'
        }
      ]
    }
  };

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
   * DOM에서 실제 구글 맵스 현지 평점(예: "4.7") 파싱
   */
  function extractRatingFromDOM() {
    try {
      // 우선순위 1: 구글 맵스 장소 상세 패널 컨테이너
      const mainPane = document.querySelector('[role="main"], #QA0Sfe, .m6QEdf');
      const root = mainPane || document;

      // 1-1. 전용 클래스 검사 (div.F72Y3c, span.ceW3ed 등)
      const knownClassEl = root.querySelector('div.F72Y3c, span.ceW3ed, div.fontBodyMedium span[aria-hidden="true"]');
      if (knownClassEl) {
        const val = parseFloat(knownClassEl.textContent.trim());
        if (!isNaN(val) && val >= 1.0 && val <= 5.0) return val;
      }

      // 1-2. aria-label 기반 평점 추출 (예: "4.7 별표", "4.7 stars", "4.7 out of 5 stars")
      const ariaEl = root.querySelector('[aria-label*="별표"], [aria-label*="star"], [aria-label*="stars"], [aria-label*="out of 5"]');
      if (ariaEl) {
        const label = ariaEl.getAttribute('aria-label') || '';
        const match = label.match(/([1-5]\.\d)/);
        if (match) {
          const val = parseFloat(match[1]);
          if (!isNaN(val) && val >= 1.0 && val <= 5.0) return val;
        }
      }

      // 1-3. span[aria-hidden="true"] 중 소수점 평점 형태(/^[1-5]\.\d$/) 검색
      const spanElements = Array.from(root.querySelectorAll('span[aria-hidden="true"], span'));
      for (const span of spanElements) {
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
   * 1. 리뷰 카드 DOM이 원문 한국어 리뷰인지 판별 (구글 번역 문구 제외 & 한글 유니코드 검사)
   */
  function isNativeKoreanReview(reviewEl) {
    if (!reviewEl) return false;

    const fullText = (reviewEl.innerText || reviewEl.textContent || '').trim();
    if (!fullText) return false;

    // Google 자동 번역 감지 키워드 (외국어 자동 번역본 제외)
    const translationKeywords = [
      'Google 제공 번역',
      'Google 제공',
      'Google 번역',
      'Google에서 번역함',
      'Google에서 번역한 내용',
      'Google 번역됨',
      'Translated by Google',
      'Translated with Google',
      '원본 보기',
      'Original'
    ];

    for (const keyword of translationKeywords) {
      if (fullText.includes(keyword)) {
        return false;
      }
    }

    // 한글 유니코드 범위(/[\uAC00-\uD7A3]/) 검사로 한국어 원문 포함 여부 판단
    return /[\uAC00-\uD7A3]/.test(fullText);
  }

  /**
   * 2. DOM에서 순수 한국인 리뷰 카드 파싱 (작성자, 별점, 리뷰 본문)
   * @returns {Array<{author: string, rating: number|null, text: string}>}
   */
  function extractNativeKoreanReviewsFromDOM() {
    const reviews = [];
    const seenKeys = new Set();

    try {
      const mainPane = document.querySelector('[role="main"], #QA0Sfe, .m6QEdf');
      const root = mainPane || document;

      // 구글 맵스 최상위 리뷰 카드 컨테이너 선택자 (하위 중복 선택자 제거)
      const reviewCards = Array.from(root.querySelectorAll('div.jftiEf, div[data-review-id]'));

      reviewCards.forEach(card => {
        if (!isNativeKoreanReview(card)) return;

        // 작성자 닉네임 추출
        let author = '익명';
        const authorEl = card.querySelector('.d4r55, button.alhrr, .X43fe-geL2f-haAclf, [class*="author"]');
        if (authorEl && authorEl.textContent.trim()) {
          author = authorEl.textContent.trim();
        }

        // 별점 점수 추출 (aria-label="별표 5개 중 4개" 또는 aria-label="4 stars" 등)
        let rating = null;
        const ratingEl = card.querySelector('span.kvMYJc[aria-label], span[role="img"][aria-label], [aria-label*="별표"], [aria-label*="star"]');
        if (ratingEl) {
          const ariaText = ratingEl.getAttribute('aria-label') || '';
          const match = ariaText.match(/([1-5])(?:개|\.0|\s*star|\/5)/i) || ariaText.match(/([1-5]\.\d)/) || ariaText.match(/([1-5])/);
          if (match && match[1]) {
            rating = parseFloat(match[1]);
          }
        }

        // 리뷰 본문 텍스트 추출 (.wi3w8d, .My5W2b 등) 및 UI 노이즈 문구 정화
        let text = '';
        const textEl = card.querySelector('.wi3w8d, [class*="wi3w8d"]');
        if (textEl && textEl.textContent.trim()) {
          text = textEl.textContent.trim();
        } else {
          // 본문 선택자가 따로 없을 경우 전체 카드 텍스트에서 프로필/버튼 문구 제거
          text = (card.innerText || card.textContent || '').replace(author, '').trim();
        }

        // 텍스트 정화 (Clean Up UI Buttons, Dates, & Metadata Noise)
        text = text
          .replace(/^[\s\S]*?(?:수정일:\s*)?\d+\s*(?:년|개월|주|일|시간)\s*전\s*/gi, '')
          .replace(/지역 가이드\s*·\s*리뷰\s*\d+개[^\n]*/gi, '')
          .replace(/리뷰\s*\d+개[^\n]*/gi, '')
          .replace(/(?:자세히 보기|간단히 보기|좋아요|공유|업체 대표 응답[^\n]*)/gi, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // 중복 방지 키 생성 (author + text 20자)
        const uniqueKey = `${author}_${text.substring(0, 30)}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          reviews.push({
            author,
            rating,
            text
          });
        }
      });

      if (reviews.length > 0) {
        console.log(`[KR Reviews] 순수 한국인 리뷰 파싱 완료 (${reviews.length}건):`, reviews);
      }

      if (currentAnalysisData) {
        const prevReviewsStr = JSON.stringify(currentAnalysisData.native_korean_reviews || []);
        const newReviewsStr = JSON.stringify(reviews);
        const prevRating = currentAnalysisData.korean_rating;

        currentAnalysisData.native_korean_reviews = reviews;

        // 실제 탐지된 한국인 리뷰 평점 평균 계산 및 반영
        const ratedReviews = reviews.filter(r => typeof r.rating === 'number' && !isNaN(r.rating));
        if (ratedReviews.length > 0) {
          const sum = ratedReviews.reduce((acc, r) => acc + r.rating, 0);
          const avgKrRating = parseFloat((sum / ratedReviews.length).toFixed(1));
          currentAnalysisData.korean_rating = avgKrRating;
          currentAnalysisData.isRealKoreanReviewsReflected = true;
        }

        const isDataChanged = (prevReviewsStr !== newReviewsStr) || (prevRating !== currentAnalysisData.korean_rating);

        // 실제로 데이터가 변경되었을 때만 사이드바 UI 동적 갱신 (불필요한 re-render 및 깜빡임 차단)
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
      // 기존 문화 보정 패널티(delta = korean_rating - local_rating) 계산 및 보존
      let delta = -0.6;
      if (typeof data.local_rating === 'number' && typeof data.korean_rating === 'number') {
        delta = data.korean_rating - data.local_rating;
      }

      const oldLocal = data.local_rating;
      data.local_rating = rawRating;
      const calculatedKr = Math.max(1.0, Math.min(5.0, rawRating + delta));
      data.korean_rating = parseFloat(calculatedKr.toFixed(1));
      data.isDOMParsed = true;

      console.log(`[GMap Review Decoder] 실제 DOM 평점 파싱 완료: ${rawRating} (기존 Fallback: ${oldLocal} -> 보정 점수: ${data.korean_rating})`);
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
    // DOM 로딩 지연 대응: 300ms, 700ms, 1200ms, 2000ms 시점에 retry
    const delays = [300, 700, 1200, 2000];
    delays.forEach(delay => {
      const timerId = setTimeout(() => {
        if (!isEnabled || !shadowRoot) return;
        const currentDOMRating = extractRatingFromDOM();
        extractNativeKoreanReviewsFromDOM();
        if (currentDOMRating !== null && data.local_rating !== currentDOMRating) {
          applyDOMRating(data);
          renderSidebar(data, isMock);
        }
      }, delay);
      retryTimers.push(timerId);
    });
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

          <!-- Real Native Korean Reviews Section (평점 박스 바로 아래 배치) -->
          <div>
            <div class="section-title">
              <div>
                <span>🇰🇷 실시간 감지된 한국인 원문 리뷰</span>
                <span style="font-size: 11px; color: #a5b4fc; font-weight: normal; margin-left: 4px;">(${(data.native_korean_reviews || []).length}건)</span>
              </div>
              ${(data.native_korean_reviews || []).length > 3 ? `
                <button class="btn-toggle-reviews" id="btn-toggle-reviews">
                  ${showAllReviews ? '접기 ▲' : `전체 보기 (${(data.native_korean_reviews || []).length}개) ▼`}
                </button>
              ` : ''}
            </div>
            <div class="native-reviews-section">
              ${(data.native_korean_reviews || []).length > 0 ? 
                (showAllReviews ? data.native_korean_reviews : data.native_korean_reviews.slice(0, 3)).map(r => `
                  <div class="native-review-card">
                    <div class="native-review-header">
                      <span class="native-review-author">👤 ${escapeHTML(r.author)}</span>
                      ${r.rating ? `<span class="native-review-rating">★ ${r.rating}.0</span>` : ''}
                    </div>
                    <div class="native-review-text">${escapeHTML(r.text)}</div>
                  </div>
                `).join('') :
                `<div class="native-review-empty">
                   💬 구글 맵스 좌측 패널에서 리뷰 탭을 누르면 실시간 추출된 한국인 원문 리뷰가 여기에 자동으로 반영됩니다.
                 </div>`
              }
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

    const toggleReviewsBtn = rootEl.querySelector('#btn-toggle-reviews');
    if (toggleReviewsBtn) {
      toggleReviewsBtn.addEventListener('click', () => {
        showAllReviews = !showAllReviews;
        renderSidebar(currentAnalysisData, currentIsMock);
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

    // 이미 처리된 장소인 경우에도, DOM 평점이 뒤늦게 표시되었는지 검사하여 동적 반영
    if (!forceRefresh && processKey === lastProcessedKey && currentAnalysisData) {
      const domRating = extractRatingFromDOM();
      if (domRating !== null && currentAnalysisData.local_rating !== domRating) {
        applyDOMRating(currentAnalysisData);
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

    // DOM에서 실제 현지 평점 및 한국어 리뷰 파싱 시도
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
