export type RoleType = 
  | 'werewolf' 
  | 'villager' 
  | 'seer' 
  | 'witch' 
  | 'hunter' 
  | 'guard' 
  | 'cupid' 
  | 'idiot'
  | 'white_werewolf'
  | 'wolf_king';

export interface Role {
  id: RoleType;
  name: string;
  team: 'wolf' | 'god' | 'villager';
  description: string;
  icon: string;
  nightAction: boolean;
  actionDescription?: string;
}

export interface Player {
  id: number;
  name: string;
  role?: Role;
  isAlive: boolean;
  isProtected: boolean;
  isPoisoned: boolean;
  isSaved: boolean;
  canSpeak: boolean;
  hasVoted: boolean;
  voteCount: number;
}

export interface GameConfig {
  totalPlayers: number;
  werewolfCount: number;
  villagerCount: number;
  seerCount: number;
  witchCount: number;
  hunterCount: number;
  guardCount: number;
  cupidCount: number;
  idiotCount: number;
  whiteWerewolfCount: number;
  wolfKingCount: number;
}

export type GamePhase = 
  | 'setup' 
  | 'role_assignment' 
  | 'night' 
  | 'day' 
  | 'vote' 
  | 'vote_result' 
  | 'game_over';

export type NightPhase = 
  | 'werewolf' 
  | 'white_werewolf' 
  | 'wolf_king'
  | 'seer' 
  | 'witch_save' 
  | 'witch_poison' 
  | 'guard' 
  | 'cupid';

export interface NightAction {
  phase: NightPhase;
  actor?: Player;
  target?: Player;
  completed: boolean;
}

export interface GameState {
  players: Player[];
  config: GameConfig;
  phase: GamePhase;
  currentDay: number;
  nightActions: NightAction[];
  lastKilled?: Player;
  witchHasSavePotion: boolean;
  witchHasPoisonPotion: boolean;
  lastGuardedId?: number;
  lovers: [number, number] | null;
  winner?: 'wolf' | 'god' | 'villager' | 'couple';
  currentSpeakerIndex: number;
  voteTarget?: number;
  speakingOrder: number[];
}

export const ROLES: Record<RoleType, Role> = {
  werewolf: {
    id: 'werewolf',
    name: '狼人',
    team: 'wolf',
    description: '每晚可以杀死一名玩家',
    icon: '🐺',
    nightAction: true,
    actionDescription: '请选择要杀死的玩家'
  },
  white_werewolf: {
    id: 'white_werewolf',
    name: '白狼王',
    team: 'wolf',
    description: '每晚可以杀死一名玩家，可以自爆带走一名玩家',
    icon: '🐺',
    nightAction: true,
    actionDescription: '请选择要杀死的玩家'
  },
  wolf_king: {
    id: 'wolf_king',
    name: '狼王',
    team: 'wolf',
    description: '死亡时可以带走一名玩家',
    icon: '👑',
    nightAction: true,
    actionDescription: '请选择要杀死的玩家'
  },
  villager: {
    id: 'villager',
    name: '村民',
    team: 'villager',
    description: '没有特殊技能，通过投票找出狼人',
    icon: '👨‍🌾',
    nightAction: false
  },
  seer: {
    id: 'seer',
    name: '预言家',
    team: 'god',
    description: '每晚可以查验一名玩家的身份',
    icon: '🔮',
    nightAction: true,
    actionDescription: '请选择要查验的玩家'
  },
  witch: {
    id: 'witch',
    name: '女巫',
    team: 'god',
    description: '拥有一瓶解药和一瓶毒药',
    icon: '🧙‍♀️',
    nightAction: true,
    actionDescription: '是否使用药水？'
  },
  hunter: {
    id: 'hunter',
    name: '猎人',
    team: 'god',
    description: '死亡时可以开枪带走一名玩家',
    icon: '🏹',
    nightAction: false
  },
  guard: {
    id: 'guard',
    name: '守卫',
    team: 'god',
    description: '每晚可以守护一名玩家（不能连续守护同一人）',
    icon: '🛡️',
    nightAction: true,
    actionDescription: '请选择要守护的玩家'
  },
  cupid: {
    id: 'cupid',
    name: '丘比特',
    team: 'god',
    description: '游戏开始时连接两名玩家为情侣',
    icon: '💘',
    nightAction: true,
    actionDescription: '请选择两名玩家成为情侣'
  },
  idiot: {
    id: 'idiot',
    name: '白痴',
    team: 'god',
    description: '被投票出局时翻牌免死，但失去投票权',
    icon: '🤪',
    nightAction: false
  }
};

export const PRESET_CONFIGS: Record<string, GameConfig> = {
  '6人局': {
    totalPlayers: 6,
    werewolfCount: 2,
    villagerCount: 2,
    seerCount: 1,
    witchCount: 1,
    hunterCount: 0,
    guardCount: 0,
    cupidCount: 0,
    idiotCount: 0,
    whiteWerewolfCount: 0,
    wolfKingCount: 0
  },
  '9人局': {
    totalPlayers: 9,
    werewolfCount: 3,
    villagerCount: 3,
    seerCount: 1,
    witchCount: 1,
    hunterCount: 1,
    guardCount: 0,
    cupidCount: 0,
    idiotCount: 0,
    whiteWerewolfCount: 0,
    wolfKingCount: 0
  },
  '12人局': {
    totalPlayers: 12,
    werewolfCount: 4,
    villagerCount: 4,
    seerCount: 1,
    witchCount: 1,
    hunterCount: 1,
    guardCount: 1,
    cupidCount: 0,
    idiotCount: 0,
    whiteWerewolfCount: 0,
    wolfKingCount: 0
  },
  '12人局(进阶)': {
    totalPlayers: 12,
    werewolfCount: 3,
    villagerCount: 4,
    seerCount: 1,
    witchCount: 1,
    hunterCount: 1,
    guardCount: 1,
    cupidCount: 1,
    idiotCount: 0,
    whiteWerewolfCount: 0,
    wolfKingCount: 0
  }
};

export function getDefaultConfig(): GameConfig {
  return {
    totalPlayers: 9,
    werewolfCount: 3,
    villagerCount: 3,
    seerCount: 1,
    witchCount: 1,
    hunterCount: 1,
    guardCount: 0,
    cupidCount: 0,
    idiotCount: 0,
    whiteWerewolfCount: 0,
    wolfKingCount: 0
  };
}

export function generateRoles(config: GameConfig): Role[] {
  const roles: Role[] = [];
  
  for (let i = 0; i < config.werewolfCount; i++) {
    roles.push(ROLES.werewolf);
  }
  for (let i = 0; i < config.whiteWerewolfCount; i++) {
    roles.push(ROLES.white_werewolf);
  }
  for (let i = 0; i < config.wolfKingCount; i++) {
    roles.push(ROLES.wolf_king);
  }
  for (let i = 0; i < config.villagerCount; i++) {
    roles.push(ROLES.villager);
  }
  for (let i = 0; i < config.seerCount; i++) {
    roles.push(ROLES.seer);
  }
  for (let i = 0; i < config.witchCount; i++) {
    roles.push(ROLES.witch);
  }
  for (let i = 0; i < config.hunterCount; i++) {
    roles.push(ROLES.hunter);
  }
  for (let i = 0; i < config.guardCount; i++) {
    roles.push(ROLES.guard);
  }
  for (let i = 0; i < config.cupidCount; i++) {
    roles.push(ROLES.cupid);
  }
  for (let i = 0; i < config.idiotCount; i++) {
    roles.push(ROLES.idiot);
  }
  
  return roles;
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
