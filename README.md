# GMap Review Decoder (문화권/언어별 맞춤 리뷰 분석)

구글 맵스(`https://www.google.com/maps/*`)에서 장소/식당이 선택되었을 때, URL 파라미터에서 **UCSD Google Local Reviews 데이터셋 규격 식별자(`gmap_id`)**를 정규식으로 자동 추출하고, 크롬 화면 우측에 **한국인 맞춤 보정 리뷰 분석 패널(Shadow DOM)**을 렌더링하는 크롬 확장프로그램 프로젝트입니다.

---

## 📑 주요 문서 바로가기

| 문서명 | 주요 내용 | 링크 |
| :--- | :--- | :---: |
| 🐍 **BACKEND_SETUP.md** | 백엔드 파이썬 가상환경(`.venv`) 설정, 패키지 설치, PowerShell 권한 & 실행 가이드 | [바로가기](BACKEND_SETUP.md) |
| 📊 **DATA_SPEC.md** | 동적 다중 JSON 스캐너 스키마, `gmap_id` 규격, `.gitignore` 데이터 관리 가이드 | [바로가기](DATA_SPEC.md) |
| 🛠️ **TROUBLESHOOTING.md** | 개발 중 발생한 문제 해결 이력 (PowerShell 권한, SPA URL 감지, Manifest V3 규격 등) | [바로가기](TROUBLESHOOTING.md) |
| 📦 **sample_places.json** | 최상위 `data/` 폴더의 UCSD 규격 단일 샘플 데이터셋 (CAVA, 선농단, 북창동순두부, 피터루거) | [바로가기](data/sample_places.json) |

---

## 🔄 데이터 수신 & 우선순위 구조 (Dual Mode)

```text
1순위 (최우선): FastAPI 백엔드 호출 (http://localhost:8000/api/analyze)
   │
   ├── [성공 시] root data/*.json 동적 스캔 데이터 반환 & 🟢 "FastAPI 백엔드 연결됨" 표시
   │
   └── [실패 시 (서버 미실행)] 
          │
          └── 2순위 (폴백): 내장 CAVA 데이터 / 오프라인 동적 엔진 사용 & 🟡 "Mock Fallback Engine" 표시
```

1. **1순위 (백엔드 실행 시)**: FastAPI 서버(`backend/main.py`)가 `data/` 폴더 내의 모든 `*.json` 파일을 자동 스캔 및 병합하여 실시간 최신 분석 데이터를 제공합니다.
2. **2순위 (오프라인/백엔드 미실행 시)**: 확장프로그램 내부에 CAVA 및 주요 식당 데이터셋이 내장되어 있어 백엔드 없이도 100% 독립 동작합니다.

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
├── backend/               # 🐍 FastAPI 백엔드 & ML 서버
│   ├── main.py            # FastAPI 라우터 서버 (gmap_id API 엔드포인트)
│   ├── database.py        # 동적 다중 JSON 데이터베이스 모듈 (data/*.json 스캔 & 병합)
│   └── requirements.txt   # 백엔드 의존성 목록 (fastapi, uvicorn 등)
│
├── data/                  # 📊 ⭐️ 최상위 루트의 원본 데이터 폴더 (data/*.json 자동 스캔)
│   └── sample_places.json # 장소별 보정 리뷰 기본 샘플 JSON
│
├── .gitignore             # Python/OS/IDE 캐시 및 data/*.json 대용량 파일 제외 설정
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
