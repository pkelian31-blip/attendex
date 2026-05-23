import re
with open('index.html', 'rb') as f:
    content = f.read().decode('utf-8')

checks = [
    ('async function getSess',        'getSess async'),
    ('async function getDeviceId',     'getDeviceId async'),
    ('async function submitAttend',    'submitAttend async'),
    ('async function waitForFirebase', 'waitForFirebase async'),
    ('async function checkAutoUnblocks','checkAutoUnblocks async'),
    ('NO_DOUBLE_ASYNC',                'No double-async bug'),
    ('function checkStudentGeo',       'checkStudentGeo exists'),
    ('acc <= 300',                     'geo accepts 300m accuracy'),
    ('15000',                          'geo 15s timeout'),
    ('Math.min(acc, 100)',             'geo accuracy margin'),
    ('window.location.origin',         'dynamic base URL'),
    ('safeId',                         'safe Firestore doc ID'),
    ('permission-denied',              'permission error handling'),
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

print()
opens  = len(re.findall(r'(?:^|>)\s*<script[\s>]', content, re.MULTILINE))
closes = len(re.findall(r'</script\s*>', content))
balanced = opens == closes
if not balanced:
    all_ok = False
tag_status = 'OK     ' if balanced else 'BROKEN '
print('[' + tag_status + '] script tags (' + str(opens) + ' open, ' + str(closes) + ' close)')

print()
print('OVERALL: ' + ('ALL GOOD - ready to test!' if all_ok else 'PROBLEMS FOUND'))
