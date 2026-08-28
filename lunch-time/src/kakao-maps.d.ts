/**
 * Minimal ambient types for the Kakao Maps JavaScript SDK's `services`
 * library — just the shapes this app actually calls (Places, Geocoder).
 * There's no official @types package for this SDK, so these are hand-written
 * from the Kakao Maps JS SDK docs, not generated.
 */
export interface KakaoPlacesSearchResultItem {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
}

type KakaoStatus = 'OK' | 'ZERO_RESULT' | 'ERROR';

interface KakaoPagination {
  current: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalCount: number;
}

type KakaoPlacesSearchCallback = (
  data: KakaoPlacesSearchResultItem[],
  status: KakaoStatus,
  pagination: KakaoPagination,
) => void;

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoCategorySearchOptions {
  location?: KakaoLatLng;
  radius?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface KakaoPlaces {
  keywordSearch(keyword: string, callback: KakaoPlacesSearchCallback, options?: KakaoCategorySearchOptions): void;
  categorySearch(code: string, callback: KakaoPlacesSearchCallback, options?: KakaoCategorySearchOptions): void;
}

interface KakaoAddressResult {
  address?: { address_name: string } | null;
  road_address?: { address_name: string } | null;
}

type KakaoGeocoderCallback = (result: KakaoAddressResult[], status: KakaoStatus) => void;

interface KakaoGeocoder {
  coord2Address(lng: number, lat: number, callback: KakaoGeocoderCallback): void;
}

interface KakaoMapsServices {
  Places: new () => KakaoPlaces;
  Geocoder: new () => KakaoGeocoder;
  Status: { OK: 'OK'; ZERO_RESULT: 'ZERO_RESULT'; ERROR: 'ERROR' };
  SortBy: { DISTANCE: string; ACCURACY: string };
}

interface KakaoMapsNamespace {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  services: KakaoMapsServices;
}

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMapsNamespace;
    };
  }
}
