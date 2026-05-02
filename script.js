// === Hero Interactive Canvas - Enhanced Neural Network ===
const heroCanvas = document.getElementById('heroCanvas');
const heroCtx = heroCanvas.getContext('2d');
let nodes = [];
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

function resizeHeroCanvas() {
  const hero = document.getElementById('hero');
  heroCanvas.width = hero.offsetWidth;
  heroCanvas.height = hero.offsetHeight;
}

function createNodes() {
  nodes = [];
  const area = heroCanvas.width * heroCanvas.height;
  const count = Math.min(Math.floor(area / 8000), 160);
  for (let i = 0; i < count; i++) {
    const isStar = Math.random() < 0.12; // 12% chance to be a "star" node
    nodes.push({
      x: Math.random() * heroCanvas.width,
      y: Math.random() * heroCanvas.height,
      size: isStar ? Math.random() * 3 + 2.5 : Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: isStar ? Math.random() * 0.5 + 0.4 : Math.random() * 0.5 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseOffset: Math.random() * Math.PI * 2,
      isStar,
      hue: isStar ? (Math.random() < 0.5 ? 270 : 300) : 265, // purple or fuchsia
    });
  }
}

// Pulse wave system
let pulseWaves = [];
function addPulseWave() {
  const cx = heroCanvas.width / 2;
  const cy = heroCanvas.height / 2;
  pulseWaves.push({ x: cx, y: cy, radius: 0, maxRadius: Math.max(heroCanvas.width, heroCanvas.height) * 0.6, opacity: 0.15 });
}
setInterval(addPulseWave, 4000);

function drawHeroCanvas() {
  heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
  const time = Date.now() * 0.001;

  // Draw pulse waves
  pulseWaves.forEach((wave, idx) => {
    wave.radius += 1.5;
    wave.opacity *= 0.995;
    if (wave.opacity < 0.005) { pulseWaves.splice(idx, 1); return; }
    heroCtx.beginPath();
    heroCtx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    heroCtx.strokeStyle = `rgba(139, 92, 246, ${wave.opacity})`;
    heroCtx.lineWidth = 1;
    heroCtx.stroke();
  });

  // Draw connections first (behind nodes)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 160;
      if (dist < maxDist) {
        const alpha = 0.1 * (1 - dist / maxDist);
        heroCtx.beginPath();
        heroCtx.moveTo(nodes[i].x, nodes[i].y);
        heroCtx.lineTo(nodes[j].x, nodes[j].y);
        // Use gradient for star connections
        if (nodes[i].isStar || nodes[j].isStar) {
          heroCtx.strokeStyle = `rgba(167, 139, 250, ${alpha * 1.5})`;
          heroCtx.lineWidth = 0.8;
        } else {
          heroCtx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
          heroCtx.lineWidth = 0.5;
        }
        heroCtx.stroke();
      }
    }
  }

  // Mouse proximity connections - brighter
  nodes.forEach(n => {
    const dx = mouse.x - n.x;
    const dy = mouse.y - n.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 280) {
      const alpha = 0.18 * (1 - dist / 280);
      heroCtx.beginPath();
      heroCtx.moveTo(n.x, n.y);
      heroCtx.lineTo(mouse.x, mouse.y);
      heroCtx.strokeStyle = `rgba(217, 70, 239, ${alpha})`;
      heroCtx.lineWidth = 0.8;
      heroCtx.stroke();
    }
  });

  // Draw nodes
  nodes.forEach(n => {
    const pulse = Math.sin(time * n.pulseSpeed * 60 + n.pulseOffset) * 0.5 + 0.5;

    // Mouse repulsion
    const dx = mouse.x - n.x;
    const dy = mouse.y - n.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 180) {
      const force = (180 - dist) / 180 * 0.25;
      n.x -= dx * force * 0.015;
      n.y -= dy * force * 0.015;
    }

    // Move
    n.x += n.speedX;
    n.y += n.speedY;
    if (n.x < 0 || n.x > heroCanvas.width) n.speedX *= -1;
    if (n.y < 0 || n.y > heroCanvas.height) n.speedY *= -1;
    n.x = Math.max(0, Math.min(heroCanvas.width, n.x));
    n.y = Math.max(0, Math.min(heroCanvas.height, n.y));

    const currentSize = n.size * (0.8 + pulse * 0.4);

    // Star nodes get special glow
    if (n.isStar) {
      // Outer glow
      const glowRadius = currentSize * 6;
      const glow = heroCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowRadius);
      glow.addColorStop(0, `rgba(${n.hue === 270 ? '139, 92, 246' : '217, 70, 239'}, ${0.12 * pulse})`);
      glow.addColorStop(0.5, `rgba(${n.hue === 270 ? '124, 58, 237' : '217, 70, 239'}, ${0.04 * pulse})`);
      glow.addColorStop(1, 'transparent');
      heroCtx.beginPath();
      heroCtx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
      heroCtx.fillStyle = glow;
      heroCtx.fill();

      // Inner bright core
      heroCtx.beginPath();
      heroCtx.arc(n.x, n.y, currentSize, 0, Math.PI * 2);
      heroCtx.fillStyle = `rgba(255, 255, 255, ${n.opacity * (0.7 + pulse * 0.3)})`;
      heroCtx.fill();

      // Color ring
      heroCtx.beginPath();
      heroCtx.arc(n.x, n.y, currentSize * 1.5, 0, Math.PI * 2);
      heroCtx.strokeStyle = `rgba(${n.hue === 270 ? '167, 139, 250' : '217, 70, 239'}, ${0.3 * pulse})`;
      heroCtx.lineWidth = 0.5;
      heroCtx.stroke();
    } else {
      // Regular nodes
      heroCtx.beginPath();
      heroCtx.arc(n.x, n.y, currentSize, 0, Math.PI * 2);
      heroCtx.fillStyle = `rgba(167, 139, 250, ${n.opacity * (0.5 + pulse * 0.5)})`;
      heroCtx.fill();
    }
  });

  // Mouse glow on canvas
  const mouseGlow = heroCtx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
  mouseGlow.addColorStop(0, 'rgba(124, 58, 237, 0.06)');
  mouseGlow.addColorStop(0.5, 'rgba(217, 70, 239, 0.02)');
  mouseGlow.addColorStop(1, 'transparent');
  heroCtx.beginPath();
  heroCtx.arc(mouse.x, mouse.y, 120, 0, Math.PI * 2);
  heroCtx.fillStyle = mouseGlow;
  heroCtx.fill();

  requestAnimationFrame(drawHeroCanvas);
}

resizeHeroCanvas();
createNodes();
addPulseWave();
drawHeroCanvas();

window.addEventListener('resize', () => {
  resizeHeroCanvas();
  createNodes();
});

// === Mouse Glow Follower ===
const heroSection = document.getElementById('hero');
const heroMouseGlow = document.getElementById('heroMouseGlow');

heroSection.addEventListener('mousemove', (e) => {
  const rect = heroSection.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  heroMouseGlow.style.left = mouse.x + 'px';
  heroMouseGlow.style.top = mouse.y + 'px';
});

heroSection.addEventListener('mouseleave', () => {
  mouse.x = heroCanvas.width / 2;
  mouse.y = heroCanvas.height / 2;
  heroMouseGlow.style.left = '50%';
  heroMouseGlow.style.top = '50%';
});

// === Remove global particles canvas ===
const globalCanvas = document.getElementById('particles');
if (globalCanvas) globalCanvas.style.display = 'none';

// === Navigation ===
const nav = document.getElementById('nav');
const backToTop = document.getElementById('backToTop');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
  backToTop.classList.toggle('visible', window.scrollY > 400);
});

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('active'));
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// === Scroll Animations ===
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(
  '.bento-card, .program-card-v2, .instructor-hero, .instructor-card-v2, .stat-glass, .partner-glass, .testimonial-glass, .contact-pill, .contact-kakao-card'
).forEach((el, index) => {
  el.classList.add('animate-in');
  el.style.transitionDelay = `${(index % 4) * 0.1}s`;
  observer.observe(el);
});

// === YouTube Latest Video Loader ===
(function loadYoutubeLatest() {
  // rss2json을 이용해 유튜브 채널의 최신 영상을 API키 없이 불러옵니다.
  // YouTube 채널 ID (UCxxxxxxxx 형식) - 채널 페이지 소스에서 확인 가능
  const CHANNEL_ID = 'UCsujung_world'; // ← 실제 채널 ID로 교체 필요

  const rssUrl = `https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}&api_key=free`;

  const frame = document.getElementById('youtubeLatestFrame');
  const loading = document.getElementById('youtubeLoading');
  const titleEl = document.getElementById('youtubeTitle');
  if (!frame) return;

  fetch(rssUrl)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok' && data.items && data.items.length > 0) {
        const item = data.items[0];
        const videoId = item.link.includes('v=')
          ? item.link.split('v=')[1].split('&')[0]
          : item.link.split('/').pop();
        frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
        frame.classList.add('loaded');
        if (loading) loading.classList.add('hide');
        if (titleEl) titleEl.textContent = item.title;
      }
    })
    .catch(() => {
      // API 실패 시 채널 링크로 대체
      if (loading) loading.innerHTML = '<i class="fab fa-youtube"></i><span>채널에서 최신 영상을 확인하세요</span>';
    });
})();

// === Active Nav Highlighting ===
const sections = document.querySelectorAll('section[id]');
const navLinkItems = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinkItems.forEach(link => {
    link.parentElement.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.parentElement.classList.add('active');
    }
  });
});
