# sg-koa-i18n

> i18n middleware for koa@2.x, use with [sg-i18n](https://github.com/shared-goals/sg-i18n), you need to use together with [koa-locale](https://github.com/koa-modules/locale).

## Installation

```
npm i sg-koa-i18n -S
```

## Usage

```js
var app = require('koa')();
var locale = require('koa-locale');
var i18n = require('sg-koa-i18n');

// the locale key name defaults to `locale`
locale(app, 'language');

// add i18n middleware
app.use(i18n(app, {
  directory: __dirname + '/fixtures/locales',
  locales: ['zh-CN', 'en', 'zh-TW'],
  defaultLocale: 'zh-CN',
  mappings: {
    'zh-HK': 'zh-TW'
  },
  modes: [
    'header', 
    'url',
    (ctx) => {
      return ctx.headers['locale'];
    }
  ]
}));

// the, u can ust the i18n
app.use(async (ctx, next) => {
  // i18n instance
  let i18n = ctx.i18n;

  // translate
  let msg = i18n.__('msg');
  let msg2 = ctx.__('msg2');

  // ctx.state.locale: object
  console.log(ctx.state.locale)

  ctx.body = ctx.i18n.__('locales.en')
});
```

## ctx.state.locale

``` js
// ctx.state.locale
ctx.state.locale = {
  // the finnal used locale
  locale: locale,
  // the locale detected with modes, no mappings, no default,
  detected: localeDetected,
  // the detected locale of modes
  map: whiteMap,
  // the mode that locale detected from
  use: use,
}
```

## options

```js
{
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
  // example: ['Subdomain', 'Cookie', 'Header', 'Query', 'Url', 'TLD']
  // https://github.com/koa-modules/locale
  modes: ['url'],

  // mappings other locales that not in locales to one of the locales
  // example: {'zh-HK': 'zh-CN'}
  mappings: {},

  // clear the locale in path, so can match router later
  // /zh-CN/xxx => /xxx
  rewrite: true,
}
```

## Locale lookup priority

1. modes
2. locales
3. mappings
4. defaultLocale

## translate

- look at [sg-i18n](https://github.com/shared-goals/sg-i18n)
