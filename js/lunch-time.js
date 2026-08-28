/* ── NAV (공통) ── */
function ltFormatTime(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}
function updateTime() {
  document.getElementById('nav-time').textContent = ltFormatTime(new Date());
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

/* ── 1920x1080 고정 디자인 캔버스를 화면에 맞춰 스케일 (index.html의 .viewport-scale과 동일 방식) ── */
function ltFitViewport() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('lt-viewport-scale').style.transform = 'scale(' + scale + ')';

  /* nav-overlay는 lt-viewport-scale 안에 중첩되어 함께 스케일되므로, 스케일 후에도
     실제 창 전체를 덮도록 축소분을 상쇄하는 크기로 역산해서 채워준다. */
  const overlay = document.getElementById('nav-overlay');
  const overscan = 4 / scale;
  const w = window.innerWidth / scale + overscan;
  const h = window.innerHeight / scale + overscan;
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';
  overlay.style.left = ((1920 - w) / 2) + 'px';
  overlay.style.top = ((1080 - h) / 2) + 'px';
}
ltFitViewport();
/* 매우 큰 해상도(4K 등)에서 페이지가 곧바로 로드되면 transform 계산은 정확해도
   브라우저 첫 페인트가 이를 놓쳐 콘텐츠가 좌상단에 눌린 채로 그려지는 경우가 있다
   — 다음 프레임에 한 번 더 재적용해서 그 스테일 페인트를 강제로 복구한다. */
requestAnimationFrame(ltFitViewport);
window.addEventListener('resize', ltFitViewport);

/* ── 화면 전환 (secret-break.js의 sbShowScreen과 동일한 패턴) ── */
function ltShowScreen(id) {
  const current = document.querySelector('.lt-screen.active');
  const next = document.getElementById(id);
  if (!next || current === next) return;
  if (current) {
    current.classList.add('lt-fade-out');
    setTimeout(() => current.classList.remove('active', 'lt-fade-out'), 350);
  }
  next.classList.add('active', 'lt-fade-in');
  setTimeout(() => next.classList.remove('lt-fade-in'), 350);
}

/* ── 룰렛 스핀 수학 (React 버전의 utils/wheel.ts와 동일) ── */
const LT_POINTER_ANGLE_DEG = 90;
function ltSegmentCenterAngleDeg(index, total) {
  const step = 360 / total;
  return -90 + step / 2 + index * step;
}
function ltNormalizeAngle(deg) {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}
function ltComputeSpinDelta(winnerIndex, total, extraSpins) {
  extraSpins = extraSpins === undefined ? 6 : extraSpins;
  const targetAngle = ltSegmentCenterAngleDeg(winnerIndex, total);
  const delta = ltNormalizeAngle(LT_POINTER_ANGLE_DEG - targetAngle);
  return delta + 360 * extraSpins;
}

/* ── Kakao Maps JS SDK 로더 ── */
const LT_SDK_ATTR = 'data-kakao-maps-sdk';
let ltKakaoLoadPromise = null;
function ltLoadKakaoMaps() {
  if (ltKakaoLoadPromise) return ltKakaoLoadPromise;

  const appKey = window.LT_KAKAO_JS_KEY;

  ltKakaoLoadPromise = new Promise((resolve, reject) => {
    if (!appKey) {
      ltKakaoLoadPromise = null;
      reject(new Error('카카오 JavaScript 키가 설정되지 않았습니다. js/lunch-time-config.js 파일에 LT_KAKAO_JS_KEY를 추가해주세요.'));
      return;
    }

    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[' + LT_SDK_ATTR + ']');
    if (existing) {
      existing.addEventListener('load', () => window.kakao.maps.load(resolve));
      existing.addEventListener('error', () => {
        ltKakaoLoadPromise = null;
        reject(new Error('카카오맵 SDK를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + appKey + '&libraries=services&autoload=false';
    script.async = true;
    script.setAttribute(LT_SDK_ATTR, 'true');
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = () => {
      ltKakaoLoadPromise = null;
      reject(new Error('카카오맵 SDK를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'));
    };
    document.head.appendChild(script);
  });

  return ltKakaoLoadPromise;
}

/* ── Kakao 장소/카테고리 검색 (React 버전의 api/kakao.ts와 동일) ── */
const LT_RESTAURANT_CATEGORY_GROUP_CODE = 'FD6';
const LT_MAX_PAGES = 3;
const LT_PAGE_SIZE = 15;

async function ltGetPlaces() {
  await ltLoadKakaoMaps();
  const kakao = window.kakao;
  if (!kakao) throw new Error('카카오맵 SDK가 로드되지 않았습니다.');
  return { kakao, places: new kakao.maps.services.Places() };
}

async function ltSearchPlacesByKeyword(query) {
  const { places } = await ltGetPlaces();
  return new Promise((resolve, reject) => {
    places.keywordSearch(
      query,
      (data, status) => {
        if (status === 'ZERO_RESULT') { resolve([]); return; }
        if (status !== 'OK') { reject(new Error('위치 검색 중 오류가 발생했습니다. 다시 시도해주세요.')); return; }
        resolve(data.map((doc) => ({
          id: doc.id,
          placeName: doc.place_name,
          addressName: doc.road_address_name || doc.address_name,
          x: doc.x,
          y: doc.y,
        })));
      },
      { size: LT_PAGE_SIZE },
    );
  });
}

async function ltReverseGeocode(x, y) {
  await ltLoadKakaoMaps();
  const kakao = window.kakao;
  if (!kakao) throw new Error('카카오맵 SDK가 로드되지 않았습니다.');
  const geocoder = new kakao.maps.services.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.coord2Address(Number(x), Number(y), (result, status) => {
      if (status !== 'OK' || !result[0]) { reject(new Error('현재 위치의 주소를 확인할 수 없습니다.')); return; }
      const doc = result[0];
      resolve((doc.road_address && doc.road_address.address_name) || (doc.address && doc.address.address_name) || '현재 위치');
    });
  });
}

function ltCategoryLabelFrom(categoryName) {
  const parts = categoryName.split(' > ');
  return parts[1] || '음식점';
}

function ltCategorySearchPage(places, location, radiusMeters, page) {
  return new Promise((resolve, reject) => {
    places.categorySearch(
      LT_RESTAURANT_CATEGORY_GROUP_CODE,
      (data, status, pagination) => {
        if (status === 'ZERO_RESULT') { resolve({ items: [], hasNextPage: false }); return; }
        if (status !== 'OK') { reject(new Error('음식점 검색 중 오류가 발생했습니다. 다시 시도해주세요.')); return; }
        const items = data.map((doc) => ({
          id: doc.id,
          place_name: doc.place_name,
          category_name: doc.category_name,
          categoryLabel: ltCategoryLabelFrom(doc.category_name),
          road_address_name: doc.road_address_name,
          address_name: doc.address_name,
          phone: doc.phone,
          distance: doc.distance,
          place_url: doc.place_url,
          x: doc.x,
          y: doc.y,
        }));
        resolve({ items, hasNextPage: pagination.hasNextPage });
      },
      { location, radius: radiusMeters, page, size: LT_PAGE_SIZE, sort: 'distance' },
    );
  });
}

async function ltSearchNearbyRestaurants(coord, radiusMeters) {
  const { kakao, places } = await ltGetPlaces();
  const location = new kakao.maps.LatLng(Number(coord.y), Number(coord.x));

  const byId = new Map();
  for (let page = 1; page <= LT_MAX_PAGES; page += 1) {
    const { items, hasNextPage } = await ltCategorySearchPage(places, location, radiusMeters, page);
    for (const item of items) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    if (!hasNextPage) break;
  }

  return Array.from(byId.values());
}

function ltPickRandomSubset(pool, count) {
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

/* ── 룰렛 페이지 상태 ── */
const LT_RADIUS_OPTIONS = [
  { value: 300, label: '300 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
];
const LT_DEFAULT_RADIUS = 500;
const LT_MIN_COUNT = 3;
const LT_MAX_COUNT = 10;
const LT_DEFAULT_COUNT = 5;
const LT_LOADING_DURATION = 2500;

const ltState = {
  selectedLocation: null,
  radius: LT_DEFAULT_RADIUS,
  count: LT_DEFAULT_COUNT,
  consent: false,
  wheelItems: [],
  rotation: 0,
  status: 'idle',
  message: null,
  winner: null,
  winnerPending: null,
  searchState: 'idle',
  searchResults: [],
  locating: false,
  locateError: null,
};

function ltBusy() {
  return ltState.status === 'loading' || ltState.status === 'spinning';
}

function ltInvalidateLoadedWheel() {
  if (ltState.status === 'ready' || ltState.status === 'error') {
    ltState.status = 'idle';
    ltState.message = null;
  }
}

/* ── 룰렛 휠 렌더 ── */
function ltRenderWheel() {
  const items = ltState.wheelItems;
  const total = items.length > 0 ? items.length : ltState.count;
  const step = total > 0 ? 360 / total : 0;
  const boundaryAngles = total > 0 ? Array.from({ length: total }, (_, i) => -90 + i * step) : [];
  const tickAngles = Array.from({ length: 28 }, (_, i) => (360 / 28) * i);
  const fontScale = total <= 5 ? 1 : Math.max(0.7, 1 - (total - 5) * 0.06);

  const svg = document.getElementById('lt-wheel-svg');
  let svgHtml = '<circle cx="50" cy="50" r="48" class="lt-outer-ring"></circle>';
  svgHtml += '<circle cx="50" cy="50" r="44" class="lt-inner-ring"></circle>';
  tickAngles.forEach((angle) => {
    const rad = (angle * Math.PI) / 180;
    const cx = 50 + Math.cos(rad) * 48;
    const cy = 50 + Math.sin(rad) * 48;
    svgHtml += '<circle cx="' + cx + '" cy="' + cy + '" r="0.5" class="lt-tick"></circle>';
  });
  boundaryAngles.forEach((angle) => {
    const rad = (angle * Math.PI) / 180;
    const x2 = 50 + Math.cos(rad) * 44;
    const y2 = 50 + Math.sin(rad) * 44;
    svgHtml += '<line x1="50" y1="50" x2="' + x2 + '" y2="' + y2 + '" class="lt-spoke"></line>';
  });
  svg.innerHTML = svgHtml;

  const labels = document.getElementById('lt-labels');
  labels.style.setProperty('--segment-font-scale', String(fontScale));
  labels.innerHTML = '';
  items.forEach((item, index) => {
    const angle = ltSegmentCenterAngleDeg(index, total);
    const rad = (angle * Math.PI) / 180;
    const left = 50 + Math.cos(rad) * 27;
    const top = 50 + Math.sin(rad) * 27;
    const isWinner = !!(ltState.winner && ltState.winner.id === item.id);

    const wrap = document.createElement('div');
    wrap.className = 'lt-segment-label' + (isWinner ? ' lt-segment-label-winner' : '');
    wrap.style.left = left + '%';
    wrap.style.top = top + '%';

    const pill = document.createElement('span');
    pill.className = 'lt-wheel-category-pill';
    pill.textContent = item.categoryLabel;

    const name = document.createElement('span');
    name.className = 'lt-wheel-item-name';
    name.textContent = item.place_name;

    wrap.appendChild(pill);
    wrap.appendChild(name);
    labels.appendChild(wrap);
  });

  const spin = document.getElementById('lt-wheel-spin');
  spin.classList.toggle('lt-spinning', ltState.status === 'spinning');
  spin.style.transform = 'rotate(' + ltState.rotation + 'deg)';

  document.getElementById('lt-go-button').disabled = ltState.status !== 'ready';
}

/* ── 설정 패널 렌더 ── */
function ltRenderControlPanel() {
  const busy = ltBusy();

  document.getElementById('lt-location-input').disabled = busy;

  const dropdown = document.getElementById('lt-dropdown');
  dropdown.innerHTML = '';
  if (ltState.searchResults.length > 0) {
    dropdown.hidden = false;
    ltState.searchResults.forEach((option) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lt-dropdown-item';

      const name = document.createElement('span');
      name.className = 'lt-dropdown-name';
      name.textContent = option.placeName;

      const addr = document.createElement('span');
      addr.className = 'lt-dropdown-address';
      addr.textContent = option.addressName;

      btn.appendChild(name);
      btn.appendChild(addr);
      btn.addEventListener('click', () => ltPickResult(option));
      li.appendChild(btn);
      dropdown.appendChild(li);
    });
  } else {
    dropdown.hidden = true;
  }

  const hint = document.getElementById('lt-search-hint');
  if (ltState.searchState === 'empty') {
    hint.hidden = false;
    hint.textContent = '검색 결과가 없습니다.';
  } else if (ltState.searchState === 'error') {
    hint.hidden = false;
    hint.textContent = '위치를 확인할 수 없습니다. 다시 시도해주세요.';
  } else {
    hint.hidden = true;
    hint.textContent = '';
  }

  document.getElementById('lt-search-button').disabled = busy;
  document.getElementById('lt-locate-button').disabled = busy || ltState.locating;

  const selLoc = document.getElementById('lt-selected-location');
  if (ltState.selectedLocation) {
    selLoc.hidden = false;
    selLoc.textContent = '선택된 위치: ' + ltState.selectedLocation.label;
  } else {
    selLoc.hidden = true;
  }

  const locErr = document.getElementById('lt-locate-error');
  if (ltState.locateError) {
    locErr.hidden = false;
    locErr.textContent = ltState.locateError;
  } else {
    locErr.hidden = true;
  }

  document.querySelectorAll('.lt-pill-button').forEach((btn) => {
    const value = Number(btn.dataset.value);
    const active = value === ltState.radius;
    btn.classList.toggle('lt-pill-button-active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.disabled = busy;
  });

  document.getElementById('lt-count-value').textContent = ltState.count + '개';
  document.getElementById('lt-count-minus').disabled = busy || ltState.count <= LT_MIN_COUNT;
  document.getElementById('lt-count-plus').disabled = busy || ltState.count >= LT_MAX_COUNT;

  const checkbox = document.getElementById('lt-consent-checkbox');
  checkbox.checked = ltState.consent;
  checkbox.disabled = busy;

  const submitButton = document.getElementById('lt-submit-button');
  submitButton.disabled = busy || !ltState.selectedLocation || !ltState.consent;
  submitButton.textContent = ltState.status === 'loading' ? '불러오는 중...' : '음식점 불러오기';
}

/* ── 상태 메시지 렌더 ── */
function ltRenderStatusArea() {
  const area = document.getElementById('lt-status-area');
  area.innerHTML = '';

  if (ltState.status === 'loading') {
    const p = document.createElement('p');
    p.className = 'lt-status-loading';
    p.textContent = '주변 음식점을 찾는 중...';
    area.appendChild(p);
  } else if (ltState.status === 'error' && ltState.message) {
    const p = document.createElement('p');
    p.className = 'lt-status-error';
    p.textContent = ltState.message;
    area.appendChild(p);
  } else if (ltState.status === 'ready') {
    const p = document.createElement('p');
    p.className = 'lt-status-result';
    p.textContent = '음식점 ' + ltState.wheelItems.length + '곳으로 룰렛을 구성했어요.';
    p.appendChild(document.createElement('br'));
    p.appendChild(document.createTextNode('Go!를 눌러 돌려보세요.'));
    area.appendChild(p);

    if (ltState.message) {
      const note = document.createElement('p');
      note.className = 'lt-status-note';
      note.textContent = ltState.message;
      area.appendChild(note);
    }
  }
}

function ltRenderAll() {
  ltRenderWheel();
  ltRenderControlPanel();
  ltRenderStatusArea();
}

/* ── 결과 화면 렌더 (실제 카카오 데이터만 사용, mock 없음) ── */
function ltRenderResultScreen() {
  const winner = ltState.winner;
  if (!winner) return;
  document.getElementById('lt-result-category-pill').textContent = winner.categoryLabel;
  document.getElementById('lt-result-winner-name').textContent = winner.place_name;

  const mapLink = document.getElementById('lt-result-map-link');
  if (winner.place_url) {
    mapLink.hidden = false;
    mapLink.href = winner.place_url;
  } else {
    mapLink.hidden = true;
    mapLink.removeAttribute('href');
  }
}

/* ── 이벤트 핸들러 ── */
async function ltRunSearch() {
  const trimmed = document.getElementById('lt-location-input').value.trim();
  if (!trimmed || ltBusy()) return;
  ltState.searchState = 'loading';
  ltRenderControlPanel();
  try {
    const found = await ltSearchPlacesByKeyword(trimmed);
    ltState.searchResults = found;
    ltState.searchState = found.length === 0 ? 'empty' : 'idle';
  } catch (err) {
    ltState.searchState = 'error';
    ltState.searchResults = [];
  }
  ltRenderControlPanel();
}

function ltPickResult(option) {
  ltState.selectedLocation = { label: option.placeName, x: option.x, y: option.y };
  document.getElementById('lt-location-input').value = option.placeName;
  ltState.searchResults = [];
  ltInvalidateLoadedWheel();
  ltRenderAll();
}

function ltUseCurrentLocation() {
  if (ltBusy() || ltState.locating) return;
  if (!navigator.geolocation) {
    ltState.searchState = 'error';
    ltRenderControlPanel();
    return;
  }
  ltState.locating = true;
  ltState.locateError = null;
  ltRenderControlPanel();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const x = String(position.coords.longitude);
        const y = String(position.coords.latitude);
        const label = await ltReverseGeocode(x, y);
        ltState.selectedLocation = { label, x, y };
        document.getElementById('lt-location-input').value = label;
        ltState.searchResults = [];
        ltInvalidateLoadedWheel();
      } catch (err) {
        ltState.locateError = err instanceof Error ? err.message : '현재 위치를 확인할 수 없습니다.';
      } finally {
        ltState.locating = false;
        ltRenderAll();
      }
    },
    (err) => {
      ltState.locateError = err.code === err.PERMISSION_DENIED
        ? '위치 권한이 거부되어 있어요. 브라우저 설정에서 위치 접근을 허용한 뒤 다시 시도해주세요.'
        : '현재 위치를 가져오지 못했어요. 다시 시도해주세요.';
      ltState.locating = false;
      ltRenderControlPanel();
    },
  );
}

async function ltHandleLoadRestaurants() {
  if (ltBusy() || !ltState.selectedLocation || !ltState.consent) return;
  ltState.message = null;
  ltState.status = 'loading';
  ltState.winner = null;
  ltRenderAll();

  try {
    const pool = await ltSearchNearbyRestaurants(
      { x: ltState.selectedLocation.x, y: ltState.selectedLocation.y },
      ltState.radius,
    );

    if (pool.length === 0) {
      ltState.status = 'error';
      ltState.message = '이 범위에서는 음식점을 찾지 못했어요. 검색 범위를 넓혀보세요.';
      ltRenderAll();
      return;
    }

    const picked = ltPickRandomSubset(pool, ltState.count);
    ltState.wheelItems = picked;
    ltState.rotation = 0;
    ltState.status = 'ready';

    if (picked.length < ltState.count) {
      ltState.message = '이 범위에서는 음식점을 ' + picked.length + '곳만 찾았어요. 검색 범위를 넓혀보세요.';
    }
  } catch (err) {
    ltState.status = 'error';
    ltState.message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
  }
  ltRenderAll();
}

function ltHandleGoClick() {
  if (ltState.status !== 'ready' || ltState.wheelItems.length === 0) return;

  const winnerIndex = Math.floor(Math.random() * ltState.wheelItems.length);
  ltState.winnerPending = ltState.wheelItems[winnerIndex];

  ltState.status = 'spinning';
  ltRenderAll();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const delta = ltComputeSpinDelta(winnerIndex, ltState.wheelItems.length);
      ltState.rotation += delta;
      ltRenderWheel();
    });
  });
}

function ltHandleSpinEnd() {
  if (ltState.status !== 'spinning') return;
  ltState.status = 'result';
  ltState.winner = ltState.winnerPending;
  ltShowScreen('lt-screen-result');
  ltRenderResultScreen();
}

function ltHandlePlayAgain() {
  ltState.status = 'idle';
  ltState.message = null;
  ltState.winner = null;
  ltState.winnerPending = null;
  ltState.wheelItems = [];
  ltState.rotation = 0;
  ltShowScreen('lt-screen-roulette');
  ltRenderAll();
}

/* ── 초기화 ── */
function ltBuildRadiusButtons() {
  const group = document.getElementById('lt-radius-group');
  group.innerHTML = '';
  LT_RADIUS_OPTIONS.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lt-pill-button';
    btn.textContent = option.label;
    btn.dataset.value = String(option.value);
    btn.addEventListener('click', () => {
      if (ltBusy()) return;
      ltState.radius = option.value;
      ltInvalidateLoadedWheel();
      ltRenderAll();
    });
    group.appendChild(btn);
  });
}

function ltInitRoulette() {
  ltBuildRadiusButtons();

  const input = document.getElementById('lt-location-input');
  input.addEventListener('input', () => {
    ltState.searchState = 'idle';
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ltRunSearch();
    }
  });

  document.getElementById('lt-search-button').addEventListener('click', ltRunSearch);
  document.getElementById('lt-locate-button').addEventListener('click', ltUseCurrentLocation);

  document.addEventListener('pointerdown', (event) => {
    const row = document.getElementById('lt-search-row');
    if (row && !row.contains(event.target) && ltState.searchResults.length > 0) {
      ltState.searchResults = [];
      ltRenderControlPanel();
    }
  });

  document.getElementById('lt-count-minus').addEventListener('click', () => {
    if (ltBusy()) return;
    ltState.count = Math.max(LT_MIN_COUNT, ltState.count - 1);
    ltInvalidateLoadedWheel();
    ltRenderAll();
  });
  document.getElementById('lt-count-plus').addEventListener('click', () => {
    if (ltBusy()) return;
    ltState.count = Math.min(LT_MAX_COUNT, ltState.count + 1);
    ltInvalidateLoadedWheel();
    ltRenderAll();
  });

  document.getElementById('lt-consent-checkbox').addEventListener('change', (event) => {
    ltState.consent = event.target.checked;
    ltRenderControlPanel();
  });

  document.getElementById('lt-submit-button').addEventListener('click', ltHandleLoadRestaurants);
  document.getElementById('lt-go-button').addEventListener('click', ltHandleGoClick);
  document.getElementById('lt-wheel-spin').addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') ltHandleSpinEnd();
  });
  document.getElementById('lt-play-again-button').addEventListener('click', ltHandlePlayAgain);

  ltRenderAll();
}

ltInitRoulette();
setTimeout(() => ltShowScreen('lt-screen-roulette'), LT_LOADING_DURATION);
