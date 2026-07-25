# GMap Review Decoder - 트러블슈팅 및 수정 내역 문서 (`TROUBLESHOOTING.md`)

본 문서는 **GMap Review Decoder** 개발 과정에서 발생한 주요 오류, 문제 증상, 원인 분석 및 해결 방법에 대한 트러블슈팅 기록을 관리합니다.

---

## 📋 목차
1. [이슈 #1: `__pycache__` 언더스코어 폴더로 인한 크롬 익스텐션 로드 실패](#이슈-1-__pycache__-언더스코어-폴더로-인한-크롬-익스텐션-로드-실패)
2. [이슈 #2: Manifest V3 `web_accessible_resources` Match Pattern 구문 오류](#이슈-2-manifest-v3-web_accessible_resources-match-pattern-구문-오류)
3. [이슈 #3: 단순 지도 이동/확대/축소 시 사이드바 패널 예외 처리](#이슈-3-단순-지도-이동확대축소-시-사이드바-패널-예외-처리)
4. [이슈 #4: 구글 맵스 SPA(Single Page App) URL 변경 실시간 탐지 미작동](#이슈-4-구글-맵스-spasingle-page-app-url-변경-실시간-탐지-미작동)
5. [이슈 #5: 구글 맵스 기존 CSS와 익스텐션 UI 스타일 충돌 가능성](#이슈-5-구글-맵스-기존-css와-익스텐션-ui-스타일-충돌-가능성)
6. [이슈 #6: Windows PowerShell 가상환경 실행 권한 오류 (`UnauthorizedAccess`)](#이슈-6-windows-powershell-가상환경-실행-권한-오류-unauthorizedaccess)
7. [이슈 #7: 구글 맵스 SPA 비동기 DOM 렌더링 지연 및 실제 현지 평점 동적 파싱 연동](#이슈-7-구글-맵스-spa-비동기-dom-렌더링-지연-및-실제-현지-평점-동적-파싱-연동)
8. [이슈 #8: 구글 자동 번역본("Google 제공 번역") 오탐지 및 리뷰 중복 파싱 문제](#이슈-8-구글-자동-번역본google-제공-번역-오탐지-및-리뷰-중복-파싱-문제)
9. [이슈 #9: 리뷰 파싱 및 DOM 갱신 시 사이드바 화면 깜빡임(Flickering) 및 슬라이드 애니메이션 중복 실행 문제](#이슈-9-리뷰-파싱-및-dom-갱신-시-사이드바-화면-깜빡임flickering-및-슬라이드-애니메이션-중복-실행-문제)
10. [이슈 #10: 리뷰 본문 내 비디오 타임스탬프(`0:03`), 사진 수(`+15`), 옵션 태그(`식사 유형…`) 잔존 노이즈 문제](#이슈-10-리뷰-본문-내-비디오-타임스탬프003-사진-수15-옵션-태그식사-유형-잔존-노이즈-문제)
11. [이슈 #11: 구글 맵스 UI 노이즈(자세히 보기, 좋아요, 공유, 식사 유형) 샌드위치 텍스트 잔존 및 통합 Cut-off 해결](#이슈-11-구글-맵스-ui-노이즈자세히-보기-좋아요-공유-식사-유형-샌드위치-텍스트-잔존-및-통합-cut-off-해결)
12. [이슈 #12: 스폰서/광고 장소 선택 시 상호명이 "스폰서"로 파싱되는 오탐지 문제 해결](#이슈-12-스폰서광고-장소-선택-시-상호명이-스폰서로-파싱되는-오탐지-문제-해결)
13. [이슈 #13: 한국인 리뷰 미감지 시 임의 평점 보정 수치 제거 및 '데이터 없음' UI 표출 개선](#이슈-13-한국인-리뷰-미감지-시-임의-평점-보정-수치-제거-및-데이터-없음-ui-표출-개선)
14. [이슈 #14: 구글 제공 번역 버튼("Google 제공 번역" / "Google 제공")과 리뷰 원문 구분 및 오탐지 해결](#이슈-14-구글-제공-번역-버튼google-제공-번역--google-제공과-리뷰-원문-구분-및-오탐지-해결)
15. [이슈 #15: 구글 맵스 개요(Overview) 탭 자동 전환 차단 및 '리뷰 더 불러오기' 수동 트리거 개선](#이슈-15-구글-맵스-개요overview-탭-자동-전환-차단-및-리뷰-더-불러오기-수동-트리거-개선)
16. [이슈 #16: 구글 맵스 영어 UI 환경에서의 리뷰 지연 로딩(AJAX) 및 동적 스크롤 부모 추적(`getReviewScrollParent` / `waitForReviewCards`)](#이슈-16-구글-맵스-영어-ui-환경에서의-리뷰-지연-로딩ajax-및-동적-스크롤-부모-추적getreviewscrollparent--waitforreviewcards)
17. [이슈 #17: 리뷰 작성 상대일자(`7개월 전` / `7 months ago`) 추출 및 사이드바 UI 표시](#이슈-17-리뷰-작성-상대일자7개월-전--7-months-ago-추출-및-사이드바-ui-표시)
18. [이슈 #18: 한국어 UI 환경에서 구글 자동 번역본("Google 제공 번역", "원본 보기") 오탐지 해결](#이슈-18-한국어-ui-환경에서-구글-자동-번역본google-제공-번역-원본-보기-오탐지-해결)
19. [이슈 #19: 별점 전용 리뷰 카드 및 구글 맵스 UI 메타데이터("신규", "주문 유형", "점심 식사" 등) 한글 본문 오파싱 해결](#이슈-19-별점-전용-리뷰-카드-및-구글-맵스-ui-메타데이터신규-주문-유형-점심-식사-등-한글-본문-오파싱-해결)
20. [이슈 #20: 사전 분석 데이터(~21.09) + 실시간 DOM 파싱 데이터의 가중 평균(Weighted Average) 통합 평점 산출](#이슈-20-사전-분석-데이터2109--실시간-dom-파싱-데이터의-가중-평균weighted-average-통합-평점-산출)
21. [이슈 #21: 구글 맵스 주소 DOM 파싱 및 Material Symbols 아이콘 폰트(\uE000-\uF8FF) 네모 박스(□) 제거](#이슈-21-구글-맵스-주소-dom-파싱-및-material-symbols-아이콘-폰트ue000-uf8ff-네모-박스-제거)
22. [이슈 #22: 구글 맵스 카테고리 태그(button.DkEaL) 실시간 DOM 파싱 및 사이드바 표출](#이슈-22-구글-맵스-카테고리-태그buttondkeal-실시간-dom-파싱-및-사이드바-표출)
23. [이슈 #23: 이전 이동 장소 히스토리 URL 파라미터로 인한 gmap_id 잘못 파싱되는 문제 해결](#이슈-23-이전-이동-장소-히스토리-url-파라미터로-인한-gmap_id-잘못-파싱되는-문제-해결)
24. [이슈 #24: 주변 장소 디렉토리 카드 오탐지 및 리뷰 중첩 자식 노드 중복 파싱 방지](#이슈-24-주변-장소-디렉토리-카드-오탐지-및-리뷰-중첩-자식-노드-중복-파싱-방지)
25. [이슈 #25: 크롬 DOM 렌더링 방식(개행 vs 공백) 차이로 인한 리뷰 하단 액션 블록(\n\n1\n\n공유, 1 공유, 좋아요 공유) 잔존 문제 해결](#이슈-25-크롬-dom-렌더링-방식개행-vs-공백-차이로-인한-리뷰-하단-액션-블록n1공유-1-공유-좋아요-공유-잔존-문제-해결)

---

## 🛠️ 트러블슈팅 세부 내역

### 이슈 #1: `__pycache__` 언더스코어 폴더로 인한 크롬 익스텐션 로드 실패

- **증상 (Error Log)**:
  ```text
  Cannot load extension with file or directory name __pycache__.
  Filenames starting with "_" are reserved for use by the system.
  매니페스트를 로드할 수 없습니다.
  ```
- **원인 분석**:
  - 백엔드 테스트용 파이썬 코드(`backend_mock.py`) 문법 검사 및 실행 시 파이썬 인터프리터가 `__pycache__` 캐시 폴더를 자동으로 생성함.
  - 크롬 확장프로그램 보안 정책상 언더스코어(`_`)로 시작하는 파일/디렉토리가 포함되어 있으면 익스텐션 로드가 즉시 거부됨.
- **해결 조치**:
  1. `__pycache__` 디렉토리 즉시 삭제.
  2. `.gitignore`에 `__pycache__/` 및 `*.py[cod]` 규칙 등록.
  3. 익스텐션 전용 폴더(`extension/`)와 백엔드 전용 폴더(`backend/`)를 구조적으로 분리하여 서로 간섭하지 않도록 수정.

---

### 이슈 #2: Manifest V3 `web_accessible_resources` Match Pattern 구문 오류

- **증상 (Error Log)**:
  ```text
  Invalid value for 'web_accessible_resources[0]'. Invalid match pattern.
  매니페스트를 로드할 수 없습니다.
  ```
- **원인 분석**:
  - `manifest.json` 설정 중 `web_accessible_resources`의 `matches` 배열에 `https://www.google.com/maps/*`와 같이 하위 URL 경로 경로를 지정함.
  - Chrome Extension Manifest V3 규격상 `web_accessible_resources`의 `matches`는 도메인 레벨 오리진 패턴(`https://www.google.com/*`)만 허용함.
- **해결 조치**:
  - `extension/manifest.json` 파일의 `matches` 구문을 수정:
    ```json
    "web_accessible_resources": [
      {
        "resources": ["styles.css"],
        "matches": [
          "https://www.google.com/*",
          "https://www.google.co.kr/*"
        ]
      }
    ]
    ```

---

### 이슈 #3: 단순 지도 이동/확대/축소 시 사이드바 패널 예외 처리

- **증상 (Symptom)**:
  - 구글 맵스에서 특정 식당이나 장소를 선택하지 않고 지도를 단순히 줌인/줌아웃하거나 드래그하여 이동할 때(`https://www.google.com/maps/@34.0256,-118.2851...`)도 기존 사이드바 패널이 사라지지 않고 유지되거나 잘못 감지됨.
- **원인 분석**:
  - 기존 감지 로직이 URL에 장소 파라미터(`/place/` 또는 `gmap_id`)가 있는지 검증하지 않고, DOM 변경 이벤트 발생 시 무조건 장소 탐색 프로세스를 수행함.
- **해결 조치**:
  1. `isPlaceSelected(url)` 유효성 검사 함수 구현:
     ```js
     function isPlaceSelected(url) {
       if (!url) return false;
       const hasPlacePath = url.includes('/maps/place/');
       const hasGMapId = !!extractGMapId(url);
       return hasPlacePath || hasGMapId;
     }
     ```
  2. `clearSidebar()` 패널 초기화 함수 구현:
     - 장소가 미선택 상태이거나 `/place/` 경로가 사라진 경우 기존 사이드바 DOM(`shadowRoot`)을 즉시 제거(`innerHTML = ''`)하고 선택 상태값을 초기화함.

---

### 이슈 #4: 구글 맵스 SPA(Single Page App) URL 변경 실시간 탐지 미작동

- **증상 (Symptom)**:
  - 사용자가 구글 맵스 내에서 마우스로 장소를 클릭하여 URL이 바뀌어도 브라우저 기본 `popstate` 이벤트가 발생하지 않아 사이드바가 즉각 갱신되지 않음.
- **원인 분석**:
  - 구글 맵스는 SPA 구조로 제작되어 페이지 이동 시 `popstate` 대신 `history.pushState` 및 `history.replaceState` API를 사용하여 URL을 동적으로 업데이트함.
- **해결 조치**:
  - `extension/content.js`에서 `history.pushState` 및 `history.replaceState` 함수를 훅킹(Monkey Patching)하여 Custom Event `gmap_locationchange`를 발포하고 즉시 감지하도록 구현:
    ```js
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
    ```

---

### 이슈 #5: 구글 맵스 기존 CSS와 익스텐션 UI 스타일 충돌 가능성

- **증상 (Symptom)**:
  - 구글 맵스의 강력한 글로벌 CSS 규칙이 익스텐션 사이드바 UI 요소의 글꼴, 여백, 색상 등을 오염시키거나 반대로 익스텐션 스타일이 구글 맵스 UI를 침범할 위험 존재.
- **원인 분석**:
  - 일반 DOM에 익스텐션 HTML/CSS를 직접 주입(Inject)하면 스타일 오염(CSS Pollution) 발생.
- **해결 조치**:
  - Web Components 표준인 **Shadow DOM** (`shadowHost.attachShadow({ mode: 'open' })`) 기술을 채택하여 사이드바 UI 전체를 격리 렌더링.
  - `styles.css`를 Shadow Root 내부로 전용 로드하여 100% 독립적인 다크 글래스모피즘 UI 보장.

---

### 이슈 #6: Windows PowerShell 가상환경 실행 권한 오류 (`UnauthorizedAccess`)

- **증상 (Error Log)**:
  ```text
  .\Activate.ps1 : 이 시스템에서 스크립트를 실행할 수 없으므로 E:\workspace\...\Activate.ps1 파일을 로드할 수 없습니다.
  + CategoryInfo          : 보안 오류: (:) [], PSSecurityException
  + FullyQualifiedErrorId : UnauthorizedAccess
  ```
- **원인 분석**:
  - Windows PowerShell의 기본 실행 정책(`ExecutionPolicy`)이 `Restricted`로 설정되어 있어 미서명 `.ps1` 스크립트 실행이 보안 차단됨.
- **해결 조치**:
  - **방법 A (추천)**: 스크립트 활성화 과정 없이 파이썬 실행 파일을 직접 지정하여 실행:
    ```powershell
    .\.venv\Scripts\python.exe backend/main.py
    ```
  - **방법 B**: PowerShell에서 현재 사용자 범위 스크립트 실행 권한 부여:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

---

### 이슈 #7: 구글 맵스 SPA 비동기 DOM 렌더링 지연 및 실제 현지 평점 동적 파싱 연동

- **증상 (Symptom)**:
  - 장소를 선택했을 때 우측 사이드바가 렌더링되나, 구글 맵스 화면의 실제 현지 별점(예: `4.7`)이 반영되지 않고 오프라인 Mock / 백엔드 기본 데이터의 평점(예: `4.4`)이 고정 표시됨.
- **원인 분석**:
  - 구글 맵스는 SPA(Single Page Application) 구조로 장소 클릭 후 좌측 상세 패널 DOM(`span[aria-hidden="true"]`)이 그려지는 데 100~500ms 이상의 비동기 네트워크/렌더링 지연이 발생함.
  - `processPlaceDetection()` 실행 시점에 DOM에 평점 태그가 존재하지 않아 파싱 실패 후 Fallback 점수로 사이드바가 렌더링되고 프로세스가 종료됨.
- **해결 조치**:
  1. **다중 셀렉터 DOM 파싱 함수 (`extractRatingFromDOM`) 구현**:
     - `div.F72Y3c`, `span.ceW3ed`, `span[aria-hidden="true"]` (`/^[1-5]\.\d$/`), `aria-label` 속성 등 다양한 구글 맵스 별점 구조 탐색.
  2. **문화 보정 평점 계산 (`applyDOMRating`)**:
     - 파싱 성공 시 실제 DOM 평점을 `local_rating`에 반영하고, 사전 데이터셋의 문화권 보정 차이값($\Delta = \text{한국인 평점} - \text{현지 평점}$)을 유지하여 `korean_rating` 자동 재계산.
  3. **SPA 지연 로딩 대응 Retry 및 MutationObserver 연동 (`scheduleRatingRetry`)**:
     - initial detection 실패 시 300ms, 700ms, 1200ms, 2000ms 비동기 Retry 타이머 가동.
     - `MutationObserver` 이벤트 발생 시 동일 장소라도 DOM 평점이 새로 파싱되면 사이드바 점수를 즉시 업데이트.

---

### 이슈 #8: 구글 자동 번역본("Google 제공 번역") 오탐지 및 리뷰 중복 파싱 문제

- **증상 (Symptom)**:
  - 구글 맵스에서 원문이 외국어인 리뷰가 `"Google 제공 번역"`으로 자동 번역되었음에도 불구하고, 순수 한국인 리뷰 필터링에 걸리지 않고 수집되는 문제 발생.
  - 동일한 한국인 리뷰가 콘솔 및 데이터에 2회씩 중복 파싱되어 등록되는 현상 발생.
- **원인 분석**:
  - 기존 감지 키워드에 구글 맵스 한국어 UI의 실제 표준 문구인 `"Google 제공 번역"`이 누락되어 있음.
  - `querySelectorAll` 실행 시 최상위 리뷰 카드 컨테이너(`div.jftiEf`)와 하위 컨테이너(`div.gWSYe`)를 동시에 수집하여 동일 리뷰가 중복 탐색됨.
- **해결 조치**:
  1. `isNativeKoreanReview()`에 `"Google 제공 번역"`, `"Google 제공"`, `"원본 보기"` 키워드를 추가하여 외국어 자동 번역본 100% 필터링.
  2. 최상위 카드가 되는 `div.jftiEf`, `div[data-review-id]` 요소만 단일 파싱하고, `Set` 고유 키 (`author + text`) 기반 중복 방지 로직 적용.

---

### 이슈 #9: 리뷰 파싱 및 DOM 갱신 시 사이드바 화면 깜빡임(Flickering) 및 슬라이드 애니메이션 중복 실행 문제

- **증상 (Symptom)**:
  - `MutationObserver` 및 Retry 타이머에 의해 리뷰 파싱이 실행될 때마다 우측 익스텐션 사이드바가 튀거나 순간적으로 사라졌다 등장하며 깜빡거리는 문제 발생.
- **원인 분석**:
  - `renderSidebar()` 실행 시마다 최상위 노드인 `<div id="gmap-decoder-sidebar">` 전체를 새로 그려 `styles.css`에 지정된 등장 애니메이션(`slideInRight`, 투명도 0에서 슬라이드)이 계속 재실행됨.
  - 파싱된 리뷰 데이터에 변경사항이 없을 때도 불필요한 DOM re-render가 발생함.
- **해결 조치**:
  1. 기존 사이드바 노드가 존재하는 경우 `style="animation: none !important;"`를 적용하여 애니메이션 중복 실행(깜빡임) 차단.
  2. `extractNativeKoreanReviewsFromDOM()` 내 `JSON.stringify` 기반 데이터 동일성 검사(`isDataChanged`)를 도입하여 실제 변경사항이 있을 때만 UI 갱신을 수행하도록 최적화.

---

### 이슈 #10: 리뷰 본문 내 비디오 타임스탬프(`0:03`), 사진 수(`+15`), 옵션 태그(`식사 유형…`) 잔존 노이즈 문제

- **증상 (Symptom)**:
  - 파싱된 리뷰 본문 텍스트에 비디오 재생 시간(`0:03`, `0:15`), 첨부 사진 수(`+3`, `+15`), 구글 맵스 선택 폼 태그(`식사 유형…`) 및 문장 끝 단독 숫자(` 1`)가 찌꺼기 텍스트로 함께 노출되는 문제 발생.
- **원인 분석**:
  - 구글 맵스 리뷰 카드 내에 미디어 메타데이터 및 폼 선택 옵션 요소가 포함되어 있어 단순 `innerText` 추출 시 노이즈 문자가 텍스트에 포함됨.
- **해결 조치**:
  - `extractNativeKoreanReviewsFromDOM()` 텍스트 정화 단계에 정규식 패턴 추가:
    - `\b\d+:\d+\b` (비디오 타임스탬프 제거)
    - `\+\d+` (사진/첨부 파일 개수 제거)
    - `(?:식사 유형|음식점 유형|가격대|추천 메뉴|방문 목적)[^\n]*` (구글 폼 옵션 태그 제거)
    - `\s+\d+\s*$` (문장 끝 단독 추천수/좋아요 수 제거)

---

### 이슈 #11: 구글 맵스 UI 노이즈(자세히 보기, 좋아요, 공유, 식사 유형) 샌드위치 텍스트 잔존 및 통합 Cut-off 해결

- **증상 (Symptom)**:
  - 리뷰 세탁 후에도 일부 리뷰 카드 문장 끝에 `  1 ` 또는 찌꺼기 공백이 남아있는 문제 발생 (예: `"LA에서... 맛집입니다.~!!  1 "`).
- **원인 분석**:
  - 구글 맵스 DOM 텍스트 구조상 `"자세히 보기"`나 `"공유"` 버튼 사이에 동영상 재생 시간(`0:03`), 첨부 사진 수(`+3`), 추천/좋아요 수(`1`)가 샌드위치처럼 포함되어 있음.
  - 단어 단위로 단순 치환을 수행할 경우 문자열 끝 지점이 바뀌어 문장 끝 숫자 제거 정규식(`\d+$`)의 탐지 조건이 깨짐.
- **해결 조치**:
  1. **통합 Cut-off 정규식 도입 (`split`)**:
     - `/(?:자세히 보기|간단히 보기|좋아요|공유|업체 대표 응답|식사 유형|음식점 유형|1인당 가격|가격대|음식:|서비스:|분위기:|소음 수준|그룹 크기|주차 공간|주차 옵션|추천 메뉴|방문 목적)/i`
     - 위 키워드 중 최초 발생하는 위치 이전까지만 텍스트를 절단(`split[0]`)하여, 그 뒤에 오는 미디어 타임스탬프, 미디어 개수, 추천/좋아요 수 등 하단 노이즈 전체를 100% 통째로 제거.
  2. **RAW 콘솔 디버그 로그 추가**:
     - F12 개발자 도구 콘솔에 `[KR Reviews RAW]` 태그로 DOM 원본(`rawText`)과 세탁 후(`text`)를 실시간 대조 출력하도록 개선.

---

### 이슈 #12: 스폰서/광고 장소 선택 시 상호명이 "스폰서"로 파싱되는 오탐지 문제 해결

- **증상 (Symptom)**:
  - 구글 맵스에서 스폰서/광고 라벨이 붙은 장소(예: Jimmy John's)를 선택하면 익스텐션 사이드바 상단 카드의 장소명이 실제 상호명이 아닌 `"스폰서"`(또는 Sponsor, Ad)로 파싱되어 노출됨.
- **원인 분석**:
  - 광고 장소 카드 헤더 DOM 내부에는 `<span class="...">스폰서</span>` 뱃지 노드가 `h1` 태그 바로 앞이나 내부에 포함되어 있어 `innerText` 추출 시 상호명보다 뱃지 문구가 먼저 파싱됨.
- **해결 조치**:
  - `extractPlaceNameFromDOM()` 함수에서 `h1.DU314e`, `h1.fontTitleLarge`, `h1.DUwfxb`, `[role="main"] h1`, `h1` 셀렉터를 차례로 검사.
  - 추출된 텍스트에서 정규식 기반으로 `"스폰서"`, `"Sponsor"`, `"Ad"`, `"광고"` 라벨을 완전 제거 후 순수 상호명만 추출하도록 수선.

---

### 이슈 #13: 한국인 리뷰 미감지 시 임의 평점 보정 수치 제거 및 '데이터 없음' UI 표출 개선

- **증상 (Symptom)**:
  - 사전 등록 데이터셋에 없고 한국인 원문 리뷰가 탐지되지 않은 미등록 장소 선택 시에도 임의의 가상 보정 평점(예: `3.8 / 5.0 (-0.6)`)이 자동 생성되어 노출되는 문제 발생.
- **원인 분석**:
  - 오프라인 동적 렌더링 엔진(`generateMockData`)에서 해시값 기반으로 임의의 가상 보정 평점을 계산하여 반환하도록 구현되어 있었음.
- **해결 조치**:
  1. `generateMockData()` 수정: 사전 데이터 미존재 장소인 경우 임의 보정 수치 대신 `korean_rating: null` 및 `hasKoreanData: false` 반환.
  2. `renderSidebar()` UI 분기 추가:
     - 한국인 데이터 미감지 시 평점 상자에 `<span style="font-size: 15px; color: #9ca3af;">데이터 없음</span>` 및 회색 `리뷰 미감지` (`.delta-none`) 뱃지 출력.
  3. 실시간 리뷰 감지 연동:
     - 구글 맵스 좌측 상세 패널에서 리뷰 탭 클릭 시 한국인 리뷰가 1건이라도 추출되는 순간, 실시간 평균 평점으로 사이드바가 즉시 자동 변환 업데이트되도록 처리.

---

### 이슈 #14: 구글 제공 번역 버튼("Google 제공 번역" / "Google 제공")과 리뷰 원문 구분 및 오탐지 해결

- **증상 (Symptom)**:
  - 구글 맵스가 한국어 원문 리뷰 하단에 "Google 제공 번역" (또는 "Google 제공") 버튼을 부착하는 바람에, 기존 필터가 이를 번역본 뱃지로 오인하여 원문 한국어 리뷰까지 제외 처리하는 문제 발생.
- **원인 분석**:
  - 구글 맵스 UI 업데이트로 인해 원문 리뷰 하단에도 구글 번역 연동용 라벨("Google 제공 번역", "Google 제공")이 버튼 형태로 부착됨.
  - 기존 `isNativeKoreanReview`의 번역 뱃지 필터 키워드와 UI 절단 키워드가 혼재되어 있어 원문 한글 텍스트가 잘리거나 버려짐.
- **해결 조치**:
  1. 번역 뱃지 키워드(`Google에서 번역한 내용`, `Google에서 번역함`, `자동 번역됨`)와 UI 절단 버튼 키워드(`Google 제공 번역`, `Google 제공`, `Google 번역`)를 명확히 분리.
  2. `uiCutoffRegex`에서 하단 UI 버튼을 텍스트 절단(Cut-off) 지점으로만 처리하고, 절단 전 원문 텍스트 내 한글 유니코드(`[\uAC00-\uD7A3]`) 존재 여부를 검사하도록 수선하여 `Mj H`, `Olivia Dunham`, `3dogs1monkey` 등 한글 원문 리뷰 100% 수집 복구.

---

### 이슈 #15: 구글 맵스 개요(Overview) 탭 자동 전환 차단 및 '리뷰 더 불러오기' 수동 트리거 개선

- **증상 (Symptom)**:
  - 사용자가 장소를 클릭하거나 페이지를 새로고침할 때마다 익스텐션이 자동으로 구글 맵스의 탭을 "리뷰" 탭으로 강제 전환하여 탐색 흐름을 방해함.
- **원인 분석**:
  - `processPlaceDetection()` 내부에서 한국어 리뷰를 수집하기 위해 페이지 로드 시점에 무조건 `reviewsTab.click()`을 자동으로 실행하도록 구현되어 있었음.
- **해결 조치**:
  1. 페이지 로드/새로고침 시의 자동 탭 전환 로직 전면 제거 (개요 탭 화면 그대로 유지).
  2. 사이드바 UI 내에 **`📥 더 불러오기`** (또는 `📥 'More reviews' 자동 클릭 & 스크롤 실행`) 버튼을 추가하여, 사용자가 명시적으로 클릭했을 때만 탭 전환 및 스크롤이 수행되도록 개선.
  3. 버튼 클릭 시 `⏳ 수집 중...` 상태 피드백 및 버튼 비활성화로 시각적 UX 향상.

---

### 이슈 #16: 구글 맵스 영어 UI 환경에서의 리뷰 지연 로딩(AJAX) 및 동적 스크롤 부모 추적(`getReviewScrollParent` / `waitForReviewCards`)

- **증상 (Symptom)**:
  - 구글 지도가 영어 UI 상태일 때, **`📥 더 불러오기`** 버튼을 누르면 리뷰 탭으로 전환만 되고 패널이 자동으로 스크롤되지 않아 사용자가 직접 스크롤을 내려야만 10위 이하 한국어 리뷰가 파싱되는 현상 발생.
- **원인 분석**:
  1. 구글 지도가 개요 탭에서 리뷰 탭으로 전환될 때 서버에서 리뷰 목록을 비동기(AJAX)로 가져오는 데 약 **800ms~1000ms 소요**.
  2. 기존 코드가 AJAX 응답이 오기도 전인 **400ms 시점(리뷰 카드 0개 빈 화면)**에 스크롤을 시도하여 스크롤 명령이 무효화됨.
  3. 구글 지도가 탭을 이동할 때마다 내부 스크롤 박스 DOM을 새로 다이나믹하게 재구성함.
- **해결 조치**:
  1. **`waitForReviewCards(timeoutMs)` 비동기 폴링 도입**: 고정 시간 대기 대신 100ms 간격으로 감지하여 DOM에 리뷰 카드(`div.jftiEf`)가 실제로 들어오는 직후 스크롤을 실행하도록 타이밍 동기화.
  2. **`getReviewScrollParent()` 동적 부모 역추적**: 정적 선택자 대신 DOM 리뷰 카드 요소부터 상위 `parentElement` 체인을 역추적하여 실제 `overflow-y: scroll/auto` 박스 추출 후 `scrollTop = scrollHeight` 및 `wheel`/`scroll` 이벤트 발송.

---

### 이슈 #17: 리뷰 작성 상대일자(`7개월 전` / `7 months ago`) 추출 및 사이드바 UI 표시

- **증상 (Symptom)**:
  - 수집된 한국어 리뷰 카드에 작성 일자 정보가 표시되지 않아 언제 작성된 리뷰인지 구분하기 어려움.
- **원인 분석**:
  - 파싱 데이터 스키마에 작성자(`author`), 별점(`rating`), 본문(`text`)만 존재하고 일자(`date`) 필드가 누락되어 있었음.
- **해결 조치**:
  1. 리뷰 카드 DOM 선택자(`.r7bNeb`, `span.r7bNeb`, `[class*="date"]`) 및 정규식을 활용하여 상대 일자(`7개월 전`, `7 months ago`, `수정일: 2주 전`) 추출 로직 추가.
  2. `renderSidebar()`에 일자 바인딩을 적용하여 **`👤 Mj H · 7개월 전 (★ 5.0)`**과 같이 작성자 옆에 깔끔하게 노출되도록 UI 보완.

---

### 이슈 #18: 한국어 UI 환경에서 구글 자동 번역본("Google 제공 번역", "원본 보기") 오탐지 해결

- **증상 (Symptom)**:
  - 구글 맵스를 한국어 언어 설정(Korean UI)으로 전환했을 때, 외국인(Olivia Dunham, 3dogs1monkey 등)이 영어로 작성한 리뷰를 구글 지도가 한국어로 자동 번역해 준 텍스트가 순수 한국인 작성 원문 리뷰로 오탐지되는 문제 발생.
- **원인 분석**:
  - 한국어 UI 환경에서 구글 지도가 외국어 리뷰를 한글로 기계번역할 때 하단에 **`"Google 제공 번역 ・ 원본 보기(영어)"`** 라벨을 부착함.
  - 이 라벨 키워드가 `machineTranslationBadges` 차단 목록에서 제외되어 있어 한글 유니코드 조건을 통과한 번역 텍스트가 한국인 원문 리뷰로 간주됨.
- **해결 조치**:
  1. `isNativeKoreanReview`의 차단 목록(`machineTranslationBadges`)에 `Google 제공 번역`, `Google 제공`, `Google 번역`, `Google에서 번역`, `원본 보기`, `원본(`, `Translated by Google`, `See original`을 명확히 추가.
  2. 순수 한국인이 작성한 원문 한글 리뷰(`Mj H`)에는 위 번역 뱃지가 전혀 포함되지 않으므로 100% 정상 통과되며, 외국인 작성 한글 번역본은 100% 수집 제외 처리됨.

---

### 이슈 #19: 별점 전용 리뷰 카드 및 구글 맵스 UI 메타데이터("신규", "주문 유형", "점심 식사" 등) 한글 본문 오파싱 해결

- **증상 (Symptom)**:
  - 텍스트 없이 별점만 남겨진 리뷰 카드에서 구글 맵스 시스템 UI 단어인 `"신규"`, `"New"`, `"주문 유형"`, `"식사 유형"`, `"매장 내 식사"`, `"점심 식사"`, `"자세히 보기"` 등이 한글 본문으로 잘못 오인되어 한국어 리뷰 목록에 파싱되는 문제 발생.
- **원인 분석**:
  1. `isNativeKoreanReview()`에서 UI 키워드가 제거되지 않은 원본 DOM 텍스트(`fullText`)에 한글 유니코드 존재 여부를 먼저 검사함으로써, "신규"나 "주문 유형: 매장 내 식사" 뱃지가 있는 별점 전용 리뷰가 한글 리뷰로 판별됨.
  2. 세탁(Clean) 과정에서 `식사 유형` 헤더만 단순 치환되어, 뒤따르는 설문 선택값인 `"점심 식사"`, `"저녁 식사"`, `"매장 내 식사"` 등의 단어가 텍스트 본문에 남겨져 한글 본문 조건(`[\uAC00-\uD7A3]`)을 통과함.
  3. 본문 문장 내 쓰인 `"음식맛도 좋아요"`의 `"좋아요"`까지 단어 단위 단순 치환으로 지워져 본문 텍스트가 훼손되는 현상 발생.
- **해결 조치**:
  1. **`cleanReviewText(rawText, author)` 정화 로직 전면 개편**:
     - 시스템 뱃지/라벨(`신규`, `New`, `지역 가이드`, `리뷰 \d+개`, `사진 \d+장`) 제거
     - 설문 항목 및 선택값(`식사 유형`, `주문 유형`, `점심 식사`, `저녁 식사`, `아침 식사`, `브런치`, `야식`, `매장 내 식사`, `테이크아웃`, `배달`, `포장`, `1인당 가격`, `대기 시간` 등)을 `uiCutoffRegex` 절단 대상에 추가하여 설문 영역이 발견되는 즉시 통째로 절단(`split[0]`)
     - 독립된 Action 버튼(`\n+\s*(?:좋아요|공유)`) 위치에서만 절단되도록 처리하여 본문 문장 내 자연스러운 `"좋아요"` 단어 훼손 방지
  2. **한글 원문 검증 시점 변경 (`isNativeKoreanReview`)**:
     - UI 메타데이터 키워드가 완전히 세탁된 `pureText`를 먼저 생성한 후 한글 유니코드 존재 여부 검사.
  3. **별점 전용 리뷰 완전 필터링**:
     - UI 단어 세탁 후 남은 본문 텍스트가 없거나 의미 없는 특수문자/숫자뿐이면 `pureText`를 `""` (빈 값) 처리하여 원문 리뷰 목록에서 100% 필터링 처리.

---

### 이슈 #20: 사전 분석 데이터(~21.09) + 실시간 DOM 파싱 데이터의 가중 평균(Weighted Average) 통합 평점 산출

- **증상 (Symptom)**:
  - 2021년 9월 이전 UCSD 데이터셋 기반 사전 데이터만 표시되거나 실시간 파싱된 리뷰 평점만 단독 적용되어 과거/현재 데이터를 아우르는 통합 체감 평점 계산이 불가능했음.
- **원인 분석**:
  - 사전 분석 데이터 스키마의 키 명칭(`kr_count`, `passed_min_reviews`, `korean_review_count`, `kr_avg`, `avg_rating`, `korean_rating`)이 가변적이어서 통합 계산 시 안전한 접근 어댑터가 필요했음.
- **해결 조치**:
  1. **`extractPastKrData(pastData)` 어댑터 구현**: 사전 데이터의 개수와 평점을 안전하게 추출.
  2. **`calculateCombinedKrRating()` 수식 구현**:
     $$\text{combinedRating} = \frac{(\text{pastKrRating} \times \text{pastKrCount}) + \sum \text{liveKrScores}}{\text{pastKrCount} + \text{liveKrCount}}$$
  3. **사이드바 UI 연동**: "🇰🇷 한국인 체감 평점" 영역에 통합 평점 및 총 리뷰 수(예: `격차 -0.6 (총 18건)`) 동적 반영.

---

### 이슈 #21: 구글 맵스 주소 DOM 파싱 및 Material Symbols 아이콘 폰트(\uE000-\uF8FF) 네모 박스(□) 제거

- **증상 (Symptom)**:
  - 구글 맵스 상세 패널의 주소 버튼(`button[data-item-id="address"]`)에서 주소를 읽어올 때 `3201 S Hoover St...` 앞에 네모 박스(`□`) 깨짐 문자가 함께 파싱됨.
- **원인 분석**:
  - 구글 맵스가 위치 아이콘 표시를 위해 `Google Material Symbols` 전용 웹 폰트(Private Use Area Unicode `\uE000-\uF8FF`)를 HTML에 삽입하여, plain text로 파싱 시 폰트 미적용으로 네모 박스가 생성됨.
- **해결 조치**:
  1. **`cleanAddressText(str)` 정화 함수 작성**:
     - `str.replace(/[\uE000-\uF8FF]/g, '')`로 구글 심볼 특수문자 전면 제거.
     - `str.replace(/^[^\w\d\uAC00-\uD7A3가-힣]+/, '')`로 문장 앞단 아이콘 찌꺼기 완벽 정제.
  2. **`extractAddressFromDOM()` 구현**: `.Io6YTe` 및 `aria-label`에서 주소를 파싱하여 깨끗한 주소 문자열만 사이드바에 표출.

---

### 이슈 #22: 구글 맵스 카테고리 태그(button.DkEaL) 실시간 DOM 파싱 및 사이드바 표출

- **증상 (Symptom)**:
  - 장소의 식당/업종 카테고리 태그(예: `"샌드위치 가게"`, `"샐러드 전문점"`)가 사이드바 상단 카드에 동적으로 파싱되지 않고 고정 문구로 노출되는 현상.
- **원인 분석**:
  - 구글 맵스가 카테고리 태그에 `button.DkEaL` 및 `button[jsaction*="category"]` 클래스를 할당하고 있어 별도의 파서가 필요했음.
- **해결 조치**:
  1. **`extractCategoryFromDOM()` 함수 추가**: `button.DkEaL` 버튼을 자동 탐색하여 카테고리 태그 추출 (중복 시 쉼표로 결합).
  2. **사이드바 동적 바인딩**: `processPlaceDetection` 및 `scheduleRatingRetry`에서 `data.category`를 실시간 갱신 및 사이드바 상단 `🏷️` 영역에 노출.

---

### 이슈 #23: 이전 이동 장소 히스토리 URL 파라미터로 인한 gmap_id 잘못 파싱되는 문제 해결

- **증상 (Symptom)**:
  - 이전 탐색 장소(예: Jimmy John's)에서 새 장소(예: CAVA)를 지도에서 직접 클릭 시 URL에 이전 장소와 현재 장소의 `0x...:0x...` ID가 동시에 남아 사이드바가 CAVA로 전환되지 않고 Jimmy John's에 멈춰있는 현상.
- **원인 분석**:
  - `extractGMapId(url)`가 `url.match(/!1s.../)`로 첫 번째 등장하는 `gmap_id`를 선택하여 이전 히스토리 장소의 ID가 선택되었음.
- **해결 조치**:
  1. `url.matchAll(/(0x[0-9a-fA-F]{12,18}:0x[0-9a-fA-F]{12,18})/gi)`을 통해 URL 내 모든 Hex ID 파라미터를 수집.
  2. 히스토리 이전 장소 ID 대신 **가장 마지막 위치의 ID (`matches[matches.length - 1][1]`)**를 선택하도록 개선하여, 장소 이동 시 현재 선택된 CAVA로 즉시 100% 자동 전환되도록 해결.

---

### 이슈 #24: 주변 장소 디렉토리 카드 오탐지 및 리뷰 중첩 자식 노드 중복 파싱 방지

- **증상 (Symptom)**:
  - 쇼핑몰/건물 내 장소(예: USC Village 인섬니아 쿠키스) 탐색 시, 인근 식당/체육관 디렉토리 리스트(`USC Village Fitness Center`, `Ramen Kenjo`)가 작성자 `'익명'`의 한국인 원문 리뷰로 오파싱되고, 동일 리뷰 카드가 자식 노드 매칭으로 인해 Jinsoo Kim, Changyong Lee 각 2회씩 중복 추출되는 문제.
- **원인 분석**:
  1. 디렉토리 카드가 작성자가 없거나 `'익명'`이면서 한글 운영 정보(`"체육관 · 1층"`, `"영업 종료"`)를 포함해 한국어 유효 리뷰로 판별됨.
  2. 선택자 `div.WMD5W`, `[role="article"]` 등이 외곽 리뷰 카드(`div.jftiEf`)와 그 내부 자식 엘리먼트를 동시에 선택함.
- **해결 조치**:
  1. **`isStoreDirectoryCard` 필터 추가**: 작성자 `'익명'` + 매장 운영 라벨 패턴(`영업 종료`, `영업 시작`, `체육관`, `음식점`, `$$`) 포함 시 100% 수집 거부.
  2. **Nested Child 노드 중복 제거**: `reviewCards.filter`에서 `card.parentElement.closest(...)` 검사를 수행해 상위 카드만 단 1회 파싱.
  3. **`reviewContainer` 스코프 조준**: 첫 리뷰 카드의 부모를 역추적하여 개요 탭 위젯을 제외한 **리뷰 전용 DOM 패널(`div.m6QEdf`) 내부로 파싱 범위 제한**.

---

### 이슈 #25: 크롬 DOM 렌더링 방식(개행 vs 공백) 차이로 인한 리뷰 하단 액션 블록(`\n\n1\n\n공유`, ` 1 공유`, `좋아요 공유`) 잔존 문제 해결

- **증상 (Symptom)**:
  - 리뷰 본문 수집 시 본문 끝단에 ` 1  공유` 또는 ` 좋아요  공유` 텍스트가 지워지지 않고 남아있는 현상(`"트레이더조 때문에...좋아요 😀…  1  공유"`).
- **원인 분석**:
  - 구글 맵스 및 크롬 렌더링 엔진 조건에 따라 `card.innerText`가 `\n\n1\n\n공유` (개행) 형태로 들어오기도 하고, ` 1 공유` (공백) 형태로 들어오기도 함. 개행(`\n+`) 전용 정규식은 공백 기반 텍스트를 감지하지 못해 수식을 우회함.
- **해결 조치**:
  1. **문장 끝단($) 앵커링 기반 3단계 수술형 정규식 도입**:
     ```javascript
     pureText = pureText
       .replace(/(?:\r?\n+|\s+)(?:좋아요\s+)?(?:\d+\s+)?(?:공유|Share)\s*$/i, '')
       .replace(/(?:\r?\n+|\s+)(?:좋아요|Like)\s*$/i, '')
       .replace(/(?:\r?\n+|\s+)\d+\s*$/g, '');
     ```
  2. **안전성 확보**:
     - 문장 속 자연스러운 `"완전 좋아요."`, `"음식맛도 좋아요"`는 보존.
     - 끝단에 개행 또는 공백으로 붙은 `1  공유`, `좋아요  공유`, `좋아요`, `공유` 찌꺼기 100% 삭제.
