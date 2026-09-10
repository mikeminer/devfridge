---
type: "Report"
title: "Freshness and source discrepancies"
description: "DevFridge investor knowledge: Freshness and source discrepancies"
resource: "https://connect.devfridge.cool"
tags: ["devfridge", "investors"]
timestamp: "2026-09-10T15:18:04Z"
generated: true
---

# Freshness and source discrepancies

Refresh attempted: **2026-09-10T15:18:04Z**. 67/68 source observations succeeded.

A daily snapshot is not real time. Data older than 36 hours should be treated as stale even if its last refresh succeeded. Read each record's last-success timestamp.

## Source failures

- `robinhood:0xf7aca11cdb86115eedce7da43c5326a12408201e / market`: stale · last successful observation: 2026-09-10T11:19:21Z · last attempt: 2026-09-10T15:18:04Z; HTTPError HTTP 500

## Published registry versus repository

No address disagreement detected in the character registry.

## Machine-readable evidence

[Snapshot JSON](../data/snapshot.json) stores per-source timestamps, state, errors, and observed values. [Configuration](../config.json) pins the expected identities.
