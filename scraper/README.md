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

```powershell
py scraper/main.py

# 실행 예시:
# URL을 입력하세요: https://www.google.com/maps/place/...
# [+] Google Maps 접속 중: https://www.google.com/maps/place/...
# [+] 식당 감지: BCD Tofu House (구글 전체 리뷰: 3,814개)
# 수집할 리뷰 개수를 입력하세요 (전체 3,814개 중, 기본값: 20): 
```

> 💡 **URL 타입 자동 대응**: 구글 맵스 URL에 리뷰 탭 파라미터(`!9m1!1b1`)가 없는 개요(Overview) URL을 붙여넣어도 자동으로 리뷰 탭으로 전환하여 수집을 시작합니다. 어떤 형식의 URL이든 100% 작동합니다.

> 💡 **최대 개수 자동 캡핑 & 조기 종료**: 입력한 수집 개수가 식당의 실제 전체 리뷰 수보다 많은 경우(예: 전체 29개인 식당에 200개 수집 요청), 목표 수량이 전체 리뷰 수(29개)로 자동 조정되며 도달하는 즉시 불필요한 스크롤 반복 없이 바로 수집을 마칩니다.


### 2. 고급 옵션 (URL 및 개수 직접 지정)

```powershell
# URL 및 수집 목표 개수 지정 (기본 헤드리스 모드)
py scraper/main.py --url "https://www.google.com/maps/place/..." --max-reviews 500

# 브라우저 창을 직접 보면서 수집하고 싶은 경우
py scraper/main.py --url "https://www.google.com/maps/place/..." --max-reviews 100 --no-headless
```

### 3. 수집 결과 및 소요 시간 출력

수집 완료 시 수집 건수와 함께 **총 소요 시간(초/분)**이 화면에 표시되며 `output/` 폴더에 CSV 파일로 자동 저장됩니다:

```text
[+] 스크레이핑 완료!
[+] 총 수집 건수: 10건
[+] 총 소요 시간: 15.6초
[+] 저장 경로: E:\workspace\agy_workspace\gmaps-culturate-extension\scraper\output\Holbox_reviews.csv
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
