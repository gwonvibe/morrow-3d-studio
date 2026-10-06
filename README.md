# Morrow — Objects, space & material

Morrow의 오브젝트와 공간 작업을 소개하는 인터랙티브 웹사이트입니다. 스크롤 진행률에 맞춰 전시 패널, 3D 타이포그래피, 프로젝트 프리즘과 갤러리 장면이 이어집니다.

## 실행

Node.js 22.12 이상이 필요합니다.

```sh
npm install
npm run dev
```

## 검증

```sh
npm test
npm run build
```

## 기술 구성

- Vite
- Three.js
- GSAP
- Lenis
- 로컬 Pretendard 웹폰트

모션 줄이기 설정과 키보드 탐색을 지원하며, JavaScript 또는 WebGL을 사용할 수 없는 환경에서도 주요 콘텐츠를 확인할 수 있습니다.
