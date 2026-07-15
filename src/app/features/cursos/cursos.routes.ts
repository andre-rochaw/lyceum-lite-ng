import { Routes } from '@angular/router';

export const CURSOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/curso-list/curso-list').then((m) => m.CursoList),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/curso-form/curso-form').then((m) => m.CursoForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/curso-form/curso-form').then((m) => m.CursoForm),
  },
];
