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
   * 1. 리뷰 카드 DOM이 원문 한국어 리뷰인지 판별 (진단 로그 포함)
   */
  function isNativeKoreanReview(reviewEl, logReason = false) {
    if (!reviewEl) return false;

    const fullText = (reviewEl.innerText || reviewEl.textContent || '').trim();
    if (!fullText) return false;

    // 외국어 리뷰가 한국어로 자동 번역된 명확한 뱃지/문구만 제외
    const machineTranslationBadges = [
      'Google에서 번역한 내용',
      'Google에서 번역함',
      'Google 번역됨',
      '에서 번역됨',
      '자동 번역됨'
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

    const hasKoreanChar = /[\uAC00-\uD7A3]/.test(fullText);
    if (!hasKoreanChar) {
      if (logReason) {
        console.log(`  [KR Review Filter ❌] 제외됨 (이유: 한글 유니코드 미포함 - 순수 외국어 리뷰)`);
        console.log(`    └ [미리보기]: "${fullText.substring(0, 80).replace(/\n/g, ' ')}..."`);
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
      const mainPane = document.querySelector('[role="main"], #QA0Sfe, .m6QEdf');
      const root = mainPane || document;

      // 구글 맵스 개요(Overview) 및 리뷰(Reviews) 탭의 모든 리뷰 카드 컨테이너 선택자 포괄
      const reviewCards = Array.from(root.querySelectorAll('div.jftiEf, div[data-review-id], div.My8ZBd, div.gWSYe, div.WMD5W, div.xiA35c, div.K7x0ed, div.hh25db, div.ffuGub, div.jANrZb, div.W3yE8c, [role="article"]'));

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

        // 원본 DOM 텍스트 보존
        const rawText = (card.innerText || card.textContent || '').trim();

        // 텍스트 정화
        let text = rawText.replace(/\u00A0/g, ' ');

        if (author && author !== '익명') {
          text = text.replace(author, '');
        }

        // 1. 프로필 메타데이터 및 상단 작성일 제거 (한국어 & 영어 UI 지원)
        text = text
          .replace(/^[\s\S]*?(?:수정일:|Edited\s*)?\b(?:\d+|a|an)\s*(?:년|개월|주|일|시간|years?|months?|weeks?|days?|hours?|mins?|minutes?)\s*(?:전|ago)\s*/gi, '')
          .replace(/(?:지역 가이드|Local Guide)\s*(?:·\s*)?/gi, '')
          .replace(/[\d,]+\s*(?:개|장|reviews?|photos?|사진)(?:\s*·\s*)?/gi, '');

        // 2. UI 버튼, 번역 뱃지 및 구글 폼 설문 키워드 절단 (Cut-off) - 한국어 및 영어 지원
        const uiCutoffRegex = /(?:자세히 보기|간단히 보기|좋아요|공유|업체 대표 응답|식사 유형|음식점 유형|1인당 가격|가격대|음식:|서비스:|분위기:|소음 수준|그룹 크기|주차 공간|주차 옵션|추천 메뉴|방문 목적|Google 제공 번역|Google 제공|Google 번역|More|Less|See translation|See original|Translated by Google|Rate and review|Like|Share|Response from the owner|Owner response|Dine in|Takeout|Delivery|Price per person|Food:|Service:|Atmosphere:)/i;
        if (uiCutoffRegex.test(text)) {
          text = text.split(uiCutoffRegex)[0];
        }

        // 3. 미디어 타임스탬프, 미디어 수, 문장 끝 단독 숫자 제거
        text = text
          .replace(/\b\d+:\d+\b/g, '')
          .replace(/\+\d+/g, '')
          .replace(/[\s\u00A0]+\d+[\s\u00A0]*$/g, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!text || !/[\uAC00-\uD7A3]/.test(text)) {
          console.log(`  [KR Review Filter ❌] 제외됨 (이유: 세탁 후 한글 본문 소실)`);
          return;
        }

        console.log(`  👤 작성자: ${author} | 별점: ★ ${rating || '미기재'}`);
        console.log(`  ├ [원본 DOM]:`, JSON.stringify(rawText));
        console.log(`  └ [세탁 후]:`, JSON.stringify(text));

        // 중복 방지 키 생성 (author + text 30자)
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

        // 실제 탐지된 한국인 리뷰 평점 평균 계산 및 반영
        const ratedReviews = reviews.filter(r => typeof r.rating === 'number' && !isNaN(r.rating));
        if (ratedReviews.length > 0) {
          const sum = ratedReviews.reduce((acc, r) => acc + r.rating, 0);
          const avgKrRating = parseFloat((sum / ratedReviews.length).toFixed(1));
          currentAnalysisData.korean_rating = avgKrRating;
          currentAnalysisData.hasKoreanData = true;
          currentAnalysisData.isRealKoreanReviewsReflected = true;
          currentAnalysisData.culture_summary = `실시간 추출된 순수 한국인 원문 리뷰 ${ratedReviews.length}건의 평점 평균(★ ${avgKrRating})이 반영되었습니다.`;
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
      const oldLocal = data.local_rating;
      data.local_rating = rawRating;

      // 한국인 보정 데이터가 존재하는 경우에만 평점 재계산
      if (typeof data.korean_rating === 'number' && !isNaN(data.korean_rating)) {
        let delta = data.korean_rating - oldLocal;
        const calculatedKr = Math.max(1.0, Math.min(5.0, rawRating + delta));
        data.korean_rating = parseFloat(calculatedKr.toFixed(1));
      }

      data.isDOMParsed = true;
      console.log(`[GMap Review Decoder] 실제 DOM 평점 파싱 완료: ${rawRating} (기존 Fallback: ${oldLocal})`);
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

        // 장소명이 뒤늦게 렌더링된 경우 업데이트
        if (data.place_name && data.place_name.startsWith('장소 (')) {
          const freshName = extractPlaceNameFromDOM();
          if (freshName && !freshName.startsWith('장소 (')) {
            data.place_name = freshName;
            currentPlaceName = freshName;
            renderSidebar(data, isMock);
          }
        }
      }, delay);
      retryTimers.push(timerId);
    });
  }

  /**
   * 구글 맵스 좌측 패널의 리뷰 탭 클릭 및 자동 스크롤 다운을 실행하여 더 많은 리뷰 자동 로드
   */
  function autoFetchKoreanReviews() {
    try {
      console.log('[GMap Review Decoder] 📥 리뷰 자동 불러오기(Auto Fetch) 실행 중...');

      // 1. 구글 맵스 개요(Overview) 탭에서 리뷰(Reviews) 탭으로 자동 전환 시도
      const tabs = Array.from(document.querySelectorAll('button, div[role="tab"]'));
      const reviewsTab = tabs.find(el => {
        const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        return (text.includes('reviews') || text.includes('리뷰')) && !text.includes('decoder');
      });

      if (reviewsTab) {
        reviewsTab.click();
        console.log('[GMap Review Decoder] 리뷰 탭 자동 클릭 완료');
      }

      // 2. 구글 맵스 좌측 메인 패널/스크롤 패널 자동 스크롤 다운
      const scrollPanes = Array.from(document.querySelectorAll('div.m6QEdf, #QA0Sfe, [role="main"]'));
      scrollPanes.forEach(pane => {
        if (pane && pane.scrollHeight > pane.clientHeight) {
          pane.scrollTop = pane.scrollTop + 800;
        }
      });

      // 3. 스크롤 후 실시간 리뷰 탐지 재파싱
      setTimeout(() => {
        const scrollPanes2 = Array.from(document.querySelectorAll('div.m6QEdf, #QA0Sfe, [role="main"]'));
        scrollPanes2.forEach(pane => {
          if (pane && pane.scrollHeight > pane.clientHeight) {
            pane.scrollTop = pane.scrollTop + 1200;
          }
        });
        extractNativeKoreanReviewsFromDOM();
      }, 500);
    } catch (err) {
      console.warn('[GMap Review Decoder] 리뷰 더보기 도중 오류 발생:', err);
    }
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
    // 1. UCSD Dataset Key에 일치하는 사전 데이터가 있을 경우 반환
    if (gmapId && MOCK_DATASET[gmapId]) {
      const cloned = JSON.parse(JSON.stringify(MOCK_DATASET[gmapId]));
      cloned.hasKoreanData = true;
      return cloned;
    }

    // 2. 동적 Mock 생성 (미등록 장소의 경우 임의 보정 수치 대신 '데이터 없음' 상태 반환)
    const displayName = placeName || (gmapId ? `장소 (${gmapId.substring(0, 10)}...)` : '선택된 장소');
    const hash = simpleHash(displayName + (gmapId || ''));
    const localRating = (4.0 + (hash % 10) / 10).toFixed(1);

    return {
      gmap_id: gmapId || `0x${hash.toString(16)}:0x${(hash * 31).toString(16)}`,
      place_name: displayName,
      local_rating: parseFloat(localRating),
      korean_rating: null,
      hasKoreanData: false,
      culture_summary: `실시간 감지된 한국인 원문 리뷰가 아직 없습니다. 구글 맵스 좌측 패널에서 리뷰 탭을 누르면 실시간 분석이 진행됩니다.`,
      metrics: {
        taste: { local: (4.2 + (hash % 6) / 10).toFixed(1), kr: '3.8' },
        service: { local: (4.0 + (hash % 5) / 10).toFixed(1), kr: '3.5' },
        value: { local: (4.1 + (hash % 7) / 10).toFixed(1), kr: '3.4' },
        atmosphere: { local: 4.5, kr: 4.2 }
      },
      nuance_tags: [
        {
          literal: '💬 한국인 리뷰 미감지 장소',
          meaning: '구글 맵스 좌측 패널의 리뷰 탭을 클릭하여 한국어 리뷰를 탐지해 보세요.'
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
    const hasKoreanData = typeof data.korean_rating === 'number' && !isNaN(data.korean_rating);
    const delta = hasKoreanData ? (data.korean_rating - data.local_rating).toFixed(1) : '0.0';
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
          <!-- Place Title & ID -->
          <div class="place-card">
            <div class="place-name">${escapeHTML(data.place_name || currentPlaceName || '선택된 장소')}</div>
            <div class="place-meta">
              <span>📍 Google Maps Place</span>
            </div>
            ${data.gmap_id ? `<div class="gmap-id-tag">ID: ${escapeHTML(data.gmap_id)}</div>` : ''}
          </div>

          <!-- Dual Rating System Badges -->
          <div class="ratings-container">
            <!-- Local Rating -->
            <div class="rating-box">
              <div class="rating-label">🌐 현지 전체 평점</div>
              <div class="rating-score">
                ${data.local_rating.toFixed(1)}
                <span class="stars">★</span>
                <span class="max">/5</span>
              </div>
              <div class="rating-delta delta-none">구글 기본 평점</div>
            </div>

            <!-- Korean Culture Rating -->
            <div class="rating-box korean-box">
              <div class="rating-label">🇰🇷 한국인 체감 평점</div>
              <div class="rating-score">
                ${hasKoreanData ? data.korean_rating.toFixed(1) : '미집계'}
                <span class="stars">★</span>
                ${hasKoreanData ? '<span class="max">/5</span>' : ''}
              </div>
              <div class="rating-delta ${deltaClass}">
                ${hasKoreanData ? `격차 ${deltaSign}` : '데이터 수집 중'}
              </div>
            </div>
          </div>

          <!-- Native Korean Reviews Section -->
          <div class="native-reviews-container">
            <div class="section-title">
              <span>💬 한국인 원문 리뷰 (${(data.native_korean_reviews || []).length}건)</span>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button id="btn-fetch-more" class="btn-fetch-more" title="구글 맵스 패널을 스크롤하여 더 많은 한국인 리뷰를 자동으로 불러옵니다.">📥 더 불러오기</button>
                ${(data.native_korean_reviews || []).length > 3 ? 
                  `<button id="btn-toggle-reviews" class="btn-toggle-reviews">${showAllReviews ? '접기 ▲' : '전체보기 ▼'}</button>` : ''
                }
              </div>
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
                   <div style="margin-bottom: 8px;">💬 현재 화면 상단 리뷰 중 한국어 원문이 없습니다. (영어 UI 우선정렬)</div>
                   <button id="btn-fetch-more-empty" class="btn-fetch-more-large">📥 'More reviews' 자동 클릭 &amp; 스크롤 실행</button>
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

    // 이미 처리된 장소인 경우에도, DOM 평점 및 한국어 리뷰가 뒤늦게 표시되었는지 동적 파싱
    if (!forceRefresh && processKey === lastProcessedKey && currentAnalysisData) {
      applyDOMRating(currentAnalysisData);
      extractNativeKoreanReviewsFromDOM();

      // 장소 이름이 처음에 '장소 (0x...)' Fallback으로 생성되었다면 새로 감지된 장소명으로 업데이트
      if (currentAnalysisData.place_name && currentAnalysisData.place_name.startsWith('장소 (')) {
        const freshPlaceName = extractPlaceNameFromDOM();
        if (freshPlaceName && !freshPlaceName.startsWith('장소 (')) {
          currentAnalysisData.place_name = freshPlaceName;
          currentPlaceName = freshPlaceName;
          renderSidebar(currentAnalysisData, currentIsMock);
        }
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
    const initialKrReviews = extractNativeKoreanReviewsFromDOM();

    renderSidebar(currentAnalysisData, currentIsMock);

    // 한국어 원문 리뷰가 0건이면 리뷰 탭 전환 및 스크롤 자동 실행 (Auto Fetch)
    if (!initialKrReviews || initialKrReviews.length === 0) {
      setTimeout(() => {
        autoFetchKoreanReviews();
      }, 1200);
    }

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
