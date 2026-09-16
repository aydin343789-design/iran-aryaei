import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
app=(ROOT/'www/app.js').read_text(encoding='utf-8')
errors=[]
head=app.split('const categories=')[0]
tools=re.findall(r'\{id:"([^"]+)"',head)
if len(tools)!=33: errors.append(f'Expected 33 tools, found {len(tools)}')
if len(set(tools))!=len(tools): errors.append('Duplicate tool IDs')
for tid in tools:
    if f'if(id==="{tid}")return' not in app: errors.append(f'missing form: {tid}')
    if f'if(id==="{tid}")result=' not in app: errors.append(f'missing executor: {tid}')
for name in ['cities.json','dictionary.json','ghazal.json','intents.json']:
    try: json.load(open(ROOT/'www'/name,encoding='utf-8'))
    except Exception as e: errors.append(f'{name}: {e}')
c=json.load(open(ROOT/'www/cities.json',encoding='utf-8'))['cities']
if len(c)<160: errors.append(f'city database too small: {len(c)}')
for x in c:
    if not all(k in x for k in ('name','lat','lon')): errors.append(f'city missing fields: {x}')
    if not (-90<=float(x['lat'])<=90 and -180<=float(x['lon'])<=180): errors.append(f'bad coordinates: {x}')
d=json.load(open(ROOT/'www/dictionary.json',encoding='utf-8'))['entries']
if len(d)<900: errors.append(f'dictionary too small: {len(d)}')
for x in d:
    if not x.get('en') or not x.get('fa'): errors.append('dictionary entry missing en/fa')
intents=json.load(open(ROOT/'www/intents.json',encoding='utf-8'))['intents']
intent_ids={x['id'] for x in intents}
for tid in tools:
    if tid not in intent_ids: errors.append(f'missing intent: {tid}')
for vendor in (ROOT/'www/vendor').iterdir():
    if vendor.is_file(): pass
# no accidental remote runtime dependencies in primary source
for pattern in [r'https://cdn\.', r'https://unpkg\.com', r'https://cdnjs\.cloudflare\.com']:
    if re.search(pattern, app, re.I): errors.append(f'remote dependency in app.js: {pattern}')
print('TOOLS',len(tools))
print('CITIES',len(c))
print('DICTIONARY',len(d))
print('INTENTS',len(intents))
if errors:
    print('FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('PASS')
