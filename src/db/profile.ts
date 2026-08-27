import { db } from './db';
import { DECK_PALETTE } from './decks';

export type Profile = { name: string; color: string; icon?: string };

// Dexie Cloud only treats a row as a private per-user singleton — syncing consistently across
// a device's devices instead of risking duplicate/conflicting copies once each has logged in —
// when its primary key is prefixed with '#'. See https://dexie.org/cloud/docs/consistency.
const PROFILE_KEY = '#profile';
const LEGACY_PROFILE_KEY = 'profile';
const DEFAULT_PROFILE: Profile = { name: 'Moi', color: DECK_PALETTE[0] };

export async function getProfile(): Promise<Profile> {
  const row = await db.appSettings.get(PROFILE_KEY);
  if (row) return row.value as Profile;

  // Migrate a pre-existing local profile (stored under the old, unsynced key) once.
  const legacy = await db.appSettings.get(LEGACY_PROFILE_KEY);
  if (legacy) {
    const profile = legacy.value as Profile;
    await db.appSettings.put({ key: PROFILE_KEY, value: profile });
    await db.appSettings.delete(LEGACY_PROFILE_KEY);
    return profile;
  }

  return DEFAULT_PROFILE;
}

export async function setProfile(profile: Profile) {
  await db.appSettings.put({ key: PROFILE_KEY, value: profile });
}
