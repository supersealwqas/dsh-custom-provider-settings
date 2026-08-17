window.__ModuleLoader__.load({
  id: 'dsh-custom-provider-settings',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { createElement: h, useEffect, useState } = React
    const { createRoot } = require('react-dom/client')
    const {
      Button,
      IconChevronDownOutline14,
      IconChevronRightOutline14,
      IconPlusOutline16,
      IconRefreshOutline16,
      IconTrashOutline16,
      Tooltip,
    } = require('@deepseek-ai/dsh-client-ui-primitives')

    const LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
    const NON_OFF_LEVELS = LEVELS.filter(level => level !== 'off')
    const DISCOVERY_PATH = '/dsh-custom-provider-settings/discover-models'
    const THINKING_FORMATS = [
      'openai', 'deepseek', 'openrouter', 'together', 'zai', 'qwen', 'string-thinking', 'ant-ling',
    ]
    const HTTP_TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

    const zh = {
      nav: '模型请求设置',
      cardDesc: '配置第三方模型的请求头、输入能力与思考等级',
      expand: '展开',
      collapse: '折叠',
      refresh: '刷新',
      retry: '重试',
      loading: '正在读取模型配置...',
      noNamespace: '当前部署未提供 llm-pi-ai 设置。',
      noProviders: '请先在“模型”页面添加第三方 Provider。',
      noModels: '此 Provider 没有可编辑的自定义模型。',
      loadFailed: '读取失败',
      conflict: '配置已被其他页面修改，请刷新后重试。',
      saved: '已保存',
      save: '保存',
      saving: '保存中...',
      headers: '请求头',
      userAgent: 'User-Agent',
      harnessDefault: '使用 Harness 默认值',
      otherHeaders: '其他请求头',
      headerName: '名称',
      headerValue: '值',
      addHeader: '添加请求头',
      removeHeader: '删除请求头',
      modelSettings: '模型能力',
      defaultEffort: '默认等级',
      unspecified: '不指定',
      mode: '思考能力',
      inherit: '保持未声明',
      disabled: '明确不支持',
      custom: '自定义等级',
      commonPreset: '常用三档',
      fullPreset: '完整等级',
      wireValue: '传输值',
      noWireValue: '留空表示不发送',
      thinkingFormat: '思考参数格式',
      autoDetect: '自动检测',
      inputCapability: '输入能力',
      inputInherit: '保持未声明',
      textOnly: '仅文本',
      textAndImage: '文本与图像',
      models: '个模型',
      validationHeaderName: '请求头名称不合法。',
      validationHeaderValue: '请求头值不能包含换行。',
      validationHeaderDuplicate: '请求头名称不能重复。',
      validationUserAgentDuplicate: '其他请求头中不能再次填写 User-Agent。',
      validationNoLevel: '至少选择一个非 off 等级。',
      validationWire: '已启用等级必须填写传输值。',
      validationDefault: '默认等级必须被该 Provider 的全部模型支持。',
    }

    const en = {
      nav: 'Model request settings',
      cardDesc: 'Configure request headers, input capabilities, and reasoning levels for third-party models',
      expand: 'Expand',
      collapse: 'Collapse',
      refresh: 'Refresh',
      retry: 'Retry',
      loading: 'Loading model configuration...',
      noNamespace: 'This deployment does not expose llm-pi-ai settings.',
      noProviders: 'Add a third-party provider on the Models page first.',
      noModels: 'This provider has no editable custom models.',
      loadFailed: 'Failed to load',
      conflict: 'Settings changed elsewhere. Refresh and try again.',
      saved: 'Saved',
      save: 'Save',
      saving: 'Saving...',
      headers: 'Request headers',
      userAgent: 'User-Agent',
      harnessDefault: 'Use Harness default',
      otherHeaders: 'Other headers',
      headerName: 'Name',
      headerValue: 'Value',
      addHeader: 'Add header',
      removeHeader: 'Remove header',
      modelSettings: 'Model capabilities',
      defaultEffort: 'Default level',
      unspecified: 'Unspecified',
      mode: 'Reasoning capability',
      inherit: 'Leave undeclared',
      disabled: 'Explicitly unsupported',
      custom: 'Custom levels',
      commonPreset: 'Low / medium / high',
      fullPreset: 'All levels',
      wireValue: 'Wire value',
      noWireValue: 'Blank sends no value',
      thinkingFormat: 'Reasoning wire format',
      autoDetect: 'Auto-detect',
      inputCapability: 'Input capability',
      inputInherit: 'Leave undeclared',
      textOnly: 'Text only',
      textAndImage: 'Text and images',
      models: 'models',
      validationHeaderName: 'Header name is invalid.',
      validationHeaderValue: 'Header values cannot contain line breaks.',
      validationHeaderDuplicate: 'Header names must be unique.',
      validationUserAgentDuplicate: 'Do not add User-Agent again under other headers.',
      validationNoLevel: 'Select at least one non-off level.',
      validationWire: 'Every enabled level needs a wire value.',
      validationDefault: 'The default level must be supported by every model in this provider.',
    }

    function objectOf(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
    }

    function clone(value) {
      return value === undefined ? undefined : structuredClone(value)
    }

    function modelState(raw) {
      const model = clone(objectOf(raw))
      const configured = model.reasoningEfforts
      const input = Array.isArray(model.input) ? model.input : []
      let mode = 'inherit'
      let efforts = {}
      if (configured === false) {
        mode = 'disabled'
      } else if (configured !== null && typeof configured === 'object' && !Array.isArray(configured)) {
        mode = 'custom'
        efforts = Object.fromEntries(
          LEVELS.filter(level => Object.prototype.hasOwnProperty.call(configured, level))
            .map(level => [level, configured[level]]),
        )
      }
      return {
        id: typeof model.id === 'string' ? model.id : '',
        name: typeof model.name === 'string' && model.name.length > 0 ? model.name : undefined,
        raw: model,
        inputMode: input.includes('image') ? 'image' : input.includes('text') ? 'text' : 'inherit',
        mode,
        efforts,
      }
    }

    function headerState(raw) {
      const headers = objectOf(raw)
      let userAgent = ''
      const otherHeaders = []
      for (const [name, value] of Object.entries(headers)) {
        if (typeof value !== 'string') continue
        if (name.toLowerCase() === 'user-agent' && userAgent === '') userAgent = value
        else otherHeaders.push({ id: crypto.randomUUID(), name, value })
      }
      return { userAgent, otherHeaders }
    }

    function providerDrafts(view) {
      const effectiveProviders = objectOf(objectOf(view && view.value).providers)
      const userProviders = objectOf(objectOf(view && view.user).providers)
      const providers = []
      for (const [id, userUnknown] of Object.entries(userProviders)) {
        const user = objectOf(userUnknown)
        const effective = objectOf(effectiveProviders[id])
        const models = (Array.isArray(user.models) ? user.models : [])
          .filter(model => typeof objectOf(model).id === 'string')
          .map(modelState)
        const defaultEffort = typeof user.reasoning === 'string'
          ? user.reasoning
          : typeof effective.reasoning === 'string' ? effective.reasoning : ''
        const userCompat = objectOf(user.compat)
        const effectiveCompat = objectOf(effective.compat)
        const thinkingFormat = typeof userCompat.thinkingFormat === 'string'
          ? userCompat.thinkingFormat
          : typeof effectiveCompat.thinkingFormat === 'string' ? effectiveCompat.thinkingFormat : ''
        const { userAgent, otherHeaders } = headerState(user.headers)
        providers.push({
          id,
          name: typeof effective.displayName === 'string' && effective.displayName.length > 0
            ? effective.displayName : id,
          api: typeof effective.api === 'string' ? effective.api : '',
          defaultEffort,
          thinkingFormat,
          userAgent,
          headers: otherHeaders,
          models,
        })
      }
      return providers
    }

    function supportedLevels(model) {
      if (model.mode !== 'custom') return []
      return LEVELS.filter(level => Object.prototype.hasOwnProperty.call(model.efforts, level))
    }

    function commonLevels(provider) {
      if (provider.models.length === 0) return []
      let common = supportedLevels(provider.models[0])
      for (const model of provider.models.slice(1)) {
        const current = new Set(supportedLevels(model))
        common = common.filter(level => current.has(level))
      }
      return common
    }

    function validateProvider(provider) {
      if (/\r|\n/.test(provider.userAgent)) return { key: 'validationHeaderValue' }
      const seen = new Set()
      for (const header of provider.headers) {
        const name = header.name.trim()
        if (!HTTP_TOKEN.test(name)) return { key: 'validationHeaderName', header: name }
        if (/\r|\n/.test(header.value)) return { key: 'validationHeaderValue', header: name }
        const normalized = name.toLowerCase()
        if (normalized === 'user-agent') return { key: 'validationUserAgentDuplicate', header: name }
        if (seen.has(normalized)) return { key: 'validationHeaderDuplicate', header: name }
        seen.add(normalized)
      }
      for (const model of provider.models) {
        if (model.mode !== 'custom') continue
        const selected = supportedLevels(model)
        if (!selected.some(level => level !== 'off')) return { model: model.id, key: 'validationNoLevel' }
        for (const level of selected) {
          if (level === 'off') continue
          const wire = model.efforts[level]
          if (typeof wire !== 'string' || wire.trim().length === 0) {
            return { model: model.id, key: 'validationWire' }
          }
        }
      }
      if (provider.defaultEffort && !commonLevels(provider).includes(provider.defaultEffort)) {
        return { key: 'validationDefault' }
      }
      return undefined
    }

    function buildHeaders(provider) {
      const entries = []
      if (provider.userAgent.length > 0) entries.push(['User-Agent', provider.userAgent])
      for (const header of provider.headers) entries.push([header.name.trim(), header.value])
      return Object.fromEntries(entries)
    }

    function buildModels(provider) {
      return provider.models.map((model) => {
        const next = clone(model.raw)
        if (model.inputMode === 'inherit') delete next.input
        else if (model.inputMode === 'text') next.input = ['text']
        else next.input = ['text', 'image']
        if (model.mode === 'inherit') {
          delete next.reasoningEfforts
        } else if (model.mode === 'disabled') {
          next.reasoningEfforts = false
        } else {
          next.reasoningEfforts = Object.fromEntries(
            LEVELS.filter(level => Object.prototype.hasOwnProperty.call(model.efforts, level))
              .map((level) => {
                const wire = model.efforts[level]
                return [level, level === 'off' && (wire === null || wire === '') ? null : String(wire).trim()]
              }),
          )
        }
        return next
      })
    }

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    function patchProvider(list, providerId, update) {
      return list.map(provider => provider.id === providerId ? update(provider) : provider)
    }

    function patchModel(provider, modelId, update) {
      const next = {
        ...provider,
        models: provider.models.map(model => model.id === modelId ? update(model) : model),
      }
      const common = commonLevels(next)
      if (next.defaultEffort && !common.includes(next.defaultEffort)) next.defaultEffort = ''
      return next
    }

    function HeaderEditor({ provider, t, writable, busy, updateProvider }) {
      const updateHeaders = headers => updateProvider(provider.id, current => ({ ...current, headers }))
      return h('section', { className: 'dsh-mrs-band' },
        h('h4', null, t('headers')),
        h('label', { className: 'dsh-mrs-field' },
          h('span', null, t('userAgent')),
          h('input', {
            type: 'text',
            value: provider.userAgent,
            placeholder: t('harnessDefault'),
            disabled: !writable || busy,
            onChange: event => updateProvider(provider.id, current => ({
              ...current, userAgent: event.target.value,
            })),
          })),
        h('div', { className: 'dsh-mrs-subhead' },
          h('span', null, t('otherHeaders')),
          h(Button, {
            variant: 'outline', size: 'sm',
            icon: h(IconPlusOutline16, { size: 14 }),
            disabled: !writable || busy,
            onClick: () => updateHeaders([
              ...provider.headers,
              { id: crypto.randomUUID(), name: '', value: '' },
            ]),
          }, t('addHeader'))),
        provider.headers.length === 0 ? null : h('div', { className: 'dsh-mrs-header-list' },
          provider.headers.map(header => h('div', { className: 'dsh-mrs-header-row', key: header.id },
            h('input', {
              type: 'text', value: header.name, placeholder: t('headerName'),
              'aria-label': t('headerName'), disabled: !writable || busy,
              onChange: event => updateHeaders(provider.headers.map(item => item.id === header.id
                ? { ...item, name: event.target.value } : item)),
            }),
            h('input', {
              type: 'text', value: header.value, placeholder: t('headerValue'),
              'aria-label': t('headerValue'), disabled: !writable || busy,
              onChange: event => updateHeaders(provider.headers.map(item => item.id === header.id
                ? { ...item, value: event.target.value } : item)),
            }),
            h(Tooltip, { label: t('removeHeader'), side: 'top' },
              h(Button, {
                variant: 'toolbar', size: 'sm', 'aria-label': t('removeHeader'),
                disabled: !writable || busy,
                onClick: () => updateHeaders(provider.headers.filter(item => item.id !== header.id)),
              }, h(IconTrashOutline16, { size: 16 })))))))
    }

    function ModelEditor({ provider, model, t, writable, busy, updateProvider }) {
      const selected = new Set(supportedLevels(model))
      const updateModel = update => updateProvider(provider.id, current => patchModel(current, model.id, update))
      const setPreset = efforts => updateModel(item => ({ ...item, mode: 'custom', efforts }))
      return h('div', { className: 'dsh-mrs-model' },
        h('div', { className: 'dsh-mrs-model-head' },
          h('div', null,
            h('strong', null, model.name || model.id),
            model.name && model.name !== model.id ? h('code', null, model.id) : null),
          h('div', { className: 'dsh-mrs-model-controls' },
            h('label', { className: 'dsh-mrs-mode' },
              h('span', null, t('inputCapability')),
              h('select', {
                value: model.inputMode,
                disabled: !writable || busy,
                onChange: event => updateModel(item => ({ ...item, inputMode: event.target.value })),
              },
              h('option', { value: 'inherit' }, t('inputInherit')),
              h('option', { value: 'text' }, t('textOnly')),
              h('option', { value: 'image' }, t('textAndImage')))),
            h('label', { className: 'dsh-mrs-mode' },
              h('span', null, t('mode')),
              h('select', {
                value: model.mode,
                disabled: !writable || busy,
                onChange: event => updateModel((item) => {
                  const mode = event.target.value
                  return {
                    ...item,
                    mode,
                    efforts: mode === 'custom' && Object.keys(item.efforts).length === 0
                      ? { low: 'low', medium: 'medium', high: 'high' }
                      : item.efforts,
                  }
                }),
              },
              h('option', { value: 'inherit' }, t('inherit')),
              h('option', { value: 'disabled' }, t('disabled')),
              h('option', { value: 'custom' }, t('custom')))))),
        model.mode !== 'custom' ? null : h(React.Fragment, null,
          h('div', { className: 'dsh-mrs-presets' },
            h(Button, {
              variant: 'outline', size: 'sm', disabled: !writable || busy,
              onClick: () => setPreset({ low: 'low', medium: 'medium', high: 'high' }),
            }, t('commonPreset')),
            h(Button, {
              variant: 'outline', size: 'sm', disabled: !writable || busy,
              onClick: () => setPreset(Object.fromEntries(NON_OFF_LEVELS.map(level => [level, level]))),
            }, t('fullPreset'))),
          h('div', { className: 'dsh-mrs-levels' },
            LEVELS.map(level => h('div', {
              className: `dsh-mrs-level${selected.has(level) ? ' dsh-mrs-level-active' : ''}`,
              key: level,
            },
            h('label', { className: 'dsh-mrs-check' },
              h('input', {
                type: 'checkbox', checked: selected.has(level), disabled: !writable || busy,
                onChange: event => updateModel((item) => {
                  const efforts = { ...item.efforts }
                  if (event.target.checked) efforts[level] = level === 'off' ? null : level
                  else delete efforts[level]
                  return { ...item, efforts }
                }),
              }),
              h('span', null, level)),
            selected.has(level) ? h('label', { className: 'dsh-mrs-wire' },
              h('span', null, t('wireValue')),
              h('input', {
                type: 'text', value: model.efforts[level] ?? '',
                placeholder: level === 'off' ? t('noWireValue') : level,
                disabled: !writable || busy,
                onChange: event => updateModel(item => ({
                  ...item, efforts: { ...item.efforts, [level]: event.target.value },
                })),
              })) : null)))))
    }

    function ModelSettingsEditor({ provider, t, writable, busy, updateProvider }) {
      const common = commonLevels(provider)
      return h('section', { className: 'dsh-mrs-band' },
        h('h4', null, t('modelSettings')),
        provider.models.length === 0
          ? h('p', { className: 'dsh-mrs-empty-inline' }, t('noModels'))
          : h(React.Fragment, null,
            h('div', { className: 'dsh-mrs-route-fields' },
              h('label', { className: 'dsh-mrs-field' },
                h('span', null, t('defaultEffort')),
                h('select', {
                  value: provider.defaultEffort,
                  disabled: !writable || busy,
                  onChange: event => updateProvider(provider.id, current => ({
                    ...current, defaultEffort: event.target.value,
                  })),
                },
                h('option', { value: '' }, t('unspecified')),
                common.map(level => h('option', { value: level, key: level }, level)))),
              provider.api === 'openai-completions'
                ? h('label', { className: 'dsh-mrs-field' },
                    h('span', null, t('thinkingFormat')),
                    h('select', {
                      value: provider.thinkingFormat,
                      disabled: !writable || busy,
                      onChange: event => updateProvider(provider.id, current => ({
                        ...current, thinkingFormat: event.target.value,
                      })),
                    },
                    h('option', { value: '' }, t('autoDetect')),
                    THINKING_FORMATS.map(format => h('option', { value: format, key: format }, format))))
                : null),
            h('div', { className: 'dsh-mrs-models' }, provider.models.map(model => h(ModelEditor, {
              key: model.id, provider, model, t, writable, busy, updateProvider,
            })))))
    }

    function ProviderEditor({ provider, t, writable, busy, dirty, updateProvider, saveProvider }) {
      const [open, setOpen] = useState(false)
      const validation = validateProvider(provider)
      const detail = validation === undefined ? '' : `${validation.header ?? validation.model ?? ''}${validation.header || validation.model ? ': ' : ''}${t(validation.key)}`
      return h('section', { className: `dsh-mrs-provider${open ? ' dsh-mrs-provider-open' : ''}` },
        h('button', {
          type: 'button', className: 'dsh-mrs-provider-head', 'aria-expanded': open,
          onClick: () => setOpen(!open),
        },
          h('span', { className: 'dsh-mrs-provider-icon' }, open
            ? h(IconChevronDownOutline14, { size: 14 })
            : h(IconChevronRightOutline14, { size: 14 })),
          h('span', { className: 'dsh-mrs-provider-name' },
            h('strong', null, provider.name),
            provider.name === provider.id ? null : h('code', null, provider.id)),
          provider.api ? h('span', { className: 'dsh-mrs-tag' }, provider.api) : null,
          h('span', { className: 'dsh-mrs-count' }, `${provider.models.length} ${t('models')}`)),
        h('div', { className: 'dsh-mrs-provider-body', hidden: !open },
          h(HeaderEditor, { provider, t, writable, busy, updateProvider }),
          h(ModelSettingsEditor, { provider, t, writable, busy, updateProvider }),
          detail ? h('p', { className: 'dsh-mrs-error', role: 'alert' }, detail) : null,
          h('footer', { className: 'dsh-mrs-actions' },
            h(Button, {
              variant: 'primary', size: 'sm',
              disabled: !writable || busy || !dirty || validation !== undefined,
              onClick: () => void saveProvider(provider),
            }, busy ? t('saving') : t('save')))))
    }

    const CUSTOM_TAGS = new Set(['Custom', '自定义'])
    const CUSTOM_SUMMARIES = new Set(['Customized settings', '自定义设置'])
    const SUBMIT_LABELS = new Set(['Apply', '保存', 'Create provider', '创建提供方'])
    const MODEL_ID_LABEL = /^(?:Model ID|模型 ID)\s+(\d+)$/

    function exactText(root, expected, selector = 'span,code,strong') {
      return [...root.querySelectorAll(selector)].some(node => node.textContent.trim() === expected)
    }

    function field(root, selector, labels) {
      return [...root.querySelectorAll(selector)].find(node => labels.includes(node.getAttribute('aria-label')))
    }

    function formValue(root, selector, labels) {
      const control = field(root, selector, labels)
      return control === undefined ? '' : String(control.value ?? '')
    }

    function formModels(root, previous) {
      const current = previous ?? []
      return [...root.querySelectorAll('input[aria-label]')]
        .map((input) => {
          const match = MODEL_ID_LABEL.exec(input.getAttribute('aria-label') ?? '')
          return match === null ? undefined : { input, index: Number(match[1]) - 1 }
        })
        .filter(Boolean)
        .sort((a, b) => a.index - b.index)
        .map(({ input, index }) => {
          const before = current[index] ?? modelState({ id: '' })
          const id = String(input.value ?? '')
          const nameInput = field(root, 'input[aria-label]', [`Display name ${index + 1}`, `显示名称 ${index + 1}`])
          const name = nameInput === undefined ? undefined : String(nameInput.value ?? '') || undefined
          const raw = { ...before.raw, id }
          if (name === undefined) delete raw.name
          else raw.name = name
          return { ...before, id, name, raw }
        })
    }

    function syncFormProvider(provider, record) {
      const route = record.kind === 'new'
        ? formValue(record.form, 'input', ['Provider ID'])
        : record.entry.provider
      const name = record.kind === 'new'
        ? formValue(record.form, 'input', ['Display name', '显示名称']) || route
        : record.entry.displayName
      const api = formValue(record.form, 'select', ['API protocol', 'API 协议']) || provider.api
      return {
        ...provider,
        id: route,
        name,
        api,
        models: formModels(record.form, provider.models),
      }
    }

    function formProviderSignature(record) {
      const provider = syncFormProvider(record.draft ?? record.initial, record)
      return JSON.stringify([
        provider.id,
        provider.name,
        provider.api,
        provider.models.map(model => [model.id, model.name ?? '']),
      ])
    }

    function installFormSync(record, update) {
      let signature
      const sync = () => {
        const next = formProviderSignature(record)
        if (next === signature) return
        signature = next
        update()
      }
      const observer = new MutationObserver(sync)
      record.form.addEventListener('input', sync)
      record.form.addEventListener('change', sync)
      observer.observe(record.form, { childList: true, subtree: true })
      sync()
      return () => {
        observer.disconnect()
        record.form.removeEventListener('input', sync)
        record.form.removeEventListener('change', sync)
      }
    }

    function mergeModelSettings(rawModels, configured) {
      const byId = new Map(configured.map(model => [model.id, model]))
      return rawModels.map((raw) => {
        const model = objectOf(raw)
        const state = byId.get(typeof model.id === 'string' ? model.id : '')
        if (state === undefined) return clone(model)
        const next = clone(model)
        if (state.inputMode === 'inherit') delete next.input
        else if (state.inputMode === 'text') next.input = ['text']
        else next.input = ['text', 'image']
        if (state.mode === 'inherit') delete next.reasoningEfforts
        else if (state.mode === 'disabled') next.reasoningEfforts = false
        else {
          next.reasoningEfforts = Object.fromEntries(
            LEVELS.filter(level => Object.prototype.hasOwnProperty.call(state.efforts, level))
              .map(level => [level, level === 'off' && (state.efforts[level] === '' || state.efforts[level] === null)
                ? null : String(state.efforts[level]).trim()]),
          )
        }
        return next
      })
    }

    function extensionOps(provider, profile) {
      const root = ['providers', provider.id]
      const headers = buildHeaders(provider)
      const ops = [Object.keys(headers).length === 0
        ? { op: 'unset', path: [...root, 'headers'] }
        : { op: 'set', path: [...root, 'headers'], value: headers }]
      const rawModels = Array.isArray(profile.models) ? profile.models : []
      if (rawModels.length > 0) {
        ops.push(
          { op: 'set', path: [...root, 'models'], value: mergeModelSettings(rawModels, provider.models) },
          provider.defaultEffort
            ? { op: 'set', path: [...root, 'reasoning'], value: provider.defaultEffort }
            : { op: 'unset', path: [...root, 'reasoning'] },
        )
        if (provider.api === 'openai-completions') {
          ops.push(provider.thinkingFormat
            ? { op: 'set', path: [...root, 'compat', 'thinkingFormat'], value: provider.thinkingFormat }
            : { op: 'unset', path: [...root, 'compat', 'thinkingFormat'] })
        }
      }
      return ops
    }

    function InlineExtension({ record, t }) {
      const [provider, setProvider] = useState(record.initial)
      const [failure, setFailure] = useState('')
      useEffect(() => {
        record.draft = provider
        record.setFailure = setFailure
        return () => { record.setFailure = () => {} }
      }, [provider, record])
      useEffect(() => {
        return installFormSync(record, () => {
          setProvider(current => syncFormProvider(current, record))
        })
      }, [record])
      const updateProvider = (_providerId, update) => {
        record.dirty = true
        setFailure('')
        setProvider(current => update(current))
      }
      const validation = validateProvider(provider)
      const detail = validation === undefined
        ? ''
        : `${validation.header ?? validation.model ?? ''}${validation.header || validation.model ? ': ' : ''}${t(validation.key)}`
      return h('div', { className: 'dsh-mrs-inline' },
        h(HeaderEditor, { provider, t, writable: record.writable, busy: record.pending, updateProvider }),
        h(ModelSettingsEditor, { provider, t, writable: record.writable, busy: record.pending, updateProvider }),
        detail ? h('p', { className: 'dsh-mrs-error', role: 'alert' }, detail) : null,
        failure ? h('p', { className: 'dsh-mrs-error', role: 'alert' }, failure) : null)
    }

    function actionForm(start, labels) {
      let current = start
      for (let depth = 0; current !== null && depth < 8; depth += 1, current = current.parentElement) {
        if ([...current.querySelectorAll('button')].some(button => labels.has(button.textContent.trim()))) return current
      }
      return undefined
    }

    function waitForDetach(node) {
      if (!node.isConnected) return Promise.resolve(true)
      return new Promise((resolve) => {
        let settled = false
        const finish = (value) => {
          if (settled) return
          settled = true
          observer.disconnect()
          clearTimeout(timeout)
          resolve(value)
        }
        const observer = new MutationObserver(() => { if (!node.isConnected) finish(true) })
        observer.observe(document.body, { childList: true, subtree: true })
        const timeout = setTimeout(() => finish(false), 20_000)
      })
    }

    function createInlineManager({ api, remote, t }) {
      const mounts = new Map()
      let declared = []
      let namespace
      let writable = false
      let observer
      let scheduled = false
      let disposed = false
      let toast
      let toastTimer

      const showToast = (text, failed = false) => {
        if (toast === undefined) {
          toast = document.createElement('div')
          toast.className = 'dsh-mrs-toast'
          toast.setAttribute('role', 'status')
          document.body.appendChild(toast)
        }
        toast.classList.toggle('dsh-mrs-toast-error', failed)
        toast.textContent = text
        clearTimeout(toastTimer)
        toastTimer = setTimeout(() => { toast?.remove(); toast = undefined }, 5000)
      }

      const initialProvider = (kind, entry, form) => {
        if (kind === 'existing') {
          const saved = providerDrafts(namespace).find(provider => provider.id === entry.provider)
          if (saved !== undefined) return saved
        }
        return syncFormProvider({
          id: '', name: '', api: '', defaultEffort: '', thinkingFormat: '',
          userAgent: '', headers: [], models: [],
        }, { kind, entry, form })
      }

      const mount = (target) => {
        if (target.mount.dataset.dshCustomProviderSettings === 'mounted') return
        target.mount.dataset.dshCustomProviderSettings = 'mounted'
        const initial = initialProvider(target.kind, target.entry, target.form)
        const record = {
          ...target,
          initial,
          draft: initial,
          writable,
          dirty: false,
          pending: false,
          setFailure: () => {},
        }
        record.root = createRoot(target.mount)
        mounts.set(target.mount, record)
        record.root.render(h(InlineExtension, { record, t }))
      }

      const customEntryFor = (row) => {
        if (![...row.querySelectorAll('span')].some(node => CUSTOM_TAGS.has(node.textContent.trim()))) return undefined
        const route = declared.find(entry => exactText(row, entry.provider))
        if (route !== undefined) return route
        const matches = declared.filter(entry => exactText(row, entry.displayName))
        return matches.length === 1 ? matches[0] : undefined
      }

      const scan = () => {
        scheduled = false
        if (disposed || namespace === undefined) return
        const live = new Set()
        for (const summary of document.querySelectorAll('details > summary')) {
          if (!CUSTOM_SUMMARIES.has(summary.textContent.trim())) continue
          const details = summary.parentElement
          const row = details?.closest('li')
          if (details === null || row === null) continue
          const entry = customEntryFor(row)
          if (entry === undefined) continue
          const form = actionForm(details, new Set(['Apply', '保存']))
          const body = summary.nextElementSibling
          if (form === undefined || body === null) continue
          let point = body.querySelector('[data-dsh-custom-provider-settings]')
          if (point === null) {
            point = document.createElement('div')
            point.dataset.dshCustomProviderSettings = 'point'
            const catalog = body.querySelector('section[aria-label]')
            body.insertBefore(point, catalog)
          }
          live.add(point)
          mount({ kind: 'existing', entry, form, mount: point })
        }
        const routeInput = document.querySelector('input[placeholder="acme-gateway"]')
        if (routeInput !== null) {
          const form = actionForm(routeInput, new Set(['Create provider', '创建提供方']))
          if (form !== undefined) {
            let point = form.querySelector('[data-dsh-custom-provider-settings]')
            if (point === null) {
              point = document.createElement('div')
              point.dataset.dshCustomProviderSettings = 'point'
              const catalog = form.querySelector('section[aria-label]')
              form.insertBefore(point, catalog)
            }
            live.add(point)
            mount({
              kind: 'new',
              entry: { provider: '', displayName: '', declared: true },
              form,
              mount: point,
            })
          }
        }
        for (const [point, record] of mounts) {
          if (live.has(point) && point.isConnected) {
            record.writable = writable
            continue
          }
          mounts.delete(point)
          record.root.unmount()
        }
      }

      const scheduleScan = () => {
        if (scheduled || disposed) return
        scheduled = true
        queueMicrotask(scan)
      }

      const refresh = async () => {
        try {
          const [providersResponse, settingsResponse] = await Promise.all([
            api.llm.providers({}),
            api.settings.describe({}),
          ])
          if (!providersResponse.result.ok || !settingsResponse.result.ok) return
          declared = providersResponse.result.value.providers.filter(entry => (
            entry.settingsNs === 'llm-pi-ai' && entry.declared === true
          ))
          namespace = settingsResponse.result.value.namespaces.find(entry => entry.ns === 'llm-pi-ai')
          writable = settingsResponse.result.value.writable
          scheduleScan()
        } catch {
          // The official Models page owns load failures; this plugin stays out of its error surface.
        }
      }

      const persist = async (provider) => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const described = await api.settings.describe({})
            if (!described.result.ok) throw new Error(described.result.error.message)
            const view = described.result.value.namespaces.find(entry => entry.ns === 'llm-pi-ai')
            if (view === undefined) throw new Error(t('noNamespace'))
            const userProfile = objectOf(objectOf(objectOf(view.user).providers)[provider.id])
            const effectiveProfile = objectOf(objectOf(objectOf(view.value).providers)[provider.id])
            const profile = {
              ...effectiveProfile,
              ...userProfile,
              models: Array.isArray(userProfile.models) ? userProfile.models : effectiveProfile.models,
            }
            if (!Array.isArray(profile.models)) throw new Error(`${provider.id}: ${t('noModels')}`)
            const response = await api.settings.mutate({
              ns: 'llm-pi-ai',
              ops: extensionOps(provider, profile),
              expectedRevision: view.revision,
            })
            if (response.result.ok) {
              showToast(`${t('saved')}: ${provider.name || provider.id}`)
              void refresh()
              return
            }
            if (response.result.error.code !== 'settings-conflict' || attempt === 2) {
              throw new Error(response.result.error.message)
            }
          } catch (error) {
            if (attempt === 2) showToast(`${t('loadFailed')}: ${messageOf(error)}`, true)
          }
        }
      }

      const onSubmit = (event) => {
        const button = event.target.closest?.('button')
        if (button === undefined || button === null || !SUBMIT_LABELS.has(button.textContent.trim())) return
        const record = [...mounts.values()].find(candidate => candidate.form.contains(button))
        if (record === undefined || !record.dirty || record.pending) return
        record.draft = syncFormProvider(record.draft, record)
        const validation = validateProvider(record.draft)
        if (validation !== undefined) {
          const detail = `${validation.header ?? validation.model ?? ''}${validation.header || validation.model ? ': ' : ''}${t(validation.key)}`
          event.preventDefault()
          event.stopImmediatePropagation()
          record.setFailure(detail)
          return
        }
        if (record.draft.id.length === 0) return
        record.pending = true
        record.setFailure('')
        const form = record.form
        const provider = clone(record.draft)
        void waitForDetach(form).then((closed) => {
          record.pending = false
          if (closed) void persist(provider)
        })
      }

      const originalDiscoverModels = api.llm.discoverModels
      const discoverModels = async function discoverModelsWithDraftHeaders(payload) {
        if (payload?.settingsNs !== 'llm-pi-ai') return originalDiscoverModels.call(api.llm, payload)
        let record
        if (typeof payload.provider === 'string') {
          record = [...mounts.values()].find(candidate => (
            candidate.kind === 'existing' && candidate.entry.provider === payload.provider
          ))
        } else {
          record = [...mounts.values()].find(candidate => candidate.kind === 'new' && candidate.form.isConnected)
        }
        if (record === undefined) return originalDiscoverModels.call(api.llm, payload)
        record.draft = syncFormProvider(record.draft, record)
        const headers = buildHeaders(record.draft)
        if (Object.keys(headers).length === 0) return originalDiscoverModels.call(api.llm, payload)
        try {
          const response = await fetch(DISCOVERY_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              provider: record.draft.id,
              baseURL: payload.baseURL ?? formValue(record.form, 'input', ['Base URL', 'API 地址']),
              api: payload.api ?? record.draft.api,
              ...payload.apiKey === undefined ? {} : { apiKey: payload.apiKey },
              headers,
            }),
          })
          const body = await response.json()
          if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'model discovery failed')
          return { result: { ok: true, value: { models: Array.isArray(body.models) ? body.models : [] } } }
        } catch (error) {
          return {
            result: {
              ok: false,
              error: { code: 'model-discovery-failed', message: messageOf(error) },
            },
          }
        }
      }

      return {
        start() {
          observer = new MutationObserver(scheduleScan)
          observer.observe(document.body, { childList: true, subtree: true })
          document.addEventListener('click', onSubmit, true)
          api.llm.discoverModels = discoverModels
          const disposeSettings = remote.$on('settings/document-updated', (ns) => {
            if (ns === 'llm-pi-ai') void refresh()
          })
          void refresh()
          scheduleScan()
          return () => {
            disposed = true
            observer.disconnect()
            document.removeEventListener('click', onSubmit, true)
            disposeSettings()
            if (api.llm.discoverModels === discoverModels) api.llm.discoverModels = originalDiscoverModels
            for (const record of mounts.values()) record.root.unmount()
            mounts.clear()
            clearTimeout(toastTimer)
            toast?.remove()
          }
        },
      }
    }

    const style = document.createElement('style')
    style.textContent = `
      .dsh-mrs-card{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);transition:border-color .16s,background .16s}
      .dsh-mrs-card:hover{border-color:var(--dsw-alias-label-dimmed)}
      .dsh-mrs-card-open{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
      .dsh-mrs-card-header{width:100%;appearance:none;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:8px}
      .dsh-mrs-card-header:focus-visible,.dsh-mrs-provider-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
      .dsh-mrs-card-headtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
      .dsh-mrs-card-name{font-size:15px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary)}
      .dsh-mrs-card-desc{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
      .dsh-mrs-card-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:12px 0 8px}
      .dsh-mrs-card-body[hidden],.dsh-mrs-provider-body[hidden]{display:none}
      .dsh-mrs-section{container-name:dsh-mrs;container-type:inline-size;display:flex;flex-direction:column;gap:10px;max-width:820px;color:var(--dsw-alias-label-primary)}
      .dsh-mrs-page-head{height:28px;display:flex;justify-content:flex-end;align-items:center}
      .dsh-mrs-providers{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}
      .dsh-mrs-provider{border-bottom:1px solid var(--dsw-alias-border-l2)}
      .dsh-mrs-provider-head{width:100%;appearance:none;border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:9px;padding:12px 2px;text-align:left;cursor:pointer;font:inherit}
      .dsh-mrs-provider-head:hover{background:var(--dsw-alias-interactive-bg-hover)}
      .dsh-mrs-provider-icon{display:flex;color:var(--dsw-alias-label-tertiary)}
      .dsh-mrs-provider-name{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
      .dsh-mrs-provider-name strong{font-size:14px;line-height:22px;font-weight:600}
      .dsh-mrs-provider-name code{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
      .dsh-mrs-tag{padding:1px 6px;border:1px solid var(--dsw-alias-border-l3);border-radius:4px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
      .dsh-mrs-count{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
      .dsh-mrs-provider-body{display:flex;flex-direction:column;gap:16px;padding:4px 2px 14px 25px}
      .dsh-mrs-band{display:flex;flex-direction:column;gap:10px}
      .dsh-mrs-band h4{margin:0;font-size:13px;line-height:20px;font-weight:600}
      .dsh-mrs-subhead{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
      .dsh-mrs-field,.dsh-mrs-mode,.dsh-mrs-wire{display:flex;flex-direction:column;gap:5px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
      .dsh-mrs-field input,.dsh-mrs-field select,.dsh-mrs-mode select,.dsh-mrs-wire input,.dsh-mrs-header-row input{box-sizing:border-box;width:100%;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;letter-spacing:0}
      .dsh-mrs-field input:focus,.dsh-mrs-field select:focus,.dsh-mrs-mode select:focus,.dsh-mrs-wire input:focus,.dsh-mrs-header-row input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
      .dsh-mrs-header-list{display:flex;flex-direction:column;gap:6px}
      .dsh-mrs-header-row{display:grid;grid-template-columns:minmax(130px,.7fr) minmax(180px,1.3fr) 32px;gap:6px;align-items:center}
      .dsh-mrs-route-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
      .dsh-mrs-models{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}
      .dsh-mrs-model{padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l2);display:flex;flex-direction:column;gap:10px}
      .dsh-mrs-model-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .dsh-mrs-model-head>div:first-child{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
      .dsh-mrs-model strong{font-size:13px;line-height:20px;font-weight:500}
      .dsh-mrs-model code{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
      .dsh-mrs-model-controls{display:flex;justify-content:flex-end;gap:8px;flex:1;flex-wrap:wrap}
      .dsh-mrs-mode{width:min(190px,100%)}
      .dsh-mrs-presets{display:flex;gap:6px;flex-wrap:wrap}
      .dsh-mrs-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(126px,1fr));gap:6px}
      .dsh-mrs-level{min-height:34px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;display:flex;flex-direction:column;gap:6px}
      .dsh-mrs-level-active{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-interactive-bg-hover)}
      .dsh-mrs-check{display:flex;align-items:center;gap:7px;font-size:12px;line-height:18px;font-weight:500}
      .dsh-mrs-check input{margin:0;accent-color:var(--dsw-alias-brand-primary)}
      .dsh-mrs-wire input{height:28px;font-family:var(--ds-font-family-code);font-size:12px}
      .dsh-mrs-actions{display:flex;justify-content:flex-end;padding-top:2px}
      .dsh-mrs-error,.dsh-mrs-success,.dsh-mrs-muted,.dsh-mrs-empty,.dsh-mrs-empty-inline{margin:0;font-size:12px;line-height:18px}
      .dsh-mrs-error{color:var(--dsw-alias-state-error-primary)}
      .dsh-mrs-success{color:var(--dsw-alias-state-success-primary)}
      .dsh-mrs-muted,.dsh-mrs-empty,.dsh-mrs-empty-inline{color:var(--dsw-alias-label-tertiary)}
      .dsh-mrs-empty{padding:18px;border:1px dashed var(--dsw-alias-border-l3);border-radius:8px;text-align:center}
      .dsh-mrs-state{display:flex;align-items:center;gap:10px}
      .dsh-mrs-inline{display:flex;flex-direction:column;gap:16px;margin:14px 0;padding:14px 0;border-top:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
      .dsh-mrs-toast{position:fixed;z-index:10000;right:20px;bottom:20px;max-width:min(420px,calc(100vw - 40px));padding:10px 14px;border:1px solid var(--dsw-alias-state-success-primary);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 8px 24px rgba(0,0,0,.18);font-size:13px;line-height:20px}
      .dsh-mrs-toast-error{border-color:var(--dsw-alias-state-error-primary)}
      @container dsh-mrs (max-width:620px){.dsh-mrs-provider-body{padding-left:2px}.dsh-mrs-provider-head{align-items:flex-start}.dsh-mrs-tag,.dsh-mrs-count{display:none}.dsh-mrs-model-head{flex-direction:column}.dsh-mrs-model-controls{width:100%;justify-content:flex-start}.dsh-mrs-mode{width:100%}.dsh-mrs-levels{grid-template-columns:repeat(2,minmax(0,1fr))}.dsh-mrs-header-row{grid-template-columns:1fr 32px}.dsh-mrs-header-row input:nth-child(2){grid-column:1/2}.dsh-mrs-header-row button{grid-column:2;grid-row:1/3}}
    `
    style.dataset.plugin = 'dsh-custom-provider-settings'
    document.head.appendChild(style)

    const inject = ['locale', 'connection', 'remote']
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register('settings.modelRequest', { zh, en }), 'model-request-settings: locale')
      const connection = ctx.get('connection')
      const t = ctx.locale.bind('settings.modelRequest')
      const manager = createInlineManager({ api: connection.api, remote: ctx.remote, t })
      ctx.effect(() => manager.start(), 'model-request-settings: models form integration')
    }

    exports.apply = apply
    exports.inject = inject
    exports.__test = {
      buildHeaders,
      buildModels,
      commonLevels,
       modelState,
       extensionOps,
       formProviderSignature,
       installFormSync,
       mergeModelSettings,
       providerDrafts,
       syncFormProvider,
      supportedLevels,
      validateProvider,
    }
    return module.exports
  },
})
