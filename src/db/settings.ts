import { db } from './db';
import { DEFAULT_SWIPE_MAP, type SwipeGradeMap } from '../settings/swipe';
import type { ThemePreference } from '../settings/theme';
import type { CardOrder } from '../settings/cardOrder';

const SWIPE_MAP_KEY = 'swipeGradeMap';
const THEME_KEY = 'themePreference';
const CARD_ORDER_KEY = 'cardOrder';
const LAST_STREAK_KEY = 'lastKnownStreak';

export async function getSwipeGradeMap(): Promise<SwipeGradeMap> {
  const row = await db.appSettings.get(SWIPE_MAP_KEY);
  return (row?.value as SwipeGradeMap | undefined) ?? DEFAULT_SWIPE_MAP;
}

export async function setSwipeGradeMap(map: SwipeGradeMap) {
  await db.appSettings.put({ key: SWIPE_MAP_KEY, value: map });
}

export async function getThemePreference(): Promise<ThemePreference> {
  const row = await db.appSettings.get(THEME_KEY);
  return (row?.value as ThemePreference | undefined) ?? 'system';
}

export async function setThemePreference(theme: ThemePreference) {
  await db.appSettings.put({ key: THEME_KEY, value: theme });
}

export async function getCardOrder(): Promise<CardOrder> {
  const row = await db.appSettings.get(CARD_ORDER_KEY);
  return (row?.value as CardOrder | undefined) ?? 'random';
}

export async function setCardOrder(order: CardOrder) {
  await db.appSettings.put({ key: CARD_ORDER_KEY, value: order });
}

export async function getLastKnownStreak(): Promise<number> {
  const row = await db.appSettings.get(LAST_STREAK_KEY);
  return (row?.value as number | undefined) ?? 0;
}

export async function setLastKnownStreak(streak: number) {
  await db.appSettings.put({ key: LAST_STREAK_KEY, value: streak });
}
