# Advanced `dcdiag` Commands for Active Directory Health Checks

`dcdiag` (Domain Controller Diagnostic) is a built‑in Windows Server tool that runs targeted tests against Domain Controllers (DCs) to validate health, configuration, and connectivity. Beyond the basic `dcdiag`, these **advanced commands** help you perform enterprise‑grade troubleshooting and routine health assessments.

---

## Why `dcdiag` matters
- Detects **replication failures** and topology issues
- Validates **DNS registration** and name resolution (critical for AD)
- Confirms **FSMO role** availability and reachability
- Checks **essential services** (KDC, Netlogon, W32Time, DNS)
- Surfaces **site, SYSVOL/Netlogon, and advertising** problems

> Tip: You don’t need PowerShell Remoting for `dcdiag /s:<DC>`; it uses RPC/LDAP/Netlogon. Ensure AD ports are open and you have sufficient permissions.

---

## Quick Reference (Cheat Sheet)

| Command | What it does | When to use |
|---|---|---|
| `dcdiag /q` | Runs default tests and shows **errors only** | Daily quick scan |
| `dcdiag /e /v /c /d /f:C:\Reports\DCDiag_Full.txt` | **Forest‑wide**, verbose + comprehensive, with debug, save to file | Weekly/monthly deep health check |
| `dcdiag /a` | Tests **all DCs in current domain** | Domain‑only checks |
| `dcdiag /s:DC1 /test:Replications /v` | Replication health for **one DC** | Partner/failed link triage |
| `dcdiag /test:FsmoCheck /v` | Validates **FSMO role holders** | Role move, outage checks |
| `dcdiag /s:DC2 /test:Advertising /v` | Ensures DC advertises **GC/KDC/LDAP/DNS** | Logon/auth issues |
| `dcdiag /test:DNS /dnsall /v` | Deep DNS diagnostics across DNS servers | SRV record, stale/missing DNS |
| `dcdiag /test:NetLogons /test:SysVolCheck /v` | Verifies SYSVOL/Netlogon shares | GPO not applying issues |
| `dcdiag /s:DC1 /site:EuropeSite /test:Connectivity /v` | Site‑scoped connectivity validation | WAN/site outages |
| `dcdiag /v ^| Select-String "Warning"` | **Warnings only** (filtered) | Review noisy environments |

---

## Enterprise‑Grade Baseline

### 1) Forest‑wide comprehensive health (recommended baseline)
```powershell
dcdiag /e /v /c /d /f:C:\Reports\DCDiag_Full.txt
```
- `/e` test all DCs in the **forest**
- `/v` verbose details; `/c` comprehensive; `/d` debug
- `/f` save output for audit and trending

### 2) Daily quick scan (errors only)
```powershell
dcdiag /q
repadmin /replsummary
```

### 3) Targeted deep dives
```powershell
# Replication (one DC)
dcdiag /s:DC1 /test:Replications /v

# FSMO role health
dcdiag /test:FsmoCheck /v

# DNS across all DNS servers
dcdiag /test:DNS /dnsall /v

# SYSVOL & Netlogon checks (GPO dependencies)
dcdiag /test:NetLogons /test:SysVolCheck /v
```

---

## Advanced Patterns & Combos

### Save failures, plus append replication summary
```powershell
dcdiag /e /q > C:\Reports\AD_Failures.txt
repadmin /replsummary >> C:\Reports\AD_Failures.txt
repadmin /showrepl * /csv >> C:\Reports\AD_Failures.txt
```

### Focus on one site (WAN aware)
```powershell
dcdiag /s:DC1 /site:EuropeSite /test:Connectivity /v
```

### Get warnings with full context (block extraction approach)
```powershell
# PowerShell: extract full warning blocks from dcdiag /v output
$raw = dcdiag /v
$warnings = @()
$block = @()
$collect = $false
foreach ($line in $raw) {
  if ($line -match 'Warning') { $collect = $true }
  if ($collect) { $block += $line }
  if ($collect -and [string]::IsNullOrWhiteSpace($line)) {
    $warnings += ($block -join "`r`n")
    $block = @(); $collect = $false
  }
}
$warnings | Set-Content -Path C:\Reports\dcdiag_warnings.txt -Encoding UTF8
```

---

## Interpreting Key Tests

### Replications
- Looks for **Last Success/Failure**, partner errors, lingering objects
- Failures often point to **RPC/Firewall, DNS, or permissions**

### Advertising
- DC must advertise LDAP/KDC/GC as applicable
- Warnings like **“not advertising as a GC”** affect logon/token building

### DNS
- Validates SRV records (`_ldap._tcp.dc._msdcs.<forestroot>` etc.)
- Finds stale/missing registrations and broken forwarders

### Services
- Checks **KDC, Netlogon, W32Time, DNS** running states
- Stopped/misconfigured services cause logon/time skew issues

### FsmoCheck
- Confirms role holders are reachable; flags **seized/missing** scenarios

### NetLogons / SysVolCheck
- Validates **\\DC\NETLOGON** and **\\DC\SYSVOL** shares
- SYSVOL replication (DFS‑R/FRS) problems break **Group Policy**

---

## Practical Workflows

### Daily (Ops)
```powershell
dcdiag /q
repadmin /replsummary
```

### Weekly (Ops + SRE)
```powershell
dcdiag /e /v /c /d /f:C:\Reports\AD_Weekly.txt
repadmin /showrepl * /csv > C:\Reports\AD_Repl.csv
```

### Change Windows (before/after)
```powershell
dcdiag /a /v /c /f:C:\Reports\PreChange.txt
# Apply changes/patching
dcdiag /a /v /c /f:C:\Reports\PostChange.txt
```

---

## Permissions & Network Prereqs
- Run as **Domain Admin** (or equivalent rights to query DCs)
- Ensure ports are open to DCs: **TCP/135 (RPC), 389 (LDAP), 445 (SMB), 88 (Kerberos)** and dynamic RPC range (TCP **49152–65535** by default on modern Windows)
- No need for WinRM/PS Remoting to use `/s:<DCName>`

---

## Troubleshooting Hints
- If **many tests fail**, check **time sync (W32Time)** and **DNS client settings** on DCs
- **Replication errors**: verify name resolution both ways, RPC reachability, and site/subnet mappings
- **DNS test failures**: confirm SRV records exist under **_msdcs** and DCs register dynamically
- **Advertising warnings**: check GC role, NTDS Settings, and that **Netlogon** has registered records

---

## Appendices

### Common Tests (quick list)
```
Advertising, Connectivity, Services, SystemLog, Replications, KnowsOfRoleHolders,
FrsEvent / DFSREvent, MachineAccount, NCSecDesc, NetLogons, ObjectsReplicated,
RidManager, Topology, VerifyReferences, VerifyEnterpriseReferences, KccEvent, DNS
```

### Useful One‑Liners
```powershell
# Errors only (quiet)
dcdiag /q

# Warnings only (filtered, PowerShell)
dcdiag /v | Select-String -Pattern 'Warning'

# One DC, all detail to file
dcdiag /s:DC1 /v /c /f:C:\Reports\DC1.txt
```

---

## See Also
- Pair `dcdiag` with: `repadmin /replsummary`, `repadmin /showrepl * /csv`
- For HTML/email automation, build a wrapper script that runs:
  - `dcdiag /e /q`, `dcdiag /test:dns /dnsall /v`, `repadmin /replsummary`
  - parses warnings/errors, and composes an HTML dashboard/report

---

**Author’s note:** This guide focuses on **advanced usage patterns** that map to real‑world operations in multi‑site, multi‑domain forests. Adapt paths and scopes (`/e`, `/a`, `/s`) to your environment’s size and change control practices.
