아래 명세대로 데이터 조회(관리자) 페이지를 만들어줘. 설명보다 완성된 코드가 중요해.
앞서 만든 "고객 정보 수집" 프로젝트 폴더에 **추가되는 파일**이다.

## 만들 것
admin.html — 관리자가 이메일·비밀번호로 로그인하면 저장된 데이터를 표로 보고 CSV로 내려받는 페이지. **로그인 전에는 데이터가 절대 보이지 않는다.**

## 파일 구성 (기존 프로젝트에 추가)
- admin.html — 조회 페이지 (스타일은 admin.html 안의 <style>에 포함)
- admin.js — 조회 로직
- config.js — **기존 파일을 그대로 import (다시 만들지 말 것).** 혹시 없다면 아래 내용으로 생성:
```js
export const firebaseConfig = {
  apiKey: "AIzaSyAGRzloZ-FIvPtIKf7AAcI9efKFbuWUimE",
  authDomain: "jeju3604.firebaseapp.com",
  projectId: "jeju3604",
  storageBucket: "jeju3604.firebasestorage.app",
  messagingSenderId: "773582982134",
  appId: "1:773582982134:web:de90b4b9ccd0d4801895d7"
};
```

## 기술 제약 (반드시 지킬 것)
- 빌드 도구 없는 순수 정적 파일로만 구성 (index.html 등 아래 "파일 구성" 참고)
- Firebase JS SDK v10.12.0 **modular 방식만** 사용, 반드시 아래 CDN import 형태 사용:
  ```js
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getFirestore, collection, query, orderBy, limit, getDocs }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  ```
- v8 네임스페이스 문법(firebase.firestore(), firebase.initializeApp() 등) 절대 사용 금지
- npm, package.json, 번들러, React 등 프레임워크 사용 금지 / 외부 라이브러리·CDN 추가 금지
- app.js와 config.js는 <script type="module">로 로드
- config.js에는 firebaseConfig만 두고 export — 이 파일만 바꾸면 다른 Firebase 프로젝트에서도 동작해야 함
- 모바일 우선 반응형: viewport 메타 태그, 375px 화면에서 가로 스크롤 없음, 입력 필드 font-size 16px 이상
- 깔끔하고 현대적인 디자인 (흰 배경 + 파란색 포인트), 한국어 UI

## 화면과 동작 (admin.html + admin.js)
1. 첫 화면은 로그인 폼(이메일·비밀번호). onAuthStateChanged로 로그인 상태를 감시하고,
   로그인 전에는 데이터 조회를 시도하지도, 데이터 영역을 렌더링하지도 않는다
2. signInWithEmailAndPassword로 로그인. 실패 시 "이메일 또는 비밀번호가 올바르지 않습니다" 표시
3. 로그인 성공 시 데이터 화면으로 전환, 우측 상단에 로그아웃 버튼(signOut)
4. 데이터 조회: getDocs(query(collection(db, 'submissions'), orderBy('createdAt','desc'), limit(500)))
   — onSnapshot(실시간) 금지, 새로고침 버튼으로 다시 읽기
- 상단 바: 총 N건 표시 · 🔄 새로고침 · ⬇ CSV 다운로드 · 로그아웃
- 표는 overflow-x:auto 래퍼로 감싸 모바일에서 가로 스크롤 되게
- 셀 값은 반드시 textContent로 넣기 (innerHTML에 사용자 데이터 금지)

## 표 구성 (컬럼 순서대로)
- name → 헤더 "이름"
- phone → 헤더 "전화번호"
- email → 헤더 "이메일"
- memo → 헤더 "메모"
- createdAt → 헤더 "제출시각" (YYYY-MM-DD HH:mm 형식)
- 값이 없는 칸은 "-" 표시

## CSV 다운로드
- 표와 같은 내용, 첫 줄은 헤더
- **UTF-8 BOM(\uFEFF)을 파일 맨 앞에 포함** (엑셀에서 한글 깨짐 방지)
- 쉼표·따옴표·줄바꿈이 든 값은 큰따옴표로 감싸고 내부 따옴표는 두 번 쓰기(CSV 이스케이프)
- 파일명: submissions_YYYYMMDD.csv

## 에러 처리
- 저장/조회 실패 시 error.code가 'permission-denied'면 화면에
  "Firestore 보안 규칙이 적용되지 않았습니다. 배포 가이드 3단계를 확인하세요." 안내 표시
- 기타 오류도 한국어 메시지로 화면에 표시 (console.log에만 남기지 말 것)

## 출력 형식
- 2개(admin.html, admin.js) 파일 각각을 "### 파일명" 제목 + 코드블록 하나로, 생략 없이 완성본 전체를 출력
- 코드 밖 설명은 최소화

## 완료 체크리스트 (전부 만족해야 완성)
- [ ] 로그아웃 상태에서는 데이터가 전혀 보이지 않고, 조회 요청도 보내지 않는다
- [ ] limit(500)을 넘는 읽기가 없다
- [ ] 내려받은 CSV를 엑셀에서 열었을 때 한글이 깨지지 않는다
- [ ] v8 문법이 한 줄도 없다
- [ ] 375px 화면에서 표가 가로 스크롤 래퍼 안에 있다