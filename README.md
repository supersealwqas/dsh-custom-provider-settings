# DSH Custom Provider Settings Plugin

English | [中文](README.zh.md)

A WebUI plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that adds request headers, image-input declarations, and reasoning-level settings to user-defined custom model providers. It loads through the DSH plugin system and does not modify Harness source files.

> The plugin applies only to providers carrying the Custom tag. DeepSeek official providers and built-in third-party providers retain their original configuration and request behavior.

## Features

- Configure `User-Agent` and additional HTTP request headers for each custom provider.
- Apply the same custom headers to normal model requests and Fetch available models.
- Declare each custom model as text-only or text-and-image capable.
- Configure the reasoning levels exposed for each model and map every level to the value sent to its API.
- Set a provider-level default reasoning level.
- Configure the reasoning parameter format for `openai-completions` providers.
- Restore the original Harness request-header behavior by clearing all custom headers.

## Demo

### Custom provider settings

The plugin inserts request-header and model-capability fields into the existing custom-provider form. The highlighted areas show `User-Agent`, additional headers, image input, the default reasoning level, and per-model reasoning mappings.

![Custom provider request headers, image input, and reasoning settings](assets/img01.png)

### Reasoning selector

Enabled reasoning levels appear in the conversation composer. The example exposes Default, Off, Low, Medium, High, Xhigh, and Max, with Xhigh selected.

![Reasoning-level selector in the DeepSeek Harness conversation composer](assets/img02.png)

## Installation

### Prerequisites

- Node.js `^22.19.0` or `>=24.0.0`; Node.js 24 LTS is recommended.
- Git, used to install the plugin from GitHub.
- pnpm. `dsh plugin` invokes pnpm in the Web profile directory to manage plugins.
- DeepSeek Harness `0.1.0-rc.6` or a compatible release with the `web` profile.

Check the environment in PowerShell:

```powershell
node --version
npx --version
git --version
corepack enable
pnpm --version
```

If `corepack enable` fails because of insufficient permissions, run it once from an administrator PowerShell or follow the [pnpm installation guide](https://pnpm.io/installation).

Stop the running WebUI before installing, upgrading, or removing the plugin, then restart it when the command completes.

### Option 1: Install from GitHub (recommended)

This method does not require a DeepSeek Harness source checkout. On first use, `npx` downloads the official DSH NPM package and its dependencies:

```powershell
npx --yes -p @deepseek-ai/dsh dsh plugin --profile web add github:supersealwqas/dsh-custom-provider-settings
```

Start the WebUI after installation:

```powershell
npx --yes -p @deepseek-ai/dsh dsh web
```

The WebUI listens on `http://127.0.0.1:3080` by default. If `dsh` is installed globally, the shorter `dsh plugin ...` and `dsh web` forms are equivalent.

### Option 2: Install from a local checkout

Use this method when changing or debugging the plugin. Create a TGZ package in the repository and install it into the Web profile:

```powershell
New-Item -ItemType Directory -Force .\dist
npm pack --pack-destination .\dist
npx --yes -p @deepseek-ai/dsh dsh plugin --profile web add .\dist\dsh-custom-provider-settings-0.4.0.tgz
npx --yes -p @deepseek-ai/dsh dsh web
```

The `dist` directory and TGZ files are ignored by `.gitignore` and are not uploaded to the repository.

### Upgrade

Stop the WebUI and run the matching `add` command again. DSH updates the installed plugin without requiring a separate removal. Restart the WebUI afterward.

### Uninstall

```powershell
npx --yes -p @deepseek-ai/dsh dsh plugin --profile web remove dsh-custom-provider-settings
```

Restart the WebUI to remove the plugin controls and behavior. Provider extension fields already stored in `settings.yaml` are not deleted automatically.

## Usage

1. Open Settings > Models.
2. Edit a provider carrying the Custom tag that already contains a model, or choose Add provider > Add a custom provider and enter its models.
3. In the inserted Request headers area, enter a `User-Agent` and any other headers required by the endpoint. Leave the fields empty to retain the Harness defaults.
4. Under Model capabilities, choose each model's input and reasoning capabilities. Select Text and images only when both the API and model support image input.
5. Select the enabled reasoning levels and enter the exact API value for each one. Choose a default level if required.
6. Use the original Apply or Create provider button. The plugin saves its fields after the Harness form succeeds.
7. Start a new conversation, select the custom model, and choose one of its configured reasoning levels.

Fetch available models uses the request-header values currently entered in the same form, including values that have not been saved yet. This allows model discovery to work with endpoints that require a particular `User-Agent` or another custom header.

## Verify image input

1. Set the model's input capability to Text and images and save the provider.
2. Start a new conversation with that model.
3. Upload a PNG or JPEG containing a unique string such as `VISION-7392`.
4. Ask the model to return only the string visible in the image.

A correct response confirms that Harness accepted the attachment and the endpoint processed it. This setting declares model capability to Harness; it cannot add vision support to an API or model that does not already provide it.

## Stored settings

The UI writes these fields under `llm-pi-ai.providers.<provider>`:

```yaml
headers:
  User-Agent: my-client/1.0
  X-Client-Name: my-client
reasoning: high
models:
  - id: example-model
    input: [text, image]
    reasoningEfforts:
      low: low
      medium: medium
      high: high
```

Header values are stored as ordinary text in `settings.yaml`. Keep API keys and other secrets in the Harness credential field instead of custom headers.

Clearing every custom header removes the override and restores the original Harness request-header behavior.

## Troubleshooting

### The plugin settings do not appear

Confirm that the plugin is installed in the `web` profile and restart the WebUI after installation. The plugin mounts only on user-defined custom providers, and a provider without models has no editable model settings.

### Fetch available models still fails

Confirm the Base URL, API key, and API protocol first, then check every `User-Agent` or additional header required by the endpoint. The plugin includes unsaved header values from the active form in the discovery request.

### Reasoning levels or image upload are missing in a conversation

Save the provider, start a new conversation, and select the model again. Reasoning levels must be enabled for that model, and image upload requires the model to be declared as Text and images.

## Compatibility and limitations

- The current release targets the public plugin interfaces and WebUI in DeepSeek Harness `0.1.0-rc.6`.
- The plugin mounts only on user-defined providers reported by Harness with `declared: true`.
- DeepSeek official providers and built-in third-party providers are not mounted or modified.
- Model names, context windows, maximum output values, and other fields owned by the original form are preserved when plugin settings are saved.
- The current Models page has no provider-form plugin slot. This plugin locates the original accessible labels and mounts its React controls at runtime, so a future Harness form change may require a plugin update.
- The plugin does not patch DeepSeek Harness source files.

## Development and verification

```powershell
npm test
node --check client.js
npm pack --dry-run
```

## Attribution

The reasoning-settings client logic is adapted from [JuneLearn/dsh-reasoning-settings](https://github.com/JuneLearn/dsh-reasoning-settings) under the MIT License.

## License

MIT. See [LICENSE](LICENSE). The license retains the copyright notices for this repository and its adapted upstream source.
