# Lunch Time — 점심 메뉴 룰렛

Figma 프레임 `02_Lunch Time` (룰렛/설정 화면 node `534:759`, 결과 화면 node `338:588`)을
재현한 인터랙티브 룰렛. 위치를 검색하고 검색 반경을 정하면 카카오맵 JavaScript SDK의
Places 서비스로 주변 음식점을 찾아 룰렛을 돌립니다.

## 실행 방법

```bash
npm install
cp .env.example .env   # VITE_KAKAO_JAVASCRIPT_KEY 값을 실제 카카오 JavaScript 키로 교체
npm run dev
```

카카오 JavaScript 키는 [Kakao Developers 콘솔](https://developers.kakao.com/console/app)의
"내 애플리케이션 > 앱 → 플랫폼 키 → JavaScript 키"에서 발급받을 수 있습니다.
**REST API 키가 아니라 JavaScript 키**를 써야 합니다 — Maps Web SDK는 JavaScript 키로
인증합니다. `.env`는 git에 커밋되지 않습니다.

이 키를 쓰기 전에 콘솔에서 두 가지를 반드시 켜야 합니다:

1. **제품 설정 > 카카오맵(Maps)** — 사용 설정 ON (꺼져 있으면 검색이
   `NotAuthorizedError: disabled OPEN_MAP_AND_LOCAL service`로 실패합니다.)
2. **앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인**에 개발 서버 주소 등록
   (예: `http://localhost:5173`. `npm run dev`가 실제로 뜬 포트와 정확히 일치해야 합니다.)

키를 설정하지 않고 실행하면 화면은 정상적으로 뜨고, "음식점 불러오기"를 누르면
"카카오 JavaScript 키가 설정되지 않았습니다" 오류 메시지가 표시됩니다 (빈 세그먼트로만
룰렛 레이아웃 확인 가능).

## 빌드

```bash
npm run build   # tsc -b && vite build
npm run preview # 빌드 결과 로컬 미리보기
```

## 타입 체크 / 린트

```bash
npx tsc -b
npm run lint
```
