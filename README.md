# GMap Review Decoder (문화권/언어별 맞춤 리뷰 분석 크롬 확장프로그램)

구글 맵스(`https://www.google.com/maps/*`)에서 장소나 식당을 검색/클릭했을 때, URL 파라미터에서 **UCSD Google Local Reviews 데이터셋 규격 식별자(`gmap_id`)**를 정규식으로 추출하고, 크롬 화면 우측에 **한국인 맞춤 보정 리뷰 분석 패널(Shadow DOM)**을 렌더링하는 크롬 익스텐션입니다.

---

## 🛠️ 주요 기능

1. **URL 기반 `gmap_id` 정규식 추출**:
   - 구글 맵스 URL 내 `!1s` 직후의 `0x[0-9a-fA-F]+:0x[0-9a-fA-F]+` 16진수 패턴을 파싱하여 `gmap_id` 추출 (`extractGMapId(url)`).
   - 예시: `0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3`

2. **Shadow DOM 사이드바 격리 렌더링**:
   - 구글 맵스 기존 DOM 및 CSS와의 충돌을 100% 방지하는 독립 Shadow Root 오버레이.
   - 글래스모피즘(Glassmorphism) 기반 프리미엄 다크 테마 UI 적용.

3. **문화권 맞춤 리뷰 보정 데이터**:
   - ⭐ **현지 구글 평점 vs 🇰🇷 한국인 보정 평점** 비교.
   - 📊 **항목별 문화 인식 비교 게이지** (맛, 서비스, 가성비, 분위기).
   - 💡 **한국어 뉘앙스 디코딩 태그** (`#실제 의미: ...`).

4. **FastAPI 백엔드 & UCSD Key Mapped Mock Data**:
   - `http://localhost:8000/api/analyze?gmap_id=${gmapId}&target_culture=${targetCulture}` 호출.
   - 서버가 꺼져 있을 경우 LA 선농단, 북창동순두부, 뉴욕 피터 루거 등 주요 맛집의 `gmap_id` 매칭 데이터로 즉시 자동 Fallback.

---

## 📁 프로젝트 파일 구조

```
gmaps-culturate-extension/
├── manifest.json       # Chrome Extension Manifest V3 설정
├── content.js          # DOM Observer, gmap_id 정규식 추출, Shadow DOM UI & API 통신
├── styles.css          # Shadow DOM 전용 스코프 글래스모피즘 스타일시트
├── popup.html          # 확장프로그램 설정 팝업 UI
├── popup.js            # 팝업 설정 저장/로드 컨트롤러 (chrome.storage.local)
├── background.js       # Manifest V3 서비스 워커
├── backend_mock.py     # FastAPI 백엔드 테스트용 목 서버 (UCSD dataset key 호환)
└── README.md           # 설명 및 테스트 가이드 문서
```

---

## 🚀 크롬 확장프로그램 설치 방법

1. **Chrome 브라우저**를 열고 주소창에 `chrome://extensions` 입력 후 이동.
2. 우측 상단의 **`개발자 모드 (Developer mode)`** 토글을 켭니다.
3. 좌측 상단의 **`압축해제된 확장 프로그램을 로드 (Load unpacked)`** 버튼 클릭.
4. `e:\workspace\agy_workspace\gmaps-culturate-extension` 폴더를 선택합니다.

---

## 🧪 테스트 방법

### 1. Mock Data 모드 (백엔드 없이 기본 테스트)
- 구글 맵스(`https://www.google.com/maps`) 접속.
- 검색창에 **LA 선농단** 또는 **Sun Nong Dan Los Angeles** 검색 후 클릭.
- URL 예시: `https://www.google.com/maps/place/Sun+Nong+Dan/@34.0631,-118.3001,17z/data=!3m1!4b1!4m6!3m5!1s0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3!...`
- 우측 상단에 슬라이드 애니메이션과 함께 `gmap_id: 0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3` 매칭 분석 사이드바가 렌더링됩니다!

### 2. FastAPI 백엔드 실행 모드 (선택 사항)
```bash
# FastAPI 및 Uvicorn 설치 (필요시)
pip install fastapi uvicorn

# mock 백엔드 서버 실행
python backend_mock.py
# 또는
uvicorn backend_mock:app --reload --port 8000
```
- 백엔드 실행 후 구글 맵스에서 장소를 선택하면 하단에 `FastAPI 백엔드 연결됨` 모드로 실시간 데이터가 수신됩니다.
