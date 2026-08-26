import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAnalytics,buildPortfolioAnalytics} from '../scripts/analytics.mjs';

test('calcula rentabilidad y riesgo con una serie verificada',()=>{
  const start=Date.UTC(2025,0,1),history=Array.from({length:370},(_,index)=>({date:new Date(start+index*86_400_000).toISOString().slice(0,10),nav:100*Math.pow(1.0005,index)*(1+0.01*Math.sin(index/5))}));
  const result=buildAnalytics({isin:'TEST',name:'Fondo',benchmark:'Índice'},history);
  assert.equal(result.observations,370);
  assert.ok(result.total_return_pct>0);
  assert.ok(result.volatility_pct>0);
  assert.ok(Number.isFinite(result.sharpe));
  assert.ok(result.max_drawdown_pct<=0);
  assert.ok(result.var_95_daily_pct>=0);
});

test('calcula concentración de cartera',()=>{
  const result=buildPortfolioAnalytics([{market_value:50},{market_value:30},{market_value:20}]);
  assert.equal(result.top3_weight_pct,100);
  assert.equal(result.concentration_hhi,38);
  assert.equal(result.effective_positions,2.63);
});

test('no convierte métricas ausentes en cero',()=>{
  const result=buildAnalytics({isin:'TEST',name:'Sin histórico'},[{date:'2026-08-25',nav:100}]);
  assert.equal(result.return_1m_pct,null);
  assert.equal(result.total_return_pct,null);
  assert.equal(result.volatility_pct,null);
  assert.equal(result.max_drawdown_pct,null);
});
