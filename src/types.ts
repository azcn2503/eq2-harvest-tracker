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
};

export type HarvestType = {
  count: number;
  name: string;
  sourceNode: string;
  rare: boolean;
};

export type PullType = {
  timestamp: number;
  rare: boolean;
  bountiful: boolean;
  harvests: HarvestType[];
};
