'use strict'

/**
 * Module dependencies.
 */

const assert = require('assert')
const path = require('path')
const request = require('supertest')
const Koa = require('koa')
const convert = require('koa-convert')
const compose = require('koa-compose')
const locale = require('koa-locale')
const render = require('koa-swig')
const views = require('koa-views')
const i18n = require('..')

describe('koa-i18n-s', () => {
  describe('Detect the Querystring', () => {
    it('should be `en` locale', () => {
      var app = new Koa()

      locale(app)

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-TW'],
        defaultLocale: 'zh-CN',
        modes: ['query']
      }))

      app.use(async (ctx, next) => {
        ctx.body = ctx.i18n.__('locales.en')
      })

      return request(app.listen())
      .get('/?locale=en')
      .expect(/english/i)
      .expect(200)
    })

  })

  describe('Detect the Subdomain and mappings', () => {
    var app = new Koa()
    var currentLocale

    locale(app)

    var enApp = new Koa()
    enApp.use(async (ctx, next) => {
      currentLocale = ctx.request.getLocaleFromSubdomain()
    })
    enApp = compose(enApp.middleware)

    var zhCNApp = new Koa()
    zhCNApp.use(async (ctx, next) => {
      currentLocale = ctx.getLocaleFromSubdomain()
    })
    zhCNApp = compose(zhCNApp.middleware)

    app.use(async (ctx, next) => {
      currentLocale = undefined
      switch (ctx.host) {
        case 'en.koajs.com':
          await enApp.call(ctx, ctx)
        case 'zh-CN.koajs.com':
          await zhCNApp.call(ctx, ctx)
      }
      await next()
    })

    app.use(i18n(app, {
      directory: __dirname + '/fixtures/locales',
      locales: ['zh-CN', 'en', 'zh-TW'],
      defaultLocale: 'zh-CN',
      mappings: {
        'zh-HK': 'zh-TW'
      },
      modes: ['subdomain', 'url']
    }))

    app.use(async (ctx, next) => {
      if (currentLocale) {
        assert(currentLocale === ctx.getLocaleFromSubdomain())
      }
      ctx.body = ctx.i18n.__('locales.en')
    })

    it('should be `en` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Host', 'en.koajs.com')
      .expect(/English/)
      .expect(200)
    })

    it('should be `zh-cn` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Host', 'zh-CN.koajs.com')
      .expect(/英文/)
      .expect(200)
    })

    it('should be `zh-tw` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Host', 'zh-TW.koajs.com')
      .expect(/locales.en.tw/)
      .expect(200)
    })

    it('should be `zh-tw` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Host', 'zh-HK.koajs.com')
      .expect(/locales.en.tw/)
      .expect(200)
    })
  })

  describe('Dected the header', () => {
    it('should be `zh-tw` locale', () => {
      var app = new Koa()

      locale(app)

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-TW'],
        modes: ['header']
      }))

      app.use(async (ctx, next) => {
        ctx.body = ctx.i18n.__('locales.zh-CN')
      })

      return request(app.listen())
      .get('/')
      .set('Accept-Language', 'zh-TW')
      .expect(/簡體中文/)
      .expect(200)
    })
  })

  describe('Detect the cookie', () => {
    it('should be `zh-cn` locale', () => {
      var app = new Koa()

      locale(app)

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-TW'],
        modes: ['cookie']
      }))

      app.use(async (ctx, next) => {
        ctx.body = ctx.i18n.__('locales.zh-CN')
      })

      return request(app.listen())
      .get('/')
      .set('Cookie', 'locale=zh-CN')
      .expect(/简体中文/)
      .expect(200)
    })
  })

  describe('working together, i18n and swig-render', () => {
    it('should be render by zh-cn locale', () => {
      var app = new Koa()

      locale(app)

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-TW'],
        modes: ['cookie']
      }))

      app.context.render = render({
        root: __dirname + '/fixtures/',
        ext: 'html'
      })

      app.use(convert(function*(next) {
        yield this.render('index', {
          result: this.i18n.__('locales.en')
        })
      }))

      return request(app.listen())
      .get('/')
      .set('Cookie', 'locale=zh-cn')
      .expect(/英文/)
      .expect(200)
    })
  })

  describe('working together with koa-views, pug render', () => {
    it('should be render by zh-cn locale', () => {
      var app = new Koa()

      locale(app, 'lang')

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-tw'],
        modes: ['cookie']
      }))

      app.use(views(__dirname + '/fixtures/', {
        extension: 'pug'
      }))

      app.use(async (ctx, next) => {
        await ctx.render('index', {__: ctx.i18n.__.bind(ctx.i18n)})
      })

      return request(app.listen())
        .get('/')
        .set('Cookie', 'lang=zh-cn')
        .expect(/<div><p>英文<\/p><\/div>/)
        .expect(200)
    })
  })

  describe('Dected the header and cookie', () => {
    var app
    before(() => {
      app = new Koa()

      locale(app)

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-TW'],
        modes: ['cookie', 'header']
      }))

      app.use(async (ctx, next) => {
        ctx.body = ctx.i18n.__('locales.zh-CN')
      })
    })

    it('should be `zh-tw` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Accept-Language', 'zh-TW')
      .expect(/簡體中文/)
      .expect(200)
    })

    it('should be `zh-cn` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Cookie', 'locale=zh-CN')
      .set('Accept-Language', 'en')
      .expect(/简体中文/)
      .expect(200)
    })
  })

  describe('accepts custom function as a mode', () => {
    var app,
    customMode = function(ctx) {
      return ctx.state.customLocale
    }

    before(() => {
      app = new Koa()

      locale(app)

      app.use(async (ctx, next) => {
        ctx.state.customLocale = 'en'
        await next();
      })

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en', 'zh-TW'],
        modes: ['cookie', customMode]
      }))

      app.use(async (ctx, next) => {
        ctx.body = ctx.i18n.__('locales.zh-CN')
      })
    })

    it('should be `en` locale', () => {
      return request(app.listen())
      .get('/')
      .expect(/Chinese\(Simplified\)/)
      .expect(200)
    })

    it('should be `zh-cn` locale', () => {
      return request(app.listen())
      .get('/')
      .set('Cookie', 'locale=zh-CN')
      .expect(/简体中文/)
      .expect(200)
    })
  })

  describe('app.request has i18n property', () => {
    it('should be `en` locale', () => {
      var app = new Koa()

      locale(app)

      app.use(i18n(app, {
        directory: __dirname + '/fixtures/locales',
        locales: ['zh-CN', 'en'],
        modes: ['query']
      }))

      app.use(async (ctx, next) => {
        ctx.body = !!ctx.i18n
      })

      return request(app.listen())
      .get('/?locale=en')
      .expect(/true/)
      .expect(200)
    })
  })
})
