import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

// Ensure we reuse a single QueryClient instance per request on the server.
export const getQueryClient = cache(() => new QueryClient());
