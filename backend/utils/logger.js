const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  log: (...args) => {
    console.log(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  info: (...args) => {
    console.info(...args);
  }
};

module.exports = logger;
