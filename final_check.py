import re

with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

# Only count script tags NOT preceded by backslash (i.e. not inside JS strings)
real_opens  = [m for m in re.finditer(r'<script(?:\s[^>]*)?>',  content)
               if '\\' not in content[max(0,m.start()-3):m.start()]]
real_closes = [m for m in re.finditer(r'</script\s*>', content)
               if '\\' not in content[max(0,m.start()-3):m.start()]]

checks = [
    ('async function getSess',         'getSess async'),
    ('async function getDeviceId',      'getDeviceId async'),
    ('async function submitAttend',     'submitAttend async'),
    ('async function waitForFirebase',  'waitForFirebase async'),
    ('async function checkAutoUnblocks','checkAutoUnblocks async'),
    ('NO_DOUBLE_ASYNC',                 'No double-async bug'),
    ('function checkStudentGeo',        'checkStudentGeo exists'),
    ('acc <= 300',                      'geo accepts 300m accuracy'),
    ('15000',                           'geo 15s timeout'),
    ('Math.min(acc, 100)',              'geo accuracy margin'),
    ('window.location.origin',          'dynamic base URL'),
    ('safeId',                          'safe Firestore doc ID'),
    ('permission-denied',               'permission error handling'),
]

all_ok = True
for search, label in checks:
    if search == 'NO_DOUBLE_ASYNC':
        found = 'async async' not in content
    else:
        found = search in content
    status = 'OK     ' if found else 'MISSING'
    if not found:
        all_ok = False
    print('[' + status + '] ' + label)

balanced = len(real_opens) == len(real_closes)
if not balanced:
    all_ok = False
tag_status = 'OK     ' if balanced else 'BROKEN '
print('[' + tag_status + '] script tags (' + str(len(real_opens)) + ' open, ' + str(len(real_closes)) + ' close)')

print()
print('OVERALL: ' + ('ALL GOOD - ready to test!' if all_ok else 'PROBLEMS FOUND'))
