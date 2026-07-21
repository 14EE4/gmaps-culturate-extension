# GMap Review Decoder - 데이터 규격 및 가이드 문서 (`DATA_SPEC.md`)

본 문서는 **GMap Review Decoder** 확장프로그램과 백엔드에서 사용되는 리뷰 분석 데이터의 JSON 스키마, `gmap_id` 규격, 목 데이터 목록 및 **향후 새로운 실제 분석 데이터를 추가하기 위한 가이드**를 제공합니다.

---

## 📌 1. 기본 식별자 규격 (`gmap_id`)

- **표준**: UCSD (University of California San Diego) Google Local Reviews 데이터셋 규격 식별자
- **형식**: `0x[16진수 16자리]:0x[16진수 16자리]`
- **예시**: `0x80c2c7e5bd221ad7:0x6975adb8d798ea0b`
- **추출 규칙**: 구글 맵스 장소 URL의 `!1s` 파라미터 직후 정규식으로 파싱
  ```js
  const match = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
  ```

---

## 📊 2. 데이터 JSON 스키마 명세

확장프로그램 오버레이 패널 및 백엔드 API에서 주고받는 표준 JSON 데이터 구조입니다.

```json
{
  "gmap_id": "0x80c2c7e5bd221ad7:0x6975adb8d798ea0b",
  "place_name": "CAVA (USC Village)",
  "local_rating": 4.4,
  "korean_rating": 3.8,
  "target_culture": "Korean",
  "culture_summary": "지중해식 샐러드 커스텀 볼 전문점. 현지 대학생 및 직장인에게 대인기이나, 한국인 기준 딥 소스의 간이 짤 수 있고 토핑 옵션 커스텀 주문 난이도가 있음.",
  "metrics": {
    "taste": { "local": 4.5, "kr": 3.8 },
    "service": { "local": 4.2, "kr": 3.9 },
    "value": { "local": 4.1, "kr": 3.5 },
    "atmosphere": { "local": 4.4, "kr": 4.2 }
  },
  "nuance_tags": [
    {
      "literal": "\"Fully customizable fresh Mediterranean bowl\"",
      "meaning": "서브웨이처럼 베이스, 딥(Dip), 토핑, 드레싱을 계속 선택해야 해서 주문 난이도가 있음."
    },
    {
      "literal": "\"Pita chips and Crazy Feta are top tier\"",
      "meaning": "드레싱과 페타 치즈 간이 강한 편이므로 드레싱은 옆에 따로(Side) 요청하는 것 추천."
    }
  ]
}
```

### 필드 상세 설명

| 필드명 | 데이터 타입 | 설명 |
| :--- | :--- | :--- |
| `gmap_id` | String | UCSD 데이터셋 고유 장소 식별자 (Primary Key) |
| `place_name` | String | 장소 / 식당 이름 |
| `local_rating` | Float | 현지 구글 지도 실제 평점 (0.0 ~ 5.0) |
| `korean_rating` | Float | 한국인 선호 관점으로 보정된 평점 (0.0 ~ 5.0) |
| `target_culture` | String | 보정 대상 문화권 (예: `Korean`, `Japanese`, `American`) |
| `culture_summary` | String | 문화권 관점 평점 보정 핵심 사유 및 특징 요약 (2-3문장) |
| `metrics` | Object | 4가지 평가 항목별 현지(`local`) vs 한국인(`kr`) 점수 비교 |
| `metrics.taste` | Object | 맛 (Taste) |
| `metrics.service` | Object | 서비스 (Service) |
| `metrics.value` | Object | 가성비 (Value) |
| `metrics.atmosphere` | Object | 분위기 (Atmosphere) |
| `nuance_tags` | Array[Object] | 리뷰의 영어 완곡 표현/현지 뉘앙스 분석 칩 목록 |
| `nuance_tags[].literal` | String | 원문 현지 리뷰 대표 표현 |
| `nuance_tags[].meaning` | String | 한국어 특유의 돌려말하기/실제 의미 해석 (`#실제 의미`) |

---

## 📂 3. 현재 등록된 내장 데이터셋 목록

현재 아래 4개 장소의 데이터가 내장되어 있어 URL 접속 시 정밀 분석이 제공됩니다.

1. **CAVA (USC Village LA)**
   - `gmap_id`: `0x80c2c7e5bd221ad7:0x6975adb8d798ea0b`
2. **Sun Nong Dan (선농단 LA)**
   - `gmap_id`: `0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3`
3. **BCD Tofu House (북창동순두부 Wilshire)**
   - `gmap_id`: `0x80c2c7c594236e71:0x5e2b036577317ba9`
4. **Peter Luger Steak House (뉴욕)**
   - `gmap_id`: `0x89c259837920ab4d:0xcf20c1507df05e54`

---

## 🛠️ 4. 새로운 장소 데이터 추가 가이드 (Copy & Paste 템플릿)

새로운 식당이나 데이터 분석 결과를 추가할 때는 아래 템플릿을 복사하여 사용하세요.

### 📋 신규 데이터 JSON 템플릿

```json
"0x[GMAP_ID_16진수:0x16진수]": {
  "gmap_id": "0x[GMAP_ID_16진수:0x16진수]",
  "place_name": "[장소 이름]",
  "local_rating": 4.5,
  "korean_rating": 3.9,
  "culture_summary": "[문화권 평점 보정 사유 요약 설명]",
  "metrics": {
    "taste": { "local": 4.6, "kr": 4.0 },
    "service": { "local": 4.2, "kr": 3.5 },
    "value": { "local": 4.0, "kr": 3.4 },
    "atmosphere": { "local": 4.4, "kr": 4.1 }
  },
  "nuance_tags": [
    {
      "literal": "\"[원문 리뷰 주요 표현 1]\"",
      "meaning": "[한국어 해석 및 문화적 뉘앙스 설명 1]"
    },
    {
      "literal": "\"[원문 리뷰 주요 표현 2]\"",
      "meaning": "[한국어 해석 및 문화적 뉘앙스 설명 2]"
    }
  ]
}
```

---

## 💡 5. 동적 다중 JSON 로더 & Git 이그노어 설정

### 🔄 동적 다중 JSON 스캐너 (`backend/database.py`)
- [backend/database.py](file:///e:/workspace/agy_workspace/gmaps-culturate-extension/backend/database.py)는 `data/` 디렉토리 내부의 **모든 `*.json` 파일을 자동 스캔하여 하나로 병합**합니다.
- 용량이 큰 새로운 JSON 파일(예: `data/la_restaurants.json`, `data/ucsd_full.json` 등)을 `data/` 폴더에 자유롭게 추가하더라도 **파이썬 코드를 전혀 수정하지 않고 즉시 자동 로드**됩니다.

### 🛡️ `.gitignore` 용량 방지 설정
- Git 저장소 용량이 무거워지는 것을 방지하기 위해 기본샘플([data/sample_places.json](file:///e:/workspace/agy_workspace/gmaps-culturate-extension/data/sample_places.json))을 제외한 **추가 데이터 파일(`data/*.json`)은 Git 추적에서 자동 제외**됩니다:
  ```gitignore
  # Big Data JSON files in data/ directory
  data/*.json
  !data/sample_places.json
  ```





