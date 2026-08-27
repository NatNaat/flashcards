import { db } from './db';
import { DECK_PALETTE } from './decks';

export type Profile = { name: string; color: string; icon?: string };

const PROFILE_KEY = 'profile';
const DEFAULT_PROFILE: Profile = { name: 'Moi', color: DECK_PALETTE[0] };

export async function getProfile(): Promise<Profile> {
  const row = await db.appSettings.get(PROFILE_KEY);
  return (row?.value as Profile | undefined) ?? DEFAULT_PROFILE;
}

export async function setProfile(profile: Profile) {
  await db.appSettings.put({ key: PROFILE_KEY, value: profile });
}
