export const PUBLIC_URL = 'https://vuxiao.github.io/soundbreathe/';

export type TrackId = 'rain' | 'ocean' | 'fire' | 'crickets' | 'cosmos' | 'forest';

export type MixVolumes = Record<TrackId, number>;

export interface TrackConfig {
  id: TrackId;
  name: string;
  shortName: string;
  enName: string;
  subtitle: string;
  accent: string;
  glowRgba: [number, number, number];
}

export const TRACKS: TrackConfig[] = [
  {
    id: 'rain',
    name: '细雨落窗',
    shortName: '细雨',
    enName: 'Window Rain',
    subtitle: '滤波粉红噪声 · 柔和雨滴',
    accent: '#7dd3c8',
    glowRgba: [100, 198, 212],
  },
  {
    id: 'ocean',
    name: '深夜海浪',
    shortName: '海浪',
    enName: 'Midnight Tide',
    subtitle: 'LFO 潮汐调制 · 深海褐噪',
    accent: '#60a5fa',
    glowRgba: [68, 134, 218],
  },
  {
    id: 'fire',
    name: '壁炉柴火',
    shortName: '炉火',
    enName: 'Hearth Embers',
    subtitle: '低频暖噪 · 随机火星噼啪',
    accent: '#f0a675',
    glowRgba: [228, 138, 84],
  },
  {
    id: 'crickets',
    name: '夏夜虫鸣',
    shortName: '虫鸣',
    enName: 'Night Crickets',
    subtitle: '高频颤音调制 · 间歇节律',
    accent: '#a7e09b',
    glowRgba: [122, 196, 136],
  },
  {
    id: 'cosmos',
    name: '宇宙深空',
    shortName: '深空',
    enName: 'Deep Cosmos',
    subtitle: '低频 Drone 和弦 · 缓慢呼吸',
    accent: '#a5b4fc',
    glowRgba: [130, 138, 232],
  },
  {
    id: 'forest',
    name: '森林微风',
    shortName: '微风',
    enName: 'Pine Breeze',
    subtitle: '带通扫频白噪 · 轻拂林海',
    accent: '#5eead4',
    glowRgba: [76, 186, 168],
  },
];

export interface PresetConfig {
  id: string;
  name: string;
  tagline: string;
  volumes: MixVolumes;
  isCustom?: boolean;
}

export const BUILTIN_PRESETS: PresetConfig[] = [
  {
    id: 'rainy-solitude',
    name: '雨夜独处',
    tagline: '细雨敲窗，余烬微暖',
    volumes: {
      rain: 0.72,
      ocean: 0,
      fire: 0.34,
      crickets: 0,
      cosmos: 0.24,
      forest: 0,
    },
  },
  {
    id: 'seaside-drift',
    name: '海边发呆',
    tagline: '潮起潮落，松风伴虫鸣',
    volumes: {
      rain: 0,
      ocean: 0.78,
      fire: 0,
      crickets: 0.18,
      cosmos: 0,
      forest: 0.32,
    },
  },
  {
    id: 'deep-focus',
    name: '深度专注',
    tagline: '屏蔽喧嚣，沉入心流',
    volumes: {
      rain: 0.44,
      ocean: 0,
      fire: 0,
      crickets: 0,
      cosmos: 0.52,
      forest: 0.28,
    },
  },
  {
    id: 'winter-hearth',
    name: '冬日炉火',
    tagline: '围炉夜话，窗外风微凉',
    volumes: {
      rain: 0.28,
      ocean: 0,
      fire: 0.84,
      crickets: 0,
      cosmos: 0.14,
      forest: 0.22,
    },
  },
];

export const MOOD_SUGGESTIONS: string[] = [
  '今晚把心事交给雨声，明天再醒来。',
  '在深海的呼吸里，慢一点也没关系。',
  '窗外灯火渐熄，这一刻只属于自己。',
  '听见风穿过松林，焦虑便有了出口。',
];

export const CUSTOM_PRESETS_STORAGE_KEY = 'soundbreathe.custom_presets.v1';
export const LAST_MIX_STORAGE_KEY = 'soundbreathe.last_mix.v1';
