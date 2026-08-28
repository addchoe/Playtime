import type { CSSProperties } from 'react';
import type { Restaurant } from '../types';
import { segmentCenterAngleDeg } from '../utils/wheel';
import styles from './RouletteWheel.module.css';

const TICK_COUNT = 28;
const LABEL_ANCHOR_RADIUS_PCT = 27;
const SVG_RADIUS_OUTER = 48;
const SVG_RADIUS_INNER = 44;

interface RouletteWheelProps {
  items: Restaurant[];
  /** Segment count to show before any real search — the wheel stays empty
   * (no names/categories) but still redraws its slice count live as the
   * user adjusts the "개수" stepper, so they can see how the wheel will be
   * divided before committing to a search. */
  previewCount: number;
  rotation: number;
  spinning: boolean;
  winner: Restaurant | null;
  onSpinEnd: () => void;
  onGoClick: () => void;
  /** Only true once a real search has populated `items` — the empty preview
   * segments shown before that are not spinnable. */
  ready: boolean;
}

export function RouletteWheel({
  items,
  previewCount,
  rotation,
  spinning,
  winner,
  onSpinEnd,
  onGoClick,
  ready,
}: RouletteWheelProps) {
  const total = items.length > 0 ? items.length : previewCount;
  const step = total > 0 ? 360 / total : 0;
  const boundaryAngles = total > 0 ? Array.from({ length: total }, (_, i) => -90 + i * step) : [];
  const tickAngles = Array.from({ length: TICK_COUNT }, (_, i) => (360 / TICK_COUNT) * i);

  // 5칸까지는 원래 크기 그대로, 그 위로는 칸이 늘어날수록 폰트를 조금씩 줄여서
  // 좁아진 조각 안에 최대한 안 넘치게 맞춘다. 개수가 너무 많으면 그래도 넘칠 수
  // 있는데, 그건 감안한다(사용자 확인).
  const fontScale = total <= 5 ? 1 : Math.max(0.7, 1 - (total - 5) * 0.06);

  return (
    <div className={styles.wheelWrap}>
      <div
        className={`${styles.wheelSpin} ${spinning ? styles.spinning : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform') onSpinEnd();
        }}
      >
        <svg className={styles.wheelSvg} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={SVG_RADIUS_OUTER} className={styles.outerRing} />
          <circle cx="50" cy="50" r={SVG_RADIUS_INNER} className={styles.innerRing} />
          {tickAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <circle
                key={angle}
                cx={50 + Math.cos(rad) * SVG_RADIUS_OUTER}
                cy={50 + Math.sin(rad) * SVG_RADIUS_OUTER}
                r="0.5"
                className={styles.tick}
              />
            );
          })}
          {boundaryAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1="50"
                y1="50"
                x2={50 + Math.cos(rad) * SVG_RADIUS_INNER}
                y2={50 + Math.sin(rad) * SVG_RADIUS_INNER}
                className={styles.spoke}
              />
            );
          })}
        </svg>

        <div className={styles.labels} style={{ '--segment-font-scale': fontScale } as CSSProperties}>
          {items.map((item, index) => {
            const angle = segmentCenterAngleDeg(index, total);
            const rad = (angle * Math.PI) / 180;
            const left = 50 + Math.cos(rad) * LABEL_ANCHOR_RADIUS_PCT;
            const top = 50 + Math.sin(rad) * LABEL_ANCHOR_RADIUS_PCT;
            const isWinner = winner?.id === item.id;

            return (
              <div
                key={item.id}
                className={`${styles.segmentLabel} ${isWinner ? styles.segmentLabelWinner : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span className={styles.categoryPill}>{item.categoryLabel}</span>
                <span className={styles.itemName}>{item.place_name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* strokeWidth 1.86 = 룰렛 바깥 링(SVG_RADIUS_OUTER 원의 stroke-width 0.15,
          100-unit viewBox) 굵기를, 포인터가 실제로 렌더링되는 크기 비율(wheelWrap의
          15%, 185.944-unit viewBox)로 환산한 값 — 화면에 그려지는 실제 두께가
          룰렛 링과 같아지도록 맞춘 것. */}
      <svg className={styles.pointer} viewBox="0 0 185.944 161.532" aria-hidden="true">
        <path
          d="M76.5177 28.5C83.8308 15.8333 102.114 15.8333 109.427 28.5L169.49 132.532C176.803 145.199 167.662 161.032 153.035 161.032H32.909C18.2828 161.032 9.14138 145.199 16.4545 132.532L76.5177 28.5Z"
          fill="#EEEEEE"
          stroke="black"
          strokeWidth="1.86"
        />
        <path
          d="M84.3117 54.0442C88.1607 47.3775 97.7832 47.3775 101.632 54.0442L137.764 116.626C141.613 123.293 136.802 131.626 129.104 131.626H56.8403C49.1423 131.626 44.3311 123.293 48.1801 116.626L84.3117 54.0442Z"
          fill="#D1DAF1"
          stroke="black"
          strokeWidth="1.86"
        />
      </svg>

      <button
        type="button"
        className={styles.goButton}
        onClick={onGoClick}
        disabled={!ready || spinning}
        aria-label="룰렛 돌리기"
      >
        Go!
      </button>
    </div>
  );
}
