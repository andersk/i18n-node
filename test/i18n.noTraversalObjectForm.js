const fs = require('fs')
const path = require('path')
const os = require('os')
const { I18n } = require('..')
require('should')

// Regression test: object-form locale must stay within the locales directory.
describe('No directory traversal for the object-form API', () => {
  let lab, locales, secret, outside, i18n

  before('prepare a lab with a secret file outside the locales dir', () => {
    lab = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-traversal-'))
    locales = path.join(lab, 'app', 'locales')
    fs.mkdirSync(locales, { recursive: true })
    fs.writeFileSync(path.join(locales, 'en.json'), '{ "welcome": "hi" }')

    secret = path.join(lab, 'secret.json')
    fs.writeFileSync(secret, JSON.stringify({ leak: 'DB_PASSWORD=hunter2' }))

    // path would try to create outside the locales dir
    outside = path.join(lab, 'pwned.json')

    i18n = new I18n({
      locales: ['en'],
      directory: locales,
      updateFiles: true,
      defaultLocale: 'en'
    })
  })

  after('cleanup', () => {
    try {
      fs.rmSync(lab, { recursive: true, force: true })
    } catch (_) {}
  })

  it('__({ phrase, locale: "../../secret" }) SHOULD throw and not read outside the dir', () => {
    ;(() =>
      i18n.__({ phrase: 'leak', locale: '../../secret' })).should.throw(
      /invalid locale|escapes the locales directory/
    )
  })

  it('__({ phrase, locale: "../../pwned" }) SHOULD throw and not write outside the dir', () => {
    ;(() =>
      i18n.__({ phrase: 'welcome', locale: '../../pwned' })).should.throw(
      /invalid locale|escapes the locales directory/
    )
    fs.existsSync(outside).should.equal(false)
  })

  it('__n({ ..., locale: "../../secret" }) SHOULD throw', () => {
    ;(() =>
      i18n.__n({
        singular: 'leak',
        plural: 'leaks',
        locale: '../../secret',
        count: 1
      })).should.throw(/invalid locale|escapes the locales directory/)
  })

  it('a valid locale SHOULD still work unchanged', () => {
    i18n.__({ phrase: 'welcome', locale: 'en' }).should.equal('hi')
  })
})
