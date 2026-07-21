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

