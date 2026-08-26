import type { WheelItem } from '../types';

/**
 * Placeholder segments shown before the user runs a search — mirrors the
 * static content of the Figma frame (node 115:1316) exactly.
 */
export const DEFAULT_WHEEL_ITEMS: WheelItem[] = [
  { id: 'mock-1', name: '열정마라', category: '중식' },
  { id: 'mock-2', name: '고슬', category: '한식' },
  { id: 'mock-3', name: '안쉐프 고기 해물짬뽕', category: '중식' },
  { id: 'mock-4', name: '불로만 치킨바베큐', category: '한식' },
  { id: 'mock-5', name: '김밥천국', category: '한식' },
  { id: 'mock-6', name: '케로', category: '일식' },
  { id: 'mock-7', name: '흑룡강', category: '중식' },
  { id: 'mock-8', name: '비스트로이도', category: '양식' },
];
