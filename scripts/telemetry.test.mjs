import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const mainScript = readFileSync("docs/assets/js/main.js", "utf8");
const telemetryBundle = readFileSync(
  "docs/assets/js/mssql-agent-skills-telemetry.js",
  "utf8",
);
const analyticsRouter = readFileSync("docs/_includes/analytics.html", "utf8");
const appInsightsInclude = readFileSync(
  "docs/_includes/analytics/app-insights.html",
  "utf8",
);
const oneDsInclude = readFileSync("docs/_includes/analytics/one-ds.html", "utf8");
const config = readFileSync("docs/_config.yml", "utf8");
const homeLayout = readFileSync("docs/_layouts/home.html", "utf8");
const pageLayout = readFileSync("docs/_layouts/page.html", "utf8");
const privacy = readFileSync("docs/privacy.md", "utf8");

test("loads both existing App Insights and shared 1DS providers", () => {
  assert.ok(existsSync("docs/_includes/analytics/app-insights.html"));
  assert.match(analyticsRouter, /analytics\/app-insights\.html/);
  assert.match(analyticsRouter, /analytics\/one-ds\.html/);
  assert.match(config, /one_ds_instrumentation_key:/);
  assert.match(oneDsInclude, /sourceId: "azure-sql-database-container"/);
  assert.match(
    telemetryBundle,
    /Generated from AgentSkills telemetry\/browser-global\.mjs/,
  );
  assert.match(
    telemetryBundle,
    /mobile\.events\.data\.microsoft\.com\/OneCollector\/1\.0/,
  );
});

test("emits a comparable page-view action to App Insights and 1DS", () => {
  const appInsightsCalls = [];
  const oneDsCalls = [];
  const context = {
    URL,
    console: { log() {}, warn() {} },
    document: {
      body: {
        getAttribute(name) {
          return name === "data-view" ? "mainPage" : null;
        },
      },
      documentElement: { classList: { add() {} } },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      referrer: "",
    },
    history: { replaceState() {} },
    location: {
      href: "https://microsoft.github.io/azure-sql-database-container/",
      origin: "https://microsoft.github.io",
      pathname: "/azure-sql-database-container/",
    },
    navigator: {
      language: "en-US",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    },
    setTimeout,
    window: {
      appInsights: {
        trackEvent(eventValue, properties, measurements) {
          appInsightsCalls.push({ eventValue, measurements, properties });
        },
      },
      mssqlAgentSkillsTelemetry: {
        track(name, properties, measurements) {
          oneDsCalls.push({ measurements, name, properties });
        },
      },
    },
  };

  vm.runInNewContext(mainScript, context);

  assert.deepEqual(
    oneDsCalls.map(({ name }) => name),
    ["site/action"],
  );
  assert.equal(oneDsCalls[0].properties.action, "pageView");
  assert.equal(oneDsCalls[0].properties.view, "mainPage");
  assert.equal(oneDsCalls[0].properties.pagePath, "/azure-sql-database-container/");
  assert.equal(oneDsCalls[0].properties.browserFamily, "safari");
  assert.equal(oneDsCalls[0].measurements.count, 1);
  assert.equal(appInsightsCalls[0].eventValue.name, "site/action");
  assert.equal(appInsightsCalls[0].properties.action, "pageView");
});

test("uses the shared site action vocabulary", () => {
  for (const marker of [
    'track("site/action", { action: "pageView"',
    'action: "contentCopied"',
    'action: "copyPrompt"',
    'action: "viewPrompt"',
    'action: "contentOpened"',
    'action: "runtimeSelected"',
    'action: "pathSelected"',
    'action: "mediaEngaged"',
    'action: "outboundClicked"',
  ]) {
    assert.ok(mainScript.includes(marker), `Missing ${marker}`);
  }
  for (const oldName of [
    '"copy_command"',
    '"copy_code"',
    '"copy_prompt"',
    '"outbound_click"',
  ]) {
    assert.ok(!mainScript.includes(oldName), `Found obsolete event ${oldName}`);
  }
});

test("provides stable view and privacy documentation", () => {
  assert.match(homeLayout, /data-view="mainPage"/);
  assert.match(pageLayout, /data-view="\{\{ page\.name/);
  assert.match(privacy, /1DS\/OneCollector/);
  assert.match(privacy, /sessionStorage/);
  assert.match(privacy, /never include the content you view or copy|never include the content/i);
  assert.match(appInsightsInclude, /navigator\.doNotTrack === "1"/);
  assert.match(oneDsInclude, /navigator\.doNotTrack === "1"/);
});
