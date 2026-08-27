# Playtime!

일상 속 짧은 순간(세안, 화장실 브레이크, 점심, 산책, 드로잉, 잠들기 전)을 미니게임으로 만든 웹사이트입니다.

## 기획

### Overview

![Overview](<img/1개요.png>)

### Service Flow

![Service Flow](<img/2서비스 플로우.png>)

### Interaction System

![Interaction System](<img/3인터렉션 설명.png>)

### Information Architecture

![Information Architecture](<img/4IA구조도.png>)

### Design System

![Design System](<img/5디자인시스템.png>)

### Team

![Team](<img/6팀소개.png>)

## 구성

| 페이지 | 경로 | 설명 |
| --- | --- | --- |
| Home | `index.html` | 게임 허브. Take A Walk 미로 게임이 페이지 내부 섹션으로 포함되어 있음(준비중 로딩 화면 → 미로 → Game Over/Nice Walk! 결과 화면) |
| Wash Up | `pages/washup.html` | 웹캠 기반 세안 게임 |
| Secret Break | `pages/secret-break.html` | 화장실 브레이크 게임 |
| Ready For Sleep | `pages/ready-for-sleep.html` | 웹캠 사진부스 스타일 카운트다운 게임 |
| Drawing | `pages/drawing.html` | 웹캠 원터치 드로잉 미니게임 |
| Lunch Time | `lunch-time/` | 별도 Vite/React 앱. 카카오 로컬 API로 주변 식당을 찾는 점심 메뉴 룰렛 |
| Time Archive | `pages/admin-feedback.html` | Contact 페이지에서 남긴 피드백 드로잉 갤러리 + 비밀번호 기반 관리자 모드 |

각 페이지는 상단 GNB(네비게이션 pill)를 공유하며, 클릭 시 Wash Up / Lunch Time / Secret Break / Take A Walk / Drawing / Ready For Sleep 전체 메뉴로 확장됩니다.

## 기술 스택

- 메인 사이트: 프레임워크 없는 순수 HTML/CSS/JS. 1920×1080 고정 캔버스를 `transform: scale()`로 뷰포트에 맞추는 공통 패턴(`fitViewport`류 함수)을 각 페이지가 반복 사용
- 폰트: `Pretendard`(jsDelivr CDN), `SK Concretica`(`public/assets/SK Concretica Trial.ttf`를 self-host), `JoseonGulim`(jsDelivr CDN, Secret Break 전용)
- Lunch Time만 별도로 Vite + React + TypeScript로 구성되어 독립 실행됨(메인 정적 사이트에는 아직 배포/연결되어 있지 않음)

## 로컬 실행

### 메인 정적 사이트

```bash
python3 -m http.server 8736
```

`http://localhost:8736/index.html` 접속. (`.claude/launch.json`의 `playtime-static` 설정을 그대로 써도 됨)

### Lunch Time (별도 앱)

```bash
cd lunch-time
npm install
cp .env.example .env   # VITE_KAKAO_REST_API_KEY 값을 실제 카카오 REST API 키로 교체
npm run dev
```

자세한 내용은 [`lunch-time/README.md`](lunch-time/README.md) 참고.

## 폴더 구조

```
playtime/
├── index.html            # 홈 (게임 허브 + Take A Walk)
├── pages/                # Wash Up / Secret Break / Ready For Sleep / Drawing / Time Archive
├── css/                  # 페이지별 스타일시트
├── js/                   # 페이지별 스크립트
├── img/                  # 홈/공통 아이콘·이미지
├── public/assets/        # 게임별 이미지 자산 + SK Concretica 폰트 파일
└── lunch-time/           # 점심 메뉴 룰렛 (별도 Vite/React 앱)
```

## 참고

- `index_1.html`, `test.html`은 어디에서도 링크되지 않은 스크래치 파일입니다.
- 네비게이션의 Lunch Time 항목은 아직 실제 `lunch-time/` 앱과 연결되어 있지 않습니다(배포 방식 결정 후 연결 예정).
- 각 게임 결과 화면의 "Next Game" 버튼은 Secret Break → Take A Walk → Drawing → Ready For Sleep → Wash Up 순서로 연결되어 있습니다. Wash Up과 Lunch Time에는 아직 종료(결과) 화면이 없어 Next Game 버튼이 없습니다.
