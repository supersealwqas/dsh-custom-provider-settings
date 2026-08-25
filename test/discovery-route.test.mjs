import assert from 'node:assert/strict'
import test from 'node:test'
import { apply, DISCOVERY_PATH, __test } from '../index.js'

function request(method, body = '', headers = {}) {
  return {
    method,
    headers: {
      host: '127.0.0.1:3080',
      'content-type': 'application/json',
      ...headers,
    },
    async *[Symbol.asyncIterator]() {
      if (body.length > 0) yield Buffer.from(body)
    },
  }
}

function response() {
  return {
    headers: {},
    status: undefined,
    body: '',
    setHeader(name, value) { this.headers[name] = value },
    writeHead(status, headers) {
      this.status = status
      Object.assign(this.headers, headers)
    },
    end(body = '') { this.body = body },
  }
}

function pluginContext(discoverModels) {
  const effects = []
  let route
  return {
    effects,
    get route() { return route },
    ctx: {
      llm: { discoverModels },
      webServer: {
        register(value) {
          route = value
          return () => { route = undefined }
        },
      },
      get() { return undefined },
      on(event) { assert.equal(event, 'llm/stream') },
      effect(callback) { effects.push(callback()) },
    },
  }
}

test('registers a POST-only discovery route and scopes draft headers to its fetch', async () => {
  const nativeFetch = globalThis.fetch
  const fetches = []
  globalThis.fetch = async (_input, init) => {
    fetches.push(Object.fromEntries(new Headers(init?.headers)))
    return new Response('[]', { status: 200 })
  }
  const harness = pluginContext(async (settingsNs, probe) => {
    assert.equal(settingsNs, 'llm-pi-ai')
    assert.deepEqual(probe, {
      provider: 'relay',
      baseURL: 'https://relay.example/v1',
      api: 'openai-completions',
      headers: { 'User-Agent': 'relay/4.0', 'X-Tenant': 'demo' },
      apiKey: 'secret-key',
    })
    await fetch('https://relay.example/v1/models', {
      headers: { 'user-agent': 'harness-default', accept: 'application/json' },
    })
    return [{ id: 'alpha' }]
  })

  try {
    apply(harness.ctx)
    assert.deepEqual(harness.route, {
      kind: 'exact',
      path: DISCOVERY_PATH,
      handler: harness.route.handler,
    })

    const rejected = response()
    await harness.route.handler(request('GET'), rejected)
    assert.equal(rejected.status, 405)
    assert.equal(rejected.headers.allow, 'POST')

    const accepted = response()
    await harness.route.handler(request('POST', JSON.stringify({
      provider: 'relay',
      baseURL: 'https://relay.example/v1',
      api: 'openai-completions',
      apiKey: 'secret-key',
      headers: { 'User-Agent': 'relay/4.0', 'X-Tenant': 'demo' },
    })), accepted)
    assert.equal(accepted.status, 200)
    assert.deepEqual(JSON.parse(accepted.body), { models: [{ id: 'alpha' }] })
    assert.deepEqual(fetches, [{
      accept: 'application/json',
      'user-agent': 'relay/4.0',
      'x-tenant': 'demo',
    }])

    await fetch('https://outside.example', { headers: { 'user-agent': 'outside' } })
    assert.equal(fetches.at(-1)['user-agent'], 'outside')
  } finally {
    for (const dispose of harness.effects.reverse()) dispose()
    globalThis.fetch = nativeFetch
  }
})

test('rejects invalid and oversized payloads without exposing discovery secrets', async () => {
  const secret = 'do-not-return-this-key'
  const headerSecret = 'do-not-return-this-header'
  const harness = pluginContext(async () => {
    throw new Error(`upstream rejected ${secret} ${headerSecret}`)
  })
  try {
    apply(harness.ctx)

    const invalid = response()
    await harness.route.handler(request('POST', '{'), invalid)
    assert.equal(invalid.status, 400)
    assert.match(JSON.parse(invalid.body).error, /valid JSON/)

    const oversized = response()
    await harness.route.handler(request('POST', 'x'.repeat(__test.MAX_BODY_BYTES + 1)), oversized)
    assert.equal(oversized.status, 413)

    const failed = response()
    await harness.route.handler(request('POST', JSON.stringify({
      provider: 'relay',
      baseURL: 'https://relay.example/v1',
      api: 'openai-completions',
      apiKey: secret,
      headers: { Authorization: headerSecret },
    })), failed)
    assert.equal(failed.status, 502)
    assert.deepEqual(JSON.parse(failed.body), { error: 'model discovery failed' })
    assert.equal(failed.body.includes(secret), false)
    assert.equal(failed.body.includes(headerSecret), false)
  } finally {
    for (const dispose of harness.effects.reverse()) dispose()
  }
})

test('rejects untrusted discovery requests before reading the body', async () => {
  let read = false
  const harness = pluginContext(async () => {
    throw new Error('must not discover')
  })
  try {
    apply(harness.ctx)
    const body = request('POST', JSON.stringify({
      provider: 'relay',
      baseURL: 'https://attacker.example/v1',
      api: 'openai-completions',
    }), { host: 'attacker.example', 'sec-fetch-site': 'cross-site' })
    body[Symbol.asyncIterator] = async function* () {
      read = true
      yield Buffer.from('{}')
    }
    const rejected = response()
    await harness.route.handler(body, rejected)
    assert.equal(rejected.status, 403)
    assert.equal(read, false)

    const wrongOrigin = response()
    await harness.route.handler(request('POST', '{}', { origin: 'http://127.0.0.1:3080.evil.test' }), wrongOrigin)
    assert.equal(wrongOrigin.status, 403)

    const wrongContentType = response()
    await harness.route.handler(request('POST', '{}', { 'content-type': 'text/plain' }), wrongContentType)
    assert.equal(wrongContentType.status, 415)
  } finally {
    for (const dispose of harness.effects.reverse()) dispose()
  }
})
