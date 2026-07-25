# GMap Review Decoder - 데이터 연동 스펙 v2 및 가이드 문서 (`DATA_SPEC.md`)

본 문서는 **GMap Review Decoder** 확장프로그램과 백엔드에서 사용되는 v2 리뷰 분석 데이터셋(`extension_data.json`, `mvp_payload.json`)의 스키마, 3단계 우선순위 Resolve 알고리즘, `g_value` 상대 보정 계산 공식 및 프론트엔드 UI 렌더링 규격을 명시합니다.

---

## 📌 1. 기본 식별자 규격 (`gmap_id`)

- **표준**: UCSD (University of California San Diego) Google Local Reviews 데이터셋 규격 식별자
- **형식**: `0x[16진수 16자리]:0x[16진수 16자리]` (콜론 `:` 분리 32자리 hex)
- **예시**: `0x80c2b8831c5ab3a1:0xe81dfbb2ef41329a` (LA 북창동 순두부 BCD Tofu House)
- **추출 규칙**: 구글 맵스 장소 URL 내 모든 Hex ID 파라미터를 탐색하여 **가장 마지막 위치의 ID(현재 선택된 장소)**를 반환 (`extension/content.js`)

---

## 📊 2. v2 데이터셋 스키마 명세 (`extension_data.json`)

팀원이 제공한 `extension_data.json`은 3개의 메인 테이블로 구성되어 있습니다.

```json
{
  "meta": {
    "version": "th03",
    "schema_version": 2,
    "baseline_gap": -0.2097,
    "n_places": 388,
    "n_categories": 42,
    "n_index": 17090,
    "aspect_names": ["taste", "service", "value", "atmosphere"]
  },
  "places": {
    "0x80c2b8831c5ab3a1:0xe81dfbb2ef41329a": {
      "name": "BCD Tofu House",
      "category": "Korean restaurant",
      "ko_n": 514,
      "ko_mean": 3.889,
      "en_n": 1101,
      "en_mean": 4.248,
      "gap": -0.359,
      "rel_gap": -0.149,
      "status": "significant",
      "tier": "test"
    }
  },
  "place_index": {
    "0x80c2c7e5bd221ad7:0x6975adb8d798ea0b": {
      "c": "Mediterranean restaurant",
      "z": { "t": -0.45, "s": -0.40, "v": -0.10, "a": -0.31 },
      "n": { "t": 58, "s": 33, "v": 28, "a": 9 }
    }
  },
  "categories": {
    "Seafood restaurant": {
      "ko_n": 229,
      "ko_mean": 4.096,
      "en_n": 112497,
      "en_mean": 4.285,
      "rel_gap": -0.124,
      "status": "significant"
    }
  }
}
```

---

## 🔄 3. 3단계 우선순위 Resolve 알고리즘

익스텐션은 구글 맵스에서 `gmap_id` 감지 시 아래 3단계 우선순위에 따라 보정 평점과 분석 정보를 산출합니다.

```text
[입력 gmap_id]
     │
     ├── 1순위: places[gmapId] 존재 ➔ 🎯 [Tier 1 Measured Data]
     │    └ 실측 데이터 사용 (ko_mean, en_mean, rel_gap, 통계 유의성 배지)
     │
     ├── 2순위: place_index[gmapId].c ➔ categories[cat] ➔ 📊 [Tier 2 Category Estimate]
     │    ├ status == "significant" ➔ 구글 실시간 평점 + rel_gap 상대 보정 적용
     │    └ status == "not_significant" ➔ 업종 격차 없음 (보정 미적용)
     │
     └── 3순위: 미해당 / 데이터 없음 ➔ 🔴 [Tier 3 No Dataset Available]
          └ korean_rating = N/A (데이터 없음), 임의의 Mock 수치 렌더링 금지
```

---

## 🧮 4. 최종 보정 점수 계산 공식 및 `rel_gap` (`g`값)

- **공식**: $\text{KR Adjusted Rating} = \text{clamp}(\text{Google Rating} + \text{rel\_gap}, 0.0, 5.0)$
- **주의사항**: `rel_gap` (`g`값)은 전체 기준선(-0.2097) 대비 상대값입니다. (절대 격차와 부호 및 크기가 다를 수 있음)
- **프론트엔드 투명 표출**: 익스텐션 UI 오버레이에 데이터셋의 `g`값과 수식 카드를 상시 표출합니다.
  ```text
  🧮 Score Formula: Google + Dataset g = Final
  [Google: 4.3★] + [Dataset g: -0.149] = [Adjusted: 4.15★]
  ```

---

## 📌 5. 4대 세부 항목 점수 (`z`/`n`) 렌더링 스펙

`place_index[gmapId]`의 `z` (z-score 편차) 및 `n` (리뷰 언급 횟수) 데이터를 기반으로 **Aspect Strengths** 칩 및 **Aspect Comparison** 바를 연동합니다.

- **4대 항목**: `t` (Taste), `s` (Service), `v` (Value), `a` (Atmosphere)
- **임계값 규칙**:
  - `Taste` / `Service`: `n ≥ 30` (Full, 진하게) / `10 ≤ n < 30` (Partial, 연하게) / `n < 10` (None, 회색)
  - `Value` / `Atmosphere`: `n ≥ 10` (Full, 진하게) / `n < 10` (None, 회색)
- **Aspect Comparison 바 연동**: `indexEntry.z` 값이 존재하는 경우 `clamp(GoogleRating + z, 1.0, 5.0)`으로 세부 별점 바를 100% 정밀 연동합니다.

---

## 📦 6. `mvp_payload.json` 요약 문구 매핑

- **용도**: 장소별 한글 분석 요약 문구(`s` 필드) 공급.
- **부재 시 처리**: `mvp_payload.json`에 `gmap_id`가 없는 경우 콘솔에 `⚠️ [Payload Missing]` 경고 로그를 출력하고 기본 문구로 처리합니다.

---

## 🛡️ 7. Mock 데이터 폴백 완전 제거

- 기존 `MOCK_DATASET` 및 `generateMockData` 오프라인 임의 보정 수치 생성을 **완전 제거**하였습니다.
- 팀 데이터셋에 없는 장소는 임의 수치 대신 **`N/A` (No Analysis Data Available)** 및 프론트엔드 상단 **🔴 Tier 3 배지**로 깔끔하게 직관 표출됩니다.
}
```
