# Writes public market data only: data/history.json (daily closes), data/news.json (headlines, earnings, analyst targets)
import json,sys,time,re,urllib.request,urllib.parse,http.cookiejar,html,email.utils
out=sys.argv[1] if len(sys.argv)>1 else 'tesla-tracker/data'
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
cj=http.cookiejar.CookieJar();op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def g(u):return op.open(urllib.request.Request(u,headers=UA),timeout=30).read()
def chart(sym,rng='5y'):
  r=json.loads(g(f'https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range={rng}&interval=1d'))['chart']['result'][0]
  return [[t,round(c,5)] for t,c in zip(r['timestamp'],r['indicators']['quote'][0]['close']) if c is not None]
hist={'updated':int(time.time()),'source':'Yahoo Finance daily closes'}
for k,s in [('TSLA','TSLA'),('SPY','SPY'),('USDGBP','GBP=X')]:
  try:hist[k]=chart(s);time.sleep(1)
  except Exception as e:print('hist',k,e,file=sys.stderr)
if 'TSLA' in hist: json.dump(hist,open(f'{out}/history.json','w'),separators=(',',':'))
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
