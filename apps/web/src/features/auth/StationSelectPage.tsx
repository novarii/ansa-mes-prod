/**
 * Station Selection Page Component
 *
 * Allows authenticated employees to select their working station.
 * After successful selection, redirects to the main dashboard.
 *
 * @see specs/user-permission-model.md
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@org/shared-i18n';
import type { StationOption } from '@org/shared-types';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner/Spinner';
import { AlertCircle, LogOut, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Station Selection Page Component
 */
export function StationSelectPage(): JSX.Element {
  const { t } = useI18n();
  const { empName, getAuthorizedStations, selectStation, logout, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  /**
   * Fetch authorized stations on mount
   */
  const fetchStations = useCallback(async (): Promise<void> => {
    setIsLoadingStations(true);
    setFetchError(null);

    try {
      const stationList = await getAuthorizedStations();
      setStations(stationList);

      // Pre-select default station if available
      const defaultStation = stationList.find((s) => s.isDefault);
      if (defaultStation) {
        setSelectedStation(defaultStation.code);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Istasyonlar yuklenemedi';
      setFetchError(message);
    } finally {
      setIsLoadingStations(false);
    }
  }, [getAuthorizedStations]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  /**
   * Handle station selection
   */
  function handleStationClick(stationCode: string): void {
    setSelectedStation(stationCode);
    clearError();
  }

  /**
   * Handle confirm selection
   */
  async function handleConfirm(): Promise<void> {
    if (!selectedStation) return;

    setIsSelecting(true);

    try {
      await selectStation(selectedStation);
      navigate('/');
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSelecting(false);
    }
  }

  /**
   * Handle logout
   */
  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  // Show loading state
  if (isLoadingStations) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="large" centered label={t('common.status.loading') || 'Yukleniyor...'} showLabel />
      </div>
    );
  }

  // Show fetch error
  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-center gap-4">
              <Button variant="outline" onClick={fetchStations}>
                {t('common.actions.retry') || 'Tekrar Dene'}
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('common.actions.logout') || 'Cikis'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" data-testid="station-select-page">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold leading-none">
              {t('auth.stationSelect.title')}
            </h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label={t('common.actions.logout') || 'Cikis'}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            <span className="font-medium">{empName}</span>
            {' - '}
            {t('auth.stationSelect.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* No stations available */}
          {stations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>{t('auth.stationSelect.noStations') || 'Yetkili istasyon bulunamadi'}</p>
              <p className="mt-2 text-sm">
                {t('auth.stationSelect.contactAdmin') || 'Lutfen yoneticinizle iletisime gecin'}
              </p>
            </div>
          ) : (
            /* Station list */
            <div className="space-y-2">
              {stations.map((station) => (
                <button
                  key={station.code}
                  type="button"
                  onClick={() => handleStationClick(station.code)}
                  data-selected={selectedStation === station.code}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    selectedStation === station.code
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-input'
                  )}
                  disabled={isSelecting || isLoading}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{station.name}</span>
                    <span className="text-sm text-muted-foreground">{station.code}</span>
                  </div>
                  {station.isDefault && (
                    <Badge variant="secondary">
                      {t('auth.stationSelect.defaultStation')}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>

        {stations.length > 0 && (
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={!selectedStation || isSelecting || isLoading}
            >
              {isSelecting || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.status.loading') || 'Yukleniyor...'}
                </>
              ) : (
                t('auth.stationSelect.confirm')
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default StationSelectPage;
