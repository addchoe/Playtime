/* ── NAV (main.html / washup.html과 공통) ── */
function updateTime() {
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('nav-time').textContent = h + ':' + m + ' ' + ampm;
}
updateTime();
setInterval(updateTime, 1000);

let isOpen = false;
function toggleNav() { isOpen ? closeNav() : openNav(); }
function openNav() {
  isOpen = true;
  document.getElementById('nav-pill').classList.add('open');
  document.getElementById('nav-overlay').classList.add('open');
}
function closeNav() {
  isOpen = false;
  document.getElementById('nav-pill').classList.remove('open');
  document.getElementById('nav-overlay').classList.remove('open');
}

/* ── READY FOR SLEEP: 설정 ── */
const RFS_ASSET_DIR = '../public/assets/ready-for-sleep/';

const RFS_CUTS = [
  {
    id: 1,
    title: 'Cut 1',
    caption: '형도니잠',
    objectSrc: RFS_ASSET_DIR + 'cut-1-object.png',
    box: { left: -27.03, top: 26.00, width: 123.32, height: 123.16, rotate: 90 },
  },
  {
    id: 2,
    title: 'Cut 2',
    caption: '릴러말즈',
    objectSrc: RFS_ASSET_DIR + 'cut-2-object.png',
    box: { left: -18.33, top: -18.04, width: 117.71, height: 259.48, rotate: 11.27 },
  },
  {
    id: 3,
    title: 'Cut 3',
    caption: '명수옹',
    objectSrc: RFS_ASSET_DIR + 'cut-3-object.png',
    box: { left: 26.29, top: -19.26, width: 111.89, height: 159.13, rotate: -31.7 },
  },
  {
    id: 4,
    title: 'Cut 4',
    caption: '형도니 앵콜',
    objectSrc: RFS_ASSET_DIR + 'cut-4-object.png',
    box: { left: 42.21, top: -11.35, width: 86.34, height: 122.85, rotate: 0 },
  },
];

const RFS_COUNTDOWN_IMAGES = {
  3: RFS_ASSET_DIR + 'countdown-3.png',
  2: RFS_ASSET_DIR + 'countdown-2.png',
  1: RFS_ASSET_DIR + 'countdown-1.png',
};

const RFS_FRAME_SRC = RFS_ASSET_DIR + 'four-cut-frame.png';
const RFS_FRAME_SIZE = { width: 258, height: 678 };
const RFS_FRAME_SLOTS = [
  { left: 5.814, top: 2.212, width: 88.369, height: 18.917 },
  { left: 5.814, top: 22.660, width: 88.369, height: 18.917 },
  { left: 5.814, top: 43.109, width: 88.369, height: 18.917 },
  { left: 5.814, top: 63.558, width: 88.369, height: 18.917 },
];

const RFS_MAIN_TIME = 30;
const RFS_MAX_RETAKE = 3;

/* ── READY FOR SLEEP: 상태 ── */
let rfsVideoEl, rfsObjectImgEl, rfsCapturedImgEl;
let rfsCountdownOverlayEl, rfsCountdownImgEl;
let rfsCameraStatusEl, rfsCameraStatusTextEl, rfsPermissionEl, rfsPermissionTextEl;
let rfsCutTitleEl, rfsCutCaptionEl, rfsViewportEl;
let rfsTimerRingEl, rfsTimerNumEl;
let rfsRetakeBtnEl, rfsRetakeCountEl, rfsShutterBtnEl, rfsNextBtnEl;
let rfsCaptureStatusEl, rfsFinalCanvasEl, rfsToastEl;

let rfsStream = null;
let rfsCurrentCutIndex = 0;
let rfsCapturedPhotos = [null, null, null, null];
let rfsRetakeCounts = { cut1: 0, cut2: 0, cut3: 0, cut4: 0 };
let rfsTimeLeft = RFS_MAIN_TIME;
let rfsMainTimerId = null;
let rfsCountdownTimerId = null;
let rfsIsCountingDown = false;
let rfsIsCapturing = false;
let rfsCutState = 'idle'; // 'idle' | 'captured'
let rfsToastTimerId = null;

function rfsCacheDom() {
  rfsVideoEl = document.getElementById('rfs-video');
  rfsObjectImgEl = document.getElementById('rfs-object-img');
  rfsCapturedImgEl = document.getElementById('rfs-captured-img');
  rfsCountdownOverlayEl = document.getElementById('rfs-countdown-overlay');
  rfsCountdownImgEl = document.getElementById('rfs-countdown-img');
  rfsCameraStatusEl = document.getElementById('rfs-camera-status');
  rfsCameraStatusTextEl = document.getElementById('rfs-camera-status-text');
  rfsPermissionEl = document.getElementById('rfs-permission');
  rfsPermissionTextEl = document.getElementById('rfs-permission-text');
  rfsCutTitleEl = document.getElementById('rfs-cut-title');
  rfsCutCaptionEl = document.getElementById('rfs-cut-caption');
  rfsViewportEl = document.getElementById('rfs-viewport');
  rfsTimerRingEl = document.getElementById('rfs-timer-ring');
  rfsTimerNumEl = document.getElementById('rfs-timer-num');
  rfsRetakeBtnEl = document.getElementById('rfs-retake-btn');
  rfsRetakeCountEl = document.getElementById('rfs-retake-count');
  rfsShutterBtnEl = document.getElementById('rfs-shutter-btn');
  rfsNextBtnEl = document.getElementById('rfs-next-btn');
  rfsCaptureStatusEl = document.getElementById('rfs-capture-status');
  rfsFinalCanvasEl = document.getElementById('rfs-final-canvas');
  rfsToastEl = document.getElementById('rfs-toast');
}

/* ── 화면 전환 (디졸브) ── */
function rfsShowScreen(id) {
  const current = document.querySelector('.rfs-screen.active');
  const next = document.getElementById(id);
  if (!next || current === next) return;
  if (current) {
    current.classList.add('rfs-fade-out');
    setTimeout(() => {
      current.classList.remove('active', 'rfs-fade-out');
    }, 350);
  }
  next.classList.add('active', 'rfs-fade-in');
  setTimeout(() => next.classList.remove('rfs-fade-in'), 350);
}

/* ── 웹캠 ── */
async function requestRfsCamera() {
  rfsPermissionEl.hidden = true;
  rfsSetCameraStatus('connecting', '카메라 연결 중…');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    rfsSetCameraStatus('denied', '카메라 미지원');
    rfsPermissionTextEl.textContent = '이 브라우저는 카메라를 지원하지 않습니다.';
    rfsPermissionEl.hidden = false;
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    rfsStream = stream;
    rfsVideoEl.srcObject = stream;
    await rfsVideoEl.play().catch(() => {});
    rfsSetCameraStatus('active', '카메라 연결됨');
  } catch (err) {
    rfsSetCameraStatus('denied', '카메라 권한 필요');
    rfsPermissionTextEl.textContent = '카메라 권한이 거부되었거나 사용할 수 없습니다. 권한을 허용한 뒤 다시 시도해 주세요.';
    rfsPermissionEl.hidden = false;
  }
}

function rfsSetCameraStatus(kind, text) {
  rfsCameraStatusEl.classList.remove('active', 'denied');
  if (kind === 'active') rfsCameraStatusEl.classList.add('active');
  if (kind === 'denied') rfsCameraStatusEl.classList.add('denied');
  rfsCameraStatusTextEl.textContent = text;
}

function rfsStopCamera() {
  if (rfsStream) {
    rfsStream.getTracks().forEach((t) => t.stop());
    rfsStream = null;
  }
  if (rfsVideoEl) rfsVideoEl.srcObject = null;
}

/* ── Cut 오브젝트 이미지 배치 ── */
function rfsApplyObjectBox(imgEl, box) {
  imgEl.style.left = box.left + '%';
  imgEl.style.top = box.top + '%';
  imgEl.style.width = box.width + '%';
  imgEl.style.height = box.height + '%';
  imgEl.style.transform = 'rotate(' + box.rotate + 'deg)';
  imgEl.style.objectPosition = box.align === 'left' ? 'left center' : '50% 50%';
}

/* ── 30초 제한 시간 ── */
function rfsStartMainTimer() {
  rfsClearMainTimer();
  rfsTimeLeft = RFS_MAIN_TIME;
  rfsUpdateTimerDisplay();
  rfsMainTimerId = setInterval(() => {
    rfsTimeLeft -= 1;
    rfsUpdateTimerDisplay();
    if (rfsTimeLeft <= 0) {
      rfsClearMainTimer();
      rfsAutoCapture();
    }
  }, 1000);
}
function rfsClearMainTimer() {
  if (rfsMainTimerId) {
    clearInterval(rfsMainTimerId);
    rfsMainTimerId = null;
  }
}
function rfsUpdateTimerDisplay() {
  rfsTimerNumEl.textContent = String(Math.max(0, rfsTimeLeft));
  rfsTimerRingEl.classList.toggle('rfs-timer-low', rfsTimeLeft <= 5);
}

function rfsClearCountdownTimer() {
  if (rfsCountdownTimerId) {
    clearInterval(rfsCountdownTimerId);
    rfsCountdownTimerId = null;
  }
  rfsIsCountingDown = false;
  if (rfsCountdownOverlayEl) rfsCountdownOverlayEl.hidden = true;
}

/* ── Cut 화면 진입 ── */
function rfsShowCapture(index) {
  rfsClearMainTimer();
  rfsClearCountdownTimer();
  rfsIsCapturing = false;
  rfsCurrentCutIndex = index;
  const cut = RFS_CUTS[index];

  rfsCutTitleEl.textContent = cut.title;
  rfsCutCaptionEl.textContent = cut.caption;
  rfsObjectImgEl.src = cut.objectSrc;
  rfsApplyObjectBox(rfsObjectImgEl, cut.box);
  rfsObjectImgEl.style.visibility = 'visible';
  rfsVideoEl.style.visibility = 'visible';
  rfsCapturedImgEl.hidden = true;
  rfsCapturedImgEl.removeAttribute('src');

  rfsCutState = 'idle';
  rfsShutterBtnEl.disabled = false;
  rfsNextBtnEl.disabled = true;
  rfsNextBtnEl.setAttribute('aria-disabled', 'true');
  rfsUpdateRetakeUI();
  rfsCaptureStatusEl.textContent = cut.title + ' 촬영 준비';

  rfsShowScreen('rfs-screen-capture');
  rfsStartMainTimer();
}

function rfsUpdateRetakeUI() {
  const cut = RFS_CUTS[rfsCurrentCutIndex];
  const key = 'cut' + cut.id;
  const count = rfsRetakeCounts[key];
  rfsRetakeCountEl.textContent = count + '/' + RFS_MAX_RETAKE;
  const maxed = count >= RFS_MAX_RETAKE;
  rfsRetakeBtnEl.disabled = maxed;
  rfsRetakeBtnEl.setAttribute('aria-disabled', String(maxed));
}

/* ── 촬영 (수동/자동 공통) ── */
function rfsManualCapture() {
  if (rfsIsCountingDown || rfsIsCapturing || rfsCutState !== 'idle') return;
  rfsClearMainTimer();
  rfsRunCountdown();
}

function rfsAutoCapture() {
  if (rfsIsCountingDown || rfsIsCapturing || rfsCutState !== 'idle') return;
  rfsDoCapture();
}

function rfsRunCountdown() {
  rfsIsCountingDown = true;
  rfsShutterBtnEl.disabled = true;
  let n = 3;
  rfsCountdownOverlayEl.hidden = false;
  rfsCountdownImgEl.src = RFS_COUNTDOWN_IMAGES[n];
  rfsCountdownTimerId = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(rfsCountdownTimerId);
      rfsCountdownTimerId = null;
      rfsCountdownOverlayEl.hidden = true;
      rfsIsCountingDown = false;
      rfsDoCapture();
      return;
    }
    rfsCountdownImgEl.src = RFS_COUNTDOWN_IMAGES[n];
  }, 1000);
}

function rfsLoadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed: ' + src));
    img.src = src;
  });
}

function rfsDrawImageCover(ctx, img, dx, dy, dw, dh, align) {
  const nw = img.naturalWidth || img.videoWidth || img.width;
  const nh = img.naturalHeight || img.videoHeight || img.height;
  const scale = Math.max(dw / nw, dh / nh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = align === 'left' ? 0 : (nw - sw) / 2;
  const sy = (nh - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

async function rfsDoCapture() {
  if (rfsIsCapturing) return;
  rfsIsCapturing = true;
  rfsShutterBtnEl.disabled = true;

  const cut = RFS_CUTS[rfsCurrentCutIndex];
  try {
    const objImg = await rfsLoadImage(cut.objectSrc);

    const canvas = document.createElement('canvas');
    canvas.width = 1097;
    canvas.height = 617;
    const ctx = canvas.getContext('2d');

    if (rfsStream && rfsVideoEl.readyState >= 2) {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      rfsDrawImageCover(ctx, rfsVideoEl, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const ow = (canvas.width * cut.box.width) / 100;
    const oh = (canvas.height * cut.box.height) / 100;
    const ox = (canvas.width * cut.box.left) / 100;
    const oy = (canvas.height * cut.box.top) / 100;
    ctx.save();
    ctx.translate(ox + ow / 2, oy + oh / 2);
    ctx.rotate((cut.box.rotate * Math.PI) / 180);
    rfsDrawImageCover(ctx, objImg, -ow / 2, -oh / 2, ow, oh, cut.box.align);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');
    rfsCapturedPhotos[rfsCurrentCutIndex] = dataUrl;
    rfsCutState = 'captured';
    rfsCapturedImgEl.src = dataUrl;
    rfsCapturedImgEl.hidden = false;
    rfsVideoEl.style.visibility = 'hidden';
    rfsObjectImgEl.style.visibility = 'hidden';
    rfsNextBtnEl.disabled = false;
    rfsNextBtnEl.setAttribute('aria-disabled', 'false');
    rfsCaptureStatusEl.textContent = cut.title + ' 촬영 완료';
  } catch (err) {
    console.error('[ready-for-sleep] capture failed', err);
    rfsShowToast('사진을 저장하지 못했어요. 다시 시도해 주세요.', true);
    rfsShutterBtnEl.disabled = false;
  } finally {
    rfsIsCapturing = false;
  }
}

/* ── 다시 촬영하기 ── */
function rfsRetake() {
  if (rfsIsCountingDown || rfsIsCapturing) return;
  const cut = RFS_CUTS[rfsCurrentCutIndex];
  const key = 'cut' + cut.id;
  if (rfsRetakeCounts[key] >= RFS_MAX_RETAKE) return;

  rfsRetakeCounts[key] += 1;
  rfsCapturedPhotos[rfsCurrentCutIndex] = null;
  rfsCutState = 'idle';
  rfsCapturedImgEl.hidden = true;
  rfsCapturedImgEl.removeAttribute('src');
  rfsVideoEl.style.visibility = 'visible';
  rfsObjectImgEl.style.visibility = 'visible';
  rfsShutterBtnEl.disabled = false;
  rfsNextBtnEl.disabled = true;
  rfsNextBtnEl.setAttribute('aria-disabled', 'true');
  rfsUpdateRetakeUI();
  rfsCaptureStatusEl.textContent = '다시 촬영을 시작합니다';
  rfsStartMainTimer();
}

/* ── 다음 촬영하기 ── */
function rfsGoNext() {
  if (rfsNextBtnEl.disabled) return;
  if (rfsCurrentCutIndex < RFS_CUTS.length - 1) {
    rfsShowCapture(rfsCurrentCutIndex + 1);
  } else {
    rfsStartResultFlow();
  }
}

/* ── 결과 이미지 생성 ── */
function rfsComposeFinalImage() {
  return new Promise((resolve, reject) => {
    if (rfsCapturedPhotos.some((p) => !p)) {
      reject(new Error('missing captured photo'));
      return;
    }
    const scale = 3;
    const W = RFS_FRAME_SIZE.width * scale;
    const H = RFS_FRAME_SIZE.height * scale;

    const canvas = rfsFinalCanvasEl;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    Promise.all([rfsLoadImage(RFS_FRAME_SRC), ...rfsCapturedPhotos.map((src) => rfsLoadImage(src))])
      .then(([frameImg, ...photoImgs]) => {
        ctx.drawImage(frameImg, 0, 0, W, H);

        photoImgs.forEach((img, i) => {
          const slot = RFS_FRAME_SLOTS[i];
          const x = (slot.left / 100) * W;
          const y = (slot.top / 100) * H;
          const w = (slot.width / 100) * W;
          const h = (slot.height / 100) * H;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          rfsDrawImageCover(ctx, img, x, y, w, h);
          ctx.restore();
        });
        resolve();
      })
      .catch(reject);
  });
}

function rfsStartResultFlow() {
  rfsClearMainTimer();
  rfsClearCountdownTimer();
  rfsShowScreen('rfs-screen-result-loading');
  setTimeout(() => {
    rfsComposeFinalImage()
      .then(() => {
        rfsShowScreen('rfs-screen-result');
      })
      .catch((err) => {
        console.error('[ready-for-sleep] compose failed', err);
        rfsShowToast('이미지를 만들지 못했어요. 다시 시도해 주세요.', true);
        rfsShowScreen('rfs-screen-capture');
      });
  }, 1200);
}

/* ── 마지막 결과 화면 동작 ── */
function rfsRetakeAll() {
  rfsCapturedPhotos = [null, null, null, null];
  rfsRetakeCounts = { cut1: 0, cut2: 0, cut3: 0, cut4: 0 };
  rfsShowCapture(0);
}

function rfsSaveImage() {
  try {
    const dataUrl = rfsFinalCanvasEl.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'playtime-ready-for-sleep.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    rfsShowToast('저장이 완료됐어요');
  } catch (err) {
    console.error('[ready-for-sleep] save failed', err);
    rfsShowToast('저장에 실패했어요. 다시 시도해 주세요.', true);
  }
}

async function rfsShareImage() {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error('clipboard image copy unsupported');
    }
    const blob = await new Promise((resolve, reject) => {
      rfsFinalCanvasEl.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    rfsShowToast('이미지가 복사됐어요!');
  } catch (err) {
    console.error('[ready-for-sleep] share failed', err);
    rfsShowToast('이미지 복사를 지원하지 않거나 권한이 없어요.', true);
  }
}

/* ── 토스트 ── */
function rfsShowToast(message, isError) {
  rfsToastEl.textContent = message;
  rfsToastEl.classList.toggle('rfs-toast--error', !!isError);
  rfsToastEl.hidden = false;
  requestAnimationFrame(() => rfsToastEl.classList.add('show'));
  if (rfsToastTimerId) clearTimeout(rfsToastTimerId);
  rfsToastTimerId = setTimeout(() => {
    rfsToastEl.classList.remove('show');
    setTimeout(() => {
      rfsToastEl.hidden = true;
    }, 250);
  }, 2600);
}

/* ── 초기화 ── */
function rfsInit() {
  rfsCacheDom();
  requestRfsCamera();
  setTimeout(() => {
    rfsShowCapture(0);
  }, 1800);
}

window.addEventListener('pagehide', () => {
  rfsStopCamera();
  rfsClearMainTimer();
  rfsClearCountdownTimer();
});

rfsInit();
