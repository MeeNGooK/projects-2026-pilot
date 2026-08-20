import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCIOwKTKfM249QskhxU6WKs0YGzn-TNkGs',
  authDomain: 'portbear-pilot.firebaseapp.com',
  projectId: 'portbear-pilot',
  storageBucket: 'portbear-pilot.firebasestorage.app',
  messagingSenderId: '57075934247',
  appId: '1:57075934247:web:1f8c7be37ed93cbffd1a02'
};

const firebaseApp = initializeApp(firebaseConfig);
window.portbearFirebaseApp = firebaseApp;
const auth = getAuth(firebaseApp);
const db = getFirestore();
const fields = [['성명', '예: 홍길동'], ['출신지', '예: 전라도'], ['나이', '예: 29세'], ['키', '예: 171cm'], ['무게', '예: 62kg']];
const $ = selector => document.querySelector(selector);
let selected = fields.slice(0, 3).map(([name]) => name);

const legacyReset = document.querySelector('#reset');
if (legacyReset) {
  const logoutButton = legacyReset.cloneNode(true);
  legacyReset.replaceWith(logoutButton);
  logoutButton.onclick = async () => { await signOut(auth); };
}

document.body.insertAdjacentHTML('beforeend', `
  <section class="auth-gate" id="authGate" aria-live="polite">
    <div class="auth-note" id="authNote"></div>
  </section>`);

function message(error) {
  const codes = {
    'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요.',
    'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
    'auth/weak-password': '비밀번호는 6자 이상으로 입력해 주세요.',
    'auth/invalid-email': '이메일 형식을 확인해 주세요.',
    'auth/too-many-requests': '시도가 많아요. 잠시 후 다시 시도해 주세요.'
  };
  return codes[error?.code] || '처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

function setStatus(text = '') { const el = $('#authError'); if (el) el.textContent = text; }
function showGate() { $('#authGate').classList.remove('hidden'); }
function hideGate() { $('#authGate').classList.add('hidden'); $('#onboarding')?.classList.add('hidden'); }

function loginView() {
  $('#authNote').innerHTML = `
    <p class="auth-brand">port<span>bear</span></p><p class="auth-kicker">LITTLE NOTES, REAL ACCOUNTS</p>
    <h2>다시 만나서 반가워요.</h2><p class="auth-copy">이메일 아이디와 비밀번호로 나의 보드에 들어가세요.</p>
    <form class="auth-form" id="loginForm"><label>이메일 아이디<input name="email" type="email" autocomplete="email" required /></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required /></label><button>로그인</button></form>
    <button class="auth-switch" id="goSignup" type="button">처음이신가요? 회원가입</button><p class="auth-error" id="authError"></p>`;
  $('#goSignup').onclick = signupAccountView;
  $('#loginForm').onsubmit = async event => {
    event.preventDefault(); setStatus('로그인 중...'); const data = new FormData(event.currentTarget);
    try { await signInWithEmailAndPassword(auth, data.get('email').trim(), data.get('password')); }
    catch (error) { setStatus(message(error)); }
  };
}

function signupAccountView() {
  $('#authNote').innerHTML = `
    <p class="auth-brand">port<span>bear</span></p><p class="auth-kicker">STEP 1 OF 2 · CREATE ACCOUNT</p>
    <h2>나만의 메모를 만들어요.</h2><p class="auth-copy">로그인에 사용할 이메일 아이디와 비밀번호를 적어주세요.</p>
    <form class="auth-form" id="accountForm"><label>이메일 아이디<input name="email" type="email" autocomplete="email" required /></label><label>비밀번호<input name="password" type="password" minlength="6" autocomplete="new-password" required /></label><label>비밀번호 확인<input name="confirm" type="password" minlength="6" autocomplete="new-password" required /></label><button>세 가지 정보 고르기 →</button></form>
    <button class="auth-switch" id="goLogin" type="button">이미 계정이 있어요 · 로그인</button><p class="auth-error" id="authError"></p>`;
  $('#goLogin').onclick = loginView;
  $('#accountForm').onsubmit = event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    if (data.get('password') !== data.get('confirm')) return setStatus('비밀번호 확인이 일치하지 않아요.');
    profileView({ email: data.get('email').trim(), password: data.get('password') });
  };
}

function profileView(account) {
  const role = account.role || 'bear';
  const renderInputs = () => selected.map(name => {
    const example = fields.find(([field]) => field === name)[1];
    return `<label>${name}<input name="${name}" placeholder="${example}" required /></label>`;
  }).join('');
  $('#authNote').innerHTML = `
    <p class="auth-brand">port<span>bear</span></p><p class="auth-kicker">STEP 2 OF 2 · PROFILE NOTE</p>
    <h2>나를 소개할 세 가지</h2><p class="auth-copy">공개할 정보만 선택해요. 선택은 다시 눌러 해제할 수 있어요.</p>
    <div class="auth-choice-row" id="authChoices">${fields.map(([name]) => `<button type="button" data-name="${name}" class="${selected.includes(name) ? 'selected' : ''}">${name}</button>`).join('')}</div>
    <p class="auth-role-label">이용 유형</p><div class="auth-role-row" id="authRoles"><button type="button" data-role="porter" class="${role === 'porter' ? 'selected' : ''}"><b>포터</b><small>콘텐츠 제작자 · 자영업자</small></button><button type="button" data-role="bear" class="${role === 'bear' ? 'selected' : ''}"><b>베어</b><small>일반 사용자</small></button></div>
    <form class="auth-form" id="profileForm"><div class="auth-profile-fields" id="authProfileFields">${renderInputs()}</div><button>가입하고 포트베어 시작하기 →</button></form>
    <button class="auth-switch" id="backAccount" type="button">← 계정 정보로 돌아가기</button><p class="auth-error" id="authError"></p>`;
  $('#backAccount').onclick = signupAccountView;
  $('#authChoices').onclick = event => {
    const button = event.target.closest('button'); if (!button) return;
    const name = button.dataset.name;
    if (selected.includes(name)) selected = selected.filter(item => item !== name);
    else if (selected.length < 3) selected = [...selected, name];
    else return setStatus('세 가지만 선택할 수 있어요.');
    profileView(account);
  };
  $('#authRoles').onclick = event => {
    const button = event.target.closest('button'); if (!button) return;
    profileView({ ...account, role: button.dataset.role });
  };
  $('#profileForm').onsubmit = async event => {
    event.preventDefault(); if (selected.length !== 3) return setStatus('공개할 정보 세 가지를 골라주세요.');
    const profile = Object.fromEntries(new FormData(event.currentTarget));
    if (Object.values(profile).some(value => !String(value).trim())) return setStatus('선택한 세 가지를 모두 적어주세요.');
    setStatus('계정을 만들고 있어요...');
    try {
      const credential = await createUserWithEmailAndPassword(auth, account.email, account.password);
      await saveProfile(credential.user, profile, true, role);
    } catch (error) { setStatus(message(error)); }
  };
}

async function saveProfile(user, profile, created = false, role = 'bear') {
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email, profile, selectedFields: Object.keys(profile), role, updatedAt: serverTimestamp(), ...(created ? { createdAt: serverTimestamp() } : {})
  }, { merge: true });
  localStorage.setItem('sbs-sticky-onboarding-v2', JSON.stringify(Object.values(profile)));
  localStorage.setItem('sbs-role', role || 'bear');
  const existing = JSON.parse(localStorage.getItem('sbs-me') || '{}');
  localStorage.setItem('sbs-me', JSON.stringify({ ...existing, intro: existing.intro || profile.성명 || user.email.split('@')[0], area: existing.area || profile.출신지 || '' }));
  hideGate();
}

async function loadProfile(user) {
  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      localStorage.setItem('sbs-role', data.role || 'bear');
      localStorage.setItem('sbs-sticky-onboarding-v2', JSON.stringify(Object.values(data.profile || {})));
      const existing = JSON.parse(localStorage.getItem('sbs-me') || '{}');
      localStorage.setItem('sbs-me', JSON.stringify({ ...existing, intro: existing.intro || data.profile?.성명 || user.email.split('@')[0], area: existing.area || data.profile?.출신지 || '' }));
    } else localStorage.setItem('sbs-role', 'bear');
    hideGate();
  } catch (error) { setStatus('프로필을 불러오지 못했어요. 다시 로그인해 주세요.'); }
}

onAuthStateChanged(auth, user => user ? loadProfile(user) : (showGate(), loginView()));

window.portbearLogout = () => signOut(auth);
