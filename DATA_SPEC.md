# GMap Review Decoder - 데이터 규격 및 가이드 문서 (`DATA_SPEC.md`)

본 문서는 **GMap Review Decoder** 확장프로그램과 백엔드에서 사용되는 리뷰 분석 데이터의 JSON 스키마, `gmap_id` 규격, 가중 평균 계산 공식, 실시간 DOM 파싱 규격 및 **신규 데이터 추가 가이드**를 제공합니다.

---

## 📌 1. 기본 식별자 규격 (`gmap_id`)

- **표준**: UCSD (University of California San Diego) Google Local Reviews 데이터셋 규격 식별자
- **형식**: `0x[16진수 16자리]:0x[16진수 16자리]`
- **예시**: `0x80c2c7e5bd221ad7:0x6975adb8d798ea0b` (CAVA USC Village 매장)
- **추출 규칙**: 구글 맵스 장소 URL 내 모든 Hex ID 파라미터를 탐색하여 히스토리/이전 장소 파라미터가 아닌 **가장 마지막 위치의 ID(현재 선택된 장소)**를 반환 (`extension/content.js`)
  ```js
  function extractGMapId(url) {
    if (!url) return null;
    const matches = Array.from(url.matchAll(/(0x[0-9a-fA-F]{12,18}:0x[0-9a-fA-F]{12,18})/gi));
    return matches.length > 0 ? matches[matches.length - 1][1] : null;
  }
  ```

---

## 📊 2. 데이터 JSON 스키마 명세 (Table A / B / C 표준)

확장프로그램 오버레이 패널 및 백엔드 API에서 주고받는 표준 JSON 데이터 구조입니다.

```json
{
  "gmap_id": "0x80c2c7e5bd221ad7:0x6975adb8d798ea0b",
  "place_name": "CAVA (USC Village)",
  "address": "3201 S Hoover St Suite 1840, Los Angeles, CA 90089",
  "category": "Mediterranean restaurant, Salad shop, Fast casual",
  "local_rating": 4.4,
  "korean_rating": 3.8,
  "kr_avg": 3.8,
  "kr_count": 15,
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
      "tag_id": 1,
      "literal": "\"Fully customizable fresh Mediterranean bowl\"",
      "meaning": "서브웨이처럼 베이스, 딥(Dip), 토핑, 드레싱을 계속 선택해야 해서 주문 난이도가 있음."
    },
    {
      "tag_id": 2,
      "literal": "\"Pita chips and Crazy Feta are top tier\"",
      "meaning": "드레싱과 페타 치즈 간이 강한 편이므로 드레싱은 옆에 따로(Side) 요청하는 것 추천."
    }
  ],
  "native_korean_reviews": [
    {
      "author": "Kyungmo Jae",
      "rating": 5.0,
      "date": "7개월 전",
      "text": "USC 빌리지안에 있는 카바에요! 식사시간 때 가면 사람들 많아서 줄서야하는데 모바일 오더도 가능해요!"
    }
  ]
}
```

---

## 📐 3. 사전 데이터(~21.09) + 실시간 DOM 데이터 가중 평균 통합 수식

UCSD 기반 사전 데이터셋(~21.09)과 확장프로그램이 구글 맵스 DOM에서 실시간으로 읽어온 리뷰 데이터를 결합하여 **통합 한국인 체감 평점**을 실시간 산출합니다.

### 수식 공식
$$\text{combinedRating} = \frac{(\text{pastKrRating} \times \text{pastKrCount}) + \sum \text{liveKrScores}}{\text{pastKrCount} + \text{liveKrCount}}$$

### 계산 예시
- **사전 데이터**: `kr_count: 15`, `kr_avg: 3.8` ($\text{pastKrScoreSum} = 57.0$)
- **실시간 리뷰**: 3건 ($\text{scores: } 5, 5, 1 \rightarrow \text{liveKrScoreSum} = 11.0$)
- **통합 결과**: $(57.0 + 11.0) / 18 = 68.0 / 18 = 3.777... \rightarrow \mathbf{3.8 \text{ ★ (총 18건)}}$

---

## 🌐 4. 실시간 DOM 파싱 규격 (`extension/content.js`)

1. **주소 파싱 (`extractAddressFromDOM`)**:
   - `button[data-item-id="address"] .Io6YTe` 및 `aria-label` 파싱
   - **`cleanAddressText`**: Google Material Symbols 아이콘 폰트 문자(`\uE000-\uF8FF`) 제거로 네모 박스(`□`) 깨짐 차단
2. **카테고리 파싱 (`extractCategoryFromDOM`)**:
   - `button.DkEaL` 및 `button[jsaction*="category"]` 파싱 (예: `"샌드위치 가게"`)

---

## 🔄 5. 동적 다중 JSON 로더 & 대용량 데이터 관리 (`data/`)

- 백엔드 서버(`backend/database.py`)는 최상위 `data/` 디렉토리 내부의 모든 `*.json` 파일을 실시간 탐지하여 하나로 자동 병합합니다.
- 기본 샘플 파일(`data/sample_places.json`)을 제외한 대용량 JSON 데이터 파일은 `.gitignore`에 의해 커밋 대상에서 자동 제외됩니다.

---

## 🛠️ 6. 새로운 장소 데이터 추가 가이드 (Copy & Paste 템플릿)

```json
{
  "0x[GMAP_ID_16진수:0x16진수]": {
    "gmap_id": "0x[GMAP_ID_16진수:0x16진수]",
    "place_name": "[장소 이름]",
    "address": "[식당 상세 주소]",
    "category": "[카테고리 태그]",
    "local_rating": 4.5,
    "korean_rating": 3.9,
    "kr_avg": 3.9,
    "kr_count": 15,
    "culture_summary": "[문화권 평점 보정 사유 요약 설명]",
    "metrics": {
      "taste": { "local": 4.6, "kr": 4.0 },
      "service": { "local": 4.2, "kr": 3.5 },
      "value": { "local": 4.0, "kr": 3.4 },
      "atmosphere": { "local": 4.4, "kr": 4.1 }
    },
    "nuance_tags": [
      {
        "tag_id": 1,
        "literal": "\"[원문 리뷰 주요 표현 1]\"",
        "meaning": "[한국어 해석 및 문화적 뉘앙스 설명 1]"
      }
    ]
  }
}
```
