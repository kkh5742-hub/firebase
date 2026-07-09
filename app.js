// Firebase JS SDK v10.12.0 Modular API import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// Firebase 초기화
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  showGlobalError("Firebase 초기화 에러가 발생했습니다. 설정을 확인해 주세요.");
}

// DOM 엘리먼트 캐싱
const formContainer = document.getElementById('form-container');
const successContainer = document.getElementById('success-container');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');

const form = document.getElementById('submission-form');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnRetry = document.getElementById('btn-retry');
const memoField = document.getElementById('memo');
const charCounter = document.getElementById('char-counter');

// 입력 필드와 에러 표시 영역 매핑
const fields = {
  name: {
    input: document.getElementById('name'),
    error: document.getElementById('error-name')
  },
  phone: {
    input: document.getElementById('phone'),
    error: document.getElementById('error-phone')
  },
  email: {
    input: document.getElementById('email'),
    error: document.getElementById('error-email')
  },
  memo: {
    input: document.getElementById('memo'),
    error: document.getElementById('error-memo')
  }
};

// 정규식 정의
const PHONE_REGEX = /^0\d{1,2}-\d{3,4}-\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 실시간 메모 글자 수 카운터
memoField.addEventListener('input', () => {
  const currentLength = memoField.value.length;
  charCounter.textContent = `${currentLength} / 500`;
  if (currentLength >= 500) {
    charCounter.classList.add('text-red-500');
  } else {
    charCounter.classList.remove('text-red-500');
  }
});

// 전역 에러 제어
function showGlobalError(message) {
  errorText.textContent = message;
  errorContainer.classList.remove('hidden');
}

function clearGlobalError() {
  errorText.textContent = "";
  errorContainer.classList.add('hidden');
}

// 각 입력 항목 에러 제어
function setFieldError(fieldKey, message) {
  const target = fields[fieldKey];
  if (message) {
    target.error.textContent = message;
    target.error.classList.remove('hidden');
    target.input.classList.add('input-error');
  } else {
    target.error.textContent = "";
    target.error.classList.add('hidden');
    target.input.classList.remove('input-error');
  }
}

// 입력 중일 때 실시간으로 해당 필드 에러 제거
Object.keys(fields).forEach(key => {
  fields[key].input.addEventListener('input', () => {
    setFieldError(key, null);
  });
});

// 클라이언트 검증 로직
function validateForm(data) {
  let isValid = true;

  // 이름 검증 (필수, 50자 이내)
  if (!data.name.trim()) {
    setFieldError('name', '이름은 필수 입력 항목입니다.');
    isValid = false;
  } else if (data.name.length > 50) {
    setFieldError('name', '이름은 50자 이내로 입력해야 합니다.');
    isValid = false;
  } else {
    setFieldError('name', null);
  }

  // 전화번호 검증 (필수, 010-1234-5678 형식)
  if (!data.phone.trim()) {
    setFieldError('phone', '전화번호는 필수 입력 항목입니다.');
    isValid = false;
  } else if (!PHONE_REGEX.test(data.phone.trim())) {
    setFieldError('phone', '전화번호 형식(예: 010-1234-5678)에 맞게 입력해 주세요.');
    isValid = false;
  } else {
    setFieldError('phone', null);
  }

  // 이메일 검증 (선택, 이메일 형식)
  if (data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    setFieldError('email', '올바른 이메일 형식이 아닙니다.');
    isValid = false;
  } else {
    setFieldError('email', null);
  }

  // 메모 검증 (선택, 500자 이내)
  if (data.memo.length > 500) {
    setFieldError('memo', '메모는 500자 이하로 작성해 주세요.');
    isValid = false;
  } else {
    setFieldError('memo', null);
  }

  return isValid;
}

// 폼 전송 핸들러
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearGlobalError();

  const formData = {
    name: fields.name.input.value,
    phone: fields.phone.input.value,
    email: fields.email.input.value,
    memo: fields.memo.input.value
  };

  if (!validateForm(formData)) {
    return;
  }

  // 제출 버튼 비활성화 (중복 제출 방지)
  btnSubmit.disabled = true;
  btnSubmit.classList.add('opacity-75', 'cursor-not-allowed');
  btnText.textContent = "저장 중…";

  try {
    // 보안 규칙에서 정해진 필드만 포함하는 payload 객체 생성
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      createdAt: serverTimestamp()
    };

    if (formData.email.trim()) {
      payload.email = formData.email.trim();
    }
    if (formData.memo.trim()) {
      payload.memo = formData.memo;
    }

    // submissions 컬렉션에 등록
    await addDoc(collection(db, "submissions"), payload);

    // 완료 화면 전환 및 리셋
    formContainer.classList.add('hidden');
    successContainer.classList.remove('hidden');
    form.reset();
    charCounter.textContent = "0 / 500";

  } catch (error) {
    console.error("Firestore Error: ", error);
    
    // Firestore 권한 거부 예외 처리
    if (error.code === 'permission-denied') {
      showGlobalError("Firestore 보안 규칙이 적용되지 않았습니다. 배포 가이드 3단계를 확인하세요.");
    } else {
      showGlobalError(`데이터 저장에 실패했습니다. (${error.message || '알 수 없는 서버 오류'})`);
    }
  } finally {
    // 버튼 상태 원복
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('opacity-75', 'cursor-not-allowed');
    btnText.textContent = "정보 제출하기";
  }
});

// 다시 작성하기 클릭 시
btnRetry.addEventListener('click', () => {
  successContainer.classList.add('hidden');
  formContainer.classList.remove('hidden');
  clearGlobalError();
  
  // 에러 초기화
  Object.keys(fields).forEach(key => {
    setFieldError(key, null);
  });
});