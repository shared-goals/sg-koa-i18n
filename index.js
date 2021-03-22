const fs = require('fs');
const path = require('path');
const debug = require('debug')('koa:i18n-s');
const I18nS = require('sg-i18n');

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
    let locale = lc;
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
    let use = 'Default';
    let localeDetected = null;
    let map = {};
    let locales = options.locales;
    let mappingKeys = Object.keys(options.mappings);
    let locale = options.defaultLocale;

    // detect
    whitelist.forEach(key => {
      let checked;

      if (typeof key === 'function') {
        checked = key(ctx);
      } else {
        checked = ctx.request[GET_PREFIX + key]();
      }

      if (
        locales.indexOf(checked) != -1 ||
        mappingKeys.indexOf(checked) != -1
      ) {
        map[key] = checked;
        // detected locale
        if (!localeDetected) {
          localeDetected = checked;
          use = key;
        }
      }
    });

    // not default
    if (localeDetected) {
      if (locales.indexOf(localeDetected) !== -1) {
        locale = localeDetected;
      } else {
        locale = options.mappings[localeDetected];
      }
    }

    // ctx.state.locale
    ctx.state.locale = {
      // the finnal used locale
      locale: locale,
      // the locale detected with modes, no mappings, no default,
      detected: localeDetected,
      // the detected locale of modes
      map: map,
      // the mode that locale detected from
      use: use,
    }

    // apply locale
    ctx.i18n.setLocale(locale);

    // rewrite
    if (options.rewrite && ctx.state.locale.use == 'Url') {
      let orig = ctx.path;
      ctx.path = orig.substr(locale.length + 1) || '/';

      return next().then(() => {
        ctx.path = orig;
      });
    }

    return next();
  }
}
