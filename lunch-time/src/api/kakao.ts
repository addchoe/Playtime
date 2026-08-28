import type { LocationOption, Restaurant } from '../types';
import type { KakaoLatLng, KakaoPlaces } from '../kakao-maps';
import { loadKakaoMaps } from './kakaoMapsLoader';

const RESTAURANT_CATEGORY_GROUP_CODE = 'FD6';
/** Kakao's category/keyword search caps at 15 results/page; 3 pages gives
 * the "약 30~45개" candidate pool the spec asks for. */
const MAX_PAGES = 3;
const PAGE_SIZE = 15;

export class KakaoApiError extends Error {}

async function getPlaces() {
  await loadKakaoMaps();
  const kakao = window.kakao;
  if (!kakao) throw new KakaoApiError('카카오맵 SDK가 로드되지 않았습니다.');
  return { kakao, places: new kakao.maps.services.Places() };
}

/** Place/address name -> candidate list, for the location search dropdown.
 * Never auto-picks a result — the user chooses one from the list. */
export async function searchPlacesByKeyword(query: string): Promise<LocationOption[]> {
  const { places } = await getPlaces();

  return new Promise((resolve, reject) => {
    places.keywordSearch(
      query,
      (data, status) => {
        if (status === 'ZERO_RESULT') {
          resolve([]);
          return;
        }
        if (status !== 'OK') {
          reject(new KakaoApiError('위치 검색 중 오류가 발생했습니다. 다시 시도해주세요.'));
          return;
        }
        resolve(
          data.map((doc) => ({
            id: doc.id,
            placeName: doc.place_name,
            addressName: doc.road_address_name || doc.address_name,
            x: doc.x,
            y: doc.y,
          })),
        );
      },
      { size: PAGE_SIZE },
    );
  });
}

/** Reverse-geocodes a coordinate (from navigator.geolocation) to a display label. */
export async function reverseGeocode(x: string, y: string): Promise<string> {
  await loadKakaoMaps();
  const kakao = window.kakao;
  if (!kakao) throw new KakaoApiError('카카오맵 SDK가 로드되지 않았습니다.');
  const geocoder = new kakao.maps.services.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.coord2Address(Number(x), Number(y), (result, status) => {
      if (status !== 'OK' || !result[0]) {
        reject(new KakaoApiError('현재 위치의 주소를 확인할 수 없습니다.'));
        return;
      }
      const doc = result[0];
      resolve(doc.road_address?.address_name ?? doc.address?.address_name ?? '현재 위치');
    });
  });
}

/** "음식점 > 한식 > 육류,고기" -> "한식". Never invents a category that isn't in the string. */
function categoryLabelFrom(categoryName: string): string {
  const parts = categoryName.split(' > ');
  return parts[1] || '음식점';
}

function categorySearchPage(
  places: KakaoPlaces,
  location: KakaoLatLng,
  radiusMeters: number,
  page: number,
): Promise<{ items: Restaurant[]; hasNextPage: boolean }> {
  return new Promise((resolve, reject) => {
    places.categorySearch(
      RESTAURANT_CATEGORY_GROUP_CODE,
      (data, status, pagination) => {
        if (status === 'ZERO_RESULT') {
          resolve({ items: [], hasNextPage: false });
          return;
        }
        if (status !== 'OK') {
          reject(new KakaoApiError('음식점 검색 중 오류가 발생했습니다. 다시 시도해주세요.'));
          return;
        }
        const items = data.map<Restaurant>((doc) => ({
          id: doc.id,
          place_name: doc.place_name,
          category_name: doc.category_name,
          categoryLabel: categoryLabelFrom(doc.category_name),
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
      { location, radius: radiusMeters, page, size: PAGE_SIZE, sort: 'distance' },
    );
  });
}

/**
 * Collects a pool of nearby restaurants via Kakao's FD6 category search,
 * paginating until the pool is exhausted or MAX_PAGES is reached, then
 * dedupes by id. Does NOT truncate to the caller's requested count — that
 * random selection happens separately in pickRandomSubset, per spec (the
 * first N results must never be used as-is).
 */
export async function searchNearbyRestaurants(
  coord: { x: string; y: string },
  radiusMeters: number,
): Promise<Restaurant[]> {
  const { kakao, places } = await getPlaces();
  const location = new kakao.maps.LatLng(Number(coord.y), Number(coord.x));

  const byId = new Map<string, Restaurant>();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items, hasNextPage } = await categorySearchPage(places, location, radiusMeters, page);
    for (const item of items) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    if (!hasNextPage) break;
  }

  return [...byId.values()];
}

/** Shuffles `pool` (Fisher-Yates) and takes the first `count` — the random
 * extraction the spec requires instead of just slicing the raw API order. */
export function pickRandomSubset<T>(pool: T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
