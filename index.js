const fs = require('fs');
const path = require('path');
const debug = require('debug')('koa:i18n-s');
const I18nS = require('i18n-s');

const LOCALE_METHODS = [
  'Subdomain',
  'Cookie',
  'Header',
  'Query',
  'Url',
  'TLD'
];

const GET_PREFIX = 'getLocaleFrom';

// extend
class I18n extends I18nS {
  constructor(locale, localeData, opts) {
    super(locale, localeData);

    this.opts = opts;
  }

  setLocale(locale) {
    super.setLocale(locale);

    let data = this.readLocaleData(locale);
    this.setLocaleData(locale, data);
  }

  readLocaleData(lc) {
    let locale = lc || this.getLocale();
    let opts = this.opts;
    let data = {};
    let fileName = locale + opts.extension;
    let file = path.join(opts.directory, fileName);

    try {
      data = JSON.parse(fs.readFileSync(file));
    } catch(e) {
      console.error('unable to parse locales from file (maybe ' + file + ' is empty or unreadable or not JSON format?): ');
    }

    return data;
  }
}

// module.exports
module.exports = function ial(app, opts) {

  const options = Object.assign({
    // support locales
    locales: ['zh-CN'],

    // default locale, must in locales
    defaultLocale: 'zh-CN',

    // the i18n data directory, absolute path
    directory: '',

    // the extension of the i18n data file,
    // the data of file must be JSON format
    extension: '.js',

    // the mode to get locale from,
    // search by order, use the first matched one
    // example: ['subdomain', 'cookie', 'header', 'query', 'url', 'tld']
    // https://github.com/koa-modules/locale
    modes: [],

    // mappings other locales that not in locales to one of the locales
    // example: {'zh-HK': 'zh-CN'}
    mappings: {},

    // whether get locale data from memory cache
    // so do not need to read file every request
    memoryCache: true,

    // clear the locale in path, so can match router later
    // /zh-CN/xxx => /xxx
    rewrite: true,
  }, opts);

  const whitelist = [];

  options.modes.forEach(v => {
    if(typeof v !== 'function') {
      v = LOCALE_METHODS.find(
        (t) => t.toLowerCase() === v.toLowerCase()
      );
    }
    if (v) whitelist.push(v);
  });

  // bind ctx.i18n
  Object.defineProperty(app.context, 'i18n', {
    get: function () {
      if (this._i18n) {
        return this._i18n;
      }

      const i18n = new I18n(options.defaultLocale, {}, options);

      this._i18n = i18n;
      this.__ = i18n.__.bind(i18n);

      debug('app.ctx.i18n %j', i18n);

      return i18n;
    }
  });

  // i18n middleware
  return function i18nMiddleware(ctx, next) {
    let localeMap = {};
    let whiteMap = {};
    let locale;
    let localeDetected;

    // localeMap
    LOCALE_METHODS.forEach(key => {
      localeMap[key] = ctx.request[GET_PREFIX + key]();
    });

    // whiteMap
    whitelist.forEach(key => {
      if (typeof key === 'function') {
        whiteMap[key] = key(ctx);
      } else {
        whiteMap[key] = ctx.request[GET_PREFIX + key]();
      }
      // detected locale
      if (!localeDetected && whiteMap[key]) {
        localeDetected = whiteMap[key];
      }
    });

    // detect locale from modes
    options.locales.forEach(lc => {
      Object.keys(whiteMap).some(key => {
        let val = whiteMap[key];
        // Accept-Language:zh-CN,zh;q=0.8,en;q=0.6
        if (Array.isArray(val)) {
          if (val.indexOf(lc) !== -1) locale = lc;
        } else {
          if (lc === val) locale = lc;
        }
        return !!locale;
      });
    });

    // locale
    locale = locale ||
      options.mappings[String(localeDetected)] ||
      options.defaultLocale;

    // ctx.state
    ctx.state.localeDetected = localeDetected;
    ctx.state.localeMap = localeMap;
    ctx.state.locale = locale;
    ctx.i18n.setLocale(locale);

    // rewrite
    if (options.rewrite) {
      let orig = ctx.path;
      let re = new RegExp(`^\\/${ctx.state.locale}(\\/|$)`);
      let m = re.exec(orig);

      if (m) {
        ctx.path = orig.replace(re, '/');
        return next().then(() => {
          ctx.path = orig;
        });
      }
    }

    return next();
  }
}
