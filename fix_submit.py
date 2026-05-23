with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# Find and fix submitAttend - must not already be async
target = 'function submitAttend(){'
replacement = 'async function submitAttend(){'

if 'async function submitAttend(){' in content:
    print('Already async - OK')
elif target in content:
    content = content.replace(target, replacement, 1)
    print('Fixed: added async to submitAttend')
else:
    # Try with space before brace
    target2 = 'function submitAttend() {'
    replacement2 = 'async function submitAttend() {'
    if target2 in content:
        content = content.replace(target2, replacement2, 1)
        print('Fixed (space variant): added async to submitAttend')
    else:
        # Search more broadly
        import re
        m = re.search(r'(?<!async )function submitAttend\s*\(', content)
        if m:
            content = content[:m.start()] + 'async ' + content[m.start():]
            print('Fixed (regex): added async to submitAttend at', m.start())
        else:
            print('ERROR: submitAttend not found!')

# Verify
print('async function submitAttend in file:', 'async function submitAttend' in content)

# Also verify the script tag counts are still correct (11 opens, 9 closes is expected
# because 2 are inside template literals)
import re
opens  = len(re.findall(r'<script(?:\s[^>]*)?>',  content))
closes = len(re.findall(r'</script\s*>', content))
print('Script tags - opens:', opens, 'closes:', closes)
print('(11 opens, 9 closes is CORRECT - 2 opens are inside JS template strings)')

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))

print('Done.')
