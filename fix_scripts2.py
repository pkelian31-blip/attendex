import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# The main app script starts at 248935
# Let's find where it should end - look for the pattern before the next real <script>
# or before </body>

main_script_start = 248935

# Find all </script> tags and their positions
closes = [m.start() for m in re.finditer(r'</script\s*>', content)]
print('Close positions:', closes)

# The main script block (248935) needs a </script> 
# Find what comes right before the next <script> after 248935
next_scripts = [m.start() for m in re.finditer(r'<script', content) if m.start() > main_script_start]
print('Next script opens after main:', next_scripts[:5])

# Look at what's around position 622027 (first close after main script start)
print('\nAround close at 622027:')
print(repr(content[621980:622060]))

print('\nAround close at 655151:')
print(repr(content[655100:655200]))

print('\nAround close at 665409:')
print(repr(content[665360:665430]))

# Check: is there a </script> between 248935 and 339753?
closes_in_range = [c for c in closes if 248935 < c < 339753]
print('\nCloses between 248935 and 339753:', closes_in_range)

# What's at 339753?
print('\nAt 339753:')
print(repr(content[339700:339850]))
