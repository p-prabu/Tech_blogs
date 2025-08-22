# Advanced `repadmin` Commands for Active Directory Replication

`repadmin` is the go‑to tool for **inspecting, monitoring, and fixing AD replication**. This guide covers advanced, real‑world commands, quick triage flows, and gotchas that senior AD admins use daily.

---

## Why `repadmin`?
- See **who replicates with whom**, when, and whether it worked.
- Inspect **attribute‑level metadata** (who changed what, and when).
- Force syncs (**/syncall**) and rebuild/verify topology.
- Detect and clean **lingering objects** and stale tombstones.
- Export **CSV** for reporting or dashboards.

> Tip: Run from an admin workstation with RSAT. No PS Remoting required; ensure RPC/LDAP ports to DCs are open.

---

## Quick Reference (Cheat Sheet)

| Command | What it does | When to use |
|---|---|---|
| `repadmin /replsummary` | Forest‑wide replication health summary | Daily snapshot |
| `repadmin /showrepl *` | Partners, last success/failure, per DC | Deep dive |
| `repadmin /showrepl * /errorsonly` | Only show replication failures | Triage |
| `repadmin /showrepl * /csv > C:\Reports\Replication.csv` | Export all partner status to CSV | Reporting/analytics |
| `repadmin /syncall DC1 /AeP` | Force full sync from DC1 (all partitions, cross‑site, push) | After changes |
| `repadmin /queue DC1` | View inbound replication queue | Backlog issues |
| `repadmin /showconn DC1` | Show connection objects (inbound neighbors) | Topology checks |
| `repadmin /showobjmeta DC1 "DN"` | Attribute‑level metadata for an object | Who changed what/when |
| `repadmin /showdel DC1` | List tombstoned objects | Delete replication checks |
| `repadmin /removelingeringobjects DC2 DC1 <DSA_GUID> /ADVISORY_MODE` | Detect lingering objects between DC2 (target) and DC1 (source) | Safe detection |
| `repadmin /removelingeringobjects DC2 DC1 <DSA_GUID>` | **Remove** lingering objects (no advisory) | Cleanup (with caution) |
| `repadmin /kcc DC1` | Trigger KCC recalculation | Topology refresh |
| `repadmin /failcache DC1` | Show cached replication failures | History review |

---

## Core Health Views

### 1) Forest‑wide snapshot
```powershell
repadmin /replsummary
```
- Shows **fails, error codes, largest delta, totals** per DC.
- If fails > 0 or deltas high, drill down with `/showrepl`.

### 2) Partner status per DC (all)
```powershell
repadmin /showrepl *
# Add /verbose for more, or /errorsonly to reduce noise
repadmin /showrepl * /errorsonly
```
- See inbound neighbors, last attempt, last success, error text.

### 3) Export to CSV (for Excel/Power BI)
```powershell
repadmin /showrepl * /csv > C:\Reports\Replication.csv
```

---

## Force & Control Replication

### 4) Push changes now (typical post‑change)
```powershell
repadmin /syncall DC1 /AeP
```
- `/A` all partitions, `/e` cross‑site, `/P` push.
- Add `/q` (quiet) to reduce console output.

### 5) Sync a specific partition from a specific partner
```powershell
repadmin /replicate DC1 DC2 "DC=contoso,DC=com"
```
- **Pull** from DC2 → DC1 for the domain partition.
- Use when a single pair is stale or blocked.

### 6) Rebuild topology
```powershell
repadmin /kcc DC1
```
- Triggers **KCC** (Knowledge Consistency Checker) to recalc connections.
- Useful after site/subnet/link changes or failed bridgeheads.

---

## Object‑Level Forensics

### 7) Who changed this user/computer, when?
```powershell
repadmin /showobjmeta DC1 "CN=John Doe,OU=HR,DC=contoso,DC=com"
```
- Shows **version, originating DC, originating time** per attribute.

### 8) Track DN rename/moves
```powershell
repadmin /showobjmeta DC1 "CN=John Doe,OU=HR,DC=contoso,DC=com" /historical
```
- Include historical entries (if available).

### 9) Verify deletes replicate
```powershell
repadmin /showdel DC1
```
- Lists **tombstoned** objects that still replicate during tombstone lifetime.

---

## Lingering Objects (High‑Stakes)

### Terms
- **Source DC**: The **authoritative** DC you trust.
- **Target DC**: The DC you suspect has **lingering** objects.

### 10) Detect (safe mode)
```powershell
repadmin /removelingeringobjects <TargetDC> <SourceDC> <Source_DSA_GUID> /ADVISORY_MODE
```
- No deletions, prints what would be removed.
- Run for **each partition** (Domain, Configuration, Schema, and any **app partitions** like DNS).

### 11) Cleanup (destructive)
```powershell
repadmin /removelingeringobjects <TargetDC> <SourceDC> <Source_DSA_GUID>
```
- **Removes** lingering objects. Ensure time is synchronized and replication topology is healthy first.

> How to get **Source_DSA_GUID**:
```powershell
# Method A
repadmin /showrepl <SourceDC> | findstr /i "DSA"
# Method B
repadmin /showrepl <SourceDC> /verbose
# Method C (PowerShell)
(Get-ADDomainController -Identity <SourceDC>).ObjectGUID
```

---

## Queues, Failures & Topology

### 12) Check inbound replication queue
```powershell
repadmin /queue DC1
```
- Large queues = **backlog** (network or partner failure).

### 13) Failure cache
```powershell
repadmin /failcache DC1
```
- Cached replication failures with codes and times.

### 14) Connection objects (neighbors)
```powershell
repadmin /showconn DC1
```
- Validates expected **bridgeheads** and site link effects.

---

## Real‑World Triage Flows

### A) Quick triage (errors only)
```powershell
repadmin /replsummary
repadmin /showrepl * /errorsonly
```
- Identify bad DCs/links fast; then drill down per DC with full `/showrepl`.

### B) One DC always failing from one partner
```powershell
repadmin /showrepl DC1
# Test name resolution both ways (A/PTR), RPC 135, LDAP 389, SMB 445, Kerberos 88.
# If OK, try:
repadmin /replicate DC1 DC2 "DC=contoso,DC=com"
repadmin /syncall DC1 /AeP
```

### C) Schema or forest‑wide change just applied
```powershell
repadmin /syncall /AdeP
```
- Ensure **schema/config** crosses site boundaries urgently.

### D) Suspected lingering objects after isolated DC outage
```powershell
repadmin /removelingeringobjects <Target> <Source> <GUID> /ADVISORY_MODE
# If reported, plan maintenance window and run without /ADVISORY_MODE
```

---

## Reporting & Automation

### CSV Export for dashboards
```powershell
repadmin /showrepl * /csv > C:\Reports\Replication.csv
```

### PowerShell: parse failing partners to a table
```powershell
$csv = Import-Csv C:\Reports\Replication.csv
$errors = $csv | Where-Object { $_.'Number of Failures' -gt 0 -or $_.Result -notmatch '0x0|The operation completed successfully' }
$errors | Select-Object Source DSA, Destination DSA, Partition, Result, Last Success, Last Failure |
    Format-Table -Auto
```

### Daily job (pseudo)
```powershell
repadmin /replsummary > C:\Reports\Daily_ReplSummary.txt
repadmin /showrepl * /csv > C:\Reports\Daily_ShowRepl.csv
# Parse & email with your preferred script
```

---

## Permissions & Network Prereqs
- **Domain Admin** or delegated rights to query replication metadata.
- Open ports: **TCP 135 (RPC)**, dynamic RPC (default TCP **49152–65535**), **LDAP 389**, **Kerberos 88**, **SMB 445**, and **RPC over AD** as required.
- Accurate **time sync** across DCs (W32Time).

---

## Common Error Codes (Decoding)
- `1722 (0x6BA)`: **RPC server unavailable** → Firewall/RPC endpoint.
- `5 (0x5)`: **Access denied** → Permissions or secure channel.
- `58 (0x3A)`: **Network name cannot be found** → DNS/Netlogon/SPNs.
- `8453 (0x2105)`: **Replication access denied** → AD perms/rights.
- `8606 (0x219E)`: **Insufficient attributes** → Schema mismatch/conflict.
- `1908 (0x774)`: **Could not find the domain controller** → Locator/DNS.

---

## Gotchas & Best Practices
- Always check **DNS** first: A/PTR records and SRV under `_msdcs`.
- Watch **Largest Delta** in `/replsummary`; high deltas indicate stale DCs.
- After site/subnet changes, run `/kcc` and verify `/showconn` before forcing syncs.
- For lingering cleanup, ensure **tombstone lifetime** is consistent and **Time Skew** is under control.
- Document and **export CSV** before remediation for audit trail.

---

## See Also
- Pair with `dcdiag` for DC‑level health: `dcdiag /q`, `dcdiag /test:dns /dnsall /v`
- Event Logs: **Directory Service**, **DFS Replication**, **File Replication Service** (legacy), **DNS Server**

---

**Author’s note:** These patterns map to common enterprise incidents (site outages, schema upgrades, DC isolation). Adjust paths and targets to your environment.
