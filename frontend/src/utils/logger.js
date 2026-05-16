/**
 * Structured logging for frontend
 * Provides consistent logging across the application with different modes for dev/prod
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
};

class Logger {
  constructor(component = 'App') {
    this.component = component;
    this.level = this.getLogLevel();
    this.isDevelopment = import.meta.env.DEV;
  }

  getLogLevel() {
    const level = import.meta.env.VITE_LOG_LEVEL || 'INFO';
    return LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  /**
   * Format log entry as structured JSON
   */
  formatLog(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...data
    };
  }

  /**
   * Output log to console (dev) or collect for backend (prod)
   */
  output(level, logEntry) {
    if (LOG_LEVELS[level] < this.level) {
      return; // Skip if below threshold
    }

    if (this.isDevelopment) {
      // Development: colorful console output
      const colors = {
        DEBUG: 'color: gray',
        INFO: 'color: blue',
        WARNING: 'color: orange',
        ERROR: 'color: red',
        CRITICAL: 'color: red; font-weight: bold'
      };

      console.log(
        `%c[${level}] ${this.component}:`,
        colors[level],
        logEntry.message,
        logEntry
      );
    } else {
      // Production: structured JSON to console
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Debug log (lowest priority)
   */
  debug(message, data = {}) {
    this.output('DEBUG', this.formatLog('DEBUG', message, data));
  }

  /**
   * Info log (normal operations)
   */
  info(message, data = {}) {
    this.output('INFO', this.formatLog('INFO', message, data));
  }

  /**
   * Warning log (potential issues)
   */
  warn(message, data = {}) {
    this.output('WARNING', this.formatLog('WARNING', message, data));
  }

  /**
   * Error log (errors that don't crash)
   */
  error(message, error = null, data = {}) {
    const logData = { ...data };

    if (error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };

      // Add HTTP error details if present
      if (error.response) {
        logData.http = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
      }
    }

    this.output('ERROR', this.formatLog('ERROR', message, logData));
  }

  /**
   * Critical error log (crashes/fatal errors)
   */
  critical(message, error = null, data = {}) {
    const logData = { ...data };

    if (error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };

      if (error.response) {
        logData.http = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
      }
    }

    this.output('CRITICAL', this.formatLog('CRITICAL', message, logData));
  }

  /**
   * Log HTTP request
   */
  logRequest(method, url, data = {}) {
    this.debug('HTTP request', {
      method,
      url,
      ...data
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(method, url, status, duration = null, data = {}) {
    const logData = {
      method,
      url,
      status,
      ...data
    };

    if (duration !== null) {
      logData.duration_ms = duration;
    }

    if (status >= 500) {
      this.error('HTTP response error', null, logData);
    } else if (status >= 400) {
      this.warn('HTTP response warning', logData);
    } else {
      this.debug('HTTP response success', logData);
    }
  }

  /**
   * Create a child logger for a specific component
   */
  child(componentName) {
    return new Logger(`${this.component}.${componentName}`);
  }
}

/**
 * Create logger instance for a component
 * @param {string} component - Component name (e.g., 'AssessmentDetail', 'CardsTable')
 * @returns {Logger} Logger instance
 */
export function getLogger(component = 'App') {
  return new Logger(component);
}

/**
 * Global error handler to catch unhandled errors
 */
export function setupGlobalErrorHandling() {
  const globalLogger = getLogger('Global');

  window.addEventListener('error', (event) => {
    globalLogger.critical('Unhandled error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    globalLogger.critical('Unhandled promise rejection', event.reason, {
      promise: event.promise
    });
  });
}

export default Logger;
