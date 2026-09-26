---
type: "Report"
title: "Freshness and source discrepancies"
description: "DevFridge investor knowledge: Freshness and source discrepancies"
resource: "https://connect.devfridge.cool"
tags: ["devfridge", "investors"]
timestamp: "2026-09-26T11:24:09Z"
generated: true
---

# Freshness and source discrepancies

Refresh attempted: **2026-09-26T11:24:09Z**. 67/68 source observations succeeded.

A daily snapshot is not real time. Data older than 36 hours should be treated as stale even if its last refresh succeeded. Read each record's last-success timestamp.

## Source failures

- `robinhood:0x29a13f8219d1d54424f1f9f1f90e85448488b2de / market`: stale · last successful observation: 2026-09-26T09:35:04Z · last attempt: 2026-09-26T11:24:09Z; HTTPError HTTP 500

## Published registry versus repository

No address disagreement detected in the character registry.

## Machine-readable evidence

[Snapshot JSON](../data/snapshot.json) stores per-source timestamps, state, errors, and observed values. [Configuration](../config.json) pins the expected identities.
