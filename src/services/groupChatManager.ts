import * as vscode from 'vscode';
import { Role } from '../types/role';
import { RoleStorage } from './roleStorage';

/**
 * 群聊管理器 - 实现"一人公司"多角色协同
 */
export class GroupChatManager {
  private context: vscode.ExtensionContext;
  private roleStorage: RoleStorage;

  constructor(context: vscode.ExtensionContext, roleStorage: RoleStorage) {
    this.context = context;
    this.roleStorage = roleStorage;
  }

  /**
   * 启动群聊模式
   */
  async startGroupChat(): Promise<void> {
    const allRoles = await this.roleStorage.getAllRoles();
    
    if (allRoles.length === 0) {
      vscode.window.showWarningMessage('暂无可用角色，请先安装或创建角色。');
      return;
    }

    // 让用户选择参与群聊的角色
    const roleItems = allRoles.map(role => ({
      label: role.displayName,
      description: role.description,
      role: role,
      picked: false
    }));

    const selected = await vscode.window.showQuickPick(roleItems, {
      canPickMany: true,
      placeHolder: '选择参与群聊的角色（可多选）'
    });

    if (!selected || selected.length === 0) {
      return;
    }

    const selectedRoles = selected.map(item => item.role);
    
    // 保存群聊配置
    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'groupChatMode',
      true,
      vscode.ConfigurationTarget.Global
    );

    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'groupChatRoles',
      selectedRoles.map(r => r.id),
      vscode.ConfigurationTarget.Global
    );

    // 生成群聊启动提示
    const groupPrompt = this.generateGroupChatPrompt(selectedRoles);
    await vscode.env.clipboard.writeText(groupPrompt);

    vscode.window.showInformationMessage(
      `一人公司群聊已启动！

参与角色：${selectedRoles.map(r => r.displayName).join('、')}

群聊启动提示已复制到剪贴板，请粘贴到 Qoder 对话框开始使用。`,
      '查看使用说明'
    ).then(action => {
      if (action === '查看使用说明') {
        this.showGroupChatInstructions(selectedRoles);
      }
    });
  }

  /**
   * 添加角色到群聊
   */
  async addRoleToGroup(): Promise<void> {
    const config = vscode.workspace.getConfiguration('aiRoleMaster');
    const groupChatMode = config.get<boolean>('groupChatMode');

    if (!groupChatMode) {
      vscode.window.showWarningMessage('请先启动群聊模式');
      return;
    }

    const currentRoleIds = config.get<string[]>('groupChatRoles') || [];
    const allRoles = await this.roleStorage.getAllRoles();
    const availableRoles = allRoles.filter(r => !currentRoleIds.includes(r.id));

    if (availableRoles.length === 0) {
      vscode.window.showInformationMessage('所有角色都已在群聊中');
      return;
    }

    const roleItems = availableRoles.map(role => ({
      label: role.displayName,
      description: role.description,
      role: role
    }));

    const selected = await vscode.window.showQuickPick(roleItems, {
      placeHolder: '选择要添加的角色'
    });

    if (!selected) {
      return;
    }

    currentRoleIds.push(selected.role.id);
    await config.update('groupChatRoles', currentRoleIds, vscode.ConfigurationTarget.Global);

    // 生成添加角色的提示
    const addRolePrompt = this.generateAddRolePrompt(selected.role);
    await vscode.env.clipboard.writeText(addRolePrompt);

    vscode.window.showInformationMessage(
      `已添加 ${selected.role.displayName} 到群聊\n\n角色介绍已复制，粘贴到对话框即可让新角色加入讨论。`
    );
  }

  /**
   * 生成群聊启动提示
   */
  private generateGroupChatPrompt(roles: Role[]): string {
    let prompt = `# 一人公司群聊模式\n\n`;
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
    
    // 生成动态示例
    prompt += `## 示例\n\n`;
    prompt += `问题：我们应该重构现有代码还是新开发一个功能？\n\n`;
    
    // 使用实际选定的角色生成示例
    const exampleRoles = roles.slice(0, Math.min(3, roles.length));
    exampleRoles.forEach(role => {
      prompt += `**[${role.displayName}]:** 从 ${role.displayName} 的视角，我认为...（基于事实分析，指出优缺点）\n\n`;
    });
    
    prompt += `---\n\n`;
    prompt += `现在，团队已就位，请开始提出你的问题或需求！\n`;

    return prompt;
  }

  /**
   * 生成添加角色提示
   */
  private generateAddRolePrompt(role: Role): string {
    let prompt = `# 新成员加入群聊\n\n`;
    prompt += `请将以下角色加入当前讨论：\n\n`;
    prompt += `## ${role.displayName}\n\n`;
    prompt += `**职责**：${role.description}\n\n`;
    prompt += `**核心能力**：\n${role.systemPrompt}\n\n`;
    
    if (role.scenario) {
      prompt += `**工作场景**：\n${role.scenario}\n\n`;
    }

    if (role.characterNote) {
      prompt += `**工作原则**：\n${role.characterNote}\n\n`;
    }

    prompt += `**专业领域**：${role.expertise.join('、')}\n\n`;
    prompt += `请让 **[${role.displayName}]** 也参与到当前话题的讨论中，从 TA 的专业角度提供意见。\n`;

    return prompt;
  }

  /**
   * 显示使用说明
   */
  private async showGroupChatInstructions(roles: Role[]): Promise<void> {
    const instructions = `
# 一人公司群聊使用说明

## 核心理念

模拟真实的团队讨论，每个角色代表一个专业领域的专家，从各自的视角提供客观分析。

## 使用步骤

### 1. 启动群聊
- 启动提示已复制到剪贴板
- 粘贴到 Qoder 对话框
- AI 将准备扮演多个角色

### 2. 提出问题
直接描述你的需求或问题，例如：
- "我要开发一个用户管理系统，各位有什么建议？"
- "现有代码性能有问题，大家怎么看？"
- "这个功能优先级如何评估？"

### 3. 阅读多角度分析
AI 会以不同角色身份回答，每个角色从自己的专业角度指出问题、风险和建议。

### 4. 深入讨论
- 向特定角色提问："@产品经理，用户画像是什么？"
- 让角色互动："产品经理和前端工程师讨论一下"
- 要求总结："综合大家的意见给个方案"

## 当前参与角色

${roles.map((r, i) => `${i + 1}. **${r.displayName}** - ${r.description}`).join('\n')}

## 使用技巧

1. **明确问题**：问题越具体，各角色分析越有针对性
2. **引导讨论**：主动引导角色之间的讨论
3. **决策总结**：讨论后要求给出综合方案
4. **动态调整**：可随时添加或移除角色

## 场景示例

### 产品设计
"我想做一个任务管理App，各位专家给些建议"
→ 产品经理分析用户需求，指出市场竞争
→ UI设计师提供界面建议，评估实现难度
→ 前端工程师评估技术实现，指出潜在问题
→ 后端工程师设计数据模型，评估性能风险

### 技术选型
"React vs Vue，哪个更适合我们项目？"
→ 前端工程师对比技术特点，列出优缺点
→ DevOps评估部署和维护，指出成本差异
→ 产品经理权衡学习成本和招聘难度

### 问题诊断
"系统响应慢，帮我分析"
→ 前端工程师检查前端性能问题
→ 后端工程师分析接口和数据库瞶颈
→ DevOps检查服务器和网络配置
`;

    const doc = await vscode.workspace.openTextDocument({
      content: instructions,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  }

  /**
   * 停止群聊模式
   */
  async stopGroupChat(): Promise<void> {
    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'groupChatMode',
      false,
      vscode.ConfigurationTarget.Global
    );

    await vscode.workspace.getConfiguration('aiRoleMaster').update(
      'groupChatRoles',
      [],
      vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage('已退出群聊模式');
  }
}
