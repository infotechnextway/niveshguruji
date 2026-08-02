import type { Bar } from '../datafeed';
import type { LinePoint } from './helpers';

export interface ConfluenceSettings {
  enabled: boolean;
  showEMA: boolean;
  showSweep: boolean;
  showTrend: boolean;
  showGolden: boolean;
  showFib: boolean;
  showMTF: boolean;
  showSignals: boolean;
  emaFast: number;
  emaSlow: number;
  pivotLookback: number;
  swingLookback: number;
  volMaLength: number;
  rsiLength: number;
  goldenEmaLength: number;
  confluenceThreshold: number;
}

export const DEFAULT_CONFLUENCE_SETTINGS: ConfluenceSettings = {
  enabled: false,
  showEMA: true,
  showSweep: true,
  showTrend: true,
  showGolden: true,
  showFib: true,
  showMTF: true,
  showSignals: true,
  emaFast: 9,
  emaSlow: 15,
  pivotLookback: 5,
  swingLookback: 20,
  volMaLength: 20,
  rsiLength: 14,
  goldenEmaLength: 50,
  confluenceThreshold: 3,
};

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text?: string;
  size?: number;
}

export interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

export interface MtfRow {
  tf: string;
  bias: 'Bull' | 'Bear' | 'Neutral';
  ema9: number;
  ema15: number;
}

export interface TrendlineSegment {
  time1: number;
  price1: number;
  time2: number;
  price2: number;
  direction: 'up' | 'down';
}

export interface ConfluenceResult {
  emaFast: LinePoint[];
  emaSlow: LinePoint[];
  emaGolden: LinePoint[];
  markers: ChartMarker[];
  fibLevels: FibLevel[];
  goldenZoneTop: number;
  goldenZoneBottom: number;
  trendlines: TrendlineSegment[];
  mtf: MtfRow[];
  lastBullScore: number;
  lastBearScore: number;
  strongSignal: 'buy' | 'sell' | null;
}

export type { Bar };
