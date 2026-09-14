import { describe, it, expect, beforeEach } from 'vitest'
import {
  isSafeRedirect,
  rememberRedirect,
  consumeRedirect,
  clearRedirect,
  readRedirectQuery,
  resolveRedirectTarget,
  REDIRECT_STORAGE_KEY,
  DEFAULT_REDIRECT,
} from '@/utils/redirect'

describe('isSafeRedirect: защита от открытого редиректа', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('принимает обычные внутренние пути', () => {
    expect(isSafeRedirect('/catalogs/suppliers')).toBe(true)
    expect(isSafeRedirect('/')).toBe(true)
    expect(isSafeRedirect('/tenant-settings')).toBe(true)
  })

  it('сохраняет query и hash внутри пути', () => {
    expect(isSafeRedirect('/catalogs/suppliers?page=2')).toBe(true)
    expect(isSafeRedirect('/invite?token=abc#step-2')).toBe(true)
  })

  it('отклоняет абсолютные URL на чужой домен', () => {
    expect(isSafeRedirect('https://evil.com')).toBe(false)
    expect(isSafeRedirect('http://evil.com/phish')).toBe(false)
    expect(isSafeRedirect('javascript:alert(1)')).toBe(false)
    expect(isSafeRedirect('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('отклоняет протокол-относительные адреса', () => {
    expect(isSafeRedirect('//evil.com')).toBe(false)
    expect(isSafeRedirect('//evil.com/login')).toBe(false)
  })

  it('отклоняет обратные слэши, которые браузер трактует как //', () => {
    expect(isSafeRedirect('/\\evil.com')).toBe(false)
    expect(isSafeRedirect('/\\/evil.com')).toBe(false)
  })

  it('отклоняет управляющие символы', () => {
    expect(isSafeRedirect('/path\nSet-Cookie: x=1')).toBe(false)
    expect(isSafeRedirect('/path\r\nLocation: https://evil.com')).toBe(false)
    expect(isSafeRedirect('/\u0000')).toBe(false)
  })

  it('отклоняет пустые значения, не строки и слишком длинные строки', () => {
    expect(isSafeRedirect('')).toBe(false)
    expect(isSafeRedirect(null)).toBe(false)
    expect(isSafeRedirect(undefined)).toBe(false)
    expect(isSafeRedirect(42)).toBe(false)
    expect(isSafeRedirect({})).toBe(false)
    expect(isSafeRedirect(`/${'a'.repeat(3000)}`)).toBe(false)
  })

  it('не даёт замкнуть петлю через страницы аутентификации', () => {
    expect(isSafeRedirect('/login')).toBe(false)
    expect(isSafeRedirect('/login?redirect=/x')).toBe(false)
    expect(isSafeRedirect('/register')).toBe(false)
    expect(isSafeRedirect('/setup-tenant')).toBe(false)
    expect(isSafeRedirect('/login/')).toBe(false)
  })
})

describe('сохранение адреса возврата в sessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('запоминает только безопасные адреса', () => {
    rememberRedirect('/catalogs/suppliers')
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBe('/catalogs/suppliers')

    sessionStorage.clear()
    rememberRedirect('https://evil.com')
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })

  it('выдаёт сохранённый адрес один раз и очищает хранилище', () => {
    rememberRedirect('/catalogs/work-rates')

    expect(consumeRedirect()).toBe('/catalogs/work-rates')
    expect(consumeRedirect()).toBeNull()
    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })

  it('игнорирует испорченное значение в хранилище', () => {
    sessionStorage.setItem(REDIRECT_STORAGE_KEY, 'https://evil.com')

    expect(consumeRedirect()).toBeNull()
  })

  it('clearRedirect удаляет значение, не возвращая его', () => {
    rememberRedirect('/catalogs/suppliers')
    clearRedirect()

    expect(sessionStorage.getItem(REDIRECT_STORAGE_KEY)).toBeNull()
  })
})

describe('resolveRedirectTarget: приоритет источников', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('отдаёт адрес из query, если он безопасен', () => {
    expect(resolveRedirectTarget('/catalogs/suppliers')).toBe('/catalogs/suppliers')
  })

  it('игнорирует опасный query и падает на сохранённый адрес', () => {
    rememberRedirect('/catalogs/components')

    expect(resolveRedirectTarget('https://evil.com')).toBe('/catalogs/components')
  })

  it('падает на главную, если нет ни query, ни сохранённого значения', () => {
    expect(resolveRedirectTarget(null)).toBe(DEFAULT_REDIRECT)
    expect(resolveRedirectTarget(undefined)).toBe(DEFAULT_REDIRECT)
  })

  it('поддерживает значение из query в виде массива', () => {
    expect(resolveRedirectTarget(['/catalogs/suppliers', '/other'])).toBe('/catalogs/suppliers')
  })

  it('уважает переданный fallback', () => {
    expect(resolveRedirectTarget(null, '/custom')).toBe('/custom')
  })

  it('не применяет сохранённое значение дважды', () => {
    rememberRedirect('/catalogs/suppliers')

    expect(resolveRedirectTarget(null)).toBe('/catalogs/suppliers')
    expect(resolveRedirectTarget(null)).toBe(DEFAULT_REDIRECT)
  })
})

describe('readRedirectQuery', () => {
  it('возвращает null для небезопасного значения', () => {
    expect(readRedirectQuery('//evil.com')).toBeNull()
    expect(readRedirectQuery('/catalogs/suppliers')).toBe('/catalogs/suppliers')
  })
})
