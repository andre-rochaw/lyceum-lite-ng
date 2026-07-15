import { animate, style, transition, trigger } from '@angular/animations';

export const routeFadeAnimation = trigger('routeFade', [
  transition('* <=> *', [
    style({ opacity: 0 }),
    animate('220ms ease-in', style({ opacity: 1 })),
  ]),
]);
