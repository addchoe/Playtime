/* ── GNB SCALE (main.html과 공통) ── */
let uiScale = 1;
function fitViewport() {
  uiScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('viewport-scale').style.transform = 'scale(' + uiScale + ')';
}
fitViewport();
window.addEventListener('resize', fitViewport);

/* ── NAV (공통) ── */
function sbFormatTime(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}
function updateTime() {
  document.getElementById('nav-time').textContent = sbFormatTime(new Date());
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

/* ── SECRET BREAK: 설정 ── */
const SB_ASSET_DIR = '../public/assets/secret-break/';
const SB_DOOR_CLOSED_SRC = SB_ASSET_DIR + 'door-closed.svg';
const SB_DOOR_OPEN_SRC = SB_ASSET_DIR + 'door-open.svg';
const SB_TOILET_SRC = SB_ASSET_DIR + 'toilet.png';
const SB_MASCOT_SRC = SB_ASSET_DIR + 'mascot.svg';

const SB_SLOT_CENTERS = [29.90, 51.36, 72.81]; // .sb-game-area(1280px 고정 폭) 기준 %, 각 슬롯 중앙 x (말풍선 위치 계산용)

const SB_LEVEL_CONFIG = {
  1: { shuffleDuration: 3000, stepInterval: 500 },
  2: { shuffleDuration: 2200, stepInterval: 275 },
  3: { shuffleDuration: 1500, stepInterval: 150 },
};
const SB_MAX_LEVEL = 3;
const SB_REVEAL_DURATION = 1600;
const SB_CLOSE_PAUSE = 350;
const SB_JUDGE_PAUSE = 1500;
const SB_LOADING_DURATION = 2500;

/* ── SECRET BREAK: 상태 ── */
let sbLevelBadgeEl;
let sbSlotEls;       // [slot0, slot1, slot2] — 고정 위치 컨테이너, 절대 이동하지 않음
let sbDoorGroupEls;  // [group0, group1, group2] — hiddenContent+door 묶음, 슬롯 사이를 이동
let sbDoorEls, sbDoorPanelEls, sbContentEls; // doorGroup 내부 요소 (원래 group index 기준, 안정적)
let sbGameBubbleEl, sbGameBubbleTextEl, sbStatusEl;
let sbPopupOverlayEl, sbPopupTitleEl, sbPopupSubEl;

let sbLevel = 1;
let sbGameState = 'idle'; // idle | reveal | closed | shuffling | selectable | judging
let sbTimers = [];
let sbShuffleIntervalId = null;
let sbSlotContents; // sbSlotContents[slotIndex] = 현재 그 슬롯에 들어있는 doorGroup 엘리먼트

function sbCacheDom() {
  sbLevelBadgeEl = document.getElementById('sb-level-badge');
  sbSlotEls = [0, 1, 2].map((i) => document.getElementById('sb-slot-' + i));
  sbDoorGroupEls = [0, 1, 2].map((i) => document.getElementById('sb-door-group-' + i));
  sbDoorEls = [0, 1, 2].map((i) => document.getElementById('sb-door-' + i));
  sbDoorPanelEls = [0, 1, 2].map((i) => document.getElementById('sb-door-panel-' + i));
  sbContentEls = [0, 1, 2].map((i) => document.getElementById('sb-content-' + i));
  sbGameBubbleEl = document.getElementById('sb-game-bubble');
  sbGameBubbleTextEl = document.getElementById('sb-game-bubble-text');
  sbStatusEl = document.getElementById('sb-status');
  sbPopupOverlayEl = document.getElementById('sb-popup-overlay');
  sbPopupTitleEl = document.getElementById('sb-popup-title');
  sbPopupSubEl = document.getElementById('sb-popup-sub');

  // 각 doorGroup을 자기 원래 슬롯 안에 배치
  sbSlotContents = sbSlotEls.map((slotEl, i) => {
    slotEl.appendChild(sbDoorGroupEls[i]);
    return sbDoorGroupEls[i];
  });

  sbDoorEls.forEach((door) => {
    door.addEventListener('click', () => sbOnDoorClick(door));
  });
}

function sbSlotIndexOfGroup(groupEl) {
  return sbSlotContents.indexOf(groupEl);
}

/* ── 타이머 관리 ── */
function sbSetTimeout(fn, ms) {
  const id = setTimeout(fn, ms);
  sbTimers.push(id);
  return id;
}
function sbClearTimers() {
  sbTimers.forEach((id) => {
    clearTimeout(id);
    clearInterval(id);
  });
  sbTimers = [];
  if (sbShuffleIntervalId) {
    clearInterval(sbShuffleIntervalId);
    sbShuffleIntervalId = null;
  }
}

/* ── 화면 전환 (디졸브) ── */
function sbShowScreen(id) {
  const current = document.querySelector('.sb-screen.active');
  const next = document.getElementById(id);
  if (!next || current === next) return;
  if (current) {
    current.classList.add('sb-fade-out');
    sbSetTimeout(() => current.classList.remove('active', 'sb-fade-out'), 350);
  }
  next.classList.add('active', 'sb-fade-in');
  sbSetTimeout(() => next.classList.remove('sb-fade-in'), 350);
}

/* ── 문/콘텐츠 렌더링 ── */
function sbSetDoorState(index, state) {
  sbDoorEls[index].dataset.state = state;
  sbDoorPanelEls[index].src = state === 'closed' ? SB_DOOR_CLOSED_SRC : SB_DOOR_OPEN_SRC;
}
function sbSetAllDoors(state) {
  for (let i = 0; i < 3; i++) sbSetDoorState(i, state);
}
function sbSetDoorsSelectable(on) {
  sbDoorEls.forEach((door) => door.classList.toggle('sb-door--selectable', on));
}

/* 라운드 시작 시 한 번만 호출 — 이후 셔플이 끝나도 재배정하지 않음.
   doorGroup에 콘텐츠가 고정되어 있고, doorGroup 자체가 슬롯 사이를 이동한다. */
function sbAssignContentForRound() {
  const targetGroupIndex = Math.floor(Math.random() * 3);
  sbContentEls.forEach((img, i) => {
    if (i === targetGroupIndex) {
      img.src = SB_MASCOT_SRC;
      img.dataset.kind = 'mascot';
    } else {
      img.src = SB_TOILET_SRC;
      img.dataset.kind = 'toilet';
    }
  });
}

function sbFindTargetSlotIndex() {
  return sbSlotContents.findIndex((groupEl) => {
    const content = groupEl.querySelector('.sb-hidden-content');
    return content.dataset.kind === 'mascot';
  });
}

function sbShowBubble(text, slotIndex) {
  sbGameBubbleTextEl.textContent = text;
  sbGameBubbleEl.style.left = (SB_SLOT_CENTERS[slotIndex] + 3) + '%';
  sbGameBubbleEl.hidden = false;
}
function sbHideBubble() {
  sbGameBubbleEl.hidden = true;
}

/* ── 라운드 진행 ── */
function sbStartRound() {
  sbGameState = 'reveal';
  sbHideBubble();
  sbSetDoorsSelectable(false);
  sbLevelBadgeEl.textContent = 'Lv.' + sbLevel;
  sbAssignContentForRound();
  sbSetAllDoors('open');
  sbStatusEl.textContent = 'Lv.' + sbLevel + ' 시작. 빈 칸 위치를 확인하세요.';

  sbSetTimeout(sbCloseRound, SB_REVEAL_DURATION);
}

function sbCloseRound() {
  sbGameState = 'closed';
  sbSetAllDoors('closed');
  sbSetTimeout(sbStartShuffle, SB_CLOSE_PAUSE);
}

/* doorGroup을 슬롯 사이에서 한 번 무작위로 재배치 (FLIP: 이동 전/후 위치를 측정해 자연스럽게 슬라이드) */
function sbShuffleOnce(stepDurationMs) {
  const firstRects = sbDoorGroupEls.map((g) => g.getBoundingClientRect());

  for (let i = sbSlotContents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = sbSlotContents[i];
    sbSlotContents[i] = sbSlotContents[j];
    sbSlotContents[j] = tmp;
  }
  sbSlotEls.forEach((slotEl, i) => slotEl.appendChild(sbSlotContents[i]));

  sbDoorGroupEls.forEach((g, idx) => {
    const last = g.getBoundingClientRect();
    const first = firstRects[idx];
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (!dx && !dy) return;
    g.style.transition = 'none';
    g.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    void g.offsetWidth; // 강제 리플로우로 transition:none을 확정시킴
    requestAnimationFrame(() => {
      g.style.transition = 'transform ' + stepDurationMs + 'ms ease-in-out';
      g.style.transform = 'translate(0px, 0px)';
    });
  });
}

function sbStartShuffle() {
  sbGameState = 'shuffling';
  sbStatusEl.textContent = '섞는 중...';
  const cfg = SB_LEVEL_CONFIG[sbLevel];
  const steps = Math.max(3, Math.round(cfg.shuffleDuration / cfg.stepInterval));
  const stepAnimMs = Math.max(120, cfg.stepInterval - 40);
  let step = 0;

  sbShuffleIntervalId = setInterval(() => {
    step++;
    sbShuffleOnce(stepAnimMs);
    if (step >= steps) {
      clearInterval(sbShuffleIntervalId);
      sbShuffleIntervalId = null;
      sbFinishShuffle();
    }
  }, cfg.stepInterval);
}

function sbFinishShuffle() {
  sbGameState = 'selectable';
  sbSetDoorsSelectable(true);
  sbStatusEl.textContent = '빈 칸을 골라보세요.';
}

/* ── 선택 및 판정 ── */
function sbOnDoorClick(doorEl) {
  if (sbGameState !== 'selectable') return;
  const groupEl = doorEl.closest('.sb-door-group');
  const slotIndex = sbSlotIndexOfGroup(groupEl);
  const clickedContent = groupEl.querySelector('.sb-hidden-content');

  sbGameState = 'judging';
  sbSetDoorsSelectable(false);
  sbSetAllDoors('open');

  const correct = clickedContent.dataset.kind === 'mascot';
  const targetSlotIndex = correct ? slotIndex : sbFindTargetSlotIndex();
  sbShowBubble(correct ? '제법인데~' : '여기였어~', targetSlotIndex);
  sbStatusEl.textContent = correct ? '정답입니다!' : '틀렸습니다.';

  sbSetTimeout(() => {
    if (correct) {
      sbOnCorrect();
    } else {
      sbOnWrong();
    }
  }, SB_JUDGE_PAUSE);
}

function sbOnCorrect() {
  sbHideBubble();
  if (sbLevel >= SB_MAX_LEVEL) {
    sbShowPopup('success');
    return;
  }
  sbSetAllDoors('closed');
  sbSetTimeout(() => {
    sbLevel += 1;
    sbStartRound();
  }, SB_CLOSE_PAUSE);
}

function sbOnWrong() {
  sbHideBubble();
  sbShowPopup('fail');
}

/* ── 팝업 ── */
function sbShowPopup(type) {
  sbGameState = 'idle';
  if (type === 'success') {
    sbPopupTitleEl.textContent = 'Good~';
    sbPopupSubEl.textContent = '월루 잡기 제법인데?';
  } else {
    sbPopupTitleEl.textContent = 'Try again!';
    sbPopupSubEl.textContent = '월루 범인 찾기 실패!';
  }
  sbPopupOverlayEl.hidden = false;
}

function sbRetry() {
  sbPopupOverlayEl.hidden = true;
  sbClearTimers();
  sbLevel = 1;
  sbStartRound();
}

function sbQuit() {
  sbClearTimers();
  window.location.href = '../main.html';
}

/* ── 초기화 ── */
function sbInit() {
  sbCacheDom();
  sbSetTimeout(() => {
    sbShowScreen('sb-screen-game');
    sbStartRound();
  }, SB_LOADING_DURATION);
}

window.addEventListener('pagehide', sbClearTimers);

sbInit();
