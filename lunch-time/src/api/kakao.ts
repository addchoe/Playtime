import type { WheelItem } from '../types';

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined;
const BASE_URL = 'https://dapi.kakao.com/v2/local';
const RESTAURANT_CATEGORY_GROUP_CODE = 'FD6';

export class KakaoApiError extends Error {}

interface Coordinate {
  x: string;
  y: string;
}

async function kakaoGet<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!KAKAO_REST_API_KEY) {
    throw new KakaoApiError(
      '카카오 API 키가 설정되지 않았습니다. .env 파일에 VITE_KAKAO_REST_API_KEY를 추가해주세요.',
    );
  }

  const url = `${BASE_URL}${path}?${new URLSearchParams(params).toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    });
  } catch {
    throw new KakaoApiError('카카오 API에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
  }

  if (!response.ok) {
    throw new KakaoApiError(`카카오 API 요청이 실패했습니다. (status ${response.status})`);
  }

  return response.json() as Promise<T>;
}

interface KakaoDocumentWithCoord {
  x: string;
  y: string;
}

interface KakaoSearchResponse<T> {
  documents: T[];
}

export async function geocodeLocation(query: string): Promise<Coordinate> {
  const addressResult = await kakaoGet<KakaoSearchResponse<KakaoDocumentWithCoord>>(
    '/search/address.json',
    { query },
  );
  if (addressResult.documents.length > 0) {
    const { x, y } = addressResult.documents[0];
    return { x, y };
  }

  // Fall back to keyword search for place names (e.g. "홍익대학교 세종관")
  // that aren't resolvable as a plain street address.
  const keywordResult = await kakaoGet<KakaoSearchResponse<KakaoDocumentWithCoord>>(
    '/search/keyword.json',
    { query },
  );
  if (keywordResult.documents.length > 0) {
    const { x, y } = keywordResult.documents[0];
    return { x, y };
  }

  throw new KakaoApiError('입력하신 위치를 찾을 수 없습니다. 다른 주소나 장소명을 입력해주세요.');
}

interface KakaoCategoryDocument {
  id: string;
  place_name: string;
  category_name: string;
}

function shortCategoryTag(categoryName: string): string {
  // "음식점 > 한식 > 육류,고기" -> "한식"
  const parts = categoryName.split('>').map((part) => part.trim());
  return parts[1] ?? parts[0] ?? '음식점';
}

export async function searchNearbyRestaurants(
  coord: Coordinate,
  radiusMeters: number,
): Promise<WheelItem[]> {
  const result = await kakaoGet<KakaoSearchResponse<KakaoCategoryDocument>>(
    '/search/category.json',
    {
      category_group_code: RESTAURANT_CATEGORY_GROUP_CODE,
      x: coord.x,
      y: coord.y,
      radius: String(radiusMeters),
      size: '15',
      sort: 'distance',
    },
  );

  return result.documents.map((doc) => ({
    id: doc.id,
    name: doc.place_name,
    category: shortCategoryTag(doc.category_name),
  }));
}

/** Picks `count` items at random, without replacement, from `pool`. */
export function pickRandomSubset<T>(pool: T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
