/**
 * 角色数据模型（参考 SillyTavern 核心设计）
 */
export interface Role {
  // 基本信息
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatar?: string;
  category: RoleCategory;
  
  // 核心提示词系统（多层次人格定义）
  systemPrompt: string;              // 主系统提示（角色核心定义）
  personality?: string;               // 人格特征（简短总结）
  scenario?: string;                  // 工作场景/上下文
  exampleDialogues?: ExampleDialogue[]; // 对话示例（训练AI风格）
  
  // 高级配置
  expertise: string[];
  tags: string[];
  characterNote?: string;             // 重要提示（始终保持在上下文）
  
  // 元数据
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  downloads?: number;
  rating?: number;
  isCustom: boolean;
  isActive?: boolean;
  
  // 创作者信息
  creatorNotes?: string;              // 使用说明
  license?: string;
}

/**
 * 对话示例（用于训练AI的回答风格）
 */
export interface ExampleDialogue {
  user: string;      // 用户问题示例
  assistant: string; // AI回答示例（展示期望的风格和深度）
}

/**
 * 角色分类
 */
export enum RoleCategory {
  DEVELOPMENT = 'development',
  DESIGN = 'design',
  PRODUCT = 'product',
  TESTING = 'testing',
  DEVOPS = 'devops',
  DATA = 'data',
  SECURITY = 'security',
  MANAGEMENT = 'management',
  CUSTOM = 'custom'
}

/**
 * 角色市场项
 */
export interface MarketRole extends Role {
  downloadUrl: string;
  homepage?: string;
  license?: string;
}

/**
 * 用户配置
 */
export interface UserConfig {
  currentRoleId: string;
  autoApplyRole: boolean;
  customRoles: Role[];
  favoriteRoles: string[];
  installedMarketRoles: string[];
}

/**
 * 角色导入导出格式
 */
export interface RoleExport {
  version: '1.0';
  roles: Role[];
  exportedAt: string;
  exportedBy: string;
}
