// =====================================================
// 프롬프트 모음 - 메인 스크립트
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
// 이미지는 클라이언트에서 압축 후 base64로 Firestore에 저장

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
// 픽셀아트 아바타 시스템 (class.js와 동일)
// =====================================================
const PIXEL_AVATARS = [
  {
    id: 1, name: '로봇',
    bg: '#EDE9FE',
    palette: { P:'#7C3AED', L:'#A78BFA', W:'#FFFFFF', D:'#1F1145', Y:'#FCD34D', B:'#F9A8D4' },
    grid: ['....YY....','..PPPPPP..', '.PPPPPPPP.', '.PWWPPWWP.', '.PDDPPDDP.', '.PBPPPPBP.', '.PPYYYYPP.', '..PPPPPP..', '...PPPP...', '..........']
  },
  {
    id: 2, name: '냥이',
    bg: '#FFF7ED',
    palette: { O:'#F97316', W:'#FFFFFF', D:'#374151', N:'#FB923C', L:'#FDBA74' },
    grid: ['O........O','OO......OO','OOOOOOOOOO','OOWWOOWWOO','OODDOODDOO','OOOONNOOOO','.OOOOOOOO.','..OOOOOO..','..........','..........']
  },
  {
    id: 3, name: '곰돌이',
    bg: '#FEF3C7',
    palette: { B:'#92400E', W:'#FFFFFF', D:'#374151', N:'#D97706', K:'#4B2508' },
    grid: ['BB......BB','BBBBBBBBBB','BBWWBBWWBB','BBDDBBDDBB','BBBBBBBBBB','BBBNNNNBBB','BBBBKKBBBB','..BBBBBB..','..........','..........']
  },
  {
    id: 4, name: '펭귄',
    bg: '#E0F2FE',
    palette: { K:'#1F2937', W:'#FFFFFF', D:'#111827', Y:'#FCD34D' },
    grid: ['..KKKKKK..', '.KKKKKKKK.', '.KWWKKWWK.', '.KDDKKDDK.', '.KKKKKKKK.', '..KKYYKK..', '..KKKKKK..', '...KKKK...', '..........', '..........']
  },
  {
    id: 5, name: '토끼',
    bg: '#FCE7F3',
    palette: { P:'#EC4899', L:'#F9A8D4', W:'#FFFFFF', D:'#374151', N:'#FB7185' },
    grid: ['..PP..PP..','..PL..LP..','..PP..PP..','.PPPPPPPP.','.PWWPPWWP.','.PDDPPDDP.','.PPPPPPPP.','..PPNNPP..','..........','..........']
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
// 앱 상태
// =====================================================
let currentUser = null;
let userProfile = { nickname: '', avatarId: 1 };
let isAdmin = false;
let selectedAvatarId = 1;
let allPrompts = [];
let currentCat = 'all';
let searchQuery = '';
let fbReady = false;
let auth, db;
let pendingImages = []; // 업로드 대기 이미지 파일
let myLikes = new Set();

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
      await loadUserProfile();
      updateUserUI(currentUser);
      await loadMyLikes();
      await loadPrompts();
    } else {
      const kakaoSession = localStorage.getItem('cls_kakao_user');
      if (kakaoSession) {
        currentUser = JSON.parse(kakaoSession);
        await loadUserProfile();
        updateUserUI(currentUser);
        await loadMyLikes();
        await loadPrompts();
      } else {
        currentUser = null;
        updateUserUI(null);
        await loadPrompts();
      }
    }
  });
} catch (e) {
  console.warn('Firebase 초기화 오류:', e.message);
  hideLoading();
}

// Kakao 초기화
if (typeof Kakao !== 'undefined' && KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
  try { Kakao.init(KAKAO_JS_KEY); } catch (e) {}
}

// =====================================================
// Firestore 함수
// =====================================================
async function loadUserProfile() {
  if (!fbReady || !db || !currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      userProfile.nickname = data.nickname || currentUser.name || '사용자';
      userProfile.avatarId = data.avatarId || 1;
      isAdmin = data.isAdmin === true;
    }
  } catch (e) { console.warn('프로필 로드 실패:', e); }
  updateWriteBtn();
}

function updateWriteBtn() {
  const btn = document.getElementById('writeBtn');
  if (btn) btn.style.display = isAdmin ? 'inline-flex' : 'none';
}

async function loadPrompts() {
  if (!fbReady) { hideLoading(); return; }
  try {
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allPrompts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('프롬프트 로드 실패:', e);
    allPrompts = [];
  }
  hideLoading();
  renderPrompts();
  updateStats();
}

async function loadMyLikes() {
  if (!fbReady || !db || !currentUser) { myLikes = new Set(); return; }
  try {
    const q = query(collection(db, 'promptLikes'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    myLikes = new Set(snap.docs.map(d => d.data().promptId));
  } catch (e) {
    myLikes = new Set();
  }
}

async function addPrompt(data) {
  if (!fbReady || !db || !currentUser) return null;
  try {
    const docRef = await addDoc(collection(db, 'prompts'), {
      ...data,
      authorId: currentUser.uid,
      authorName: userProfile.nickname || currentUser.name,
      authorAvatarId: userProfile.avatarId || 1,
      likes: 0,
      copyCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.warn('프롬프트 저장 실패:', e);
    return null;
  }
}

async function toggleLike(promptId) {
  if (!fbReady || !db || !currentUser) return;
  const isLiked = myLikes.has(promptId);
  try {
    if (isLiked) {
      // unlike
      const q = query(
        collection(db, 'promptLikes'),
        where('userId', '==', currentUser.uid),
        where('promptId', '==', promptId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'promptLikes', d.id));
      }
      await updateDoc(doc(db, 'prompts', promptId), { likes: increment(-1) });
      myLikes.delete(promptId);
      const p = allPrompts.find(x => x.id === promptId);
      if (p) p.likes = Math.max(0, (p.likes || 0) - 1);
    } else {
      // like
      await addDoc(collection(db, 'promptLikes'), {
        userId: currentUser.uid,
        promptId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'prompts', promptId), { likes: increment(1) });
      myLikes.add(promptId);
      const p = allPrompts.find(x => x.id === promptId);
      if (p) p.likes = (p.likes || 0) + 1;
    }
  } catch (e) {
    console.warn('좋아요 처리 실패:', e);
  }
}

async function incrementCopy(promptId) {
  if (!fbReady || !db) return;
  try {
    await updateDoc(doc(db, 'prompts', promptId), { copyCount: increment(1) });
    const p = allPrompts.find(x => x.id === promptId);
    if (p) p.copyCount = (p.copyCount || 0) + 1;
  } catch (e) {}
}

async function deletePrompt(promptId) {
  if (!fbReady || !db || !currentUser) return false;
  try {
    await deleteDoc(doc(db, 'prompts', promptId));
    allPrompts = allPrompts.filter(p => p.id !== promptId);
    return true;
  } catch (e) {
    console.warn('프롬프트 삭제 실패:', e);
    return false;
  }
}

// =====================================================
// 이미지 압축 & base64 변환
// =====================================================
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressAllImages(files) {
  const dataUrls = [];
  for (const file of files) {
    const dataUrl = await compressImage(file);
    dataUrls.push(dataUrl);
  }
  return dataUrls;
}

window.handleImageSelect = function (e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  // 최대 3장 제한
  const total = pendingImages.length + files.length;
  if (total > 3) {
    showToast('이미지는 최대 3장까지 업로드할 수 있습니다');
    e.target.value = '';
    return;
  }

  for (const file of files) {
    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      showToast(`${file.name}은(는) 5MB를 초과합니다`);
      continue;
    }
    pendingImages.push(file);
  }

  e.target.value = '';
  renderImagePreviews();
};

window.removeImage = function (index) {
  pendingImages.splice(index, 1);
  renderImagePreviews();
};

function renderImagePreviews() {
  const list = document.getElementById('imgPreviewList');
  const placeholder = document.getElementById('imgPlaceholder');
  if (!list) return;

  if (pendingImages.length === 0) {
    list.innerHTML = '';
    list.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    return;
  }

  if (placeholder) placeholder.style.display = pendingImages.length >= 3 ? 'none' : 'flex';
  list.style.display = 'flex';

  list.innerHTML = pendingImages.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="pmt-img-preview-item">
        <img src="${url}" alt="미리보기">
        <button class="pmt-img-remove" onclick="removeImage(${i})"><i class="fas fa-times"></i></button>
      </div>`;
  }).join('');
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
          await loadUserProfile();
          updateUserUI(kakaoUser);
          await loadMyLikes();
          closeLoginModal();
          renderPrompts();
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
  isAdmin = false;
  myLikes = new Set();
  updateUserUI(null);
  updateWriteBtn();
  renderPrompts();
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

window.openWriteModal = function () {
  if (!currentUser) { openLoginModal(); return; }
  if (!isAdmin) { showToast('관리자만 프롬프트를 등록할 수 있습니다'); return; }
  document.getElementById('writeTitle').value = '';
  document.getElementById('writeCat').value = '';
  document.getElementById('writeContent').value = '';
  document.getElementById('writeDesc').value = '';
  document.getElementById('writeTags').value = '';
  document.getElementById('charCount').textContent = '0';
  // 이미지 초기화
  pendingImages = [];
  renderImagePreviews();
  const fileInput = document.getElementById('writeImage');
  if (fileInput) fileInput.value = '';
  document.getElementById('writeModal').classList.add('open');
};
window.closeWriteModal = function (e) {
  if (!e || e.target === document.getElementById('writeModal')) {
    document.getElementById('writeModal').classList.remove('open');
  }
};

window.closeDetailModal = function (e) {
  if (!e || e.target === document.getElementById('detailModal')) {
    document.getElementById('detailModal').classList.remove('open');
  }
};

// =====================================================
// 마이페이지
// =====================================================
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

async function loadMyEnrolledCourses() {
  if (!fbReady || !db || !currentUser) return [];
  try {
    const q = query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.enrolledAt?.toDate ? a.enrolledAt.toDate().getTime() : 0;
      const tb = b.enrolledAt?.toDate ? b.enrolledAt.toDate().getTime() : 0;
      return tb - ta;
    });
    return list;
  } catch (e) { return []; }
}

async function loadMyHistory() {
  if (!fbReady || !db || !currentUser) return [];
  try {
    const q = query(collection(db, 'watchHistory'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.watchedAt?.toDate ? a.watchedAt.toDate().getTime() : 0;
      const tb = b.watchedAt?.toDate ? b.watchedAt.toDate().getTime() : 0;
      return tb - ta;
    });
    return list;
  } catch (e) { return []; }
}

window.openMyPage = async function () {
  if (!currentUser) { openLoginModal(); return; }
  const modal = document.getElementById('myPageModal');
  if (!modal) return;

  const avatar = document.getElementById('myAvatar');
  if (avatar) avatar.src = getAvatarDataUri(userProfile.avatarId);

  const name = document.getElementById('myName');
  const email = document.getElementById('myEmail');
  if (name) name.textContent = userProfile.nickname || currentUser.name;
  if (email) email.textContent = currentUser.email || currentUser.provider;

  const nicknameInput = document.getElementById('nicknameInput');
  if (nicknameInput) nicknameInput.value = userProfile.nickname || currentUser.name || '';

  selectedAvatarId = userProfile.avatarId;

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
      return `
        <div class="my-history-item" onclick="goToCourse('${r.courseId}')">
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

window.goToCourse = function (courseId) {
  window.location.href = 'class.html';
};

window.selectAvatar = function (id) {
  selectedAvatarId = id;
  document.querySelectorAll('.cls-avatar-option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.avatarId) === id);
  });
};

window.saveProfile = async function () {
  const nicknameInput = document.getElementById('nicknameInput');
  const nickname = nicknameInput?.value?.trim();
  if (!nickname) { showToast('닉네임을 입력해주세요'); return; }
  if (nickname.length > 12) { showToast('닉네임은 12자 이내로 입력해주세요'); return; }

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
// 렌더링
// =====================================================
function hideLoading() {
  const el = document.getElementById('loadingState');
  if (el) el.style.display = 'none';
}

function getFilteredPrompts() {
  let list = [...allPrompts];
  if (currentCat !== 'all') list = list.filter(p => p.category === currentCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  return list;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '일 전';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderPrompts() {
  const grid = document.getElementById('promptGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  const list = getFilteredPrompts();

  if (!list.length) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'grid';

  const loggedIn = !!currentUser;

  grid.innerHTML = list.map(p => {
    const liked = myLikes.has(p.id);
    const tags = (p.tags || []).slice(0, 3);
    const contentHtml = loggedIn
      ? `<div class="pmt-card-content">${escapeHtml(p.content || '')}</div>`
      : `<div class="pmt-card-content pmt-blurred"><span class="pmt-lock-msg"><i class="fas fa-lock"></i> 로그인 후 확인할 수 있습니다</span></div>`;
    const images = p.imageUrls || [];
    const imageHtml = images.length > 0
      ? `<div class="pmt-card-images"><img src="${images[0]}" alt="" loading="lazy">${images.length > 1 ? `<span class="pmt-card-img-count">+${images.length - 1}</span>` : ''}</div>`
      : '';
    return `
      <div class="pmt-card" onclick="openDetail('${p.id}')">
        ${imageHtml}
        <div class="pmt-card-top">
          <span class="pmt-card-cat ${p.category || ''}">${p.category || '기타'}</span>
        </div>
        <div class="pmt-card-title">${escapeHtml(p.title || '')}</div>
        ${contentHtml}
        ${p.description ? `<div class="pmt-card-desc">${escapeHtml(p.description)}</div>` : ''}
        ${tags.length ? `<div class="pmt-card-tags">${tags.map(t => `<span class="pmt-card-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div class="pmt-card-footer">
          <div class="pmt-card-author">
            <img class="pmt-card-avatar" src="${getAvatarDataUri(p.authorAvatarId || 1)}" alt="">
            <div class="pmt-card-author-info">
              <span class="pmt-card-author-name">${escapeHtml(p.authorName || '사용자')}</span>
              <span class="pmt-card-date">${formatDate(p.createdAt)}</span>
            </div>
          </div>
          <div class="pmt-card-actions">
            <span class="pmt-card-action ${liked ? 'liked' : ''}">
              <i class="fas fa-heart"></i> ${p.likes || 0}
            </span>
            <span class="pmt-card-action">
              <i class="fas fa-copy"></i> ${p.copyCount || 0}
            </span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function updateStats() {
  const el = id => document.getElementById(id);
  if (el('totalPrompts')) el('totalPrompts').textContent = allPrompts.length;
  const totalCopies = allPrompts.reduce((s, p) => s + (p.copyCount || 0), 0);
  if (el('totalCopies')) el('totalCopies').textContent = totalCopies;
}

// =====================================================
// 상세보기
// =====================================================
window.openDetail = function (promptId) {
  if (!currentUser) {
    showToast('프롬프트를 보려면 로그인이 필요합니다');
    openLoginModal();
    return;
  }
  const p = allPrompts.find(x => x.id === promptId);
  if (!p) return;

  const liked = myLikes.has(p.id);
  const isAuthor = currentUser && currentUser.uid === p.authorId;
  const tags = p.tags || [];

  const detailImages = p.imageUrls || [];
  const detailImgHtml = detailImages.length > 0
    ? `<div class="pmt-detail-images">${detailImages.map((url, i) => `<img src="${url}" alt="이미지 ${i+1}" onclick="openImageViewer('${url}', event)" loading="lazy">`).join('')}</div>`
    : '';

  document.getElementById('detailContent').innerHTML = `
    <span class="pmt-detail-cat pmt-card-cat ${p.category || ''}">${p.category || '기타'}</span>
    <h2 class="pmt-detail-title">${escapeHtml(p.title || '')}</h2>
    ${p.description ? `<p class="pmt-detail-desc">${escapeHtml(p.description)}</p>` : ''}
    ${detailImgHtml}
    <div class="pmt-detail-prompt-wrap">
      <div class="pmt-detail-prompt">${escapeHtml(p.content || '')}</div>
      <button class="pmt-copy-btn" onclick="copyPrompt('${p.id}', event)">
        <i class="fas fa-copy"></i> 복사
      </button>
    </div>
    ${tags.length ? `<div class="pmt-detail-tags">${tags.map(t => `<span class="pmt-detail-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    <div class="pmt-detail-meta">
      <div class="pmt-detail-author">
        <img class="pmt-detail-avatar" src="${getAvatarDataUri(p.authorAvatarId || 1)}" alt="">
        <div>
          <div class="pmt-detail-author-name">${escapeHtml(p.authorName || '사용자')}</div>
          <div class="pmt-detail-author-date">${formatDate(p.createdAt)}</div>
        </div>
      </div>
      <div class="pmt-detail-stats">
        <span class="pmt-detail-stat"><i class="fas fa-heart"></i> <span id="detailLikeCount">${p.likes || 0}</span></span>
        <span class="pmt-detail-stat"><i class="fas fa-copy"></i> <span id="detailCopyCount">${p.copyCount || 0}</span></span>
      </div>
    </div>
    <div style="display:flex;align-items:center;flex-wrap:wrap;">
      <button class="pmt-detail-like-btn ${liked ? 'liked' : ''}" id="detailLikeBtn" onclick="handleLike('${p.id}', event)">
        <i class="fas fa-heart"></i> ${liked ? '좋아요 취소' : '좋아요'}
      </button>
      ${isAuthor ? `<button class="pmt-delete-btn" onclick="handleDelete('${p.id}', event)"><i class="fas fa-trash"></i> 삭제</button>` : ''}
    </div>
  `;

  document.getElementById('detailModal').classList.add('open');
};

// =====================================================
// 액션
// =====================================================
window.copyPrompt = async function (promptId, e) {
  e.stopPropagation();
  const p = allPrompts.find(x => x.id === promptId);
  if (!p) return;
  try {
    await navigator.clipboard.writeText(p.content);
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="fas fa-check"></i> 복사완료';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-copy"></i> 복사';
      btn.classList.remove('copied');
    }, 2000);
    await incrementCopy(promptId);
    const countEl = document.getElementById('detailCopyCount');
    if (countEl) countEl.textContent = p.copyCount || 0;
    showToast('프롬프트가 복사되었습니다!');
  } catch (err) {
    showToast('복사에 실패했습니다.');
  }
};

window.handleLike = async function (promptId, e) {
  e.stopPropagation();
  if (!currentUser) { openLoginModal(); return; }
  await toggleLike(promptId);
  const p = allPrompts.find(x => x.id === promptId);
  const liked = myLikes.has(promptId);
  const btn = document.getElementById('detailLikeBtn');
  if (btn) {
    btn.className = `pmt-detail-like-btn ${liked ? 'liked' : ''}`;
    btn.innerHTML = `<i class="fas fa-heart"></i> ${liked ? '좋아요 취소' : '좋아요'}`;
  }
  const countEl = document.getElementById('detailLikeCount');
  if (countEl && p) countEl.textContent = p.likes || 0;
  renderPrompts();
};

window.handleDelete = async function (promptId, e) {
  e.stopPropagation();
  if (!confirm('정말 이 프롬프트를 삭제하시겠습니까?')) return;
  const ok = await deletePrompt(promptId);
  if (ok) {
    closeDetailModal();
    renderPrompts();
    updateStats();
    showToast('프롬프트가 삭제되었습니다.');
  } else {
    showToast('삭제에 실패했습니다.');
  }
};

window.submitPrompt = async function () {
  if (!currentUser) { openLoginModal(); return; }
  if (!isAdmin) { showToast('관리자만 프롬프트를 등록할 수 있습니다'); return; }

  const title = document.getElementById('writeTitle').value.trim();
  const category = document.getElementById('writeCat').value;
  const content = document.getElementById('writeContent').value.trim();
  const description = document.getElementById('writeDesc').value.trim();
  const tagsRaw = document.getElementById('writeTags').value.trim();

  if (!title) { showToast('제목을 입력해주세요'); return; }
  if (!category) { showToast('카테고리를 선택해주세요'); return; }
  if (!content) { showToast('프롬프트 내용을 입력해주세요'); return; }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5) : [];

  const btn = document.getElementById('submitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  // 이미지 압축 & base64 변환
  let imageUrls = [];
  if (pendingImages.length > 0) {
    try {
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 이미지 처리 중...';
      imageUrls = await compressAllImages(pendingImages);
    } catch (e) {
      console.warn('이미지 처리 실패:', e);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 공유하기'; }
      showToast('이미지 처리에 실패했습니다. 다시 시도해주세요.');
      return;
    }
  }

  const id = await addPrompt({ title, category, content, description, tags, imageUrls });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 공유하기'; }

  if (id) {
    closeWriteModal();
    await loadPrompts();
    showToast('프롬프트가 공유되었습니다!');
  } else {
    showToast('저장에 실패했습니다. 다시 시도해주세요.');
  }
};

// =====================================================
// 이미지 뷰어
// =====================================================
window.openImageViewer = function (url, e) {
  e.stopPropagation();
  let viewer = document.getElementById('imgViewer');
  if (!viewer) {
    viewer = document.createElement('div');
    viewer.id = 'imgViewer';
    viewer.className = 'pmt-img-viewer';
    viewer.onclick = () => viewer.classList.remove('open');
    document.body.appendChild(viewer);
  }
  viewer.innerHTML = `<img src="${url}" alt="확대 이미지"><button class="pmt-img-viewer-close"><i class="fas fa-times"></i></button>`;
  viewer.classList.add('open');
};

// =====================================================
// 유틸
// =====================================================
function showToast(msg) {
  let t = document.getElementById('pmtToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pmtToast';
    t.className = 'pmt-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// =====================================================
// DOM 초기화
// =====================================================
document.addEventListener('DOMContentLoaded', () => {

  // 카테고리 탭 클릭
  document.querySelectorAll('.pmt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pmt-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCat = tab.dataset.cat;
      renderPrompts();
    });
  });

  // 검색
  const searchEl = document.getElementById('searchInput');
  if (searchEl) {
    let debounce;
    searchEl.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = searchEl.value.trim();
        renderPrompts();
      }, 300);
    });
  }

  // 글자수 카운트
  const contentEl = document.getElementById('writeContent');
  const charCount = document.getElementById('charCount');
  if (contentEl && charCount) {
    contentEl.addEventListener('input', () => {
      charCount.textContent = contentEl.value.length;
    });
  }

  // 모바일 네비
  window.toggleMobileNav = function () {
    document.getElementById('clsNav').classList.toggle('open');
  };

  // 헤더 스크롤 효과
  window.addEventListener('scroll', () => {
    const header = document.getElementById('clsHeader');
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
  });

  // 초기에 글쓰기 버튼 숨김 (관리자만 표시)
  updateWriteBtn();

  // Firebase 미설정 시
  if (!fbReady) {
    hideLoading();
    renderPrompts();
    updateStats();
  }
});
