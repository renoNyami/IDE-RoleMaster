import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Role, UserConfig, RoleExport } from '../types/role';

/**
 * 角色存储管理器
 */
export class RoleStorage {
  private context: vscode.ExtensionContext;
  private readonly STORAGE_KEY = 'aiRoleMaster.userConfig';
  private readonly ROLES_FILE = 'roles.json';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 获取用户配置
   */
  async getUserConfig(): Promise<UserConfig> {
    const config = this.context.globalState.get<UserConfig>(this.STORAGE_KEY);
    if (!config) {
      return {
        currentRoleId: '',
        autoApplyRole: true,
        customRoles: [],
        favoriteRoles: [],
        installedMarketRoles: []
      };
    }
    return config;
  }

  /**
   * 保存用户配置
   */
  async saveUserConfig(config: UserConfig): Promise<void> {
    await this.context.globalState.update(this.STORAGE_KEY, config);
  }

  /**
   * 获取所有角色
   */
  async getAllRoles(): Promise<Role[]> {
    const config = await this.getUserConfig();
    return config.customRoles;
  }

  /**
   * 获取角色通过ID
   */
  async getRoleById(id: string): Promise<Role | undefined> {
    const roles = await this.getAllRoles();
    return roles.find(r => r.id === id);
  }

  /**
   * 保存角色
   */
  async saveRole(role: Role): Promise<void> {
    const config = await this.getUserConfig();
    const existingIndex = config.customRoles.findIndex(r => r.id === role.id);
    
    if (existingIndex >= 0) {
      config.customRoles[existingIndex] = role;
    } else {
      config.customRoles.push(role);
    }
    
    await this.saveUserConfig(config);
  }

  /**
   * 删除角色
   */
  async deleteRole(id: string): Promise<void> {
    const config = await this.getUserConfig();
    config.customRoles = config.customRoles.filter(r => r.id !== id);
    
    if (config.currentRoleId === id) {
      config.currentRoleId = '';
    }
    
    await this.saveUserConfig(config);
  }

  /**
   * 设置当前角色
   */
  async setCurrentRole(id: string): Promise<void> {
    const config = await this.getUserConfig();
    config.currentRoleId = id;
    await this.saveUserConfig(config);
    
    // 更新VS Code配置
    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'currentRole',
      id,
      vscode.ConfigurationTarget.Global
    );
    
    // 注入到 Qoder Rules
    await this.injectRoleToQoder(id);
  }

  /**
   * 将角色注入到 Qoder Rules
   */
  private async injectRoleToQoder(roleId: string): Promise<void> {
    const role = await this.getRoleById(roleId);
    if (!role) {
      // 如果没有角色，清除现有规则
      await this.clearQoderRule();
      return;
    }

    // 获取工作区根目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('请先打开一个工作区以使用 Qoder 角色注入功能');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const qoderRulesDir = path.join(workspaceRoot, '.qoder', 'rules');
    const ruleFilePath = path.join(qoderRulesDir, 'ai-role-master.md');

    try {
      // 创建 .qoder/rules 目录
      if (!fs.existsSync(qoderRulesDir)) {
        fs.mkdirSync(qoderRulesDir, { recursive: true });
      }

      // 生成规则文件内容
      const ruleContent = this.generateQoderRule(role);

      // 写入规则文件
      fs.writeFileSync(ruleFilePath, ruleContent, 'utf-8');

      vscode.window.showInformationMessage(
        `角色 "${role.displayName}" 已注入到 Qoder Rules！

提示：
- 新对话将自动应用此角色
- 当前对话：在输入框输入 @rule ai-role-master 手动触发`,
        '了解'
      );
    } catch (error) {
      console.error('注入 Qoder Rules 失败:', error);
      vscode.window.showErrorMessage(`注入 Qoder Rules 失败: ${error}`);
    }
  }

  /**
   * 生成 Qoder Rule 内容（参考 SillyTavern 多层次人格系统）
   */
  private generateQoderRule(role: Role): string {
    let ruleContent = `# AI Role: ${role.displayName}

**Rule Type**: Always Apply  
**Created by**: AI Role Master Extension  
**Updated**: ${new Date().toLocaleString()}

---

## 角色定义

${role.systemPrompt}
`;

    // 添加人格特征（如果有）
    if (role.personality) {
      ruleContent += `
---

## 人格特征

${role.personality}
`;
    }

    // 添加工作场景（如果有）
    if (role.scenario) {
      ruleContent += `
---

## 工作场景

${role.scenario}
`;
    }

    // 添加专业领域
    ruleContent += `
---

## 专业领域

${role.expertise.map(e => `- ${e}`).join('\n')}
`;

    // 添加对话示例（如果有）
    if (role.exampleDialogues && role.exampleDialogues.length > 0) {
      ruleContent += `
---

## 对话风格示例

`;
      ruleContent += `以下是期望的对话风格和深度：\n\n`;
      
      role.exampleDialogues.forEach((example, index) => {
        ruleContent += `**示例 ${index + 1}**\n\n`;
        ruleContent += `用户: ${example.user}\n\n`;
        ruleContent += `助手: ${example.assistant}\n\n`;
      });
    }

    // 添加重要提示（如果有）
    if (role.characterNote) {
      ruleContent += `
---

## 重要提示

${role.characterNote}
`;
    }

    // 添加脚注
    ruleContent += `
---

## 角色信息

`;
    ruleContent += `**名称**: ${role.displayName}\n`;
    ruleContent += `**类别**: ${role.category}\n`;
    ruleContent += `**描述**: ${role.description}\n`;
    
    if (role.creatorNotes) {
      ruleContent += `\n**使用说明**: ${role.creatorNotes}\n`;
    }

    ruleContent += `\n> 此规则由 AI Role Master 插件自动生成并管理。\n`;
    ruleContent += `> 当你与 AI 对话时，AI 将自动扮演 "${role.displayName}" 这个角色。\n`;

    return ruleContent;
  }

  /**
   * 清除 Qoder Rule
   */
  private async clearQoderRule(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const ruleFilePath = path.join(workspaceRoot, '.qoder', 'rules', 'ai-role-master.md');

    try {
      if (fs.existsSync(ruleFilePath)) {
        fs.unlinkSync(ruleFilePath);
        vscode.window.showInformationMessage('已清除 Qoder 角色规则');
      }
    } catch (error) {
      console.error('清除 Qoder Rules 失败:', error);
    }
  }

  /**
   * 获取当前角色
   */
  async getCurrentRole(): Promise<Role | undefined> {
    const config = await this.getUserConfig();
    if (!config.currentRoleId) {
      return undefined;
    }
    return this.getRoleById(config.currentRoleId);
  }

  /**
   * 导出角色
   */
  async exportRoles(roleIds: string[]): Promise<RoleExport> {
    const roles = await this.getAllRoles();
    const exportRoles = roles.filter(r => roleIds.includes(r.id));
    
    return {
      version: '1.0',
      roles: exportRoles,
      exportedAt: new Date().toISOString(),
      exportedBy: 'AI Role Master'
    };
  }

  /**
   * 导入角色
   */
  async importRoles(roleExport: RoleExport): Promise<number> {
    let importCount = 0;
    
    for (const role of roleExport.roles) {
      // 生成新的ID以避免冲突
      const newRole = {
        ...role,
        id: this.generateId(),
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.saveRole(newRole);
      importCount++;
    }
    
    return importCount;
  }

  /**
   * 生成唯一ID
   */
  generateId(): string {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加到收藏
   */
  async addToFavorites(roleId: string): Promise<void> {
    const config = await this.getUserConfig();
    if (!config.favoriteRoles.includes(roleId)) {
      config.favoriteRoles.push(roleId);
      await this.saveUserConfig(config);
    }
  }

  /**
   * 从收藏移除
   */
  async removeFromFavorites(roleId: string): Promise<void> {
    const config = await this.getUserConfig();
    config.favoriteRoles = config.favoriteRoles.filter(id => id !== roleId);
    await this.saveUserConfig(config);
  }

  /**
   * 检查是否收藏
   */
  async isFavorite(roleId: string): Promise<boolean> {
    const config = await this.getUserConfig();
    return config.favoriteRoles.includes(roleId);
  }
}
