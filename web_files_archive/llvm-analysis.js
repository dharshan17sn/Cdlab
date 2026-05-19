/* ============================================================
   Part 4: LLVM Whole-Program Analysis
   - LLVM IR viewer (.ll / .bc / pass log)
   - D3.js CFG reachability graph (green=live, red=dead)
   - D3.js Call graph (interprocedural)
   - LTO flow bar chart
   ============================================================ */

window.initLLVM = function () {

  initIRViewer();
  initCFGGraph();
  initCallGraph();
  initLTOChart();

  /* ---- IR Tab switching ---- */
  document.querySelectorAll('.ir-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ir-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderIR(btn.dataset.ir);
    });
  });
};

/* ============================================================
   LLVM IR Viewer
   ============================================================ */
const IR_CONTENT = {
  ll: [
    { cls: 'ir-kw',    text: 'define ',         inline: true },
    { cls: 'ir-type',  text: 'i32 ',            inline: true },
    { cls: '',         text: '@main(i32 %argc, i8** %argv) {', inline: false },
    { cls: 'ir-label', text: 'entry:',          inline: false },
    { cls: 'ir-kw',    text: '  %retval = alloca ', inline: true },
    { cls: 'ir-type',  text: 'i32',             inline: false },
    { cls: 'ir-kw',    text: '  call ',         inline: true },
    { cls: 'ir-type',  text: 'void ',           inline: true },
    { cls: 'ir-val',   text: '@vulkan_init()',  inline: false },
    { cls: 'ir-kw',    text: '  call ',         inline: true },
    { cls: 'ir-type',  text: 'void ',           inline: true },
    { cls: 'ir-val',   text: '@auth_oauth2_init()', inline: false },
    { cls: 'ir-kw',    text: '  br ',           inline: true },
    { cls: 'ir-type',  text: 'i1 ',             inline: true },
    { cls: 'ir-val',   text: 'false',           inline: true },
    { cls: '',         text: ', label ',        inline: true },
    { cls: 'ir-label', text: '%dead_block',     inline: true },
    { cls: '',         text: ', label ',        inline: true },
    { cls: 'ir-label', text: '%live_cont',      inline: false },
    { cls: 'ir-dead',  text: '; *** DEAD BLOCK: FEATURE_LEGACY_AUTH path ***', inline: false },
    { cls: 'ir-dead',  text: 'dead_block:', inline: false },
    { cls: 'ir-dead',  text: '  call void @legacy_auth_start()  ; UNREACHABLE', inline: false },
    { cls: 'ir-dead',  text: '  call void @oauth1_flow()        ; UNREACHABLE', inline: false },
    { cls: 'ir-dead',  text: '  br label %live_cont', inline: false },
    { cls: 'ir-label', text: 'live_cont:',      inline: false },
    { cls: 'ir-kw',    text: '  call ',         inline: true },
    { cls: 'ir-type',  text: 'void ',           inline: true },
    { cls: 'ir-val',   text: '@async_net_start()', inline: false },
    { cls: 'ir-kw',    text: '  ret ',          inline: true },
    { cls: 'ir-type',  text: 'i32 ',            inline: true },
    { cls: 'ir-val',   text: '0',               inline: false },
    { cls: '',         text: '}',               inline: false },
    { cls: '',         text: '',                inline: false },
    { cls: 'ir-kw',    text: 'define ',         inline: true },
    { cls: 'ir-type',  text: 'void ',           inline: true },
    { cls: 'ir-val',   text: '@vulkan_init()',  inline: true },
    { cls: '',         text: ' {',              inline: false },
    { cls: 'ir-label', text: 'entry:',          inline: false },
    { cls: '',         text: '  ; Vulkan setup calls ...', inline: false },
    { cls: 'ir-kw',    text: '  ret ',          inline: true },
    { cls: 'ir-type',  text: 'void',            inline: false },
    { cls: '',         text: '}',               inline: false },
  ],
  bc: [
    { cls: 'ir-kw',   text: '; LLVM Bitcode — binary representation (.bc)', inline: false },
    { cls: 'ir-type', text: '; Run: llvm-dis analysis.bc -o analysis.ll', inline: false },
    { cls: '',        text: '', inline: false },
    { cls: 'ir-val',  text: 'BC\xc0\xde...  (binary bitcode stream)', inline: false },
    { cls: 'ir-kw',   text: '; Sections detected:', inline: false },
    { cls: 'ir-ok',   text: ';   IDENTIFICATION_BLOCK: LLVM17.0.6', inline: false },
    { cls: 'ir-ok',   text: ';   MODULE_BLOCK: 4 functions, 12 globals', inline: false },
    { cls: 'ir-ok',   text: ';   FUNCTION_BLOCK: main — 38 instructions', inline: false },
    { cls: 'ir-ok',   text: ';   FUNCTION_BLOCK: vulkan_init — 14 instr', inline: false },
    { cls: 'ir-dead', text: ';   FUNCTION_BLOCK: legacy_auth_start — DEAD (0 callers)', inline: false },
    { cls: 'ir-dead', text: ';   FUNCTION_BLOCK: oauth1_flow — DEAD (0 callers)', inline: false },
    { cls: 'ir-ok',   text: ';   SYMTAB_BLOCK: 18 symbols', inline: false },
    { cls: 'ir-kw',   text: '; To inspect: llvm-bcanalyzer --dump analysis.bc', inline: false },
  ],
  passes: [
    { cls: 'ir-kw',   text: '; LLVM Pass Execution Log', inline: false },
    { cls: '',        text: '', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -mem2reg              done   (0.003s)', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -simplifycfg          done   (0.007s)', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -gvn                  done   (0.011s)', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -dce                  done   (0.015s) → 3 dead blocks removed', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -instcombine           done   (0.009s)', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -inline                done   (0.022s)', inline: false },
    { cls: 'ir-dead', text: '[PASS]  -deadargelim           done   (0.004s) → legacy_auth_start elim', inline: false },
    { cls: 'ir-dead', text: '[PASS]  -dce (LTO)             done   (0.018s) → 142 dead flag regions', inline: false },
    { cls: 'ir-kw',   text: '[PASS]  -wholeprogramdevirt    done   (0.031s)', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -globalopt             done   (0.008s)', inline: false },
    { cls: 'ir-ok',   text: '[PASS]  -constmerge            done   (0.002s)', inline: false },
    { cls: '',        text: '', inline: false },
    { cls: 'ir-ok',   text: '; Total: 11 passes — Analysis complete ✓', inline: false },
  ]
};

function renderIR(type) {
  const el = document.getElementById('irEditor');
  if (!el) return;

  // add .ir-ok style if not present
  if (!document.getElementById('irOkStyle')) {
    const s = document.createElement('style');
    s.id = 'irOkStyle';
    s.textContent = `.ir-ok{color:#00ff88} .ir-dead{background:rgba(255,58,92,0.15);border-left:3px solid #ff3a5c;padding-left:6px;display:block;color:#ff7096}`;
    document.head.appendChild(s);
  }

  const lines = IR_CONTENT[type] || [];
  let html = '';
  let lineBuffer = '';
  lines.forEach((tok, i) => {
    const span = `<span class="${tok.cls}">${escHtml(tok.text)}</span>`;
    if (!tok.inline) {
      html += `<div class="ir-line">${lineBuffer}${span}</div>`;
      lineBuffer = '';
    } else {
      lineBuffer += span;
    }
  });
  if (lineBuffer) html += `<div class="ir-line">${lineBuffer}</div>`;
  el.innerHTML = html;
}

function initIRViewer() { renderIR('ll'); }

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ============================================================
   CFG Reachability Graph (D3.js)
   green = reachable, red = dead, gray = unknown
   ============================================================ */
function initCFGGraph() {
  const svg = d3.select('#cfgGraph');
  if (svg.empty()) return;

  const W = svg.node().getBoundingClientRect().width || 800;
  const H = 420;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  // Arrow marker defs
  const defs = svg.append('defs');
  ['live','dead','gray'].forEach(t => {
    defs.append('marker')
      .attr('id', `arrow-${t}`)
      .attr('viewBox','0 -5 10 10').attr('refX',18).attr('refY',0)
      .attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
      .append('path').attr('d','M0,-5L10,0L0,5')
      .attr('fill', t==='live'?'#00ff88':t==='dead'?'#ff3a5c':'#475569');
  });

  const nodes = [
    { id:'entry',   label:'entry',              x:W/2,   y:40,  state:'live'  },
    { id:'feat_vk', label:'#ifdef VULKAN',       x:W*0.25,y:130, state:'live'  },
    { id:'vk_init', label:'vulkan_init()',        x:W*0.25,y:220, state:'live'  },
    { id:'feat_old',label:'#ifdef OLD_RENDERER',  x:W*0.75,y:130, state:'dead'  },
    { id:'old_gl',  label:'legacy_gl_start()',    x:W*0.75,y:220, state:'dead'  },
    { id:'feat_au', label:'#ifdef OAUTH2',        x:W*0.15,y:310, state:'live'  },
    { id:'oauth2',  label:'auth_oauth2_init()',   x:W*0.15,y:390, state:'live'  },
    { id:'feat_la', label:'#ifdef LEGACY_AUTH',   x:W*0.5, y:310, state:'dead'  },
    { id:'leg_auth',label:'legacy_auth_start()',  x:W*0.5, y:390, state:'dead'  },
    { id:'feat_net',label:'#ifdef ASYNC_NET',     x:W*0.85,y:310, state:'live'  },
    { id:'net',     label:'async_net_start()',    x:W*0.85,y:390, state:'live'  },
  ];

  const edges = [
    { s:'entry',   t:'feat_vk',  type:'live' },
    { s:'entry',   t:'feat_old', type:'dead' },
    { s:'feat_vk', t:'vk_init',  type:'live' },
    { s:'feat_old',t:'old_gl',   type:'dead' },
    { s:'entry',   t:'feat_au',  type:'live' },
    { s:'entry',   t:'feat_la',  type:'dead' },
    { s:'entry',   t:'feat_net', type:'live' },
    { s:'feat_au', t:'oauth2',   type:'live' },
    { s:'feat_la', t:'leg_auth', type:'dead' },
    { s:'feat_net',t:'net',      type:'live' },
  ];

  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // Draw edges
  svg.selectAll('.cfg-edge')
    .data(edges).enter().append('path')
    .attr('class', d => `cfg-edge ${d.type}`)
    .attr('stroke', d => d.type==='live'?'#00ff88':d.type==='dead'?'#ff3a5c':'#475569')
    .attr('stroke-width', 1.8)
    .attr('stroke-dasharray', d => d.type==='dead'?'6,3':null)
    .attr('fill','none')
    .attr('marker-end', d => `url(#arrow-${d.type})`)
    .attr('d', d => {
      const s = nodeMap[d.s], t = nodeMap[d.t];
      const mx = (s.x+t.x)/2, my = (s.y+t.y)/2;
      return `M${s.x},${s.y} Q${mx},${my} ${t.x},${t.y}`;
    });

  // Draw nodes
  const nodeG = svg.selectAll('.cfg-node')
    .data(nodes).enter().append('g')
    .attr('class','cfg-node')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  nodeG.append('rect')
    .attr('x',-74).attr('y',-18).attr('width',148).attr('height',36)
    .attr('rx',8)
    .attr('fill', d => d.state==='live'?'rgba(0,255,136,0.1)':d.state==='dead'?'rgba(255,58,92,0.12)':'rgba(71,85,105,0.2)')
    .attr('stroke', d => d.state==='live'?'#00ff88':d.state==='dead'?'#ff3a5c':'#475569')
    .attr('stroke-width',1.5);

  nodeG.append('text')
    .attr('text-anchor','middle').attr('dominant-baseline','middle')
    .attr('font-family',"'JetBrains Mono',monospace").attr('font-size',10)
    .attr('fill', d => d.state==='live'?'#00ff88':d.state==='dead'?'#ff7096':'#94a3b8')
    .text(d => d.label);

  // Hover tooltip
  nodeG.append('title').text(d =>
    `${d.label}\nStatus: ${d.state.toUpperCase()}`);

  // Pulse animation for dead nodes
  nodeG.filter(d => d.state==='dead')
    .select('rect')
    .style('animation','deadPulse 2s infinite alternate');

  if (!document.getElementById('cfgStyle')) {
    const s = document.createElement('style');
    s.id = 'cfgStyle';
    s.textContent = `@keyframes deadPulse{from{stroke-opacity:.4}to{stroke-opacity:1}}`;
    document.head.appendChild(s);
  }
}

/* ============================================================
   Call Graph (Interprocedural) — D3.js force layout
   ============================================================ */
function initCallGraph() {
  const svg = d3.select('#callGraph');
  if (svg.empty()) return;
  const W = svg.node().getBoundingClientRect().width || 700;
  const H = 320;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const nodes = [
    { id:'main',        state:'live',  r:22 },
    { id:'vulkan_init', state:'live',  r:16 },
    { id:'oauth2_init', state:'live',  r:16 },
    { id:'net_start',   state:'live',  r:16 },
    { id:'telemetry_v2',state:'live',  r:14 },
    { id:'json_v2',     state:'live',  r:14 },
    { id:'legacy_auth', state:'dead',  r:16 },
    { id:'oauth1_flow', state:'dead',  r:14 },
    { id:'old_renderer',state:'dead',  r:14 },
    { id:'telemetry_v1',state:'dead',  r:14 },
    { id:'old_json',    state:'dead',  r:12 },
  ];
  const links = [
    { source:'main', target:'vulkan_init',  type:'live' },
    { source:'main', target:'oauth2_init',  type:'live' },
    { source:'main', target:'net_start',    type:'live' },
    { source:'main', target:'telemetry_v2', type:'live' },
    { source:'main', target:'json_v2',      type:'live' },
    { source:'main', target:'legacy_auth',  type:'dead' },
    { source:'main', target:'oauth1_flow',  type:'dead' },
    { source:'main', target:'old_renderer', type:'dead' },
    { source:'main', target:'telemetry_v1', type:'dead' },
    { source:'main', target:'old_json',     type:'dead' },
  ];

  const defs = svg.append('defs');
  ['live','dead'].forEach(t => {
    defs.append('marker')
      .attr('id',`cg-arrow-${t}`)
      .attr('viewBox','0 -4 8 8').attr('refX',20).attr('refY',0)
      .attr('markerWidth',5).attr('markerHeight',5).attr('orient','auto')
      .append('path').attr('d','M0,-4L8,0L0,4')
      .attr('fill',t==='live'?'#00ff88':'#ff3a5c');
  });

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d=>d.id).distance(110))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide().radius(d=>d.r+12));

  const link = svg.selectAll('.cg-link')
    .data(links).enter().append('line')
    .attr('stroke', d => d.type==='live'?'#00ff88':'#ff3a5c')
    .attr('stroke-width',1.5)
    .attr('stroke-dasharray', d => d.type==='dead'?'5,3':null)
    .attr('stroke-opacity',.7)
    .attr('marker-end', d=>`url(#cg-arrow-${d.type})`);

  const node = svg.selectAll('.cg-node')
    .data(nodes).enter().append('g')
    .attr('class','cg-node')
    .call(d3.drag()
      .on('start', (e,d)=>{ if(!e.active) sim.alphaTarget(.3).restart(); d.fx=d.x;d.fy=d.y; })
      .on('drag',  (e,d)=>{ d.fx=e.x; d.fy=e.y; })
      .on('end',   (e,d)=>{ if(!e.active) sim.alphaTarget(0); d.fx=null;d.fy=null; }));

  node.append('circle')
    .attr('r', d=>d.r)
    .attr('fill', d=>d.state==='live'?'rgba(0,255,136,0.12)':'rgba(255,58,92,0.12)')
    .attr('stroke',d=>d.state==='live'?'#00ff88':'#ff3a5c')
    .attr('stroke-width',1.5);

  node.append('text')
    .attr('text-anchor','middle').attr('dominant-baseline','middle')
    .attr('font-family',"'JetBrains Mono',monospace").attr('font-size',9)
    .attr('fill',d=>d.state==='live'?'#00ff88':'#ff7096')
    .text(d=>d.id);

  node.append('title').text(d=>`${d.id} — ${d.state.toUpperCase()}`);

  sim.on('tick', () => {
    link
      .attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
      .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
  });
}

/* ============================================================
   LTO Whole-Program Flow — Chart.js bar chart
   ============================================================ */
function initLTOChart() {
  const ctx = document.getElementById('ltoChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['TU: main','TU: auth','TU: net','TU: render','TU: json','TU: telemetry'],
      datasets: [
        {
          label: 'Live Instructions',
          data: [320, 180, 290, 210, 150, 170],
          backgroundColor: 'rgba(0,255,136,0.25)',
          borderColor: '#00ff88',
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: 'Dead Instructions',
          data: [45, 120, 30, 190, 80, 95],
          backgroundColor: 'rgba(255,58,92,0.2)',
          borderColor: '#ff3a5c',
          borderWidth: 1.5,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color:'#94a3b8', font:{ size:11 } } },
      },
      scales: {
        x: { ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.04)' } },
        y: { ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.04)' },
             title:{ display:true, text:'Instructions', color:'#475569', font:{size:10} } }
      }
    }
  });
}
