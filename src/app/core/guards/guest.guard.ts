import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Rotas publicas: se ja autenticado (token em memoria), manda para /home.
 * Nao chama ensureSession/HTTP aqui ? evita tela branca em /login com API lenta/offline.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
