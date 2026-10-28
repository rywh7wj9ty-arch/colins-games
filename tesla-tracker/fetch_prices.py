import json,urllib.request,time,sys
UA={'User-Agent':'Mozilla/5.0'}
def get(u):
  return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30))
out={'updated':int(time.time()),'ranges':{}}
for rng,iv in [('1d','5m'),('5d','30m'),('1mo','1d'),('6mo','1d'),('1y','1d'),('5y','1wk')]:
  r=get(f'https://query2.finance.yahoo.com/v8/finance/chart/TSLA?range={rng}&interval={iv}')['chart']['result'][0]
  q=r['indicators']['quote'][0]['close']
  pts=[[t,round(c,2)] for t,c in zip(r.get('timestamp',[]),q) if c is not None]
  out['ranges'][rng]=pts
  if rng=='1d':
    m=r['meta'];out['price']=m['regularMarketPrice'];out['prevClose']=m.get('chartPreviousClose') or m.get('previousClose');out['marketTime']=m['regularMarketTime']
  time.sleep(1)
try:
  fx=get('https://query2.finance.yahoo.com/v8/finance/chart/GBP=X?range=1y&interval=1d')['chart']['result'][0]
  out['usdgbp']=fx['meta']['regularMarketPrice']
  out['fxHist']=[[t,round(c,5)] for t,c in zip(fx['timestamp'],fx['indicators']['quote'][0]['close']) if c]
except Exception as e: print('fx',e,file=sys.stderr)
json.dump(out,open(sys.argv[1],'w'),separators=(',',':'))
print(out['price'],out.get('usdgbp'))
