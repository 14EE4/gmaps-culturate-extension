# GMap Review Decoder - 백엔드 가상환경 구축 및 실행 가이드 (`BACKEND_SETUP.md`)

본 문서는 **GMap Review Decoder** 프로젝트의 FastAPI 백엔드 개발 및 테스트를 위한 파이썬 가상환경(`.venv`) 설정, 패키지 설치, PowerShell 권한 설정, 서버 실행 및 API 검증 가이드를 제공합니다.

---

## 📌 1. 백엔드 세팅 4단계 요약

| 단계 | 수행 작업 | 명령어 |
| :--- | :--- | :--- |
| **1단계** | 파이썬 가상환경 생성 | `python -m venv .venv` |
| **2단계** | 의존성 패키지 설치 | `.\.venv\Scripts\pip.exe install -r backend/requirements.txt` |
| **3단계** | PowerShell 권한 설정 (선택) | `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| **4단계** | 백엔드 서버 실행 | `.\.venv\Scripts\python.exe backend/main.py` |

---

## 🛠️ 2. 상세 가이드

### 1단계: 가상환경 생성
프로젝트 최상위 루트(`gmaps-culturate-extension`) 폴더에서 가상환경을 생성합니다.
```powershell
python -m venv .venv
```
> 💡 생성된 `.venv` 폴더는 `.gitignore` 규칙에 의해 Git 추적 대상에서 자동 제외됩니다.

### 2단계: 의존성 패키지 설치
가상환경 전용 pip를 이용하여 FastAPI 및 Uvicorn 의존성을 설치합니다.
```powershell
.\.venv\Scripts\pip.exe install -r backend/requirements.txt
```

### 3단계: Windows PowerShell 실행 권한 해결 (선택)
`.\.venv\Scripts\Activate.ps1` 실행 시 `UnauthorizedAccess` 또는 `PSSecurityException` 보안 에러가 발생하는 경우, 현재 사용자 권한으로 스크립트 실행을 허용합니다:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
권한 설정 후 가상환경을 활성화할 수 있습니다:
```powershell
.\.venv\Scripts\Activate.ps1
```

### 4단계: FastAPI 백엔드 서버 실행

#### 방법 A: 가상환경 파이썬 직접 실행 (가장 추천)
```powershell
.\.venv\Scripts\python.exe backend/main.py
```

#### 방법 B: 가상환경 활성화 상태에서 실행
```powershell
# 가상환경 활성화 후
cd backend
python main.py
```

서버 실행 성공 시 로그:
```text
INFO:     Started server process [15904]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 🧪 3. 백엔드 API 작동 검증 방법

### 1) FastAPI Swagger UI 대화형 문서
- 서버 실행 후 브라우저 접속: 👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**
- `GET /api/analyze` $\rightarrow$ `Try it out` $\rightarrow$ `gmap_id` 입력 후 `Execute` 클릭하여 JSON 응답 확인.

### 2) 브라우저 주소창 직접 조회
👉 **[http://localhost:8000/api/analyze?gmap_id=0x80c2c7e5bd221ad7:0x6975adb8d798ea0b&target_culture=Korean](http://localhost:8000/api/analyze?gmap_id=0x80c2c7e5bd221ad7:0x6975adb8d798ea0b&target_culture=Korean)**

### 3) PowerShell CLI 조회
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/analyze?gmap_id=0x80c2c7e5bd221ad7:0x6975adb8d798ea0b&target_culture=Korean" | ConvertTo-Json -Depth 5
```

### 4) 크롬 확장프로그램 실시간 연동 확인
- 백엔드 서버가 켜진 상태에서 구글 맵스 장소 접속 시 우측 오버레이 하단 상태표시줄이 **`FastAPI 백엔드 연결됨` (200 OK)**으로 변경됩니다.
