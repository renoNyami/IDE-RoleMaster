import * as vscode from 'vscode';
import { RoleManager } from './services/roleManager';
import { RoleMarketService } from './services/roleMarket';
import { RoleStorage } from './services/roleStorage';
import { RoleListProvider } from './views/roleListView';
import { GroupChatManager } from './services/groupChatManager';
import { GroupChatPanel } from './views/groupChatPanel';
import { CreateRolePanel } from './views/createRolePanel';
import { AutoInjector } from './services/autoInjector';
import { Role } from './types/role';

let roleManager: RoleManager;
let roleMarket: RoleMarketService;
let roleStorage: RoleStorage;
let roleListProvider: RoleListProvider;
let groupChatManager: GroupChatManager;

/**
 * 插件激活
 */
export function activate(context: vscode.ExtensionContext) {
  try {
    // 初始化服务
    roleStorage = new RoleStorage(context);
    
    roleManager = new RoleManager(context);
    
    roleMarket = new RoleMarketService(context);
    
    roleListProvider = new RoleListProvider(roleStorage);
    
    groupChatManager = new GroupChatManager(context, roleStorage);

    // 注册 TreeDataProvider
    vscode.window.registerTreeDataProvider('roleList', roleListProvider);
    
    // 也创建 TreeView 以便控制
    const roleListView = vscode.window.createTreeView('roleList', {
      treeDataProvider: roleListProvider,
      showCollapseAll: false
    });
    
    // 添加到订阅中
    context.subscriptions.push(roleListView);

    const commands = [
      // 选择角色
      vscode.commands.registerCommand('ai-role-master.selectRole', async () => {
        await roleManager.selectRole();
        roleListProvider.refresh();
      }),

      // 创建角色
      vscode.commands.registerCommand('ai-role-master.createRole', async () => {
        CreateRolePanel.createOrShow(context.extensionUri, roleStorage);
      }),

      // 导入角色
      vscode.commands.registerCommand('ai-role-master.importRole', async () => {
        await roleManager.importRole();
        roleListProvider.refresh();
      }),

      // 导出角色
      vscode.commands.registerCommand('ai-role-master.exportRole', async () => {
        await roleManager.exportRole();
      }),

      // 管理角色
      vscode.commands.registerCommand('ai-role-master.manageRoles', async () => {
        await roleManager.manageRoles();
        roleListProvider.refresh();
      }),

      // 浏览市场
      vscode.commands.registerCommand('ai-role-master.browseMarket', async () => {
        await roleMarket.browseMarket();
        roleListProvider.refresh();
      }),

      // 激活角色（从树视图）
      vscode.commands.registerCommand('ai-role-master.activateRole', async (role: Role) => {
        if (role) {
          await roleStorage.setCurrentRole(role.id);
          vscode.window.showInformationMessage(`已激活角色: ${role.displayName}`);
          roleListProvider.refresh();
          updateStatusBar();
        }
      }),

      // 刷新视图
      vscode.commands.registerCommand('ai-role-master.refreshRoles', () => {
        roleListProvider.refresh();
      }),

      // 清除当前角色
      vscode.commands.registerCommand('ai-role-master.clearRole', async () => {
        await roleStorage.setCurrentRole('');
        vscode.window.showInformationMessage('已清除当前角色');
        roleListProvider.refresh();
        updateStatusBar();
      }),

      // 应用当前角色（自动注入）
      vscode.commands.registerCommand('ai-role-master.applyRole', async () => {
        const role = await roleStorage.getCurrentRole();
        if (!role) {
          vscode.window.showWarningMessage('当前没有激活的角色，请先选择一个角色');
          return;
        }

        // 生成角色提示
        let prompt = `[我希望你以 ${role.displayName} 的身份回答]\n\n`;
        prompt += role.systemPrompt;
        if (role.scenario) {
          prompt += `\n\n工作场景：${role.scenario}`;
        }
        if (role.characterNote) {
          prompt += `\n\n重要：${role.characterNote}`;
        }

        // 使用自动注入
        await AutoInjector.quickInject(prompt);
      }),

      // 复制当前角色提示词（用于当前对话）
      vscode.commands.registerCommand('ai-role-master.copyRolePrompt', async () => {
        const role = await roleStorage.getCurrentRole();
        if (!role) {
          vscode.window.showWarningMessage('当前没有激活的角色，请先选择一个角色');
          return;
        }

        // 生成简短的角色提示
        let prompt = `[我希望你以 ${role.displayName} 的身份回答]\n\n`;
        prompt += role.systemPrompt;
        if (role.scenario) {
          prompt += `\n\n工作场景：${role.scenario}`;
        }
        if (role.characterNote) {
          prompt += `\n\n重要：${role.characterNote}`;
        }

        await vscode.env.clipboard.writeText(prompt);
        vscode.window.showInformationMessage(
          `角色 "${role.displayName}" 的提示词已复制到剪贴板！\n\n直接粘贴到当前对话即可应用角色。`,
          '好的'
        );
      }),

      // 启动一人公司群聊（WebView 界面）
      vscode.commands.registerCommand('ai-role-master.startGroupChat', async () => {
        const roles = await roleStorage.getAllRoles();
        if (roles.length === 0) {
          vscode.window.showWarningMessage('暂无可用角色，请先安装或创建角色。');
          return;
        }
        GroupChatPanel.show(context.extensionUri, roles);
      }),

      // 添加角色到群聊
      vscode.commands.registerCommand('ai-role-master.addRoleToGroup', async () => {
        await groupChatManager.addRoleToGroup();
      }),

      // 搜索角色
      vscode.commands.registerCommand('ai-role-master.searchRoles', async () => {
        const query = await vscode.window.showInputBox({
          prompt: '搜索角色名称、描述、专业领域...',
          placeHolder: '输入关键词'
        });
        if (query !== undefined) {
          roleListProvider.setSearchQuery(query);
        }
      }),

      // 切换分组显示
      vscode.commands.registerCommand('ai-role-master.toggleGrouping', () => {
        roleListProvider.toggleGrouping();
        vscode.window.showInformationMessage(
          roleListProvider['groupByCategory'] ? '已启用分组显示' : '已关闭分组显示'
        );
      })
    ];

    // 创建状态栏项
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ai-role-master.selectRole';
    statusBarItem.tooltip = '点击选择AI角色';
    
    async function updateStatusBar() {
      const currentRole = await roleStorage.getCurrentRole();
      if (currentRole) {
        statusBarItem.text = `$(person) ${currentRole.displayName}`;
        statusBarItem.show();
      } else {
        statusBarItem.text = '$(person) 选择AI角色';
        statusBarItem.show();
      }
    }

    updateStatusBar();

    // 监听配置变化
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('aiRoleMaster')) {
          roleListProvider.refresh();
          updateStatusBar();
        }
      })
    );

    // 注册所有命令和状态栏
    context.subscriptions.push(...commands, statusBarItem);

    // 显示欢迎消息（仅首次）
    const hasShownWelcome = context.globalState.get('hasShownWelcome');
    if (!hasShownWelcome) {
      showWelcomeMessage(context);
      context.globalState.update('hasShownWelcome', true);
    }

    // 注册文档装饰器（将角色提示注入AI对话）
    setupPromptInjection(context);
  
  } catch (error) {
    console.error('AI Role Master 激活失败:', error);
    vscode.window.showErrorMessage(`AI Role Master 激活失败: ${error}`);
  }
}

/**
 * 显示欢迎消息
 */
async function showWelcomeMessage(context: vscode.ExtensionContext) {
  const action = await vscode.window.showInformationMessage(
    '欢迎使用 AI Role Master！是否安装预设角色？',
    '安装预设角色',
    '稍后'
  );

  if (action === '安装预设角色') {
    await installPresetRoles(context);
  }
}

/**
 * 安装预设角色
 */
async function installPresetRoles(context: vscode.ExtensionContext) {
  const marketService = new RoleMarketService(context);
  const presetRoles = await marketService.getMarketRoles();
  
  for (const role of presetRoles) {
    await marketService.installMarketRole(role);
  }

  vscode.window.showInformationMessage(`已安装 ${presetRoles.length} 个预设角色！`);
  roleListProvider.refresh();
}

/**
 * 设置提示词注入
 */
function setupPromptInjection(context: vscode.ExtensionContext) {
  // 这里可以集成到 AI IDE 的对话系统
  // 具体实现取决于目标 AI IDE 的 API
  
  // 示例：监听编辑器变化，在特定情况下注入角色提示
  const disposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const config = vscode.workspace.getConfiguration('aiRoleMaster');
    const autoApply = config.get<boolean>('autoApplyRole');
    
    if (!autoApply) {
      return;
    }

    // 检查是否是AI对话相关的文件
    const document = event.document;
    if (document.fileName.includes('.ai') || document.fileName.includes('chat')) {
      const currentRole = await roleStorage.getCurrentRole();
      if (currentRole) {
        // 可以在这里实现提示词注入逻辑
      }
    }
  });

  context.subscriptions.push(disposable);
}

/**
 * 获取当前角色的系统提示（供外部调用）
 */
export async function getCurrentRoleSystemPrompt(): Promise<string | undefined> {
  if (!roleStorage) {
    return undefined;
  }
  const role = await roleStorage.getCurrentRole();
  return role?.systemPrompt;
}

/**
 * 插件停用
 */
export function deactivate() {}
