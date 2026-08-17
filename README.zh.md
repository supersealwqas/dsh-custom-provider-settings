# dsh-custom-provider-settings

[English](README.md) | 中文

这是一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) WebUI 的插件。它为用户自定义模型提供方增加请求头、图像输入声明和思考等级设置，并且不修改 Harness 源代码文件。

## 功能

- 为每个自定义提供方配置 `User-Agent` 和其他 HTTP 请求头。
- 将相同的自定义请求头用于普通模型请求和“获取可用模型”。
- 将每个自定义模型声明为仅文本或支持文本与图像。
- 配置每个模型可选择的思考等级，并把每个等级映射为发送给 API 的实际值。
- 设置提供方级别的默认思考等级。
- DeepSeek 官方提供方和内置第三方提供方继续使用 Harness 原有行为。

## 界面截图

### 提供方设置

插件会在原有的自定义提供方表单中插入请求头和模型能力配置。红框区域展示了 `User-Agent`、其他请求头、图像输入、默认思考等级以及每个模型的思考等级映射。

![自定义提供方的请求头、图像输入和思考等级设置](assets/img01.png)

### 思考等级选择器

启用的思考等级会出现在对话输入框中。图中提供 Default、Off、Low、Medium、High、Xhigh 和 Max，并选择了 Xhigh。

![DeepSeek Harness 对话输入框中的思考等级选择器](assets/img02.png)

## 环境要求

- DeepSeek Harness `0.1.0-rc.6` 或兼容版本。
- `web` profile。
- Node.js `^22.19.0` 或 `>=24.0.0`。

安装或升级插件前请先停止 WebUI，安装完成后再重新启动。

## 安装或升级

### 从 GitHub 安装

使用官方 NPM 包运行：

```powershell
npx --yes @deepseek-ai/dsh plugin --profile web add github:supersealwqas/dsh-custom-provider-settings
npx --yes @deepseek-ai/dsh web
```

再次运行 `add` 命令会更新已安装的代码。如果已经全局安装 `dsh`，可以使用更短的 `dsh plugin ...` 和 `dsh web`。WebUI 默认监听 `http://127.0.0.1:3080`。

### 从本地仓库安装

在仓库中将安装包生成到已被忽略的 `dist` 目录，然后安装到 Web profile：

```powershell
New-Item -ItemType Directory -Force .\dist
npm pack --pack-destination .\dist
npx --yes @deepseek-ai/dsh plugin --profile web add .\dist\dsh-custom-provider-settings-0.4.0.tgz
npx --yes @deepseek-ai/dsh web
```

## 使用方法

1. 打开“设置”，然后进入“模型”。
2. 编辑带“自定义”标记的提供方，或者选择“添加提供方”和“添加自定义提供方”。
3. 在插件插入的“请求头”区域填写 `User-Agent` 和接口要求的其他请求头。
4. 在“模型能力”中选择每个模型的输入能力和思考能力。只有 API 和模型都支持图像输入时，才选择“文本与图像”。
5. 勾选需要开放的思考等级，并填写每个等级实际发送给 API 的值；需要时再选择默认等级。
6. 使用原表单的“保存”或“创建提供方”按钮。Harness 原表单保存成功后，插件会继续保存扩展字段。
7. 新建对话，选择该自定义模型，然后选择已经配置的思考等级。

“获取可用模型”会使用同一表单中当前填写的请求头，包括尚未保存的值。

## 验证图像输入

1. 将模型的输入能力设为“文本与图像”，然后保存提供方。
2. 使用该模型新建对话。
3. 上传一张包含唯一字符串的 PNG 或 JPEG，例如 `VISION-7392`。
4. 要求模型只返回图片中看到的字符串。

模型正确返回字符串，说明 Harness 已接受附件，并且接口成功处理了图片。这个设置只是向 Harness 声明模型能力，无法让原本不支持视觉输入的 API 或模型获得图像识别能力。

## 保存的配置

界面会在 `llm-pi-ai.providers.<provider>` 下写入这些字段：

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

请求头值会以普通文本存入 `settings.yaml`。API 密钥和其他秘密信息应放在 Harness 的凭据字段中，不要写进自定义请求头。

清空全部自定义请求头会删除覆盖配置，并恢复 Harness 原有的请求头行为。

## 作用范围和限制

- 插件只挂载到 Harness 报告为 `declared: true` 的用户自定义提供方。
- DeepSeek 官方提供方和内置第三方提供方不会被挂载或修改。
- 保存插件设置时，会保留原表单管理的模型名称、上下文窗口、最大输出值和其他字段。
- 插件不会修改 DeepSeek Harness 源代码文件。
- 当前“模型”页面没有提供方表单插件插槽。本插件通过原页面的无障碍标签定位表单，并在运行时挂载 React 控件，因此 Harness 以后修改表单结构时可能需要更新插件。

## 开发

```powershell
npm test
node --check client.js
```

## 致谢

思考等级客户端逻辑改编自 [JuneLearn/dsh-reasoning-settings](https://github.com/JuneLearn/dsh-reasoning-settings)，遵循 MIT License。

## 许可证

本项目使用 MIT License，详见 [LICENSE](LICENSE)。许可证同时保留本仓库和改编来源的版权声明。
