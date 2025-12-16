import * as vscode from 'vscode';
import { Role, RoleCategory } from '../types/role';
import { RoleStorage } from '../services/roleStorage';

/**
 * 角色列表视图提供器（支持分组、搜索、hover预览）
 */
export class RoleListProvider implements vscode.TreeDataProvider<RoleTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RoleTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<RoleTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<RoleTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  private searchQuery: string = '';
  private groupByCategory: boolean = true;

  constructor(private storage: RoleStorage) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.refresh();
  }

  toggleGrouping(): void {
    this.groupByCategory = !this.groupByCategory;
    this.refresh();
  }

  getTreeItem(element: RoleTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RoleTreeItem): Promise<RoleTreeItem[]> {
    try {
      // 如果是分组节点，返回该分组下的角色
      if (element && element.category) {
        const roles = await this.storage.getAllRoles();
        const currentRole = await this.storage.getCurrentRole();
        
        return roles
          .filter(role => role.category === element.category)
          .filter(role => this.matchesSearch(role))
          .map(role => this.createRoleTreeItem(role, currentRole));
      }

      // 根节点
      if (!element) {
        const roles = await this.storage.getAllRoles();
        const currentRole = await this.storage.getCurrentRole();

        if (roles.length === 0) {
          return [new RoleTreeItem('暂无角色', '请先安装或创建角色', vscode.TreeItemCollapsibleState.None, true)];
        }

        // 过滤搜索结果
        const filteredRoles = roles.filter(role => this.matchesSearch(role));

        if (filteredRoles.length === 0) {
          return [new RoleTreeItem('无匹配结果', '请调整搜索关键词', vscode.TreeItemCollapsibleState.None, true)];
        }

        // 按分组显示
        if (this.groupByCategory) {
          return this.groupRolesByCategory(filteredRoles, currentRole);
        }

        // 平铺显示
        return filteredRoles.map(role => this.createRoleTreeItem(role, currentRole));
      }

      return [];
    } catch (error) {
      console.error('获取角色列表失败:', error);
      return [new RoleTreeItem('加载失败', '请查看控制台', vscode.TreeItemCollapsibleState.None, true)];
    }
  }

  /**
   * 判断角色是否匹配搜索
   */
  private matchesSearch(role: Role): boolean {
    if (!this.searchQuery) {
      return true;
    }

    const searchable = [
      role.displayName,
      role.description,
      role.name,
      ...role.expertise,
      ...role.tags
    ].join(' ').toLowerCase();

    return searchable.includes(this.searchQuery);
  }

  /**
   * 按分组组织角色
   */
  private groupRolesByCategory(roles: Role[], currentRole: Role | null | undefined): RoleTreeItem[] {
    const categoryMap = new Map<RoleCategory, Role[]>();
    
    // 分组
    roles.forEach(role => {
      const category = role.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(role);
    });

    // 创建分组节点
    const groups: RoleTreeItem[] = [];
    const categoryLabels = this.getCategoryLabels();

    categoryMap.forEach((rolesInCategory, category) => {
      const groupItem = new RoleTreeItem(
        categoryLabels.get(category) || category,
        `${rolesInCategory.length} 个角色`,
        vscode.TreeItemCollapsibleState.Expanded,
        false
      );
      groupItem.category = category;
      groupItem.iconPath = new vscode.ThemeIcon(this.getCategoryIcon(category));
      groupItem.contextValue = 'category';
      groups.push(groupItem);
    });

    return groups;
  }

  /**
   * 创建角色树项
   */
  private createRoleTreeItem(role: Role, currentRole: Role | null | undefined): RoleTreeItem {
    const isActive = currentRole?.id === role.id;
    
    // 生成详细的 tooltip
    const tooltip = this.generateRoleTooltip(role);
    
    const item = new RoleTreeItem(
      role.displayName,
      tooltip,
      vscode.TreeItemCollapsibleState.None,
      false,
      role
    );

    item.iconPath = new vscode.ThemeIcon(
      isActive ? 'check' : 'person',
      isActive ? new vscode.ThemeColor('terminal.ansiGreen') : undefined
    );

    item.contextValue = 'role';
    item.command = {
      command: 'ai-role-master.activateRole',
      title: '激活角色',
      arguments: [role]
    };

    if (isActive) {
      item.description = '(当前)';
    } else if (role.downloads && role.downloads > 0) {
      item.description = `↓${this.formatNumber(role.downloads)}`;
    }

    return item;
  }

  /**
   * 生成角色 hover 提示
   */
  private generateRoleTooltip(role: Role): string {
    const lines: string[] = [
      `### ${role.displayName}`,
      '',
      `**描述**：${role.description}`,
      '',
    ];

    if (role.expertise.length > 0) {
      lines.push(`**专业领域**：${role.expertise.slice(0, 5).join('、')}`);
      lines.push('');
    }

    if (role.tags.length > 0) {
      lines.push(`**标签**：${role.tags.slice(0, 5).join('、')}`);
      lines.push('');
    }

    if (role.downloads) {
      lines.push(`**下载量**：${this.formatNumber(role.downloads)}`);
    }

    if (role.rating) {
      lines.push(`**评分**：${role.rating.toFixed(1)} / 5.0`);
    }

    lines.push('');
    lines.push(`**作者**：${role.author}`);
    lines.push(`**版本**：${role.version}`);

    return lines.join('\n');
  }

  /**
   * 获取分组名称
   */
  private getCategoryLabels(): Map<RoleCategory, string> {
    return new Map([
      [RoleCategory.DEVELOPMENT, '开发工程'],
      [RoleCategory.DESIGN, '设计创意'],
      [RoleCategory.PRODUCT, '产品管理'],
      [RoleCategory.TESTING, '质量测试'],
      [RoleCategory.DEVOPS, '运维部署'],
      [RoleCategory.DATA, '数据分析'],
      [RoleCategory.SECURITY, '安全审计'],
      [RoleCategory.MANAGEMENT, '项目管理'],
      [RoleCategory.CUSTOM, '自定义']
    ]);
  }

  /**
   * 获取分组图标
   */
  private getCategoryIcon(category: RoleCategory): string {
    const iconMap: Record<RoleCategory, string> = {
      [RoleCategory.DEVELOPMENT]: 'code',
      [RoleCategory.DESIGN]: 'symbol-color',
      [RoleCategory.PRODUCT]: 'graph',
      [RoleCategory.TESTING]: 'beaker',
      [RoleCategory.DEVOPS]: 'server',
      [RoleCategory.DATA]: 'database',
      [RoleCategory.SECURITY]: 'shield',
      [RoleCategory.MANAGEMENT]: 'organization',
      [RoleCategory.CUSTOM]: 'star'
    };
    return iconMap[category] || 'folder';
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

/**
 * 角色树项
 */
export class RoleTreeItem extends vscode.TreeItem {
  public iconPath?: vscode.ThemeIcon;
  public contextValue?: string;
  public command?: vscode.Command;
  public description?: string;
  public category?: RoleCategory;  // 用于分组节点
  
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isEmpty: boolean = false,
    public readonly role?: Role
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
  }
}
