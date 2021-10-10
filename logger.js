const rTracer = require('cls-rtracer');

const { format, transports, createLogger } = require('winston');
const { get, omit } = require('lodash');
const {
  logger: ExpressWinstonLogger,
  requestWhitelist,
  responseWhitelist,
} = require('express-winston');
require('winston-daily-rotate-file');

const OMITTED_KEYS_FROM_LOG_OBJECT = [
  'message',
  'level',
  'timestamp',
  'namespace',
  'meta',
  'meta.req',
  'meta.res',
];
const CONFIGURED_LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const getRequestMetaData = (req, res) => {
  if (!req || !res) {
    return {};
  }

  return {
    host: req.headers.host,
    requestHeaders: req.headers,
    requestBody: req.body,
    responseBody: res.body,
  };
};

const addCustomAttributesToLogObject = format((info, opts) => {
  return {
    ...omit(info, OMITTED_KEYS_FROM_LOG_OBJECT),
    _correlation_id: rTracer.id(),
    _level: info.level,
    _timestamp: info.timestamp,
    _message: info.message,
    _tag: opts.tag,
    _namespace: info.namespace,
    _meta:
      opts.tag === 'access'
        ? getRequestMetaData(get(info, 'meta.req'), get(info, 'meta.res'))
        : info.meta,
    _processing_time_in_ms: get(info, 'meta.responseTime'),
    _url: get(info, 'meta.req.url'),
    _method: get(info, 'meta.req.method'),
    _response_code: get(info, 'meta.res.statusCode'),
    user_agent: get(info, 'meta.req.headers["user-agent"]'),
    referer: get(info, 'meta.req.headers.referer'),
  };
});

const CONFIGURED_TRANSPORTS = [
  new transports.Console({ level: CONFIGURED_LOG_LEVEL }),
  new transports.DailyRotateFile({
    dirname: 'logs',
    level: CONFIGURED_LOG_LEVEL,
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d',
  }),
];

class AppLogger {
  constructor() {
    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        addCustomAttributesToLogObject({ tag: 'app' }),
        format.json(),
      ),
      transports: CONFIGURED_TRANSPORTS,
    });
  }

  info(namespace, meta) {
    this.logger.log(`info`, '', {
      namespace,
      meta,
    });
  }

  error(namespace, error, meta) {
    this.logger.log(`error`, '', {
      namespace,
      _error_stack: error instanceof Error ? error.stack : error,
      _error: error,
      meta,
    });
  }

  warn(namespace, meta) {
    this.logger.log(`warn`, '', {
      namespace,
      meta,
    });
  }

  debug(namespace, meta) {
    this.logger.log(`debug`, '', {
      namespace,
      meta,
    });
  }

  log(message, namespace) {
    this.logger.log(`info`, message, { namespace });
  }
}

const Logger = new AppLogger();

const ApiLoggerMiddleware = ExpressWinstonLogger({
  transports: CONFIGURED_TRANSPORTS,
  format: format.combine(
    format.timestamp(),
    addCustomAttributesToLogObject({ tag: 'access' }),
    format.json(),
  ),
  expressFormat: true,
  requestWhitelist: [...requestWhitelist, 'body'],
  responseWhitelist: [...responseWhitelist, 'body'],
});

module.exports = {
  Logger,
  ApiLoggerMiddleware,
};
