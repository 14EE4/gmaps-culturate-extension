# 🕷️ Google Maps Place ID & 리뷰 자동 크롤러 모듈

구글 맵스(`https://www.google.com/maps/*`)에서 선택된 식당/장소의 **Place ID(`gmap_id`)**, 식당 이름, 전체 평점, 총 리뷰 수 및 개별 리뷰 목록(작성자, 별점, 원문 텍스트, 작성 시점)을 자동으로 무한 스크롤 수집하여 CSV 파일로 내보내는 파이썬 크롤링 모듈입니다.

---

## 📂 폴더 구조

```text
scraper/
├── README.md           # 📖 크롤러 안내 및 사용 설명 문서 (본 문서)
├── main.py             # 🐍 Selenium 기반 구글 맵스 자동화 크롤링 메인 스크립트
├── requirements.txt    # 📦 필요 파이썬 의존성 패키지 목록
└── output/             # 📁 수집된 CSV 결과 파일 저장 디렉터리 (Git 추적 제외)
    └── .gitkeep
```

---

## ⚙️ 환경 세팅 및 패키지 설치

최상위 루트 가상환경(`.venv`)이 활성화된 상태에서 아래 명령어로 의존성 패키지를 설치합니다.

```bash
# 최상위 루트 디렉터리에서 실행
.venv\Scripts\python.exe -m pip install -r scraper/requirements.txt
```

### 주요 의존성 패키지
- **`selenium`**: 구글 맵스 동적 DOM 수집 및 무한 스크롤 자동화
- **`webdriver-manager`**: Chrome Driver 자동 다운로드 및 맞춤 버전 관리
- **`pandas`**: 수집된 데이터 구조화 및 UTF-8-SIG CSV 출력
- **`beautifulsoup4`**: HTML 텍스트 정화 및 파싱 보조

---

## 🚀 사용 방법 (실행 가이드)

`scraper/main.py`는 CLI 파라미터 및 인터랙티브 URL 입력 방식을 모두 지원합니다.

### 1. 기본 실행 (인터랙티브 URL 입력)
명령어 실행 후 구글 맵스 식당 URL을 터미널에 입력합니다:
```bash
.venv\Scripts\python.exe scraper/main.py
```

### 2. URL 지정 및 수집 리뷰 수 설정 실행
`--url`과 `--max-reviews` 옵션으로 원하는 수량(예: 50개)을 지정하여 수집합니다:
```bash
.venv\Scripts\python.exe scraper/main.py --url "https://www.google.com/maps/place/CAVA/@32.8687791,-117.2144883,17z/data=!3m1!4b1!4m6!3m5!1s0x80dc07238ab3c99f:0x5e79faefdc7910ff!8m2!3d32.8687791!4d-117.2119134!16s%2Fg%2F11fy01l8z7?hl=ko" --max-reviews 50
```

### 3. 헤드리스(Headless) 모드 실행
브라우저 화면을 띄우지 않고 백그라운드에서 빠르게 실행하려면 `--headless` 플래그를 추가합니다:
```bash
.venv\Scripts\python.exe scraper/main.py --url "https://www.google.com/maps/place/CAVA/..." --max-reviews 100 --headless
```

---

## 📊 CSV 데이터 저장 규격

수집된 데이터는 `scraper/output/{place_name}_reviews.csv` 경로에 저장되며, 엑셀 열람 시 한글 깨짐을 방지하기 위해 **`UTF-8-SIG`** 인코딩이 적용됩니다.

| 컬럼명 | 스키마 설명 | 데이터 예시 |
| :--- | :--- | :--- |
| **`place_id`** | UCSD 데이터셋 호환 `gmap_id` | `0x80dc07238ab3c99f:0x5e79faefdc7910ff` |
| **`place_name`** | 수집 대상 식당/장소 이름 | `CAVA` |
| **`overall_rating`** | 해당 장소의 구글 전체 평점 | `4.6` |
| **`author`** | 리뷰 작성자 이름 | `Mj H` |
| **`rating`** | 작성자 부여 별점 (1~5 정수형) | `5` |
| **`date`** | 작성 시점 상대 일자 | `7개월 전` |
| **`review_text`** | 순수 리뷰 원문 텍스트 (자동 번역 문구 제외) | `음식이 매우 신선하고 직원이 친절합니다.` |

---

## 🔒 데이터 보안 및 Git 관리

생성된 `scraper/output/*.csv` 데이터 파일은 프로젝트 최상위 `.gitignore`에 자동 등록되어 대용량 수집 데이터가 실수로 Git 커밋 및 원격 저장소에 올라가지 않도록 안전하게 관리됩니다.
