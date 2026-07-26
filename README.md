# GMap Review Decoder (문화권/언어별 맞춤 리뷰 분석)

구글 맵스(`https://www.google.com/maps/*`)에서 장소/식당이 선택되었을 때, URL 파라미터에서 **UCSD Google Local Reviews 데이터셋 규격 식별자(`gmap_id`)**를 정규식으로 자동 추출하고, 구글 맵스 DOM에서 **실제 현지 구글 평점(예: 4.7)**을 실시간 파싱하여 크롬 화면 우측에 **한국인 맞춤 보정 리뷰 분석 패널(Shadow DOM)**을 렌더링하는 크롬 확장프로그램 프로젝트입니다.

---

## 🌟 주요 기능

1. **gmap_id & DOM 장소 자동 추출**: URL 정규식 패턴(`!1s0x...`) 및 DOM 헤더 탐색으로 장소 식별
2. **실제 구글 맵스 DOM 평점 실시간 파싱**: 상세 패널의 실제 별점(예: `4.7`)을 DOM에서 실시간 탐색 (`div.F72Y3c`, `span[aria-hidden="true"]`, `aria-label`)
3. **순수 한국인 원문 리뷰 실시간 추출 & 텍스트 정화**:
   - 구글 자동 번역본(`"Google 제공 번역"`, `"Google 번역"` 등) 완전 제외 및 순수 세탁 본문 기반 한글 유니코드 정규식 필터링
   - 시스템 뱃지(`"신규"`, `"New"`), 비디오 타임스탬프(`0:03`), 사진 수(`+15`), UI 버튼(`"자세히 보기"`, `"좋아요"`), 설문/선택 옵션 노이즈 및 별점 전용 리뷰 100% 필터링
4. **사용자 프로필 UI & 데이터 스키마 이원화 구조 (v2 Spec)**:
   - **Section A [v2 중요도 가중치 (1~5점)]**: 🍱 Taste(`t`), 💁 Service(`s`), 💰 Value(`v`), ✨ Atmosphere(`a`) 항목별 중요도 반영
   - **Section B [해외 음식 적응 취향 슬라이더 (1~5점)]**: 🏮 Local Authenticity, 🥑 Greasiness, 🌶️ Spiciness, 🌿 Herbs 4가지 미각/향신료 수용도 스펙트럼 세팅
5. **취향 기반 한국인 리뷰 자동 매칭 및 우선 정렬**:
   - 사용자 설정 취향(🌶️ Spiciness, 💁 Service 등)과 일치하는 키워드가 작성된 한국인 리뷰에 `🎯 Matches your profile: 🌶️ Spiciness` 글래스모피즘 배지 표출 및 상단 추천 정렬
6. **취향 일괄 초기화 버튼 (`🔄 Reset Preferences`)**:
   - 팝업 설정 창의 초기화 버튼으로 8개 중요도 및 취향 슬라이더를 즉시 **3점 (가운데/50%/60% Balanced)**으로 일괄 리셋
7. **The Cheesecake Factory CSV 오버라이드 & 팝업 디버그 모드 (Debug Mode)**:
   - 팝업 설정 창의 `🐞 Debug Mode (Local CSV)` 토글을 켜면 The Cheesecake Factory (`0x80c2b92fc2d303c3:0x17a5bf3c12b6eeb5`) 접속 시 64개 전용 한국인 리뷰 데이터셋(`cheesecake_factory_reviews.json`)이 즉시 오버라이드 노출되며, 토글을 끄면 원래 상태로 완벽 복원됨
8. **리뷰 작성 상대일자(`7개월 전`) 추출 및 연동**:
   - 파싱된 리뷰 카드마다 작성자명 옆에 상대 작성 일자(`👤 Mj H · 7개월 전`)를 시각적으로 명확히 표시
9. **수동 리뷰 더보기(`📥 더 불러오기`) & 무한 새로고침 차단 최적화**:
   - 개요 탭을 유지하면서 사용자가 원할 때 명시적으로 클릭하여 구글 맵스 탭 전환 및 지연 로딩(AJAX) 대기 스크롤 실행
   - 동일 장소 감지 시 무분별한 500ms 재렌더링을 100% 차단하여 화면 깜빡임 차단
10. **사전 분석 데이터(~21.09) + 실시간 파싱 데이터의 가중 평균(Weighted Average) 통합 계산**:
    - UCSD 데이터셋 기반 과거 사전 분석 데이터와 실시간 DOM 리뷰 데이터를 가중 평균 공식으로 합산하여 **통합 한국인 체감 평점 및 총 리뷰 수**를 동적 계산 및 표출 (`격차 -0.6 (총 18건)`)
11. **격리된 글래스모피즘 Shadow DOM UI**: 구글 맵스 기존 CSS와의 스타일 오염을 100% 차단한 독립 UI

---

## 📑 주요 문서 바로가기

| 문서명 | 주요 내용 | 링크 |
| :--- | :--- | :---: |
| 🕷️ **scraper/README.md** | 구글 맵스 Place ID & 리뷰 자동 크롤러 실행, 수집 옵션 및 CSV 저장 규격 문서 | [바로가기](scraper/README.md) |
| 🐍 **BACKEND_SETUP.md** | 백엔드 파이썬 가상환경(`.venv`) 설정, 패키지 설치, PowerShell 권한 & 실행 가이드 | [바로가기](BACKEND_SETUP.md) |
| 📊 **DATA_SPEC.md** | 동적 다중 JSON 스캐너 스키마, `gmap_id` 규격, `.gitignore` 데이터 관리 가이드 | [바로가기](DATA_SPEC.md) |
| 🛠️ **TROUBLESHOOTING.md** | 개발 중 발생한 문제 해결 이력 (DOM 평점/리뷰 파싱, 깜빡임 방지, SPA URL 감지 등) | [바로가기](TROUBLESHOOTING.md) |
| 📦 **sample_places.json** | 최상위 `data/` 폴더의 UCSD 규격 샘플 데이터셋 (CAVA, 선농단, 북창동순두부 2개 지점, 피터루거) | [바로가기](data/sample_places.json) |

---

## 🔄 데이터 수신 & 3단계 우선순위 구조 (v2 Dataset Engine)

```text
1순위 (Tier 1): places[gmap_id] (실측 388개 장소 데이터)
   │ ➔ 🎯 [Tier 1 Measured Data] (실측 ko_mean, en_mean, rel_gap, 통계 유의성 배지)
   │
2순위 (Tier 2): place_index[gmap_id].c ➔ categories[category] (17,090개 업종 보정)
   │ ➔ 📊 [Category Level Adjustment] (Google Rating + rel_gap 상대 보정 산출)
   │
3순위 (Tier 3): 미등록 장소 ➔ 🔴 [Tier 3 No Past Dataset Available]
     ➔ korean_rating = N/A (데이터 없음 표출, 오프라인 가짜 Mock 데이터 렌더링 전면 차단)
```

### 📊 데이터 유/무 및 보정 방식 3단계 구분 표

| 구분 단계 | 데이터셋 존재 여부 | 프론트엔드 노출 배지 | 평점 산출 및 표출 로직 |
| :--- | :--- | :--- | :--- |
| 🟢 **Tier 1 (Measured Place Data)** | **해당 장소 실측 데이터 존재** <br>(388개 주요 식당) | `🟢 Measured Place Data Available (Tier 1)` | 한국인 실측 평균 (`ko_mean`) 및 상대격차(`rel_gap`) 직접 적용 |
| 🔵 **Tier 2 (Category Level Adjustment)** | 해당 장소 실측은 없으나 **업종 데이터 존재** <br>(17,090개 식당 검색 인덱스) | `🔵 Category Estimate Data Available (Tier 2)` | **`Google Rating + 업종 rel_gap(g)`** 추정 보정 적용 |
| 🔴 **Tier 3 (No Dataset Available)** | **데이터 완전 미존재** | `🔴 No Cultural Dataset Available (Tier 3)` | **`N/A` (데이터 없음)** 표출 (가짜 Mock 데이터 렌더링 전면 차단) |

### 📌 `Category Level Adjustment` (2순위 업종 보정) 란?
- **개념**: `places` 테이블에 특정 장소의 직접 실측 데이터가 없더라도, 17,090개 식당 검색 인덱스(`place_index`)에 등록되어 있는 장소의 경우 해당 업종 카테고리(`categories`)의 한국인 리뷰 상대격차(`rel_gap`)를 기반으로 평점을 추정 산출하는 보정 기법입니다.
- **상태 표출**: 오버레이 상단에 **`Category Level Adjustment`** 상태 배지가 노출되며, `Google Rating + rel_gap(g) = Adjusted Score` 수식으로 최종 점수가 산출됩니다.

---

1. **팀 데이터셋 1순위 사용**: `extension/data/extension_data.json` 및 `mvp_payload.json`을 최우선 연동.
2. **미국 데모 세션 완전 영문화**: 팝업 UI 및 오버레이 패널 전체 텍스트 English 전환.
3. **최종 보정 점수 수식 카드 공개**: `Google Rating (4.3) + Dataset g (-0.149) = Adjusted (4.15★)` 프론트엔드 투명 공개.
4. **Data Status Banner 노출**: 🟢 Tier 1 Measured / 🔵 Tier 2 Category / 🔴 Tier 3 No Data 색상 배너를 장소 카드 상단에 노출.

---

## 📂 프로젝트 구조

```text
gmaps-culturate-extension/  (최상위 루트)
│
├── extension/             # 🧩 Chrome Extension (Manifest V3)
│   ├── manifest.json      # 익스텐션 설정 및 권한 선언
│   ├── content.js         # DOM/URL Observer, gmap_id 추출, Shadow DOM 사이드바, 오프라인 CAVA 내장
│   ├── styles.css         # 글래스모피즘 스코프 스타일시트
│   ├── popup.html         # 설정 팝업 UI
│   ├── popup.js           # 팝업 설정 컨트롤러
│   └── background.js      # Service Worker
│
├── scraper/               # 🕷️ 구글 맵스 Place ID & 리뷰 자동 크롤링 모듈
│   ├── README.md          # 크롤러 안내 및 사용 설명 문서
│   ├── main.py            # Selenium 기반 크롤러 메인 스크립트
│   ├── requirements.txt   # 스크레이퍼 의존성 목록
│   └── output/            # 수집된 UTF-8-SIG CSV 데이터 저장 폴더
│
├── backend/               # 🐍 FastAPI 백엔드 & ML 서버
│   ├── main.py            # FastAPI 라우터 서버 (gmap_id API 엔드포인트)
│   ├── database.py        # 동적 다중 JSON 데이터베이스 모듈 (data/*.json 스캔 & 병합)
│   └── requirements.txt   # 백엔드 의존성 목록 (fastapi, uvicorn 등)
│
├── data/                  # 📊 ⭐️ 최상위 루트의 원본 데이터 폴더 (data/*.json 자동 스캔)
│   └── sample_places.json # 장소별 보정 리뷰 기본 샘플 JSON
│
├── .gitignore             # Python/OS/IDE 캐시 및 data/*.json, scraper/output/*.csv 제외 설정
├── BACKEND_SETUP.md       # 백엔드 가상환경 및 실행 가이드 문서
├── DATA_SPEC.md           # 데이터 스키마 및 신규 장소 추가 가이드
├── TROUBLESHOOTING.md     # 주요 오류 발생 및 해결 이력 트러블슈팅 문서
└── README.md              # 프로젝트 안내 문서
```

---

## 🚀 크롬 확장프로그램 설치 방법

1. **Chrome 브라우저**를 열고 주소창에 `chrome://extensions` 입력 후 이동.
2. 우측 상단의 **`개발자 모드 (Developer mode)`** 토글을 켭니다.
3. 좌측 상단의 **`압축해제된 확장 프로그램을 로드 (Load unpacked)`** 버튼 클릭.
4. 아래 **`extension` 하위 폴더**를 선택합니다:
   ```text
   e:\workspace\agy_workspace\gmaps-culturate-extension\extension
   ```

---

## 🧪 테스트 방법

### 1. 오프라인 / 단독 실행 테스트 (백엔드 미실행 시)
- 구글 맵스에서 [CAVA 구글 맵스 페이지](https://www.google.com/maps/place/CAVA/@34.0248788,-118.2846665,19z/data=!4m6!3m5!1s0x80c2c7e5bd221ad7:0x6975adb8d798ea0b) 접속.
- 백엔드 없이도 오프라인 내장 CAVA 데이터 기반 사이드바 패널이 즉시 표시됩니다.

### 2. FastAPI 백엔드 연동 테스트
```bash
# 가상환경 파이썬으로 백엔드 서버 실행
.\.venv\Scripts\python.exe backend/main.py
```
- 서버 실행 후 구글 맵스 접속 시 하단 상태창이 `FastAPI 백엔드 연결됨` (200 OK)으로 연동됩니다.
