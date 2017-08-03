# koa-i18n-s

> i18n middleware for koa@2.x, use with [i18n-s](https://github.com/ccqgithub/i18n-s), you need to use together with [koa-locale](https://github.com/koa-modules/locale).

## Installation

```
npm i koa-i18n-s -S
```

## Usage

```js
var app = require('koa')();
var locale = require('koa-locale');
var i18n = require('koa-i18n-s');

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
  modes: ['subdomain', 'url']
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
  modes: ['Url'],

  // mappings other locales that not in locales to one of the locales
  // example: {'zh-HK': 'zh-CN'}
  mappings: {},

  // clear the locale in path, so can match router later
  // /zh-CN/xxx => /xxx
  rewrite: true,
}
```

## translate

- look at [i18n-s](https://github.com/ccqgithub/i18n-s)
