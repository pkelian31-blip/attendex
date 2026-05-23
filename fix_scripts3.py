import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# The main script at 248935 - find where it ends
# It should end before the next REAL <script> tag
# The next real script opens are at: 405584, 626044, 646595, 650556
# But 339753 is inside a string (escaped \/)

# Let's look at 405584
print('=== At 405584 ===')
print(repr(content[405550:405650]))

print('\n=== At 626044 ===')
print(repr(content[626000:626100]))

# The close tags are at 613459, 646583, 656841
print('\n=== Close at 613459 ===')
print(repr(content[613420:613500]))

# So the structure should be:
# <script> at 248935 ... </script> at 613459  (main app script)
# <script> at 626044 ... </script> at 646583
# <script> at 646595 ... </script> at 656841

# But wait - is there a </script> between 248935 and 613459?
closes = [m.start() for m in re.finditer(r'</script\s*>', content)]
print('\nAll close positions:', closes)

opens_real = []
for m in re.finditer(r'<script(?:\s[^>]*)?>',  content):
    # Check it's not inside a string (no backslash before it)
    pre = content[max(0,m.start()-3):m.start()]
    if '\\' not in pre:
        opens_real.append(m.start())

print('Real open positions:', opens_real)
