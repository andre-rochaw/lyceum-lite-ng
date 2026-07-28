import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'lyceum-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mediaQuery = this.document.defaultView?.matchMedia(
    '(prefers-color-scheme: dark)',
  );

  private readonly preferenceSignal = signal<ThemePreference>(this.readStored());

  readonly preference = this.preferenceSignal.asReadonly();
  readonly resolved = computed<ResolvedTheme>(() => this.resolve(this.preferenceSignal()));

  constructor() {
    this.apply(this.preferenceSignal());
    this.mediaQuery?.addEventListener('change', () => {
      if (this.preferenceSignal() === 'system') {
        this.apply('system');
      }
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* ignore quota / private mode */
    }
    this.apply(preference);
  }

  private readStored(): ThemePreference {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
      }
    } catch {
      /* ignore */
    }
    return 'system';
  }

  private resolve(preference: ThemePreference): ResolvedTheme {
    if (preference === 'system') {
      return this.mediaQuery?.matches ? 'dark' : 'light';
    }
    return preference;
  }

  private apply(preference: ThemePreference): void {
    const resolved = this.resolve(preference);
    const root = this.document.documentElement;
    root.style.colorScheme = resolved;
    root.classList.toggle('dark-theme', resolved === 'dark');
    root.dataset['theme'] = resolved;
    root.dataset['themePreference'] = preference;
  }
}
