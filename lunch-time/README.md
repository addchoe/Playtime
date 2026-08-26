# Lunch Time — 점심 메뉴 룰렛

Figma 프레임 `02_Lunch Time` (node `115:1316`)을 재현한 인터랙티브 룰렛. 현재 위치와
검색 반경을 입력하면 카카오 Local API로 주변 음식점을 찾아 룰렛을 돌립니다.

## 실행 방법

```bash
npm install
cp .env.example .env   # VITE_KAKAO_REST_API_KEY 값을 실제 카카오 REST API 키로 교체
npm run dev
```

카카오 REST API 키는 [Kakao Developers 콘솔](https://developers.kakao.com/console/app)의
"내 애플리케이션 > 앱 키 > REST API 키"에서 발급받을 수 있습니다. `.env`는 git에 커밋되지 않습니다.

키를 설정하지 않고 실행하면 화면은 정상적으로 뜨고, Go 버튼을 누르면
"카카오 API 키가 설정되지 않았습니다" 오류 메시지가 표시됩니다 (자리표시자 세그먼트로만
룰렛 확인 가능).

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
