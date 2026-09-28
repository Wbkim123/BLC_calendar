import { DailySchedule } from '../../types/schedule';
import { AcademyId } from '../../types/academy';

export interface ScheduleImportContext {
  academy: AcademyId;
  cycleName: string;
  startDate: string;
  locations: string[];
  uniforms: string[];
}

export interface SchedulePdfParser {
  academy: AcademyId;
  parse(file: File, context: ScheduleImportContext): Promise<DailySchedule[]>;
}
