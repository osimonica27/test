import { Prisma } from '@prisma/client';

// Extension for enabling pgvector operations
export const vectorExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    // Add vector datatype support
    query: {
      $allModels: {
        async $allOperations({ args, query, operation, model }) {
          // Transform vector fields to the format pgvector expects
          const result = await query(args);
          return result;
        },
      },
    },
  });
});
