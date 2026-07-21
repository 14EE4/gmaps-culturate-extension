"""
GMap Review Decoder - FastAPI Mock Backend Server
UCSD Google Local Reviews Dataset Key (gmap_id) Matching Backend
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn

app = FastAPI(
    title="GMap Review Decoder API",
    description="UCSD Dataset gmap_id 기반 문화권별 맞춤 리뷰 분석 API",
    version="1.0.0"
)

# Enable CORS for Chrome Extension content scripts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-populated UCSD Dataset Key (gmap_id) Database
UCSD_MOCK_DATABASE = {
    # LA Sun Nong Dan (선농단 K-Town)
    "0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3": {
        "gmap_id": "0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3",
        "place_name": "Sun Nong Dan (선농단 LA)",
        "local_rating": 4.6,
        "korean_rating": 4.4,
        "culture_summary": "치즈 갈비찜의 압도적 비주얼과 푸짐한 양. 한국인 및 현지인 공통 최고 평가이나 주차 난이도와 길고 협소한 웨이팅에 보정 적용.",
        "metrics": {
            "taste": {"local": 4.8, "kr": 4.7},
            "service": {"local": 4.3, "kr": 3.8},
            "value": {"local": 4.2, "kr": 3.9},
            "atmosphere": {"local": 4.1, "kr": 3.6}
        },
        "nuance_tags": [
            {
                "literal": '"Portions are huge, order for groups"',
                "meaning": "갈비찜 소자도 2-3인이 먹기에 충분한 양으로 가성비 우수."
            },
            {
                "literal": '"Waited 45 mins, staff is super rushed"',
                "meaning": "회전율 위주 매장으로 여유로운 식사나 대접 자리는 부적합함."
            }
        ]
    },

    # LA BCD Tofu House (북창동순두부 Wilshire)
    "0x80c2c7c594236e71:0x5e2b036577317ba9": {
        "gmap_id": "0x80c2c7c594236e71:0x5e2b036577317ba9",
        "place_name": "BCD Tofu House (북창동순두부)",
        "local_rating": 4.5,
        "korean_rating": 3.9,
        "culture_summary": "현지 외국인에게는 K-Food의 입문 성지이나, 한국인 기준으로는 본국 순두부집 대비 감칠맛이 연하고 가격(팁 포함) 대비 평범하다는 평이 많음.",
        "metrics": {
            "taste": {"local": 4.6, "kr": 3.9},
            "service": {"local": 4.4, "kr": 3.8},
            "value": {"local": 4.2, "kr": 3.4},
            "atmosphere": {"local": 4.3, "kr": 4.0}
        },
        "nuance_tags": [
            {
                "literal": '"Authentic comfort food with rich broth"',
                "meaning": "외국인 기준 깊은 맛이나, 한국인 입맛에는 무난한 프랜차이즈 레벨."
            },
            {
                "literal": '"Galbi combo is sweet and savory"',
                "meaning": "갈비 양념이 미국 특유의 강한 단맛 중심임."
            }
        ]
    },

    # NYC Peter Luger Steak House
    "0x89c259837920ab4d:0xcf20c1507df05e54": {
        "gmap_id": "0x89c259837920ab4d:0xcf20c1507df05e54",
        "place_name": "Peter Luger Steak House",
        "local_rating": 4.4,
        "korean_rating": 3.7,
        "culture_summary": "역사적인 3대 스테이크 하우스. 고기 질은 뛰어나나 Cash Only(현금 결제 전용)와 고압적인 서빙 문화로 인해 한국인 가성비 만족도 감점.",
        "metrics": {
            "taste": {"local": 4.7, "kr": 4.2},
            "service": {"local": 4.1, "kr": 2.9},
            "value": {"local": 3.9, "kr": 3.1},
            "atmosphere": {"local": 4.5, "kr": 4.1}
        },
        "nuance_tags": [
            {
                "literal": '"Classic waiter service with Brooklyn attitude"',
                "meaning": "친절한 맞춤형 서비스가 아니며 시크하고 서두르는 분위기."
            },
            {
                "literal": '"Cash or debit only!"',
                "meaning": "신용카드 결제가 불가능하여 사전 현금 준비 필수."
            }
        ]
    },

    # CAVA (USC Village LA) - User Provided URL Key
    "0x80c2c7e5bd221ad7:0x6975adb8d798ea0b": {
        "gmap_id": "0x80c2c7e5bd221ad7:0x6975adb8d798ea0b",
        "place_name": "CAVA (USC Village)",
        "local_rating": 4.4,
        "korean_rating": 3.8,
        "culture_summary": "지중해식 샐러드 커스텀 볼 전문점. 현지 대학생 및 직장인에게 대인기이나, 한국인 기준 딥 소스의 간이 짤 수 있고 토핑 옵션 커스텀 주문 난이도가 있음.",
        "metrics": {
            "taste": {"local": 4.5, "kr": 3.8},
            "service": {"local": 4.2, "kr": 3.9},
            "value": {"local": 4.1, "kr": 3.5},
            "atmosphere": {"local": 4.4, "kr": 4.2}
        },
        "nuance_tags": [
            {
                "literal": '"Fully customizable fresh Mediterranean bowl"',
                "meaning": "서브웨이처럼 베이스, 다입(Dip), 토핑, 드레싱을 계속 선택해야 해서 주문 난이도가 있음."
            },
            {
                "literal": '"Pita chips and Crazy Feta are top tier"',
                "meaning": "드레싱과 페타 치즈 간이 강한 편이므로 드레싱은 옆에 따로(Side) 요청하는 것 추천."
            },
            {
                "literal": '"Super fast line even when crowded"',
                "meaning": "USC 캠퍼스 인근으로 점심시간 줄은 기나 패스트 카주얼 방식으로 회전율은 빠름."
            }
        ]
    }
}


@app.get("/api/analyze")
def analyze_place(
    gmap_id: Optional[str] = Query(None, description="UCSD Dataset Google Maps ID (e.g. 0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3)"),
    place_name: Optional[str] = Query(None, description="Fallback place name"),
    target_culture: str = Query("Korean", description="Target cultural perspective")
):
    """
    gmap_id 또는 place_name 기반 문화권별 보정 리뷰 분석 반환
    """
    # 1. gmap_id 기반 데이터 매칭
    if gmap_id and gmap_id in UCSD_MOCK_DATABASE:
        data = UCSD_MOCK_DATABASE[gmap_id].copy()
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
