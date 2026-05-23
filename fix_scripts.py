import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# Find ALL real <script> open tags and </script> close tags with positions
opens  = [(m.start(), m.end()) for m in re.finditer(r'<script(?:\s[^>]*)?>',  content)]
closes = [(m.start(), m.end()) for m in re.finditer(r'</script\s*>', content)]

print('Opens:', len(opens))
print('Closes:', len(closes))

# Match each open to its close (greedy stack)
# Walk through all tags in order, track depth
events = [(pos, 'open', end) for pos, end in opens] + \
         [(pos, 'close', end) for pos, end in closes]
events.sort(key=lambda x: x[0])

stack = []
unclosed = []
for pos, kind, end in events:
    if kind == 'open':
        stack.append(pos)
    else:
        if stack:
            stack.pop()
        # else extra close — ignore

# Anything left in stack is unclosed
unclosed = stack
print('Unclosed script opens at positions:', unclosed)
for pos in unclosed:
    print('  Context:', repr(content[pos:pos+80]))
    # Find where this block ends — look for next <script> or </body>
    next_open  = content.find('<script', pos + 7)
    next_body  = content.find('</body>', pos)
    end_of_block = min(x for x in [next_open, next_body, len(content)] if x > pos)
    print('  Block ends at:', end_of_block)
    print('  Last 80 chars of block:', repr(content[end_of_block-80:end_of_block]))
