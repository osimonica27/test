export const SPAN_ID_BYTES = 8;
export const TRACE_ID_BYTES = 16;
export const TRACE_VERSION = '00';
export const TRACE_FLAG = '01';

const BytesBuffer = Array(32);

type TraceSpan = {
  name: string;
  spanId: string;
  displayName: {
    value: string;
    truncatedByteCount: number;
  };
  startTime: string;
  endTime: string;
  attributes: {
    attributeMap: {
      requestId: {
        stringValue: {
          value: string;
          truncatedByteCount: number;
        };
      };
    };
    droppedAttributesCount: number;
  };
};

/**
 * inspired by open-telemetry/opentelemetry-js
 */
export function generateRandUTF16Chars(bytes: number) {
  for (let i = 0; i < bytes * 2; i++) {
    BytesBuffer[i] = Math.floor(Math.random() * 16) + 48;
    // valid hex characters in the range 48-57 and 97-102
    if (BytesBuffer[i] >= 58) {
      BytesBuffer[i] += 39;
    }
  }

  return String.fromCharCode(...BytesBuffer.slice(0, bytes * 2));
}

// refers: https://cloud.google.com/trace/docs/reference/v2/rest/v2/projects.traces/batchWrite#:~:text=01%3A23.045123456Z%22.-,endTime,-string%20(Timestamp
export function toZuluDateFormat(date: Date): string {
  const pad = (num: number, shift = 2): string => {
    return ('0'.repeat(shift - 1) + num).slice(-shift);
  };

  date.getUTCMilliseconds();
  return (
    date.getUTCFullYear() +
    '-' +
    pad(date.getUTCMonth() + 1) +
    '-' +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    ':' +
    pad(date.getUTCMinutes()) +
    ':' +
    pad(date.getUTCMilliseconds(), 3) +
    'Z'
  );
}

export class TraceReporter {
  static traceReportEndpoint = runtimeConfig.traceReportEndpoint;
  static shouldReportTrace = runtimeConfig.shouldReportTrace;

  private spansCache = new Array<TraceSpan>();
  private reportIntervalId: number | undefined | NodeJS.Timeout;
  private reportInterval = 60_000;

  private static instance: TraceReporter;

  public static getInstance(): TraceReporter {
    if (!TraceReporter.instance) {
      const instance = (TraceReporter.instance = new TraceReporter());
      instance.initTraceReport();
    }

    return TraceReporter.instance;
  }

  public cacheTrace(
    traceId: string,
    spanId: string,
    requestId: string,
    startTime: string
  ) {
    const span = TraceReporter.createTraceSpan(
      traceId,
      spanId,
      requestId,
      startTime
    );
    this.spansCache.push(span);
    if (this.spansCache.length <= 1) {
      this.initTraceReport();
    }
  }

  public uploadTrace(
    traceId: string,
    spanId: string,
    requestId: string,
    startTime: string
  ) {
    const span = TraceReporter.createTraceSpan(
      traceId,
      spanId,
      requestId,
      startTime
    );
    TraceReporter.reportToTraceEndpoint(JSON.stringify({ spans: [span] }));
  }

  public static reportToTraceEndpoint(payload: string): void {
    if (typeof navigator !== 'undefined') {
      navigator.sendBeacon(TraceReporter.traceReportEndpoint, payload);
    } else {
      fetch(TraceReporter.traceReportEndpoint, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      }).catch(console.warn);
    }
  }

  public static createTraceSpan(
    traceId: string,
    spanId: string,
    requestId: string,
    startTime: string
  ): TraceSpan {
    return {
      name: `projects/{GCP_PROJECT_ID}/traces/${traceId}/spans/${spanId}`,
      spanId,
      displayName: {
        value: 'fetch',
        truncatedByteCount: 0,
      },
      startTime,
      endTime: toZuluDateFormat(new Date()),
      attributes: {
        attributeMap: {
          requestId: {
            stringValue: {
              value: requestId,
              truncatedByteCount: 0,
            },
          },
        },
        droppedAttributesCount: 0,
      },
    };
  }

  private initTraceReport = () => {
    if (!this.reportIntervalId && TraceReporter.shouldReportTrace) {
      if (typeof window !== 'undefined') {
        this.reportIntervalId = window.setInterval(
          this.reportHandler,
          this.reportInterval
        );
      } else {
        this.reportIntervalId = setInterval(
          this.reportHandler,
          this.reportInterval
        );
      }
    }
  };

  private reportHandler = () => {
    if (this.spansCache.length <= 0) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = undefined;
      return;
    }
    TraceReporter.reportToTraceEndpoint(
      JSON.stringify({ spans: [...this.spansCache] })
    );
    this.spansCache = [];
  };
}

export const traceReporter = TraceReporter.getInstance();
