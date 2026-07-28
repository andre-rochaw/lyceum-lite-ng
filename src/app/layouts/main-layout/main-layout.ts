import { Component, HostListener, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  readonly theme = inject(ThemeService);

  readonly user = this.auth.currentUser;
  readonly sidenavOpened = signal(true);
  readonly isMobile = signal(false);

  constructor() {
    this.updateViewport();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewport();
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((open) => !open);
  }

  setTheme(preference: ThemePreference): void {
    this.theme.setPreference(preference);
  }

  themeIcon(): string {
    switch (this.theme.preference()) {
      case 'light':
        return 'light_mode';
      case 'dark':
        return 'dark_mode';
      default:
        return 'desktop_windows';
    }
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.notifications.info('Logout realizado'),
    });
  }

  private updateViewport(): void {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 960;
    const wasMobile = this.isMobile();
    this.isMobile.set(mobile);
    if (mobile && !wasMobile) {
      this.sidenavOpened.set(false);
    } else if (!mobile && wasMobile) {
      this.sidenavOpened.set(true);
    }
  }
}
