import {
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { analyticsEventURL, analyticsOnlineURL } from '../DbLinks/UrlLinks';

import {
  AnalyticsInterface,
  AnalyticsEventType,
  AnalyticsSession,
  AnalyticsResponse,
  AnalyticsOnlineResponse,
  AnalyticsPageTracking
} from '../types/analytics.interface';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  private currentPageTracking: AnalyticsPageTracking | null = null;
  private readonly visitorKey = 'analytics_visitor_id';
  private readonly sessionKey = 'analytics_session';

  // Тривалість неактивності — 30 хвилин
  private readonly sessionTimeout = 30 * 60 * 1000;

  private readonly isBrowser: boolean;

  // Інтервал надсилання Heartbeat — 30 секунд
  private readonly heartbeatInterval = 30 * 1000;

// Ідентифікатор таймера
  private heartbeatTimer: ReturnType<typeof setInterval>
    | null = null;

  getOnlineVisitors() {

    return this.http.get<AnalyticsOnlineResponse>(
      analyticsOnlineURL
    );
  }

  constructor(
    private http: HttpClient,

    @Inject(PLATFORM_ID)
    platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  startProductTracking(
    productId: number,
    pageUrl: string
  ): void {

    if (!this.isBrowser) {
      return;
    }

    const tracking = this.currentPageTracking;

    if (
      !tracking ||
      tracking.pageUrl !== pageUrl ||
      tracking.productId === productId
    ) {
      return;
    }

    tracking.productId = productId;

    if (document.visibilityState === 'visible') {

      tracking.productStartedAt =
        performance.now();
    }
  }

  startPageTracking(pageUrl: string): void {

    if (!this.isBrowser) {
      return;
    }

    if (
      pageUrl !== '/home' &&
      !pageUrl.startsWith('/home/')
    ) {
      return;
    }

    // Запобігання повторному запуску
    if (
      this.currentPageTracking?.pageUrl === pageUrl
    ) {
      return;
    }

    const isVisible =
      document.visibilityState === 'visible';

    this.currentPageTracking = {
      pageUrl: pageUrl,
      productId: null,

      startedAt: isVisible
        ? performance.now()
        : null,

      durationMs: 0,
      productStartedAt: null,
      productDurationMs: 0
    };
  }

  finishPageTracking(
    useBeacon: boolean = false
  ): void {

    if (!this.isBrowser) {
      return;
    }

    const tracking = this.currentPageTracking;

    if (!tracking) {
      return;
    }

    this.pausePageTracking();

    this.currentPageTracking = null;

    const durationMs =
      Math.round(tracking.durationMs);

    const productDurationMs =
      Math.round(tracking.productDurationMs);

    try {

      const visitorId = this.getVisitorId();

      const { session } = this.getSession();

      if (durationMs > 0) {

        const event = this.createEvent(
          'page_duration',
          visitorId,
          session.session_id,
          tracking.pageUrl,
          null,
          {
            duration_ms: durationMs
          }
        );

        this.sendDurationEvent(
          event,
          useBeacon
        );
      }

      if (
        tracking.productId !== null &&
        productDurationMs > 0
      ) {

        const event = this.createEvent(
          'product_duration',
          visitorId,
          session.session_id,
          tracking.pageUrl,
          tracking.productId,
          {
            duration_ms: productDurationMs
          }
        );

        this.sendDurationEvent(
          event,
          useBeacon
        );
      }

    } catch (error) {

      console.error(
        'Duration tracking error:',
        error
      );
    }
  }

  stopHeartbeat(): void {

    if (!this.isBrowser) {
      return;
    }

    if (this.heartbeatTimer !== null) {

      clearInterval(this.heartbeatTimer);

      this.heartbeatTimer = null;
    }

    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );

    window.removeEventListener(
      'pagehide',
      this.handlePageHide
    );

    window.removeEventListener(
      'pageshow',
      this.handlePageShow
    );
  }

  private handlePageShow = (
    event: PageTransitionEvent
  ): void => {

    if (event.persisted) {

      this.startPageTracking(
        window.location.pathname
      );

      this.sendHeartbeat();
    }
  };

  private handlePageHide = (): void => {

    this.finishPageTracking(true);
  };

  private handleVisibilityChange = (): void => {

    if (document.visibilityState === 'visible') {

      this.resumePageTracking();

      this.sendHeartbeat();

    } else {

      this.pausePageTracking();
    }
  };

  private pausePageTracking(): void {

    const tracking = this.currentPageTracking;

    if (!tracking) {
      return;
    }

    const currentTime = performance.now();

    if (tracking.startedAt !== null) {

      tracking.durationMs +=
        currentTime - tracking.startedAt;

      tracking.startedAt = null;
    }

    if (tracking.productStartedAt !== null) {

      tracking.productDurationMs +=
        currentTime - tracking.productStartedAt;

      tracking.productStartedAt = null;
    }
  }

  private sendDurationEvent(
    event: AnalyticsInterface,
    useBeacon: boolean
  ): void {

    if (
      useBeacon &&
      typeof navigator.sendBeacon === 'function'
    ) {

      const data = new Blob(
        [JSON.stringify(event)],
        {
          type: 'application/json'
        }
      );

      const queued = navigator.sendBeacon(
        analyticsEventURL,
        data
      );

      if (queued) {
        return;
      }
    }

    this.sendEvent(event);
  }

  private resumePageTracking(): void {

    const tracking = this.currentPageTracking;

    if (!tracking) {
      return;
    }

    const currentTime = performance.now();

    if (tracking.startedAt === null) {

      tracking.startedAt = currentTime;
    }

    if (
      tracking.productId !== null &&
      tracking.productStartedAt === null
    ) {

      tracking.productStartedAt = currentTime;
    }
  }

  private sendHeartbeat(): void {

    if (!this.isBrowser) {
      return;
    }

    // Не враховуємо приховані вкладки
    if (document.visibilityState !== 'visible') {
      return;
    }

    const currentPage = window.location.pathname;

    // Не враховуємо адміністративну панель
    if (
      currentPage !== '/home' &&
      !currentPage.startsWith('/home/')
    ) {
      return;
    }

    this.trackEvent(
      'heartbeat',
      currentPage
    );
  }

  startHeartbeat(): void {

    if (!this.isBrowser) {
      return;
    }

    // Запобігання створенню декількох таймерів
    if (this.heartbeatTimer !== null) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {

      this.sendHeartbeat();

    }, this.heartbeatInterval);

    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );

    window.addEventListener(
      'pagehide',
      this.handlePageHide
    );

    window.addEventListener(
      'pageshow',
      this.handlePageShow
    );
  }

  // Отримання ідентифікатора відвідувача
  private getVisitorId(): string {

    let visitorId = localStorage.getItem(
      this.visitorKey
    );

    if (!visitorId) {

      visitorId = crypto.randomUUID();

      localStorage.setItem(
        this.visitorKey,
        visitorId
      );
    }

    return visitorId;
  }

  // Отримання або створення сеансу
  private getSession(): {
    session: AnalyticsSession;
    isNew: boolean;
  } {

    const currentTime = Date.now();

    const storedSession = localStorage.getItem(
      this.sessionKey
    );

    let session: AnalyticsSession | null = null;

    if (storedSession) {

      try {
        session = JSON.parse(storedSession);
      } catch {
        session = null;
      }
    }

    let isNew = false;

    if (
      !session ||
      !session.session_id ||
      !Number.isFinite(session.last_activity) ||
      currentTime - session.last_activity >=
      this.sessionTimeout
    ) {

      session = {
        session_id: crypto.randomUUID(),
        last_activity: currentTime
      };

      isNew = true;

    } else {

      session.last_activity = currentTime;
    }

    localStorage.setItem(
      this.sessionKey,
      JSON.stringify(session)
    );

    return {
      session,
      isNew
    };
  }

  // Визначення типу пристрою
  private getDeviceType(): string {

    const userAgent = navigator.userAgent;

    if (
      /iPad|Tablet/i.test(userAgent) ||
      (
        /Android/i.test(userAgent) &&
        !/Mobile/i.test(userAgent)
      )
    ) {
      return 'tablet';
    }

    if (
      /Mobile|Android|iPhone|iPod/i.test(userAgent)
    ) {
      return 'mobile';
    }

    return 'desktop';
  }

  // Визначення браузера
  private getBrowser(): string {

    const userAgent = navigator.userAgent;

    if (/Edg/i.test(userAgent)) {
      return 'Edge';
    }

    if (/OPR|Opera/i.test(userAgent)) {
      return 'Opera';
    }

    if (/Firefox|FxiOS/i.test(userAgent)) {
      return 'Firefox';
    }

    if (/Chrome|CriOS/i.test(userAgent)) {
      return 'Chrome';
    }

    if (/Safari/i.test(userAgent)) {
      return 'Safari';
    }

    return 'Unknown';
  }

  // Визначення операційної системи
  private getOperatingSystem(): string {

    const userAgent = navigator.userAgent;

    if (/Windows/i.test(userAgent)) {
      return 'Windows';
    }

    if (/Android/i.test(userAgent)) {
      return 'Android';
    }

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 'iOS';
    }

    if (/Mac/i.test(userAgent)) {
      return 'macOS';
    }

    if (/Linux/i.test(userAgent)) {
      return 'Linux';
    }

    return 'Unknown';
  }

  // Формування об'єкта події
  private createEvent(
    eventType: AnalyticsEventType,
    visitorId: string,
    sessionId: string,
    pageUrl: string,
    productId: number | null = null,
    eventData: Record<string, unknown> = {}
  ): AnalyticsInterface {

    return {
      event_id: crypto.randomUUID(),
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
      page_url: pageUrl,
      product_id: productId,

      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      operating_system: this.getOperatingSystem(),

      referrer: document.referrer
        ? document.referrer.slice(0, 2048)
        : null,

      event_data: eventData
    };
  }

  // Надсилання події на сервер
  private sendEvent(event: AnalyticsInterface): void {

    this.http.post<AnalyticsResponse>(
      analyticsEventURL,
      event
    ).subscribe({

      next: (response) => {
        console.log(
          'Analytics event:',
          response
        );
      },

      error: (error) => {
        console.error(
          'Analytics error:',
          error
        );
      }
    });
  }

  // Основний метод реєстрації подій
  trackEvent(
    eventType: AnalyticsEventType,
    pageUrl?: string,
    productId: number | null = null,
    eventData: Record<string, unknown> = {}
  ): void {

    // Заборона виконання на стороні SSR
    if (!this.isBrowser) {
      return;
    }

    const currentPage =
      pageUrl || window.location.pathname;

    // Моніторинг лише публічної частини сайту
    if (
      currentPage !== '/home' &&
      !currentPage.startsWith('/home/')
    ) {
      return;
    }

    try {

      const visitorId = this.getVisitorId();

      const { session, isNew } =
        this.getSession();

      // Реєстрація початку нового сеансу
      if (
        isNew &&
        eventType !== 'session_start'
      ) {

        const sessionEvent = this.createEvent(
          'session_start',
          visitorId,
          session.session_id,
          currentPage
        );

        this.sendEvent(sessionEvent);
      }

      // Реєстрація основної події
      const event = this.createEvent(
        eventType,
        visitorId,
        session.session_id,
        currentPage,
        productId,
        eventData
      );

      this.sendEvent(event);

    } catch (error) {

      console.error(
        'Analytics initialization error:',
        error
      );
    }
  }

  // Реєстрація перегляду сторінки
  trackPageView(pageUrl: string): void {

    this.trackEvent(
      'page_view',
      pageUrl
    );
  }

  // Реєстрація перегляду товару
  trackProductView(productId: number): void {

    this.trackEvent(
      'product_view',
      undefined,
      productId
    );
  }
}
