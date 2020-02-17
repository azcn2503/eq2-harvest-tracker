import * as blessed from "blessed";

class Blessed {
  init() {
    const screen = blessed.screen({
      smartCSR: true
    });

    screen.title = "Harvest Monitor";

    const tableBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: "100%-5"
    });

    const table = blessed.table({
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

    const tableTitle = blessed.text({
      parent: tableBox,
      top: 0,
      left: 2,
      content: " Harvest table ",
      style: {
        bg: "white",
        fg: "black"
      }
    });

    const lastPullBox = blessed.box({
      top: "100%-5",
      width: "100%",
      height: 5
    });

    const lastPullText = blessed.box({
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

    const lastPullTitle = blessed.text({
      parent: lastPullBox,
      top: "100%-5",
      left: 2,
      style: {
        bg: "white",
        fg: "black"
      },
      content: " Last pull "
    });

    const lastPullTags = blessed.text({
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
