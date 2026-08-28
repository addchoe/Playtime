const SDK_ATTR = 'data-kakao-maps-sdk';

let loadPromise: Promise<void> | null = null;

/**
 * Injects the Kakao Maps JS SDK (`services` library) exactly once and
 * resolves once `kakao.maps` is ready to use. Safe to call from multiple
 * places (React StrictMode double-invokes effects, several components may
 * need the SDK) — every caller shares the same promise instead of injecting
 * the script twice.
 */
export function loadKakaoMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY as string | undefined;

  loadPromise = new Promise((resolve, reject) => {
    if (!appKey) {
      loadPromise = null;
      reject(
        new Error('카카오 JavaScript 키가 설정되지 않았습니다. .env 파일에 VITE_KAKAO_JAVASCRIPT_KEY를 추가해주세요.'),
      );
      return;
    }

    if (window.kakao?.maps?.services) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[${SDK_ATTR}]`);
    if (existing) {
      existing.addEventListener('load', () => window.kakao!.maps.load(resolve));
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('카카오맵 SDK를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.setAttribute(SDK_ATTR, 'true');
    script.onload = () => window.kakao!.maps.load(resolve);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오맵 SDK를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
