(() => {
'use strict';
const { begin, act, turnNumber } = QuemSouEuRules;
const $ = id => document.getElementById(id);
const KEY = '4gamers-quem-sou-eu-v1';
const defaults = { players: ['Rodrigo', 'Marcos'], tiePoints: 0, extraStart: 6, identities: [['Intel Pentium 4', 'RAM Kingston HyperX FURY DDR3'], ['NVIDIA GeForce GT 1030 DDR4', 'ATI Radeon 9700 Pro'], ['', '']] };
let data = { config: structuredClone(defaults), rounds: [null, null, null], index: 0, undo: [] };
let visible = false, deadline = 0, remainingMs = 30000, interval;
const names = () => data.config.players;
const current = () => data.rounds[data.index];
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); $('saveStatus').textContent = 'Salvo neste aparelho'; } catch { $('saveStatus').textContent = 'Não foi possível salvar neste navegador. Baixe um backup.'; } }
function validate(value) {
  if (!value || !value.config || !Array.isArray(value.rounds) || value.rounds.length !== 3 || !Number.isInteger(value.index) || value.index < 0 || value.index > 2) throw Error('Backup inválido.');
  const c = value.config;
  if (!Array.isArray(c.players) || c.players.length !== 2 || c.players.some(n => typeof n !== 'string' || !n.trim() || n.length > 60) || ![0,1].includes(c.tiePoints) || ![5,6].includes(c.extraStart)) throw Error('Configuração inválida.');
  if (!Array.isArray(c.identities) || c.identities.length !== 3 || c.identities.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(s => typeof s !== 'string' || s.length > 220))) throw Error('Identidades inválidas.');
  value.rounds = value.rounds.map(r => {
    if (r === null) return null;
    if (![0,1].includes(r.starter) || !Array.isArray(r.log) || r.log.length > 10000) throw Error('Rodada inválida.');
    return r.log.reduce((state, entry) => act(state, entry.action, c.extraStart), begin(r.starter));
  });
  value.undo = [];
  return value;
}
try { const raw = localStorage.getItem(KEY); if (raw) data = validate(JSON.parse(raw)); } catch { $('saveStatus').textContent = 'Não foi possível recuperar a partida. Os exemplos foram carregados.'; }
function snapshot() { data.undo.push(JSON.stringify({rounds: data.rounds, index: data.index})); if (data.undo.length > 100) data.undo.shift(); }
function button(text, onClick, cls = 'btn') { const el = document.createElement('button'); el.className = cls; el.textContent = text; el.onclick = onClick; return el; }
function resetTimer() { clearInterval(interval); deadline = 0; remainingMs = 30000; paintTimer(); $('timerToggle').textContent = 'Iniciar 30 s'; $('timerStatus').textContent = 'O timer não passa a vez automaticamente.'; }
function paintTimer() {
  const seconds = Math.ceil(remainingMs / 1000);
  $('seconds').textContent = seconds;
  $('timer').setAttribute('aria-label', `${seconds} segundos`);
  $('timer').style.setProperty('--angle', `${seconds * 12}deg`);
  $('timer').classList.toggle('urgent', seconds > 0 && seconds <= 5);
  $('timer').classList.toggle('alternate', seconds % 2 === 0);
}
function tick() { remainingMs = Math.max(0, deadline - Date.now()); paintTimer(); if (!remainingMs) { clearInterval(interval); deadline = 0; $('timerToggle').textContent = 'Iniciar 30 s'; $('timerStatus').textContent = 'Tempo encerrado. O apresentador decide quando seguir.'; } }
$('timerToggle').onclick = () => {
  if (deadline) { remainingMs = Math.max(0, deadline - Date.now()); clearInterval(interval); deadline = 0; $('timerToggle').textContent = 'Continuar'; paintTimer(); }
  else { if (!remainingMs) remainingMs = 30000; deadline = Date.now() + remainingMs; interval = setInterval(tick, 100); $('timerToggle').textContent = 'Pausar'; $('timerStatus').textContent = 'Pensando na pergunta…'; tick(); }
};
$('timerReset').onclick = resetTimer;
document.addEventListener('visibilitychange', () => { if (deadline) tick(); });
function render() {
  const r = current(), totals = [0,0];
  data.rounds.forEach(row => { if (row?.result === 'tie') { totals[0] += data.config.tiePoints; totals[1] += data.config.tiePoints; } else if (row && Number.isInteger(row.result)) totals[row.result]++; });
  $('scoreboard').replaceChildren(...names().map((name,p) => { const box = document.createElement('div'); box.className = 'score'; const label = document.createElement('strong'); label.textContent = name; const score = document.createElement('b'); score.textContent = totals[p]; const turns = document.createElement('small'); turns.textContent = r ? `${r.questions[p]} perguntas · ${r.turns[p]} turnos concluídos` : 'Ainda não começou'; box.append(label,score,turns); return box; }));
  $('rounds').replaceChildren(...data.rounds.map((row,i) => { const b = button(`Rodada ${i+1}${row?.result != null ? ' ✓' : ''}`, () => { data.index = i; visible = false; resetTimer(); save(); render(); }); b.setAttribute('aria-current', i === data.index ? 'step' : 'false'); b.disabled = i > 0 && data.rounds[i-1]?.result == null; return b; }));
  $('setup').hidden = !!r; $('live').hidden = !r;
  if (!r) {
    const prior = data.index ? data.rounds[data.index-1]?.result : null;
    $('setupHelp').textContent = prior === 'tie' ? 'A rodada anterior empatou. A mesa decide quem começa.' : prior !== null ? `${names()[prior]} venceu a rodada anterior e começa esta.` : 'Use o vencedor da partida anterior ou o critério da produção.';
    $('starters').replaceChildren(...names().map((n,p) => { const b = button(`${n} começa`, () => { snapshot(); data.rounds[data.index] = begin(p); save(); render(); }, 'btn primary'); b.disabled = Number.isInteger(prior) && prior !== p; return b; })); return;
  }
  $('identities').replaceChildren(...names().map((n,p) => { const el = document.createElement('p'); el.textContent = `${n}: ${visible ? data.config.identities[data.index][p] || 'Não cadastrada — prepare antes de jogar' : 'Identidade oculta'}`; return el; }));
  $('showSecrets').textContent = visible ? 'Ocultar' : 'Mostrar'; $('showSecrets').setAttribute('aria-pressed', String(visible));
  const finished = r.result !== null, canGuess = r.questions[r.active] >= 3 || r.phase === 'extras';
  $('phase').textContent = `Rodada ${data.index+1} · ${r.phase === 'normal' ? 'Turnos alternados' : r.phase === 'balance' ? 'Equilíbrio de turnos' : 'Palpites extras'}`;
  $('activeName').textContent = finished ? 'Rodada encerrada' : `Vez de ${names()[r.active]}`;
  $('turnInfo').textContent = `Começou: ${names()[r.starter]} · ${finished ? 'Turnos concluídos acima' : `Turno ${turnNumber(r)} de ${names()[r.active]}`}`;
  $('ruleHint').textContent = r.phase === 'extras' ? `${r.remaining} tentativa(s) restante(s). Apenas palpite direto, sem pergunta. Acertou: empate.` : r.phase === 'balance' ? 'Última chance: o segundo jogador tem seu 4º turno. Pode perguntar OU chutar. Se não acertar, vence quem acertou primeiro.' : canGuess ? 'Palpite liberado: faça uma pergunta OU um palpite neste turno.' : `Só perguntas. Faltam ${3-r.questions[r.active]} pergunta(s) respondida(s) para liberar o palpite.`;
  $('actions').hidden = finished;
  $('question').disabled = r.phase === 'extras'; $('wrong').disabled = !canGuess; $('correct').disabled = !canGuess;
  $('timerToggle').disabled = finished || r.phase === 'extras'; $('timerReset').disabled = finished || r.phase === 'extras';
  $('result').hidden = !finished;
  if (finished) {
    $('resultTitle').textContent = r.result === 'tie' ? 'Rodada empatada' : `${names()[r.result]} venceu!`;
    $('resultHelp').textContent = r.result === 'tie' ? (data.config.tiePoints ? '1 ponto para cada jogador.' : 'Ninguém pontua nesta rodada.') : '1 ponto no placar.';
    const complete = data.rounds.every(row => row?.result != null);
    if (complete) $('resultHelp').textContent += totals[0] === totals[1] ? ' Partida empatada.' : ` Campeão: ${names()[totals[0] > totals[1] ? 0 : 1]}.`;
    $('nextRound').hidden = data.index === 2;
  }
  $('undo').disabled = !data.undo.length;
  $('history').replaceChildren(...r.log.map(entry => { const li = document.createElement('li'); li.textContent = `${names()[entry.player]} · turno ${entry.turn}: ${{question:'pergunta respondida',wrong:'palpite errado',correct:'acertou'}[entry.action]}${entry.phase === 'extras' ? ' (extra)' : ''}`; return li; }));
}
function perform(action) { try { const next = act(current(), action, data.config.extraStart); snapshot(); data.rounds[data.index] = next; resetTimer(); save(); render(); } catch(e) { alert(e.message); } }
$('question').onclick = () => perform('question'); $('wrong').onclick = () => perform('wrong'); $('correct').onclick = () => perform('correct');
$('showSecrets').onclick = () => { visible = !visible; render(); };
$('nextRound').onclick = () => { data.index++; visible = false; resetTimer(); save(); render(); };
$('undo').onclick = () => { if (!data.undo.length) return; const prev = JSON.parse(data.undo.pop()); data.rounds = prev.rounds; data.index = prev.index; resetTimer(); save(); render(); };
function edit() {
  $('player0').value = names()[0]; $('player1').value = names()[1]; $('tiePoints').value = data.config.tiePoints;
  $('identityFields').replaceChildren(...data.config.identities.map((pair,i) => { const field = document.createElement('fieldset'); const title = document.createElement('legend'); title.textContent = `Rodada ${i+1}`; field.append(title); pair.forEach((s,p) => { const label = document.createElement('label'); label.textContent = `Identidade do jogador ${p+1}`; const input = document.createElement('input'); input.id = `identity${i}${p}`; input.value = s; input.maxLength = 220; input.placeholder = 'Nome específico do item'; label.append(input); field.append(label); }); return field; }));
}
function page(mode) { ['play','edit','help'].forEach(key => { $(`${key}View`).hidden = key !== mode; $(`${key}Tab`).setAttribute('aria-pressed', String(key === mode)); }); if (mode === 'edit') edit(); if (mode !== 'play') resetTimer(); }
['play','edit','help'].forEach(key => $(`${key}Tab`).onclick = () => page(key));
$('settings').onsubmit = e => { e.preventDefault(); const players = [$('player0').value.trim(),$('player1').value.trim()]; if (players.some(n => !n)) return alert('Preencha os nomes.'); if (data.rounds.some(Boolean) && !confirm('Iniciar uma nova partida e apagar o progresso atual?')) return; data = { config: { players, tiePoints: Number($('tiePoints').value), extraStart: data.config.extraStart, identities: [0,1,2].map(i => [0,1].map(p => $(`identity${i}${p}`).value.trim())) }, rounds:[null,null,null], index:0, undo:[] }; visible = false; resetTimer(); save(); render(); page('play'); };
$('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify({formato:'quem-sou-eu',versao:1,data},null,2)],{type:'application/json'})); const link = document.createElement('a'); link.href = url; link.download = 'quem-sou-eu-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); };
$('import').onchange = async e => { try { const file = e.target.files[0]; if (!file) return; if (file.size > 2000000) throw Error('Backup muito grande (máximo 2 MB).'); const raw = JSON.parse(await file.text()); if (raw.formato !== 'quem-sou-eu' || raw.versao !== 1) throw Error('Use um backup do Quem Sou Eu?'); const next = validate(raw.data); if (!confirm('Substituir a partida atual pelo backup?')) return; data = next; visible = false; resetTimer(); save(); render(); page('play'); } catch(err) { alert(err.message); } finally { e.target.value = ''; } };
render();
if (location.hash === '#regras') page('help');
addEventListener('hashchange', () => { if (location.hash === '#regras') page('help'); });
})();
