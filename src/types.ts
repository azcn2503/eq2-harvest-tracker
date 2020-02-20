import * as blessed from "./blessed";

export type StatsType = {
  raw: RawCollectionType;
};

export type RawCollectionType = {
  [key: string]: RawType;
};

export type RawType = {
  rare: boolean;
  name: string;
  count: number;
  sourceNodes: string[];
  value?: number;
};

export type HarvestType = {
  count: number;
  name: string;
  sourceNode?: string;
  rare?: boolean;
  pony?: boolean;
};

export type PullType = {
  timestamp: number;
  rare: boolean;
  bountiful: boolean;
  pony: boolean;
  harvests: HarvestType[];
};
