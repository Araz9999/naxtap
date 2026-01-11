import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export default publicProcedure
  .input(z.object({
    conversationId: z.string(),
    viewerType: z.enum(['user', 'support']).optional(),
  }))
  .mutation(() => {
    // Disabled markAsRead functionality to prevent infinite loops
    // This route now returns immediately without doing anything
    // This prevents 404 errors while React Query clears its cache
    // Returns success immediately to satisfy any cached mutation calls
    return { success: true, updatedCount: 0 };
  });
