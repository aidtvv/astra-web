export type AppThemeKey =
  | 'notion' | 'tokyo-night' | 'catppuccin' | 'dracula'
  | 'everforest' | 'gruvbox' | 'github' | 'ayu' | 'linear'
  | 'monokai' | 'nord' | 'one-dark' | 'rose-pine' | 'solarized'
  | 'tokyo-night-storm' | 'material' | 'horizon' | 'palenight';

export type ThemeMode = 'light' | 'dark';
export type ThemePref = 'light' | 'dark' | 'auto';

export type SupportedModes = 'light' | 'dark' | 'both';

export interface AppThemeDefinition {
  key: AppThemeKey;
  label: string;
  emoji: string;
  description: string;
  accent: string;
  surface: string;
  supportedModes: SupportedModes;
  light?: Record<string, string>;
  dark: Record<string, string>;
}

const notionLight: Record<string, string> = {
  '--bg-primary': '#FFFFFF', '--bg-secondary': '#F7F6F3', '--bg-tertiary': '#EBEBEA',
  '--surface-color': '#FFFFFF', '--surface-elevated': '#F7F7F5', '--surface-overlay': 'rgba(15,15,15,0.04)',
  '--text-primary': '#37352F', '--text-secondary': '#787774', '--text-muted': '#9B9A97',
  '--border-color': '#E9E9E7', '--border-light': 'rgba(233,233,231,0.5)',
  '--glass-bg': 'rgba(255,255,255,0.72)', '--glass-border': 'rgba(0,0,0,0.06)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(255,255,255,0.8)', '--card-glass-border': 'rgba(0,0,0,0.06)', '--card-glass-accent': 'rgba(35,131,226,0.18)',
  '--hover-bg': 'rgba(55,53,47,0.04)', '--selection-bg': '#CADBEC', '--accent-color': '#2383E2', '--accent-muted': 'rgba(35,131,226,0.12)', '--accent-hover': '#1E70C2',
  '--pomodoro-primary': '#E03E3E', '--pomodoro-track': 'rgba(224,62,62,0.15)',
  '--tag-red': '#E03E3E', '--tag-blue': '#2383E2', '--tag-green': '#4DAB9A', '--tag-purple': '#9065B0',
  '--tag-orange': '#D77340', '--tag-yellow': '#DFAB01', '--tag-pink': '#C14C8A', '--tag-gray': '#787774',
};

const notionDark: Record<string, string> = {
  '--bg-primary': '#2F3437', '--bg-secondary': '#25282B', '--bg-tertiary': '#373C3F',
  '--surface-color': '#2F3437', '--surface-elevated': '#363B3E', '--surface-overlay': 'rgba(0,0,0,0.4)',
  '--text-primary': '#E6E6E6', '--text-secondary': '#A8A8A6', '--text-muted': '#6B6B68',
  '--border-color': '#3A3F43', '--border-light': 'rgba(58,63,67,0.5)',
  '--glass-bg': 'rgba(47,52,55,0.65)', '--glass-border': 'rgba(255,255,255,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(47,52,55,0.8)', '--card-glass-border': 'rgba(255,255,255,0.08)', '--card-glass-accent': 'rgba(74,158,245,0.18)',
  '--hover-bg': 'rgba(255,255,255,0.05)', '--selection-bg': '#3A5A78', '--accent-color': '#4A9EF5', '--accent-muted': 'rgba(74,158,245,0.12)', '--accent-hover': '#6BB3F7',
  '--pomodoro-primary': '#E03E3E', '--pomodoro-track': 'rgba(224,62,62,0.2)',
  '--tag-red': '#FF6B6B', '--tag-blue': '#4A9EF5', '--tag-green': '#5DD9C1', '--tag-purple': '#B88CE0',
  '--tag-orange': '#FF9E5C', '--tag-yellow': '#FCC54A', '--tag-pink': '#E87BB0', '--tag-gray': '#A8A8A6',
};

const tokyoNightDark: Record<string, string> = {
  '--bg-primary': '#1A1B26', '--bg-secondary': '#16161E', '--bg-tertiary': '#22222C',
  '--surface-color': '#1A1B26', '--surface-elevated': '#22222C', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#C0CAF5', '--text-secondary': '#A9B1D6', '--text-muted': '#565F89',
  '--border-color': '#2A2E3C', '--border-light': 'rgba(42,46,60,0.5)',
  '--glass-bg': 'rgba(26,27,38,0.65)', '--glass-border': 'rgba(122,162,247,0.1)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(26,27,38,0.8)', '--card-glass-border': 'rgba(122,162,247,0.15)', '--card-glass-accent': 'rgba(122,162,247,0.18)',
  '--hover-bg': 'rgba(122,162,247,0.08)', '--selection-bg': '#33467C', '--accent-color': '#7AA2F7', '--accent-muted': 'rgba(122,162,247,0.12)', '--accent-hover': '#A6C8FF',
  '--pomodoro-primary': '#F7768E', '--pomodoro-track': 'rgba(247,118,142,0.15)',
  '--tag-red': '#F7768E', '--tag-blue': '#7AA2F7', '--tag-green': '#9ECE6A', '--tag-purple': '#BB9AF7',
  '--tag-orange': '#FF9E64', '--tag-yellow': '#E0AF68', '--tag-pink': '#D27E99', '--tag-gray': '#565F89',
};

const catppuccinLatte: Record<string, string> = {
  '--bg-primary': '#EFF1F5', '--bg-secondary': '#E6E9EF', '--bg-tertiary': '#DCE0E8',
  '--surface-color': '#EFF1F5', '--surface-elevated': '#E6E9EF', '--surface-overlay': 'rgba(30,30,46,0.04)',
  '--text-primary': '#4C4F69', '--text-secondary': '#6C6F85', '--text-muted': '#8B8FA3',
  '--border-color': '#DCE0E8', '--border-light': 'rgba(220,224,232,0.5)',
  '--glass-bg': 'rgba(239,241,245,0.72)', '--glass-border': 'rgba(148,163,184,0.2)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(239,241,245,0.8)', '--card-glass-border': 'rgba(148,163,184,0.2)', '--card-glass-accent': 'rgba(148,163,184,0.18)',
  '--hover-bg': 'rgba(108,111,133,0.06)', '--selection-bg': '#BDC5D1', '--accent-color': '#1E66F5', '--accent-muted': 'rgba(30,102,245,0.12)', '--accent-hover': '#1850C4',
  '--pomodoro-primary': '#D20F39', '--pomodoro-track': 'rgba(210,15,57,0.15)',
  '--tag-red': '#D20F39', '--tag-blue': '#1E66F5', '--tag-green': '#40A02B', '--tag-purple': '#8839EF',
  '--tag-orange': '#FE640B', '--tag-yellow': '#DF8E1D', '--tag-pink': '#DC6BA5', '--tag-gray': '#6C6F85',
};

const catppuccinMocha: Record<string, string> = {
  '--bg-primary': '#1E1E2E', '--bg-secondary': '#181825', '--bg-tertiary': '#262637',
  '--surface-color': '#1E1E2E', '--surface-elevated': '#262637', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#CDD6F4', '--text-secondary': '#A6ADC8', '--text-muted': '#6C6F85',
  '--border-color': '#313244', '--border-light': 'rgba(49,50,68,0.5)',
  '--glass-bg': 'rgba(30,30,46,0.65)', '--glass-border': 'rgba(205,214,244,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(30,30,46,0.8)', '--card-glass-border': 'rgba(205,214,244,0.08)', '--card-glass-accent': 'rgba(203,166,247,0.18)',
  '--hover-bg': 'rgba(205,214,244,0.05)', '--selection-bg': '#45475A', '--accent-color': '#CBA6F7', '--accent-muted': 'rgba(203,166,247,0.12)', '--accent-hover': '#DCB6FA',
  '--pomodoro-primary': '#F38BA8', '--pomodoro-track': 'rgba(243,139,168,0.15)',
  '--tag-red': '#F38BA8', '--tag-blue': '#89B4FA', '--tag-green': '#A6E3A1', '--tag-purple': '#CBA6F7',
  '--tag-orange': '#FAB387', '--tag-yellow': '#F9E2AF', '--tag-pink': '#F5C2E7', '--tag-gray': '#6C6F85',
};

const draculaDark: Record<string, string> = {
  '--bg-primary': '#282A36', '--bg-secondary': '#21222C', '--bg-tertiary': '#343746',
  '--surface-color': '#282A36', '--surface-elevated': '#343746', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#F8F8F2', '--text-secondary': '#B8B8C2', '--text-muted': '#6272A4',
  '--border-color': '#44475A', '--border-light': 'rgba(68,71,90,0.5)',
  '--glass-bg': 'rgba(40,42,54,0.65)', '--glass-border': 'rgba(255,121,198,0.1)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(40,42,54,0.8)', '--card-glass-border': 'rgba(255,121,198,0.1)', '--card-glass-accent': 'rgba(255,121,198,0.18)',
  '--hover-bg': 'rgba(255,255,255,0.05)', '--selection-bg': '#44475A', '--accent-color': '#FF79C6', '--accent-muted': 'rgba(255,121,198,0.12)', '--accent-hover': '#FF9ED8',
  '--pomodoro-primary': '#FF5555', '--pomodoro-track': 'rgba(255,85,85,0.15)',
  '--tag-red': '#FF5555', '--tag-blue': '#8BE9FD', '--tag-green': '#50FA7B', '--tag-purple': '#BD93F9',
  '--tag-orange': '#FFB86C', '--tag-yellow': '#F1FA8C', '--tag-pink': '#FF79C6', '--tag-gray': '#6272A4',
};

const everforestLight: Record<string, string> = {
  '--bg-primary': '#FDF6E3', '--bg-secondary': '#F4EED3', '--bg-tertiary': '#E9E2C6',
  '--surface-color': '#FDF6E3', '--surface-elevated': '#F4EED3', '--surface-overlay': 'rgba(45,53,59,0.04)',
  '--text-primary': '#5C6A57', '--text-secondary': '#83907A', '--text-muted': '#A8B2A0',
  '--border-color': '#D3C9A8', '--border-light': 'rgba(211,201,168,0.5)',
  '--glass-bg': 'rgba(253,246,227,0.72)', '--glass-border': 'rgba(92,106,87,0.15)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(253,246,227,0.8)', '--card-glass-border': 'rgba(92,106,87,0.15)', '--card-glass-accent': 'rgba(151,178,89,0.18)',
  '--hover-bg': 'rgba(92,106,87,0.06)', '--selection-bg': '#C8D4A8', '--accent-color': '#93B259', '--accent-muted': 'rgba(147,178,89,0.12)', '--accent-hover': '#7A9A42',
  '--pomodoro-primary': '#E67E80', '--pomodoro-track': 'rgba(230,126,128,0.15)',
  '--tag-red': '#E67E80', '--tag-blue': '#7FBBFC', '--tag-green': '#8EC07C', '--tag-purple': '#D699B6',
  '--tag-orange': '#DB8B5A', '--tag-yellow': '#D8B757', '--tag-pink': '#E5B4C9', '--tag-gray': '#83907A',
};

const everforestDark: Record<string, string> = {
  '--bg-primary': '#2D353B', '--bg-secondary': '#262D33', '--bg-tertiary': '#35404A',
  '--surface-color': '#2D353B', '--surface-elevated': '#35404A', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#D3C6AA', '--text-secondary': '#83907A', '--text-muted': '#607067',
  '--border-color': '#47524C', '--border-light': 'rgba(71,82,76,0.5)',
  '--glass-bg': 'rgba(45,53,59,0.65)', '--glass-border': 'rgba(211,198,170,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(45,53,59,0.8)', '--card-glass-border': 'rgba(211,198,170,0.08)', '--card-glass-accent': 'rgba(167,192,128,0.18)',
  '--hover-bg': 'rgba(211,198,170,0.05)', '--selection-bg': '#47524C', '--accent-color': '#A7C080', '--accent-muted': 'rgba(167,192,128,0.12)', '--accent-hover': '#B8D08F',
  '--pomodoro-primary': '#E67E80', '--pomodoro-track': 'rgba(230,126,128,0.2)',
  '--tag-red': '#E67E80', '--tag-blue': '#7FBBFC', '--tag-green': '#8EC07C', '--tag-purple': '#D699B6',
  '--tag-orange': '#DB8B5A', '--tag-yellow': '#D8B757', '--tag-pink': '#E5B4C9', '--tag-gray': '#83907A',
};

const gruvboxLight: Record<string, string> = {
  '--bg-primary': '#FBF1C7', '--bg-secondary': '#F5EBC5', '--bg-tertiary': '#EADBB2',
  '--surface-color': '#FBF1C7', '--surface-elevated': '#F5EBC5', '--surface-overlay': 'rgba(40,40,40,0.04)',
  '--text-primary': '#3C3836', '--text-secondary': '#665C54', '--text-muted': '#928374',
  '--border-color': '#D5C4A1', '--border-light': 'rgba(213,196,161,0.5)',
  '--glass-bg': 'rgba(251,241,199,0.72)', '--glass-border': 'rgba(60,56,54,0.12)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(251,241,199,0.8)', '--card-glass-border': 'rgba(60,56,54,0.12)', '--card-glass-accent': 'rgba(69,133,136,0.18)',
  '--hover-bg': 'rgba(60,56,54,0.06)', '--selection-bg': '#BDC49A', '--accent-color': '#458588', '--accent-muted': 'rgba(69,133,136,0.12)', '--accent-hover': '#3A7074',
  '--pomodoro-primary': '#D65D0E', '--pomodoro-track': 'rgba(214,93,14,0.15)',
  '--tag-red': '#CA241D', '--tag-blue': '#457B9D', '--tag-green': '#7C8F5E', '--tag-purple': '#9C7B8C',
  '--tag-orange': '#D65D0E', '--tag-yellow': '#B57614', '--tag-pink': '#C7738A', '--tag-gray': '#665C54',
};

const gruvboxDark: Record<string, string> = {
  '--bg-primary': '#282828', '--bg-secondary': '#1D2021', '--bg-tertiary': '#3C3836',
  '--surface-color': '#282828', '--surface-elevated': '#3C3836', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#EBDBB2', '--text-secondary': '#A89984', '--text-muted': '#7C6F64',
  '--border-color': '#504945', '--border-light': 'rgba(80,73,69,0.5)',
  '--glass-bg': 'rgba(40,40,40,0.65)', '--glass-border': 'rgba(235,219,178,0.06)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(40,40,40,0.8)', '--card-glass-border': 'rgba(235,219,178,0.06)', '--card-glass-accent': 'rgba(131,165,152,0.18)',
  '--hover-bg': 'rgba(235,219,178,0.05)', '--selection-bg': '#504945', '--accent-color': '#83A598', '--accent-muted': 'rgba(131,165,152,0.12)', '--accent-hover': '#96B5AB',
  '--pomodoro-primary': '#FB4934', '--pomodoro-track': 'rgba(251,73,52,0.2)',
  '--tag-red': '#FB4934', '--tag-blue': '#83A598', '--tag-green': '#B8BB26', '--tag-purple': '#C5A2C5',
  '--tag-orange': '#FE8625', '--tag-yellow': '#FABD2F', '--tag-pink': '#FF77C6', '--tag-gray': '#A89984',
};

const githubLight: Record<string, string> = {
  '--bg-primary': '#FFFFFF', '--bg-secondary': '#F6F8FA', '--bg-tertiary': '#EAEFF2',
  '--surface-color': '#FFFFFF', '--surface-elevated': '#F6F8FA', '--surface-overlay': 'rgba(13,17,23,0.04)',
  '--text-primary': '#1F2328', '--text-secondary': '#656D76', '--text-muted': '#8C959F',
  '--border-color': '#D0D7DE', '--border-light': 'rgba(208,215,222,0.5)',
  '--glass-bg': 'rgba(255,255,255,0.72)', '--glass-border': 'rgba(31,35,40,0.1)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(255,255,255,0.8)', '--card-glass-border': 'rgba(31,35,40,0.08)', '--card-glass-accent': 'rgba(3,102,214,0.18)',
  '--hover-bg': 'rgba(31,35,40,0.04)', '--selection-bg': '#B6D4FE', '--accent-color': '#0366D6', '--accent-muted': 'rgba(3,102,214,0.12)', '--accent-hover': '#0250A3',
  '--pomodoro-primary': '#CF222E', '--pomodoro-track': 'rgba(207,34,46,0.15)',
  '--tag-red': '#CF222E', '--tag-blue': '#0366D6', '--tag-green': '#1A7F37', '--tag-purple': '#8250DF',
  '--tag-orange': '#BC4C00', '--tag-yellow': '#9A6700', '--tag-pink': '#BF3989', '--tag-gray': '#656D76',
};

const githubDark: Record<string, string> = {
  '--bg-primary': '#0D1117', '--bg-secondary': '#010409', '--bg-tertiary': '#161B22',
  '--surface-color': '#0D1117', '--surface-elevated': '#161B22', '--surface-overlay': 'rgba(0,0,0,0.4)',
  '--text-primary': '#E6EDF3', '--text-secondary': '#8B949E', '--text-muted': '#6E7681',
  '--border-color': '#30363D', '--border-light': 'rgba(48,54,61,0.5)',
  '--glass-bg': 'rgba(13,17,23,0.65)', '--glass-border': 'rgba(88,166,255,0.1)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(13,17,23,0.8)', '--card-glass-border': 'rgba(88,166,255,0.1)', '--card-glass-accent': 'rgba(88,166,255,0.18)',
  '--hover-bg': 'rgba(255,255,255,0.05)', '--selection-bg': '#264F78', '--accent-color': '#58A6FF', '--accent-muted': 'rgba(88,166,255,0.12)', '--accent-hover': '#79B8FF',
  '--pomodoro-primary': '#F85149', '--pomodoro-track': 'rgba(248,81,73,0.2)',
  '--tag-red': '#F85149', '--tag-blue': '#58A6FF', '--tag-green': '#3FB950', '--tag-purple': '#BC8CFF',
  '--tag-orange': '#D29922', '--tag-yellow': '#E3B341', '--tag-pink': '#DB61A2', '--tag-gray': '#8B949E',
};

const ayuLight: Record<string, string> = {
  '--bg-primary': '#FAFAFA', '--bg-secondary': '#F0F0F0', '--bg-tertiary': '#E4E4E4',
  '--surface-color': '#FAFAFA', '--surface-elevated': '#F0F0F0', '--surface-overlay': 'rgba(11,14,20,0.04)',
  '--text-primary': '#5C6773', '--text-secondary': '#6C7A89', '--text-muted': '#A6A6A6',
  '--border-color': '#E0E0E0', '--border-light': 'rgba(224,224,224,0.5)',
  '--glass-bg': 'rgba(250,250,250,0.72)', '--glass-border': 'rgba(92,103,115,0.12)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(250,250,250,0.8)', '--card-glass-border': 'rgba(92,103,115,0.12)', '--card-glass-accent': 'rgba(255,153,64,0.18)',
  '--hover-bg': 'rgba(92,103,115,0.06)', '--selection-bg': '#D4E4F7', '--accent-color': '#FF9940', '--accent-muted': 'rgba(255,153,64,0.12)', '--accent-hover': '#E8882E',
  '--pomodoro-primary': '#F07178', '--pomodoro-track': 'rgba(240,113,120,0.15)',
  '--tag-red': '#F07178', '--tag-blue': '#39BAE6', '--tag-green': '#7FDBCA', '--tag-purple': '#C77DBB',
  '--tag-orange': '#FFB454', '--tag-yellow': '#F2AE49', '--tag-pink': '#E57373', '--tag-gray': '#6C7A89',
};

const ayuDark: Record<string, string> = {
  '--bg-primary': '#0B0E14', '--bg-secondary': '#0D121B', '--bg-tertiary': '#131824',
  '--surface-color': '#0B0E14', '--surface-elevated': '#131824', '--surface-overlay': 'rgba(0,0,0,0.4)',
  '--text-primary': '#BFBDB6', '--text-secondary': '#B3B0A5', '--text-muted': '#566C74',
  '--border-color': '#1F2428', '--border-light': 'rgba(31,36,40,0.5)',
  '--glass-bg': 'rgba(11,14,20,0.65)', '--glass-border': 'rgba(230,180,80,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(11,14,20,0.8)', '--card-glass-border': 'rgba(230,180,80,0.08)', '--card-glass-accent': 'rgba(230,180,80,0.18)',
  '--hover-bg': 'rgba(191,189,182,0.05)', '--selection-bg': '#1A2A4A', '--accent-color': '#E6B450', '--accent-muted': 'rgba(230,180,80,0.12)', '--accent-hover': '#F2C56A',
  '--pomodoro-primary': '#F07178', '--pomodoro-track': 'rgba(240,113,120,0.2)',
  '--tag-red': '#F07178', '--tag-blue': '#39BAE6', '--tag-green': '#7FDBCA', '--tag-purple': '#C77DBB',
  '--tag-orange': '#FFB454', '--tag-yellow': '#F2AE49', '--tag-pink': '#E57373', '--tag-gray': '#566C74',
};

const linearLight: Record<string, string> = {
  '--bg-primary': '#FFFFFF', '--bg-secondary': '#F8F8F9', '--bg-tertiary': '#EFEFF1',
  '--surface-color': '#FFFFFF', '--surface-elevated': '#F8F8F9', '--surface-overlay': 'rgba(28,29,36,0.04)',
  '--text-primary': '#131416', '--text-secondary': '#62666D', '--text-muted': '#8A8F98',
  '--border-color': '#E5E6E8', '--border-light': 'rgba(229,230,232,0.5)',
  '--glass-bg': 'rgba(255,255,255,0.72)', '--glass-border': 'rgba(19,20,22,0.08)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(255,255,255,0.8)', '--card-glass-border': 'rgba(19,20,22,0.08)', '--card-glass-accent': 'rgba(94,106,210,0.18)',
  '--hover-bg': 'rgba(19,20,22,0.04)', '--selection-bg': '#C8CBF4', '--accent-color': '#5E6AD2', '--accent-muted': 'rgba(94,106,210,0.12)', '--accent-hover': '#4A57C2',
  '--pomodoro-primary': '#E5484D', '--pomodoro-track': 'rgba(229,72,77,0.15)',
  '--tag-red': '#E5484D', '--tag-blue': '#5E6AD2', '--tag-green': '#4CB782', '--tag-purple': '#9965E0',
  '--tag-orange': '#D47D3F', '--tag-yellow': '#C28B00', '--tag-pink': '#D94A8F', '--tag-gray': '#62666D',
};

const linearDark: Record<string, string> = {
  '--bg-primary': '#1C1D24', '--bg-secondary': '#16171D', '--bg-tertiary': '#262830',
  '--surface-color': '#1C1D24', '--surface-elevated': '#262830', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#EEF0F3', '--text-secondary': '#B4BCD0', '--text-muted': '#5A5F6A',
  '--border-color': '#2A2D35', '--border-light': 'rgba(42,45,53,0.5)',
  '--glass-bg': 'rgba(28,29,36,0.65)', '--glass-border': 'rgba(238,240,243,0.06)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(28,29,36,0.8)', '--card-glass-border': 'rgba(238,240,243,0.06)', '--card-glass-accent': 'rgba(94,106,210,0.18)',
  '--hover-bg': 'rgba(238,240,243,0.05)', '--selection-bg': '#3A3E6D', '--accent-color': '#8B96F0', '--accent-muted': 'rgba(139,150,240,0.12)', '--accent-hover': '#A6B0F5',
  '--pomodoro-primary': '#FF6B6B', '--pomodoro-track': 'rgba(255,107,107,0.15)',
  '--tag-red': '#FF6B6B', '--tag-blue': '#8B96F0', '--tag-green': '#4CB782', '--tag-purple': '#BB94F7',
  '--tag-orange': '#F0A565', '--tag-yellow': '#F7C948', '--tag-pink': '#E77DB4', '--tag-gray': '#B4BCD0',
};

const monokaiDark: Record<string, string> = {
  '--bg-primary': '#272822', '--bg-secondary': '#1E1F1C', '--bg-tertiary': '#3E3D32',
  '--surface-color': '#272822', '--surface-elevated': '#3E3D32', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#F8F8F2', '--text-secondary': '#A59F85', '--text-muted': '#75715E',
  '--border-color': '#49483E', '--border-light': 'rgba(73,72,62,0.5)',
  '--glass-bg': 'rgba(39,40,34,0.65)', '--glass-border': 'rgba(166,226,46,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(39,40,34,0.8)', '--card-glass-border': 'rgba(166,226,46,0.08)', '--card-glass-accent': 'rgba(166,226,46,0.18)',
  '--hover-bg': 'rgba(248,248,242,0.05)', '--selection-bg': '#49483E', '--accent-color': '#A6E22E', '--accent-muted': 'rgba(166,226,46,0.12)', '--accent-hover': '#B8E84A',
  '--pomodoro-primary': '#F92672', '--pomodoro-track': 'rgba(249,38,114,0.2)',
  '--tag-red': '#F92672', '--tag-blue': '#66D9E8', '--tag-green': '#A6E22E', '--tag-purple': '#AE81FF',
  '--tag-orange': '#E6DB74', '--tag-yellow': '#FDB462', '--tag-pink': '#F92672', '--tag-gray': '#75715E',
};

const nordDark: Record<string, string> = {
  '--bg-primary': '#2E3440', '--bg-secondary': '#272C36', '--bg-tertiary': '#3B4252',
  '--surface-color': '#2E3440', '--surface-elevated': '#3B4252', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#ECEFF4', '--text-secondary': '#D8DEE9', '--text-muted': '#4C566A',
  '--border-color': '#434C5E', '--border-light': 'rgba(67,76,94,0.5)',
  '--glass-bg': 'rgba(46,52,64,0.65)', '--glass-border': 'rgba(236,239,244,0.06)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(46,52,64,0.8)', '--card-glass-border': 'rgba(236,239,244,0.06)', '--card-glass-accent': 'rgba(136,192,208,0.18)',
  '--hover-bg': 'rgba(236,239,244,0.05)', '--selection-bg': '#434C5E', '--accent-color': '#88C0D0', '--accent-muted': 'rgba(136,192,208,0.12)', '--accent-hover': '#99CFDD',
  '--pomodoro-primary': '#BF616A', '--pomodoro-track': 'rgba(191,97,106,0.2)',
  '--tag-red': '#BF616A', '--tag-blue': '#81A1C1', '--tag-green': '#A3BE8C', '--tag-purple': '#B48EAD',
  '--tag-orange': '#D08770', '--tag-yellow': '#EBCB8B', '--tag-pink': '#CE8BC2', '--tag-gray': '#4C566A',
};

const oneDarkDark: Record<string, string> = {
  '--bg-primary': '#282C34', '--bg-secondary': '#21252B', '--bg-tertiary': '#3C3F44',
  '--surface-color': '#282C34', '--surface-elevated': '#3C3F44', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#ABB2BF', '--text-secondary': '#9DA5B4', '--text-muted': '#5C6370',
  '--border-color': '#3E4451', '--border-light': 'rgba(62,68,81,0.5)',
  '--glass-bg': 'rgba(40,44,52,0.65)', '--glass-border': 'rgba(82,139,255,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(40,44,52,0.8)', '--card-glass-border': 'rgba(82,139,255,0.08)', '--card-glass-accent': 'rgba(82,139,255,0.18)',
  '--hover-bg': 'rgba(171,178,191,0.05)', '--selection-bg': '#3E4451', '--accent-color': '#528BFF', '--accent-muted': 'rgba(82,139,255,0.12)', '--accent-hover': '#7AA3FF',
  '--pomodoro-primary': '#E06C75', '--pomodoro-track': 'rgba(224,108,117,0.2)',
  '--tag-red': '#E06C75', '--tag-blue': '#61AFEF', '--tag-green': '#98C379', '--tag-purple': '#C678DD',
  '--tag-orange': '#D19A66', '--tag-yellow': '#E5C07B', '--tag-pink': '#E06C75', '--tag-gray': '#5C6370',
};

const rosePineDawn: Record<string, string> = {
  '--bg-primary': '#FAF4ED', '--bg-secondary': '#F4EBE0', '--bg-tertiary': '#EADDCB',
  '--surface-color': '#FAF4ED', '--surface-elevated': '#F4EBE0', '--surface-overlay': 'rgba(25,23,36,0.04)',
  '--text-primary': '#26233A', '--text-secondary': '#6E6A86', '--text-muted': '#9893A8',
  '--border-color': '#E5D9C8', '--border-light': 'rgba(229,217,200,0.5)',
  '--glass-bg': 'rgba(250,244,237,0.72)', '--glass-border': 'rgba(38,35,58,0.1)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(250,244,237,0.8)', '--card-glass-border': 'rgba(38,35,58,0.1)', '--card-glass-accent': 'rgba(144,122,169,0.18)',
  '--hover-bg': 'rgba(38,35,58,0.05)', '--selection-bg': '#C9B9D8', '--accent-color': '#907AA9', '--accent-muted': 'rgba(144,122,169,0.12)', '--accent-hover': '#7D6695',
  '--pomodoro-primary': '#D75A5A', '--pomodoro-track': 'rgba(215,90,90,0.15)',
  '--tag-red': '#D75A5A', '--tag-blue': '#907AA9', '--tag-green': '#6E9A8A', '--tag-purple': '#B56576',
  '--tag-orange': '#D69A62', '--tag-yellow': '#C89B7B', '--tag-pink': '#DA7B8A', '--tag-gray': '#6E6A86',
};

const rosePineDark: Record<string, string> = {
  '--bg-primary': '#191724', '--bg-secondary': '#1F1D2B', '--bg-tertiary': '#26233A',
  '--surface-color': '#191724', '--surface-elevated': '#26233A', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#E0DEF4', '--text-secondary': '#908CAA', '--text-muted': '#6E6A86',
  '--border-color': '#26233A', '--border-light': 'rgba(38,35,58,0.5)',
  '--glass-bg': 'rgba(25,23,36,0.65)', '--glass-border': 'rgba(224,222,244,0.06)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(25,23,36,0.8)', '--card-glass-border': 'rgba(224,222,244,0.06)', '--card-glass-accent': 'rgba(196,167,231,0.18)',
  '--hover-bg': 'rgba(224,222,244,0.05)', '--selection-bg': '#26233A', '--accent-color': '#C4A7E7', '--accent-muted': 'rgba(196,167,231,0.12)', '--accent-hover': '#D4B8EE',
  '--pomodoro-primary': '#EB6F92', '--pomodoro-track': 'rgba(235,111,146,0.2)',
  '--tag-red': '#EB6F92', '--tag-blue': '#C4A7E7', '--tag-green': '#31748C', '--tag-purple': '#B56576',
  '--tag-orange': '#F6C177', '--tag-yellow': '#F6C177', '--tag-pink': '#EB6F92', '--tag-gray': '#908CAA',
};

const solarizedLight: Record<string, string> = {
  '--bg-primary': '#FDF6E3', '--bg-secondary': '#EEE8D5', '--bg-tertiary': '#DDD6C1',
  '--surface-color': '#FDF6E3', '--surface-elevated': '#EEE8D5', '--surface-overlay': 'rgba(0,43,54,0.04)',
  '--text-primary': '#586E75', '--text-secondary': '#657B83', '--text-muted': '#93A1A1',
  '--border-color': '#C4BFA6', '--border-light': 'rgba(196,191,166,0.5)',
  '--glass-bg': 'rgba(253,246,227,0.72)', '--glass-border': 'rgba(88,110,117,0.12)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(253,246,227,0.8)', '--card-glass-border': 'rgba(88,110,117,0.12)', '--card-glass-accent': 'rgba(38,139,210,0.18)',
  '--hover-bg': 'rgba(88,110,117,0.06)', '--selection-bg': '#B3D4DB', '--accent-color': '#268BD2', '--accent-muted': 'rgba(38,139,210,0.12)', '--accent-hover': '#1F78B8',
  '--pomodoro-primary': '#DC322F', '--pomodoro-track': 'rgba(220,50,47,0.15)',
  '--tag-red': '#DC322F', '--tag-blue': '#268BD2', '--tag-green': '#859900', '--tag-purple': '#6C71C4',
  '--tag-orange': '#CB4B16', '--tag-yellow': '#B58900', '--tag-pink': '#D33682', '--tag-gray': '#657B83',
};

const solarizedDark: Record<string, string> = {
  '--bg-primary': '#002B36', '--bg-secondary': '#073642', '--bg-tertiary': '#0A3A47',
  '--surface-color': '#002B36', '--surface-elevated': '#073642', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#93A1A1', '--text-secondary': '#657B83', '--text-muted': '#586E75',
  '--border-color': '#0A3A47', '--border-light': 'rgba(10,58,71,0.5)',
  '--glass-bg': 'rgba(0,43,54,0.65)', '--glass-border': 'rgba(147,161,161,0.06)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(0,43,54,0.8)', '--card-glass-border': 'rgba(147,161,161,0.06)', '--card-glass-accent': 'rgba(38,139,210,0.18)',
  '--hover-bg': 'rgba(147,161,161,0.05)', '--selection-bg': '#0A3A47', '--accent-color': '#268BD2', '--accent-muted': 'rgba(38,139,210,0.12)', '--accent-hover': '#3A9CE0',
  '--pomodoro-primary': '#DC322F', '--pomodoro-track': 'rgba(220,50,47,0.2)',
  '--tag-red': '#DC322F', '--tag-blue': '#268BD2', '--tag-green': '#859900', '--tag-purple': '#6C71C4',
  '--tag-orange': '#CB4B16', '--tag-yellow': '#B58900', '--tag-pink': '#D33682', '--tag-gray': '#657B83',
};

const tokyoNightStormDark: Record<string, string> = {
  '--bg-primary': '#24283B', '--bg-secondary': '#1F2233', '--bg-tertiary': '#2C3047',
  '--surface-color': '#24283B', '--surface-elevated': '#2C3047', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#CDD6F4', '--text-secondary': '#9AA5CE', '--text-muted': '#5A638A',
  '--border-color': '#343A4B', '--border-light': 'rgba(52,58,75,0.5)',
  '--glass-bg': 'rgba(36,40,59,0.65)', '--glass-border': 'rgba(122,162,247,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(36,40,59,0.8)', '--card-glass-border': 'rgba(122,162,247,0.08)', '--card-glass-accent': 'rgba(122,162,247,0.18)',
  '--hover-bg': 'rgba(205,214,244,0.05)', '--selection-bg': '#343A4B', '--accent-color': '#7AA2F7', '--accent-muted': 'rgba(122,162,247,0.12)', '--accent-hover': '#A6C8FF',
  '--pomodoro-primary': '#F7768E', '--pomodoro-track': 'rgba(247,118,142,0.2)',
  '--tag-red': '#F7768E', '--tag-blue': '#7AA2F7', '--tag-green': '#9ECE6A', '--tag-purple': '#BB9AF7',
  '--tag-orange': '#FF9E64', '--tag-yellow': '#E0AF68', '--tag-pink': '#D27E99', '--tag-gray': '#5A638A',
};

const materialLight: Record<string, string> = {
  '--bg-primary': '#FFFBFE', '--bg-secondary': '#F4EFF4', '--bg-tertiary': '#ECE6F0',
  '--surface-color': '#FFFBFE', '--surface-elevated': '#F4EFF4', '--surface-overlay': 'rgba(20,18,24,0.04)',
  '--text-primary': '#1C1B1F', '--text-secondary': '#49454F', '--text-muted': '#79747E',
  '--border-color': '#CAC4D0', '--border-light': 'rgba(202,196,208,0.5)',
  '--glass-bg': 'rgba(255,251,254,0.72)', '--glass-border': 'rgba(28,27,31,0.08)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(255,251,254,0.8)', '--card-glass-border': 'rgba(28,27,31,0.08)', '--card-glass-accent': 'rgba(103,80,164,0.18)',
  '--hover-bg': 'rgba(28,27,31,0.05)', '--selection-bg': '#E8DEF8', '--accent-color': '#6750A4', '--accent-muted': 'rgba(103,80,164,0.12)', '--accent-hover': '#5D4694',
  '--pomodoro-primary': '#B3261E', '--pomodoro-track': 'rgba(179,38,30,0.15)',
  '--tag-red': '#B3261E', '--tag-blue': '#3D5AFE', '--tag-green': '#146C2E', '--tag-purple': '#7C58B3',
  '--tag-orange': '#B3261E', '--tag-yellow': '#7D5700', '--tag-pink': '#984061', '--tag-gray': '#49454F',
};

const materialDark: Record<string, string> = {
  '--bg-primary': '#141218', '--bg-secondary': '#1D1B20', '--bg-tertiary': '#2B2930',
  '--surface-color': '#141218', '--surface-elevated': '#2B2930', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#E6E1E5', '--text-secondary': '#CAC4D0', '--text-muted': '#938F99',
  '--border-color': '#3A363E', '--border-light': 'rgba(58,54,62,0.5)',
  '--glass-bg': 'rgba(20,18,24,0.65)', '--glass-border': 'rgba(208,188,255,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(20,18,24,0.8)', '--card-glass-border': 'rgba(208,188,255,0.08)', '--card-glass-accent': 'rgba(208,188,255,0.18)',
  '--hover-bg': 'rgba(230,225,229,0.05)', '--selection-bg': '#3A363E', '--accent-color': '#D0BCFF', '--accent-muted': 'rgba(208,188,255,0.12)', '--accent-hover': '#E8DEF8',
  '--pomodoro-primary': '#F2B8B5', '--pomodoro-track': 'rgba(242,184,181,0.2)',
  '--tag-red': '#F2B8B5', '--tag-blue': '#ABC7FF', '--tag-green': '#B1C99B', '--tag-purple': '#D0BCFF',
  '--tag-orange': '#F2B8B5', '--tag-yellow': '#E7C27C', '--tag-pink': '#EF9A9A', '--tag-gray': '#CAC4D0',
};

const horizonLight: Record<string, string> = {
  '--bg-primary': '#FAFAFA', '--bg-secondary': '#F0F0F2', '--bg-tertiary': '#E4E4E8',
  '--surface-color': '#FAFAFA', '--surface-elevated': '#F0F0F2', '--surface-overlay': 'rgba(28,30,38,0.04)',
  '--text-primary': '#2C2E38', '--text-secondary': '#5F636E', '--text-muted': '#90949F',
  '--border-color': '#DDDDE0', '--border-light': 'rgba(221,221,224,0.5)',
  '--glass-bg': 'rgba(250,250,250,0.72)', '--glass-border': 'rgba(28,30,38,0.08)', '--glass-shine': 'rgba(255,255,255,0.4)',
  '--card-glass-bg': 'rgba(250,250,250,0.8)', '--card-glass-border': 'rgba(28,30,38,0.08)', '--card-glass-accent': 'rgba(233,86,120,0.18)',
  '--hover-bg': 'rgba(28,30,38,0.05)', '--selection-bg': '#F5C6D0', '--accent-color': '#E95678', '--accent-muted': 'rgba(233,86,120,0.12)', '--accent-hover': '#D14668',
  '--pomodoro-primary': '#E95678', '--pomodoro-track': 'rgba(233,86,120,0.15)',
  '--tag-red': '#E95678', '--tag-blue': '#4C9EBC', '--tag-green': '#7C9A5A', '--tag-purple': '#9B6EBC',
  '--tag-orange': '#E89D5C', '--tag-yellow': '#D4A74C', '--tag-pink': '#E37A9A', '--tag-gray': '#5F636E',
};

const horizonDark: Record<string, string> = {
  '--bg-primary': '#1C1E26', '--bg-secondary': '#161821', '--bg-tertiary': '#252833',
  '--surface-color': '#1C1E26', '--surface-elevated': '#252833', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#E7E7EA', '--text-secondary': '#9C9DA5', '--text-muted': '#5F636E',
  '--border-color': '#33353F', '--border-light': 'rgba(51,53,63,0.5)',
  '--glass-bg': 'rgba(28,30,38,0.65)', '--glass-border': 'rgba(233,86,120,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(28,30,38,0.8)', '--card-glass-border': 'rgba(233,86,120,0.08)', '--card-glass-accent': 'rgba(233,86,120,0.18)',
  '--hover-bg': 'rgba(231,231,234,0.05)', '--selection-bg': '#33353F', '--accent-color': '#E95678', '--accent-muted': 'rgba(233,86,120,0.12)', '--accent-hover': '#F06A8A',
  '--pomodoro-primary': '#F07178', '--pomodoro-track': 'rgba(240,113,120,0.2)',
  '--tag-red': '#F07178', '--tag-blue': '#4C9EBC', '--tag-green': '#7C9A5A', '--tag-purple': '#9B6EBC',
  '--tag-orange': '#E89D5C', '--tag-yellow': '#D4A74C', '--tag-pink': '#E37A9A', '--tag-gray': '#9C9DA5',
};

const palenightDark: Record<string, string> = {
  '--bg-primary': '#292D3E', '--bg-secondary': '#1F2233', '--bg-tertiary': '#383A4C',
  '--surface-color': '#292D3E', '--surface-elevated': '#383A4C', '--surface-overlay': 'rgba(0,0,0,0.3)',
  '--text-primary': '#A6ACCD', '--text-secondary': '#7B819C', '--text-muted': '#5C6178',
  '--border-color': '#3F4254', '--border-light': 'rgba(63,66,84,0.5)',
  '--glass-bg': 'rgba(41,45,62,0.65)', '--glass-border': 'rgba(199,146,234,0.08)', '--glass-shine': 'rgba(255,255,255,0.06)',
  '--card-glass-bg': 'rgba(41,45,62,0.8)', '--card-glass-border': 'rgba(199,146,234,0.08)', '--card-glass-accent': 'rgba(199,146,234,0.18)',
  '--hover-bg': 'rgba(166,172,205,0.05)', '--selection-bg': '#3F4254', '--accent-color': '#C792EA', '--accent-muted': 'rgba(199,146,234,0.12)', '--accent-hover': '#D4A6F0',
  '--pomodoro-primary': '#EB6F92', '--pomodoro-track': 'rgba(235,111,146,0.2)',
  '--tag-red': '#EB6F92', '--tag-blue': '#82AAFF', '--tag-green': '#7FDBCA', '--tag-purple': '#C792EA',
  '--tag-orange': '#F0A565', '--tag-yellow': '#F7C948', '--tag-pink': '#E77DB4', '--tag-gray': '#7B819C',
};

export const THEME_DEFINITIONS: Record<AppThemeKey, AppThemeDefinition> = {
  notion: { key: 'notion', label: 'Notion', emoji: '📝', description: '极简 · 文档感', accent: '#2383E2', surface: '#2F3437', supportedModes: 'both', light: notionLight, dark: notionDark },
  'tokyo-night': { key: 'tokyo-night', label: 'Tokyo Night', emoji: '🌃', description: '深邃 · 霓虹感', accent: '#7AA2F7', surface: '#1A1B26', supportedModes: 'dark', dark: tokyoNightDark },
  catppuccin: { key: 'catppuccin', label: 'Catppuccin', emoji: '🫧', description: '柔和 · 奶油色调', accent: '#CBA6F7', surface: '#1E1E2E', supportedModes: 'both', light: catppuccinLatte, dark: catppuccinMocha },
  dracula: { key: 'dracula', label: 'Dracula', emoji: '🧛', description: '高对比 · 暗黑风', accent: '#FF79C6', surface: '#282A36', supportedModes: 'dark', dark: draculaDark },
  everforest: { key: 'everforest', label: 'Everforest', emoji: '🌿', description: '自然 · 护眼感', accent: '#A7C080', surface: '#2D353B', supportedModes: 'both', light: everforestLight, dark: everforestDark },
  gruvbox: { key: 'gruvbox', label: 'Gruvbox', emoji: '🎞️', description: '复古 · 胶片感', accent: '#83A598', surface: '#282828', supportedModes: 'both', light: gruvboxLight, dark: gruvboxDark },
  github: { key: 'github', label: 'GitHub', emoji: '🐙', description: '工业 · 简洁感', accent: '#58A6FF', surface: '#0D1117', supportedModes: 'both', light: githubLight, dark: githubDark },
  ayu: { key: 'ayu', label: 'Ayu', emoji: '🌅', description: '清爽 · 现代化', accent: '#E6B450', surface: '#0B0E14', supportedModes: 'both', light: ayuLight, dark: ayuDark },
  linear: { key: 'linear', label: 'Linear', emoji: '📐', description: '科技 · 高级感', accent: '#5E6AD2', surface: '#1C1D24', supportedModes: 'both', light: linearLight, dark: linearDark },
  monokai: { key: 'monokai', label: 'Monokai', emoji: '🐍', description: '经典 · 暗色编辑器', accent: '#A6E22E', surface: '#272822', supportedModes: 'dark', dark: monokaiDark },
  nord: { key: 'nord', label: 'Nord', emoji: '❄️', description: '冰川 · 北欧风', accent: '#88C0D0', surface: '#2E3440', supportedModes: 'dark', dark: nordDark },
  'one-dark': { key: 'one-dark', label: 'One Dark Pro', emoji: '🌑', description: '经典 · 编辑器风', accent: '#528BFF', surface: '#282C34', supportedModes: 'dark', dark: oneDarkDark },
  'rose-pine': { key: 'rose-pine', label: 'Rosé Pine', emoji: '🌹', description: '浪漫 · 玫瑰金', accent: '#C4A7E7', surface: '#191724', supportedModes: 'both', light: rosePineDawn, dark: rosePineDark },
  solarized: { key: 'solarized', label: 'Solarized', emoji: '☀️', description: '经典 · 护眼感', accent: '#268BD2', surface: '#002B36', supportedModes: 'both', light: solarizedLight, dark: solarizedDark },
  'tokyo-night-storm': { key: 'tokyo-night-storm', label: 'Tokyo Night Storm', emoji: '🌊', description: '暴风雨 · 深邃蓝', accent: '#7AA2F7', surface: '#24283B', supportedModes: 'dark', dark: tokyoNightStormDark },
  material: { key: 'material', label: 'Material', emoji: '🎨', description: 'Material Design 3', accent: '#D0BCFF', surface: '#141218', supportedModes: 'both', light: materialLight, dark: materialDark },
  horizon: { key: 'horizon', label: 'Horizon', emoji: '🌅', description: '温暖 · 珊瑚色', accent: '#E95678', surface: '#1C1E26', supportedModes: 'both', light: horizonLight, dark: horizonDark },
  palenight: { key: 'palenight', label: 'Palenight', emoji: '🌙', description: 'Material Palenight', accent: '#C792EA', surface: '#292D3E', supportedModes: 'dark', dark: palenightDark },
};

export const THEME_LIST = Object.values(THEME_DEFINITIONS);

export function supportsMode(theme: AppThemeKey, mode: ThemeMode): boolean {
  const def = THEME_DEFINITIONS[theme];
  if (def.supportedModes === 'both') return true;
  return def.supportedModes === mode;
}

export function getEffectiveMode(theme: AppThemeKey, mode: ThemeMode): ThemeMode {
  if (supportsMode(theme, mode)) return mode;
  const def = THEME_DEFINITIONS[theme];
  if (def.supportedModes === 'dark') return 'dark';
  if (def.supportedModes === 'light') return 'light';
  return mode;
}

export function getThemeCSSVars(theme: AppThemeKey, mode: ThemeMode): Record<string, string> {
  const def = THEME_DEFINITIONS[theme];
  const effectiveMode = getEffectiveMode(theme, mode);
  if (effectiveMode === 'dark') return def.dark;
  return def.light ?? def.dark;
}

export function getAccentColor(theme: AppThemeKey): string {
  return THEME_DEFINITIONS[theme].accent;
}

export function getSurfaceColor(theme: AppThemeKey): string {
  return THEME_DEFINITIONS[theme].surface;
}