# 학술제 복지추천 시스템

남해군 어르신을 위한 AI 기반 맞춤형 복지서비스 추천 시스템입니다.

## 🌟 주요 기능

- **개인정보 보호**: AES256 암호화를 통한 안전한 데이터 처리
- **맞춤형 추천**: AI 기반 복지서비스 추천 알고리즘
- **접근성 지원**: 글자 크기 조절, 고대비 모드, 음성 안내
- **반응형 디자인**: 모든 디바이스에서 최적화된 사용자 경험

## 🚀 빠른 배포 가이드

### 1. GitHub 업로드

1. **GitHub.com** 접속 → 로그인
2. **"New repository"** 클릭
3. **Repository name**: `학술제-복지추천`
4. **Public** 선택 → **"Create repository"**
5. **"uploading an existing file"** 클릭
6. 모든 파일 드래그 앤 드롭 업로드
7. **"Commit changes"** 클릭

### 2. Render 배포

1. **[Render.com](https://render.com)** 접속 → 회원가입/로그인
2. **"New +"** → **"Web Service"** 클릭
3. **"Connect a repository"** → GitHub 연결
4. 업로드한 저장소 선택
5. 설정값 입력:
   ```
   Name: 학술제-복지추천
   Environment: Python 3
   Build Command: pip install --upgrade pip setuptools wheel && pip install -r requirements.txt
   Start Command: gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 60 app:app
   ```
6. **"Create Web Service"** 클릭
7. **3-5분 대기** → 배포 완료!

### 3. 배포 완료 확인

- 배포 URL에 접속하여 **"설문 시작하기"** 버튼 클릭
- 기본 정보 입력 → **"다음"** 버튼이 정상 작동하는지 확인
- **"서버 연결에 실패했습니다"** 오류가 없어야 함

## 🔧 기술 스택

- **Backend**: Flask 3.0.0 (Python 3.11.9)
- **Database**: SQLite3
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Deployment**: Render (Gunicorn)
- **Security**: Cryptography (AES256), CORS

## 📁 프로젝트 구조

```
학술제/
├── app.py                 # Flask 백엔드
├── requirements.txt       # Python 의존성
├── runtime.txt           # Python 런타임 버전
├── Procfile             # Gunicorn 설정
├── render.yaml          # Render 배포 설정
├── templates/
│   └── index.html       # 메인 HTML 페이지
├── static/
│   ├── css/
│   │   └── style.css    # 접근성 CSS
│   └── js/
│       └── main.js      # 프론트엔드 JavaScript
└── README.md            # 이 파일
```

## 🛠️ 로컬 개발 환경 설정

1. **Python 3.11.9 설치** 확인
2. **의존성 설치**:
   ```bash
   pip install -r requirements.txt
   ```
3. **앱 실행**:
   ```bash
   python app.py
   ```
4. **브라우저에서 접속**: http://localhost:5000

## 🔍 문제 해결

### "서버 연결에 실패했습니다" 오류
- **원인**: JavaScript의 API URL이 localhost로 설정됨
- **해결**: `static/js/main.js` 파일에서 2-4번째 줄 확인:
  ```javascript
  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:5000/api'
      : `${window.location.protocol}//${window.location.host}/api`;
  ```

### Python 3.13 호환성 오류
- **원인**: setuptools 버전 충돌
- **해결**: `runtime.txt`에 `python-3.11.9` 명시됨

### Render 배포 실패
- **원인**: 의존성 설치 실패
- **해결**: Build Command 정확히 입력:
  ```
  pip install --upgrade pip setuptools wheel && pip install -r requirements.txt
  ```

## 🎯 주요 해결된 이슈들

✅ **Python 3.13 호환성 문제** → Python 3.11.9 고정  
✅ **setuptools 오류** → requirements.txt에 명시적 버전 지정  
✅ **API URL localhost 하드코딩** → 환경별 자동 설정  
✅ **Flask 루트 경로 누락** → / 경로 추가  
✅ **gunicorn 포트 바인딩 문제** → --bind 0.0.0.0:$PORT 추가  

## 📞 지원

문제가 발생하면 다음을 확인해주세요:

1. **Render 빌드 로그** 확인
2. **브라우저 개발자 도구 Console** 확인
3. **모든 파일이 정확히 업로드**되었는지 확인

---

**© 2024 남해군 복지추천 시스템 - 학술제. 모든 권리 보유.** 