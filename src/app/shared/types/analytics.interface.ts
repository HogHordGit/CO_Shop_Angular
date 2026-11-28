export type AnalyticsEventType =
  | 'session_start'
  | 'page_view'
  | 'product_view'
  |  'heartbeat'
  | 'page_duration'
  | 'product_duration';

export interface AnalyticsInterface {
  event_id: string;
  visitor_id: string;
  session_id: string;
  event_type: AnalyticsEventType;
  page_url: string;

  product_id?: number | null;
  device_type?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  referrer?: string | null;

  event_data?: Record<string, unknown>;
}

export interface AnalyticsSession {
  session_id: string;
  last_activity: number;
}

export interface AnalyticsResponse {
  message: string;
  event_id: string;
}

export interface AnalyticsOnlineResponse {
  online_visitors: number;
}

export interface AnalyticsPageTracking {
  pageUrl: string;
  productId: number | null;
  startedAt: number | null;
  durationMs: number;
  productStartedAt: number | null;
  productDurationMs: number;
}
