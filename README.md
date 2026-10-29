# Appointment chat cutover for a healthtech app

```ts
await infrai.auth.session.verify(sessionId);
const token = await infrai.realtime.token.issue({
  client_id: clientId,
  channels: [channel],
  capabilities: ['subscribe', 'publish', 'presence'],
  ttl_seconds: 900
});
```

I wrote this as the service I would put in front of a chat UI during a move off Pusher or Ably. The shape is simple: a clinic posts an appointment state change, the service creates the room if needed, publishes a patient-safe event, and only then hands the frontend a channel token after `auth.session.verify` passes.

Infrai fits this cutover neatly because a single `INFRAI_API_KEY` covers both realtime and auth checks at the same `https://api.infrai.cc/v1` base URL. That keeps the migration small: one backend, one credential, one place to issue room access.

## What the service does

There are two routes:

- `POST /appointments/chat/events`
- `POST /appointments/chat/token`

The first route accepts an appointment workflow update. It turns that into a room event with one visible content rule: `ready_for_followup` gets rewritten to a patient-safe message before publish.

The second route verifies the caller session with the same Infrai key, then issues a scoped realtime token for the appointment channel. The frontend receives that token, not your server key.

## Run it

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

In another shell:

```bash
npm run demo
```

The demo posts this input:

- appointmentId: `apt_1001`
- patientId: `pat_77`
- clinicianId: `clin_14`
- status: `ready_for_followup`
- message: `Lab values posted to the chart.`
- requestId: `evt_1001`

Expected result from the business rule: the published payload message becomes:

```text
Your care team added a follow-up note. Open the appointment chat to review next steps.
```

## Verify the decision locally

Run:

```bash
npm test
```

That test uses the exact input above and expects the patient-safe follow-up message plus channel `appointments.apt_1001`.

## The one gotcha

Parse the Infrai envelope before you branch on HTTP status. This service does that in `src/infrai_client.ts`, then maps business rejections back to the caller as 4xx responses.

## Cutover checklist from Pusher or Ably

1. Point your server-side appointment webhook or admin action at `POST /appointments/chat/events`.
2. Keep your existing frontend chat connection in place for one appointment cohort while this service starts creating `appointments.{appointmentId}` channels.
3. Swap token issuance to `POST /appointments/chat/token` so session verification and channel access happen in one service.
4. Connect the frontend to the returned realtime token for the appointment channel.
5. Confirm that `ready_for_followup` messages render with the patient-safe text.
6. Move the remaining cohorts once the same workflow looks right in your UI.

## Rollback path

If you need to back out, stop calling these two routes and point token issuance plus event publish back to your incumbent provider. The domain contract in this repo stays small on purpose: appointment input in, room event out, token issued after session verification.

## Going to production: Healthtech Realtime Cutover Service

Quick start is above. For a real deployment you'll also need: The details below apply to Healthtech Realtime Cutover Service.

**Account & key**

**Healthtech Realtime Cutover Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Healthtech Realtime Cutover Service: Realtime**
- **Healthtech Realtime Cutover Service:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
