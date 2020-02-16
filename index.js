const process = require("process");

const _ = require("lodash");
const Tail = require("tail").Tail;
const blessed = require("blessed");

let box;
let screen;
let table;

function initBlessed() {
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
    align: "left"
  });

  tableTitle = blessed.text({
    parent: tableBox,
    top: 0,
    left: 2,
    // width: 10,
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
    }
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

  screen.append(tableBox);
  screen.append(lastPullBox);

  // Quit on Escape, q, or Control-C.
  screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
  });
}

function buildPullMessage({ count, name, sourceNode, flags }) {
  return `${
    flags.rare ? "{yellow-fg}" : ""
  }${count} ${name} from ${sourceNode}${flags.rare ? "{/}" : ""}`;
}

function updateTable({ stats }) {
  if (Object.keys(stats.raw).length > 0) {
    const data = [
      ["Name", "Count"],
      ...Object.values(stats.raw).map(r => [
        `${r.flags.rare ? "* " : ""}${r.name}`,
        `${r.count}`
      ])
    ];
    table.setData(data);
  }
}

function updateLastPull({ count, name, sourceNode, flags, pullCache }) {
  if (sourceNode) {
    lastPullText.content = `Last pull:\n${buildPullMessage({
      count,
      name,
      sourceNode,
      flags
    })}`;
  } else {
    lastPullText.content = "Harvest something to get started...";
  }
}

function initMonitor() {
  const tail = new Tail(
    "/mnt/8fabaada-c55f-42bb-b504-7b34f3e038b2/Games/Lutris/EverQuest II/drive_c/users/Public/Daybreak Game Company/Installed Games/EverQuest II/logs/Thurgadin/eq2log_Fourchan.txt"
  );

  const stats = {
    raw: {}
  };

  let flags = {
    rare: false,
    bountiful: 0
  };

  let pullCache = [];

  function processHarvest({ count, name, sourceNode }) {
    const { count: statsCount = 0, sourceNodes: statsSourceNodes = [] } =
      stats.raw[name] || {};
    stats.raw[name] = {
      ...stats.raw[name],
      flags: Object.assign({}, flags),
      name,
      count: statsCount + +count,
      sourceNodes: _.uniq([...statsSourceNodes, sourceNode])
    };
    const sorted = _.sortBy(stats.raw, stat => stat.count).reverse();
    const sortedObj = {};
    sorted.forEach(raw => (sortedObj[raw.name] = raw));
    stats.raw = sortedObj;
  }

  let lastTimestamp = "";
  let pull = {};

  tail.on("line", data => {
    const [timestamp] = /^\(\d+\)/.exec(data) || [];
    if (!timestamp) {
      return;
    }

    debugger;

    if (data.includes("You make a bountiful harvest")) {
      flags.bountiful = 1;
    } else if (data.includes("You have found a rare item!")) {
      flags.rare = true;
    } else if (data.includes("You acquire")) {
      const match = /You acquire (\d+) \\aITEM.+?:(.+?)\\\/a from the (.+?)\./.exec(
        data
      );
      if (match) {
        if (flags.pullCache === 0) {
          pullCache = [];
        }
        const [, count, name, sourceNode] = match;
        pullCache.push({
          count,
          name,
          sourceNode,
          flags: Object.assign({}, flags)
        });
        processHarvest({ count, name, sourceNode });
        updateTable({
          stats
        });
        updateLastPull({
          count,
          name,
          sourceNode,
          flags,
          pullCache
        });
        screen.render();

        if (flags.rare) {
          flags.rare = false;
        }

        if (flags.bountiful === 1) {
          flags.bountiful += 1;
        } else if (flags.bountiful === 2) {
          flags.bountiful = 0;
        }
      }
    }
  });

  updateTable({ stats });
}

initBlessed();
initMonitor();

screen.render();
