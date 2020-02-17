import { PullType } from "./types";

class Pull {
  timestamp: number;
  constructor(timestamp: number) {
    this.timestamp = timestamp;
  }
  get(): PullType {
    return {
      timestamp: this.timestamp,
      rare: false,
      bountiful: false,
      harvests: []
    };
  }
}

export default Pull;
