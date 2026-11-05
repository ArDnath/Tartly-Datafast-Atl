import { createSuspensionHandler } from '@/features/account/server/admin/suspension';

const handler = createSuspensionHandler('user');

export const GET = handler.GET;
export const POST = handler.POST;
