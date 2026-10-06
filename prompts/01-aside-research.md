# Aside에 붙여 넣을 프롬프트

아래 `[업종]`만 댓글에서 고른 업종으로 바꿔서 실행하세요.

```text
우리는 [업종] 분야의 가상 브랜드를 만들려고 합니다.

이 업종에서 실제 고객이 무엇을 중요하게 보는지 파악할 수 있도록 국내외 경쟁 브랜드 3곳을 짧게 조사해 주세요. 각 브랜드의 고객, 핵심 제안, 대표 상품 또는 서비스, 시각적으로 반복되는 특징을 정리하고, 확인한 사실에는 출처 URL을 붙여 주세요. 사실로 확인되지 않은 내용은 추정이라고 표시하세요.

조사 결과를 바탕으로 기존 브랜드를 복제하지 않은 새로운 가상 브랜드 한 곳을 기획해 주세요. 웹사이트에 바로 넣을 수 있도록 다음 항목을 빠짐없이 정리해야 합니다.

- 영문 브랜드명: 2~10자, 읽기 쉬운 이름
- 한 줄 설명: 영문 대문자, 35자 이내
- 주요 고객과 포지셔닝
- 분위기 키워드 3개
- 배경·본문·보조·강조·3D 오브젝트 색상 5개: 모두 HEX 코드
- 히어로 문장, 작업 소개 제목과 설명, 브랜드 소개 제목과 본문, 문의 문장
- 실제 있을 법한 프로젝트 또는 상품 3개: 이름, 유형, 연도, 한 문장 설명

결과는 두 파일로 정리해 주세요.

1. `research.md`: 경쟁 브랜드 3곳의 조사 내용, 출처, 가상 브랜드를 이렇게 정한 이유
2. `site-brief.json`: 아래 키 이름을 그대로 사용한 유효한 JSON

`site-brief.json`에는 industry, brandName, descriptor, location, founded, targetCustomer, positioning, moodKeywords, colors, heroStatement, workTitle, workIntro, aboutWord, aboutTitle, aboutBody, contactTitle, contactEmail, projects를 넣으세요. colors에는 paper, ink, muted, accent, object를 넣고, projects는 정확히 3개로 작성하세요. 줄바꿈이 필요한 제목은 JSON 문자열 안에 `\n`으로 표시하세요.

완료 기준:
- 경쟁 브랜드 3곳과 출처 URL이 `research.md`에 있다.
- `site-brief.json`이 설명 없이 JSON만 담고 있으며 파싱된다.
- 프로젝트가 정확히 3개다.
- 확인한 사실과 브랜드 기획상의 판단이 섞여 있지 않다.
```
