"""Download what the tide place pages are built from, from NOAA CO-OPS.

    python scripts/tide-fetch-places.py [YEAR]     (default: next calendar year)

For every active tidal NOAA water-level station (the ~240 NWLON-type gauges,
Great Lakes excluded - they have no tide), saves into
scripts/.tide-places-cache/<id>/:

    station.json   the station's entry in the MDAPI water-level list
    datums.json    tidal datums, observed records, HAT/LAT, HWI/LWI (metric)
    harcon.json    harmonic constants (metric) - shipped to each page so it
                   can predict for itself if NOAA does not answer
    hilo-YEAR.json a whole year of official high/low predictions, MLLW, feet,
                   local standard/daylight time - the year's biggest and
                   smallest tides are read from these, never computed
    watertemp.json the latest water temperature reading, or {} if the gauge
                   has none - decides whether the page offers live water
                   temperature (and says so in its title). Delete it to recheck.

All keyless and public. Files already present are not fetched again;
delete the folder to refresh. scripts/tide-build-places.py reads the cache.
"""
import json, os, sys, time, datetime, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '.tide-places-cache')
MD = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi'
DG = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today().year + 1


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'tide-places-build'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def save(path, url):
    if os.path.exists(path):
        return json.load(open(path))
    d = get(url)
    with open(path, 'w') as f:
        json.dump(d, f)
    time.sleep(0.2)   # be polite to NOAA
    return d


def main():
    os.makedirs(CACHE, exist_ok=True)
    lst = save(os.path.join(CACHE, 'stations.json'), MD + '/stations.json?type=waterlevels')
    sts = [s for s in lst['stations'] if s.get('tidal') and not s.get('greatlakes')]
    print(len(sts), 'tidal stations; year', YEAR)
    bad = []
    for n, s in enumerate(sts, 1):
        sid = s['id']
        d = os.path.join(CACHE, sid)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, 'station.json'), 'w') as f:
            json.dump(s, f)
        try:
            save(os.path.join(d, 'datums.json'), f'{MD}/stations/{sid}/datums.json?units=metric')
            save(os.path.join(d, 'harcon.json'), f'{MD}/stations/{sid}/harcon.json?units=metric')
            save(os.path.join(d, f'hilo-{YEAR}.json'),
                 f'{DG}?product=predictions&station={sid}&begin_date={YEAR}0101&end_date={YEAR}1231'
                 '&datum=MLLW&units=english&time_zone=lst_ldt&interval=hilo&format=json')
        except Exception as e:
            bad.append((sid, s['name'], str(e)[:80]))
        wt = os.path.join(d, 'watertemp.json')
        if not os.path.exists(wt):
            try:
                j = get(f'{DG}?product=water_temperature&date=latest&station={sid}'
                        '&units=english&time_zone=lst_ldt&format=json', tries=2)
                j = j['data'][0] if j.get('data') else {}
            except Exception:
                j = {}
            with open(wt, 'w') as f:
                json.dump(j, f)
        if n % 20 == 0:
            print(n, '/', len(sts))
    print('done;', len(bad), 'failed')
    for b in bad:
        print('  ', *b)


main()
