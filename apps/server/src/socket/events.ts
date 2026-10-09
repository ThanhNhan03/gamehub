import { z } from 'zod';
export const codeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJKMNP-Z2-9]{4}$/),
  })
  .strict();
export const createSchema = z.discriminatedUnion('gameId', [
  z.object({ gameId: z.literal('caro'), maxPlayers: z.literal(2) }).strict(),
  z.object({ gameId: z.literal('poker'), maxPlayers: z.literal(8) }).strict(),
]);
export const emptySchema = z.object({}).strict();
export const spectatorIdSchema = z
  .object({ spectatorId: z.string().uuid() })
  .strict();
export const seatRequestResponseSchema = spectatorIdSchema.extend({
  accept: z.boolean(),
});
export const seatInviteResponseSchema = z
  .object({ accept: z.boolean() })
  .strict();
export const actionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('place'),
      row: z.number().int().min(0).max(14),
      col: z.number().int().min(0).max(14),
    })
    .strict(),
  z.object({ type: z.literal('fold') }).strict(),
  z.object({ type: z.literal('check') }).strict(),
  z.object({ type: z.literal('call') }).strict(),
  z.object({ type: z.literal('all-in') }).strict(),
  z
    .object({
      type: z.literal('raise'),
      raiseTo: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    })
    .strict(),
]);
export const chatSchema = z
  .object({ text: z.string().trim().min(1).max(300) })
  .strict();
export function allowEvent(
  buckets: Map<string, { since: number; count: number }>,
  key: string,
  limit: number,
) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.since >= 1000) {
    bucket = { since: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= limit;
}
