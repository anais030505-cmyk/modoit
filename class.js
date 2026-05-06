// =====================================================
// 모두잇 클래스 - 메인 스크립트
// Firebase v10 (ES Module)
// =====================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, getDocs, doc,
  setDoc, getDoc, updateDoc, increment, orderBy, query
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// =====================================================
// ⚙️  FIREBASE 설정
// console.firebase.google.com에서 프로젝트 생성 후
// 아래 값을 교체하세요 (Authentication + Firestore 활성화 필요)
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

// =====================================================
// ⚙️  카카오 앱 키
// developers.kakao.com → 내 애플리케이션 → JavaScript 키
// =====================================================
const KAKAO_JS_KEY = 'b59c8052d94c133575b1f736da7a196d';

// =====================================================
// 📚  샘플 강의 데이터
// Firebase 설정 전 미리보기용 / 이후 Firestore에서 관리
// videoId: 유튜브 영상 URL의 v= 뒤 값으로 교체
// =====================================================
const SAMPLE_COURSES = [
  {
    id: 'c1',
    title: 'ChatGPT로 업무 효율 200% 올리기',
    desc: '생성형 AI ChatGPT를 활용해 보고서 작성, 이메일 자동화, 데이터 분석까지 실무에 바로 적용하는 방법을 배웁니다.',
    videoId: 'UCv9JR_80V09Jq5_0odEHr_A', // ← 실제 영상 ID로 교체
    category: 'AI비즈니스활용',
    isPaid: false,
    price: 0,
    level: '입문',
    duration: '45분',
    viewCount: 1243,
    order: 1,
    isPublished: true,
  },
  {
    id: 'c2',
    title: 'Gemini로 프레젠테이션 10분 만에 완성',
    desc: '구글 Gemini AI로 기획부터 디자인까지 10분 만에 전문적인 프레젠테이션을 완성하는 실전 강의입니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: 'AI비즈니스활용',
    isPaid: false,
    price: 0,
    level: '초급',
    duration: '40분',
    viewCount: 634,
    order: 2,
    isPublished: true,
  },
  {
    id: 'c3',
    title: '클로바노트 & AI 회의록 자동화',
    desc: '네이버 클로바노트와 ChatGPT를 연동해 회의 내용을 자동으로 정리하고 액션 아이템까지 추출하는 방법을 배웁니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: 'AI비즈니스활용',
    isPaid: false,
    price: 0,
    level: '초급',
    duration: '35분',
    viewCount: 523,
    order: 3,
    isPublished: true,
  },
  {
    id: 'c4',
    title: 'ChatGPT × 미리캔버스 콘텐츠 자동화',
    desc: 'ChatGPT로 기획하고 미리캔버스로 디자인하는 콘텐츠 자동화 워크플로우를 구축합니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: 'AI비즈니스활용',
    isPaid: true,
    price: 49000,
    level: '중급',
    duration: '1시간 20분',
    viewCount: 412,
    order: 4,
    isPublished: true,
  },
  {
    id: 'c5',
    title: '미리캔버스로 SNS 콘텐츠 디자인하기',
    desc: '디자인 전문 지식 없이도 미리캔버스로 인스타그램, 유튜브 썸네일, 카드뉴스를 전문가처럼 만드는 방법을 익힙니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: '미리캔버스',
    isPaid: false,
    price: 0,
    level: '입문',
    duration: '38분',
    viewCount: 987,
    order: 5,
    isPublished: true,
  },
  {
    id: 'c6',
    title: '미리캔버스 지도자 과정 - 강사 양성',
    desc: '미리캔버스 공인 강사로 활동하기 위한 전문 지도자 과정입니다. 커리큘럼 설계, 강의 운영 노하우까지 포함합니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: '미리캔버스',
    isPaid: true,
    price: 120000,
    level: '중급',
    duration: '3시간',
    viewCount: 287,
    order: 6,
    isPublished: true,
  },
  {
    id: 'c7',
    title: 'AI 스마트폰으로 숏폼 영상 만들기',
    desc: '스마트폰 하나로 릴스, 유튜브 쇼츠, 틱톡 영상을 AI 편집 도구와 함께 빠르게 제작하는 노하우를 공개합니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: 'AI스마트폰활용',
    isPaid: false,
    price: 0,
    level: '초급',
    duration: '52분',
    viewCount: 756,
    order: 7,
    isPublished: true,
  },
  {
    id: 'c8',
    title: '시니어를 위한 스마트폰 AI 활용 완전정복',
    desc: '스마트폰에서 AI 도구를 활용해 일상을 더 편리하게 만드는 방법을 쉽고 친절하게 알려드립니다.',
    videoId: 'YOUTUBE_VIDEO_ID',
    category: 'AI스마트폰활용',
    isPaid: false,
    price: 0,
    level: '입문',
    duration: '60분',
    viewCount: 891,
    order: 8,
    isPublished: true,
  },
];

const SAMPLE_REVIEWS = [
  {
    text: '강사님 설명이 너무 쉽고 친절해서 AI 도구를 처음 접하는 저도 따라갈 수 있었어요. 실무에 바로 적용했더니 업무 시간이 확 줄었습니다!',
    name: 'ㅇ**님',
    course: 'ChatGPT로 업무 효율 200% 올리기',
    stars: 5,
  },
  {
    text: '미리캔버스 강의는 정말 최고예요. 디자인 전공도 아닌데 이제 혼자 SNS 콘텐츠 만들 수 있게 됐어요. 강의 내용이 정말 실용적이에요.',
    name: 'k**님',
    course: '미리캔버스로 SNS 콘텐츠 디자인하기',
    stars: 5,
  },
  {
    text: '60대인데도 선생님이 하나하나 친절하게 알려주셔서 따라가기 좋았습니다. 이제 혼자서도 스마트폰으로 영상을 편집할 수 있어요!',
    name: '박**님',
    course: '시니어를 위한 스마트폰 AI 활용 완전정복',
    stars: 5,
  },
];

// =====================================================
// 앱 상태
// =====================================================
let currentUser = null;
let allCourses = [...SAMPLE_COURSES];
let currentCat = 'all';
let currentSort = 'order';
let fbReady = false;
let auth, db;

// =====================================================
// Firebase 초기화
// =====================================================
try {
  if (firebaseConfig.apiKey !== 'YOUR_API_KEY') {
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
      } else {
        const kakaoSession = localStorage.getItem('cls_kakao_user');
        if (kakaoSession) {
          currentUser = JSON.parse(kakaoSession);
          updateUserUI(currentUser);
          await loadCourses();
        } else {
          currentUser = null;
          updateUserUI(null);
          renderCourses();
        }
      }
    });
  } else {
    console.info('ℹ️ Firebase 미설정 - 샘플 데이터로 실행 중');
    renderCourses();
    updateStats();
  }
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
    if (!snap.empty) {
      allCourses = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.isPublished !== false);
    }
  } catch (e) {
    console.warn('강의 로드 실패, 샘플 데이터 사용');
  }
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
    alert('카카오 앱 키 설정이 필요합니다.\nclass.js 상단의 KAKAO_JS_KEY를 입력해주세요.');
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
  // 카테고리
  if (currentCat !== 'all') list = list.filter(c => c.category === currentCat);
  // URL 필터
  const p = new URLSearchParams(window.location.search).get('filter');
  if (p === 'free') list = list.filter(c => !c.isPaid);
  if (p === 'paid') list = list.filter(c => c.isPaid);
  // 정렬
  if (currentSort === 'popular') list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  else if (currentSort === 'latest') list.sort((a, b) => (b.order || 0) - (a.order || 0));
  else if (currentSort === 'free') list.sort((a, b) => Number(a.isPaid) - Number(b.isPaid));
  else list.sort((a, b) => (a.order || 99) - (b.order || 99));
  return list;
}

function renderCourses() {
  const grid = document.getElementById('courseGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  const list = getCourses();
  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = list.map(c => `
    <div class="cls-course-card" onclick="openCourse('${c.id}')">
      <div class="cls-card-thumb">
        <img
          src="${thumb(c.videoId)}"
          alt="${c.title}"
          loading="lazy"
          onerror="this.src='images/logo.png';this.style.objectFit='contain';this.style.padding='24px';this.style.background='#f3f4f6'">
        <div class="cls-card-play"><i class="fas fa-play-circle"></i></div>
        <div class="cls-card-badges">
          ${c.isPaid
            ? '<span class="cls-badge-paid">유료</span>'
            : '<span class="cls-badge-free">무료</span>'}
          <span class="cls-badge-level">${c.level || '입문'}</span>
        </div>
      </div>
      <div class="cls-card-body">
        <div class="cls-card-cat">${c.category}</div>
        <div class="cls-card-title">${c.title}</div>
        <div class="cls-card-meta">
          <span class="cls-card-views"><i class="fas fa-eye"></i>${fmtViews(c.viewCount || 0)}회</span>
          ${c.isPaid
            ? `<span class="cls-card-price">${c.price.toLocaleString()}원</span>`
            : `<span class="cls-card-price is-free">무료</span>`}
        </div>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const pub = allCourses.filter(c => c.isPublished !== false);
  const el = id => document.getElementById(id);
  if (el('totalCourseCount')) el('totalCourseCount').textContent = pub.length;
  if (el('freeCourseCount')) el('freeCourseCount').textContent = pub.filter(c => !c.isPaid).length;
  if (el('totalViewsCount')) el('totalViewsCount').textContent = fmtViews(pub.reduce((s, c) => s + (c.viewCount || 0), 0));
}

// =====================================================
// 강의 상세 모달
// =====================================================
window.openCourse = function (courseId) {
  const c = allCourses.find(x => x.id === courseId);
  if (!c) return;

  // 유료 강의: 로그인 유도
  if (c.isPaid && !currentUser) {
    openLoginModal();
    return;
  }

  // 조회수 카운트
  c.viewCount = (c.viewCount || 0) + 1;
  addView(courseId);

  // 영상 세팅
  document.getElementById('courseFrame').src =
    `https://www.youtube-nocookie.com/embed/${c.videoId}?autoplay=1&rel=0&modestbranding=1`;

  // 배지
  document.getElementById('courseDetailBadges').innerHTML = `
    <span class="cls-course-badge ${c.isPaid ? 'paid' : 'free'}">${c.isPaid ? '유료' : '무료'}</span>
    <span class="cls-course-badge cat">${c.category}</span>
    <span class="cls-course-badge lv">${c.level || '입문'}</span>
  `;

  document.getElementById('courseDetailTitle').textContent = c.title;
  document.getElementById('courseDetailDesc').textContent = c.desc;
  document.getElementById('courseDetailMeta').innerHTML = `
    <span><i class="fas fa-clock"></i>${c.duration || '-'}</span>
    <span><i class="fas fa-eye"></i>${fmtViews(c.viewCount)}회 수강</span>
    ${c.isPaid ? `<span><i class="fas fa-won-sign"></i>${c.price.toLocaleString()}원</span>` : ''}
  `;

  // CTA 버튼
  const cta = document.getElementById('courseDetailCta');
  if (c.isPaid) {
    cta.innerHTML = `
      <button class="cls-btn-enroll soon-btn" disabled>
        <i class="fas fa-lock"></i> 결제 기능 오픈 예정
      </button>
      <a href="index.html#contact" class="cls-contact-link">문의하기 →</a>
    `;
  } else {
    cta.innerHTML = `
      <button class="cls-btn-enroll free-btn">
        <i class="fas fa-play"></i> 무료 수강 중
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

  // 카테고리 탭
  document.querySelectorAll('.cls-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cls-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCat = tab.dataset.cat;
      renderCourses();
    });
  });

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

  // URL 필터에 따른 네비 활성화
  const filter = new URLSearchParams(window.location.search).get('filter');
  if (filter === 'free') {
    document.getElementById('navFree')?.classList.add('active');
    document.getElementById('navAll')?.classList.remove('active');
  } else if (filter === 'paid') {
    document.getElementById('navPaid')?.classList.add('active');
    document.getElementById('navAll')?.classList.remove('active');
  }

  // 헤더 스크롤 효과
  window.addEventListener('scroll', () => {
    const header = document.getElementById('clsHeader');
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
  });

  renderReviews();

  // Firebase 미설정 시 샘플 데이터로 렌더
  if (!fbReady) {
    renderCourses();
    updateStats();
  }
});
