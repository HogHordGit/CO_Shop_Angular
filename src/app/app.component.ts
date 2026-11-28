import {
  Component,
  DestroyRef,
  Inject,
  NgZone,
  OnInit,
  PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

import {
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';

import { filter } from 'rxjs';

import { takeUntilDestroyed } from
    '@angular/core/rxjs-interop';

import { AnalyticsService } from
    './shared/services/analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  title = 'angular-webApp';

  constructor(
    private router: Router,
    private analyticsService: AnalyticsService,
    private destroyRef: DestroyRef,
    private ngZone: NgZone,

    @Inject(PLATFORM_ID)
    private platformId: Object
  ) {}

  ngOnInit(): void {

    // Виконання лише у браузері
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Моніторинг переходів між сторінками
    this.router.events.pipe(

      filter(
        (event): event is NavigationEnd =>
          event instanceof NavigationEnd
      ),

      takeUntilDestroyed(this.destroyRef)

    ).subscribe((event) => {

      this.trackPage(event.urlAfterRedirects);

    });

    // Реєстрація початкової сторінки
    if (this.router.navigated) {

      this.trackPage(this.router.url);

    }

    // Запуск Heartbeat поза Angular Zone
    this.ngZone.runOutsideAngular(() => {

      this.analyticsService.startHeartbeat();

    });

    // Зупинка Heartbeat при знищенні компонента
    this.destroyRef.onDestroy(() => {

      this.analyticsService.stopHeartbeat();

    });
  }

  private trackPage(url: string): void {

    const pageUrl = url.split(/[?#]/)[0];

    // Завершення моніторингу попередньої сторінки
    this.analyticsService.finishPageTracking();

    // Реєстрація перегляду нової сторінки
    this.analyticsService.trackPageView(pageUrl);

    // Початок вимірювання часу
    this.analyticsService.startPageTracking(pageUrl);
  }
}
