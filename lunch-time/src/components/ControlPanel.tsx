import { useEffect, useRef, useState } from 'react';
import { reverseGeocode, searchPlacesByKeyword } from '../api/kakao';
import { DEFAULT_RADIUS, MAX_COUNT, MIN_COUNT, RADIUS_OPTIONS } from '../types';
import type { LocationOption, SelectedLocation } from '../types';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  selectedLocation: SelectedLocation | null;
  onSelectLocation: (location: SelectedLocation) => void;
  radius: number;
  onRadiusChange: (value: number) => void;
  count: number;
  onCountChange: (value: number) => void;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  disabled: boolean;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15.7687 15.7687" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M6.5 1.5C5.17392 1.5 3.90215 2.02678 2.96447 2.96447C2.02678 3.90215 1.5 5.17392 1.5 6.5C1.5 7.82608 2.02678 9.09785 2.96447 10.0355C3.90215 10.9732 5.17392 11.5 6.5 11.5C7.82608 11.5 9.09785 10.9732 10.0355 10.0355C10.9732 9.09785 11.5 7.82608 11.5 6.5C11.5 5.17392 10.9732 3.90215 10.0355 2.96447C9.09785 2.02678 7.82608 1.5 6.5 1.5ZM0 6.5C0 4.77609 0.684819 3.12279 1.90381 1.90381C3.12279 0.684819 4.77609 0 6.5 0C8.22391 0 9.87721 0.684819 11.0962 1.90381C12.3152 3.12279 13 4.77609 13 6.5C13 8.22391 12.3152 9.87721 11.0962 11.0962C9.87721 12.3152 8.22391 13 6.5 13C4.77609 13 3.12279 12.3152 1.90381 11.0962C0.684819 9.87721 0 8.22391 0 6.5Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M10.47 10.47C10.6106 10.3295 10.8012 10.2507 11 10.2507C11.1988 10.2507 11.3894 10.3295 11.53 10.47L15.53 14.47C15.6037 14.5387 15.6628 14.6215 15.7038 14.7135C15.7448 14.8055 15.7668 14.9048 15.7686 15.0055C15.7704 15.1062 15.7518 15.2062 15.7141 15.2996C15.6764 15.393 15.6203 15.4778 15.549 15.549C15.4778 15.6203 15.393 15.6764 15.2996 15.7141C15.2062 15.7518 15.1062 15.7704 15.0055 15.7686C14.9048 15.7668 14.8055 15.7448 14.7135 15.7038C14.6215 15.6628 14.5387 15.6037 14.47 15.53L10.47 11.53C10.3295 11.3894 10.2507 11.1988 10.2507 11C10.2507 10.8012 10.3295 10.6106 10.47 10.47Z"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 45 45" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="44" height="44" rx="4" fill="#D1DAF1" stroke="#111111" />
      <path d="M16.75 22.5H28.25" stroke="black" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 45 45" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="44" height="44" rx="4" fill="#D1DAF1" stroke="#111111" />
      <path d="M16.75 22.375H22.5M28.25 22.375H22.5M22.5 22.375V16.875V28.125" stroke="black" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ControlPanel({
  selectedLocation,
  onSelectLocation,
  radius,
  onRadiusChange,
  count,
  onCountChange,
  consent,
  onConsentChange,
  disabled,
  onSubmit,
  submitDisabled,
  submitLabel,
}: ControlPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationOption[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click, same as any other site-wide popover.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed || disabled) return;
    setSearchState('loading');
    try {
      const found = await searchPlacesByKeyword(trimmed);
      setResults(found);
      setSearchState(found.length === 0 ? 'empty' : 'idle');
    } catch {
      setSearchState('error');
      setResults([]);
    }
  }

  function pickResult(option: LocationOption) {
    onSelectLocation({ label: option.placeName, x: option.x, y: option.y });
    setQuery(option.placeName);
    setResults([]);
  }

  function useCurrentLocation() {
    if (disabled || locating) return;
    if (!navigator.geolocation) {
      setSearchState('error');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const x = String(position.coords.longitude);
          const y = String(position.coords.latitude);
          const label = await reverseGeocode(x, y);
          onSelectLocation({ label, x, y });
          setQuery(label);
          setResults([]);
        } catch (err) {
          setLocateError(err instanceof Error ? err.message : '현재 위치를 확인할 수 없습니다.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 거부되어 있어요. 브라우저 설정에서 위치 접근을 허용한 뒤 다시 시도해주세요.'
            : '현재 위치를 가져오지 못했어요. 다시 시도해주세요.',
        );
        setLocating(false);
      },
    );
  }

  return (
    <section className={styles.panelStack} aria-label="룰렛 검색 조건">
      <div className={styles.panel}>
        <p className={styles.label}>위치/장소검색</p>
        <div className={styles.searchRow} ref={boxRef}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.input}
              placeholder="어디서 먹을까요?"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchState('idle');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSearch();
                }
              }}
              disabled={disabled}
            />
            {results.length > 0 && (
              <ul className={styles.dropdown} role="listbox">
                {results.map((option) => (
                  <li key={option.id}>
                    <button type="button" className={styles.dropdownItem} onClick={() => pickResult(option)}>
                      <span className={styles.dropdownName}>{option.placeName}</span>
                      <span className={styles.dropdownAddress}>{option.addressName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searchState === 'empty' && <p className={styles.searchHint}>검색 결과가 없습니다.</p>}
            {searchState === 'error' && (
              <p className={styles.searchHint}>위치를 확인할 수 없습니다. 다시 시도해주세요.</p>
            )}
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={runSearch}
            disabled={disabled}
            aria-label="위치 검색"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.locateButton}`}
            onClick={useCurrentLocation}
            disabled={disabled || locating}
            aria-label="현재 위치 사용"
            title="현재 위치 사용"
          >
            <PinIcon />
          </button>
        </div>
        {selectedLocation && <p className={styles.selectedLocation}>선택된 위치: {selectedLocation.label}</p>}
        {locateError && <p className={styles.locateErrorText}>{locateError}</p>}

        <div className={styles.divider} />

        <p className={styles.label}>검색 반경</p>
        <div className={styles.radiusGroup} role="group" aria-label="검색 반경">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.pillButton} ${option.value === radius ? styles.pillButtonActive : ''}`}
              aria-pressed={option.value === radius}
              onClick={() => onRadiusChange(option.value)}
              disabled={disabled}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        <p className={styles.label}>개수</p>
        <div className={styles.countRow}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => onCountChange(Math.max(MIN_COUNT, count - 1))}
            disabled={disabled || count <= MIN_COUNT}
            aria-label="음식점 개수 줄이기"
          >
            <MinusIcon />
          </button>
          <span className={styles.countValue}>{count}개</span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => onCountChange(Math.min(MAX_COUNT, count + 1))}
            disabled={disabled || count >= MAX_COUNT}
            aria-label="음식점 개수 늘리기"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      <label className={styles.consentPanel}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          disabled={disabled}
        />
        위치 기반 음식점 추천을 위한 위치정보 수집·이용에 동의합니다. (필수)
      </label>

      <button type="button" className={styles.submitButton} onClick={onSubmit} disabled={submitDisabled}>
        {submitLabel}
      </button>
    </section>
  );
}

export { DEFAULT_RADIUS };
