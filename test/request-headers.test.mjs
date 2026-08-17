import assert from 'node:assert/strict'
import test from 'node:test'
import {
  configuredHeaders,
  installRequestHeaderBridge,
  withHeaderOverrides,
} from '../request-headers.js'

function settingsWith(headers) {
  return {
    describe(options) {
      assert.deepEqual(options, { redactSecrets: true })
      return [{
        ns: 'llm-pi-ai',
        user: { providers: { relay: { headers } } },
      }]
    },
  }
}

test('reads only explicitly configured llm-pi-ai provider headers', () => {
  const settings = settingsWith({ 'User-Agent': 'custom/1.0', 'X-Route': 'relay' })
  assert.deepEqual(configuredHeaders(settings, 'relay'), {
    'User-Agent': 'custom/1.0',
    'X-Route': 'relay',
  })
  assert.equal(configuredHeaders(settings, 'missing'), undefined)
  assert.equal(configuredHeaders(undefined, 'relay'), undefined)
})

test('merges Request and init headers before applying case-insensitive overrides', () => {
  const input = new Request('https://example.test/v1/chat', {
    headers: { 'user-agent': 'request-default', 'x-request': 'one' },
  })
  const result = withHeaderOverrides(input, {
    headers: { 'x-init': 'two', 'user-agent': 'init-default' },
  }, {
    'User-Agent': 'custom/2.0',
    'X-Route': 'relay',
  })
  const headers = Object.fromEntries(result.headers)
  assert.deepEqual(headers, {
    'user-agent': 'custom/2.0',
    'x-init': 'two',
    'x-request': 'one',
    'x-route': 'relay',
  })
})

test('scopes overrides to the selected provider for streams and model discovery', async () => {
  const nativeFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init) => {
    const headers = Object.fromEntries(new Headers(init?.headers))
    calls.push({ input: String(input), headers })
    return new Response(JSON.stringify(headers), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const effects = []
  let streamListener
  const settings = settingsWith({
    'User-Agent': 'relay-client/3.0',
    'X-Route': 'relay',
  })
  const llm = {
    async discoverModels(settingsNs) {
      const response = await fetch(`https://example.test/${settingsNs}/models`, {
        headers: { 'user-agent': 'harness-default', accept: 'application/json' },
      })
      return response.json()
    },
  }
  const ctx = {
    llm,
    get(service) {
      return service === 'settings' ? settings : undefined
    },
    effect(callback) {
      effects.push(callback())
    },
    on(event, listener) {
      assert.equal(event, 'llm/stream')
      streamListener = listener
    },
  }

  try {
    installRequestHeaderBridge(ctx)

    await fetch('https://example.test/plain', {
      headers: { 'user-agent': 'outside-default' },
    })
    assert.equal(calls.at(-1).headers['user-agent'], 'outside-default')

    const thirdParty = streamListener({ provider: 'relay' }, () => (async function* () {
      const response = await fetch('https://example.test/v1/chat', {
        headers: { 'user-agent': 'harness-default', 'x-sdk': 'present' },
      })
      yield await response.json()
    })())
    const chunks = []
    for await (const chunk of thirdParty) chunks.push(chunk)
    assert.deepEqual(chunks, [{
      'user-agent': 'relay-client/3.0',
      'x-route': 'relay',
      'x-sdk': 'present',
    }])

    const official = streamListener({ provider: 'deepseek-official' }, () => (async function* () {
      const response = await fetch('https://example.test/deepseek/chat', {
        headers: { 'user-agent': 'harness-default' },
      })
      yield await response.json()
    })())
    const officialChunks = []
    for await (const chunk of official) officialChunks.push(chunk)
    assert.deepEqual(officialChunks, [{ 'user-agent': 'harness-default' }])

    assert.deepEqual(await llm.discoverModels('llm-pi-ai', { provider: 'relay' }), {
      accept: 'application/json',
      'user-agent': 'relay-client/3.0',
      'x-route': 'relay',
    })
    assert.deepEqual(await llm.discoverModels('other-adapter', { provider: 'relay' }), {
      accept: 'application/json',
      'user-agent': 'harness-default',
    })
  } finally {
    for (const dispose of effects.reverse()) dispose()
    globalThis.fetch = nativeFetch
  }
})
