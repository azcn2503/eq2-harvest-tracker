import * as _ from "lodash";
import { Tail } from "tail";
import config from "config";

import Pull from "./pull";
import { HarvestType, PullType, StatsType } from "./types";

const HARVEST_VERB_PATTERN = `(${config.pullVerbs.join("|")})`;
const harvestTestRegExp = new RegExp(`You ${HARVEST_VERB_PATTERN}`);
const harvestMatchRegExp = new RegExp(
  `You ${HARVEST_VERB_PATTERN} (\\d+) \\\\aITEM.+?:(.+?)\\\\\/a from the (.+?)\\.`
);

function buildHarvestMessage({
  count,
  name,
  sourceNode,
  rare
}: HarvestType): string {
  return wrapLabel({
    rare,
    label: `${count} ${name} from ${sourceNode}`
  });
}

function wrapLabel({ rare, label }: { rare: boolean; label: string }): string {
  return `${rare ? "{yellow-fg}" : ""}${label}${rare ? "{/}" : ""}`;
}

class LogMonitor {
  private pathToLogFile: string;
  private screen;
  private table;
  private lastPullText;
  private lastPullTitle;
  private lastPullTags;
  private lastPullInterval: NodeJS.Timeout;
  private stats: StatsType;

  constructor({
    pathToLogFile,
    screen,
    table,
    lastPullText,
    lastPullTitle,
    lastPullTags
  }) {
    this.pathToLogFile = pathToLogFile;
    this.screen = screen;
    this.table = table;
    this.lastPullText = lastPullText;
    this.lastPullTitle = lastPullTitle;
    this.lastPullTags = lastPullTags;
    this.stats = {
      raw: {}
    };
  }

  updateLastPull({ timestamp, bountiful, harvests = [] }: PullType): void {
    if (harvests.length) {
      this.lastPullText.setContent(
        `${harvests.map(buildHarvestMessage).join("\n")}`
      );
      let tags = [];
      if (harvests.some(h => h.rare)) {
        tags.push("rare");
      }
      if (bountiful) {
        tags.push("bountiful");
      }
      this.lastPullTags.setContent(` ${tags.join(", ")} `);
      clearInterval(this.lastPullInterval);
      this.updateLastPullTimer(timestamp);
      this.lastPullInterval = setInterval(
        () => this.updateLastPullTimer(timestamp),
        1000
      );
    }
  }

  updateLastPullTimer(timestamp: number): void {
    const seconds = Math.round((Date.now() - timestamp) / 1000);
    this.lastPullTitle.setContent(
      ` Last pull (${seconds} second${seconds !== 1 ? "s" : ""} ago) `
    );
    this.screen.render();
  }

  updateRaw(name: string, diff: { [key: string]: any }): void {
    this.stats.raw[name] = {
      ...this.stats.raw[name],
      ...diff
    };
  }

  updateStats({ count, name, sourceNode, rare }): void {
    const { count: statsCount = 0, sourceNodes: statsSourceNodes = [] } =
      this.stats.raw[name] || {};
    this.updateRaw(name, {
      rare,
      name,
      count: statsCount + +count,
      sourceNodes: _.uniq([...statsSourceNodes, sourceNode])
    });
    const sorted = _.sortBy(this.stats.raw, stat => stat.count).reverse();
    const sortedObj = {};
    sorted.forEach(raw => (sortedObj[raw.name] = raw));
    this.stats.raw = sortedObj;
  }

  updateTable(): void {
    if (Object.keys(this.stats.raw).length > 0) {
      const data = Object.values(this.stats.raw).map(r => [
        wrapLabel({
          rare: r.rare,
          label: r.name
        }),
        wrapLabel({
          rare: r.rare,
          label: `${r.count}`
        })
      ]);

      this.table.setData(data);
      this.screen.render();
    }
  }

  start() {
    const tail = new Tail(this.pathToLogFile);

    const stats: StatsType = {
      raw: {}
    };

    let pull = new Pull(0).get();

    tail.on("line", data => {
      const timestamp = +new Date();

      // A pull can include multiple rares and bountiful harvests spread over separate log lines.
      // A pull is therefore scoped to a fixed block of time in the log file.
      // Here, we check if the current timestamp is greater than the previous pull timestamp plus the "minimum pull duration",
      // which in the Blood of Luclin expansion can be as low as 750ms.
      if (timestamp > pull.timestamp + config.minimumPullDuration) {
        pull = new Pull(timestamp).get();
      }

      if (data.includes("You make a bountiful harvest")) {
        pull.bountiful = true;
      } else if (data.includes("You have found a rare item!")) {
        pull.rare = true;
      } else if (harvestTestRegExp) {
        const match = harvestMatchRegExp.exec(data);
        if (match) {
          const [, verb, count, name, sourceNode] = match;
          pull.harvests.push({
            count: +count,
            name,
            sourceNode,
            rare: pull.rare
          });
          this.updateStats({
            count: +count,
            name,
            sourceNode,
            rare: pull.rare
          });
          this.updateLastPull(pull);
          this.updateTable();

          if (pull.rare) {
            pull.rare = false;
          }
        }
      }
    });

    this.updateTable();
    this.screen.render();
  }
}

export default LogMonitor;
