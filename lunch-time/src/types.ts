/** A Kakao Local restaurant, trimmed to the fields this app actually uses.
 * Every field here comes straight from the Kakao API response — nothing is
 * invented client-side (no ratings, review counts, or images). */
export interface Restaurant {
  id: string;
  place_name: string;
  category_name: string;
  /** First sub-category after "음식점 > ", e.g. "한식" — derived from category_name, never guessed. */
  categoryLabel: string;
  road_address_name: string;
  address_name: string;
  phone: string;
  distance: string;
  place_url: string;
  x: string;
  y: string;
}

/** One row in the location search dropdown (Kakao keyword search result). */
export interface LocationOption {
  id: string;
  placeName: string;
  addressName: string;
  x: string;
  y: string;
}

export interface SelectedLocation {
  label: string;
  x: string;
  y: string;
}

export const RADIUS_OPTIONS = [
  { value: 300, label: '300 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
] as const;

export const DEFAULT_RADIUS = 500;

export const MIN_COUNT = 3;
export const MAX_COUNT = 10;
export const DEFAULT_COUNT = 5;
