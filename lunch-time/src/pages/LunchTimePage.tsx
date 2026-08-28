import { useRef, useState } from 'react';
import { TopNav } from '../components/TopNav';
import { ControlPanel } from '../components/ControlPanel';
import { RouletteWheel } from '../components/RouletteWheel';
import { ResultPage } from '../components/ResultPage';
import { pickRandomSubset, searchNearbyRestaurants } from '../api/kakao';
import { computeSpinDelta } from '../utils/wheel';
import { DEFAULT_COUNT, DEFAULT_RADIUS } from '../types';
import type { Restaurant, SelectedLocation } from '../types';
import styles from './LunchTimePage.module.css';

type Status = 'idle' | 'loading' | 'error' | 'ready' | 'spinning' | 'result';

export function LunchTimePage() {
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [consent, setConsent] = useState(false);

  // Empty until a real search populates it — the wheel shows `count` blank
  // slices in the meantime (see RouletteWheel's `previewCount`), never mock
  // restaurant data.
  const [wheelItems, setWheelItems] = useState<Restaurant[]>([]);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const winnerRef = useRef<Restaurant | null>(null);

  const busy = status === 'loading' || status === 'spinning';
  const wheelReady = status === 'ready';

  /** Settings changed after a real search already populated the wheel — that
   * pool no longer matches the new settings, so drop back to idle and make
   * the user re-fetch. Never touched while a fetch or spin is in flight. */
  function invalidateLoadedWheel() {
    if (status === 'ready' || status === 'error') {
      setStatus('idle');
      setMessage(null);
    }
  }

  async function handleLoadRestaurants() {
    if (busy || !selectedLocation || !consent) return;
    setMessage(null);
    setStatus('loading');
    setWinner(null);

    try {
      const pool = await searchNearbyRestaurants({ x: selectedLocation.x, y: selectedLocation.y }, radius);

      if (pool.length === 0) {
        setStatus('error');
        setMessage('이 범위에서는 음식점을 찾지 못했어요. 검색 범위를 넓혀보세요.');
        return;
      }

      const picked = pickRandomSubset(pool, count);
      setWheelItems(picked);
      setRotation(0);
      setStatus('ready');

      if (picked.length < count) {
        setMessage(`이 범위에서는 음식점을 ${picked.length}곳만 찾았어요. 검색 범위를 넓혀보세요.`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    }
  }

  function handleGoClick() {
    if (status !== 'ready' || wheelItems.length === 0) return;

    // Winner is decided first; the animation is just however long it takes
    // the wheel to visually arrive at that already-decided segment.
    const winnerIndex = Math.floor(Math.random() * wheelItems.length);
    winnerRef.current = wheelItems[winnerIndex];

    setStatus('spinning');
    // Commit the "spinning" class (which carries the transition rule) in its
    // own paint first — changing it and the transform in the same commit
    // lets the browser skip straight to the end value with no animation.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const delta = computeSpinDelta(winnerIndex, wheelItems.length);
        setRotation((prev) => prev + delta);
      });
    });
  }

  function handleSpinEnd() {
    if (status !== 'spinning') return;
    setStatus('result');
    setWinner(winnerRef.current);
  }

  function handlePlayAgain() {
    setStatus('idle');
    setMessage(null);
    setWinner(null);
    winnerRef.current = null;
    setWheelItems([]);
    setRotation(0);
  }

  if (status === 'result' && winner) {
    return (
      <div className={styles.page}>
        <TopNav />
        <ResultPage winner={winner} onPlayAgain={handlePlayAgain} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <TopNav />

      <main className={styles.content}>
        <h1 className={styles.srOnly}>Lunch Time — 점심 메뉴 룰렛</h1>

        <section className={styles.wheelColumn} aria-label="음식점 룰렛">
          <RouletteWheel
            items={wheelItems}
            previewCount={count}
            rotation={rotation}
            spinning={status === 'spinning'}
            winner={winner}
            onSpinEnd={handleSpinEnd}
            onGoClick={handleGoClick}
            ready={wheelReady}
          />
        </section>

        <aside className={styles.sidebar}>
          <ControlPanel
            selectedLocation={selectedLocation}
            onSelectLocation={(location) => {
              setSelectedLocation(location);
              invalidateLoadedWheel();
            }}
            radius={radius}
            onRadiusChange={(value) => {
              setRadius(value);
              invalidateLoadedWheel();
            }}
            count={count}
            onCountChange={(value) => {
              setCount(value);
              invalidateLoadedWheel();
            }}
            consent={consent}
            onConsentChange={setConsent}
            disabled={busy}
            onSubmit={handleLoadRestaurants}
            submitDisabled={busy || !selectedLocation || !consent}
            submitLabel={status === 'loading' ? '불러오는 중...' : '음식점 불러오기'}
          />

          <div className={styles.statusArea} role="status" aria-live="polite">
            {status === 'loading' && <p className={styles.statusLoading}>주변 음식점을 찾는 중...</p>}
            {status === 'error' && message && <p className={styles.statusError}>{message}</p>}
            {status === 'ready' && (
              <p className={styles.statusResult}>
                음식점 {wheelItems.length}곳으로 룰렛을 구성했어요.
                <br />
                Go!를 눌러 돌려보세요.
              </p>
            )}
            {status === 'ready' && message && <p className={styles.statusNote}>{message}</p>}
          </div>
        </aside>
      </main>
    </div>
  );
}
