/**
 * scripts/install-daily-backup.ts
 *
 * Installs a macOS LaunchAgent that runs `bun run backup:db` every day at
 * 11:15 PM local machine time.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const LABEL = "com.localserviceos.database-backup";
const PROJECT_ROOT = join(import.meta.dir, "..");
const PLIST_PATH = join(homedir(), "Library/LaunchAgents", `${LABEL}.plist`);
const LOG_DIR = join(PROJECT_ROOT, "backups/logs");
const OUT_LOG = join(LOG_DIR, "daily-backup.out.log");
const ERR_LOG = join(LOG_DIR, "daily-backup.err.log");
const HOUR = 23;
const MINUTE = 15;
const BUN_CANDIDATES = [
  "/opt/homebrew/bin/bun",
  "/usr/local/bin/bun",
  process.execPath,
];

function usage(): void {
  console.log(`
Daily backup scheduler

  bun run backup:schedule:install
    Install the daily macOS backup schedule.

  bun run backup:schedule:status
    Show whether the schedule is loaded.

  bun run backup:schedule:uninstall
    Remove the daily backup schedule.
`);
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plist(): string {
  const bunPath = BUN_CANDIDATES.find((path) => existsSync(path)) ?? process.execPath;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(LABEL)}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(bunPath)}</string>
    <string>run</string>
    <string>backup:db</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${xmlEscape(PROJECT_ROOT)}</string>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${HOUR}</integer>
    <key>Minute</key>
    <integer>${MINUTE}</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>${xmlEscape(OUT_LOG)}</string>

  <key>StandardErrorPath</key>
  <string>${xmlEscape(ERR_LOG)}</string>
</dict>
</plist>
`;
}

function runLaunchctl(args: string[], allowFailure = false): void {
  const result = spawnSync("launchctl", args, {
    encoding: "utf-8",
    stdio: allowFailure ? "pipe" : "inherit",
  });

  if (allowFailure) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.error && !allowFailure) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }
}

function serviceTarget(): string {
  return `gui/${process.getuid()}`;
}

function install(): void {
  if (process.platform !== "darwin") {
    console.error("Daily backup scheduling is currently implemented for macOS launchd.");
    process.exit(1);
  }

  mkdirSync(dirname(PLIST_PATH), { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(PLIST_PATH, plist());

  runLaunchctl(["bootout", serviceTarget(), PLIST_PATH], true);
  runLaunchctl(["bootstrap", serviceTarget(), PLIST_PATH]);
  runLaunchctl(["enable", `${serviceTarget()}/${LABEL}`]);

  console.log(`
Daily backup schedule installed.

Schedule: every day at 11:15 PM local machine time
Command:  bun run backup:db
Plist:    ${PLIST_PATH}
Logs:     ${OUT_LOG}
          ${ERR_LOG}

If this Mac is asleep at 11:15 PM, launchd will run the job when the Mac wakes.
`);
}

function uninstall(): void {
  runLaunchctl(["bootout", serviceTarget(), PLIST_PATH], true);

  if (existsSync(PLIST_PATH)) {
    unlinkSync(PLIST_PATH);
  }

  console.log(`\nDaily backup schedule removed: ${PLIST_PATH}\n`);
}

function status(): void {
  console.log(`\nSchedule file: ${PLIST_PATH}`);

  if (existsSync(PLIST_PATH)) {
    console.log("\nInstalled plist:\n");
    console.log(readFileSync(PLIST_PATH, "utf-8"));
  } else {
    console.log("\nDaily backup schedule is not installed.\n");
  }

  console.log("\nlaunchctl status:\n");
  runLaunchctl(["print", `${serviceTarget()}/${LABEL}`], true);
}

const command = process.argv[2] ?? "install";

if (command === "install") {
  install();
} else if (command === "uninstall") {
  uninstall();
} else if (command === "status") {
  status();
} else if (command === "help" || command === "--help" || command === "-h") {
  usage();
} else {
  console.error(`Unknown schedule command: ${command}`);
  usage();
  process.exit(1);
}
