import * as process from "process";

import * as _ from "lodash";
import { Tail } from "tail";
import * as blessed from "blessed";

const [, , pathToLogFile] = process.argv;

const HARVEST_VERB_PATTERN = "(acquire|mined|catch|forest|gathered)";
const harvestTestRegExp = new RegExp(`You ${HARVEST_VERB_PATTERN}`);
const harvestMatchRegExp = new RegExp(
  `You ${HARVEST_VERB_PATTERN} (\\d+) \\\\aITEM.+?:(.+?)\\\\\/a from the (.+?)\\.`
);

if (!pathToLogFile) {
  console.error("No path to log file provided");
  process.exit(1);
}

let screen;
let table;
let tableBox;
let tableTitle;
let lastPullBox;
let lastPullText;
let lastPullTitle;
let lastPullTags;
let lastPullInterval: NodeJS.Timeout;

type HarvestType = {
  count: number;
  name: string;
  sourceNode: string;
  rare: boolean;
};

type PullType = {
  timestamp: number;
  rare: boolean;
  bountiful: boolean;
  harvests: HarvestType[];
};

type StatsType = {
  raw: RawCollectionType;
};

type RawCollectionType = {
  [key: string]: RawType;
};

type RawType = {
  rare: boolean;
  name: string;
  count: number;
  sourceNodes: string[];
};

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

function initBlessed(): void {
  screen = blessed.screen({
    smartCSR: true
  });

  screen.title = "Harvest Monitor";

  tableBox = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: "100%-5"
  });

  table = blessed.table({
    parent: tableBox,
    width: "100%",
    height: "100%",
    scrollable: true,
    keys: true,
    mouse: true,
    style: {
      scrollbar: {
        fg: "white",
        bg: "black"
      }
    },
    data: [],
    border: {
      type: "line"
    },
    align: "left",
    tags: true
  });

  tableTitle = blessed.text({
    parent: tableBox,
    top: 0,
    left: 2,
    content: " Harvest table ",
    style: {
      bg: "white",
      fg: "black"
    }
  });

  lastPullBox = blessed.box({
    top: "100%-5",
    width: "100%",
    height: 5
  });

  lastPullText = blessed.box({
    parent: lastPullBox,
    width: "100%",
    height: "100%",
    border: {
      type: "line"
    },
    scrollable: true,
    mouse: true,
    keys: true,
    tags: true
  });

  lastPullTitle = blessed.text({
    parent: lastPullBox,
    top: "100%-5",
    left: 2,
    style: {
      bg: "white",
      fg: "black"
    },
    content: " Last pull "
  });

  lastPullTags = blessed.text({
    parent: lastPullBox,
    top: "100%-5",
    right: 2,
    style: {
      bg: "white",
      fg: "black"
    },
    content: ""
  });

  screen.append(tableBox);
  screen.append(lastPullBox);

  // Quit on Escape, q, or Control-C.
  screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
  });
}

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

function updateTable(stats: StatsType): void {
  if (Object.keys(stats.raw).length > 0) {
    const data = Object.values(stats.raw).map(r => [
      wrapLabel({
        rare: r.rare,
        label: r.name
      }),
      wrapLabel({
        rare: r.rare,
        label: `${r.count}`
      })
    ]);

    table.setData(data);
  }
}

function updateLastPullTimer(timestamp: number): void {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  lastPullTitle.setContent(
    ` Last pull (${seconds} second${seconds !== 1 ? "s" : ""} ago) `
  );
  screen.render();
}

function updateLastPull({
  timestamp,
  bountiful,
  harvests = []
}: PullType): void {
  if (harvests.length) {
    lastPullText.setContent(`${harvests.map(buildHarvestMessage).join("\n")}`);
    let tags = [];
    if (harvests.some(h => h.rare)) {
      tags.push("rare");
    }
    if (bountiful) {
      tags.push("bountiful");
    }
    lastPullTags.setContent(` ${tags.join(", ")} `);
    clearInterval(lastPullInterval);
    updateLastPullTimer(timestamp);
    lastPullInterval = setInterval(() => updateLastPullTimer(timestamp), 1000);
  }
}

function initMonitor(): void {
  const tail = new Tail(
    "/mnt/8fabaada-c55f-42bb-b504-7b34f3e038b2/Games/Lutris/EverQuest II/drive_c/users/Public/Daybreak Game Company/Installed Games/EverQuest II/logs/Thurgadin/eq2log_Fourchan.txt"
  );

  const stats: StatsType = {
    raw: {}
  };

  function updateStats({ count, name, sourceNode, rare }): void {
    const { count: statsCount = 0, sourceNodes: statsSourceNodes = [] } =
      stats.raw[name] || {};
    stats.raw[name] = {
      ...stats.raw[name],
      rare,
      name,
      count: statsCount + +count,
      sourceNodes: _.uniq([...statsSourceNodes, sourceNode])
    };
    const sorted = _.sortBy(stats.raw, stat => stat.count).reverse();
    const sortedObj = {};
    sorted.forEach(raw => (sortedObj[raw.name] = raw));
    stats.raw = sortedObj;
  }

  let pull = new Pull(0).get();

  tail.on("line", data => {
    const timestamp = +new Date();

    // 500ms to allow for delay in filesystem writing related lines.
    // less time than a harvest takes.
    if (timestamp > pull.timestamp + 500) {
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
        updateStats({ count: +count, name, sourceNode, rare: pull.rare });
        updateLastPull(pull);
        updateTable(stats);
        screen.render();

        if (pull.rare) {
          pull.rare = false;
        }
      }
    }
  });

  updateTable(stats);
}

initBlessed();
initMonitor();

screen.render();
