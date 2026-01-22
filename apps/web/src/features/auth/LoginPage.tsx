/**
 * Login Page Component
 *
 * Allows employees to login with their ID and PIN.
 * After successful login, redirects to station selection.
 *
 * @see specs/user-permission-model.md
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@org/shared-i18n';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * Form validation errors
 */
interface FormErrors {
  empId?: string;
  pin?: string;
}

/**
 * Login Page Component
 */
export function LoginPage(): JSX.Element {
  const { t } = useI18n();
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const empIdInputRef = useRef<HTMLInputElement>(null);

  const [empId, setEmpId] = useState('');
  const [pin, setPin] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Focus employee ID input on mount
  useEffect(() => {
    empIdInputRef.current?.focus();
  }, []);

  // Clear auth error when form changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [empId, pin]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Validate form fields
   */
  function validateForm(): boolean {
    const errors: FormErrors = {};

    if (!empId.trim()) {
      errors.empId = t('auth.errors.employeeIdRequired') || 'Personel numarasi zorunludur';
    }

    if (!pin.trim()) {
      errors.pin = t('auth.errors.pinRequired') || 'PIN zorunludur';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(parseInt(empId, 10), pin);
      // On success, navigate to station selection
      navigate('/select-station');
    } catch {
      // Error is handled by AuthContext and displayed in the UI
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-2xl font-bold leading-none">
            {t('auth.login.title')}
          </h1>
          <CardDescription>
            {t('auth.login.subtitle') || 'Sisteme giris yapmak icin bilgilerinizi girin'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Employee ID Field */}
            <div className="space-y-2">
              <Label htmlFor="empId">
                {t('auth.login.employeeId')}
              </Label>
              <Input
                ref={empIdInputRef}
                id="empId"
                type="number"
                inputMode="numeric"
                placeholder="123456"
                value={empId}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  setFormErrors((prev) => ({ ...prev, empId: undefined }));
                }}
                disabled={isLoading}
                aria-invalid={!!formErrors.empId}
                aria-describedby={formErrors.empId ? 'empId-error' : undefined}
              />
              {formErrors.empId && (
                <p id="empId-error" className="text-sm text-destructive">
                  {formErrors.empId}
                </p>
              )}
            </div>

            {/* PIN Field */}
            <div className="space-y-2">
              <Label htmlFor="pin">
                {t('auth.login.pin')}
              </Label>
              <Input
                id="pin"
                type="password"
                placeholder="****"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setFormErrors((prev) => ({ ...prev, pin: undefined }));
                }}
                disabled={isLoading}
                aria-invalid={!!formErrors.pin}
                aria-describedby={formErrors.pin ? 'pin-error' : undefined}
              />
              {formErrors.pin && (
                <p id="pin-error" className="text-sm text-destructive">
                  {formErrors.pin}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.login.loggingIn')}
                </>
              ) : (
                t('auth.login.submit')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
