const QuemSouEuRules = (() => {
function begin(starter) {
  return { starter, active: starter, turns: [0, 0], questions: [0, 0], phase: 'normal', first: null, remaining: 0, result: null, log: [] };
}
function turnNumber(r) { return r.turns[r.active] + 1; }
function act(round, action, extraStart = 6) {
  const r = structuredClone(round);
  if (r.result !== null) throw new Error('Rodada encerrada.');
  const p = r.active, n = turnNumber(r);
  if (!['question', 'wrong', 'correct'].includes(action)) throw new Error('Ação inválida.');
  if (r.phase === 'extras' && action === 'question') throw new Error('Só palpites nesta fase.');
  if (r.phase === 'normal' && r.questions[p] < 3 && action !== 'question') throw new Error('Faça três perguntas antes de chutar.');
  r.log.push({ player: p, turn: n, action, phase: r.phase });
  r.turns[p]++;
  if (action === 'question') r.questions[p]++;
  if (r.phase !== 'normal') {
    if (action === 'correct') r.result = 'tie';
    else if (--r.remaining === 0) r.result = r.first;
    return r;
  }
  if (action !== 'correct') { r.active = 1 - p; return r; }
  r.first = p;
  r.remaining = n === 4 ? (p === r.starter ? 1 : 0) : Math.min(3, Math.max(0, n - extraStart + 1));
  if (!r.remaining) r.result = p;
  else { r.active = 1 - p; r.phase = n === 4 ? 'balance' : 'extras'; }
  return r;
}
return { begin, turnNumber, act };
})();
