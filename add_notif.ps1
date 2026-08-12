$files = @('about.html','leaderboard.html','mandals.html','match-details.html','results.html','schedule.html','sports.html')
$baseDir = "c:\Users\heera\OneDrive\Desktop\DSSPL HEERA\DSSPL Website"

foreach ($f in $files) {
    $path = Join-Path $baseDir $f
    $content = Get-Content $path -Raw -Encoding UTF8

    # Add notifications.css after index.css link (if not already present)
    if ($content -notmatch 'notifications\.css') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="index.css">',
            '<link rel="stylesheet" href="index.css">' + "`r`n" + '  <link rel="stylesheet" href="notifications.css">'
        )
    }

    # Add socket.io + notifications.js after register-popup.js (if not already present)
    if ($content -notmatch 'notifications\.js') {
        $content = $content.Replace(
            '<script src="register-popup.js"></script>',
            '<script src="register-popup.js"></script>' + "`r`n" + '<script src="/socket.io/socket.io.js"></script>' + "`r`n" + '<script src="notifications.js"></script>'
        )
    }

    Set-Content -Path $path -Value $content -Encoding UTF8
    Write-Host "Updated: $f"
}
Write-Host "All files updated successfully!"
