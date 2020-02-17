import * as process from "process";

import Blessed from "./blessed";
import LogMonitor from "./log-monitor";

const [, , pathToLogFile] = process.argv;

if (!pathToLogFile) {
  console.error("No path to log file provided");
  process.exit(1);
}

const blessedElements = new Blessed().init();

new LogMonitor({
  pathToLogFile,
  ...blessedElements
}).start();
