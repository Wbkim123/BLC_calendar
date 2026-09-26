import { AcademyId } from '../types/academy';

export interface AcademyConfig {
  id: AcademyId;
  name: string;
  shortName: string;
  databasePrefix: string;
  defaultLocations: string[];
  defaultUniforms: string[];
}

export const ACADEMIES: Record<AcademyId, AcademyConfig> = {
  BLC: {
    id: 'BLC',
    name: 'Basic Leader Course',
    shortName: 'BLC',
    // Preserve the production paths used by the released BLC app.
    databasePrefix: '',
    defaultLocations: ['MPR', 'CR', 'DFC', 'AUD', 'ACA', 'FLD', 'HMP'],
    defaultUniforms: ['PT', 'ACU', 'ASU']
  },
  KTA: {
    id: 'KTA',
    name: 'KATUSA Training Academy',
    shortName: 'KTA',
    databasePrefix: 'academies/kta/',
    defaultLocations: ['ACA', 'MPR', 'DFC', 'AUD', 'PAO', 'FLD', 'RM 1165', 'RM 1157', 'TBD'],
    defaultUniforms: ['UNASSIGNED']
  }
};

export const getAcademyConfig = (academy: AcademyId) => ACADEMIES[academy];
