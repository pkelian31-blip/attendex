import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# ── FIX 1: submitAttend missing async ──────────────────────────────
before = content.count('async function submitAttend')
content = re.sub(r'(?<!async )function submitAttend\(', 'async function submitAttend(', content)
after = content.count('async function submitAttend')
print('submitAttend async:', before, '->', after)

# ── FIX 2: Find the 2 unclosed script tags ─────────────────────────
# Strategy: walk through ALL <script> and </script> tags in order,
# skipping ones that are inside JS strings (preceded by backslash or inside backtick strings)
# Use a simple stack approach on the raw positions

# Get all script open/close positions, filtering out escaped ones (inside JS strings)
all_tags = []
for m in re.finditer(r'<script(?:\s[^>]*)?>|</script\s*>', content):
    pos = m.start()
    # Check if preceded by backslash (inside a JS string like `...<\/script>...`)
    pre = content[max(0, pos-5):pos]
    if '\\' in pre or "'" in pre[-2:] or '"' in pre[-2:]:
        continue
    all_tags.append((pos, m.end(), 'open' if not m.group().startswith('</') else 'close', m.group()))

print('Real tags found:', len(all_tags))

# Walk the stack
stack = []  # positions of unclosed opens
inserts = []  # (position, text) to insert

for pos, end, kind, tag in all_tags:
    if kind == 'open':
        stack.append((pos, end))
    else:
        if stack:
            stack.pop()

print('Unclosed opens:', len(stack))
for open_pos, open_end in stack:
    print('  Unclosed at:', open_pos, repr(content[open_pos:open_pos+60]))
    # Find where this block ends: just before the next real <script> or </body>
    next_real_open = None
    for p, e, k, t in all_tags:
        if k == 'open' and p > open_pos:
            next_real_open = p
            break
    body_close = content.find('</body>', open_pos)
    end_of_block = min(x for x in [next_real_open, body_close, len(content)] if x and x > open_pos)
    
    # Insert </script> just before end_of_block
    # Find last newline before end_of_block for clean insertion
    insert_pos = content.rfind('\n', open_pos, end_of_block)
    if insert_pos == -1:
        insert_pos = end_of_block
    inserts.append(insert_pos)
    print('  Will insert </script> at:', insert_pos)
    print('  Context around insert:', repr(content[insert_pos-50:insert_pos+50]))

# Apply inserts from last to first (so positions don't shift)
for insert_pos in sorted(inserts, reverse=True):
    content = content[:insert_pos] + '\n</script>' + content[insert_pos:]
    print('Inserted </script> at', insert_pos)

# ── Verify ─────────────────────────────────────────────────────────
all_tags2 = []
for m in re.finditer(r'<script(?:\s[^>]*)?>|</script\s*>', content):
    pos = m.start()
    pre = content[max(0, pos-5):pos]
    if '\\' in pre:
        continue
    all_tags2.append((pos, 'open' if not m.group().startswith('</') else 'close'))

opens2  = sum(1 for _, k in all_tags2 if k == 'open')
closes2 = sum(1 for _, k in all_tags2 if k == 'close')
print('\nAfter fix - opens:', opens2, 'closes:', closes2, '-> balanced:', opens2 == closes2)
print('submitAttend async:', 'async function submitAttend' in content)

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print('\nDone.')
