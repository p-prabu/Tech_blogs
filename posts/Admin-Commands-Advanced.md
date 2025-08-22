# Advanced Active Directory Admin Commands (Excluding `dcdiag` & `repadmin`)

This guide lists the **other must‑know commands** for Active Directory administrators—focused on **site discovery, secure channels, time, Kerberos, SPNs, GPO, trusts, DFS‑R, and object management**. Each section includes **purpose, common switches, practical examples, output interpretation, and gotchas**.

> Scope: intentionally excludes `dcdiag` and `repadmin` since you already know them.

---

## Table of Contents
1. [NLTEST — Location, DC Discovery & Secure Channel](#nltest--location-dc-discovery--secure-channel)  
2. [W32TM — Time Service (Kerberos‑critical)](#w32tm--time-service-kerberoscritical)  
3. [KLIST — Kerberos Tickets](#klist--kerberos-tickets)  
4. [SETSPN — Service Principal Names](#setspn--service-principal-names)  
5. [NETDOM — FSMO, Trusts, DC Lists](#netdom--fsmo-trusts-dc-lists)  
6. [DFS‑R Diagnostics — SYSVOL & Data Replication](#dfs-r-diagnostics--sysvol--data-replication)  
7. [Group Policy Tools — gpresult, gpupdate, RSOP](#group-policy-tools--gpresult-gpupdate-rsop)  
8. [Directory Tools — LDP, ADSI Edit, DS* CLI](#directory-tools--ldp-adsi-edit-ds-cli)  
9. [PowerShell AD Cmdlets (Quick Hits)](#powershell-ad-cmdlets-quick-hits)  
10. [DNS & Network One‑Liners](#dns--network-one-liners)  
11. [Event Log Queries (One‑Liners)](#event-log-queries-one-liners)  
12. [Troubleshooting Playbooks](#troubleshooting-playbooks)  
13. [Permissions, Ports & Safety Notes](#permissions-ports--safety-notes)

---

## NLTEST — Location, DC Discovery & Secure Channel

**What it does:** Enumerates DCs, sites, trusts, and verifies/resets **secure channel** between a member and its DC.

### Common commands
```cmd
nltest /dsgetdc:<domain>               :: Find a DC for the domain
nltest /dclist:<domain>                :: List all DCs in the domain
nltest /dsgetsite                      :: Show this computer's AD site
nltest /domain_trusts                  :: List domain/forest trusts
nltest /sc_verify:<domain>             :: Verify secure channel with a DC
nltest /sc_reset:<domain>\<DCName>     :: Reset secure channel to a specific DC
nltest /dsregdns                       :: Force DC to register its DNS records
```

### Usage tips
- If `sc_verify` fails, check **time skew** and **computer account password**.  
- `dsregdns` is for **Domain Controllers**; for clients use `ipconfig /registerdns`.  
- For site issues, verify **subnets** in AD Sites & Services.

---

## W32TM — Time Service (Kerberos‑critical)

**What it does:** Queries and configures the Windows Time service. **Kerberos requires tight clock skew** (default 5 minutes). PDC Emulator is the **default domain time source**.

### Common commands
```cmd
w32tm /query /status          :: Current status (offset, stratum, last sync)
w32tm /query /source          :: Current time source (PDCe/NTP/Local CMOS)
w32tm /query /peers           :: Configured NTP peers
w32tm /query /configuration   :: Effective time service configuration
w32tm /monitor                :: Query multiple DCs (useful from admin PC)
w32tm /resync                 :: Force time sync
```

### Usage tips
- On the **forest root PDCe**, configure external NTP sources.  
- If time is wildly off, **stop W32Time, set time manually, then resync**.  
- Time issues often surface as **Kerberos failures** or **replication errors**.

---

## KLIST — Kerberos Tickets

**What it does:** Inspect and purge Kerberos tickets (TGT/TGS) on a client or server.

### Common commands
```cmd
klist                :: List all cached tickets
klist tgt            :: Show the Ticket Granting Ticket
klist purge          :: Clear all cached tickets (forces re-auth on next access)
klist sessions       :: Show cached Kerberos sessions
```

### Usage tips
- After SPN or delegation changes, `klist purge` to avoid stale tickets.  
- Use when testing **service bindings** (SQL/IIS) to force new TGS requests.

---

## SETSPN — Service Principal Names

**What it does:** View, add, or delete **SPNs** bound to accounts. Crucial for **Kerberos** to map services to identities.

### Common commands
```cmd
setspn -L <account>                            :: List SPNs on an account
setspn -Q <SPN>                                :: Query if an SPN exists
setspn -X                                      :: Detect duplicate SPNs (forest-wide)
setspn -S <SPN> <account>                      :: Safely add SPN (checks dupes)
setspn -D <SPN> <account>                      :: Remove SPN
```

### Examples
```cmd
setspn -S HTTP/intranet.contoso.com CONTOSO\svcWeb
setspn -S MSSQLSvc/sql01.contoso.com:1433 CONTOSO\svcSql
```

### Usage tips
- Prefer **`-S`** over `-A` to **avoid duplicates**.  
- Duplicates cause **KRB_AP_ERR_MODIFIED** (service ticket decryption fails).  
- After SPN fixes, use **`klist purge`** on clients.

---

## NETDOM — FSMO, Trusts, DC Lists

**What it does:** Query FSMO roles, DCs, trusts; join domains; manage computer accounts.

### Common commands
```cmd
netdom query fsmo          :: Show FSMO role holders
netdom query dc            :: List domain controllers
netdom query pdc           :: Show PDC Emulator
netdom query trust         :: List domain trusts
netdom verify <Computer>   :: Verify trust/secure channel to domain
```

### Usage tips
- Use `netdom query fsmo` during **outages** to confirm reachable role holders.  
- `netdom verify` helps confirm a machine’s trust relationship.

---

## DFS‑R Diagnostics — SYSVOL & Data Replication

**What it does:** Diagnose **DFS Replication** including **SYSVOL** on modern domains.

### Common commands
```cmd
dfsrdiag replicationstate
dfsrdiag backlog /rgname:"Domain System Volume" /rfname:"SYSVOL Share" /smem:<SourceDC> /rmem:<DestDC>
dfsrdiag pollad            :: Force DFSR to poll AD for config changes
dfsrdiag diag             :: Basic diagnostics (health overview)
```

### Usage tips
- High backlog between DCs indicates **SYSVOL not in sync** → leads to **GPO inconsistencies**.  
- Check **DFS Replication** event log for 2213, 4012, 4612, etc.

---

## Group Policy Tools — `gpresult`, `gpupdate`, RSOP

**What they do:** Diagnose **GPO application** on clients/servers.

### Common commands
```cmd
gpresult /r                           :: Text summary of applied GPOs
gpresult /h C:\Temp\GPOReport.html    :: Full HTML report (recommended)
gpupdate /force                       :: Force user/computer policy refresh
rsop.msc                              :: GUI Resultant Set of Policy
```

### Usage tips
- If GPOs are missing, verify **site** (nltest /dsgetsite) and **SYSVOL** (`dfsrdiag backlog`).  
- Check **event logs**: GroupPolicy, System, DFS Replication.

---

## Directory Tools — LDP, ADSI Edit, DS* CLI

### LDP.EXE (LDAP explorer)
- Browse LDAP, run binds/searches, view raw attributes & security descriptors.  
- Great for inspecting **replicated attributes**, **tokenGroups**, **msDS‑ReplAttributeMetaData**.

### ADSIEDIT.MSC (Low‑level editor)
- Directly edit AD objects/attributes.  
- **Dangerous**: Always back up and understand replication scope.

### DS* command‑line (scriptable management)
```cmd
dsquery user -name "John*"
dsquery computer -name "PC-01*"
dsquery group -samid "Domain Admins"

dsget user "CN=John Doe,OU=HR,DC=contoso,DC=com" -memberof -expand

dsmod user "CN=John Doe,OU=HR,DC=contoso,DC=com" -pwdneverexpires yes
dsmod group "CN=AppAdmins,OU=Groups,DC=contoso,DC=com" -addmbr "CN=John Doe,OU=HR,DC=contoso,DC=com"

dsadd group "CN=NewGroup,OU=Groups,DC=contoso,DC=com" -secgrp yes -scope g

dsrm "CN=OldGroup,OU=Groups,DC=contoso,DC=com" -subtree -noprompt
```

---

## PowerShell AD Cmdlets (Quick Hits)

```powershell
# Find users/computers/groups
Get-ADUser -Filter 'Name -like "John*"' -Properties * | Select Name,SamAccountName,Enabled,WhenChanged
Get-ADComputer -Filter * -SearchBase "OU=Servers,DC=contoso,DC=com" | Select Name,OperatingSystem,LastLogonDate
Get-ADGroupMember "Domain Admins" | Select Name,SamAccountName,objectClass

# Account hygiene
Search-ADAccount -LockedOut | Select Name,SamAccountName,LastLogonDate
Search-ADAccount -AccountExpired | Select Name,SamAccountName
Search-ADAccount -ComputersOnly -AccountInactive -TimeSpan 90.00:00:00

# SPN checks
setspn -X                         # (legacy) duplicate SPN scan
Set-ADComputer -Identity SQL01 -Add @{servicePrincipalName="MSSQLSvc/sql01.contoso.com:1433"}

# Site & DC info
(Get-ADDomainController -Discover).HostName
Get-ADReplicationSiteLink -Filter * | Select Name,Cost,ReplicationInterval

# Trusts
Get-ADTrust -Filter * | Select Name,Direction,TrustType,IntraForest
```

---

## DNS & Network One‑Liners

```powershell
# SRV records (domain locator)
nslookup -type=SRV _ldap._tcp.dc._msdcs.contoso.com

# Register client DNS
ipconfig /registerdns

# Quick port tests (RPC endpoint, LDAP, Kerberos, SMB)
Test-NetConnection dc01.contoso.com -Port 135
Test-NetConnection dc01.contoso.com -Port 389
Test-NetConnection dc01.contoso.com -Port 88
Test-NetConnection dc01.contoso.com -Port 445

# Reverse lookup sanity
nslookup 10.0.0.10
```

---

## Event Log Queries (One‑Liners)

```powershell
# AD DS log: replication/auth/catalog issues
Get-WinEvent -LogName "Directory Service" -MaxEvents 50 | Format-Table TimeCreated, Id, LevelDisplayName, Message -Auto

# DFS Replication (SYSVOL)
Get-WinEvent -LogName "DFS Replication" -MaxEvents 50 | ft TimeCreated, Id, Message -Auto

# Group Policy operational
Get-WinEvent -LogName "Microsoft-Windows-GroupPolicy/Operational" -MaxEvents 50 | ft TimeCreated, Id, Message -Auto

# DNS Server
Get-WinEvent -LogName "DNS Server" -MaxEvents 50 | ft TimeCreated, Id, Message -Auto
```

---

## Troubleshooting Playbooks

### A) **User can’t log in to app (Kerberos failure)**
1. `klist` → confirm tickets; `klist purge` to refresh.  
2. `setspn -Q <SPN>` → verify SPN exists and **not duplicated** (`-X`).  
3. Time: `w32tm /query /status` (client/DC).  
4. DNS: `nslookup <appServer>` & SRV query for DCs.  
5. Event Logs: KDC/Security on DC; app server System/Security.

### B) **Machine trust/secure channel broken**
1. `nltest /sc_verify:<domain>` → verify.  
2. If broken: `nltest /sc_reset:<domain>\<DC>` or **rejoin domain**.  
3. Confirm site: `nltest /dsgetsite`; subnets/site links in AD.  
4. Check time & DNS client pointing to **AD DNS**.

### C) **GPO not applying**
1. `gpresult /h C:\Temp\gpo.html` & check scope/filters.  
2. `dfsrdiag backlog` between DCs hosting SYSVOL.  
3. `nltest /dsgetsite` for correct site.  
4. Event logs: GroupPolicy, DFS Replication, System.

### D) **SYSVOL inconsistent between DCs**
1. `dfsrdiag replicationstate` & `dfsrdiag backlog …`.  
2. DFSR event IDs 2213/2212/4012: recover staged replication.  
3. Ensure **free disk** and **AV exclusions** per DFSR guidance.

### E) **Time skew issues across sites**
1. `w32tm /monitor` from admin host to view multiple DCs.  
2. Ensure root **PDCe** syncs to **reliable NTP**.  
3. `w32tm /resync` on out‑of‑sync nodes.  
4. Confirm firewall allows NTP (UDP/123) if using external NTP.

---

## Permissions, Ports & Safety Notes

- Run tools as **Domain Admin** or appropriate delegated admin.  
- Critical ports: **TCP 135 (RPC)**, **dynamic RPC 49152–65535**, **TCP/UDP 389 (LDAP)**, **TCP 445 (SMB)**, **TCP/UDP 88 (Kerberos)**, **UDP 123 (NTP)**, **TCP 53 (DNS)**.  
- **ADSI Edit** and **dsrm** are **destructive**—double‑check targets and consider backups.  
- After SPN/permission changes, **purge tickets** (`klist purge`) and **restart services** if needed.  
- Always validate **DNS health** first; many AD issues are DNS‑rooted.

---

**Keep this handy during incidents**. Mastering these commands—`nltest`, `w32tm`, `klist`, `setspn`, `netdom`, `dfsrdiag`, `gpresult/gpupdate`, `LDP/ADSIEdit`, `ds*`, and the PowerShell AD cmdlets—covers the majority of day‑to‑day and emergency AD troubleshooting beyond `dcdiag`/`repadmin`.
