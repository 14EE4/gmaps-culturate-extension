# 📌 Google Maps Place ID & 리뷰 자동 크롤러 (`scraper/`)

구글 맵스(Google Maps)에서 선택한 식당의 Place ID와 리뷰 데이터(작성자, 별점, 작성 시점, 리뷰 원문 텍스트)를 수집하여 CSV 파일로 내보내는 Python 기반 스크레이퍼 모듈입니다.

---

## 📁 디렉터리 구조

```text
scraper/
├── main.py              # 구글 맵스 Selenium 크롤링 메인 스크립트
├── requirements.txt     # 프로젝트 의존성 라이브러리 목록
├── README.md            # 사용법 안내 문서 (현재 파일)
└── output/              # 수집 완료된 식당별 CSV 파일 저장 폴더
    └── .gitkeep
```

---

## 🛠️ 설치 방법

터미널에서 가상환경 생성 후 필요한 패키지를 설치합니다:

```powershell
# 가상환경 활성화 (Windows 기준)
.\.venv\Scripts\Activate.ps1

# 필요한 라이브러리 설치
pip install -r scraper/requirements.txt
```

---

## 🚀 사용 방법

### 1. 기본 실행 (헤드리스 모드 기본 적용)

명령어를 실행하면 **URL**과 **수집할 리뷰 개수**를 대화형으로 물어봅니다 (엔터 입력 시 기본값 4건 수집):

```powershell
py scraper/main.py

# 실행 예시:
# URL을 입력하세요: https://www.google.com/maps/place/...
# 수집할 리뷰 개수를 입력하세요 (기본값: 4): 
```

### 2. 옵션 지정 실행

- `--url`: 구글 맵스 식당 URL 직접 지정
- `--max-reviews`: 수집할 최대 리뷰 수 (기본값: 4)
- `--lang`: 구글 맵스 수집 언어 (기본값: `en` - 원문 수집 보장)
- `--no-headless`: 브라우저 창을 띄워서 모니터링 (GUI 모드)

```powershell
# URL 및 수집 목표 개수 지정 (기본 헤드리스 모드)
py scraper/main.py --url "https://www.google.com/maps/place/..." --max-reviews 500

# 브라우저 창을 직접 보면서 수집하고 싶은 경우
py scraper/main.py --url "https://www.google.com/maps/place/..." --max-reviews 100 --no-headless
```

---

## 📊 CSV 출력 형식 (`output/[식당이름]_reviews.csv`)

| Column | Description | 예시 |
| :--- | :--- | :--- |
| `place_id` | 구글 맵스 고유 Place ID (`0x...:0x...`) | `0x80c2c7e5bd221ad7:0x6975adb8d798ea0b` |
| `place_name` | 식당 이름 | `CAVA` |
| `overall_rating` | 식당 전체 평점 | `4.7` |
| `author` | 리뷰 작성자 이름 | `Dawson Lau` |
| `rating` | 개별 별점 (1~5) | `5` |
| `date` | 리뷰 작성 시점 | `4주 전` / `a month ago` |
| `review_text` | 작성자 리뷰 원문 텍스트 | `I visit this location bi-weekly because...` |
