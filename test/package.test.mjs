import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('publishes both plugin halves and keeps the tarball outside the package root', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(manifest.version, '0.5.0')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.equal(manifest.files.includes('client.js'), true)
  assert.equal(manifest.files.includes('request-headers.js'), true)
  assert.equal(manifest.files.some(file => file.endsWith('.tgz')), false)
  const client = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  assert.equal(client.includes("settings.plugin.item"), false)
  assert.equal(client.includes("entry.declared === true"), true)
  assert.equal(client.includes("/dsh-custom-provider-settings/discover-models"), true)
  assert.equal(client.includes('globalHeaders'), true)
  assert.equal(client.includes('USER_AGENT_PRESETS'), true)
  assert.equal(client.includes("['providers', provider.id, 'compat', 'supportsDeveloperRole']"), false)
  assert.equal(client.includes("'compat', 'supportsDeveloperRole'"), true)
  assert.equal(client.includes("textAndImage"), true)
  assert.equal(client.includes("ReasoningEditor"), false)
})
