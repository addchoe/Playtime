# Playtime!

일상 속 짧은 순간(세안, 화장실 브레이크, 점심, 산책, 드로잉, 잠들기 전)을 미니게임으로 만든 웹사이트입니다.

## 기획

### Overview

![Overview](<img/1개요.png>)

일상 속에서 반복되지만 스쳐 지나가기 쉬운 짧은 순간들(세수, 점심, 산책, 잠들기 등)을 가벼운 인터랙션으로 재해석했습니다. 각 순간을 직관적인 조작의 미니게임으로 만들어, 별다른 설명 없이도 누구나 바로 플레이할 수 있게 하는 것이 목표입니다.

### Service Flow

![Service Flow](<img/2서비스 플로우.png>)

기획 단계의 서비스 흐름입니다. 시계 UI에서 시간대(Wake Up/Daily Choice/Tiny Walk/Sleep Mode)를 고르면 그에 맞는 인터랙션(세수, 점심 고르기, 산책, 잠들기)을 하루치 체험으로 진행하고, 그 결과가 Time Card → Routine Proof → Instagram Share 순으로 이어지는 공유 콘텐츠로 만들어져 "시간을 가지고 노는 일상 기록 방식"이라는 목표로 연결됩니다. 실제 구현에서는 이 시간대들이 Wash Up / Lunch Time(예정) / Take A Walk / Ready For Sleep 등 개별 게임 페이지로 나뉘어 있습니다. (아래 [구성](#구성) 참고)

### Interaction System

![Interaction System](<img/3인터렉션 설명.png>)

게임마다 성격에 맞는 세 가지 조작 방식을 조합해 사용합니다.

- **Webcam Interaction** — 웹캠으로 실제 동작을 인식(Wash Up, Ready For Sleep의 사진부스 카운트다운 등)
- **Mouse Interaction** — 마우스 이동/드래그로 화면 속 오브젝트를 조작(Take A Walk의 미로 길찾기 등)
- **Gesture Interaction** — 손가락 제스처를 트래킹해 그리기 등에 활용(Drawing, Wash Up의 손 트래킹)

### Information Architecture

![Information Architecture](<img/4IA구조도.png>)

Home 하위에 6개 게임이 나란히 연결되는 플랫한 구조입니다. 각 페이지의 실제 경로와 상세 설명은 아래 [구성](#구성) 표를 참고하세요.

### Design System

![Design System](<img/5디자인시스템.png>)

- **공통 컴포넌트**: `Playtime!` 로고, Time을 보여주는 GNB(네비게이션 pill), Contact Sub 버튼을 모든 페이지가 공유합니다.
- **그리드 시스템**: Full HD(1920×1080) 기준 12-column 그리드, 좌우 마진 60px, 거터(gutter) 20px. 실제 구현에서 이 1920×1080 캔버스를 뷰포트에 맞게 스케일하는 방식은 아래 [기술 스택](#기술-스택)에서 설명합니다.

### Team

![Team](<img/6팀소개.png>)

| 이름 | 역할 | 담당 페이지 |
| --- | --- | --- |
| Shin Chanhee | Designer · Developer | Wash Up, Lunch Time, Secret Break, Ready For Sleep |
| Choi Yejun | Designer · Developer | Main, Contact, Take A Walk, Drawing |

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
