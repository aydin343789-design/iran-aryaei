import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'www' / 'cities.json'
URL = 'https://raw.githubusercontent.com/arnpacc/iran-city-coordinates/main/geographic_coordinates_of_cities_in_iran.json'

fallback = json.loads(OUTPUT.read_text(encoding='utf-8-sig'))
known = {x['fa']: x for x in fallback}
request = Request(URL, headers={'User-Agent': 'IranAryaei-Build/5.0'})
with urlopen(request, timeout=30) as response:
    source = json.loads(response.read().decode('utf-8-sig'))

for province in source:
    for city in province.get('cities', []):
        name = str(city.get('name', '')).strip()
        lat = float(city.get('latitude', 0) or 0)
        lon = float(city.get('longitude', 0) or 0)
        if not name or not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
            continue
        old = known.get(name)
        if old:
            old['lat'] = lat
            old['lon'] = lon
        else:
            known[name] = {'fa': name, 'en': '', 'lat': lat, 'lon': lon}

result = sorted(known.values(), key=lambda x: x['fa'])
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'cities.json: {len(result)} cities')
