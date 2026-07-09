import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM 요소 탐색
const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");

const loginErrorContainer = document.getElementById("login-error-container");
const mainErrorContainer = document.getElementById("main-error-container");

const btnRefresh = document.getElementById("btn-refresh");
const btnDownload = document.getElementById("btn-download");
const btnLogout = document.getElementById("btn-logout");

const totalCountSpan = document.getElementById("total-count");
const dataTbody = document.getElementById("data-tbody");
const loadingArea = document.getElementById("loading-area");
const tableArea = document.getElementById("table-area");

// 캐시된 데이터 저장 (CSV 다운로드용)
let fetchedSubmissions = [];

// 에러 핸들러 함수
function showError(container, message, isPermissionDenied = false) {
  container.innerHTML = "";
  container.classList.remove("hidden");
  
  const div = document.createElement("div");
  div.className = "error-banner";
  
  if (isPermissionDenied) {
    div.textContent = "Firestore 보안 규칙이 적용되지 않았습니다. 배포 가이드 3단계를 확인하세요.";
  } else {
    div.textContent = message;
  }
  container.appendChild(div);
}

function clearErrors() {
  loginErrorContainer.innerHTML = "";
  loginErrorContainer.classList.add("hidden");
  mainErrorContainer.innerHTML = "";
  mainErrorContainer.classList.add("hidden");
}

// YYYY-MM-DD HH:mm 날짜 포맷팅 함수
function formatDate(timestamp) {
  if (!timestamp) return "-";
  
  // Firestore Timestamp 처리 또는 일반 Date 처리
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  
  if (isNaN(date.getTime())) return "-";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// 1. 데이터 가져오기 로직 (인증된 상태에서만 수동 또는 자동 호출)
async function fetchSubmissionsData() {
  if (!auth.currentUser) return; // 로그인 상태가 아니라면 절대 전송하지 않음

  clearErrors();
  loadingArea.classList.remove("hidden");
  tableArea.classList.add("hidden");
  dataTbody.innerHTML = "";
  fetchedSubmissions = [];
  totalCountSpan.textContent = "0";

  try {
    const submissionsRef = collection(db, "submissions");
    // limit(500) 제한 및 최신순 정렬
    const q = query(submissionsRef, orderBy("createdAt", "desc"), limit(500));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      fetchedSubmissions.push({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        memo: data.memo || "",
        createdAt: data.createdAt || null
      });
    });

    renderTable(fetchedSubmissions);

  } catch (error) {
    console.error("데이터 조회 에러: ", error);
    if (error.code === "permission-denied") {
      showError(mainErrorContainer, "", true);
    } else {
      showError(mainErrorContainer, `데이터 조회 중 오류가 발생했습니다: ${error.message}`);
    }
  } finally {
    loadingArea.classList.add("hidden");
    tableArea.classList.remove("hidden");
  }
}

// 2. 테이블 렌더링 로직 (XSS 대비 textContent 보장)
function renderTable(dataList) {
  totalCountSpan.textContent = dataList.length;
  dataTbody.innerHTML = "";

  if (dataList.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("colspan", "5");
    td.style.textAlign = "center";
    td.style.padding = "30px";
    td.style.color = "#94a3b8";
    td.textContent = "제출된 데이터가 없습니다.";
    tr.appendChild(td);
    dataTbody.appendChild(tr);
    return;
  }

  dataList.forEach((item) => {
    const tr = document.createElement("tr");

    // 컬럼 순서: name, phone, email, memo, createdAt
    const fields = [
      item.name,
      item.phone,
      item.email,
      item.memo,
      formatDate(item.createdAt)
    ];

    fields.forEach((val) => {
      const td = document.createElement("td");
      // 값이 없는 칸은 "-" 표시
      const textVal = (val === undefined || val === null || String(val).trim() === "") ? "-" : String(val);
      td.textContent = textVal; // innerHTML 절대 지양 (XSS 완벽 차단)
      tr.appendChild(td);
    });

    dataTbody.appendChild(tr);
  });
}

// 3. CSV 포맷팅 및 다운로드 로직
function downloadCSV() {
  if (fetchedSubmissions.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  // CSV 헤더 정의
  const headers = ["이름", "전화번호", "이메일", "메모", "제출시각"];
  
  // CSV 이스케이프 헬퍼 함수
  const escapeCSV = (val) => {
    if (val === undefined || val === null) return "";
    let str = String(val);
    // 큰따옴표, 쉼표, 줄바꿈이 있는 경우 큰따옴표로 감싸기
    if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
      str = str.replace(/"/g, '""'); // 내부 따옴표 두 번 사용
      return `"${str}"`;
    }
    return str;
  };

  // 행(Row) 생성
  const csvRows = [];
  csvRows.push(headers.join(",")); // 헤더 행 추가

  fetchedSubmissions.forEach((item) => {
    const row = [
      escapeCSV(item.name || "-"),
      escapeCSV(item.phone || "-"),
      escapeCSV(item.email || "-"),
      escapeCSV(item.memo || "-"),
      escapeCSV(formatDate(item.createdAt))
    ];
    csvRows.push(row.join(","));
  });

  const csvString = csvRows.join("\r\n");
  
  // 파일명 생성: submissions_YYYYMMDD.csv
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const filename = `submissions_${yyyy}${mm}${dd}.csv`;

  // UTF-8 BOM(\uFEFF)을 맨 앞에 구성하여 엑셀 한글 깨짐 방지
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  
  // 가상 링크 요소를 생성해 다운로드 유도
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// 4. 인증 상태 감시 (onAuthStateChanged)
onAuthStateChanged(auth, (user) => {
  clearErrors();
  if (user) {
    // 로그인 완료 시: 폼 비우고 섹션 스위칭
    loginEmailInput.value = "";
    loginPasswordInput.value = "";
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    
    // 안전하게 로그인 성공 시점에만 최초 1회 데이터 호출 진행
    fetchSubmissionsData();
  } else {
    // 로그아웃 상태 시: 화면 숨김, 데이터 휘발
    adminSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    dataTbody.innerHTML = "";
    fetchedSubmissions = [];
    totalCountSpan.textContent = "0";
  }
});

// 5. 로그인 처리 이벤트
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("로그인 에러:", error);
    // 에러 분기 및 가독성 좋은 한국어 메시지 제공
    let errorMsg = "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (error.code === "auth/invalid-email" || error.code === "auth/user-not-found") {
      errorMsg = "존재하지 않는 관리자 계정이거나 이메일 형식이 잘못되었습니다.";
    } else if (error.code === "auth/wrong-password") {
      errorMsg = "비밀번호가 올바르지 않습니다.";
    } else if (error.code === "auth/network-request-failed") {
      errorMsg = "네트워크 연결이 원활하지 않습니다. 다시 시도해 주세요.";
    }
    showError(loginErrorContainer, errorMsg);
  }
});

// 6. 로그아웃 처리 이벤트
btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 에러:", error);
    showError(mainErrorContainer, `로그아웃 도중 오류가 발생했습니다: ${error.message}`);
  }
});

// 7. 새로고침 버튼 이벤트
btnRefresh.addEventListener("click", fetchSubmissionsData);

// 8. CSV 다운로드 버튼 이벤트
btnDownload.addEventListener("click", downloadCSV);