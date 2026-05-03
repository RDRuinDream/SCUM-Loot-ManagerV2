import { z } from 'zod';

export const SaveConfigSchema = z.object({
  configName: z.string().min(1).max(100),
  settingsJson: z.string().optional(),
  lootJson: z.string().optional()
});

export const UpdateUserSchema = z.object({
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
});

export type SaveConfigAction = z.infer<typeof SaveConfigSchema>;
