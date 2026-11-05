import { createSuspensionHandler } from '@/features/account/server/admin/suspension';

const handler = createSuspensionHandler('workspace');

export const GET = handler.GET;
export const POST = handler.POST;
