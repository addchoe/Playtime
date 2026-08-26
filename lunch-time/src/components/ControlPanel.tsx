import type { RestaurantCount } from '../types';
import styles from './ControlPanel.module.css';

const COUNT_OPTIONS: RestaurantCount[] = [6, 8, 10, 12];

const RADIUS_OPTIONS = [
  { value: '300', label: '300m' },
  { value: '500', label: '500m' },
  { value: '1000', label: '1km' },
  { value: '2000', label: '2km' },
  { value: '3000', label: '3km' },
  { value: '5000', label: '5km' },
];

interface ControlPanelProps {
  location: string;
  onLocationChange: (value: string) => void;
  radius: string;
  onRadiusChange: (value: string) => void;
  count: RestaurantCount;
  onCountChange: (value: RestaurantCount) => void;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  disabled: boolean;
}

export function ControlPanel({
  location,
  onLocationChange,
  radius,
  onRadiusChange,
  count,
  onCountChange,
  consent,
  onConsentChange,
  disabled,
}: ControlPanelProps) {
  return (
    <section className={styles.panelStack} aria-label="룰렛 검색 조건">
      <div className={styles.panel}>
        <div className={styles.row}>
          <label htmlFor="location-input" className={styles.label}>
            현재 위치
          </label>
          <input
            id="location-input"
            type="text"
            className={styles.input}
            placeholder="위치를 입력해주세요."
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <label htmlFor="radius-select" className={styles.label}>
            검색 반경
          </label>
          <select
            id="radius-select"
            className={styles.select}
            value={radius}
            onChange={(event) => onRadiusChange(event.target.value)}
            disabled={disabled}
          >
            <option value="" disabled>
              범위를 선택해주세요.
            </option>
            {RADIUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <span className={styles.label}>개수</span>
          <div className={styles.countGroup} role="group" aria-label="음식점 개수">
            {COUNT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.countButton} ${option === count ? styles.countButtonActive : ''}`}
                aria-pressed={option === count}
                onClick={() => onCountChange(option)}
                disabled={disabled}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className={styles.consentPanel}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
        />
        개인정보 수집/이용 동의
      </label>
    </section>
  );
}
