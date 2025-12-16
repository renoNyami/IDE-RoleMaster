import * as vscode from 'vscode';
import { Role, RoleCategory } from '../types/role';
import { RoleStorage } from '../services/roleStorage';

/**
 * 创建角色面板 - Webview可视化界面
 */
export class CreateRolePanel {
  public static currentPanel: CreateRolePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private roleStorage: RoleStorage;
  private editingRole?: Role;

  public static createOrShow(extensionUri: vscode.Uri, roleStorage: RoleStorage, editRole?: Role) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (CreateRolePanel.currentPanel) {
      CreateRolePanel.currentPanel._panel.reveal(column);
      if (editRole) {
        CreateRolePanel.currentPanel.setEditMode(editRole);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'createRole',
      editRole ? '编辑角色' : '创建角色',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    CreateRolePanel.currentPanel = new CreateRolePanel(panel, extensionUri, roleStorage, editRole);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, roleStorage: RoleStorage, editRole?: Role) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this.roleStorage = roleStorage;
    this.editingRole = editRole;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.type) {
          case 'create':
            await this._handleCreate(message.roleData);
            break;
          case 'update':
            await this._handleUpdate(message.roleData);
            break;
          case 'cancel':
            this._panel.dispose();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private setEditMode(role: Role) {
    this.editingRole = role;
    this._panel.title = '编辑角色';
    this._update();
  }

  private async _handleCreate(roleData: any) {
    try {
      const role: Role = {
        id: this.roleStorage.generateId(),
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        systemPrompt: roleData.systemPrompt,
        category: roleData.category,
        expertise: roleData.expertise.split(',').map((s: string) => s.trim()).filter((s: string) => s),
        tags: roleData.tags.split(',').map((s: string) => s.trim()).filter((s: string) => s),
        scenario: roleData.scenario || '',
        personality: roleData.personality || '',
        characterNote: roleData.characterNote || '',
        exampleDialogues: [],
        author: 'Custom',
        version: '1.0.0',
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.roleStorage.saveRole(role);
      vscode.window.showInformationMessage(`角色 "${role.displayName}" 创建成功！`);
      this._panel.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(`创建角色失败: ${error}`);
    }
  }

  private async _handleUpdate(roleData: any) {
    if (!this.editingRole) {
      return;
    }

    try {
      const updatedRole: Role = {
        ...this.editingRole,
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        systemPrompt: roleData.systemPrompt,
        category: roleData.category,
        expertise: roleData.expertise.split(',').map((s: string) => s.trim()).filter((s: string) => s),
        tags: roleData.tags.split(',').map((s: string) => s.trim()).filter((s: string) => s),
        scenario: roleData.scenario || '',
        personality: roleData.personality || '',
        characterNote: roleData.characterNote || '',
        updatedAt: new Date().toISOString()
      };

      await this.roleStorage.saveRole(updatedRole);
      vscode.window.showInformationMessage(`角色 "${updatedRole.displayName}" 更新成功！`);
      this._panel.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(`更新角色失败: ${error}`);
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = this.editingRole ? '编辑角色' : '创建角色';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const editMode = !!this.editingRole;
    const roleData: Partial<Role> = this.editingRole || {};

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${editMode ? '编辑角色' : '创建角色'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 24px;
      color: var(--vscode-foreground);
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .required {
      color: var(--vscode-errorForeground);
      margin-left: 4px;
    }

    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }

    input, textarea, select {
      width: 100%;
      padding: 8px 12px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    textarea {
      min-height: 100px;
      resize: vertical;
      font-family: var(--vscode-editor-font-family);
    }

    textarea.large {
      min-height: 200px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    button {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin: 32px 0 16px 0;
      color: var(--vscode-foreground);
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .category-option {
      padding: 12px;
      border: 2px solid var(--vscode-input-border);
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }

    .category-option:hover {
      border-color: var(--vscode-focusBorder);
    }

    .category-option.selected {
      border-color: var(--vscode-button-background);
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .category-option input[type="radio"] {
      display: none;
    }

    .category-name {
      font-weight: 500;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <h1>${editMode ? '编辑角色' : '创建新角色'}</h1>

  <form id="roleForm">
    <div class="section-title">基本信息</div>

    <div class="form-row">
      <div class="form-group">
        <label>
          角色ID<span class="required">*</span>
        </label>
        <input type="text" id="name" value="${roleData.name || ''}" placeholder="role-frontend-expert" required>
        <div class="hint">用于系统识别的唯一标识，建议使用小写字母和连字符</div>
      </div>

      <div class="form-group">
        <label>
          显示名称<span class="required">*</span>
        </label>
        <input type="text" id="displayName" value="${roleData.displayName || ''}" placeholder="前端工程师" required>
        <div class="hint">展示给用户的名称</div>
      </div>
    </div>

    <div class="form-group">
      <label>
        简短描述<span class="required">*</span>
      </label>
      <input type="text" id="description" value="${roleData.description || ''}" placeholder="专注于前端开发与用户体验优化" required>
      <div class="hint">一句话概括角色定位</div>
    </div>

    <div class="form-group">
      <label>
        角色分类<span class="required">*</span>
      </label>
      <div class="category-grid">
        <div class="category-option ${roleData.category === 'development' ? 'selected' : ''}" onclick="selectCategory('development')">
          <input type="radio" name="category" value="development" ${roleData.category === 'development' ? 'checked' : ''}>
          <div class="category-name">开发工程</div>
        </div>
        <div class="category-option ${roleData.category === 'design' ? 'selected' : ''}" onclick="selectCategory('design')">
          <input type="radio" name="category" value="design" ${roleData.category === 'design' ? 'checked' : ''}>
          <div class="category-name">设计创意</div>
        </div>
        <div class="category-option ${roleData.category === 'product' ? 'selected' : ''}" onclick="selectCategory('product')">
          <input type="radio" name="category" value="product" ${roleData.category === 'product' ? 'checked' : ''}>
          <div class="category-name">产品管理</div>
        </div>
        <div class="category-option ${roleData.category === 'testing' ? 'selected' : ''}" onclick="selectCategory('testing')">
          <input type="radio" name="category" value="testing" ${roleData.category === 'testing' ? 'checked' : ''}>
          <div class="category-name">质量测试</div>
        </div>
        <div class="category-option ${roleData.category === 'devops' ? 'selected' : ''}" onclick="selectCategory('devops')">
          <input type="radio" name="category" value="devops" ${roleData.category === 'devops' ? 'checked' : ''}>
          <div class="category-name">运维部署</div>
        </div>
        <div class="category-option ${roleData.category === 'custom' ? 'selected' : ''}" onclick="selectCategory('custom')">
          <input type="radio" name="category" value="custom" ${roleData.category === 'custom' || !roleData.category ? 'checked' : ''}>
          <div class="category-name">自定义</div>
        </div>
      </div>
    </div>

    <div class="section-title">核心提示词</div>

    <div class="form-group">
      <label>
        系统提示词<span class="required">*</span>
      </label>
      <textarea id="systemPrompt" class="large" required placeholder="你是一位资深前端工程师，专注于现代Web开发。你需要：&#10;1. 提供清晰、可维护的代码&#10;2. 关注性能和用户体验&#10;3. 遵循最佳实践和设计模式&#10;4. 给出实用的技术建议">${roleData.systemPrompt || ''}</textarea>
      <div class="hint">定义AI扮演此角色时的核心行为和职责</div>
    </div>

    <div class="section-title">专业领域</div>

    <div class="form-group">
      <label>
        专业技能<span class="required">*</span>
      </label>
      <input type="text" id="expertise" value="${(roleData.expertise || []).join(', ')}" placeholder="React, TypeScript, Webpack, 性能优化" required>
      <div class="hint">用逗号分隔多个技能</div>
    </div>

    <div class="form-group">
      <label>
        标签
      </label>
      <input type="text" id="tags" value="${(roleData.tags || []).join(', ')}" placeholder="前端, 全栈, UI">
      <div class="hint">用逗号分隔多个标签，用于搜索和分类</div>
    </div>

    <div class="section-title">可选信息</div>

    <div class="form-group">
      <label>
        工作场景
      </label>
      <textarea id="scenario" placeholder="在实际项目中，你经常需要与产品经理、设计师协作，平衡技术实现与产品需求...">${roleData.scenario || ''}</textarea>
      <div class="hint">描述角色的典型工作场景和协作方式</div>
    </div>

    <div class="form-group">
      <label>
        性格特征
      </label>
      <textarea id="personality" placeholder="专业、严谨、注重细节，善于沟通和解决问题...">${roleData.personality || ''}</textarea>
      <div class="hint">定义角色的沟通风格和性格特点</div>
    </div>

    <div class="form-group">
      <label>
        重要提示
      </label>
      <textarea id="characterNote" placeholder="回答时请：提供代码示例、解释设计思路、指出潜在问题...">${roleData.characterNote || ''}</textarea>
      <div class="hint">给AI的特别提醒，确保按预期行为</div>
    </div>

    <div class="actions">
      <button type="submit" class="btn-primary">${editMode ? '保存修改' : '创建角色'}</button>
      <button type="button" class="btn-secondary" onclick="cancel()">取消</button>
    </div>
  </form>

  <script>
    const vscode = acquireVsCodeApi();

    function selectCategory(category) {
      document.querySelectorAll('.category-option').forEach(el => {
        el.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
      document.querySelector(\`input[value="\${category}"]\`).checked = true;
    }

    function cancel() {
      vscode.postMessage({ type: 'cancel' });
    }

    document.getElementById('roleForm').addEventListener('submit', (e) => {
      e.preventDefault();

      const roleData = {
        name: document.getElementById('name').value.trim(),
        displayName: document.getElementById('displayName').value.trim(),
        description: document.getElementById('description').value.trim(),
        systemPrompt: document.getElementById('systemPrompt').value.trim(),
        category: document.querySelector('input[name="category"]:checked').value,
        expertise: document.getElementById('expertise').value.trim(),
        tags: document.getElementById('tags').value.trim(),
        scenario: document.getElementById('scenario').value.trim(),
        personality: document.getElementById('personality').value.trim(),
        characterNote: document.getElementById('characterNote').value.trim()
      };

      vscode.postMessage({
        type: ${editMode ? "'update'" : "'create'"},
        roleData: roleData
      });
    });
  </script>
</body>
</html>`;
  }

  public dispose() {
    CreateRolePanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
