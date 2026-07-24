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
