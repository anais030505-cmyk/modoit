// =====================================================
// 모두잇 클래스 - 메인 스크립트
// YouTube 플레이리스트 기반 강의 플랫폼
// Firebase v10 (ES Module)
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, getDocs, doc,
  setDoc, getDoc, updateDoc, increment, orderBy, query,
  addDoc, where, serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// =====================================================
// FIREBASE 설정
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyCKn6pnMR5lDbJM6C2kLDN8XceByLkL5oU",
  authDomain: "modoit-class.firebaseapp.com",
  projectId: "modoit-class",
  storageBucket: "modoit-class.firebasestorage.app",
  messagingSenderId: "835548872571",
  appId: "1:835548872571:web:a99d253820abf3b70887de",
  measurementId: "G-ZXD2EBQWSX"
};

const KAKAO_JS_KEY = 'b59c8052d94c133575b1f736da7a196d';

// =====================================================
// YouTube 플레이리스트 정의 (카테고리)
// =====================================================
const PLAYLISTS = [
  { id: 'PLzaIVWzQ-Ed-M6sDBE1jonxxafr39yGdr', name: '미리캔버스와 AI로 홍보 끝판왕' },
  { id: 'PLzaIVWzQ-Ed_NxtAS7Op0e6QMCSpxe78-', name: 'AI 활용법' },
  { id: 'PLzaIVWzQ-Ed-3Tx9ENBizYzutBHQ3t7nT', name: '미리캔버스 시작(초급)' },
];

// 수강 후기
const SAMPLE_REVIEWS = [
  {
    text: '강사님 설명이 너무 쉽고 친절해서 AI 도구를 처음 접하는 저도 따라갈 수 있었어요. 실무에 바로 적용했더니 업무 시간이 확 줄었습니다!',
    name: 'ㅇ**님',
    course: 'AI 활용법',
    stars: 5,
  },
  {
    text: '미리캔버스 강의는 정말 최고예요. 디자인 전공도 아닌데 이제 혼자 SNS 콘텐츠 만들 수 있게 됐어요. 강의 내용이 정말 실용적이에요.',
    name: 'k**님',
    course: '미리캔버스 시작(초급)',
    stars: 5,
  },
  {
    text: '60대인데도 선생님이 하나하나 친절하게 알려주셔서 따라가기 좋았습니다. 이제 혼자서도 AI 도구를 활용할 수 있어요!',
    name: '박**님',
    course: '미리캔버스와 AI로 홍보 끝판왕',
    stars: 5,
  },
];

// =====================================================
// 픽셀아트 아바타 시스템
// =====================================================
const PIXEL_AVATARS = [
  {
    id: 1, name: '로봇',
    bg: '#EDE9FE',
    palette: { P:'#7C3AED', L:'#A78BFA', W:'#FFFFFF', D:'#1F1145', Y:'#FCD34D', B:'#F9A8D4' },
    grid: [
      '....YY....',
      '..PPPPPP..',
      '.PPPPPPPP.',
      '.PWWPPWWP.',
      '.PDDPPDDP.',
      '.PBPPPPBP.',
      '.PPYYYYPP.',
      '..PPPPPP..',
      '...PPPP...',
      '..........',
    ]
  },
  {
    id: 2, name: '냥이',
    bg: '#FFF7ED',
    palette: { O:'#F97316', W:'#FFFFFF', D:'#374151', N:'#FB923C', L:'#FDBA74' },
    grid: [
      'O........O',
      'OO......OO',
      'OOOOOOOOOO',
      'OOWWOOWWOO',
      'OODDOODDOO',
      'OOOONNOOOO',
      '.OOOOOOOO.',
      '..OOOOOO..',
      '..........',
      '..........',
    ]
  },
  {
    id: 3, name: '곰돌이',
    bg: '#FEF3C7',
    palette: { B:'#92400E', W:'#FFFFFF', D:'#374151', N:'#D97706', K:'#4B2508' },
    grid: [
      'BB......BB',
      'BBBBBBBBBB',
      'BBWWBBWWBB',
      'BBDDBBDDBB',
      'BBBBBBBBBB',
      'BBBNNNNBBB',
      'BBBBKKBBBB',
      '..BBBBBB..',
      '..........',
      '..........',
    ]
  },
  {
    id: 4, name: '펭귄',
    bg: '#E0F2FE',
    palette: { K:'#1F2937', W:'#FFFFFF', D:'#111827', Y:'#FCD34D' },
    grid: [
      '..KKKKKK..',
      '.KKKKKKKK.',
      '.KWWKKWWK.',
      '.KDDKKDDK.',
      '.KKKKKKKK.',
      '..KKYYKK..',
      '..KKKKKK..',
      '...KKKK...',
      '..........',
      '..........',
    ]
  },
  {
    id: 5, name: '토끼',
    bg: '#FCE7F3',
    palette: { P:'#EC4899', L:'#F9A8D4', W:'#FFFFFF', D:'#374151', N:'#FB7185' },
    grid: [
      '..PP..PP..',
      '..PL..LP..',
      '..PP..PP..',
      '.PPPPPPPP.',
      '.PWWPPWWP.',
      '.PDDPPDDP.',
      '.PPPPPPPP.',
      '..PPNNPP..',
      '..........',
      '..........',
    ]
  }
];

function getAvatarDataUri(avatarId) {
  const a = PIXEL_AVATARS.find(x => x.id === avatarId) || PIXEL_AVATARS[0];
  const rows = a.grid.length;
  const cols = a.grid[0].length;
  const cell = 8;
  const ox = (100 - cols * cell) / 2;
  const oy = (100 - rows * cell) / 2;
  let rects = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < a.grid[y].length; x++) {
      const ch = a.grid[y][x];
      if (ch === '.') continue;
      const color = a.palette[ch];
      if (!color) continue;
      rects += `<rect fill="${color}" x="${ox+x*cell}" y="${oy+y*cell}" width="${cell}" height="${cell}"/>`;
    }
  }
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${a.bg}" cx="50" cy="50" r="50"/>${rects}</svg>`
  );
}

// =====================================================
// 보안: HTML 이스케이프
// =====================================================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeUrl(url) {
  if (!url) return '';
  // base64 data URL 또는 https:// URL만 허용
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url;
  return '';
}

// =====================================================
// 앱 상태
// =====================================================
let currentUser = null;
let allCourses = [];
let currentCat = 'all';
let currentSort = 'order';
let fbReady = false;
let auth, db;
let myEnrollments = new Set();
let userProfile = { nickname: '', avatarId: 1 };
let selectedAvatarId = 1;
let allReviews = [];
let reviewStars = 5;

// =====================================================
// Firebase 초기화
// =====================================================
try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  fbReady = true;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        name: user.displayName || '사용자',
        email: user.email,
        photo: user.photoURL || '',
        provider: 'google',
      };
      updateUserUI(currentUser);
      await saveUser(currentUser);
      await loadCourses();
      await loadMyEnrollments();
      await loadUserProfile();
      await loadReviews();
    } else {
      const kakaoSession = localStorage.getItem('cls_kakao_user');
      if (kakaoSession) {
        try {
          const parsed = JSON.parse(kakaoSession);
          // 보안: uid 형식 검증 (kakao_ 접두사 + 숫자만 허용)
          if (parsed && parsed.uid && /^kakao_\d+$/.test(parsed.uid) && parsed.provider === 'kakao') {
            currentUser = parsed;
          } else {
            localStorage.removeItem('cls_kakao_user');
            currentUser = null;
          }
        } catch (e) {
          localStorage.removeItem('cls_kakao_user');
          currentUser = null;
        }
        if (currentUser) updateUserUI(currentUser);
        await loadCourses();
        await loadMyEnrollments();
        if (currentUser) await loadUserProfile();
        await loadReviews();
      } else {
        currentUser = null;
        myEnrollments = new Set();
        updateUserUI(null);
        await loadCourses();
        await loadReviews();
      }
    }
  });
} catch (e) {
  console.warn('Firebase 초기화 오류:', e.message);
  renderCourses();
  updateStats();
}

// Kakao 초기화
if (typeof Kakao !== 'undefined' && KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
  try { Kakao.init(KAKAO_JS_KEY); } catch (e) {}
}

// =====================================================
// Firestore 함수
// =====================================================
async function loadCourses() {
  if (!fbReady) { renderCourses(); updateStats(); return; }
  try {
    const q = query(collection(db, 'courses'), orderBy('order'));
    const snap = await getDocs(q);
    allCourses = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.isPublished !== false);
  } catch (e) {
    console.warn('강의 로드 실패:', e);
    allCourses = [];
  }
  buildCategoryTabs();
  renderCourses();
  updateStats();
}

async function saveUser(user) {
  if (!fbReady || !db) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { ...user, createdAt: new Date().toISOString(), isAdmin: false, watchCount: 0, nickname: user.name || '사용자', avatarId: 1 });
    }
  } catch (e) {}
}

async function loadUserProfile() {
  if (!fbReady || !db || !currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      userProfile.nickname = data.nickname || currentUser.name || '사용자';
      userProfile.avatarId = data.avatarId || 1;
      userProfile.isAdmin = data.isAdmin === true;
      updateUserUI(currentUser);
    }
  } catch (e) {
    console.warn('프로필 로드 실패:', e);
  }
}

async function saveUserProfile(nickname, avatarId) {
  if (!fbReady || !db || !currentUser) return false;
  try {
    const ref = doc(db, 'users', currentUser.uid);
    await updateDoc(ref, { nickname, avatarId });
    userProfile.nickname = nickname;
    userProfile.avatarId = avatarId;
    updateUserUI(currentUser);
    return true;
  } catch (e) {
    console.warn('프로필 저장 실패:', e);
    return false;
  }
}

async function addView(courseId) {
  if (!fbReady || !db) return;
  try {
    await updateDoc(doc(db, 'courses', courseId), { viewCount: increment(1) });
  } catch (e) {}
}

// 수강 이력 저장
async function saveWatchHistory(courseId) {
  if (!fbReady || !db || !currentUser) return;
  try {
    const course = allCourses.find(c => c.id === courseId);
    await addDoc(collection(db, 'watchHistory'), {
      userId: currentUser.uid,
      userName: currentUser.name,
      userEmail: currentUser.email || '',
      userPhoto: currentUser.photo || '',
      courseId: courseId,
      courseTitle: course?.title || '',
      category: course?.category || '',
      isPaid: false,
      watchedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('수강이력 저장 실패:', e);
  }
}

// 내 수강 이력 불러오기
async function loadMyHistory() {
  if (!fbReady || !db || !currentUser) return [];
  try {
    const q = query(
      collection(db, 'watchHistory'),
      where('userId', '==', currentUser.uid)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.watchedAt?.toDate ? a.watchedAt.toDate().getTime() : 0;
      const tb = b.watchedAt?.toDate ? b.watchedAt.toDate().getTime() : 0;
      return tb - ta;
    });
    return list;
  } catch (e) {
    console.warn('수강이력 로드 실패:', e);
    return [];
  }
}

// 내 수강신청 목록 불러오기
async function loadMyEnrolledCourses() {
  if (!fbReady || !db || !currentUser) return [];
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('userId', '==', currentUser.uid)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.enrolledAt?.toDate ? a.enrolledAt.toDate().getTime() : 0;
      const tb = b.enrolledAt?.toDate ? b.enrolledAt.toDate().getTime() : 0;
      return tb - ta;
    });
    return list;
  } catch (e) {
    console.warn('수강신청 목록 로드 실패:', e);
    return [];
  }
}

// =====================================================
// 수강신청 시스템
// =====================================================
async function loadMyEnrollments() {
  if (!fbReady || !db || !currentUser) { myEnrollments = new Set(); return; }
  try {
    const q = query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    myEnrollments = new Set(snap.docs.map(d => d.data().courseId));
  } catch (e) {
    myEnrollments = new Set();
  }
}

async function enrollCourse(courseId) {
  if (!fbReady || !db || !currentUser) return false;
  const course = allCourses.find(c => c.id === courseId);
  if (!course) return false;
  if (myEnrollments.has(courseId)) return true;
  try {
    await addDoc(collection(db, 'enrollments'), {
      userId: currentUser.uid,
      userName: currentUser.name,
      userEmail: currentUser.email || '',
      courseId,
      courseTitle: course.title || '',
      category: course.category || '',
      enrolledAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'courses', courseId), { enrollCount: increment(1) });
    myEnrollments.add(courseId);
    course.enrollCount = (course.enrollCount || 0) + 1;
    return true;
  } catch (e) {
    console.warn('수강신청 실패:', e);
    return false;
  }
}

window.handleEnroll = async function (courseId) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const btn = document.querySelector('.cls-btn-enroll-action');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }
  const ok = await enrollCourse(courseId);
  if (ok) {
    showToast('수강신청이 완료되었습니다! 🎉');
    window.openCourse(courseId);
    renderCourses();
  } else {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 수강신청 (무료)'; }
    showToast('수강신청에 실패했습니다. 다시 시도해주세요.');
  }
};

function showToast(msg) {
  let t = document.getElementById('clsToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'clsToast';
    t.className = 'cls-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// 더보기 → 해당 카테고리 탭으로 이동
window.toggleMore = function (catIdx, catName) {
  const tabsEl = document.getElementById('catTabs');
  if (tabsEl) {
    tabsEl.querySelectorAll('.cls-tab').forEach(t => t.classList.remove('active'));
    const target = [...tabsEl.querySelectorAll('.cls-tab')].find(t => t.dataset.cat === catName);
    if (target) target.classList.add('active');
  }
  currentCat = catName;
  renderCourses();
  // 렌더 후 페이지 최상단으로 스크롤
  setTimeout(() => window.scrollTo(0, 0), 50);
};

// =====================================================
// 카테고리 탭 동적 생성
// =====================================================
function buildCategoryTabs() {
  const tabsEl = document.getElementById('catTabs');
  if (!tabsEl) return;

  // 데이터에서 카테고리 추출 (플레이리스트 순서 유지)
  const categories = [];
  const seen = new Set();
  allCourses.forEach(c => {
    if (c.category && !seen.has(c.category)) {
      seen.add(c.category);
      const plIdx = PLAYLISTS.findIndex(p => p.name === c.category);
      categories.push({ name: c.category, order: plIdx >= 0 ? plIdx : 99 });
    }
  });
  categories.sort((a, b) => a.order - b.order);

  tabsEl.innerHTML =
    `<button class="cls-tab ${currentCat === 'all' ? 'active' : ''}" data-cat="all">전체</button>` +
    categories.map(cat =>
      `<button class="cls-tab ${currentCat === cat.name ? 'active' : ''}" data-cat="${cat.name}">${cat.name}</button>`
    ).join('');

  // 클릭 이벤트 연결
  tabsEl.querySelectorAll('.cls-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabsEl.querySelectorAll('.cls-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCat = tab.dataset.cat;
      renderCourses();
    });
  });
}

// =====================================================
// 인증 함수
// =====================================================
window.loginWithGoogle = async function () {
  if (!fbReady) { alert('Firebase 설정 후 이용 가능합니다.'); return; }
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    closeLoginModal();
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') alert('구글 로그인 오류: ' + e.message);
  }
};

window.loginWithKakao = function () {
  if (typeof Kakao === 'undefined' || KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') {
    alert('카카오 앱 키 설정이 필요합니다.');
    return;
  }
  Kakao.Auth.login({
    success: function () {
      Kakao.API.request({
        url: '/v2/user/me',
        success: async function (res) {
          const profile = res.kakao_account?.profile || {};
          const kakaoUser = {
            uid: 'kakao_' + res.id,
            name: profile.nickname || '카카오 사용자',
            email: res.kakao_account?.email || '',
            photo: profile.thumbnail_image_url || '',
            provider: 'kakao',
          };
          localStorage.setItem('cls_kakao_user', JSON.stringify(kakaoUser));
          currentUser = kakaoUser;
          updateUserUI(kakaoUser);
          if (fbReady) await saveUser(kakaoUser);
          closeLoginModal();
        },
        fail: () => alert('카카오 정보를 가져올 수 없습니다.'),
      });
    },
    fail: () => {},
  });
};

window.handleLogout = async function () {
  if (fbReady && auth?.currentUser) await signOut(auth);
  localStorage.removeItem('cls_kakao_user');
  currentUser = null;
  updateUserUI(null);
};

function updateUserUI(user) {
  const loginBtn = document.getElementById('loginBtn');
  const userArea = document.getElementById('userArea');
  const userName = document.getElementById('userName');
  const userPhoto = document.getElementById('userPhoto');
  if (!loginBtn) return;
  if (user) {
    loginBtn.style.display = 'none';
    userArea.style.display = 'flex';
    userName.textContent = userProfile.nickname || user.name;
    userPhoto.src = getAvatarDataUri(userProfile.avatarId);
    userPhoto.style.display = 'block';
  } else {
    loginBtn.style.display = 'inline-flex';
    userArea.style.display = 'none';
  }
}

// =====================================================
// 모달
// =====================================================
window.openLoginModal = function () {
  document.getElementById('loginModal').classList.add('open');
};
window.closeLoginModal = function (e) {
  if (!e || e.target === document.getElementById('loginModal')) {
    document.getElementById('loginModal').classList.remove('open');
  }
};
window.closeCourseModal = function (e) {
  if (!e || e.target === document.getElementById('courseModal')) {
    document.getElementById('courseModal').classList.remove('open');
    document.getElementById('courseFrame').src = '';
  }
};

// 마이페이지
window.openMyPage = async function () {
  if (!currentUser) { openLoginModal(); return; }
  const modal = document.getElementById('myPageModal');
  if (!modal) return;

  // 아바타 설정
  const avatar = document.getElementById('myAvatar');
  if (avatar) avatar.src = getAvatarDataUri(userProfile.avatarId);

  // 이름 & 이메일
  const name = document.getElementById('myName');
  const email = document.getElementById('myEmail');
  if (name) name.textContent = userProfile.nickname || currentUser.name;
  if (email) email.textContent = currentUser.email || currentUser.provider;

  // 닉네임 입력 필드
  const nicknameInput = document.getElementById('nicknameInput');
  if (nicknameInput) nicknameInput.value = userProfile.nickname || currentUser.name || '';

  // 현재 선택된 아바타 ID 세팅
  selectedAvatarId = userProfile.avatarId;

  // 아바타 선택 그리드 렌더링
  const avatarGrid = document.getElementById('avatarGrid');
  if (avatarGrid) {
    avatarGrid.innerHTML = PIXEL_AVATARS.map(a => `
      <div class="cls-avatar-option ${a.id === userProfile.avatarId ? 'selected' : ''}"
           onclick="selectAvatar(${a.id})" data-avatar-id="${a.id}">
        <img src="${getAvatarDataUri(a.id)}" alt="${a.name}">
        <span>${a.name}</span>
      </div>
    `).join('');
  }

  const historyList = document.getElementById('myHistoryList');
  historyList.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>';
  modal.classList.add('open');

  // 수강신청 목록 + 시청 이력 동시 로드
  const [enrollments, watchRecords] = await Promise.all([
    loadMyEnrolledCourses(),
    loadMyHistory()
  ]);

  document.getElementById('myTotalCourses').textContent = enrollments.length;
  document.getElementById('myTotalViews').textContent = watchRecords.length;

  if (!enrollments.length) {
    historyList.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa"><i class="fas fa-book-open" style="font-size:28px;margin-bottom:8px"></i><br>아직 수강신청한 강의가 없어요<br><small>강의를 수강신청하면 여기에 기록됩니다</small></div>';
  } else {
    historyList.innerHTML = enrollments.map(r => {
      const ts = r.enrolledAt?.toDate ? r.enrolledAt.toDate() : new Date();
      const dateStr = `${ts.getFullYear()}.${String(ts.getMonth()+1).padStart(2,'0')}.${String(ts.getDate()).padStart(2,'0')}`;
      const course = allCourses.find(c => c.id === r.courseId);
      const videoId = course?.videoId || '';
      const safeCourseId = escapeHtml(r.courseId);
      return `
        <div class="my-history-item" onclick="closeMypageAndOpen('${safeCourseId}')">
          <img src="https://img.youtube.com/vi/${escapeHtml(videoId)}/mqdefault.jpg"
            onerror="this.src='images/logo.png';this.style.objectFit='contain';this.style.padding='8px'"
            class="my-history-thumb" alt="">
          <div class="my-history-info">
            <div class="my-history-title">${escapeHtml(r.courseTitle || '(삭제된 강의)')}</div>
            <div class="my-history-meta">
              <span>${escapeHtml(r.category || '')}</span>
              <span>${dateStr} 수강신청</span>
            </div>
          </div>
          <div class="my-history-play"><i class="fas fa-play-circle"></i></div>
        </div>`;
    }).join('');
  }
};

window.closeMyPage = function (e) {
  if (!e || e.target === document.getElementById('myPageModal')) {
    document.getElementById('myPageModal').classList.remove('open');
  }
};

window.closeMypageAndOpen = function (courseId) {
  document.getElementById('myPageModal').classList.remove('open');
  setTimeout(() => window.openCourse(courseId), 200);
};

window.selectAvatar = function (id) {
  selectedAvatarId = id;
  document.querySelectorAll('.cls-avatar-option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.avatarId) === id);
  });
};

window.saveProfile = async function () {
  const nicknameInput = document.getElementById('nicknameInput');
  let nickname = nicknameInput?.value?.trim();
  if (!nickname) { showToast('닉네임을 입력해주세요'); return; }
  if (nickname.length > 12) { showToast('닉네임은 12자 이내로 입력해주세요'); return; }
  // 보안: 특수문자 제거 (HTML/스크립트 인젝션 방지)
  nickname = nickname.replace(/[<>"'&]/g, '');

  const btn = document.getElementById('profileSaveBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  const ok = await saveUserProfile(nickname, selectedAvatarId);

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 저장'; }

  if (ok) {
    showToast('프로필이 저장되었습니다! ✨');
    const myName = document.getElementById('myName');
    const myAvatar = document.getElementById('myAvatar');
    if (myName) myName.textContent = nickname;
    if (myAvatar) myAvatar.src = getAvatarDataUri(selectedAvatarId);
  } else {
    showToast('저장에 실패했습니다. 다시 시도해주세요.');
  }
};

// =====================================================
// 강의 렌더링
// =====================================================
function thumb(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function fmtViews(n) {
  if (n >= 10000) return Math.floor(n / 1000) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function getCourses() {
  let list = allCourses.filter(c => c.isPublished !== false);
  if (currentCat !== 'all') list = list.filter(c => c.category === currentCat);
  if (currentSort === 'popular') list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  else if (currentSort === 'latest') list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  else list.sort((a, b) => (a.order || 99) - (b.order || 99));
  return list;
}

function courseCardHtml(c) {
  const safeId = escapeHtml(c.id);
  const safeTitle = escapeHtml(c.title);
  const safeCat = escapeHtml(c.category || '');
  const safeSrc = sanitizeUrl(c.thumbnail || thumb(c.videoId));
  return `
    <div class="cls-course-card" onclick="openCourse('${safeId}')">
      <div class="cls-card-thumb">
        <img
          src="${safeSrc}"
          alt="${safeTitle}"
          loading="lazy"
          onerror="this.src='images/logo.png';this.style.objectFit='contain';this.style.padding='24px';this.style.background='#f3f4f6'">
        <div class="cls-card-play"><i class="fas fa-play-circle"></i></div>
        <div class="cls-card-badges">
          <span class="cls-badge-free">무료</span>
        </div>
      </div>
      <div class="cls-card-body">
        <div class="cls-card-cat">${safeCat}</div>
        <div class="cls-card-title">${safeTitle}</div>
        <div class="cls-card-meta">
          <span class="cls-card-views"><i class="fas fa-users"></i> ${(c.enrollCount || 0).toLocaleString()}명 수강</span>
          <span class="cls-card-period"><i class="fas fa-infinity"></i> 무제한</span>
        </div>
      </div>
    </div>`;
}

function sortList(list) {
  if (currentSort === 'popular') list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  else if (currentSort === 'latest') list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  else list.sort((a, b) => (a.order || 99) - (b.order || 99));
  return list;
}

function renderCourses() {
  const grid = document.getElementById('courseGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  const pub = allCourses.filter(c => c.isPublished !== false);

  if (!pub.length) {
    grid.className = 'cls-course-grid';
    grid.innerHTML = '';
    empty.innerHTML = `
      <i class="fas fa-video"></i>
      <p>강의가 준비 중입니다</p>
      <p style="font-size:0.82rem;margin-top:8px;color:var(--gray-400)">곧 멋진 강의들이 업로드될 예정이에요!</p>
    `;
    empty.style.display = 'block';
    return;
  }

  if (currentCat === 'all') {
    // === 전체 보기: 카테고리별 섹션으로 분리 ===
    grid.className = 'cls-course-sections';
    empty.style.display = 'none';

    const categories = [];
    const seen = new Set();
    pub.forEach(c => {
      if (c.category && !seen.has(c.category)) {
        seen.add(c.category);
        const plIdx = PLAYLISTS.findIndex(p => p.name === c.category);
        categories.push({ name: c.category, order: plIdx >= 0 ? plIdx : 99 });
      }
    });
    categories.sort((a, b) => a.order - b.order);

    const PREVIEW_COUNT = 8;

    grid.innerHTML = categories.map((cat, catIdx) => {
      let list = pub.filter(c => c.category === cat.name);
      sortList(list);
      if (!list.length) return '';
      const hasMore = list.length > PREVIEW_COUNT;
      const preview = list.slice(0, PREVIEW_COUNT);
      const rest = list.slice(PREVIEW_COUNT);
      return `
        <div class="cls-category-section">
          <div class="cls-category-header">
            <h2 class="cls-category-title">${cat.name}</h2>
            <span class="cls-category-count">${list.length}개 강의</span>
          </div>
          <div class="cls-course-grid">
            ${preview.map(c => courseCardHtml(c)).join('')}
          </div>
          ${hasMore ? `
            <div class="cls-more-btn-wrap">
              <button class="cls-more-btn" onclick="toggleMore(${catIdx}, '${cat.name}')">
                <span>더보기</span> <span class="cls-more-count">+${rest.length}개</span> <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          ` : ''}
        </div>`;
    }).join('');

  } else {
    // === 단일 카테고리 보기 ===
    grid.className = 'cls-course-grid';
    let list = pub.filter(c => c.category === currentCat);
    sortList(list);

    if (!list.length) {
      grid.innerHTML = '';
      empty.innerHTML = `
        <i class="fas fa-search"></i>
        <p>해당 카테고리에 강의가 없습니다</p>
      `;
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = list.map(c => courseCardHtml(c)).join('');
  }
}

function updateStats() {
  const pub = allCourses.filter(c => c.isPublished !== false);
  const el = id => document.getElementById(id);
  if (el('totalCourseCount')) el('totalCourseCount').textContent = pub.length;
  if (el('freeCourseCount')) el('freeCourseCount').textContent = pub.length;
  if (el('totalViewsCount')) el('totalViewsCount').textContent = fmtViews(pub.reduce((s, c) => s + (c.viewCount || 0), 0));
}

// =====================================================
// 강의 상세 모달
// =====================================================
window.openCourse = function (courseId) {
  const c = allCourses.find(x => x.id === courseId);
  if (!c) return;

  const isEnrolled = currentUser && myEnrollments.has(courseId);
  const videoWrap = document.getElementById('courseVideoWrap');
  const enrollPreview = document.getElementById('courseEnrollPreview');
  const frame = document.getElementById('courseFrame');

  // 배지
  document.getElementById('courseDetailBadges').innerHTML = `
    <span class="cls-course-badge free">무료</span>
    <span class="cls-course-badge cat">${escapeHtml(c.category || '')}</span>
    <span class="cls-course-badge period"><i class="fas fa-infinity"></i> 무제한</span>
  `;

  document.getElementById('courseDetailTitle').textContent = c.title;
  document.getElementById('courseDetailDesc').textContent = c.desc || '';
  document.getElementById('courseDetailMeta').innerHTML = `
    <span><i class="fas fa-users"></i> 수강생 ${(c.enrollCount || 0).toLocaleString()}명</span>
    <span><i class="fas fa-folder"></i> ${escapeHtml(c.category || '')}</span>
    <span><i class="fas fa-clock"></i> 수강기간 무제한</span>
  `;

  if (isEnrolled) {
    // === 수강 중: 영상 재생 ===
    videoWrap.style.display = 'block';
    enrollPreview.style.display = 'none';
    frame.src = `https://www.youtube-nocookie.com/embed/${c.videoId}?autoplay=1&rel=0&modestbranding=1`;

    c.viewCount = (c.viewCount || 0) + 1;
    addView(courseId);
    saveWatchHistory(courseId);

    document.getElementById('courseDetailCta').innerHTML = `
      <button class="cls-btn-enroll free-btn">
        <i class="fas fa-play"></i> 수강 중
      </button>
      <a href="https://www.youtube.com/watch?v=${c.videoId}" target="_blank" class="cls-contact-link">
        YouTube에서 보기 <i class="fas fa-external-link-alt"></i>
      </a>
    `;
  } else {
    // === 미수강: 수강신청 필요 ===
    videoWrap.style.display = 'none';
    enrollPreview.style.display = 'block';
    frame.src = '';
    document.getElementById('enrollThumb').src = c.thumbnail || `https://img.youtube.com/vi/${c.videoId}/hqdefault.jpg`;

    document.getElementById('courseDetailCta').innerHTML = `
      <button class="cls-btn-enroll cls-btn-enroll-action paid-btn" onclick="handleEnroll('${escapeHtml(courseId)}')">
        <i class="fas fa-check"></i> 수강신청 (무료)
      </button>
    `;
  }

  document.getElementById('courseModal').classList.add('open');
};

// =====================================================
// 후기 Firestore 함수
// =====================================================
async function loadReviews() {
  if (!fbReady || !db) { renderReviews(); return; }
  try {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.warn('후기 로드 실패:', e); allReviews = []; }
  renderReviews();
}

async function addReview(data) {
  if (!fbReady || !db || !currentUser) return null;
  try {
    const docRef = await addDoc(collection(db, 'reviews'), {
      ...data,
      authorId: currentUser.uid,
      authorName: userProfile.nickname || currentUser.name,
      authorAvatarId: userProfile.avatarId || 1,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) { console.warn('후기 저장 실패:', e); return null; }
}

async function deleteReview(reviewId) {
  if (!fbReady || !db || !currentUser) return false;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    allReviews = allReviews.filter(r => r.id !== reviewId);
    return true;
  } catch (e) { console.warn('후기 삭제 실패:', e); return false; }
}

function formatReviewDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date(), diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return Math.floor(diff/60000) + '분 전';
  if (diff < 86400000) return Math.floor(diff/3600000) + '시간 전';
  if (diff < 604800000) return Math.floor(diff/86400000) + '일 전';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// =====================================================
// 후기 모달
// =====================================================
window.openReviewModal = function () {
  if (!currentUser) { openLoginModal(); return; }
  reviewStars = 5;
  document.getElementById('reviewText').value = '';
  document.getElementById('rvCharCount').textContent = '0';
  updateStarUI();
  // 강의 목록 채우기
  const sel = document.getElementById('reviewCourse');
  sel.innerHTML = '<option value="">선택하세요</option>' +
    PLAYLISTS.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('') +
    '<option value="__custom__">직접입력</option>';
  const customInput = document.getElementById('reviewCourseCustom');
  if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
  document.getElementById('reviewModal').classList.add('open');
};

window.closeReviewModal = function (e) {
  if (!e || e.target === document.getElementById('reviewModal'))
    document.getElementById('reviewModal').classList.remove('open');
};

function updateStarUI() {
  document.querySelectorAll('.cls-star-btn').forEach(btn => {
    const s = parseInt(btn.dataset.star);
    btn.classList.toggle('active', s <= reviewStars);
  });
}

window.submitReview = async function () {
  if (!currentUser) { openLoginModal(); return; }
  const text = document.getElementById('reviewText').value.trim();
  const courseSelect = document.getElementById('reviewCourse').value;
  const course = courseSelect === '__custom__'
    ? (document.getElementById('reviewCourseCustom').value.trim() || '')
    : courseSelect;
  if (!text) { showToast('후기 내용을 입력해주세요'); return; }
  if (text.length > 500) { showToast('후기는 500자 이내로 입력해주세요'); return; }

  const btn = document.getElementById('reviewSubmitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 등록 중...'; }

  const id = await addReview({ text, course, stars: reviewStars });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 후기 등록'; }
  if (id) {
    closeReviewModal();
    await loadReviews();
    showToast('후기가 등록되었습니다!');
  } else {
    showToast('후기 등록에 실패했습니다. 구글 로그인 후 다시 시도해주세요.');
  }
};

window.handleDeleteReview = async function (reviewId) {
  if (!confirm('이 후기를 삭제하시겠습니까?')) return;
  const ok = await deleteReview(reviewId);
  if (ok) { renderReviews(); showToast('후기가 삭제되었습니다.'); }
  else { showToast('삭제에 실패했습니다.'); }
};

// =====================================================
// 후기 렌더링
// =====================================================
function renderReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  // Firestore 후기 (상단)
  const userReviewsHtml = allReviews.map(r => {
    const isAuthor = currentUser && currentUser.uid === r.authorId;
    const isAdminUser = currentUser && userProfile && userProfile.isAdmin === true;
    const canDelete = isAuthor || isAdminUser;
    return `
    <div class="cls-review-card cls-review-user">
      <p class="cls-review-text">"${escapeHtml(r.text)}"</p>
      <div class="cls-review-footer">
        <div class="cls-review-author-area">
          <img class="cls-review-avatar" src="${getAvatarDataUri(r.authorAvatarId||1)}" alt="">
          <div>
            <div class="cls-review-stars">${'★'.repeat(r.stars||5)}${'☆'.repeat(5-(r.stars||5))}</div>
            <div class="cls-review-name">${escapeHtml(r.authorName||'수강생')}</div>
            ${r.course ? `<div class="cls-review-course">${escapeHtml(r.course)}</div>` : ''}
          </div>
        </div>
        <div class="cls-review-right">
          <span class="cls-review-date">${formatReviewDate(r.createdAt)}</span>
          ${canDelete ? `<button class="cls-review-del-btn" onclick="handleDeleteReview('${r.id}')"><i class="fas fa-trash-alt"></i></button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  // 기존 샘플 후기 (하단)
  const sampleHtml = SAMPLE_REVIEWS.map(r => `
    <div class="cls-review-card">
      <p class="cls-review-text">"${r.text}"</p>
      <div class="cls-review-footer">
        <div>
          <div class="cls-review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
          <div class="cls-review-name">${r.name}</div>
          <div class="cls-review-course">${r.course}</div>
        </div>
        <span class="cls-review-badge">수강완료</span>
      </div>
    </div>
  `).join('');

  grid.innerHTML = userReviewsHtml + sampleHtml;
}

// =====================================================
// DOM 초기화
// =====================================================
document.addEventListener('DOMContentLoaded', () => {

  // 정렬
  const sortEl = document.getElementById('sortSelect');
  if (sortEl) sortEl.addEventListener('change', e => { currentSort = e.target.value; renderCourses(); });

  // FAQ 아코디언
  document.querySelectorAll('.cls-faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.classList.contains('open');
      document.querySelectorAll('.cls-faq-q').forEach(b => {
        b.classList.remove('open');
        b.nextElementSibling?.classList.remove('open');
      });
      if (!isOpen) {
        btn.classList.add('open');
        btn.nextElementSibling?.classList.add('open');
      }
    });
  });

  // 모바일 네비
  window.toggleMobileNav = function () {
    document.getElementById('clsNav').classList.toggle('open');
  };

  // 헤더 스크롤 효과
  window.addEventListener('scroll', () => {
    const header = document.getElementById('clsHeader');
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
  });

  renderReviews();

  // 별점 클릭 이벤트
  document.querySelectorAll('.cls-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      reviewStars = parseInt(btn.dataset.star);
      updateStarUI();
    });
  });

  // 수강 강의 직접입력 토글
  const rvCourseSelect = document.getElementById('reviewCourse');
  const rvCustomInput = document.getElementById('reviewCourseCustom');
  if (rvCourseSelect && rvCustomInput) {
    rvCourseSelect.addEventListener('change', () => {
      rvCustomInput.style.display = rvCourseSelect.value === '__custom__' ? 'block' : 'none';
      if (rvCourseSelect.value === '__custom__') rvCustomInput.focus();
    });
  }

  // 후기 글자수 카운터
  const rvTextEl = document.getElementById('reviewText');
  const rvCount = document.getElementById('rvCharCount');
  if (rvTextEl && rvCount) rvTextEl.addEventListener('input', () => { rvCount.textContent = rvTextEl.value.length; });

  // Firebase 미설정 시
  if (!fbReady) {
    renderCourses();
    updateStats();
  }

  // =====================================================
  // 히어로 캔버스 — 뉴럴 네트워크 파티클 애니메이션
  // =====================================================
  const hCanvas = document.getElementById('clsHeroCanvas');
  if (hCanvas) {
    const hCtx = hCanvas.getContext('2d');
    let hNodes = [];
    let hMouse = { x: 0, y: 0 };
    let hWaves = [];

    function hResize() {
      const hero = document.getElementById('clsHero');
      hCanvas.width = hero.offsetWidth;
      hCanvas.height = hero.offsetHeight;
      hMouse.x = hCanvas.width / 2;
      hMouse.y = hCanvas.height / 2;
    }

    function hCreateNodes() {
      hNodes = [];
      const count = Math.min(Math.floor(hCanvas.width * hCanvas.height / 8000), 140);
      for (let i = 0; i < count; i++) {
        const isStar = Math.random() < 0.12;
        hNodes.push({
          x: Math.random() * hCanvas.width,
          y: Math.random() * hCanvas.height,
          size: isStar ? Math.random() * 3 + 2.5 : Math.random() * 2 + 0.5,
          sx: (Math.random() - 0.5) * 0.5,
          sy: (Math.random() - 0.5) * 0.5,
          op: isStar ? Math.random() * 0.5 + 0.4 : Math.random() * 0.5 + 0.15,
          ps: Math.random() * 0.02 + 0.008,
          po: Math.random() * Math.PI * 2,
          isStar,
          hue: isStar ? (Math.random() < 0.5 ? 270 : 300) : 265,
        });
      }
    }

    setInterval(() => {
      hWaves.push({ x: hCanvas.width / 2, y: hCanvas.height / 2, r: 0, max: Math.max(hCanvas.width, hCanvas.height) * 0.6, op: 0.15 });
    }, 4000);

    function hDraw() {
      hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
      const t = Date.now() * 0.001;

      // Pulse waves
      hWaves.forEach((w, i) => {
        w.r += 1.5; w.op *= 0.995;
        if (w.op < 0.005) { hWaves.splice(i, 1); return; }
        hCtx.beginPath(); hCtx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        hCtx.strokeStyle = `rgba(139,92,246,${w.op})`; hCtx.lineWidth = 1; hCtx.stroke();
      });

      // Connections
      for (let i = 0; i < hNodes.length; i++) {
        for (let j = i + 1; j < hNodes.length; j++) {
          const dx = hNodes[i].x - hNodes[j].x, dy = hNodes[i].y - hNodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 160) {
            const a = 0.1 * (1 - d / 160);
            hCtx.beginPath(); hCtx.moveTo(hNodes[i].x, hNodes[i].y); hCtx.lineTo(hNodes[j].x, hNodes[j].y);
            if (hNodes[i].isStar || hNodes[j].isStar) {
              hCtx.strokeStyle = `rgba(167,139,250,${a * 1.5})`; hCtx.lineWidth = 0.8;
            } else {
              hCtx.strokeStyle = `rgba(139,92,246,${a})`; hCtx.lineWidth = 0.5;
            }
            hCtx.stroke();
          }
        }
      }

      // Mouse connections
      hNodes.forEach(n => {
        const dx = hMouse.x - n.x, dy = hMouse.y - n.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 280) {
          const a = 0.18 * (1 - d / 280);
          hCtx.beginPath(); hCtx.moveTo(n.x, n.y); hCtx.lineTo(hMouse.x, hMouse.y);
          hCtx.strokeStyle = `rgba(217,70,239,${a})`; hCtx.lineWidth = 0.8; hCtx.stroke();
        }
      });

      // Draw nodes
      hNodes.forEach(n => {
        const pulse = Math.sin(t * n.ps * 60 + n.po) * 0.5 + 0.5;
        const dx = hMouse.x - n.x, dy = hMouse.y - n.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180) { const f = (180 - d) / 180 * 0.25; n.x -= dx * f * 0.015; n.y -= dy * f * 0.015; }
        n.x += n.sx; n.y += n.sy;
        if (n.x < 0 || n.x > hCanvas.width) n.sx *= -1;
        if (n.y < 0 || n.y > hCanvas.height) n.sy *= -1;
        n.x = Math.max(0, Math.min(hCanvas.width, n.x));
        n.y = Math.max(0, Math.min(hCanvas.height, n.y));
        const cs = n.size * (0.8 + pulse * 0.4);

        if (n.isStar) {
          const gr = cs * 6;
          const g = hCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gr);
          const c = n.hue === 270 ? '139,92,246' : '217,70,239';
          g.addColorStop(0, `rgba(${c},${0.12 * pulse})`);
          g.addColorStop(0.5, `rgba(${c},${0.04 * pulse})`);
          g.addColorStop(1, 'transparent');
          hCtx.beginPath(); hCtx.arc(n.x, n.y, gr, 0, Math.PI * 2); hCtx.fillStyle = g; hCtx.fill();
          hCtx.beginPath(); hCtx.arc(n.x, n.y, cs, 0, Math.PI * 2);
          hCtx.fillStyle = `rgba(255,255,255,${n.op * (0.7 + pulse * 0.3)})`; hCtx.fill();
          hCtx.beginPath(); hCtx.arc(n.x, n.y, cs * 1.5, 0, Math.PI * 2);
          hCtx.strokeStyle = `rgba(${n.hue === 270 ? '167,139,250' : '217,70,239'},${0.3 * pulse})`;
          hCtx.lineWidth = 0.5; hCtx.stroke();
        } else {
          hCtx.beginPath(); hCtx.arc(n.x, n.y, cs, 0, Math.PI * 2);
          hCtx.fillStyle = `rgba(167,139,250,${n.op * (0.5 + pulse * 0.5)})`; hCtx.fill();
        }
      });

      requestAnimationFrame(hDraw);
    }

    hResize(); hCreateNodes(); hDraw();
    window.addEventListener('resize', () => { hResize(); hCreateNodes(); });

    const heroEl = document.getElementById('clsHero');
    const heroGlow = document.getElementById('clsHeroMouseGlow');
    heroEl.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      hMouse.x = e.clientX - r.left; hMouse.y = e.clientY - r.top;
      heroGlow.style.left = hMouse.x + 'px'; heroGlow.style.top = hMouse.y + 'px';
    });
    heroEl.addEventListener('mouseleave', () => {
      hMouse.x = hCanvas.width / 2; hMouse.y = hCanvas.height / 2;
      heroGlow.style.left = '50%'; heroGlow.style.top = '50%';
    });
  }
});
