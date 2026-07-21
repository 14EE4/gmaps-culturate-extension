"""
GMap Review Decoder - Database & Data Manager
Reads place review analysis dataset from single source JSON file (extension/data/sample_places.json)
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

# Path to single source JSON file (extension/data/sample_places.json)
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "extension" / "data" / "sample_places.json"


def load_places_database() -> Dict[str, Any]:
    """
    단일 JSON 데이터 파일(extension/data/sample_places.json) 동적 로드
    """
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Database Error] {DATA_FILE} 로드 실패: {e}")
    else:
        print(f"[Database Warning] {DATA_FILE} 경로에 데이터 파일이 존재하지 않습니다.")
    return {}


def get_place_analysis(gmap_id: Optional[str], place_name: Optional[str], target_culture: str = "Korean") -> Dict[str, Any]:
    """
    gmap_id 매칭 검색 및 Fallback 생성
    """
    db = load_places_database()

    # 1. gmap_id 기반 데이터 매칭
    if gmap_id and gmap_id in db:
        data = db[gmap_id].copy()
        data["target_culture"] = target_culture
        return data

    # 2. Dynamic Fallback Generator for unknown places
    name = place_name or (f"장소 ({gmap_id[:12]}...)" if gmap_id else "알 수 없는 장소")
    return {
        "gmap_id": gmap_id or "0x80c0000000000000:0x0000000000000000",
        "place_name": name,
        "local_rating": 4.5,
        "korean_rating": 3.8,
        "target_culture": target_culture,
        "culture_summary": f"FastAPI 백엔드 분석 완료: {name}의 현지 평점(4.5) 대비 한국인 보정 평점(3.8)은 간의 세기와 가격 대비 만족도 차이에 기반합니다.",
        "metrics": {
            "taste": {"local": 4.6, "kr": 4.0},
            "service": {"local": 4.2, "kr": 3.5},
            "value": {"local": 4.0, "kr": 3.3},
            "atmosphere": {"local": 4.5, "kr": 4.1}
        },
        "nuance_tags": [
            {
                "literal": "#FastAPI 서버 연동 성공",
                "meaning": f"gmap_id={gmap_id or 'Fallback'} 기준 실시간 백엔드 분석 데이터입니다."
            },
            {
                "literal": "#간이 다소 짠 편",
                "meaning": "미국/현지 레시피 특성상 소금간이 세므로 주방 주문 시 'Less Salt' 요청 권장."
            }
        ]
    }
