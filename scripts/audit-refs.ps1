$skills = @(Get-ChildItem .github/skills -Directory | ForEach-Object { $_.Name })
$agents = @(Get-ChildItem .github/agents -Filter *.agent.md | ForEach-Object { $_.BaseName -replace '\.agent$','' })

$sourceFiles = @()
$sourceFiles += Get-ChildItem .github/agents -Filter *.agent.md
$sourceFiles += Get-ChildItem .github/prompts -Filter *.prompt.md
$sourceFiles += Get-ChildItem .github/skills -Directory | ForEach-Object { Join-Path $_.FullName 'SKILL.md' } | Where-Object { Test-Path $_ } | Get-Item
$sourceFiles += Get-Item .github/copilot-instructions.md
$sourceFiles += Get-Item .github/README.md
$sourceFiles += Get-Item .github/constitution.md
$sourceFiles += Get-ChildItem .github/docs -Filter *.md

$skillRefs = @{}
foreach ($s in $skills) { $skillRefs[$s] = @{ count = 0; files = @() } }

foreach ($f in $sourceFiles) {
  $content = Get-Content $f.FullName -Raw
  foreach ($s in $skills) {
    if ($f.FullName -match "skills[\\/]$s[\\/]SKILL\.md$") { continue }
    $pattern = "(?<![a-zA-Z0-9-])$([regex]::Escape($s))(?![a-zA-Z0-9-])"
    $m = [regex]::Matches($content, $pattern)
    if ($m.Count -gt 0) {
      $skillRefs[$s].count += $m.Count
      $skillRefs[$s].files += $f.Name
    }
  }
}

Write-Host "=== SKILL INBOUND REFERENCES ==="
$skillRefs.GetEnumerator() | Sort-Object { $_.Value.count } | ForEach-Object {
  "{0,-40} {1,3}  {2}" -f $_.Key, $_.Value.count, (($_.Value.files | Select-Object -Unique) -join ',')
}

Write-Host "`n=== AGENT INBOUND REFERENCES (@agent-name) ==="
$agentRefs = @{}
foreach ($a in $agents) { $agentRefs[$a] = @{ count = 0; files = @() } }
foreach ($f in $sourceFiles) {
  $content = Get-Content $f.FullName -Raw
  foreach ($a in $agents) {
    if ($f.FullName -match "agents[\\/]$a\.agent\.md$") { continue }
    $pattern = "(@$([regex]::Escape($a))(?![a-zA-Z0-9-]))"
    $m = [regex]::Matches($content, $pattern)
    if ($m.Count -gt 0) {
      $agentRefs[$a].count += $m.Count
      $agentRefs[$a].files += $f.Name
    }
  }
}
$agentRefs.GetEnumerator() | Sort-Object { $_.Value.count } | ForEach-Object {
  "{0,-40} {1,3}  {2}" -f $_.Key, $_.Value.count, (($_.Value.files | Select-Object -Unique) -join ',')
}
