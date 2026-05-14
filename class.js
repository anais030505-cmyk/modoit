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
// 앱 상태
// =====================================================
let currentUser = null;
let allCourses = [];
let currentCat = 'all';
let currentSort = 'order';
let fbReady = false;
let auth, db;
let myEnrollments = new Set();

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
    } else {
      const kakaoSession = localStorage.getItem('cls_kakao_user');
      if (kakaoSession) {
        currentUser = JSON.parse(kakaoSession);
        updateUserUI(currentUser);
        await loadCourses();
        await loadMyEnrollments();
      } else {
        currentUser = null;
        myEnrollments = new Set();
        updateUserUI(null);
        await loadCourses();
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
      await setDoc(ref, { ...user, createdAt: new Date().toISOString(), isAdmin: false, watchCount: 0 });
    }
  } catch (e) {}
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

// 더보기 토글
window.toggleMore = function (catIdx, catName) {
  const moreWrap = document.getElementById('moreWrap_' + catIdx);
  const btnWrap = document.getElementById('moreBtnWrap_' + catIdx);
  if (!moreWrap) return;

  if (moreWrap.style.display === 'none') {
    moreWrap.style.display = 'block';
    btnWrap.querySelector('.cls-more-btn').innerHTML =
      '<span>접기</span> <i class="fas fa-chevron-up"></i>';
  } else {
    moreWrap.style.display = 'none';
    const count = moreWrap.querySelectorAll('.cls-course-card').length;
    btnWrap.querySelector('.cls-more-btn').innerHTML =
      `<span>더보기</span> <span class="cls-more-count">+${count}개</span> <i class="fas fa-chevron-down"></i>`;
  }
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
    userName.textContent = user.name;
    if (user.photo) { userPhoto.src = user.photo; userPhoto.style.display = 'block'; }
    else userPhoto.style.display = 'none';
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

  const photo = document.getElementById('myPhoto');
  const name = document.getElementById('myName');
  const email = document.getElementById('myEmail');
  if (photo) { photo.src = currentUser.photo || ''; photo.style.display = currentUser.photo ? 'block' : 'none'; }
  if (name) name.textContent = currentUser.name;
  if (email) email.textContent = currentUser.email || currentUser.provider;

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
      return `
        <div class="my-history-item" onclick="closeMypageAndOpen('${r.courseId}')">
          <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
            onerror="this.src='images/logo.png';this.style.objectFit='contain';this.style.padding='8px'"
            class="my-history-thumb" alt="">
          <div class="my-history-info">
            <div class="my-history-title">${r.courseTitle || '(삭제된 강의)'}</div>
            <div class="my-history-meta">
              <span>${r.category || ''}</span>
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
  return `
    <div class="cls-course-card" onclick="openCourse('${c.id}')">
      <div class="cls-card-thumb">
        <img
          src="${c.thumbnail || thumb(c.videoId)}"
          alt="${c.title}"
          loading="lazy"
          onerror="this.src='images/logo.png';this.style.objectFit='contain';this.style.padding='24px';this.style.background='#f3f4f6'">
        <div class="cls-card-play"><i class="fas fa-play-circle"></i></div>
        <div class="cls-card-badges">
          <span class="cls-badge-free">무료</span>
        </div>
      </div>
      <div class="cls-card-body">
        <div class="cls-card-cat">${c.category || ''}</div>
        <div class="cls-card-title">${c.title}</div>
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
            <div class="cls-more-wrap" id="moreWrap_${catIdx}" style="display:none">
              <div class="cls-course-grid">
                ${rest.map(c => courseCardHtml(c)).join('')}
              </div>
            </div>
            <div class="cls-more-btn-wrap" id="moreBtnWrap_${catIdx}">
              <button class="cls-more-btn" onclick="toggleMore(${catIdx}, '${cat.name}')">
                <span>더보기</span> <span class="cls-more-count">+${rest.length}개</span> <i class="fas fa-chevron-down"></i>
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
    <span class="cls-course-badge cat">${c.category || ''}</span>
    <span class="cls-course-badge period"><i class="fas fa-infinity"></i> 무제한</span>
  `;

  document.getElementById('courseDetailTitle').textContent = c.title;
  document.getElementById('courseDetailDesc').textContent = c.desc || '';
  document.getElementById('courseDetailMeta').innerHTML = `
    <span><i class="fas fa-users"></i> 수강생 ${(c.enrollCount || 0).toLocaleString()}명</span>
    <span><i class="fas fa-folder"></i> ${c.category || ''}</span>
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
      <button class="cls-btn-enroll cls-btn-enroll-action paid-btn" onclick="handleEnroll('${courseId}')">
        <i class="fas fa-check"></i> 수강신청 (무료)
      </button>
    `;
  }

  document.getElementById('courseModal').classList.add('open');
};

// =====================================================
// 후기 렌더링
// =====================================================
function renderReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = SAMPLE_REVIEWS.map(r => `
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

  // Firebase 미설정 시
  if (!fbReady) {
    renderCourses();
    updateStats();
  }
});
