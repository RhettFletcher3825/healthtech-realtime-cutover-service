import { z } from 'zod';

export const appointmentStatusSchema = z.enum(['scheduled', 'checked_in', 'in_consult', 'ready_for_followup', 'completed']);

export const appointmentUpdateSchema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  clinicianId: z.string().min(1),
  sessionId: z.string().min(1),
  status: appointmentStatusSchema,
  message: z.string().min(1).max(180),
  requestId: z.string().min(1),
  accountId: z.string().min(1).optional()
});

export const tokenRequestSchema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  sessionId: z.string().min(1),
  clientId: z.string().min(1)
});

export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;
export type TokenRequestInput = z.infer<typeof tokenRequestSchema>;

export function appointmentChannelName(appointmentId: string): string {
  return `appointments.${appointmentId}`;
}

export function appointmentEventName(status: AppointmentUpdateInput['status']): string {
  return `appointment.${status}`;
}

export function patientSafeNotification(input: AppointmentUpdateInput) {
  const visibleMessage =
    input.status === 'ready_for_followup'
      ? 'Your care team added a follow-up note. Open the appointment chat to review next steps.'
      : input.message;

  return {
    appointment_id: input.appointmentId,
    patient_id: input.patientId,
    clinician_id: input.clinicianId,
    status: input.status,
    message: visibleMessage,
    request_id: input.requestId,
    audience: 'patient_and_clinician'
  };
}
