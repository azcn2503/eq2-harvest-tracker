const process = require("process");

const _ = require("lodash");
const Tail = require("tail").Tail;
const blessed = require("blessed");

let screen;
let table;
let tableBox;
let tableTitle;
let lastPullBox;
let lastPullText;
let lastPullTitle;
let lastPullTags;

function Pull(timestamp) {
  return {
    timestamp,
    rare: false,
    bountiful: false,
    harvests: []
  };
}

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
      },
      header: {
        bold: true
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

function buildHarvestMessage({ count, name, sourceNode, rare }, key) {
  return wrapLabel({
    rare,
    label: `${count} ${name} from ${sourceNode}`
  });
}

function wrapLabel({ rare, label }) {
  return `${rare ? "{yellow-fg}" : ""}${label}${rare ? "{/}" : ""}`;
}

function updateTable({ stats }) {
  if (Object.keys(stats.raw).length > 0) {
    const data = [
      ["Name", "Count"],
      ...Object.values(stats.raw).map(r => [
        wrapLabel({
          rare: r.rare,
          label: r.name
        }),
        wrapLabel({
          rare: r.rare,
          label: r.count
        })
      ])
    ];
    table.setData(data);
  }
}

function updateLastPull({ rare, bountiful, harvests = [] } = {}) {
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
  }
}

function initMonitor() {
  const tail = new Tail("./fixtures/eq2log_Fourchan.txt");

  const stats = {
    raw: {}
  };

  function updateStats({ count, name, sourceNode, rare }) {
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

  let pull = new Pull("");

  tail.on("line", data => {
    const [, timestamp] = /^\(\d+\)\[(.+?)\]/.exec(data) || [];
    if (!timestamp) {
      return;
    }

    if (timestamp !== pull.timestamp) {
      pull = new Pull(timestamp);
    }

    if (data.includes("You make a bountiful harvest")) {
      pull.bountiful = true;
    } else if (data.includes("You have found a rare item!")) {
      pull.rare = true;
    } else if (data.includes("You acquire")) {
      const match = /You acquire (\d+) \\aITEM.+?:(.+?)\\\/a from the (.+?)\./.exec(
        data
      );
      if (match) {
        const [, count, name, sourceNode] = match;
        pull.harvests.push({ count, name, sourceNode, rare: pull.rare });
        updateStats({ count, name, sourceNode, rare: pull.rare });
        updateLastPull(pull);
        updateTable({
          stats
        });
        screen.render();

        if (pull.rare) {
          pull.rare = false;
        }
      }
    }
  });

  updateTable({ stats });
}

initBlessed();
initMonitor();

screen.render();
