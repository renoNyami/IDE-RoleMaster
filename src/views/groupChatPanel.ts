     import * as vscode from 'vscode';
import { Role, RoleCategory } from '../types/role';
import { AutoInjector } from '../services/autoInjector';

/**
 * 群聊启动面板 - WebView 可视化界面
 */
export class GroupChatPanel {
  public static currentPanel: GroupChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri,
    private roles: Role[]
  ) {
    this._panel = panel;
    this._panel.webview.html = this._getHtmlContent();

    // 监听消息
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'getRoles':
            this._panel.webview.postMessage({
              type: 'rolesData',
              roles: this.roles
            });
            break;
          case 'startGroupChat':
            this._handleStartGroupChat(message.selectedRoleIds);
            break;
        }
      },
      null,
      this._disposables
    );

    // 面板关闭时清理
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * 创建或显示面板
   */
  public static show(extensionUri: vscode.Uri, roles: Role[]) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果已存在，直接显示
    if (GroupChatPanel.currentPanel) {
      GroupChatPanel.currentPanel._panel.reveal(column);
      GroupChatPanel.currentPanel.roles = roles;
      GroupChatPanel.currentPanel._panel.webview.html = GroupChatPanel.currentPanel._getHtmlContent();
      return GroupChatPanel.currentPanel;
    }

    // 创建新面板
    const panel = vscode.window.createWebviewPanel(
      'groupChatPanel',
      '🏢 启动一人公司群聊',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    GroupChatPanel.currentPanel = new GroupChatPanel(panel, extensionUri, roles);
    return GroupChatPanel.currentPanel;
  }

  /**
   * 处理启动群聊
   */
  private async _handleStartGroupChat(selectedRoleIds: string[]) {
    const selectedRoles = this.roles.filter(r => selectedRoleIds.includes(r.id));
    
    if (selectedRoles.length === 0) {
      vscode.window.showWarningMessage('请至少选择一个角色');
      return;
    }

    // 生成群聊提示词
    const prompt = this._generateGroupChatPrompt(selectedRoles);
    
    // 保存配置
    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'groupChatMode',
      true,
      vscode.ConfigurationTarget.Global
    );

    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'groupChatRoles',
      selectedRoleIds,
      vscode.ConfigurationTarget.Global
    );

    // 使用自动注入服务
    await AutoInjector.createQuickStartButton(prompt, selectedRoles);

    // 关闭面板（可选）
    // this._panel.dispose();
  }

  /**
   * 生成群聊提示词
   */
  private _generateGroupChatPrompt(roles: Role[]): string {
    let prompt = `# 🏢 一人公司群聊模式\n\n`;
    prompt += `你现在要模拟一个专业团队的讨论场景。在这个场景中，你需要扮演多个不同的专业角色，每个角色都有自己的专业视角和职责。\n\n`;
    prompt += `## 参与角色（仅限以下 ${roles.length} 个）\n\n`;

    roles.forEach((role, index) => {
      prompt += `### ${index + 1}. ${role.displayName}\n\n`;
      prompt += `**职责**：${role.description}\n\n`;
      prompt += `**核心能力**：\n${role.systemPrompt}\n\n`;
      
      if (role.scenario) {
        prompt += `**工作场景**：\n${role.scenario}\n\n`;
      }

      if (role.characterNote) {
        prompt += `**工作原则**：\n${role.characterNote}\n\n`;
      }

      prompt += `**专业领域**：${role.expertise.join('、')}\n\n`;
      prompt += `---\n\n`;
    });

    prompt += `## 讨论规则\n\n`;
    prompt += `1. **仅扮演上述 ${roles.length} 个角色**：不要自行添加其他角色\n`;
    prompt += `2. **专业视角**：每个角色从自己的专业角度提供意见\n`;
    prompt += `3. **客观分析**：基于事实和数据，而非过度积极或夸赞\n`;
    prompt += `4. **真实反馈**：指出风险、不足和潜在问题，不要只说好话\n`;
    prompt += `5. **观点冲突**：不同角色可能有不同甚至冲突的观点，这是正常的\n`;
    prompt += `6. **格式要求**：回答时请用 **[角色名]:** 作为前缀\n\n`;
    
    prompt += `## 示例\n\n`;
    prompt += `问题：我们应该重构现有代码还是新开发一个功能？\n\n`;
    
    const exampleRoles = roles.slice(0, Math.min(3, roles.length));
    exampleRoles.forEach(role => {
      prompt += `**[${role.displayName}]:** 从 ${role.displayName} 的视角，我认为...（基于事实分析，指出优缺点）\n\n`;
    });
    
    prompt += `---\n\n`;
    prompt += `现在，团队已就位，请开始提出你的问题或需求！\n`;

    return prompt;
  }

  /**
   * 生成 HTML 内容
   */
  private _getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>启动群聊</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: var(--vscode-foreground);
    }

    .subtitle {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 30px;
      font-size: 14px;
    }

    .search-box {
      width: 100%;
      padding: 10px 15px;
      margin-bottom: 20px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 14px;
    }

    .search-box:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 15px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      border-radius: 4px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: var(--vscode-textLink-foreground);
    }

    .warning {
      display: none;
      padding: 10px 15px;
      margin-bottom: 20px;
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: 4px;
      color: var(--vscode-inputValidation-warningForeground);
      font-size: 13px;
    }

    .warning.show {
      display: block;
    }

    .categories {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .category {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .category-header {
      padding: 12px 15px;
      background: var(--vscode-sideBarSectionHeader-background);
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 15px;
      padding: 15px;
    }

    .role-card {
      background: var(--vscode-editor-background);
      border: 2px solid transparent;
      border-radius: 6px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .role-card:hover {
      border-color: var(--vscode-focusBorder);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .role-card.selected {
      border-color: var(--vscode-textLink-foreground);
      background: var(--vscode-list-activeSelectionBackground);
    }

    .role-card.hidden {
      display: none;
    }

    .role-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }

    .role-icon {
      width: 40px;
      height: 40px;
      background: var(--vscode-button-background);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .role-info {
      flex: 1;
    }

    .role-name {
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 4px;
      color: var(--vscode-foreground);
    }

    .role-desc {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .role-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .tag {
      padding: 2px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 3px;
      font-size: 11px;
    }

    .role-meta {
      display: flex;
      gap: 12px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--vscode-panel-border);
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .checkbox {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 20px;
      height: 20px;
      border: 2px solid var(--vscode-input-border);
      border-radius: 4px;
      background: var(--vscode-input-background);
    }

    .role-card.selected .checkbox {
      background: var(--vscode-textLink-foreground);
      border-color: var(--vscode-textLink-foreground);
    }

    .role-card.selected .checkbox::after {
      content: '✓';
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }

    .actions {
      position: sticky;
      bottom: 0;
      padding: 20px;
      background: var(--vscode-editor-background);
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin: 20px -20px -20px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    button:hover {
      opacity: 0.9;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state h3 {
      margin-bottom: 10px;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏢 启动一人公司群聊</h1>
    <p class="subtitle">选择3-6个角色参与讨论，获得多角度的专业建议</p>

    <input 
      type="text" 
      class="search-box" 
      id="searchBox" 
      placeholder="搜索角色名称、描述、专业领域..."
    />

    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">可选角色</span>
        <span class="stat-value" id="totalRoles">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已选择</span>
        <span class="stat-value" id="selectedCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">建议数量</span>
        <span class="stat-value">3-6</span>
      </div>
    </div>

    <div class="warning" id="warning">
      建议选择3-6个角色。选择过多可能导致对话混乱，选择过少则无法体现多角度讨论的优势。
    </div>

    <div class="categories" id="categories"></div>

    <div class="actions">
      <button class="btn-secondary" onclick="clearSelection()">清除选择</button>
      <button class="btn-primary" id="startBtn" disabled onclick="startGroupChat()">
        启动群聊
      </button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let allRoles = [];
    let selectedRoles = new Set();

    // 请求角色数据
    vscode.postMessage({ type: 'getRoles' });

    // 接收消息
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'rolesData') {
        allRoles = message.roles;
        renderRoles(allRoles);
        updateStats();
      }
    });

    // 渲染角色列表
    function renderRoles(roles) {
      const categoriesEl = document.getElementById('categories');
      const categoryMap = {};

      // 分组
      roles.forEach(role => {
        if (!categoryMap[role.category]) {
          categoryMap[role.category] = [];
        }
        categoryMap[role.category].push(role);
      });

      // 分类标签
      const categoryLabels = {
        'development': '开发工程',
        'design': '设计创意',
        'product': '产品管理',
        'testing': '质量测试',
        'devops': '运维部署',
        'data': '数据分析',
        'security': '安全审计',
        'management': '项目管理',
        'custom': '自定义'
      };

      categoriesEl.innerHTML = '';
      
      Object.entries(categoryMap).forEach(([category, rolesInCategory]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        
        categoryDiv.innerHTML = \`
          <div class="category-header">
            \${categoryLabels[category] || category}
            <span style="margin-left: auto; font-size: 12px; opacity: 0.7;">
              \${rolesInCategory.length} 个角色
            </span>
          </div>
          <div class="role-grid" data-category="\${category}"></div>
        \`;
        
        categoriesEl.appendChild(categoryDiv);
        
        const gridEl = categoryDiv.querySelector('.role-grid');
        rolesInCategory.forEach(role => {
          gridEl.appendChild(createRoleCard(role));
        });
      });

      document.getElementById('totalRoles').textContent = roles.length;
    }

    // 创建角色卡片
    function createRoleCard(role) {
      const card = document.createElement('div');
      card.className = 'role-card';
      card.dataset.roleId = role.id;
      
      const tags = role.expertise.slice(0, 3).map(tag => 
        \`<span class="tag">\${tag}</span>\`
      ).join('');

      const downloads = role.downloads ? \`下载 \${formatNumber(role.downloads)}\` : '';
      const rating = role.rating ? \`评分 \${role.rating.toFixed(1)}\` : '';
      
      card.innerHTML = \`
        <div class="checkbox"></div>
        <div class="role-header">
          <div class="role-icon">\${getRoleIcon(role.category)}</div>
          <div class="role-info">
            <div class="role-name">\${role.displayName}</div>
            <div class="role-desc">\${role.description}</div>
          </div>
        </div>
        <div class="role-tags">\${tags}</div>
        <div class="role-meta">
          \${downloads}
          \${rating}
          <span style="margin-left: auto">\${role.version}</span>
        </div>
      \`;

      card.onclick = () => toggleRole(role.id);
      return card;
    }

    // 切换角色选择
    function toggleRole(roleId) {
      const card = document.querySelector(\`[data-role-id="\${roleId}"]\`);
      
      if (selectedRoles.has(roleId)) {
        selectedRoles.delete(roleId);
        card.classList.remove('selected');
      } else {
        selectedRoles.add(roleId);
        card.classList.add('selected');
      }

      updateStats();
    }

    // 更新统计
    function updateStats() {
      const count = selectedRoles.size;
      document.getElementById('selectedCount').textContent = count;
      document.getElementById('startBtn').disabled = count === 0;
      
      const warning = document.getElementById('warning');
      if (count > 6 || (count > 0 && count < 3)) {
        warning.classList.add('show');
      } else {
        warning.classList.remove('show');
      }
    }

    // 清除选择
    function clearSelection() {
      selectedRoles.clear();
      document.querySelectorAll('.role-card.selected').forEach(card => {
        card.classList.remove('selected');
      });
      updateStats();
    }

    // 启动群聊
    function startGroupChat() {
      if (selectedRoles.size === 0) return;
      
      vscode.postMessage({
        type: 'startGroupChat',
        selectedRoleIds: Array.from(selectedRoles)
      });
    }

    // 搜索功能
    document.getElementById('searchBox').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      
      document.querySelectorAll('.role-card').forEach(card => {
        const roleId = card.dataset.roleId;
        const role = allRoles.find(r => r.id === roleId);
        
        if (!role) return;
        
        const searchable = [
          role.displayName,
          role.description,
          role.name,
          ...role.expertise,
          ...role.tags
        ].join(' ').toLowerCase();
        
        if (searchable.includes(query)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });

    // 工具函数
    function getRoleIcon(category) {
      const icons = {
        'development': 'DEV',
        'design': 'DES',
        'product': 'PM',
        'testing': 'QA',
        'devops': 'OPS',
        'data': 'DATA',
        'security': 'SEC',
        'management': 'MGR',
        'custom': 'CUST'
      };
      return icons[category] || 'ROLE';
    }

    function formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    }
  </script>
</body>
</html>`;
  }

  public dispose() {
    GroupChatPanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
