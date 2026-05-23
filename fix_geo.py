with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

old_start = content.find('function checkStudentGeo')
old_end   = content.find('\nfunction autoGenPDF')

new_fn = r"""function checkStudentGeo(s) {
  const box = document.getElementById('stuGeoStatus');
  const btn = document.getElementById('stuSubmitBtn');

  function setBox(bg, border, color, html) {
    box.style.display = 'block';
    box.style.background = bg;
    box.style.border = border;
    box.style.color = color;
    box.innerHTML = html;
  }
  function setBtnState(disabled) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.5' : '1';
    btn.style.cursor  = disabled ? 'not-allowed' : 'pointer';
  }

  if (!navigator.geolocation) {
    setBox('var(--red2)', '1px solid rgba(255,107,107,0.2)', 'var(--red)',
      '❌ Geolocation is not supported by your browser.');
    S.geoBlocked = true;
    return;
  }

  S.geoBlocked = true;
  setBtnState(true);
  setBox('var(--blue3)', '1px solid rgba(79,158,255,0.2)', 'var(--blue)',
    '📡 <strong>Getting your location…</strong> Please stand still.');

  let bestPos = null;
  let watchId = null;
  let done = false;

  function decide(pos) {
    if (done) return;
    done = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    const stuLat = pos.coords.latitude;
    const stuLng = pos.coords.longitude;
    const acc    = Math.round(pos.coords.accuracy);
    const dist   = Math.round(haversine(s.geoLat, s.geoLng, stuLat, stuLng));
    S.studentDist = dist;

    // Add GPS accuracy as margin (capped at 100m) so poor signal doesn't block students
    const margin = Math.min(acc, 100);
    const effectiveRadius = s.geoRadius + margin;

    const coordInfo = stuLat.toFixed(5) + ', ' + stuLng.toFixed(5) +
      ' · ±' + acc + 'm · ' + dist + 'm from class';

    if (dist <= effectiveRadius) {
      S.geoBlocked = false;
      setBtnState(false);
      setBox('var(--green2)', '1px solid rgba(16,185,129,0.2)', 'var(--green)',
        '✅ <strong>You are in range</strong> — ' + dist + 'm from class (limit: ' + s.geoRadius + 'm)<br/>' +
        '<span style="font-size:10px;opacity:0.8;">' + coordInfo + '</span>');
    } else {
      S.geoBlocked = true;
      setBtnState(false);
      setBox('var(--red2)', '1px solid rgba(239,68,68,0.2)', 'var(--red)',
        '❌ <strong>Too far</strong> — ' + dist + 'm from class (limit: ' + s.geoRadius + 'm)<br/>' +
        '<span style="font-size:10px;opacity:0.8;">' + coordInfo + '</span><br/>' +
        '<button onclick="checkStudentGeo(S.currentSession)" style="margin-top:8px;padding:6px 14px;background:var(--red2);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:6px;cursor:pointer;font-size:12px;">🔄 Retry</button>');
    }
  }

  // Watch position — accept FIRST reading with accuracy <=300m
  // This handles the ±50000m "no fix yet" case by waiting for a real reading
  watchId = navigator.geolocation.watchPosition(
    function(pos) {
      if (done) return;
      const acc = pos.coords.accuracy;
      setBox('var(--blue3)', '1px solid rgba(79,158,255,0.2)', 'var(--blue)',
        '📡 <strong>Getting your location…</strong> ±' + Math.round(acc) + 'm accuracy — stand still');
      if (!bestPos || acc < bestPos.coords.accuracy) bestPos = pos;
      // Accept any reading with accuracy better than 300m
      if (acc <= 300) {
        decide(pos);
      }
    },
    function(err) {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      S.geoBlocked = true;
      setBtnState(false);
      const msg = err.code === 1
        ? '❌ Location permission denied. Please allow location access and retry.'
        : '❌ Could not get location. Please retry.';
      setBox('var(--red2)', '1px solid rgba(255,107,107,0.2)', 'var(--red)',
        msg + '<br/><button onclick="checkStudentGeo(S.currentSession)" style="margin-top:8px;padding:6px 14px;background:var(--red2);border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:6px;cursor:pointer;font-size:12px;">🔄 Retry</button>');
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
  );

  // After 15s: use best reading we have, or unblock with warning if nothing
  setTimeout(function() {
    if (done) return;
    if (bestPos) {
      decide(bestPos);
    } else {
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      S.geoBlocked = false;
      setBtnState(false);
      setBox('var(--gold2)', '1px solid rgba(245,158,11,0.2)', 'var(--gold)',
        '⚠️ Could not verify location — proceeding without geo-check.');
    }
  }, 15000);
}
"""

content = content[:old_start] + new_fn + content[old_end:]

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print('Done. Replaced checkStudentGeo successfully.')
print('New function chars:', len(new_fn))
