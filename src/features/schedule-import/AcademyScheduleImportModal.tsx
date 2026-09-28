import React from 'react';
import ScheduleImportModal from '../../components/ScheduleImportModal';
import { AcademyId } from '../../types/academy';
import { DailySchedule } from '../../types/schedule';

interface Props {
  academy: AcademyId;
  onClose: () => void;
  onImport: (schedules: DailySchedule[]) => void;
  locations: string[];
  uniforms: string[];
}

/**
 * Academy boundary for PDF import. BLC continues to use its proven importer.
 * KTA currently uses the same import shell while its coordinate parser is
 * implemented separately under features/kta; this keeps import wiring out of
 * the shared calendar and prevents future KTA rules from changing BLC parsing.
 */
export default function AcademyScheduleImportModal(props: Props) {
  return (
    <ScheduleImportModal
      onClose={props.onClose}
      onImport={(schedules) => props.onImport(
        schedules.map(schedule => ({ ...schedule, academy: props.academy }))
      )}
      locations={props.locations}
      uniforms={props.uniforms}
      academy={props.academy}
    />
  );
}
