import { useRef, useState } from 'react';
import { TopNav } from '../components/TopNav';
import { ControlPanel } from '../components/ControlPanel';
import { RouletteWheel } from '../components/RouletteWheel';
import { geocodeLocation, pickRandomSubset, searchNearbyRestaurants } from '../api/kakao';
import { computeSpinDelta } from '../utils/wheel';
import { DEFAULT_WHEEL_ITEMS } from '../data/defaultWheelItems';
import type { RestaurantCount, WheelItem } from '../types';
import styles from './LunchTimePage.module.css';

type Status = 'idle' | 'loading' | 'error' | 'spinning' | 'result';

export function LunchTimePage() {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('1000');
  const [count, setCount] = useState<RestaurantCount>(8);
  const [consent, setConsent] = useState(false);

  const [wheelItems, setWheelItems] = useState<WheelItem[]>(DEFAULT_WHEEL_ITEMS);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const winnerRef = useRef<WheelItem | null>(null);

  const spinning = status === 'spinning';
  const busy = status === 'loading' || spinning;

  async function handleGoClick() {
    if (busy) return;
    setMessage(null);

    if (!consent) {
      setStatus('error');
      setMessage('개인정보 수집/이용에 동의해주세요.');
      return;
    }
    if (!location.trim()) {
      setStatus('error');
      setMessage('현재 위치를 입력해주세요.');
      return;
    }
    if (!radius) {
      setStatus('error');
      setMessage('검색 반경을 선택해주세요.');
      return;
    }

    setStatus('loading');
    setWinner(null);

    try {
      const coord = await geocodeLocation(location.trim());
      const found = await searchNearbyRestaurants(coord, Number(radius));

      if (found.length === 0) {
        setStatus('error');
        setMessage('반경 내 음식점 검색 결과가 없습니다. 반경을 넓혀서 다시 시도해주세요.');
        return;
      }

      const picked = pickRandomSubset(found, count);
      if (picked.length < count) {
        setMessage(`주변에 음식점이 ${picked.length}곳뿐이라 ${picked.length}개로 룰렛을 구성했습니다.`);
      }

      setWheelItems(picked);

      const winnerIndex = Math.floor(Math.random() * picked.length);
      winnerRef.current = picked[winnerIndex];

      // Commit the "spinning" class (which carries the transition rule) in
      // its own paint first — changing it and the transform in the same
      // commit lets the browser skip straight to the end value with no
      // animation.
      setStatus('spinning');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const delta = computeSpinDelta(winnerIndex, picked.length);
          setRotation((prev) => prev + delta);
        });
      });
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    }
  }

  function handleSpinEnd() {
    if (status !== 'spinning') return;
    setStatus('result');
    setWinner(winnerRef.current);
  }

  return (
    <div className={styles.page}>
      <TopNav />

      <main className={styles.content}>
        <h1 className={styles.srOnly}>Lunch Time — 점심 메뉴 룰렛</h1>

        <section className={styles.wheelColumn} aria-label="음식점 룰렛">

          <RouletteWheel
            items={wheelItems}
            rotation={rotation}
            spinning={spinning}
            winner={winner}
            onSpinEnd={handleSpinEnd}
            onGoClick={handleGoClick}
            goDisabled={busy}
          />
        </section>

        <aside className={styles.sidebar}>
          <ControlPanel
            location={location}
            onLocationChange={setLocation}
            radius={radius}
            onRadiusChange={setRadius}
            count={count}
            onCountChange={setCount}
            consent={consent}
            onConsentChange={setConsent}
            disabled={busy}
          />

          <div className={styles.statusArea} role="status" aria-live="polite">
            {status === 'loading' && <p className={styles.statusLoading}>주변 음식점을 찾는 중...</p>}
            {status === 'error' && message && <p className={styles.statusError}>{message}</p>}
            {status === 'result' && winner && (
              <p className={styles.statusResult}>
                오늘 점심은 <strong>{winner.name}</strong> 어때요?
              </p>
            )}
            {status === 'result' && message && <p className={styles.statusNote}>{message}</p>}
          </div>
        </aside>
      </main>
    </div>
  );
}
