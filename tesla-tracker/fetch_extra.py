# Writes public market data only: data/history.json (daily OHLC for TSLA, closes for SPY/FX), data/news.json (headlines, earnings, analyst targets)
import json,sys,time,re,os,urllib.request,urllib.parse,http.cookiejar,html,email.utils
out=sys.argv[1] if len(sys.argv)>1 else 'tesla-tracker/data'
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
cj=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def g(u):return op.open(urllib.request.Request(u,headers=UA),timeout=30).read()
def rd(x,n=5):
  return None if x is None else round(x,n)
def chart(sym,rng='10y',ohlc=False):
  r=json.loads(g(f'https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range={rng}&interval=1d'))['chart']['result'][0]
  q=r['indicators']['quote'][0];out=[]
  ts,cl=r['timestamp'],q['close']
  op,hi,lo,vo=q.get('open') or [],q.get('high') or [],q.get('low') or [],q.get('volume') or []
  for i,t in enumerate(ts):
    c=cl[i] if i<len(cl) else None
    if c is None: continue
    row=[t,round(c,5)]
    if ohlc:
      o=op[i] if i<len(op) else None
      h=hi[i] if i<len(hi) else None
      l=lo[i] if i<len(lo) else None
      v=vo[i] if i<len(vo) else None
      row += [rd(o),rd(h),rd(l), None if v is None else int(v)]
    out.append(row)
  return out
hist={'updated':int(time.time()),'source':'Yahoo Finance daily closes'}
def chart_try(sym,ohlc=False):
  last=None
  for rng in ('10y','5y'):
    try:return chart(sym,rng,ohlc=ohlc)
    except Exception as e:
      last=e;print('hist',sym,rng,e,file=sys.stderr);time.sleep(1)
  raise last or RuntimeError('no history')
for k,s in [('TSLA','TSLA'),('SPY','SPY'),('USDGBP','GBP=X')]:
  try:hist[k]=chart_try(s,ohlc=(k=='TSLA'));time.sleep(1)
  except Exception as e:print('hist',k,e,file=sys.stderr)
# Keep any series the live fetch missed so a flaky Yahoo call cannot wipe 10y of data
oldp=f'{out}/history.json'
if os.path.exists(oldp):
  try:
    old=json.load(open(oldp))
    for k in ('TSLA','SPY','USDGBP'):
      if k not in hist and k in old: hist[k]=old[k]
  except Exception as e:
    print('hist merge',e,file=sys.stderr)
if hist.get('TSLA') and len(hist['TSLA'][0])>2: hist['source']='Yahoo Finance daily OHLC'
if 'TSLA' in hist: json.dump(hist,open(oldp,'w'),separators=(',',':'))
def rss(u,n=12):
  b=g(u).decode('utf-8','ignore');items=[]
  for it in re.findall(r'<item>(.*?)</item>',b,re.S)[:n]:
    f=lambda t:(re.search(rf'<{t}[^>]*>(.*?)</{t}>',it,re.S) or [None,''])[1]
    title=html.unescape(re.sub(r'<!\[CDATA\[|\]\]>','',f('title'))).strip();link=html.unescape(re.sub(r'<!\[CDATA\[|\]\]>','',f('link'))).strip()
    src=html.unescape(re.sub(r'<[^>]+>','',f('source'))).strip()
    try:ts=int(email.utils.parsedate_to_datetime(f('pubDate')).timestamp())
    except Exception:ts=None
    if title:items.append({'title':title,'link':link,'source':src,'time':ts})
  return items
news={'updated':int(time.time()),'headlines':[],'earnings':None,'analysts':None,'deliveries':None}
try:news['headlines']=rss('https://news.google.com/rss/search?q=Tesla+TSLA+stock+when:3d&hl=en-GB&gl=GB&ceid=GB:en',15)
except Exception as e:print('news',e,file=sys.stderr)
if not news['headlines']:
  try:news['headlines']=rss('https://feeds.finance.yahoo.com/rss/2.0/headline?s=TSLA&region=US&lang=en-US',15)
  except Exception as e:print('yrss',e,file=sys.stderr)
try:
  dl=rss('https://news.google.com/rss/search?q=Tesla+quarterly+deliveries+vehicles+when:120d&hl=en-US&gl=US&ceid=US:en',30)
  dl=[x for x in dl if re.search(r'deliver',x['title'],re.I)]
  if dl:news['deliveries']=max(dl,key=lambda x:x['time'] or 0)
except Exception as e:print('deliv',e,file=sys.stderr)
try:
  try:g('https://fc.yahoo.com')
  except Exception:pass
  c=g('https://query1.finance.yahoo.com/v1/test/getcrumb').decode()
  r=json.loads(g(f'https://query2.finance.yahoo.com/v10/finance/quoteSummary/TSLA?modules=calendarEvents,financialData&crumb={urllib.parse.quote(c)}'))['quoteSummary']['result'][0]
  ed=[x['raw'] for x in r['calendarEvents']['earnings'].get('earningsDate',[])]
  news['earnings']={'dates':ed,'source':'Yahoo Finance','asOf':int(time.time())}
  f=r['financialData'];v=lambda k:(f.get(k) or {}).get('raw')
  if v('targetMeanPrice'):news['analysts']={'mean':v('targetMeanPrice'),'high':v('targetHighPrice'),'low':v('targetLowPrice'),'median':v('targetMedianPrice'),'count':v('numberOfAnalystOpinions'),'rec':f.get('recommendationKey'),'source':'Yahoo Finance','asOf':int(time.time())}
except Exception as e:print('qs',e,file=sys.stderr)
if news.get('headlines') or news.get('analysts'): json.dump(news,open(f'{out}/news.json','w'),separators=(',',':'))
print('hist',{k:len(v) for k,v in hist.items() if isinstance(v,list)},'news',len(news['headlines']),'deliv',bool(news['deliveries']),'earn',news['earnings'] and news['earnings']['dates'],'an',bool(news['analysts']))
