---
title: Privacy and analytics
description: What this site measures, how, and how to opt out.
---

This site uses privacy-preserving analytics to understand which content and scenarios help developers, so the team can improve them. This page explains what is collected and how to opt out.

## What we measure

The site sends usage telemetry to the existing Azure Application Insights resource and to
Microsoft's first-party 1DS/OneCollector telemetry system. The shared 1DS event contract makes
this site's engagement directly comparable with the Azure SQL Developer Hub. We collect:

- **Page views:** which pages are visited, the referrer, and general browser and device information.
- **A small set of interaction events:** copying a build prompt, viewing a prompt, opening a skill,
  copying an install or setup command, copying a code block, selecting a container runtime, moving
  between the local and cloud examples, starting the demo, and clicking a link that leaves the
  site.
- **A short-lived pseudonymous session ID:** a random ID stored in `sessionStorage` for the current
  browser tab. It is not based on an account, device, IP address, or browser fingerprint, and it
  does not persist after the tab session ends.

Interaction events include stable non-personal labels such as `view`, `action`, `scenario`,
`contentId`, `harnessId`, `runtimeId`, or destination category. They never include the content you
view or copy.

## What we do not collect

- No accounts, names, email addresses, GitHub usernames, or other account identifiers.
- No connection strings, passwords, SQL, or code you read or copy from the page.
- No advertising or cross-site tracking.

## Cookies and consent

Both browser telemetry clients run **cookieless**. The random session ID is stored only in
`sessionStorage` and is used for short on-site funnels rather than cross-session tracking.

## Data residency and retention

Telemetry is stored in Microsoft-owned Application Insights and 1DS/Aria destinations and is
retained for a limited period for trend analysis.

## How to opt out

Enable **Do Not Track** in your browser, or block requests to `js.monitor.azure.com`,
`*.applicationinsights.azure.com`, and `mobile.events.data.microsoft.com` with your browser's
tracking protection or an extension. The site works fully with analytics blocked.

## Questions

Reach the team through the links in the site footer.
