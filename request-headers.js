/** Request-scoped header injection for llm-pi-ai model and discovery calls. */
import { AsyncLocalStorage } from 'node:async_hooks'

const RUNTIME_KEY = Symbol.for('dsh-custom-provider-settings.request-headers')
function objectOf(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

const runtime = globalThis[RUNTIME_KEY] ??= {
  storage: new AsyncLocalStorage(),
  fetch: undefined,
  fetchEntries: new Map(),
  discoveryTargets: new WeakMap(),
  sequence: 0,
}

const SETTINGS_NAMESPACE = 'dsh-custom-provider-settings'

/**
 * Run one host-side operation with explicit final request headers.
 * @param headers - request headers for this operation only.
 * @param callback - operation that may issue provider fetches.
 * @returns the callback result.
 */
export function runWithRequestHeaders(headers, callback) {
  return runtime.storage.run(objectOf(headers), callback)
}

/**
 * Read the user-owned provider headers and global headers.
 * @param settings - the optional Harness settings service.
 * @param provider - provider route selected by the request.
 * @returns a copied header dict, or undefined when no explicit override exists.
 */
export function configuredHeaders(settings, provider, includeProvider = true) {
  if (settings === undefined || typeof settings.describe !== 'function') return undefined
  let descriptors
  try {
    descriptors = settings.describe({ redactSecrets: true })
  } catch {
    return undefined
  }
  const descriptor = descriptors.find(entry => String(entry?.ns) === 'llm-pi-ai')
  const globalDescriptor = descriptors.find(entry => String(entry?.ns) === SETTINGS_NAMESPACE)
  const profile = includeProvider && typeof provider === 'string' && provider.length > 0
    ? objectOf(objectOf(objectOf(descriptor?.user).providers)[provider])
    : {}
  const providerHeaders = Object.fromEntries(Object.entries(objectOf(profile.headers))
    .filter(([, value]) => typeof value === 'string'))
  const globalHeaders = objectOf(objectOf(globalDescriptor?.value).globalHeaders)
  const merged = new Map()
  for (const source of [globalHeaders, providerHeaders]) {
    for (const [name, value] of Object.entries(source)) {
      if (typeof value !== 'string') continue
      merged.set(name.toLowerCase(), [name, value])
    }
  }
  return merged.size === 0 ? undefined : Object.fromEntries(merged.values())
}

/**
 * Merge fetch headers with case-insensitive explicit overrides.
 * @param input - fetch input whose Request headers are inherited.
 * @param init - optional fetch initialization whose headers win the Request.
 * @param overrides - provider-owned final header values.
 * @returns a new init object; the caller's objects are not mutated.
 */
export function withHeaderOverrides(input, init, overrides) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined)
  if (init?.headers !== undefined) {
    new Headers(init.headers).forEach((value, name) => headers.set(name, value))
  }
  for (const [name, value] of Object.entries(overrides)) headers.set(name, value)
  return { ...init, headers }
}

function installFetchBridge(ctx) {
  const token = Symbol('dsh-custom-provider-settings.fetch')
  ctx.effect(() => {
    runtime.fetchEntries.set(token, true)
    if (runtime.fetch === undefined) {
      const base = globalThis.fetch
      const wrapped = function scopedFetch(input, init) {
        const context = runtime.storage.getStore()
        return context === undefined
          ? base.call(globalThis, input, init)
          : base.call(globalThis, input, withHeaderOverrides(input, init, context))
      }
      runtime.fetch = { base, wrapped }
      globalThis.fetch = wrapped
    }
    return () => {
      runtime.fetchEntries.delete(token)
      if (runtime.fetchEntries.size !== 0 || runtime.fetch === undefined) return
      if (globalThis.fetch === runtime.fetch.wrapped) globalThis.fetch = runtime.fetch.base
      runtime.fetch = undefined
    }
  }, 'dsh-custom-provider-settings.fetch')
}

function applyLatestDiscovery(target, state) {
  const installed = state.installedWrapper
  if (installed !== undefined && target.discoverModels !== installed) return
  if (installed === undefined && target.discoverModels !== state.base) return

  let latest
  for (const entry of state.entries.values()) {
    if (latest === undefined || entry.sequence > latest.sequence) latest = entry
  }
  if (latest === undefined) {
    target.discoverModels = state.base
    state.installedWrapper = undefined
    return
  }
  const wrapper = async function discoverModelsWithHeaders(settingsNs, request) {
    if (runtime.storage.getStore() !== undefined) return state.base.call(this, settingsNs, request)
    const headers = configuredHeaders(latest.settings(), request?.provider, String(settingsNs) === 'llm-pi-ai')
    return headers === undefined
      ? state.base.call(this, settingsNs, request)
      : runWithRequestHeaders(headers, () => state.base.call(this, settingsNs, request))
  }
  target.discoverModels = wrapper
  state.installedWrapper = wrapper
}

function installDiscoveryBridge(ctx, settings) {
  const target = ctx.llm
  const state = runtime.discoveryTargets.get(target) ?? {
    base: target.discoverModels,
    entries: new Map(),
    installedWrapper: undefined,
  }
  runtime.discoveryTargets.set(target, state)
  const token = Symbol('dsh-custom-provider-settings.discovery')
  ctx.effect(() => {
    state.entries.set(token, { settings, sequence: ++runtime.sequence })
    applyLatestDiscovery(target, state)
    return () => {
      state.entries.delete(token)
      applyLatestDiscovery(target, state)
      if (state.entries.size === 0) runtime.discoveryTargets.delete(target)
    }
  }, 'dsh-custom-provider-settings.discovery')
}

function scopedStream(context, next) {
  return (async function* () {
    const iterable = runtime.storage.run(context, next)
    const iterator = iterable[Symbol.asyncIterator]()
    let exhausted = false
    try {
      for (;;) {
        const result = await runtime.storage.run(context, () => iterator.next())
        if (result.done) {
          exhausted = true
          return
        }
        yield result.value
      }
    } finally {
      if (!exhausted && typeof iterator.return === 'function') {
        await runtime.storage.run(context, () => iterator.return())
      }
    }
  })()
}

/**
 * Install model-stream and discovery header injection for this Cordis lifecycle.
 * @param ctx - Cordis context exposing llm, settings lookup, events, and effects.
 * @returns nothing; Cordis disposal restores the original global fetch and discovery method.
 */
export function installRequestHeaderBridge(ctx) {
  const settings = () => ctx.get('settings')
  installFetchBridge(ctx)
  installDiscoveryBridge(ctx, settings)
  ctx.on('llm/stream', (options, next) => {
    const headers = configuredHeaders(settings(), options.provider)
    return headers === undefined
      ? next()
      : scopedStream(headers, next)
  })
}
