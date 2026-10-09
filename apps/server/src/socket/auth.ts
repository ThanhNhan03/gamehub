import { z } from 'zod';
export const identitySchema = z
  .object({
    playerId: z.uuid(),
    nickname: z.string().trim().min(1).max(24),
    avatar: z.number().int().min(0).max(7),
    accessCode: z.string().max(128).optional(),
  })
  .strict();

export function authenticate(payload: unknown, accessCode: string) {
  const parsed = identitySchema.safeParse(payload);
  if (!parsed.success)
    return { error: 'Thông tin vào chơi chưa hợp lệ.' } as const;
  if (accessCode && parsed.data.accessCode !== accessCode)
    return { error: 'Mã văn phòng chưa đúng. Thử lại nhé!' } as const;
  return { identity: parsed.data } as const;
}
