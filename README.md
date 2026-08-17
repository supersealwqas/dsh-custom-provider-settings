# dsh-custom-provider-settings

English | [中文](README.zh.md)

A WebUI plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that adds request headers, image-input declarations, and reasoning-level settings to user-defined custom model providers without modifying Harness source files.

## Features

- Configure `User-Agent` and additional HTTP request headers for each custom provider.
- Apply the same custom headers to normal model requests and Fetch available models.
- Declare each custom model as text-only or text-and-image capable.
- Configure the reasoning levels exposed for each model and map every level to the value sent to its API.
- Set a provider-level default reasoning level.
- Keep DeepSeek official providers and built-in third-party providers on their original Harness behavior.

## Screenshots

### Provider settings

The plugin inserts request-header and model-capability fields into the existing custom-provider form. The highlighted areas show `User-Agent`, additional headers, image input, the default reasoning level, and per-model reasoning mappings.

![Custom provider request headers, image input, and reasoning settings](assets/img01.png)

### Reasoning selector

Enabled reasoning levels appear in the conversation composer. The example exposes Default, Off, Low, Medium, High, Xhigh, and Max, with Xhigh selected.

![Reasoning-level selector in the DeepSeek Harness conversation composer](assets/img02.png)

## Requirements

- DeepSeek Harness `0.1.0-rc.6` or a compatible release.
- The `web` profile.
- Node.js `^22.19.0` or `>=24.0.0`.

Stop the WebUI before installing or upgrading the plugin, then restart it after installation.

## Install or upgrade

### From GitHub

Run the following commands with the official npm package:

```powershell
npx --yes @deepseek-ai/dsh plugin --profile web add github:supersealwqas/dsh-custom-provider-settings
npx --yes @deepseek-ai/dsh web
```

Running the `add` command again updates the installed checkout. If `dsh` is installed globally, the shorter `dsh plugin ...` and `dsh web` forms are equivalent. The WebUI listens on `http://127.0.0.1:3080` by default.

### From a local checkout

Create a tarball in the repository's ignored `dist` directory and install it into the Web profile:

```powershell
New-Item -ItemType Directory -Force .\dist
npm pack --pack-destination .\dist
npx --yes @deepseek-ai/dsh plugin --profile web add .\dist\dsh-custom-provider-settings-0.4.0.tgz
npx --yes @deepseek-ai/dsh web
```

## Use

1. Open Settings, then Models.
2. Edit a provider carrying the Custom tag, or choose Add provider and Add a custom provider.
3. In the inserted Request headers area, enter a `User-Agent` and any other headers required by the endpoint.
4. Under Model capabilities, choose each model's input capability and reasoning capability. Select Text and images only when both the API and model support image input.
5. Select the enabled reasoning levels and enter the exact API value for each one. Choose a default level if required.
6. Use the original Apply or Create provider button. The plugin saves its fields after the Harness form succeeds.
7. Start a new conversation, select the custom model, and choose one of its configured reasoning levels.

Fetch available models uses the request-header values currently entered in the same form, including values that have not been saved yet.

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

## Scope and limitations

- The plugin mounts only on user-defined providers reported by Harness with `declared: true`.
- DeepSeek official providers and built-in third-party providers are not mounted or modified.
- Model names, context windows, maximum output values, and other fields owned by the original form are preserved when plugin settings are saved.
- The plugin does not patch DeepSeek Harness source files.
- The current Models page has no provider-form plugin slot. This plugin locates the original accessible labels and mounts its React controls at runtime, so a future Harness form change may require a plugin update.

## Development

```powershell
npm test
node --check client.js
```

## Attribution

The reasoning-settings client logic is adapted from [JuneLearn/dsh-reasoning-settings](https://github.com/JuneLearn/dsh-reasoning-settings) under the MIT License.

## License

MIT. See [LICENSE](LICENSE). The license retains the copyright notices for this repository and its adapted upstream source.
