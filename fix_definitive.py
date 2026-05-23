import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

print('File size:', len(content))

# ── Step 1: Fix submitAttend ────────────────────────────────────────
# Find exact occurrence
idx = content.find('\nfunction submitAttend(')
if idx >= 0:
    content = content[:idx+1] + 'async ' + content[idx+1:]
    print('Fixed submitAttend async at', idx)
else:
    print('submitAttend already async or not found')

# ── Step 2: Understand the script structure ─────────────────────────
# From our investigation:
# - Real script opens (not in strings): 2011, 12502, 12594, 12710, 12820, 15803, 248935, 626044, 646595
# - Real script closes: 12492, 12584, 12700, 12792, 15770, 15896, 613459, 646583, 656841
# That's 9 opens and 9 closes — BALANCED
# The "11 opens" count includes 2 that are inside JS strings (339753, 405584)
# So the file IS balanced — the check script was wrong

# Let's verify by checking those 2 "extra" opens
pos1 = 339753
pos2 = 405584
pre1 = content[max(0,pos1-10):pos1]
pre2 = content[max(0,pos2-10):pos2]
print('\nPos 339753 pre-context:', repr(pre1))
print('Pos 405584 pre-context:', repr(pre2))
print('Context at 339753:', repr(content[339753:339820]))
print('Context at 405584:', repr(content[405584:405650]))

# Check if they are inside template literals (backtick strings)
# by counting backticks before them
bt1 = content[:pos1].count('`')
bt2 = content[:pos2].count('`')
print('\nBackticks before 339753:', bt1, '(odd = inside string:', bt1 % 2 == 1, ')')
print('Backtics before 405584:', bt2, '(odd = inside string:', bt2 % 2 == 1, ')')

# Count real opens vs closes
real_opens  = len(re.findall(r'<script(?:\s[^>]*)?>',  content))
real_closes = len(re.findall(r'</script\s*>', content))
print('\nRaw counts - opens:', real_opens, 'closes:', real_closes)

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print('\nDone.')
