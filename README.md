# AI Role Master

为AI助手提供专业角色扮演能力，支持创建、管理和切换不同专业角色，实现多角色协同对话。

## 核心功能

### 多角色支持
- 预设专业角色：前端工程师、后端工程师、产品经理、测试工程师、DevOps工程师、UI设计师等
- 自定义角色：创建符合需求的专属AI角色
- 角色市场：从社区下载其他用户分享的角色

### 灵活切换
- 一键切换AI角色
- 状态栏显示当前角色
- 支持取消角色恢复通用模式

### 导入导出
- 导出角色为JSON文件
- 导入他人分享的角色配置
- 批量管理角色

### 群聊模式
- 一人公司群聊：多个角色同时参与讨论
- 可视化角色选择界面
- 智能提示词生成
- 支持3-6个角色协同

## 快速开始

### 安装

**从VS Code市场安装**
1. 打开VS Code
2. 进入扩展面板（Ctrl+Shift+X）
3. 搜索 "AI Role Master"
4. 点击安装

**从VSIX文件安装**
```bash
code --install-extension ai-role-master-1.0.0.vsix
```

### 首次使用

1. 安装插件后，会提示安装预设角色
2. 点击状态栏的角色图标选择一个角色
3. 开始与AI对话，AI将以选定角色的身份回答

## 使用指南

### 选择角色

**命令面板**
1. 按 `Ctrl+Shift+P`
2. 输入 "选择AI角色"
3. 从列表中选择角色

**状态栏**
- 点击右下角的角色图标
- 选择想要的角色

**侧边栏**
- 打开AI Role Master侧边栏
- 点击角色列表中的角色

### 创建自定义角色

1. 打开命令面板（Ctrl+Shift+P）
2. 输入 "创建自定义角色"
3. 按提示填写角色信息：角色名称、显示名称、角色描述、分类、系统提示词、专业技能、标签

### 管理角色

1. 命令面板 → "管理角色"
2. 选择要管理的角色
3. 可以编辑提示词、收藏/取消收藏、导出、删除

### 导入导出角色

**导出角色：**
1. 命令面板 → "导出角色"
2. 选择要导出的角色（可多选）
3. 选择保存位置

**导入角色：**
1. 命令面板 → "导入角色"
2. 选择JSON文件
3. 角色将自动添加到列表

### 浏览角色市场

1. 命令面板 → "浏览角色市场"
2. 浏览社区分享的角色
3. 选择并安装喜欢的角色

### 启动群聊模式

1. 命令面板 → "启动一人公司群聊模式"
2. 在可视化界面中选择3-6个角色
3. 点击启动群聊
4. 选择如何应用：新窗口打开、复制内容或直接使用

## 预设角色

插件内置了6个精心设计的专业角色：

| 角色 | 专业领域 | 适用场景 |
|------|----------|----------|
| **React 前端工程师** | React, TypeScript, 前端工程化 | 前端开发、组件设计、性能优化 |
| **Node.js 后端工程师** | Node.js, 微服务, 数据库 | API设计、服务端开发、架构设计 |
| **产品经理** | 需求分析, 用户体验, 产品设计 | 功能规划、需求文档、原型设计 |
| **测试工程师** | 自动化测试, 质量保证 | 测试用例、自动化脚本、质量优化 |
| **DevOps 工程师** | CI/CD, Docker, Kubernetes | 部署流程、容器化、运维自动化 |
| **UI/UX 设计师** | 界面设计, 交互设计, 用户体验 | 设计规范、交互优化、视觉设计 |

## 配置选项

在VS Code设置中可以配置：

- `aiRoleMaster.currentRole`: 当前激活的角色ID
- `aiRoleMaster.autoApplyRole`: 自动应用角色到AI对话（默认：true）
- `aiRoleMaster.marketUrl`: 角色市场URL
- `aiRoleMaster.groupChatMode`: 启用群聊模式
- `aiRoleMaster.groupChatRoles`: 群聊中的角色ID列表

## 开发和贡献

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/ai-role-master.git
cd ai-role-master

# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包
npm run package
```

### 发布到VS Code市场

```bash
# 安装 vsce
npm install -g @vscode/vsce

# 打包
vsce package

# 发布
vsce publish
```

### 创建角色市场

你可以创建自己的角色市场仓库：

1. 创建一个GitHub仓库
2. 创建 `roles.json` 文件，格式如下：

```json
[
  {
    "id": "your-role-id",
    "name": "role-name",
    "displayName": "显示名称",
    "description": "角色描述",
    "category": "development",
    "systemPrompt": "系统提示词...",
    "expertise": ["技能1", "技能2"],
    "tags": ["标签1", "标签2"],
    "author": "作者名",
    "version": "1.0.0",
    "createdAt": "2024-01-01",
    "updatedAt": "2024-01-01",
    "downloads": 0,
    "rating": 0,
    "isCustom": false,
    "downloadUrl": "https://...",
    "license": "MIT"
  }
]
```

3. 在设置中配置 `aiRoleMaster.marketUrl` 为你的仓库URL

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 分享角色

如果创建了优秀的角色，欢迎分享：

1. 导出角色为JSON文件
2. 在Issues中提交角色
3. 审核通过后将加入官方市场

## 角色设计指南

### 系统提示词示例

```
你是一位资深的[角色名称]，拥有[X]年的[领域]经验。

你的专业领域包括：
- 专业技能1
- 专业技能2
- 专业技能3

请以专业、客观的态度提供：
1. 清晰的代码示例和最佳实践
2. 详细的解释和原理说明
3. 性能和安全性考虑
4. 常见问题的解决方案
5. 相关技术趋势和建议
```

### 设计原则

1. **具体化**：明确角色的专业领域和技能范围
2. **结构化**：使用列表清晰组织角色能力
3. **指导性**：说明角色应该如何回答问题
4. **专业性**：保持专业但清晰的语气
5. **实用性**：强调提供可执行的建议

## 已知问题

- 角色评分和评论系统暂未实现
- 市场角色下载依赖网络连接

## 更新日志

### 1.0.0

- 首次发布
- 支持角色创建、导入、导出
- 6个预设专业角色
- 角色市场系统
- 侧边栏视图和分组显示
- 一键切换角色
- 多角色群聊模式
- 自动注入功能

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- Issues: [GitHub Issues](https://github.com/your-username/ai-role-master/issues)
- Email: your-email@example.com

## 鸣谢

感谢所有贡献者和社区成员。

---

**专业的AI对话体验。**
