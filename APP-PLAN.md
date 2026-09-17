# 大荒 · 主人 App 方案

> v3.0 · 2026-09-17 · **技术路线变更，本版重写为「原生双端」**
> v2.x 走的是微信「小程序多端框架」——主人否决。v1.x 的「仅自用侧载」手续也已作废。以下以 v3.0 为准。

---

## 零、一页结论

**技术栈定了：各端各自原生。安卓先行，鸿蒙暂缓。**

| | 结论 |
|---|---|
| 安卓 | **Kotlin + Jetpack Compose**，新代码库 `dahuang-commander-android/` |
| 鸿蒙 | **ArkTS**，暂不开工；将来也不必换 Windows 机器（见 §5.2） |
| 微信小程序 | **保留，是正式入口**——不是开发工具，不迁移 |
| 代码份数 | 小程序 + 安卓（+ 将来鸿蒙）= **多份，主人已知并接受** |

主人原话，逐字：

> 「我不觉得用微信的这个多端开发有多好，反而回受很多限制，不如快速开发一个独立的app」

> 「每个都用原生的，这边不会互相受限制，而且限制依靠AI开发效率高很多了，维护起来没那么麻烦」

**为什么原生反而更省**：多端框架省的是「写一遍」的力气，代价是把三端的发布节奏、能力边界、调试手段全部交给微信的产品节奏。原生各端互不牵制，而在 AI 辅助下，第二遍代码的边际成本已经远低于被单一厂商约束的成本。

---

## 一、已验证的成果（不是计划，是跑通的）

走路骨架已完成并验证。工程在 `/home/admin/Gemini/dahuang-commander-android/`。

| 项 | 证据 |
|---|---|
| 构建 | `BUILD SUCCESSFUL`，产出 `app-debug.apk`（13M） |
| 契约测试 | **3/3 通过**——用 App 自己的 Retrofit/序列化/拦截器栈打真实后端 |
| 包身份 | `aapt2` 核验：`land.dahuang.commander` / 大荒指挥官 / compileSdk 37 / targetSdk 37 |
| 自包含 | 自带 Gradle wrapper，锁 9.7.0 |

契约测试覆盖的是**后端契约而非 UI**：空密码 → 400「请填写账号与密码」；错密码 → 401「账号或密码错误」；坏 token → 鉴权接口被拦。这三条通过，说明 DTO、请求头、错误解析、中文编码全线对齐。

---

## 二、工具链（实测通过，版本是被逼出来的不是挑出来的）

```
Gradle 9.7.0  +  AGP 9.3.1  +  Kotlin 2.2.10（AGP 内置）
compileSdk 37 / targetSdk 37 / minSdk 26 / JDK 17
```

三条硬约束，每条都是撞了墙才确认的：

1. **AGP 9 是硬要求，不是偏好。** 当前 androidx（Compose 1.12.1 / core 1.19.0）在 `checkDebugAarMetadata` 阶段强制要求 AGP ≥ 9.1 且 compileSdk ≥ 37。想留 AGP 8 就得把整套 androidx 退回一年前。
2. **AGP 8.x 与 Gradle ≥ 9.6 根本不兼容**——`InternalProblems` 内部 API 在 9.6.0 被移除。两条合起来把版本空间夹死了。
3. **AGP 9 内置 Kotlin**，再 apply `org.jetbrains.kotlin.android` 会**直接报错**（不是警告）。内置 KGP 版本查 `com.android.tools.build:gradle` 的 POM 得知（9.3.1 → 2.2.10），Compose 编译器插件与 serialization 插件必须与之严格同版本。

另注：Android SDK 包名现在带次版本号，是 `platforms;android-37.0`，**不是** `android-37`。

**构建限流**：这台机器同时跑着线上后端（pm2: agent-forum / dahuang-commander），`gradle.properties` 里已锁 `workers.max=2`、`-Xmx2g`。

---

## 三、这台机器能验证什么、不能验证什么

**不能验证 UI。** 本机无 `/dev/kvm`，CPU 也不暴露虚拟化标志 → **跑不了模拟器**。界面长什么样、点击是否流畅、布局是否错位，我一次都看不到。

| 能 | 不能 |
|---|---|
| 构建通过 | 界面渲染 |
| JVM 契约测试打真实后端 | 交互流程 |
| `aapt2` 核验包身份 | 真机兼容性 |
| 静态代码审查 | 性能表现 |

**所以每个里程碑的验收动作是：我出包 → 主人装真机 → 反馈。** 这是这条路线既定的工作方式，不是临时妥协。

---

## 四、往下要搬的东西

小程序实测规模：

| 项 | 数量 |
|---|---|
| 页面 | **23 个** |
| JS 逻辑 | **9,188 行**（此前记的 41,400 行含 wxml/wxss，不是纯逻辑量） |
| tabBar | `index`(2404) / `chat`(292) / `dahuang`(1356) / `settings`(1071) |

`index` 最重：FAB 拖拽、图表触摸处理、ticker、快捷面板。建议先搬 `settings` 和 `dahuang` 这类结构清晰的，把 Compose 的写法在本项目里跑顺，再啃 `index`。

**socket.io 客户端**尚未实现。架构里已声明（`wss://dahuang.land`，`path: "/api/socket"`，连上后发 `auth` 事件带 JWT），是实时消息的前提。

**后端几乎不用改。** 登录、通知、鉴权头（`Authorization: Bearer` + `X-Agent-Version: 7.0`）全部复用，客户端中立。推送一期不做——鸿蒙未上架时 Push Kit 按营销类算，单设备每日仅 2 条；一期靠前台 socket 长连 + 冷启动拉取够用。

---

## 五、鸿蒙（暂缓，但坑已探明）

### 5.1 主人已定：先不做

### 5.2 但**不必换 Windows 机器**

DevEco Studio **GUI 无 Linux 版**（官方只列 Windows/macOS），但 **Command Line Tools 官方支持 Linux**（`commandline-tools-linux-x64-*.zip`，`hvigorw` 纯命令行可出 HAP/.app）。26.0.0 起连 Linux 模拟器都支持（同样需 KVM，本机没有）。下载入口需登录华为账号。

### 5.3 跨平台框架编译纯血鸿蒙：基本是死路（已核实）

| 框架 | 结论 |
|---|---|
| **KMP / Compose Multiplatform** | JetBrains **官方明确不支持**，KT-63976 状态 Open，原文「not in our plans」 |
| **.NET MAUI** | 不支持。仓库树 26,324 条路径匹配 harmony\|ohos = **0**；三个相关 issue 全部 Closed as not planned |
| **Avalonia** | 不支持。官方 issue #17404 Closed as not planned；社区后端 2026-05-08 **已归档停更** |
| **Qt** | 官方平台清单无 HarmonyOS，但 Qt 公司 Gerrit 有非公开 `tqtc/harmonyos-*` 分支；公开路径只有 OpenHarmony SIG 的 Qt 5.15 适配（**SIG 脚本支持 Linux 宿主**） |
| **Electron** | 只有 SIG 移植（Chromium 132 + Node，PC/二合一形态）。**构建宿主必须 Linux，且要 ≥200G 磁盘、≥32G 内存** |
| **Taro / Lynx** | **官方支持鸿蒙**。Lynx 为 ArkUI C API + BuilderNode 原生渲染 |

**结论：想做纯血鸿蒙，ArkTS 原生是唯一全支持路径。** 这条与主人「每个都用原生的」的判断一致。

---

## 六、合规（二期的事，此处只留指针）

一期自用不管这些。但有一条**现在就要守住**：

> **`.land` 做不了 ICP 备案**——已调工信部域名系统接口全量核对，171 个批复后缀里没有 `.land`。而小程序服务器域名必须已备案，App 备案也要求境内服务器。**域名将来必换、后端必迁**——所以现在就把域名做成配置项，**别写死**。（安卓端已默认 `https://dahuang.land` 且登录页可改。）

二期真正卡脖子的不是技术，是**主体**：个人主体 + 社交类产品 + 多市场分发，三者互斥（小米不收个人、vivo 无个人开发者类型、华为社交类目要《增值电信业务经营许可证》、微信小程序个人主体类目里没有社交/资讯/电商/AI）。且《人工智能拟人化互动服务管理暂行办法》（2026-07-15 施行）的适用范围——「模拟自然人人格特征……提供持续性情感互动」——「分身对谈」「主人」「智能体」几乎逐字命中，命中后必须自建算法备案 + 安全评估，不能借用第三方模型备案。

详细依据见 v2.0 的 §7（已归档在 git 历史里），需要时再展开。

---

## 七、里程碑

| 阶段 | 内容 | 状态 |
|---|---|---|
| **M0** | 打通链路：装工具链 → 登录页 → 打后端拿 JWT → 显示「已登录：某某」 | **✅ 完成** |
| **M1** | socket.io 实时通道 + 全量基础设施（AppHub/DTO/RichContent/图表/通用组件） | **✅ 完成（2026-09-18）** |
| **M2** | **23 页全部移植**（四 tab + 19 二级页，微信特有功能除外） | **✅ 完成（2026-09-18，待真机验收）** |
| **M3** | 契约测试全量验证 + 真机验收 | 进行中 |
| **M4** | 鸿蒙 ArkTS 起步 | 暂缓 |

### 微信特有功能的安卓替代（已按 UX 最优决策）

| 小程序功能 | 安卓实现 |
|---|---|
| wx.login openid 绑定（订阅消息用） | 移除（安卓无微信订阅推送；后续可接 FCM/本地通知） |
| requestSubscribeMessage 订阅消息 | 移除 |
| navigateToMiniProgram 直跳拼多多/领券小程序 | 复制链接 + 浏览器打开 H5 |
| 微信分享 | 未做（后续可接系统分享 Intent） |
| wxfile 路径 / 胶囊定位 / 手写 Socket.io 协议 | 移除（安卓用官方 socket.io-client） |
| 微信支付/扫一扫/定位 | 小程序本来就没有，无需移植 |

## 八、需要主人出手

1. **装真机**：APK 在 `/home/admin/Gemini/dahuang-commander-android/app/build/outputs/apk/debug/app-debug.apk`（25.8MB，debug 未混淆）。用现有账号密码或 JWT 登录。
2. **真机验收清单**（重点过一遍）：登录（仙册点化/导入凭证/注册筑基）→ 分身对谈发指令（流式进度/图表/图片/快捷面板）→ 神念传播（房间/接管/发图）→ 大荒之地（论坛帖子/评论/竞技场/元神榜）→ 元神修炼（记忆/日程/任务/知识库/MCP/京东拼多多授权/登出）。
3. 发现 UI 问题告诉我，我在这台机器上改完重新出包。

---

## 附：关键依据

**本工程实测**
- `gradle/libs.versions.toml`、`app/build.gradle.kts` 内的注释逐条记录了版本约束的由来
- `app/src/test/java/land/dahuang/commander/net/BackendContractTest.kt` —— 契约测试本体
- KGP 兼容性矩阵：`kotlinlang.org/docs/gradle-configure-project.html`
- AGP 9 内置 Kotlin 迁移文档：`developer.android.com/build/kotlin-support`

**鸿蒙路线核实**（子代理调研，附原文引用）
- DevEco Studio 系统要求（仅 Windows/macOS）/ 命令行工具（含 Linux 包）
- `github.com/AvaloniaUI/Avalonia/issues/17404`、`OpenHarmony-NET` 归档公告
- `gitcode.com/openharmony-sig/electron`（构建宿主原文）、`gitcode.com/qtforohos/UserManual`
- `docs.avaloniaui.net/docs/supported-platforms`、`learn.microsoft.com/dotnet/maui/supported-platforms`
