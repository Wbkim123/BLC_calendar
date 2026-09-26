import { AccessProfile } from '../../types/academy';

export const canUseWebsite = (profile: AccessProfile | null): boolean =>
  Boolean(profile && (
    (profile.accessLevel === 'NCOA_MANAGER' && profile.scope === 'NCOA') ||
    (profile.accessLevel === 'TV_DISPLAY' && profile.scope === profile.academy)
  ));
