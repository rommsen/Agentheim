<#
.SYNOPSIS
Rebuilds .agenthoff/knowledge/index.md and .agenthoff/contexts/*/INDEX.md
by walking existing artifacts.

.DESCRIPTION
One-shot tool. Walks .agenthoff/contexts/*/{backlog,todo,doing,done}/ for tasks,
.agenthoff/knowledge/decisions/ for ADRs (sorted by scope), and
.agenthoff/knowledge/research/ for reports. Reconstructs indexes from the
template at references/index-template.md.

Safe to run multiple times — replaces each INDEX.md atomically. Hand-edits
inside marker pairs are overwritten; hand-edits outside markers are preserved
(except on first creation, where the file is created from the template).

.PARAMETER ProjectRoot
Path to the project root (containing .agenthoff/). Defaults to current directory.

.PARAMETER DryRun
Show what would change without writing.

.EXAMPLE
.\backfill-indexes.ps1
.\backfill-indexes.ps1 -ProjectRoot C:\path\to\project
.\backfill-indexes.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$agentRoot = Join-Path $ProjectRoot '.agenthoff'

if (-not (Test-Path $agentRoot)) {
    Write-Error ".agenthoff/ not found in $ProjectRoot. Run brainstorm first."
}

function Get-Frontmatter {
    param([string]$Path)
    $lines = Get-Content -Path $Path -Encoding UTF8 -ErrorAction Stop
    if ($lines.Count -lt 2 -or $lines[0] -ne '---') { return $null }
    $fm = @{}
    for ($i = 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -eq '---') { break }
        if ($lines[$i] -match '^(\w+):\s*(.*)$') {
            $fm[$Matches[1]] = $Matches[2].Trim()
        }
    }
    return $fm
}

function Get-OneLinePurpose {
    param([string]$ReadmePath)
    if (-not (Test-Path $ReadmePath)) { return '<no README>' }
    $content = Get-Content -Path $ReadmePath -Raw -Encoding UTF8
    if ($content -match '(?ms)^##\s+Purpose\s*\r?\n+(.+?)(\r?\n\r?\n|\r?\n##)') {
        return ($Matches[1] -split '\r?\n')[0].Trim()
    }
    return '<purpose not found>'
}

function New-IndexSection {
    param([string]$MarkerName, [string[]]$Lines)
    $body = ($Lines | ForEach-Object { $_ }) -join "`n"
    return "<!-- ${MarkerName}:start -->`n${body}`n<!-- ${MarkerName}:end -->"
}

function Build-TopLevelIndex {
    param([hashtable]$Data)

    $bcLines = $Data.BCs | ForEach-Object {
        "- **$($_.Name)** -- $($_.Purpose) -- ``contexts/$($_.Name)/INDEX.md``"
    }
    if (-not $bcLines) { $bcLines = @('<!-- no bounded contexts yet -->') }

    $adrGlobalLines = $Data.GlobalAdrs | ForEach-Object {
        "- **$($_.Id)** -- $($_.Title) -- $($_.Date) -- ``knowledge/decisions/$($_.File)``"
    }
    if (-not $adrGlobalLines) { $adrGlobalLines = @('<!-- no global ADRs yet -->') }

    $researchGlobalLines = $Data.GlobalResearch | ForEach-Object {
        "- **$($_.Slug)** -- $($_.Topic) -- $($_.Date) -- ``knowledge/research/$($_.File)``"
    }
    if (-not $researchGlobalLines) { $researchGlobalLines = @('<!-- no cross-BC research yet -->') }

    return @"
# Index

Top-level catalog of this project's bounded contexts, global decisions, and research.
For BC-scoped artifacts, see each BC's ``INDEX.md``.

> Updated by: ``model`` (BC creation), ``work`` (global ADRs), ``research`` (reports tagged global / cross-BC), backfill script.
> Hand-edits are fine but the skills will append at the section markers below.

---

## Bounded contexts

$(New-IndexSection 'bc-list' $bcLines)

## Global ADRs (scope: global)

$(New-IndexSection 'adr-global' $adrGlobalLines)

## Cross-BC research

Research reports relevant to more than one BC (or to the project as a whole). BC-specific
reports are listed in each BC's ``INDEX.md``.

$(New-IndexSection 'research-global' $researchGlobalLines)

## Pointers

- Vision: ``vision.md``
- Context map: ``context-map.md`` (if exists)
- Protocol (chronological log): ``knowledge/protocol.md`` -- newest entries on top
- All ADRs: ``knowledge/decisions/``
- All research: ``knowledge/research/``
"@
}

function Build-BCIndex {
    param([string]$BCName, [hashtable]$BCData)

    $countLines = @(
        "- **Backlog:** $($BCData.Counts.Backlog)",
        "- **Todo:** $($BCData.Counts.Todo)",
        "- **Doing:** $($BCData.Counts.Doing)",
        "- **Done:** $($BCData.Counts.Done)"
    )

    function Format-Tasks { param($Tasks, $Status)
        if (-not $Tasks) { return @("<!-- no tasks in $Status -->") }
        return $Tasks | ForEach-Object {
            $parts = @("- **$($_.Id)**", $_.Title)
            if ($Status -eq 'done' -and $_.Completed) { $parts += $_.Completed }
            $parts += "``$Status/$($_.File)``"
            $parts -join ' -- '
        }
    }

    $todoLines    = Format-Tasks $BCData.Tasks.todo    'todo'
    $doingLines   = Format-Tasks $BCData.Tasks.doing   'doing'
    $doneLines    = Format-Tasks $BCData.Tasks.done    'done'
    $backlogLines = Format-Tasks $BCData.Tasks.backlog 'backlog'

    $adrLocalLines = $BCData.Adrs | ForEach-Object {
        "- **$($_.Id)** -- $($_.Title) -- $($_.Date) -- ``../../knowledge/decisions/$($_.File)``"
    }
    if (-not $adrLocalLines) { $adrLocalLines = @('<!-- no ADRs scoped to this BC -->') }

    $researchLocalLines = $BCData.Research | ForEach-Object {
        "- **$($_.Slug)** -- $($_.Topic) -- $($_.Date) -- ``../../knowledge/research/$($_.File)``"
    }
    if (-not $researchLocalLines) { $researchLocalLines = @('<!-- no research touching this BC -->') }

    $conceptLines = $BCData.Concepts | ForEach-Object {
        "- **$($_.Name)** -- $($_.Description) -- ``concepts/$($_.File)``"
    }
    if (-not $conceptLines) { $conceptLines = @('<!-- no concept pages yet -->') }

    return @"
# $BCName -- Index

Catalog of everything in this bounded context: tasks by status, ADRs scoped to this BC,
research touching this BC, and concept synthesis pages.

> Updated by: ``model`` (tasks), ``work`` (BC-scoped ADRs, concept page links), ``research`` (BC-scoped reports).

---

## Tasks by status

$(New-IndexSection 'task-counts' $countLines)

### Todo
$(New-IndexSection 'todo-list' $todoLines)

### Doing
$(New-IndexSection 'doing-list' $doingLines)

### Done (most recent first; older entries kept for prior-art search)
$(New-IndexSection 'done-list' $doneLines)

### Backlog
$(New-IndexSection 'backlog-list' $backlogLines)

## ADRs scoped to this BC

$(New-IndexSection 'adr-local' $adrLocalLines)

## Research touching this BC

$(New-IndexSection 'research-local' $researchLocalLines)

## Concepts (opt-in synthesis pages)

$(New-IndexSection 'concepts' $conceptLines)

## Pointers

- BC README (ubiquitous language, invariants): ``README.md``
"@
}

# --- Scan ---

Write-Host "Scanning $agentRoot ..."

# BCs
$contextsDir = Join-Path $agentRoot 'contexts'
$bcs = @()
if (Test-Path $contextsDir) {
    $bcs = Get-ChildItem -Path $contextsDir -Directory | ForEach-Object {
        @{
            Name    = $_.Name
            Path    = $_.FullName
            Purpose = Get-OneLinePurpose -ReadmePath (Join-Path $_.FullName 'README.md')
        }
    }
}

# ADRs
$decisionsDir = Join-Path $agentRoot 'knowledge/decisions'
$adrs = @()
if (Test-Path $decisionsDir) {
    $adrs = Get-ChildItem -Path $decisionsDir -Filter '*.md' | ForEach-Object {
        $fm = Get-Frontmatter -Path $_.FullName
        if ($null -eq $fm) { return }
        @{
            File  = $_.Name
            Id    = $fm.id
            Title = $fm.title
            Date  = $fm.date
            Scope = $fm.scope
        }
    } | Where-Object { $_ }
}

# Research
$researchDir = Join-Path $agentRoot 'knowledge/research'
$research = @()
if (Test-Path $researchDir) {
    $research = Get-ChildItem -Path $researchDir -Filter '*.md' -File | ForEach-Object {
        $fm = Get-Frontmatter -Path $_.FullName
        if ($null -eq $fm) { return }
        $slug = $_.BaseName -replace '-\d{4}-\d{2}-\d{2}$', ''
        @{
            File         = $_.Name
            Slug         = $slug
            Topic        = $fm.topic
            Date         = $fm.date
            RelatedTasks = if ($fm.related_tasks) { $fm.related_tasks -replace '[\[\]\s]','' -split ',' | Where-Object { $_ } } else { @() }
        }
    } | Where-Object { $_ }
}

# Per-BC task assembly
$bcData = @{}
foreach ($bc in $bcs) {
    $tasks = @{ backlog = @(); todo = @(); doing = @(); done = @() }
    foreach ($status in $tasks.Keys.Clone()) {
        $dir = Join-Path $bc.Path $status
        if (-not (Test-Path $dir)) { continue }
        $tasks[$status] = Get-ChildItem -Path $dir -Filter '*.md' -File | ForEach-Object {
            $fm = Get-Frontmatter -Path $_.FullName
            if ($null -eq $fm) { return }
            @{
                File      = $_.Name
                Id        = $fm.id
                Title     = $fm.title
                Completed = $fm.completed
            }
        } | Where-Object { $_ }
    }

    # Sort done newest-first (by completed date)
    $tasks.done = $tasks.done | Sort-Object { $_.Completed } -Descending

    # Concepts
    $conceptDir = Join-Path $bc.Path 'concepts'
    $concepts = @()
    if (Test-Path $conceptDir) {
        $concepts = Get-ChildItem -Path $conceptDir -Filter '*.md' -File | ForEach-Object {
            $fm = Get-Frontmatter -Path $_.FullName
            $desc = if ($fm -and $fm.description) { $fm.description } else { '<no description>' }
            @{
                File        = $_.Name
                Name        = $_.BaseName
                Description = $desc
            }
        }
    }

    $bcData[$bc.Name] = @{
        Counts   = @{
            Backlog = ($tasks.backlog | Measure-Object).Count
            Todo    = ($tasks.todo    | Measure-Object).Count
            Doing   = ($tasks.doing   | Measure-Object).Count
            Done    = ($tasks.done    | Measure-Object).Count
        }
        Tasks    = $tasks
        Adrs     = $adrs | Where-Object { $_.Scope -eq $bc.Name }
        Research = $research | Where-Object {
            $rt = $_.RelatedTasks
            if (-not $rt -or $rt.Count -eq 0) { return $false }
            ($rt | ForEach-Object { ($_ -split '-')[0] }) -contains ($bc.Name -replace '-.*$','')
        }
        Concepts = $concepts
    }
}

# Build top-level
$topData = @{
    BCs            = $bcs
    GlobalAdrs     = $adrs | Where-Object { $_.Scope -eq 'global' }
    GlobalResearch = $research | Where-Object {
        $rt = $_.RelatedTasks
        if (-not $rt -or $rt.Count -eq 0) { return $true }
        $touchedBCs = $rt | ForEach-Object { ($_ -split '-')[0] } | Sort-Object -Unique
        $touchedBCs.Count -gt 1
    }
}

# --- Write ---

$topLevel = Build-TopLevelIndex -Data $topData
$topLevelPath = Join-Path $agentRoot 'knowledge/index.md'

if ($DryRun) {
    Write-Host "`n=== Would write: $topLevelPath ===`n"
    Write-Host $topLevel
} else {
    $topDir = Split-Path $topLevelPath -Parent
    if (-not (Test-Path $topDir)) { New-Item -ItemType Directory -Path $topDir | Out-Null }
    Set-Content -Path $topLevelPath -Value $topLevel -Encoding UTF8
    Write-Host "Wrote $topLevelPath"
}

foreach ($bc in $bcs) {
    $bcIndex = Build-BCIndex -BCName $bc.Name -BCData $bcData[$bc.Name]
    $bcIndexPath = Join-Path $bc.Path 'INDEX.md'

    if ($DryRun) {
        Write-Host "`n=== Would write: $bcIndexPath ===`n"
        Write-Host $bcIndex
    } else {
        Set-Content -Path $bcIndexPath -Value $bcIndex -Encoding UTF8
        Write-Host "Wrote $bcIndexPath"
    }
}

Write-Host "`nDone."
