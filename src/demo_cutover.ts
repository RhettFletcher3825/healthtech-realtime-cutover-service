const baseUrl = process.env.SERVICE_BASE_URL ?? 'http://localhost:3000';

async function main() {
  const eventResponse = await fetch(`${baseUrl}/appointments/chat/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appointmentId: 'apt_1001',
      patientId: 'pat_77',
      clinicianId: 'clin_14',
      sessionId: 'sess_demo_123',
      status: 'ready_for_followup',
      message: 'Lab values posted to the chart.',
      requestId: 'evt_1001',
      accountId: 'acct_health_1'
    })
  });

  const eventBody = await eventResponse.json();
  console.log('event result');
  console.log(JSON.stringify(eventBody, null, 2));

  const tokenResponse = await fetch(`${baseUrl}/appointments/chat/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appointmentId: 'apt_1001',
      patientId: 'pat_77',
      sessionId: 'sess_demo_123',
      clientId: 'patient-pat_77'
    })
  });

  const tokenBody = await tokenResponse.json();
  console.log('token result');
  console.log(JSON.stringify(tokenBody, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
