// =====================================================
// 자료실 - 메인 스크립트
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
// 픽셀아트 아바타 시스템
// =====================================================
const PIXEL_AVATARS = [
  { id:1, name:'로봇', bg:'#EDE9FE', palette:{P:'#7C3AED',L:'#A78BFA',W:'#FFFFFF',D:'#1F1145',Y:'#FCD34D',B:'#F9A8D4'}, grid:['....YY....','..PPPPPP..','.PPPPPPPP.','.PWWPPWWP.','.PDDPPDDP.','.PBPPPPBP.','.PPYYYYPP.','..PPPPPP..','...PPPP...','..........'] },
  { id:2, name:'냥이', bg:'#FFF7ED', palette:{O:'#F97316',W:'#FFFFFF',D:'#374151',N:'#FB923C',L:'#FDBA74'}, grid:['O........O','OO......OO','OOOOOOOOOO','OOWWOOWWOO','OODDOODDOO','OOOONNOOOO','.OOOOOOOO.','..OOOOOO..','..........','..........'] },
  { id:3, name:'곰돌이', bg:'#FEF3C7', palette:{B:'#92400E',W:'#FFFFFF',D:'#374151',N:'#D97706',K:'#4B2508'}, grid:['BB......BB','BBBBBBBBBB','BBWWBBWWBB','BBDDBBDDBB','BBBBBBBBBB','BBBNNNNBBB','BBBBKKBBBB','..BBBBBB..','..........','..........'] },
  { id:4, name:'펭귄', bg:'#E0F2FE', palette:{K:'#1F2937',W:'#FFFFFF',D:'#111827',Y:'#FCD34D'}, grid:['..KKKKKK..','.KKKKKKKK.','.KWWKKWWK.','.KDDKKDDK.','.KKKKKKKK.','..KKYYKK..','..KKKKKK..','...KKKK...','..........','..........'] },
  { id:5, name:'토끼', bg:'#FCE7F3', palette:{P:'#EC4899',L:'#F9A8D4',W:'#FFFFFF',D:'#374151',N:'#FB7185'}, grid:['..PP..PP..','..PL..LP..','..PP..PP..','.PPPPPPPP.','.PWWPPWWP.','.PDDPPDDP.','.PPPPPPPP.','..PPNNPP..','..........','..........'] }
];

function getAvatarDataUri(avatarId) {
  const a = PIXEL_AVATARS.find(x => x.id === avatarId) || PIXEL_AVATARS[0];
  const rows = a.grid.length, cols = a.grid[0].length, cell = 8;
  const ox = (100 - cols*cell)/2, oy = (100 - rows*cell)/2;
  let rects = '';
  for (let y = 0; y < rows; y++) for (let x = 0; x < a.grid[y].length; x++) {
    const ch = a.grid[y][x]; if (ch === '.') continue;
    const color = a.palette[ch]; if (!color) continue;
    rects += `<rect fill="${color}" x="${ox+x*cell}" y="${oy+y*cell}" width="${cell}" height="${cell}"/>`;
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
let allResources = [];
let currentCat = 'all';
let searchQuery = '';
let fbReady = false;
let auth, db;
let myLikes = new Set();
let pendingImage = null;   // 이미지 파일 1개
let pendingFile = null;    // 첨부 파일 1개

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
        uid: user.uid, name: user.displayName || '사용자',
        email: user.email, photo: user.photoURL || '', provider: 'google',
      };
      await loadUserProfile();
      updateUserUI(currentUser);
      await loadMyLikes();
      await loadResources();
    } else {
      const kakaoSession = localStorage.getItem('cls_kakao_user');
      if (kakaoSession) {
        try {
          const parsed = JSON.parse(kakaoSession);
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
        if (currentUser) {
          await loadUserProfile();
          updateUserUI(currentUser);
          await loadMyLikes();
        }
        await loadResources();
      } else {
        currentUser = null;
        updateUserUI(null);
        await loadResources();
      }
    }
  });
} catch (e) { console.warn('Firebase 초기화 오류:', e.message); hideLoading(); }

if (typeof Kakao !== 'undefined' && KAKAO_JS_KEY !== 'YOUR_KAKAO_JS_KEY') {
  try { Kakao.init(KAKAO_JS_KEY); } catch (e) {}
}

// =====================================================
// Firestore 함수
// =====================================================
async function loadUserProfile() {
  if (!fbReady || !db || !currentUser) return;
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
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

async function loadResources() {
  if (!fbReady) { hideLoading(); return; }
  try {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allResources = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.warn('자료 로드 실패:', e); allResources = []; }
  hideLoading();
  renderResources();
  updateStats();
}

async function loadMyLikes() {
  if (!fbReady || !db || !currentUser) { myLikes = new Set(); return; }
  try {
    const q = query(collection(db, 'resourceLikes'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    myLikes = new Set(snap.docs.map(d => d.data().resourceId));
  } catch (e) { myLikes = new Set(); }
}

async function addResource(data) {
  if (!fbReady || !db || !currentUser) return null;
  try {
    const docRef = await addDoc(collection(db, 'resources'), {
      ...data,
      authorId: currentUser.uid,
      authorName: userProfile.nickname || currentUser.name,
      authorAvatarId: userProfile.avatarId || 1,
      likes: 0, downloadCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) { console.warn('자료 저장 실패:', e); return null; }
}

async function toggleLike(resourceId) {
  if (!fbReady || !db || !currentUser) return;
  const isLiked = myLikes.has(resourceId);
  try {
    if (isLiked) {
      const q = query(collection(db, 'resourceLikes'),
        where('userId', '==', currentUser.uid), where('resourceId', '==', resourceId));
      const snap = await getDocs(q);
      for (const d of snap.docs) await deleteDoc(doc(db, 'resourceLikes', d.id));
      await updateDoc(doc(db, 'resources', resourceId), { likes: increment(-1) });
      myLikes.delete(resourceId);
      const r = allResources.find(x => x.id === resourceId);
      if (r) r.likes = Math.max(0, (r.likes||0) - 1);
    } else {
      await addDoc(collection(db, 'resourceLikes'), { userId: currentUser.uid, resourceId, createdAt: serverTimestamp() });
      await updateDoc(doc(db, 'resources', resourceId), { likes: increment(1) });
      myLikes.add(resourceId);
      const r = allResources.find(x => x.id === resourceId);
      if (r) r.likes = (r.likes||0) + 1;
    }
  } catch (e) { console.warn('좋아요 처리 실패:', e); }
}

async function incrementDownload(resourceId) {
  if (!fbReady || !db) return;
  try {
    await updateDoc(doc(db, 'resources', resourceId), { downloadCount: increment(1) });
    const r = allResources.find(x => x.id === resourceId);
    if (r) r.downloadCount = (r.downloadCount||0) + 1;
  } catch (e) {}
}

async function deleteResource(resourceId) {
  if (!fbReady || !db || !currentUser) return false;
  try {
    // 파일 청크 삭제
    const chunkSnap = await getDocs(collection(db, 'resources', resourceId, 'fileChunks'));
    for (const d of chunkSnap.docs) await deleteDoc(doc(db, 'resources', resourceId, 'fileChunks', d.id));
    await deleteDoc(doc(db, 'resources', resourceId));
    allResources = allResources.filter(r => r.id !== resourceId);
    return true;
  } catch (e) { console.warn('자료 삭제 실패:', e); return false; }
}

// =====================================================
// 이미지 압축 & base64
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
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

// =====================================================
// 파일 -> base64 & Firestore 청크 저장
// =====================================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // base64만
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveFileChunks(resourceId, base64Data) {
  const CHUNK_SIZE = 800000; // ~800KB per chunk
  const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await setDoc(doc(db, 'resources', resourceId, 'fileChunks', String(i)), {
      data: chunk, index: i, total: totalChunks
    });
  }
}

async function loadFileChunks(resourceId) {
  const snap = await getDocs(collection(db, 'resources', resourceId, 'fileChunks'));
  if (snap.empty) return null;
  const sorted = snap.docs.map(d => d.data()).sort((a, b) => a.index - b.index);
  return sorted.map(c => c.data).join('');
}

// =====================================================
// 이미지/파일 선택 핸들러
// =====================================================
window.handleImageSelect = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('이미지는 5MB 이하만 가능합니다'); e.target.value = ''; return; }
  // 보안: 이미지 MIME 타입 검증
  if (!file.type.startsWith('image/')) { showToast('이미지 파일만 업로드할 수 있습니다'); e.target.value = ''; return; }
  pendingImage = file;
  renderImagePreview();
};

window.removeImage = function () {
  pendingImage = null;
  const input = document.getElementById('writeImage');
  if (input) input.value = '';
  renderImagePreview();
};

function renderImagePreview() {
  const preview = document.getElementById('imgPreview');
  const placeholder = document.getElementById('imgPlaceholder');
  if (!preview) return;
  if (!pendingImage) {
    preview.style.display = 'none';
    preview.innerHTML = '';
    if (placeholder) placeholder.style.display = 'flex';
    return;
  }
  if (placeholder) placeholder.style.display = 'none';
  const url = URL.createObjectURL(pendingImage);
  preview.style.display = 'block';
  preview.innerHTML = `
    <div class="res-img-preview-item">
      <img src="${url}" alt="미리보기">
      <button class="res-img-remove" onclick="removeImage()"><i class="fas fa-times"></i></button>
    </div>`;
}

window.handleFileSelect = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('파일은 5MB 이하만 가능합니다'); e.target.value = ''; return; }
  // 보안: 허용된 파일 확장자만 업로드 허용
  const allowedExts = ['pdf','doc','docx','ppt','pptx','xls','xlsx','zip','hwp','hwpx','txt','csv'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowedExts.includes(ext)) {
    showToast('허용되지 않은 파일 형식입니다');
    e.target.value = '';
    return;
  }
  pendingFile = file;
  renderFileInfo();
};

window.removeFile = function () {
  pendingFile = null;
  const input = document.getElementById('writeFile');
  if (input) input.value = '';
  renderFileInfo();
};

function renderFileInfo() {
  const info = document.getElementById('fileInfo');
  const placeholder = document.getElementById('filePlaceholder');
  if (!info) return;
  if (!pendingFile) {
    info.style.display = 'none';
    info.innerHTML = '';
    if (placeholder) placeholder.style.display = 'flex';
    return;
  }
  if (placeholder) placeholder.style.display = 'none';
  const sizeStr = pendingFile.size < 1024 ? pendingFile.size + 'B'
    : pendingFile.size < 1048576 ? (pendingFile.size / 1024).toFixed(1) + 'KB'
    : (pendingFile.size / 1048576).toFixed(1) + 'MB';
  const ext = pendingFile.name.split('.').pop().toUpperCase();
  info.style.display = 'flex';
  info.innerHTML = `
    <div class="res-file-icon"><i class="fas fa-file-${getFileIcon(ext)}"></i></div>
    <div class="res-file-detail">
      <span class="res-file-name">${escapeHtml(pendingFile.name)}</span>
      <span class="res-file-size">${escapeHtml(ext)} / ${sizeStr}</span>
    </div>
    <button class="res-file-remove" onclick="removeFile()"><i class="fas fa-times"></i></button>`;
}

function getFileIcon(ext) {
  const map = { PDF:'pdf', DOC:'word', DOCX:'word', PPT:'powerpoint', PPTX:'powerpoint',
    XLS:'excel', XLSX:'excel', ZIP:'archive', RAR:'archive', '7Z':'archive',
    PNG:'image', JPG:'image', JPEG:'image', GIF:'image' };
  return map[ext] || 'alt';
}

function getFileMime(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf:'application/pdf', doc:'application/msword',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt:'application/vnd.ms-powerpoint',
    pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls:'application/vnd.ms-excel',
    xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip:'application/zip', rar:'application/x-rar-compressed',
    png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif' };
  return map[ext] || 'application/octet-stream';
}

// =====================================================
// 인증 함수
// =====================================================
window.loginWithGoogle = async function () {
  if (!fbReady) { alert('Firebase 설정 후 이용 가능합니다.'); return; }
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    closeLoginModal();
  } catch (e) { if (e.code !== 'auth/popup-closed-by-user') alert('구글 로그인 오류: ' + e.message); }
};

window.loginWithKakao = function () {
  if (typeof Kakao === 'undefined' || KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') { alert('카카오 앱 키 설정이 필요합니다.'); return; }
  Kakao.Auth.login({
    success: function () {
      Kakao.API.request({
        url: '/v2/user/me',
        success: async function (res) {
          const profile = res.kakao_account?.profile || {};
          const kakaoUser = {
            uid: 'kakao_' + res.id, name: profile.nickname || '카카오 사용자',
            email: res.kakao_account?.email || '', photo: profile.thumbnail_image_url || '', provider: 'kakao',
          };
          localStorage.setItem('cls_kakao_user', JSON.stringify(kakaoUser));
          currentUser = kakaoUser;
          await loadUserProfile(); updateUserUI(kakaoUser);
          await loadMyLikes(); closeLoginModal(); renderResources();
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
  currentUser = null; isAdmin = false; myLikes = new Set();
  updateUserUI(null); updateWriteBtn(); renderResources();
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
window.openLoginModal = function () { document.getElementById('loginModal').classList.add('open'); };
window.closeLoginModal = function (e) {
  if (!e || e.target === document.getElementById('loginModal')) document.getElementById('loginModal').classList.remove('open');
};

window.openWriteModal = function () {
  if (!currentUser) { openLoginModal(); return; }
  if (!isAdmin) { showToast('관리자만 자료를 등록할 수 있습니다'); return; }
  document.getElementById('writeTitle').value = '';
  document.getElementById('writeCat').value = '';
  document.getElementById('writeContent').value = '';
  document.getElementById('writeTags').value = '';
  document.getElementById('charCount').textContent = '0';
  pendingImage = null; pendingFile = null;
  renderImagePreview(); renderFileInfo();
  const fi = document.getElementById('writeImage'); if (fi) fi.value = '';
  const ff = document.getElementById('writeFile'); if (ff) ff.value = '';
  document.getElementById('writeModal').classList.add('open');
};
window.closeWriteModal = function (e) {
  if (!e || e.target === document.getElementById('writeModal')) document.getElementById('writeModal').classList.remove('open');
};
window.closeDetailModal = function (e) {
  if (!e || e.target === document.getElementById('detailModal')) document.getElementById('detailModal').classList.remove('open');
};

// =====================================================
// 마이페이지
// =====================================================
async function saveUserProfile(nickname, avatarId) {
  if (!fbReady || !db || !currentUser) return false;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { nickname, avatarId });
    userProfile.nickname = nickname; userProfile.avatarId = avatarId;
    updateUserUI(currentUser); return true;
  } catch (e) { return false; }
}

async function loadMyEnrolledCourses() {
  if (!fbReady || !db || !currentUser) return [];
  try {
    const q = query(collection(db, 'enrollments'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.enrolledAt?.toDate?.().getTime()||0) - (a.enrolledAt?.toDate?.().getTime()||0));
    return list;
  } catch (e) { return []; }
}

async function loadMyHistory() {
  if (!fbReady || !db || !currentUser) return [];
  try {
    const q = query(collection(db, 'watchHistory'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.watchedAt?.toDate?.().getTime()||0) - (a.watchedAt?.toDate?.().getTime()||0));
    return list;
  } catch (e) { return []; }
}

window.openMyPage = async function () {
  if (!currentUser) { openLoginModal(); return; }
  const modal = document.getElementById('myPageModal'); if (!modal) return;
  const avatar = document.getElementById('myAvatar');
  if (avatar) avatar.src = getAvatarDataUri(userProfile.avatarId);
  const name = document.getElementById('myName'), email = document.getElementById('myEmail');
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
        <img src="${getAvatarDataUri(a.id)}" alt="${a.name}"><span>${a.name}</span>
      </div>`).join('');
  }
  const historyList = document.getElementById('myHistoryList');
  historyList.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>';
  modal.classList.add('open');
  const [enrollments, watchRecords] = await Promise.all([loadMyEnrolledCourses(), loadMyHistory()]);
  document.getElementById('myTotalCourses').textContent = enrollments.length;
  document.getElementById('myTotalViews').textContent = watchRecords.length;
  if (!enrollments.length) {
    historyList.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa"><i class="fas fa-book-open" style="font-size:28px;margin-bottom:8px"></i><br>아직 수강신청한 강의가 없어요</div>';
  } else {
    historyList.innerHTML = enrollments.map(r => {
      const ts = r.enrolledAt?.toDate ? r.enrolledAt.toDate() : new Date();
      const dateStr = `${ts.getFullYear()}.${String(ts.getMonth()+1).padStart(2,'0')}.${String(ts.getDate()).padStart(2,'0')}`;
      return `<div class="my-history-item" onclick="goToCourse('${r.courseId}')"><div class="my-history-info"><div class="my-history-title">${r.courseTitle||'(삭제된 강의)'}</div><div class="my-history-meta"><span>${r.category||''}</span><span>${dateStr} 수강신청</span></div></div><div class="my-history-play"><i class="fas fa-play-circle"></i></div></div>`;
    }).join('');
  }
};
window.closeMyPage = function (e) { if (!e || e.target === document.getElementById('myPageModal')) document.getElementById('myPageModal').classList.remove('open'); };
window.goToCourse = function () { window.location.href = 'class.html'; };
window.selectAvatar = function (id) {
  selectedAvatarId = id;
  document.querySelectorAll('.cls-avatar-option').forEach(el => el.classList.toggle('selected', parseInt(el.dataset.avatarId) === id));
};
window.saveProfile = async function () {
  const nickname = document.getElementById('nicknameInput')?.value?.trim();
  if (!nickname) { showToast('닉네임을 입력해주세요'); return; }
  if (nickname.length > 12) { showToast('닉네임은 12자 이내로 입력해주세요'); return; }
  const btn = document.getElementById('profileSaveBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }
  const ok = await saveUserProfile(nickname, selectedAvatarId);
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 저장'; }
  if (ok) {
    showToast('프로필이 저장되었습니다!');
    const n = document.getElementById('myName'), a = document.getElementById('myAvatar');
    if (n) n.textContent = nickname; if (a) a.src = getAvatarDataUri(selectedAvatarId);
  } else { showToast('저장에 실패했습니다.'); }
};

// =====================================================
// 렌더링
// =====================================================
function hideLoading() { const el = document.getElementById('loadingState'); if (el) el.style.display = 'none'; }

function getFilteredResources() {
  let list = [...allResources];
  if (currentCat !== 'all') list = list.filter(r => r.category === currentCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(r =>
      (r.title||'').toLowerCase().includes(q) ||
      (r.content||'').toLowerCase().includes(q) ||
      (r.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }
  return list;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date(), diff = now - d;
  if (diff < 60000) return '방금 전';
  if (diff < 3600000) return Math.floor(diff/60000) + '분 전';
  if (diff < 86400000) return Math.floor(diff/3600000) + '시간 전';
  if (diff < 604800000) return Math.floor(diff/86400000) + '일 전';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function escapeHtml(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function sanitizeUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url;
  return '';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

function renderResources() {
  const grid = document.getElementById('resourceGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  const list = getFilteredResources();
  if (!list.length) {
    grid.innerHTML = ''; grid.style.display = 'none'; empty.style.display = 'block'; return;
  }
  empty.style.display = 'none'; grid.style.display = 'grid';
  const loggedIn = !!currentUser;

  grid.innerHTML = list.map(r => {
    const liked = myLikes.has(r.id);
    const tags = (r.tags||[]).slice(0, 3);
    const hasImage = !!r.imageUrl;
    const hasFile = !!r.fileName;
    const ext = r.fileName ? r.fileName.split('.').pop().toUpperCase() : '';

    const imageHtml = hasImage
      ? `<div class="res-card-image"><img src="${r.imageUrl}" alt="" loading="lazy"></div>`
      : '';

    const descHtml = loggedIn
      ? `<div class="res-card-desc">${escapeHtml(r.content||'')}</div>`
      : `<div class="res-card-desc res-blurred"><span class="res-lock-msg"><i class="fas fa-lock"></i> 로그인 후 확인</span></div>`;

    const fileChip = hasFile
      ? `<div class="res-card-file"><i class="fas fa-file-${getFileIcon(ext)}"></i> <span>${ext}</span> <small>${formatFileSize(r.fileSize)}</small></div>`
      : '';

    return `
      <div class="res-card" onclick="openDetail('${r.id}')">
        ${imageHtml}
        <div class="res-card-body">
          <div class="res-card-top">
            <span class="res-card-cat ${r.category||''}">${r.category||'기타'}</span>
            ${fileChip}
          </div>
          <div class="res-card-title">${escapeHtml(r.title||'')}</div>
          ${descHtml}
          ${tags.length ? `<div class="res-card-tags">${tags.map(t => `<span class="res-card-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="res-card-footer">
            <div class="res-card-author">
              <img class="res-card-avatar" src="${getAvatarDataUri(r.authorAvatarId||1)}" alt="">
              <div class="res-card-author-info">
                <span class="res-card-author-name">${escapeHtml(r.authorName||'사용자')}</span>
                <span class="res-card-date">${formatDate(r.createdAt)}</span>
              </div>
            </div>
            <div class="res-card-actions">
              <span class="res-card-action ${liked?'liked':''}"><i class="fas fa-heart"></i> ${r.likes||0}</span>
              <span class="res-card-action"><i class="fas fa-download"></i> ${r.downloadCount||0}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function updateStats() {
  const el = id => document.getElementById(id);
  if (el('totalResources')) el('totalResources').textContent = allResources.length;
  const total = allResources.reduce((s, r) => s + (r.downloadCount||0), 0);
  if (el('totalDownloads')) el('totalDownloads').textContent = total;
}

// =====================================================
// 상세보기
// =====================================================
window.openDetail = function (resourceId) {
  if (!currentUser) { showToast('자료를 보려면 로그인이 필요합니다'); openLoginModal(); return; }
  const r = allResources.find(x => x.id === resourceId);
  if (!r) return;
  const liked = myLikes.has(r.id);
  const isAuthor = currentUser && currentUser.uid === r.authorId;
  const tags = r.tags || [];
  const ext = r.fileName ? r.fileName.split('.').pop().toUpperCase() : '';

  const imageHtml = r.imageUrl
    ? `<div class="res-detail-image"><img src="${r.imageUrl}" alt="" onclick="openImageViewer('${r.imageUrl}', event)"></div>` : '';

  const fileHtml = r.fileName
    ? `<div class="res-detail-file-section">
        <div class="res-detail-file-card">
          <div class="res-detail-file-icon"><i class="fas fa-file-${getFileIcon(ext)}"></i></div>
          <div class="res-detail-file-info">
            <span class="res-detail-file-name">${escapeHtml(r.fileName)}</span>
            <span class="res-detail-file-meta">${ext} / ${formatFileSize(r.fileSize)}</span>
          </div>
          <button class="res-download-btn" onclick="downloadFile('${r.id}', event)">
            <i class="fas fa-download"></i> 다운로드
          </button>
        </div>
      </div>` : '';

  document.getElementById('detailContent').innerHTML = `
    <span class="res-detail-cat res-card-cat ${r.category||''}">${r.category||'기타'}</span>
    <h2 class="res-detail-title">${escapeHtml(r.title||'')}</h2>
    ${imageHtml}
    <div class="res-detail-desc">${escapeHtml(r.content||'')}</div>
    ${fileHtml}
    ${tags.length ? `<div class="res-detail-tags">${tags.map(t => `<span class="res-detail-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    <div class="res-detail-meta">
      <div class="res-detail-author">
        <img class="res-detail-avatar" src="${getAvatarDataUri(r.authorAvatarId||1)}" alt="">
        <div>
          <div class="res-detail-author-name">${escapeHtml(r.authorName||'사용자')}</div>
          <div class="res-detail-author-date">${formatDate(r.createdAt)}</div>
        </div>
      </div>
      <div class="res-detail-stats">
        <span class="res-detail-stat"><i class="fas fa-heart"></i> <span id="detailLikeCount">${r.likes||0}</span></span>
        <span class="res-detail-stat"><i class="fas fa-download"></i> <span id="detailDlCount">${r.downloadCount||0}</span></span>
      </div>
    </div>
    <div style="display:flex;align-items:center;flex-wrap:wrap;">
      <button class="res-detail-like-btn ${liked?'liked':''}" id="detailLikeBtn" onclick="handleLike('${r.id}', event)">
        <i class="fas fa-heart"></i> ${liked ? '좋아요 취소' : '좋아요'}
      </button>
      ${isAuthor ? `<button class="res-delete-btn" onclick="handleDelete('${r.id}', event)"><i class="fas fa-trash"></i> 삭제</button>` : ''}
    </div>`;
  document.getElementById('detailModal').classList.add('open');
};

// =====================================================
// 액션
// =====================================================
window.downloadFile = async function (resourceId, e) {
  e.stopPropagation();
  const r = allResources.find(x => x.id === resourceId);
  if (!r || !r.fileName) return;

  const btn = e.currentTarget;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 준비 중...';
  btn.disabled = true;

  try {
    const base64 = await loadFileChunks(resourceId);
    if (!base64) { showToast('파일을 불러올 수 없습니다.'); return; }

    const mime = getFileMime(r.fileName);
    const byteChars = atob(base64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = r.fileName; a.click();
    URL.revokeObjectURL(url);

    await incrementDownload(resourceId);
    const countEl = document.getElementById('detailDlCount');
    if (countEl) countEl.textContent = r.downloadCount || 0;
    showToast('다운로드가 시작되었습니다!');
  } catch (err) {
    console.warn('다운로드 실패:', err);
    showToast('다운로드에 실패했습니다.');
  } finally {
    btn.innerHTML = '<i class="fas fa-download"></i> 다운로드';
    btn.disabled = false;
  }
};

window.handleLike = async function (resourceId, e) {
  e.stopPropagation();
  if (!currentUser) { openLoginModal(); return; }
  await toggleLike(resourceId);
  const r = allResources.find(x => x.id === resourceId);
  const liked = myLikes.has(resourceId);
  const btn = document.getElementById('detailLikeBtn');
  if (btn) {
    btn.className = `res-detail-like-btn ${liked?'liked':''}`;
    btn.innerHTML = `<i class="fas fa-heart"></i> ${liked ? '좋아요 취소' : '좋아요'}`;
  }
  const countEl = document.getElementById('detailLikeCount');
  if (countEl && r) countEl.textContent = r.likes || 0;
  renderResources();
};

window.handleDelete = async function (resourceId, e) {
  e.stopPropagation();
  if (!confirm('정말 이 자료를 삭제하시겠습니까?')) return;
  const ok = await deleteResource(resourceId);
  if (ok) { closeDetailModal(); renderResources(); updateStats(); showToast('자료가 삭제되었습니다.'); }
  else { showToast('삭제에 실패했습니다.'); }
};

window.submitResource = async function () {
  if (!currentUser) { openLoginModal(); return; }
  if (!isAdmin) { showToast('관리자만 자료를 등록할 수 있습니다'); return; }

  const title = document.getElementById('writeTitle').value.trim();
  const category = document.getElementById('writeCat').value;
  const content = document.getElementById('writeContent').value.trim();
  const tagsRaw = document.getElementById('writeTags').value.trim();

  if (!title) { showToast('제목을 입력해주세요'); return; }
  if (title.length > 60) { showToast('제목은 60자 이내로 입력해주세요'); return; }
  if (!category) { showToast('카테고리를 선택해주세요'); return; }
  if (!content) { showToast('설명을 입력해주세요'); return; }
  if (content.length > 1000) { showToast('설명은 1000자 이내로 입력해주세요'); return; }
  // 보안: 허용된 카테고리 값만 허용
  const allowedCats = ['강의자료','템플릿','가이드','도구','기타'];
  if (!allowedCats.includes(category)) { showToast('올바른 카테고리를 선택해주세요'); return; }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5) : [];

  const btn = document.getElementById('submitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }

  // 이미지 압축
  let imageUrl = '';
  if (pendingImage) {
    try {
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 이미지 처리 중...';
      imageUrl = await compressImage(pendingImage);
    } catch (e) {
      console.warn('이미지 처리 실패:', e);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 등록하기'; }
      showToast('이미지 처리에 실패했습니다.'); return;
    }
  }

  // 파일 base64 변환
  let fileBase64 = null, fileName = '', fileSize = 0;
  if (pendingFile) {
    try {
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 파일 처리 중...';
      fileBase64 = await fileToBase64(pendingFile);
      fileName = pendingFile.name;
      fileSize = pendingFile.size;
    } catch (e) {
      console.warn('파일 처리 실패:', e);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 등록하기'; }
      showToast('파일 처리에 실패했습니다.'); return;
    }
  }

  // Firestore 저장
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  const id = await addResource({ title, category, content, tags, imageUrl, fileName, fileSize });

  if (id && fileBase64) {
    try {
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 파일 업로드 중...';
      await saveFileChunks(id, fileBase64);
    } catch (e) {
      console.warn('파일 청크 저장 실패:', e);
      showToast('파일 저장 중 오류가 발생했습니다.');
    }
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 등록하기'; }

  if (id) {
    closeWriteModal();
    await loadResources();
    showToast('자료가 등록되었습니다!');
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
    viewer.id = 'imgViewer'; viewer.className = 'res-img-viewer';
    viewer.onclick = () => viewer.classList.remove('open');
    document.body.appendChild(viewer);
  }
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return;
  viewer.innerHTML = `<img src="${safeUrl}" alt="확대 이미지"><button class="res-img-viewer-close"><i class="fas fa-times"></i></button>`;
  viewer.classList.add('open');
};

// =====================================================
// 유틸
// =====================================================
function showToast(msg) {
  let t = document.getElementById('resToast');
  if (!t) { t = document.createElement('div'); t.id = 'resToast'; t.className = 'res-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// =====================================================
// DOM 초기화
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.res-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.res-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCat = tab.dataset.cat;
      renderResources();
    });
  });

  const searchEl = document.getElementById('searchInput');
  if (searchEl) {
    let debounce;
    searchEl.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { searchQuery = searchEl.value.trim(); renderResources(); }, 300);
    });
  }

  const contentEl = document.getElementById('writeContent');
  const charCount = document.getElementById('charCount');
  if (contentEl && charCount) contentEl.addEventListener('input', () => { charCount.textContent = contentEl.value.length; });

  window.toggleMobileNav = function () { document.getElementById('clsNav').classList.toggle('open'); };
  window.addEventListener('scroll', () => {
    const header = document.getElementById('clsHeader');
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
  });

  updateWriteBtn();
  if (!fbReady) { hideLoading(); renderResources(); updateStats(); }
});
