import * as vscode from 'vscode';
import { Role } from '../types/role';

/**
 * 自动注入服务 - 无需手动复制粘贴
 */
export class AutoInjector {
  
  /**
   * 方案1：创建新文档并自动插入内容
   */
  static async injectToNewDocument(content: string, title: string = '群聊提示词'): Promise<void> {
    // 创建新的无标题文档
    const doc = await vscode.workspace.openTextDocument({
      content: content,
      language: 'markdown'
    });

    // 在新编辑器中显示
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside, // 在侧边打开
      preview: false,
      preserveFocus: false
    });

    // 选中全部内容（方便用户一键复制）
    const fullRange = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );
    editor.selection = new vscode.Selection(fullRange.start, fullRange.end);

    // 提示用户
    const action = await vscode.window.showInformationMessage(
      `${title}已准备就绪\n\n按 Ctrl+C 复制，然后粘贴到 Qoder 对话框`,
      '已复制',
      '一键复制'
    );

    if (action === '一键复制') {
      await vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage('已复制到剪贴板！');
    }
  }

  /**
   * 方案2：自动插入到当前编辑器
   */
  static async injectToActiveEditor(content: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个编辑器');
      return false;
    }

    const position = editor.selection.active;
    
    await editor.edit(editBuilder => {
      editBuilder.insert(position, content);
    });

    vscode.window.showInformationMessage('内容已插入到当前位置');
    return true;
  }

  /**
   * 方案3：自动搜索并插入到 Qoder 输入框（高级）
   * 尝试找到 Qoder 的输入框并自动填充
   */
  static async injectToQoderInput(content: string): Promise<boolean> {
    try {
      // 尝试查找包含 "qoder" 或 "chat" 的编辑器
      const editors = vscode.window.visibleTextEditors;
      let targetEditor: vscode.TextEditor | undefined;

      for (const editor of editors) {
        const fileName = editor.document.fileName.toLowerCase();
        const languageId = editor.document.languageId.toLowerCase();
        
        // 查找可能的 Qoder 输入框
        if (fileName.includes('qoder') || 
            fileName.includes('chat') ||
            fileName.includes('.ai') ||
            languageId === 'qoder' ||
            languageId === 'ai-chat') {
          targetEditor = editor;
          break;
        }
      }

      if (targetEditor) {
        // 找到了 Qoder 编辑器，直接插入
        const position = targetEditor.selection.active;
        
        await targetEditor.edit(editBuilder => {
          editBuilder.insert(position, content);
        });

        // 聚焦到该编辑器
        await vscode.window.showTextDocument(targetEditor.document, {
          viewColumn: targetEditor.viewColumn,
          preserveFocus: false
        });

        vscode.window.showInformationMessage('已自动插入到 Qoder 对话框');
        return true;
      }

      // 没找到，使用备用方案
      return false;
    } catch (error) {
      console.error('自动注入失败:', error);
      return false;
    }
  }

  /**
   * 智能注入 - 自动选择最佳方案
   */
  static async smartInject(content: string, title: string = '提示词'): Promise<void> {
    // 尝试方案3：直接注入到 Qoder
    const injectedToQoder = await this.injectToQoderInput(content);
    
    if (injectedToQoder) {
      return;
    }

    // 方案3失败，询问用户偏好
    const choice = await vscode.window.showQuickPick([
      {
        label: '$(file-add) 新建文档',
        description: '在新标签页中打开，方便查看和复制',
        value: 'newDoc'
      },
      {
        label: '$(insert) 插入当前位置',
        description: '在当前编辑器的光标位置插入',
        value: 'insert'
      },
      {
        label: '$(clippy) 仅复制到剪贴板',
        description: '手动粘贴到需要的位置',
        value: 'clipboard'
      }
    ], {
      placeHolder: '选择如何使用提示词'
    });

    if (!choice) {
      return;
    }

    switch (choice.value) {
      case 'newDoc':
        await this.injectToNewDocument(content, title);
        break;
      
      case 'insert':
        const inserted = await this.injectToActiveEditor(content);
        if (!inserted) {
          // 插入失败，回退到新建文档
          await this.injectToNewDocument(content, title);
        }
        break;
      
      case 'clipboard':
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage(`${title}已复制到剪贴板`);
        break;
    }
  }

  /**
   * 快捷注入 - 直接新建文档（最简单）
   */
  static async quickInject(content: string): Promise<void> {
    // 直接复制到剪贴板
    await vscode.env.clipboard.writeText(content);

    // 创建新文档并显示
    const doc = await vscode.workspace.openTextDocument({
      content: content,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: true
    });

    // 简洁提示
    vscode.window.showInformationMessage(
      '已复制到剪贴板并打开预览窗口',
      '关闭'
    );
  }

  /**
   * 创建一键启动按钮（Webview 按钮）
   */
  static async createQuickStartButton(content: string, roles: Role[]): Promise<void> {
    const action = await vscode.window.showInformationMessage(
      `已选择 ${roles.length} 个角色：${roles.map(r => r.displayName).join('、')}`,
      '新窗口打开',
      '复制内容',
      '直接使用'
    );

    switch (action) {
      case '新窗口打开':
        await this.injectToNewDocument(content, '群聊启动提示');
        break;
      
      case '复制内容':
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('已复制到剪贴板！');
        break;
      
      case '直接使用':
        // 尝试智能注入
        await this.smartInject(content, '群聊提示词');
        break;
    }
  }
}
