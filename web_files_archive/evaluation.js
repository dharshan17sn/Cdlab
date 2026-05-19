/* ============================================================
   Part 6: Evaluation & Metrics + LLVM Terminal
   ============================================================ */

/* ============================================================
   EVALUATION TAB
   ============================================================ */
window.initEvaluation = function () {
  initLOCChart();
  initBinaryChart();
  initHeatmap();
  initPerfChart();
  initStatList();
};

function initLOCChart() {
  const ctx = document.getElementById('locChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['auth.cpp','render.cpp','net.cpp','json.cpp','telemetry.cpp','crypto.cpp','compat.cpp','debug.cpp'],
      datasets: [
        { label:'Removable LOC', data:[248,312,89,175,195,143,310,62],
          backgroundColor:'rgba(255,58,92,0.25)', borderColor:'#ff3a5c',
          borderWidth:1.5, borderRadius:4 },
        { label:'Retained LOC',  data:[520,310,680,290,220,180,120,430],
          backgroundColor:'rgba(0,245,255,0.12)', borderColor:'#00f5ff',
          borderWidth:1.5, borderRadius:4 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:11} } } },
      scales:{
        x:{ ticks:{color:'#64748b',font:{size:9}}, grid:{color:'rgba(255,255,255,0.04)'}, stacked:false },
        y:{ ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'},
            title:{display:true,text:'Lines of Code',color:'#475569',font:{size:10}} }
      }
    }
  });
}

function initBinaryChart() {
  const ctx = document.getElementById('binaryChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Debug Build','Release Build','LTO Build','After Cleanup'],
      datasets: [{
        label:'Binary Size (MB)',
        data:[24.8, 18.2, 14.6, 12.2],
        backgroundColor:[
          'rgba(100,116,139,0.3)','rgba(0,245,255,0.2)',
          'rgba(168,85,247,0.2)','rgba(0,255,136,0.25)'
        ],
        borderColor:['#64748b','#00f5ff','#a855f7','#00ff88'],
        borderWidth:1.5, borderRadius:6,
      }]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{color:'#64748b',font:{size:10},callback:v=>v+'MB'},
            grid:{color:'rgba(255,255,255,0.04)'},
            title:{display:true,text:'Size (MB)',color:'#475569',font:{size:10}} },
        y:{ ticks:{color:'#94a3b8',font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'} }
      }
    }
  });
}

function initHeatmap() {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;

  const files = ['main.cpp','auth.cpp','render.cpp','net.cpp','json.cpp','telemetry.cpp','crypto.cpp','compat.cpp'];
  const flags = ['LEGACY_AUTH','OLD_RENDERER','DEPR_SOCKET','TELEMETRY_V1','OAUTH1','OLD_JSON','OLD_CRYPTO','COMPAT'];
  const matrix = [
    [98,0,0,0,0,0,0,0],
    [95,92,0,0,81,0,0,0],
    [0,95,0,0,0,0,0,87],
    [0,0,92,0,0,0,0,0],
    [0,0,0,0,0,79,0,0],
    [0,0,0,89,0,0,0,0],
    [0,0,0,0,0,0,73,0],
    [0,0,0,0,0,0,0,87],
  ];

  const style = document.createElement('style');
  style.textContent = `
    .hm-wrap{display:flex;gap:6px;align-items:flex-start;overflow-x:auto}
    .hm-ylabels{display:flex;flex-direction:column;gap:4px;padding-top:28px}
    .hm-ylabel{font-size:9px;font-family:'JetBrains Mono',monospace;color:#64748b;height:24px;display:flex;align-items:center;white-space:nowrap}
    .hm-body{display:flex;flex-direction:column;gap:4px}
    .hm-xlabels{display:flex;gap:4px;margin-bottom:4px}
    .hm-xlabel{font-size:9px;font-family:'JetBrains Mono',monospace;color:#64748b;width:24px;text-align:center;writing-mode:vertical-lr;transform:rotate(180deg);height:56px;overflow:hidden}
    .hm-row{display:flex;gap:4px}
    .hm-cell{width:24px;height:24px;border-radius:4px;cursor:pointer;transition:.2s;position:relative;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700}
    .hm-cell:hover{transform:scale(1.4);z-index:10;border:1px solid rgba(255,255,255,0.4)}
    .hm-cell[title]:hover::after{content:attr(title);position:absolute;top:-28px;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid rgba(0,245,255,0.3);color:#e2e8f0;font-size:9px;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:20}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'hm-wrap';

  // Y labels
  const yLabels = document.createElement('div');
  yLabels.className = 'hm-ylabels';
  files.forEach(f => {
    const d = document.createElement('div');
    d.className = 'hm-ylabel'; d.textContent = f; yLabels.appendChild(d);
  });
  wrap.appendChild(yLabels);

  const body = document.createElement('div');
  body.className = 'hm-body';

  // X labels
  const xRow = document.createElement('div');
  xRow.className = 'hm-xlabels';
  flags.forEach(fl => {
    const d = document.createElement('div');
    d.className = 'hm-xlabel'; d.textContent = fl; xRow.appendChild(d);
  });
  body.appendChild(xRow);

  // Cells
  matrix.forEach((row, ri) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'hm-row';
    row.forEach((val, ci) => {
      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      if (val > 0) {
        const alpha = val / 100;
        cell.style.background = `rgba(255,58,92,${alpha * 0.8})`;
        cell.style.border = `1px solid rgba(255,58,92,${alpha})`;
        cell.textContent = val;
        cell.style.color = 'rgba(255,255,255,0.8)';
        cell.title = `${files[ri]} × ${flags[ci]}: ${val}% confidence`;
      } else {
        cell.style.background = 'rgba(255,255,255,0.03)';
        cell.style.border = '1px solid rgba(255,255,255,0.05)';
      }
      rowEl.appendChild(cell);
    });
    body.appendChild(rowEl);
  });

  wrap.appendChild(body);
  container.innerHTML = '';
  container.appendChild(wrap);
}

function initPerfChart() {
  const ctx = document.getElementById('perfChart');
  if (!ctx) return;
  const labels = ['Compile Time','Link Time','Runtime Init','Mem Usage','Startup ms','Binary Load'];
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets:[
        { label:'Before Cleanup', data:[82,75,68,80,72,78],
          backgroundColor:'rgba(255,58,92,0.1)', borderColor:'#ff3a5c',
          pointBackgroundColor:'#ff3a5c', borderWidth:1.5 },
        { label:'After Cleanup',  data:[55,48,42,53,46,50],
          backgroundColor:'rgba(0,255,136,0.1)', borderColor:'#00ff88',
          pointBackgroundColor:'#00ff88', borderWidth:1.5 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:11} } } },
      scales:{ r:{
        angleLines:{color:'rgba(255,255,255,0.06)'},
        grid:{color:'rgba(255,255,255,0.06)'},
        pointLabels:{color:'#64748b',font:{size:10}},
        ticks:{color:'#475569',font:{size:9},backdropColor:'transparent'}
      }}
    }
  });
}

function initStatList() {
  const el = document.getElementById('statList');
  if (!el) return;
  const stats = [
    { name:'Total Flags Scanned',  val:'531' },
    { name:'Dead Flags Found',     val:'142' },
    { name:'Live Flags',           val:'389' },
    { name:'Removable LOC',        val:'38,420' },
    { name:'Total LOC',            val:'309,800' },
    { name:'LOC Reduction',        val:'12.4%' },
    { name:'Binary Before',        val:'18.2 MB' },
    { name:'Binary After',         val:'12.2 MB' },
    { name:'Size Reduction',       val:'32.9%' },
    { name:'Avg Confidence',       val:'84.6%' },
    { name:'Translation Units',    val:'248' },
    { name:'Analysis Time',        val:'3.2s' },
  ];
  el.innerHTML = stats.map(s => `
    <div class="stat-row">
      <span class="stat-name">${s.name}</span>
      <span class="stat-val">${s.val}</span>
    </div>`).join('');
}

/* ============================================================
   LLVM TERMINAL TAB
   ============================================================ */
window.initTerminal = function () {
  renderPassList();
  renderTraceChart();
  startTerminalBootSequence();
  wireTerminalInput();
};

const PASSES = [
  { name:'-mem2reg',           dur:'3ms',  status:'ok'  },
  { name:'-simplifycfg',       dur:'7ms',  status:'ok'  },
  { name:'-gvn',               dur:'11ms', status:'ok'  },
  { name:'-dce',               dur:'15ms', status:'ok'  },
  { name:'-instcombine',       dur:'9ms',  status:'ok'  },
  { name:'-inline',            dur:'22ms', status:'ok'  },
  { name:'-deadargelim',       dur:'4ms',  status:'ok'  },
  { name:'-wholeprogramdevirt',dur:'31ms', status:'ok'  },
  { name:'-globalopt',         dur:'8ms',  status:'ok'  },
  { name:'-constmerge',        dur:'2ms',  status:'ok'  },
  { name:'-loop-unroll',       dur:'19ms', status:'skip'},
  { name:'-lto-dce',           dur:'18ms', status:'ok'  },
];

function renderPassList() {
  const el = document.getElementById('passList');
  if (!el) return;
  el.innerHTML = PASSES.map(p => `
    <div class="pass-item">
      <span class="pass-name">${p.name}</span>
      <span class="pass-dur">${p.dur}</span>
      <span class="pass-badge ${p.status==='ok'?'pb-ok':p.status==='run'?'pb-run':'pb-skip'}">
        ${p.status.toUpperCase()}
      </span>
    </div>`).join('');
}

function renderTraceChart() {
  const ctx = document.getElementById('traceChart');
  if (!ctx) return;
  new Chart(ctx, {
    type:'line',
    data:{
      labels:PASSES.map(p=>p.name.replace('-','')),
      datasets:[{
        label:'Pass Duration (ms)',
        data:PASSES.map(p=>parseInt(p.dur)),
        borderColor:'#a855f7', backgroundColor:'rgba(168,85,247,0.1)',
        borderWidth:1.5, pointRadius:3, pointBackgroundColor:'#a855f7',
        tension:0.4, fill:true
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ ticks:{color:'#475569',font:{size:8},maxRotation:45}, grid:{color:'rgba(255,255,255,0.03)'} },
        y:{ ticks:{color:'#64748b',font:{size:9}}, grid:{color:'rgba(255,255,255,0.04)'},
            title:{display:true,text:'ms',color:'#475569',font:{size:9}} }
      }
    }
  });
}

const BOOT_LINES = [
  { cls:'t-cmd',  text:'$ configaware --analyze ./test_project --llvm-passes all' },
  { cls:'t-info', text:'[INFO]  ConfigAware v2.4.1 — LLVM Dead Feature Detector' },
  { cls:'t-info', text:'[INFO]  LLVM 17.0.6 | Clang 17.0.6 | Target: x86_64-linux' },
  { cls:'',       text:'' },
  { cls:'t-cmd',  text:'$ cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON -B build .' },
  { cls:'t-ok',   text:'-- Configuring done (0.3s)' },
  { cls:'t-ok',   text:'-- Build files written to: ./build' },
  { cls:'',       text:'' },
  { cls:'t-cmd',  text:'$ clang++ -emit-llvm -S -o analysis.ll main.cpp auth.cpp' },
  { cls:'t-ok',   text:'[OK]    LLVM IR generated: analysis.ll (2847 lines)' },
  { cls:'t-ok',   text:'[OK]    Bitcode generated: analysis.bc (143 KB)' },
  { cls:'',       text:'' },
  { cls:'t-cmd',  text:'$ opt -passes="mem2reg,simplifycfg,dce,gvn,inline" analysis.ll -o opt.bc' },
  { cls:'t-pass', text:'[PASS]  mem2reg          — 18 phi nodes inserted' },
  { cls:'t-pass', text:'[PASS]  simplifycfg      — 7 blocks simplified' },
  { cls:'t-pass', text:'[PASS]  dce              — 3 dead blocks eliminated' },
  { cls:'t-pass', text:'[PASS]  gvn              — 12 redundancies removed' },
  { cls:'t-pass', text:'[PASS]  inline           — 4 functions inlined' },
  { cls:'',       text:'' },
  { cls:'t-cmd',  text:'$ llvm-link analysis.bc -o whole.bc && opt -lto-dce whole.bc' },
  { cls:'t-warn', text:'[WARN]  FEATURE_LEGACY_AUTH: 0 live callers — flagged as DEAD' },
  { cls:'t-warn', text:'[WARN]  ENABLE_OLD_RENDERER: branch always false — DEAD region' },
  { cls:'t-warn', text:'[WARN]  FEATURE_OAUTH1: unreachable from entry — DEAD' },
  { cls:'t-warn', text:'[WARN]  USE_DEPRECATED_SOCKET: constant-folded to false — DEAD' },
  { cls:'t-err',  text:'[DEAD]  142 dead feature regions detected across 14 files' },
  { cls:'',       text:'' },
  { cls:'t-ok',   text:'[OK]    Analysis complete — report written to report.json' },
  { cls:'t-ok',   text:'[OK]    Estimated removable LOC: 38,420 (12.4% of codebase)' },
  { cls:'t-ok',   text:'[OK]    Binary size reduction: 6.0 MB (32.9% smaller)' },
  { cls:'',       text:'' },
  { cls:'t-info', text:'$ _' },
];

function startTerminalBootSequence() {
  const body = document.getElementById('termBody');
  if (!body) return;
  body.innerHTML = '';
  BOOT_LINES.forEach((line, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'term-line ' + (line.cls||'');
      div.textContent = line.text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }, i * 110);
  });
}

const TERMINAL_COMMANDS = {
  'help': [
    { cls:'t-info', text:'Available commands:' },
    { cls:'t-ok',   text:'  analyze <path>     — run full dead feature analysis' },
    { cls:'t-ok',   text:'  report             — show dead feature report' },
    { cls:'t-ok',   text:'  passes             — list LLVM passes' },
    { cls:'t-ok',   text:'  stats              — show analysis statistics' },
    { cls:'t-ok',   text:'  clear              — clear terminal' },
  ],
  'report': [
    { cls:'t-warn', text:'Dead flags: 142' },
    { cls:'t-warn', text:'Top: FEATURE_LEGACY_AUTH (98%), ENABLE_OLD_RENDERER (95%)' },
    { cls:'t-ok',   text:'Removable LOC: 38,420 | Binary reduction: 32.9%' },
  ],
  'passes': PASSES.map(p => ({ cls:'t-pass', text:`  ${p.name.padEnd(28)} ${p.dur}  [${p.status.toUpperCase()}]` })),
  'stats': [
    { cls:'t-info', text:'Total flags: 531 | Dead: 142 | Live: 389' },
    { cls:'t-info', text:'Translation units: 248 | Analysis time: 3.2s' },
    { cls:'t-ok',   text:'Confidence avg: 84.6%' },
  ],
  'clear': [{ cls:'', text:'__CLEAR__' }],
};

function wireTerminalInput() {
  const input = document.getElementById('termInput');
  const body  = document.getElementById('termBody');
  if (!input || !body) return;

  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim().toLowerCase();
    input.value = '';

    const echo = document.createElement('div');
    echo.className = 'term-line t-cmd';
    echo.textContent = '$ ' + cmd;
    body.appendChild(echo);

    const lines = TERMINAL_COMMANDS[cmd] ||
      [{ cls:'t-err', text:`command not found: ${cmd} (try "help")` }];

    if (lines[0]?.text === '__CLEAR__') { body.innerHTML = ''; return; }

    lines.forEach((l, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'term-line ' + (l.cls||'');
        div.textContent = l.text;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
      }, i * 60);
    });
  });
}
