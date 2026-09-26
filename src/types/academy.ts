export type AcademyId = 'BLC' | 'KTA';
export type AcademyScope = AcademyId | 'NCOA';

export type AccessLevel =
  | 'NCOA_MANAGER'
  | 'SCHEDULE_IMPORTER'
  | 'SENIOR'
  | 'TV_DISPLAY'
  | 'STUDENT';

export type AppPermission =
  | 'schedule.read'
  | 'schedule.write'
  | 'schedule.import'
  | 'location.manage'
  | 'conflict.resolve';

export interface AccessProfile {
  role: 'ADMIN' | 'VIEWER' | 'STUDENT';
  accessLevel: AccessLevel;
  academy: AcademyId;
  scope: AcademyScope;
  permissions: AppPermission[];
  studentCycleName?: string;
  requiresServerAuth?: boolean;
}

export const canAccessAcademy = (profile: AccessProfile, academy: AcademyId) =>
  profile.scope === 'NCOA' || profile.scope === academy;

export const hasPermission = (profile: AccessProfile | null, permission: AppPermission) =>
  Boolean(profile?.permissions.includes(permission));
