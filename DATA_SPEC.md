# GMap Review Decoder - 데이터 규격 및 가이드 문서 (`DATA_SPEC.md`)

본 문서는 **GMap Review Decoder** 확장프로그램과 백엔드에서 사용되는 리뷰 분석 데이터의 JSON 스키마, `gmap_id` 규격, 동적 다중 JSON 스캐너, 오프라인 폴백 처리 및 **신규 데이터 추가 가이드**를 제공합니다.

---

## 📌 1. 기본 식별자 규격 (`gmap_id`)

- **표준**: UCSD (University of California San Diego) Google Local Reviews 데이터셋 규격 식별자
- **형식**: `0x[16진수 16자리]:0x[16진수 16자리]`
- **예시**: `0x80c2c7e5bd221ad7:0x6975adb8d798ea0b` (CAVA USC Village 매장)
- **추출 규칙**: 구글 맵스 장소 URL의 `!1s` 파라미터 직후 정규식으로 파싱 (`extension/content.js`)
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
  ],
  "native_korean_reviews": [
    {
      "author": "Kyungmo Jae",
      "rating": 5.0,
      "text": "USC 빌리지안에 있는 카바에요! 식사시간 때 가면 사람들 많아서 줄서야하는데 모바일 오더도 가능해요!"
    }
  ]
}
```

---

## 🔄 3. 동적 다중 JSON 로더 & 대용량 데이터 관리 (`data/`)

### 백엔드 자동 스캔 (`backend/database.py`)
- 백엔드 서버는 최상위 `data/` 디렉토리 내부의 **모든 `*.json` 파일(예: `data/sample_places.json`, `data/la_dataset.json` 등)을 실시간으로 탐지하여 하나로 자동 병합**합니다.
- 새로운 데이터 파일이 추가되어도 백엔드 코드를 수정할 필요가 전혀 없습니다.

### Git 용량 방지 정책 (`.gitignore`)
- 대용량 데이터셋 파일이 Git 저장소에 커밋되는 것을 방지하기 위해, 기본 샘플 파일(`data/sample_places.json`)을 제외한 **추가 JSON 파일(`data/*.json`)은 Git 추적에서 자동 제외**됩니다.
  ```gitignore
  # Big Data JSON files in data/ directory
  data/*.json
  !data/sample_places.json
  ```

---

## ⚡ 4. 오프라인 폴백 처리 (Zero-Dependency)

- 백엔드 서버가 켜져 있지 않거나 오프라인일 때도 테스트 및 서비스가 중단되지 않도록 **`extension/content.js` 내부에 CAVA 및 주요 식당 데이터셋이 내장**되어 있습니다.
- 백엔드가 동작 중일 때는 **FastAPI 백엔드가 1순위로 호출**되며 실시간 응답이 반환됩니다.

---

## 🛠️ 5. 새로운 장소 데이터 추가 가이드 (Copy & Paste 템플릿)

새로운 식당이나 LLM 분석 결과를 추가할 때는 아래 템플릿을 복사하여 `data/` 폴더에 임의의 `.json` 파일(예: `data/new_places.json`)로 저장하세요.

```json
{
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
      }
    ]
  }
}
```
