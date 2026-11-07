/* Questões TRF3 – app de treino offline.
   Dados: window.QUESTOES (questoes.js). Progresso salvo no próprio aparelho (localStorage). */
(function () {
  "use strict";
  const Q = (window.QUESTOES || []).slice();
  const byId = Object.fromEntries(Q.map(q => [q.id, q]));
  const LETRAS = ["A", "B", "C", "D", "E"];

  const GRUPOS = [
    { id: "esp", nome: "Conhecimentos Específicos", peso: "36 questões · peso 2", test: q => /^M\d/.test(q.tema) },
    { id: "ger", nome: "Conhecimentos Gerais", peso: "24 questões · peso 1", test: q => /^G\d/.test(q.tema) },
    { id: "sim", nome: "Simulados da apostila", peso: "", test: q => q.tema === "SG" || q.tema === "SF" },
    { id: "vun", nome: "Provas anteriores VUNESP", peso: "", test: q => q.fonte && q.fonte.startsWith("VUNESP") },
  ];

  /* ---------- armazenamento ---------- */
  const KEY = "trf3q.v1";
  let S = { resp: {}, fav: {}, hist: [] };
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function registrar(id, letra) {
    const q = byId[id]; const ok = letra === q.resp;
    const r = S.resp[id] || { n: 0, acertos: 0 };
    r.n++; if (ok) r.acertos++; r.ult = letra; r.ok = ok; r.t = Date.now();
    S.resp[id] = r; salvar(); return ok;
  }

  /* ---------- utilidades ---------- */
  const $tela = document.getElementById("tela");
  const $titulo = document.getElementById("titulo");
  const $voltar = document.getElementById("voltar");
  const $relogio = document.getElementById("relogio");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function el(html) { const d = document.createElement("div"); d.innerHTML = html; return d; }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function temas() {
    const m = new Map();
    for (const q of Q) if (!m.has(q.tema)) m.set(q.tema, { id: q.tema, nome: q.temaNome, qs: [] });
    for (const q of Q) m.get(q.tema).qs.push(q);
    return [...m.values()];
  }
  function desempenho(qs) {
    let feitas = 0, certas = 0;
    for (const q of qs) { const r = S.resp[q.id]; if (r) { feitas++; if (r.ok) certas++; } }
    return { feitas, certas, total: qs.length, pct: feitas ? Math.round(100 * certas / feitas) : null };
  }
  function nomeCurto(t) { return t.replace(/^Módulo (\d)\. /, "M$1 · ").replace(/^(G\d)\. /, "$1 · "); }

  /* ---------- navegação ---------- */
  const pilha = [];
  let timer = null;
  function ir(fn, titulo, substituir) {
    if (substituir) pilha.pop();
    pilha.push({ fn, titulo });
    render();
  }
  function render() {
    const topo = pilha[pilha.length - 1];
    $titulo.textContent = topo.titulo;
    $voltar.hidden = pilha.length < 2;
    $tela.innerHTML = "";
    document.querySelectorAll(".barra").forEach(b => b.remove());
    topo.fn();
    window.scrollTo(0, 0);
  }
  function voltar() {
    if (pilha.length < 2) return false;
    const topo = pilha[pilha.length - 1];
    if (topo.antesDeSair && !topo.antesDeSair()) return true;
    pilha.pop(); pararRelogio(); render(); return true;
  }
  $voltar.addEventListener("click", voltar);
  window.appBack = voltar; // chamado pelo botão "voltar" do Android

  function pararRelogio() { if (timer) clearInterval(timer); timer = null; $relogio.hidden = true; }

  /* ---------- tela inicial ---------- */
  function home() {
    const d = desempenho(Q);
    const erradas = Q.filter(q => S.resp[q.id] && !S.resp[q.id].ok).length;
    const favs = Object.keys(S.fav).filter(id => byId[id]).length;
    const box = el(`
      <div class="stats">
        <div class="stat"><b>${d.feitas}/${Q.length}</b><span>respondidas</span></div>
        <div class="stat"><b>${d.pct === null ? "–" : d.pct + "%"}</b><span>de acerto</span></div>
        <div class="stat"><b>${erradas}</b><span>para revisar</span></div>
      </div>
      <h2>Treinar</h2>
      <button class="btn" data-a="temas"><span class="t">Por tema</span><span class="s">Escolha o módulo e veja a resposta comentada logo depois de cada questão</span></button>
      <button class="btn" data-a="mix"><span class="t">Aleatórias</span><span class="s">Questões misturadas de todos os temas, priorizando as que você ainda não fez</span></button>
      <button class="btn" data-a="erros"><span class="t">Revisar erros (${erradas})</span><span class="s">Só as questões que você errou da última vez</span></button>
      <button class="btn" data-a="favs"><span class="t">Favoritas (${favs})</span><span class="s">As que você marcou com ★</span></button>
      <h2>Prova</h2>
      <button class="btn" data-a="simulado"><span class="t">Simulado cronometrado</span><span class="s">Sem ver a resposta até o fim, com nota e correção comentada</span></button>
      <h2>Mais</h2>
      <button class="btn" data-a="hist"><span class="t">Histórico de simulados</span><span class="s">${S.hist.length} simulado(s) feito(s)</span></button>
      <button class="btn" data-a="zerar"><span class="t">Zerar progresso</span><span class="s">Apaga respostas, favoritas e histórico deste aparelho</span></button>
      <p class="small">${Q.length} questões · ${GRUPOS.filter(g => Q.some(g.test)).map(g => g.nome + ": " + Q.filter(g.test).length).join(" · ")}</p>`);
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "temas") ir(listaTemas, "Por tema");
      if (a === "mix") {
        const nao = shuffle(Q.filter(q => !S.resp[q.id])), sim = shuffle(Q.filter(q => S.resp[q.id]));
        ir(() => treino(nao.concat(sim).slice(0, 30), "Aleatórias"), "Aleatórias");
      }
      if (a === "erros") {
        const l = Q.filter(q => S.resp[q.id] && !S.resp[q.id].ok);
        if (!l.length) return alert("Nenhum erro para revisar. 🎉");
        ir(() => treino(l, "Revisar erros"), "Revisar erros");
      }
      if (a === "favs") {
        const l = Q.filter(q => S.fav[q.id]);
        if (!l.length) return alert("Toque na ★ de uma questão para guardá-la aqui.");
        ir(() => treino(l, "Favoritas"), "Favoritas");
      }
      if (a === "simulado") ir(configSimulado, "Simulado");
      if (a === "hist") ir(historico, "Histórico");
      if (a === "zerar" && confirm("Apagar todo o seu progresso neste aparelho?")) {
        S = { resp: {}, fav: {}, hist: [] }; salvar(); render();
      }
    });
    $tela.append(box);
  }

  /* ---------- lista de temas ---------- */
  function listaTemas() {
    const ts = temas();
    // provas VUNESP: uma entrada por prova, questões na ordem do caderno
    const provas = new Map();
    for (const q of Q) if (q.fonte && q.fonte.startsWith("VUNESP")) {
      if (!provas.has(q.fonte)) provas.set(q.fonte, { id: q.fonte, nome: q.fonte, qs: [] });
      provas.get(q.fonte).qs.push(q);
    }
    for (const p of provas.values()) p.qs.sort((a, b) => (a.num || 0) - (b.num || 0));
    for (const g of GRUPOS) {
      const lista = g.id === "vun" ? [...provas.values()].sort((a, b) => b.nome.localeCompare(a.nome)) : ts.filter(t => g.test(t.qs[0]));
      if (!lista.length) continue;
      $tela.append(el(`<h2>${g.nome} <span class="small">${g.peso}</span></h2>`));
      for (const t of lista) {
        const d = desempenho(t.qs);
        const b = el(`<button class="btn tema"><span class="info"><span class="t">${esc(nomeCurto(t.nome))}</span>
          <span class="s">${d.feitas}/${d.total} feitas${d.feitas ? " · " + d.certas + " certas" : ""}</span>
          <span class="bar"><i style="width:${d.total ? 100 * d.feitas / d.total : 0}%"></i></span></span>
          <span class="pct">${d.pct === null ? "" : d.pct + "%"}</span></button>`).firstElementChild;
        b.addEventListener("click", () => ir(() => filtroTema(t), nomeCurto(t.nome)));
        $tela.append(b);
      }
    }
  }
  function filtroTema(t) {
    const ops = [
      ["todas", "Todas", t.qs],
      ["nao", "Não feitas", t.qs.filter(q => !S.resp[q.id])],
      ["erradas", "Erradas", t.qs.filter(q => S.resp[q.id] && !S.resp[q.id].ok)],
    ];
    const box = el(`<div class="card"><b>${esc(t.nome)}</b><div class="small">${t.qs.length} questões</div></div>
      <h2>O que você quer fazer?</h2>`);
    for (const [, nome, l] of ops) {
      const b = el(`<button class="btn" ${l.length ? "" : "disabled"}><span class="t">${nome}</span><span class="s">${l.length} questão(ões)</span></button>`).firstElementChild;
      b.addEventListener("click", () => ir(() => treino(l, nome), nomeCurto(t.nome)));
      box.append(b);
    }
    $tela.append(box);
  }

  /* ---------- questão (comum a treino e simulado) ---------- */
  function cartaoQuestao(q, opts) {
    // opts: {idx, total, marcada, cortadas:Set, revelar:bool, onEscolha(letra)}
    const fav = !!S.fav[q.id];
    const card = el(`<div class="meta"><span>Questão ${opts.idx + 1} de ${opts.total} · ${esc(nomeCurto(q.temaNome))}</span>
        <button class="icon-btn ${fav ? "on" : ""}" aria-label="Favoritar">★</button></div>
      <div class="card enun">${q.fonte && q.fonte !== "Apostila" ? `<div class="small">${esc(q.fonte)}</div>` : ""}${q.enun.startsWith("<") ? q.enun : "<p>" + q.enun + "</p>"}</div>
      <div class="alts"></div>`);
    card.querySelector(".icon-btn").addEventListener("click", e => {
      if (S.fav[q.id]) delete S.fav[q.id]; else S.fav[q.id] = 1;
      salvar(); e.currentTarget.classList.toggle("on");
    });
    const alts = card.querySelector(".alts");
    for (const L of LETRAS) {
      if (!(L in q.alts)) continue;
      const b = el(`<button class="alt" data-l="${L}"><span class="l">${L}</span><span class="tx">${q.alts[L]}</span></button>`).firstElementChild;
      if (opts.cortadas && opts.cortadas.has(L)) b.classList.add("cortada");
      if (opts.revelar) {
        if (L === q.resp) b.classList.add("certa");
        else if (L === opts.marcada) b.classList.add("errada");
      } else if (L === opts.marcada) b.classList.add("sel");
      b.addEventListener("click", () => { if (!opts.revelar) opts.onEscolha(L); });
      b.addEventListener("contextmenu", e => { // toque longo = riscar alternativa
        e.preventDefault(); if (opts.revelar || !opts.cortadas) return;
        opts.cortadas.has(L) ? opts.cortadas.delete(L) : opts.cortadas.add(L);
        b.classList.toggle("cortada");
      });
      alts.append(b);
    }
    if (opts.revelar) {
      const ok = opts.marcada === q.resp;
      card.append(el(`<div class="feedback ${ok ? "ok" : "bad"}"><div class="h">${opts.marcada ? (ok ? "✓ Você acertou" : "✗ Você marcou " + opts.marcada + ". A resposta é " + q.resp) : "Em branco. A resposta é " + q.resp}</div>
        <div class="coment">${q.coment ? (q.coment.startsWith("<") ? q.coment : "<p>" + q.coment + "</p>") : "<p class='small'>Sem comentário para esta questão.</p>"}</div></div>`));
    }
    return card;
  }
  function barra(botoes) {
    const b = el(`<div class="barra"><div class="in"></div></div>`).firstElementChild;
    for (const [txt, cls, fn, off] of botoes) {
      const x = el(`<button class="btn ${cls}" ${off ? "disabled" : ""}>${txt}</button>`).firstElementChild;
      x.addEventListener("click", fn); b.firstElementChild.append(x);
    }
    document.body.append(b);
  }

  /* ---------- modo treino ---------- */
  function treino(lista, nome) {
    if (!lista.length) { $tela.append(el(`<div class="vazio">Nenhuma questão aqui.</div>`)); return; }
    const st = { i: 0, marcada: {}, revelada: {}, cortadas: {}, certas: 0 };
    pilha[pilha.length - 1].antesDeSair = () => true;
    function desenha() {
      $tela.innerHTML = ""; document.querySelectorAll(".barra").forEach(b => b.remove());
      const q = lista[st.i];
      st.cortadas[q.id] = st.cortadas[q.id] || new Set();
      $tela.append(cartaoQuestao(q, {
        idx: st.i, total: lista.length, marcada: st.marcada[q.id], cortadas: st.cortadas[q.id], revelar: !!st.revelada[q.id],
        onEscolha: L => { st.marcada[q.id] = L; desenha(); },
      }));
      if (!st.revelada[q.id]) {
        $tela.append(el(`<p class="small">Dica: toque e segure numa alternativa para riscá-la.</p>`));
        barra([
          ["‹", "sec", () => { if (st.i > 0) { st.i--; desenha(); } }, st.i === 0],
          ["Responder", "prim", () => {
            if (!st.marcada[q.id]) return alert("Escolha uma alternativa.");
            st.revelada[q.id] = true; if (registrar(q.id, st.marcada[q.id])) st.certas++; desenha();
          }],
        ]);
      } else {
        const ult = st.i === lista.length - 1;
        barra([
          ["‹", "sec", () => { if (st.i > 0) { st.i--; desenha(); } }, st.i === 0],
          [ult ? "Concluir" : "Próxima ›", "prim", () => { if (ult) fim(); else { st.i++; desenha(); } }],
        ]);
      }
      window.scrollTo(0, 0);
    }
    function fim() {
      const feitas = Object.keys(st.revelada).length;
      $tela.innerHTML = ""; document.querySelectorAll(".barra").forEach(b => b.remove());
      $tela.append(el(`<div class="card" style="text-align:center"><div class="small">${esc(nome)}</div>
        <div style="font-size:40px;font-weight:700;color:var(--navy)">${st.certas}/${feitas}</div>
        <div>${feitas ? Math.round(100 * st.certas / feitas) : 0}% de acerto</div></div>`));
      const b = el(`<button class="btn prim">Voltar</button>`).firstElementChild;
      b.addEventListener("click", voltar); $tela.append(b);
    }
    desenha();
  }

  /* ---------- simulado ---------- */
  function configSimulado() {
    const conjuntos = [
      ["prova", "Como a prova (Específicas + Gerais)", q => /^[MG]\d/.test(q.tema) || (q.fonte || "").startsWith("VUNESP")],
      ["esp", "Só Conhecimentos Específicos", q => /^M\d/.test(q.tema) || ((q.fonte || "").startsWith("VUNESP") && q.area === "esp")],
      ["ger", "Só Conhecimentos Gerais", q => /^G\d/.test(q.tema) || ((q.fonte || "").startsWith("VUNESP") && q.area === "ger")],
      ["SG", "Simulado de Gerais da apostila (12)", q => q.tema === "SG"],
      ["SF", "Simulado final da apostila (20)", q => q.tema === "SF"],
      ["vun", "Só provas anteriores VUNESP", q => (q.fonte || "").startsWith("VUNESP")],
    ].filter(c => Q.some(c[2]));
    let conj = conjuntos[0][0], qtd = 20, minPorQ = 3, soNovas = false;
    const box = el(`<h2>Questões de</h2><div class="chips" id="c1"></div>
      <h2>Quantidade</h2><div class="chips" id="c2"></div>
      <h2>Tempo</h2><div class="chips" id="c3"></div>
      <label class="opt"><input type="checkbox" id="novas"> Priorizar questões que ainda não fiz</label>
      <div class="aviso">Na prova real são 4h30 para 60 questões + redação. Reservando 1h para a redação, sobram cerca de <b>3,5 minutos por questão</b>.</div>
      <button class="btn prim" id="go">Começar simulado</button>`);
    function chips(id, itens, atual, set) {
      const c = box.querySelector(id); c.innerHTML = "";
      for (const [v, t] of itens) {
        const b = el(`<button class="chip ${v === atual() ? "on" : ""}">${t}</button>`).firstElementChild;
        b.addEventListener("click", () => { set(v); desenhaChips(); }); c.append(b);
      }
    }
    function desenhaChips() {
      chips("#c1", conjuntos.map(c => [c[0], c[1]]), () => conj, v => { conj = v; });
      const fixo = conj === "SG" || conj === "SF";
      chips("#c2", fixo ? [[0, "Todas"]] : [[10, "10"], [20, "20"], [36, "36"], [60, "60"]], () => fixo ? 0 : qtd, v => { qtd = v || qtd; });
      chips("#c3", [[2, "2 min/questão"], [3, "3 min"], [3.5, "3,5 min"], [0, "Sem tempo"]], () => minPorQ, v => { minPorQ = v; });
    }
    desenhaChips();
    box.querySelector("#novas").addEventListener("change", e => { soNovas = e.target.checked; });
    box.querySelector("#go").addEventListener("click", () => {
      const filtro = conjuntos.find(c => c[0] === conj)[2];
      let pool = Q.filter(filtro);
      if (conj !== "SG" && conj !== "SF") {
        pool = soNovas ? shuffle(pool.filter(q => !S.resp[q.id])).concat(shuffle(pool.filter(q => S.resp[q.id]))) : shuffle(pool);
        pool = pool.slice(0, qtd);
        if (conj === "prova") pool.sort((a, b) => (a.tema[0] === "G") - (b.tema[0] === "G")); // gerais no fim, como na ordem da apostila
      }
      ir(() => simulado(pool, minPorQ), "Simulado", false);
    });
    $tela.append(box);
  }

  function simulado(lista, minPorQ) {
    const st = { i: 0, marcada: {}, cortadas: {}, fim: false, inicio: Date.now() };
    const limite = minPorQ ? Math.round(lista.length * minPorQ * 60) : 0;
    pilha[pilha.length - 1].antesDeSair = () => st.fim || confirm("Sair do simulado? As respostas deste simulado serão perdidas.");
    function relogio() {
      $relogio.hidden = false;
      const tick = () => {
        const passou = Math.floor((Date.now() - st.inicio) / 1000);
        const s = limite ? Math.max(0, limite - passou) : passou;
        $relogio.textContent = (s >= 3600 ? Math.floor(s / 3600) + ":" : "") + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
        if (limite && s === 0 && !st.fim) { alert("Tempo esgotado!"); entregar(); }
      };
      tick(); timer = setInterval(tick, 1000);
    }
    function desenha() {
      $tela.innerHTML = ""; document.querySelectorAll(".barra").forEach(b => b.remove());
      const q = lista[st.i];
      st.cortadas[q.id] = st.cortadas[q.id] || new Set();
      $tela.append(cartaoQuestao(q, { idx: st.i, total: lista.length, marcada: st.marcada[q.id], cortadas: st.cortadas[q.id], revelar: false,
        onEscolha: L => { st.marcada[q.id] = st.marcada[q.id] === L ? undefined : L; desenha(); } }));
      const g = el(`<h2>Mapa do simulado</h2><div class="grade"></div>`);
      lista.forEach((x, k) => {
        const b = el(`<button class="${st.marcada[x.id] ? "feita" : ""}" ${k === st.i ? 'style="outline:2px solid var(--navy2)"' : ""}>${k + 1}</button>`).firstElementChild;
        b.addEventListener("click", () => { st.i = k; desenha(); }); g.querySelector(".grade").append(b);
      });
      $tela.append(g);
      const ult = st.i === lista.length - 1;
      barra([
        ["‹", "sec", () => { if (st.i > 0) { st.i--; desenha(); } }, st.i === 0],
        [ult ? "Entregar" : "Próxima ›", "prim", () => {
          if (!ult) { st.i++; desenha(); return; }
          const branco = lista.filter(x => !st.marcada[x.id]).length;
          if (confirm(branco ? `Há ${branco} em branco. Entregar mesmo assim?` : "Entregar o simulado?")) entregar();
        }],
      ]);
      window.scrollTo(0, 0);
    }
    function entregar() {
      st.fim = true; pararRelogio();
      let certas = 0; const porTema = {};
      for (const q of lista) {
        const L = st.marcada[q.id];
        const ok = L ? registrar(q.id, L) : false;
        if (ok) certas++;
        const k = nomeCurto(q.temaNome); porTema[k] = porTema[k] || [0, 0]; porTema[k][1]++; if (ok) porTema[k][0]++;
      }
      const seg = Math.floor((Date.now() - st.inicio) / 1000);
      S.hist.unshift({ t: Date.now(), certas, total: lista.length, seg }); S.hist = S.hist.slice(0, 50); salvar();
      // a partir daqui, voltar para esta tela mostra o resultado (e não reinicia o simulado)
      const topo = pilha[pilha.length - 1];
      topo.fn = () => resultado(lista, st.marcada, certas, porTema, seg);
      topo.antesDeSair = null; topo.titulo = "Resultado"; $titulo.textContent = "Resultado";
      resultado(lista, st.marcada, certas, porTema, seg);
    }
    relogio(); desenha();
  }

  function resultado(lista, marcada, certas, porTema, seg) {
    $tela.innerHTML = ""; document.querySelectorAll(".barra").forEach(b => b.remove());
    const pct = Math.round(100 * certas / lista.length);
    $tela.append(el(`<div class="card" style="text-align:center">
      <div style="font-size:44px;font-weight:700;color:var(--navy)">${certas}/${lista.length}</div>
      <div>${pct}% de acerto · ${Math.floor(seg / 60)} min ${seg % 60} s</div>
      <div class="small" style="margin-top:6px">${pct >= 70 ? "Ótimo ritmo, siga assim." : pct >= 50 ? "Acima do mínimo de 50%: agora é revisar os erros." : "Abaixo de 50%: revise os temas com mais erros antes do próximo."}</div></div>
      <h2>Por tema</h2>`));
    const tb = Object.entries(porTema).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
    for (const [k, [c, t]] of tb)
      $tela.append(el(`<div class="card tema" style="padding:10px 14px"><span class="info">${esc(k)}<span class="bar"><i style="width:${100 * c / t}%"></i></span></span><span class="pct">${c}/${t}</span></div>`).firstElementChild);
    const g = el(`<h2>Correção (toque para ver o comentário)</h2><div class="grade"></div>`);
    lista.forEach((q, k) => {
      const L = marcada[q.id];
      const b = el(`<button class="${L === q.resp ? "ok" : "bad"}">${k + 1}</button>`).firstElementChild;
      b.addEventListener("click", () => ir(() => revisar(lista, marcada, k), "Correção"));
      g.querySelector(".grade").append(b);
    });
    $tela.append(g);
    barra([["Voltar ao início", "prim", () => { pilha.length = 1; render(); }]]);
  }
  function revisar(lista, marcada, k) {
    const st = { i: k };
    function desenha() {
      $tela.innerHTML = ""; document.querySelectorAll(".barra").forEach(b => b.remove());
      const q = lista[st.i];
      $tela.append(cartaoQuestao(q, { idx: st.i, total: lista.length, marcada: marcada[q.id], revelar: true }));
      barra([
        ["‹", "sec", () => { if (st.i > 0) { st.i--; desenha(); } }, st.i === 0],
        ["Próxima ›", "prim", () => { if (st.i < lista.length - 1) { st.i++; desenha(); } }, st.i === lista.length - 1],
      ]);
      window.scrollTo(0, 0);
    }
    desenha();
  }

  function historico() {
    if (!S.hist.length) { $tela.append(el(`<div class="vazio">Você ainda não fez nenhum simulado.</div>`)); return; }
    for (const h of S.hist) {
      const d = new Date(h.t);
      $tela.append(el(`<div class="card tema"><span class="info">${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        <span class="s small" style="display:block">${Math.floor(h.seg / 60)} min</span></span><span class="pct">${h.certas}/${h.total}</span></div>`).firstElementChild);
    }
  }

  ir(home, "Questões TRF3");
})();
