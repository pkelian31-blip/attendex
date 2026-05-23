import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# ── FIX 1: submitAttend missing async ──────────────────────────────
if 'async function submitAttend' not in content:
    content = content.replace('function submitAttend(){', 'async function submitAttend(){', 1)
    print('Fixed: submitAttend async')
else:
    print('OK: submitAttend already async')

# ── FIX 2: Find the 2 unclosed script blocks ───────────────────────
# We know from earlier scan they are at ~pos 634609 and ~655159
# Find them by their unique content markers
markers = [
    'VISITOR PRIVATE INBOX SYSTEM',
    'VID VERIFICATION LOADER'
]

for marker in markers:
    idx = content.find(marker)
    if idx == -1:
        print('Marker not found:', marker)
        continue
    # Find the <script> tag before this marker
    script_start = content.rfind('<script>', 0, idx)
    if script_start == -1:
        print('No <script> before marker:', marker)
        continue
    # Find the next </script> after this block
    close_idx = content.find('</script>', idx)
    if close_idx == -1:
        print('No </script> after marker:', marker)
        continue
    # Check if there's already a </script> right after the block ends
    # Find the next <script> after this one to know where this block ends
    next_script = content.find('<script>', script_start + 8)
    if next_script == -1:
        next_script = len(content)
    # Check if close_idx is before next_script (already closed)
    if close_idx < next_script:
        print('Already closed:', marker)
        continue
    # Need to insert </script> before next_script
    # Find a good insertion point: last } before next_script
    insert_at = content.rfind('\n', script_start, next_script)
    if insert_at == -1:
        insert_at = next_script
    content = content[:insert_at] + '\n</script>' + content[insert_at:]
    print('Fixed: added </script> for block:', marker[:30])

# ── Verify ─────────────────────────────────────────────────────────
opens  = len(re.findall(r'(?:^|>)\s*<script[\s>]', content, re.MULTILINE))
closes = len(re.findall(r'</script\s*>', content))
print('Script tags after fix:', opens, 'open,', closes, 'close')

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print('Done.')
