/** Cordis plugin for custom-provider request headers and reasoning settings. */
import { installRequestHeaderBridge, runWithRequestHeaders } from './request-headers.js'

export const name = 'dsh-custom-provider-settings'
export const inject = ['llm', 'webServer']

const DISCOVERY_PATH = '/dsh-custom-provider-settings/discover-models'
const MAX_BODY_BYTES = 128 * 1024
const HTTP_TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function objectOf(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function writeJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

async function readJson(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.byteLength
    if (total > MAX_BODY_BYTES) throw new RequestError('request body is too large', 413)
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new RequestError('request body must be valid JSON')
  }
}

function stringField(value, name, required = false) {
  if (typeof value !== 'string' || (required && value.length === 0)) {
    throw new RequestError(`${name} must be a ${required ? 'non-empty ' : ''}string`)
  }
  return value
}

function requestHeaders(value) {
  const raw = objectOf(value)
  const entries = []
  for (const [name, headerValue] of Object.entries(raw)) {
    stringField(name, 'header name', true)
    if (!HTTP_TOKEN.test(name)) throw new RequestError('header name is invalid')
    const parsed = stringField(headerValue, `header ${name}`)
    if (/\r|\n/.test(parsed)) throw new RequestError(`header ${name} contains a line break`)
    entries.push([name, parsed])
  }
  return Object.fromEntries(entries)
}

function installDiscoveryRoute(ctx) {
  const handler = async (req, res) => {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST')
      writeJson(res, 405, { error: 'method not allowed' })
      return
    }
    let request
    let headers
    try {
      const body = objectOf(await readJson(req))
      const provider = stringField(body.provider, 'provider')
      const baseURL = stringField(body.baseURL, 'baseURL', true)
      const api = stringField(body.api, 'api')
      const apiKey = body.apiKey === undefined ? undefined : stringField(body.apiKey, 'apiKey', true)
      headers = requestHeaders(body.headers)
      request = {
        provider,
        baseURL,
        api,
        headers,
        ...apiKey === undefined ? {} : { apiKey },
      }
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 400
      writeJson(res, status, { error: error instanceof Error ? error.message : 'invalid request' })
      return
    }
    try {
      const models = await runWithRequestHeaders(headers, () => ctx.llm.discoverModels('llm-pi-ai', request))
      writeJson(res, 200, { models })
    } catch {
      writeJson(res, 502, { error: 'model discovery failed' })
    }
  }
  return ctx.webServer.register({ kind: 'exact', path: DISCOVERY_PATH, handler })
}

/**
 * Install request-scoped header injection for llm-pi-ai calls and discovery.
 * @param ctx - Cordis context that owns the listeners and cleanup effects.
 * @returns nothing; the context owns every installed effect.
 */
export function apply(ctx) {
  installRequestHeaderBridge(ctx)
  ctx.effect(() => installDiscoveryRoute(ctx), 'dsh-custom-provider-settings.discovery-route')
}

export { DISCOVERY_PATH }
export const __test = { MAX_BODY_BYTES, installDiscoveryRoute }
