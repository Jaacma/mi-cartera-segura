const DAY=86_400_000;
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const round=(value,digits=4)=>finite(value)?Number(Number(value).toFixed(digits)):null;
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const stdev=values=>{if(values.length<2)return null;const avg=mean(values);return Math.sqrt(values.reduce((sum,value)=>sum+(value-avg)**2,0)/(values.length-1))};

function normalize(history=[]){
  const byDate=new Map();
  for(const row of history){if(row?.date&&finite(row.nav)&&Number(row.nav)>0)byDate.set(row.date,{date:row.date,nav:Number(row.nav)})}
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function returns(rows){const result=[];for(let index=1;index<rows.length;index++){const value=rows[index].nav/rows[index-1].nav-1;if(finite(value))result.push(value)}return result}
function periodReturn(rows,days){if(rows.length<2)return null;const end=rows.at(-1),cutoff=new Date(`${end.date}T12:00:00Z`).getTime()-days*DAY;let start=rows[0];for(const row of rows){if(new Date(`${row.date}T12:00:00Z`).getTime()<=cutoff)start=row;else break}if(start===end||new Date(`${start.date}T12:00:00Z`).getTime()>cutoff+14*DAY)return null;return 100*(end.nav/start.nav-1)}
function maxDrawdown(rows){if(rows.length<2)return null;let peak=rows[0].nav,worst=0;for(const row of rows){peak=Math.max(peak,row.nav);worst=Math.min(worst,row.nav/peak-1)}return 100*worst}
function percentile(values,p){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),index=Math.max(0,Math.min(sorted.length-1,Math.floor((sorted.length-1)*p)));return sorted[index]}

export function buildAnalytics(position,history,{riskFreeRate=0.02}={}){
  const rows=normalize(history),daily=returns(rows),years=rows.length>1?(new Date(`${rows.at(-1).date}T12:00:00Z`)-new Date(`${rows[0].date}T12:00:00Z`))/(365.25*DAY):0;
  const volatility=stdev(daily),annualVol=volatility==null?null:volatility*Math.sqrt(252),annualReturn=years>=0.8?(rows.at(-1).nav/rows[0].nav)**(1/years)-1:null;
  const downside=daily.filter(value=>value<0),downsideDeviation=downside.length?Math.sqrt(mean(downside.map(value=>value**2)))*Math.sqrt(252):null;
  const sharpe=annualVol&&annualReturn!=null?(annualReturn-riskFreeRate)/annualVol:null,sortino=downsideDeviation&&annualReturn!=null?(annualReturn-riskFreeRate)/downsideDeviation:null,drawdown=maxDrawdown(rows);
  return {
    isin:position.isin,name:position.name,benchmark:position.benchmark,observations:rows.length,
    history_from:rows[0]?.date||null,history_to:rows.at(-1)?.date||null,
    status:rows.length>=30?'Calculado con VL verificadas':`Necesita ${Math.max(0,30-rows.length)} VL adicionales`,
    return_1m_pct:round(periodReturn(rows,30)),return_3m_pct:round(periodReturn(rows,91)),return_6m_pct:round(periodReturn(rows,182)),return_1y_pct:round(periodReturn(rows,365)),
    total_return_pct:rows.length>1?round(100*(rows.at(-1).nav/rows[0].nav-1)):null,cagr_pct:annualReturn==null?null:round(100*annualReturn),
    volatility_pct:annualVol==null?null:round(100*annualVol),sharpe:round(sharpe),sortino:round(sortino),max_drawdown_pct:round(drawdown),
    var_95_daily_pct:daily.length>=20?round(-100*percentile(daily,0.05)):null,positive_days_pct:daily.length?round(100*daily.filter(value=>value>0).length/daily.length):null,
    best_day_pct:daily.length?round(100*Math.max(...daily)):null,worst_day_pct:daily.length?round(100*Math.min(...daily)):null,
    alpha_pct:null,beta:null,correlation:null,tracking_error_pct:null,information_ratio:null,
    benchmark_status:'Benchmark identificado; comparativa cuantitativa pendiente de una serie fiable y homogénea.'
  };
}

export function buildPortfolioAnalytics(positions=[]){
  const total=positions.reduce((sum,position)=>sum+Number(position.market_value||0),0);
  const weights=positions.map(position=>total?Number(position.market_value||0)/total:0);
  const hhi=weights.reduce((sum,weight)=>sum+weight**2,0);
  const top3=[...weights].sort((a,b)=>b-a).slice(0,3).reduce((sum,weight)=>sum+weight,0);
  const top5=[...weights].sort((a,b)=>b-a).slice(0,5).reduce((sum,weight)=>sum+weight,0);
  return {concentration_hhi:round(100*hhi,2),effective_positions:hhi?round(1/hhi,2):null,top3_weight_pct:round(100*top3,2),top5_weight_pct:round(100*top5,2)};
}
