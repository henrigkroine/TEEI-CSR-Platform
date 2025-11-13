import { sequence } from 'astro:middleware';
import { onRequest as authMiddleware } from './middleware/auth';

export const onRequest = sequence(authMiddleware);
