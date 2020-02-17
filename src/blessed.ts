import * as blessed from "blessed";

class Blessed {
  init() {
    let screen;
    let table;
    let tableBox;
    let tableTitle;
    let lastPullBox;
    let lastPullText;
    let lastPullTitle;
    let lastPullTags;

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
        hover: {
          border: {
            fg: "cyan"
          }
        },
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
      style: {
        hover: {
          border: {
            fg: "cyan"
          }
        }
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

    return {
      screen,
      table,
      tableBox,
      tableTitle,
      lastPullBox,
      lastPullText,
      lastPullTitle,
      lastPullTags
    };
  }
}

export default Blessed;
