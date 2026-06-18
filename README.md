# DSM KAIST Project

배포 링크: https://dsm-kaist-project-production.up.railway.app

## 작업 내역

### 1. 프로젝트 구조 변경
- `memo-app/` 하위에 있던 파일들을 루트 디렉토리로 이동
- Railway가 프로젝트를 인식할 수 있도록 구조 정리
  - `memo-app/index.html` → `index.html`
  - `memo-app/css/style.css` → `css/style.css`
  - `memo-app/js/app.js` → `js/app.js`

### 2. Railway 배포 설정
- `package.json` 추가
- `serve` 패키지를 이용한 정적 파일 서버 구성
- Railway에서 `npm start` → `npx serve .` 로 자동 실행

### 3. 기타
- GitHub 계정 `ch0ijimin323`의 Admin 권한 요청 이슈 생성 ([#1](https://github.com/sebeen-lee/dsm-kaist-project/issues/1))
- README.md 생성 및 배포 링크 추가
