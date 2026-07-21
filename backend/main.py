"""
GMap Review Decoder - FastAPI Backend Server
UCSD Google Local Reviews Dataset Key (gmap_id) Matching Backend
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn

from database import get_place_analysis

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


@app.get("/api/analyze")
def analyze_place(
    gmap_id: Optional[str] = Query(None, description="UCSD Dataset Google Maps ID (e.g. 0x80c2c794c2cd9d2d:0xd1119cfbee0da6f3)"),
    place_name: Optional[str] = Query(None, description="Fallback place name"),
    target_culture: str = Query("Korean", description="Target cultural perspective")
):
    """
    gmap_id 또는 place_name 기반 문화권별 보정 리뷰 분석 반환 (database.py 연동)
    """
    return get_place_analysis(gmap_id=gmap_id, place_name=place_name, target_culture=target_culture)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
