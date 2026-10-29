import express from 'express';
import { ZodError } from 'zod';
import { infrai, InfraiError } from './infrai_client.js';
import {
  appointmentChannelName,
  appointmentEventName,
  appointmentUpdateSchema,
  patientSafeNotification,
  tokenRequestSchema
} from './appointment_flow.js';

const app = express();
app.use(express.json());

app.post('/appointments/chat/events', async (req, res) => {
  try {
    const input = appointmentUpdateSchema.parse(req.body);
    const channel = appointmentChannelName(input.appointmentId);
    const notification = patientSafeNotification(input);

    await infrai.realtime.channel.create({
      channel,
      type: 'private',
      vendor: 'ably'
    });

    await infrai.realtime.publish({
      channel,
      event: appointmentEventName(input.status),
      data: JSON.stringify(notification),
      account_id: input.accountId
    });

    res.status(200).json({
      appointmentId: input.appointmentId,
      channel,
      event: appointmentEventName(input.status),
      published: true,
      payload: notification
    });
  } catch (error) {
    respondWithError(error, res);
  }
});

app.post('/appointments/chat/token', async (req, res) => {
  try {
    const input = tokenRequestSchema.parse(req.body);
    await infrai.auth.session.verify(input.sessionId);

    const channel = appointmentChannelName(input.appointmentId);
    const tokenResult = await infrai.realtime.token.issue({
      client_id: input.clientId,
      channels: [channel],
      capabilities: ['subscribe', 'publish', 'presence'],
      ttl_seconds: 900
    });

    res.status(200).json({
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      channel,
      token: tokenResult.data
    });
  } catch (error) {
    respondWithError(error, res);
  }
});

function respondWithError(error: unknown, res: express.Response) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request body',
      details: error.flatten()
    });
    return;
  }

  if (error instanceof InfraiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    res.status(status).json({
      error: error.message,
      details: error.details ?? null
    });
    return;
  }

  res.status(500).json({
    error: 'Unexpected server error'
  });
}

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`appointment chat service listening on http://localhost:${port}`);
});
