import * as vscode from 'vscode';
import { Role, RoleExport } from '../types/role';
import { RoleStorage } from './roleStorage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 角色管理器
 */
export class RoleManager {
  private storage: RoleStorage;

  constructor(context: vscode.ExtensionContext) {
    this.storage = new RoleStorage(context);
  }

  /**
   * 创建新角色
   */
  async createRole(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: '输入角色名称',
      placeHolder: '例如: 前端工程师'
    });

    if (!name) {
      return;
    }

    const displayName = await vscode.window.showInputBox({
      prompt: '输入角色显示名称',
      placeHolder: '例如: React 前端专家',
      value: name
    });

    if (!displayName) {
      return;
    }

    const description = await vscode.window.showInputBox({
      prompt: '输入角色描述',
      placeHolder: '例如: 精通React、TypeScript和现代前端开发'
    });

    const categoryItems = [
      { label: '开发', value: 'development' },
      { label: '设计', value: 'design' },
      { label: '产品', value: 'product' },
      { label: '测试', value: 'testing' },
      { label: 'DevOps', value: 'devops' },
      { label: '数据', value: 'data' },
      { label: '安全', value: 'security' },
      { label: '管理', value: 'management' },
      { label: '自定义', value: 'custom' }
    ];

    const categoryPick = await vscode.window.showQuickPick(categoryItems, {
      placeHolder: '选择角色分类'
    });

    if (!categoryPick) {
      return;
    }

    const systemPrompt = await vscode.window.showInputBox({
      prompt: '输入系统提示词（这是AI的核心人格设定）',
      placeHolder: '例如: 你是一位资深的React前端工程师，精通现代前端开发...',
      value: `你是一位专业的${displayName}。你具有丰富的实践经验和深厚的技术功底。请以专业、友好的态度为用户提供高质量的技术建议和解决方案。`
    });

    if (!systemPrompt) {
      return;
    }

    const expertiseInput = await vscode.window.showInputBox({
      prompt: '输入专业技能（用逗号分隔）',
      placeHolder: '例如: React, TypeScript, Webpack, CSS'
    });

    const expertise = expertiseInput ? expertiseInput.split(',').map(s => s.trim()) : [];

    const tagsInput = await vscode.window.showInputBox({
      prompt: '输入标签（用逗号分隔）',
      placeHolder: '例如: 前端, Web开发, JavaScript'
    });

    const tags = tagsInput ? tagsInput.split(',').map(s => s.trim()) : [];

    const newRole: Role = {
      id: this.storage.generateId(),
      name,
      displayName,
      description: description || '',
      category: categoryPick.value as any,
      systemPrompt,
      expertise,
      tags,
      author: 'User',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true
    };

    await this.storage.saveRole(newRole);
    vscode.window.showInformationMessage(`角色 "${displayName}" 创建成功！`);
  }

  /**
   * 导入角色
   */
  async importRole(): Promise<void> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        'JSON文件': ['json']
      },
      openLabel: '导入角色'
    });

    if (!fileUri || fileUri.length === 0) {
      return;
    }

    try {
      const fileContent = fs.readFileSync(fileUri[0].fsPath, 'utf8');
      const roleExport: RoleExport = JSON.parse(fileContent);

      if (!roleExport.version || !roleExport.roles) {
        throw new Error('无效的角色文件格式');
      }

      const count = await this.storage.importRoles(roleExport);
      vscode.window.showInformationMessage(`成功导入 ${count} 个角色！`);
    } catch (error) {
      vscode.window.showErrorMessage(`导入失败: ${error}`);
    }
  }

  /**
   * 导出角色
   */
  async exportRole(): Promise<void> {
    const roles = await this.storage.getAllRoles();

    if (roles.length === 0) {
      vscode.window.showWarningMessage('没有可导出的角色');
      return;
    }

    const roleItems = roles.map(r => ({
      label: r.displayName,
      description: r.description,
      picked: false,
      role: r
    }));

    const selected = await vscode.window.showQuickPick(roleItems, {
      canPickMany: true,
      placeHolder: '选择要导出的角色'
    });

    if (!selected || selected.length === 0) {
      return;
    }

    const roleIds = selected.map(s => s.role.id);
    const exportData = await this.storage.exportRoles(roleIds);

    const saveUri = await vscode.window.showSaveDialog({
      filters: {
        'JSON文件': ['json']
      },
      defaultUri: vscode.Uri.file(`roles_export_${Date.now()}.json`)
    });

    if (!saveUri) {
      return;
    }

    try {
      fs.writeFileSync(saveUri.fsPath, JSON.stringify(exportData, null, 2));
      vscode.window.showInformationMessage(`成功导出 ${roleIds.length} 个角色！`);
    } catch (error) {
      vscode.window.showErrorMessage(`导出失败: ${error}`);
    }
  }

  /**
   * 选择角色
   */
  async selectRole(): Promise<void> {
    const roles = await this.storage.getAllRoles();

    if (roles.length === 0) {
      const action = await vscode.window.showInformationMessage(
        '还没有角色，是否创建一个？',
        '创建角色',
        '浏览市场'
      );

      if (action === '创建角色') {
        await this.createRole();
      }
      return;
    }

    const currentRole = await this.storage.getCurrentRole();
    const roleItems = roles.map(r => ({
      label: r.displayName,
      description: r.description,
      detail: `分类: ${r.category} | 技能: ${r.expertise.join(', ')}`,
      picked: currentRole?.id === r.id,
      role: r
    }));

    // 添加"取消角色"选项
    roleItems.unshift({
      label: '$(close) 取消当前角色',
      description: '不使用任何角色',
      detail: '',
      picked: !currentRole,
      role: null as any
    });

    const selected = await vscode.window.showQuickPick(roleItems, {
      placeHolder: '选择一个AI角色'
    });

    if (!selected) {
      return;
    }

    if (selected.role) {
      await this.storage.setCurrentRole(selected.role.id);
      vscode.window.showInformationMessage(`已切换到角色: ${selected.role.displayName}`);
    } else {
      await this.storage.setCurrentRole('');
      vscode.window.showInformationMessage('已取消角色设定');
    }
  }

  /**
   * 管理角色
   */
  async manageRoles(): Promise<void> {
    const roles = await this.storage.getAllRoles();

    if (roles.length === 0) {
      vscode.window.showInformationMessage('还没有角色');
      return;
    }

    const roleItems = roles.map(r => ({
      label: r.displayName,
      description: r.description,
      detail: `作者: ${r.author} | 版本: ${r.version}`,
      role: r
    }));

    const selected = await vscode.window.showQuickPick(roleItems, {
      placeHolder: '选择要管理的角色'
    });

    if (!selected) {
      return;
    }

    const action = await vscode.window.showQuickPick([
      { label: '$(edit) 编辑', value: 'edit' },
      { label: '$(star) 收藏/取消收藏', value: 'favorite' },
      { label: '$(export) 导出', value: 'export' },
      { label: '$(trash) 删除', value: 'delete' }
    ], {
      placeHolder: '选择操作'
    });

    if (!action) {
      return;
    }

    switch (action.value) {
      case 'edit':
        await this.editRole(selected.role);
        break;
      case 'favorite':
        await this.toggleFavorite(selected.role);
        break;
      case 'export':
        await this.exportSingleRole(selected.role);
        break;
      case 'delete':
        await this.deleteRole(selected.role);
        break;
    }
  }

  private async editRole(role: Role): Promise<void> {
    const systemPrompt = await vscode.window.showInputBox({
      prompt: '编辑系统提示词',
      value: role.systemPrompt,
      validateInput: (value) => {
        return value.length < 10 ? '提示词太短' : null;
      }
    });

    if (systemPrompt) {
      role.systemPrompt = systemPrompt;
      role.updatedAt = new Date().toISOString();
      await this.storage.saveRole(role);
      vscode.window.showInformationMessage('角色已更新');
    }
  }

  private async toggleFavorite(role: Role): Promise<void> {
    const isFav = await this.storage.isFavorite(role.id);
    if (isFav) {
      await this.storage.removeFromFavorites(role.id);
      vscode.window.showInformationMessage('已取消收藏');
    } else {
      await this.storage.addToFavorites(role.id);
      vscode.window.showInformationMessage('已添加到收藏');
    }
  }

  private async exportSingleRole(role: Role): Promise<void> {
    const exportData = await this.storage.exportRoles([role.id]);
    const saveUri = await vscode.window.showSaveDialog({
      filters: { 'JSON文件': ['json'] },
      defaultUri: vscode.Uri.file(`${role.name}_${Date.now()}.json`)
    });

    if (saveUri) {
      fs.writeFileSync(saveUri.fsPath, JSON.stringify(exportData, null, 2));
      vscode.window.showInformationMessage('导出成功！');
    }
  }

  private async deleteRole(role: Role): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `确定要删除角色 "${role.displayName}" 吗？`,
      { modal: true },
      '删除'
    );

    if (confirm === '删除') {
      await this.storage.deleteRole(role.id);
      vscode.window.showInformationMessage('角色已删除');
    }
  }

  /**
   * 获取当前角色的系统提示
   */
  async getCurrentRolePrompt(): Promise<string | undefined> {
    const role = await this.storage.getCurrentRole();
    return role?.systemPrompt;
  }
}
