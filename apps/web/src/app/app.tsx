/**
 * MES Application Root Component
 *
 * Sets up providers and routing for the application.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@org/shared-i18n';
import { AuthProvider } from '../context/AuthContext';
import { AppRoutes } from '../routes';

/**
 * React Query client configuration
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests once
      retry: 1,
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Refetch on window focus
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Don't retry mutations by default
      retry: false,
    },
  },
});

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
