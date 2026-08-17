import assert from 'node:assert/strict'
import test from 'node:test'

test('registers the Web client and builds provider settings without touching secrets', async () => {
  let definition
  globalThis.window = {
    __ModuleLoader__: {
      load(value) { definition = value },
    },
  }
  globalThis.document = {
    head: { appendChild() {} },
    createElement() { return { dataset: {}, textContent: '' } },
  }

  await import(`../client.js?test=${Date.now()}`)
  assert.equal(definition.id, 'dsh-custom-provider-settings')

  const React = {
    Fragment: Symbol('Fragment'),
    createElement() {},
    useCallback() {},
    useEffect() {},
    useRef() {},
    useState() {},
  }
  const primitives = new Proxy({}, { get: () => function Primitive() {} })
  const plugin = definition.factory((id) => {
    if (id === 'react') return React
    if (id === 'react-dom/client') return { createRoot() {} }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    throw new Error(`unexpected dependency: ${id}`)
  })
  const helpers = plugin.__test
  const drafts = helpers.providerDrafts({
    revision: 4,
    value: {
      providers: {
        relay: {
          displayName: 'Relay',
          api: 'openai-completions',
          reasoning: 'high',
          models: [{ id: 'alpha', name: 'Alpha' }],
        },
      },
    },
    user: {
      providers: {
        relay: {
          apiKeyEnv: 'RELAY_API_KEY',
          headers: { 'User-Agent': 'relay/1.0', 'X-Tenant': 'demo' },
          models: [{ id: 'alpha', name: 'Alpha', contextWindow: 1000, input: ['text', 'image'] }],
        },
      },
    },
  })
  assert.equal(drafts.length, 1)
  assert.equal(drafts[0].userAgent, 'relay/1.0')
  assert.deepEqual(drafts[0].headers.map(({ name, value }) => ({ name, value })), [
    { name: 'X-Tenant', value: 'demo' },
  ])
  assert.equal(drafts[0].defaultEffort, 'high')
  assert.equal(drafts[0].models[0].inputMode, 'image')

  const configured = {
    ...drafts[0],
    models: [{
      ...drafts[0].models[0],
      mode: 'custom',
      efforts: { low: 'low', medium: 'medium', high: 'high' },
    }],
  }
  assert.equal(helpers.validateProvider(configured), undefined)
  assert.deepEqual(helpers.buildHeaders(configured), {
    'User-Agent': 'relay/1.0',
    'X-Tenant': 'demo',
  })
  assert.deepEqual(helpers.buildModels(configured), [{
    id: 'alpha', name: 'Alpha', contextWindow: 1000, input: ['text', 'image'],
    reasoningEfforts: { low: 'low', medium: 'medium', high: 'high' },
  }])
  assert.deepEqual(helpers.mergeModelSettings([{
    id: 'alpha', name: 'Renamed by the original form', contextWindow: 2000,
  }], configured.models), [{
    id: 'alpha', name: 'Renamed by the original form', contextWindow: 2000, input: ['text', 'image'],
    reasoningEfforts: { low: 'low', medium: 'medium', high: 'high' },
  }])
  assert.deepEqual(helpers.extensionOps(configured, {
    models: [{ id: 'alpha', contextWindow: 2000 }],
  }), [
    {
      op: 'set', path: ['providers', 'relay', 'headers'],
      value: { 'User-Agent': 'relay/1.0', 'X-Tenant': 'demo' },
    },
    {
      op: 'set', path: ['providers', 'relay', 'models'],
      value: [{
        id: 'alpha', contextWindow: 2000, input: ['text', 'image'],
        reasoningEfforts: { low: 'low', medium: 'medium', high: 'high' },
      }],
    },
    { op: 'set', path: ['providers', 'relay', 'reasoning'], value: 'high' },
    { op: 'unset', path: ['providers', 'relay', 'compat', 'thinkingFormat'] },
  ])

  const duplicate = {
    ...configured,
    headers: [
      { id: '1', name: 'X-Test', value: 'one' },
      { id: '2', name: 'x-test', value: 'two' },
    ],
  }
  assert.equal(helpers.validateProvider(duplicate).key, 'validationHeaderDuplicate')
  assert.equal(helpers.validateProvider({
    ...configured,
    headers: [{ id: '1', name: 'user-agent', value: 'duplicate' }],
  }).key, 'validationUserAgentDuplicate')
  assert.deepEqual(helpers.buildModels({
    models: [
      { ...helpers.modelState({ id: 'inherit' }), inputMode: 'inherit' },
      { ...helpers.modelState({ id: 'text' }), inputMode: 'text' },
      { ...helpers.modelState({ id: 'image' }), inputMode: 'image' },
    ],
  }), [
    { id: 'inherit' },
    { id: 'text', input: ['text'] },
    { id: 'image', input: ['text', 'image'] },
  ])

  const controls = {
    input: [
      { value: 'relay', getAttribute: name => name === 'aria-label' ? 'Provider ID' : null },
      { value: 'Relay', getAttribute: name => name === 'aria-label' ? 'Display name' : null },
    ],
    modelInputs: [],
    select: [
      { value: 'openai-completions', getAttribute: name => name === 'aria-label' ? 'API protocol' : null },
    ],
  }
  const listeners = new Map()
  const form = {
    addEventListener(type, listener) { listeners.set(type, listener) },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
    querySelectorAll(selector) {
      if (selector === 'input') return controls.input
      if (selector === 'input[aria-label]') return [...controls.input, ...controls.modelInputs]
      if (selector === 'select') return controls.select
      return []
    },
  }
  let mutationCallback
  let disconnected = false
  globalThis.MutationObserver = class MutationObserver {
    constructor(callback) { mutationCallback = callback }
    observe(target, options) {
      assert.equal(target, form)
      assert.deepEqual(options, { childList: true, subtree: true })
    }
    disconnect() { disconnected = true }
  }
  const record = {
    kind: 'new',
    entry: { provider: '', displayName: '' },
    form,
    initial: {
      id: '', name: '', api: '', defaultEffort: '', thinkingFormat: '',
      userAgent: '', headers: [], models: [],
    },
  }
  record.draft = record.initial
  const syncedModels = []
  const disposeSync = helpers.installFormSync(record, () => {
    record.draft = helpers.syncFormProvider(record.draft, record)
    syncedModels.push(record.draft.models.map(model => model.id))
  })
  assert.deepEqual(syncedModels, [[]])

  controls.modelInputs.push(
    { value: 'alpha', getAttribute: name => name === 'aria-label' ? 'Model ID 1' : null },
    { value: 'Alpha', getAttribute: name => name === 'aria-label' ? 'Display name 1' : null },
  )
  mutationCallback()
  assert.deepEqual(syncedModels, [[], ['alpha']])
  mutationCallback()
  assert.deepEqual(syncedModels, [[], ['alpha']])

  controls.modelInputs[0].value = 'beta'
  listeners.get('input')()
  assert.deepEqual(syncedModels, [[], ['alpha'], ['beta']])
  disposeSync()
  assert.equal(disconnected, true)
  assert.equal(listeners.size, 0)
})
