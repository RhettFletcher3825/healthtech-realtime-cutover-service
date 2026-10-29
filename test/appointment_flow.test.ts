import { describe, expect, it } from 'vitest';
import {
  appointmentChannelName,
  appointmentEventName,
  patientSafeNotification
} from '../src/appointment_flow.js';

describe('appointment workflow decisions', () => {
  it('replaces follow-up internal wording with a patient-safe notification', () => {
    const result = patientSafeNotification({
      appointmentId: 'apt_1001',
      patientId: 'pat_77',
      clinicianId: 'clin_14',
      sessionId: 'sess_demo_123',
      status: 'ready_for_followup',
      message: 'Lab values posted to the chart.',
      requestId: 'evt_1001',
      accountId: 'acct_health_1'
    });

    expect(appointmentChannelName('apt_1001')).toBe('appointments.apt_1001');
    expect(appointmentEventName('ready_for_followup')).toBe('appointment.ready_for_followup');
    expect(result.message).toBe('Your care team added a follow-up note. Open the appointment chat to review next steps.');
    expect(result.audience).toBe('patient_and_clinician');
  });
});
