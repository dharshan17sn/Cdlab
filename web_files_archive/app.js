
/* ============================================================
   ConfigAware — app.js  Part 1: Navigation + KPI Counters
   ============================================================ */

/* ---------- Tab Navigation ---------- */
const navItems = document.querySelectorAll('.nav-item');
const tabs     = document.querySelectorAll('.tab-content');
const breadcrumb = document.getElementById('breadcrumbCurrent');

const tabLabels = {
  'overview'    : 'Overview',
  'build-config': 'Build Config Extractor',
  'llvm-analysis': 'LLVM Analysis',
  'dead-features': 'Dead Feature Report',
  'evaluation'  : 'Evaluation & Metrics',
  'terminal'    : 'LLVM Terminal'
};

function switchTab(tabId) {
  navItems.forEach(n => n.classList.toggle('active', n.dataset.tab === tabId));
  tabs.forEach(t => t.classList.toggle('active', t.id === 'tab-' + tabId));
  breadcrumb.textContent = tabLabels[tabId] || tabId;

  // Lazy-init each section on first visit
  if (!window._inited) window._inited = {};
  if (!window._inited[tabId]) {
    window._inited[tabId] = true;
    if (tabId === 'build-config')  initBuildConfig();
    if (tabId === 'llvm-analysis') initLLVM();
    if (tabId === 'dead-features') initDeadFeatures();
    if (tabId === 'evaluation')    initEvaluation();
    if (tabId === 'terminal')      initTerminal();
  }
}

navItems.forEach(n => n.addEventListener('click', () => switchTab(n.dataset.tab)));

/* ---------- Sidebar toggle ---------- */
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('collapsed');
});

/* ---------- Particles ---------- */
(function spawnParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    Object.assign(p.style, {
      position: 'absolute',
      width: size + 'px', height: size + 'px',
      borderRadius: '50%',
      background: Math.random() > 0.5 ? '#00f5ff' : '#a855f7',
      opacity: (Math.random() * 0.4 + 0.1).toFixed(2),
      left: Math.random() * 100 + '%',
      top: Math.random() * 100 + '%',
      animation: `float ${6 + Math.random() * 8}s ease-in-out infinite`,
      animationDelay: (Math.random() * 5) + 's'
    });
    container.appendChild(p);
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%,100%{transform:translateY(0) scale(1);opacity:.2}
      50%{transform:translateY(-30px) scale(1.3);opacity:.6}
    }`;
  document.head.appendChild(style);
})();

/* ---------- KPI Counter Animation ---------- */
function animateCount(el, target, decimals = 0, duration = 1600) {
  const start = performance.now();
  const update = now => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = ease * target;
    el.textContent = decimals ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function initKPIs() {
  document.querySelectorAll('.kpi-value[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const decimals = target % 1 !== 0 ? 1 : 0;
    animateCount(el, target, decimals);
  });
}

/* ---------- Run Analysis Button ---------- */
const runBtn     = document.getElementById('runAnalysisBtn');
const overlay    = document.getElementById('runOverlay');
const runLabel   = document.getElementById('runLabel');
const runFill    = document.getElementById('runFill');
const globalProg = document.getElementById('globalProgress');

const steps = [
  'Initializing LLVM analysis engine...',
  'Parsing CMakeLists.txt & compile_commands.json...',
  'Generating LLVM IR (.ll / .bc)...',
  'Running Dead Code Elimination pass...',
  'Building Control Flow Graphs...',
  'Interprocedural analysis (call graph)...',
  'LTO whole-program dataflow scan...',
  'Scoring dead feature flags (AI model)...',
  'Generating report...',
  'Analysis complete ✓'
];

runBtn.addEventListener('click', () => {
  overlay.classList.add('show');
  let i = 0;
  runFill.style.width = '0%';
  const tick = () => {
    if (i >= steps.length) {
      setTimeout(() => {
        overlay.classList.remove('show');
        initKPIs();
      }, 400);
      return;
    }
    runLabel.textContent = steps[i];
    runFill.style.width = ((i + 1) / steps.length * 100) + '%';
    globalProg.style.width = ((i + 1) / steps.length * 100) + '%';
    document.getElementById('globalPct').textContent =
      Math.round((i + 1) / steps.length * 100) + '%';
    i++;
    setTimeout(tick, 420);
  };
  tick();
});

/* ---------- Overview: Donut chart (feature flag dist.) ---------- */
function initOverviewDonut() {
  const ctx = document.getElementById('featureDonut').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Dead Flags', 'Live Flags', 'Conditional', 'Unresolved'],
      datasets: [{
        data: [142, 389, 67, 33],
        backgroundColor: ['#ff3a5c', '#00ff88', '#ffd700', '#64748b'],
        borderColor: '#060810',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', boxWidth: 12, padding: 14, font: { size: 11 } }
        }
      },
      animation: { animateRotate: true, duration: 1200 }
    }
  });
}

/* ---------- Overview: Gauge Canvas ---------- */
function drawGauge(pct) {
  const canvas = document.getElementById('gaugeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height * 0.82;
  const r = 80;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Fill
  const angle = Math.PI + (pct / 100) * Math.PI;
  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0, '#ff3a5c');
  grad.addColorStop(0.5, '#ffd700');
  grad.addColorStop(1, '#00ff88');
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, angle);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Ticks
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const x1 = cx + (r - 20) * Math.cos(a), y1 = cy + (r - 20) * Math.sin(a);
    const x2 = cx + (r - 8)  * Math.cos(a), y2 = cy + (r - 8)  * Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.stroke();
  }
}

/* ---------- Overview: Pipeline steps ---------- */
function initPipeline() {
  const steps = [
    { icon: '📁', name: 'CMake Parse',    sub: 'CMakeLists.txt',   state: 'done' },
    { icon: '⚙',  name: 'Compile DB',     sub: 'compile_commands', state: 'done' },
    { icon: '🔤', name: 'IR Generation',  sub: 'LLVM IR (.ll)',     state: 'done' },
    { icon: '🌳', name: 'CFG Build',      sub: 'Branch analysis',   state: 'running' },
    { icon: '🔗', name: 'Call Graph',     sub: 'Interprocedural',   state: 'active' },
    { icon: '☠',  name: 'Dead Detect',   sub: 'AI scoring',        state: 'active' },
    { icon: '📊', name: 'Report',         sub: 'Confidence scores', state: 'active' }
  ];
  const container = document.getElementById('pipelineFlow');
  if (!container) return;
  container.innerHTML = '';
  steps.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'pipe-step ' + s.state;
    div.innerHTML = `<div class="pipe-icon">${s.icon}</div>
                     <div class="pipe-name">${s.name}</div>
                     <div class="pipe-sub">${s.sub}</div>`;
    container.appendChild(div);
    if (i < steps.length - 1) {
      const arr = document.createElement('div');
      arr.className = 'pipe-arrow';
      arr.textContent = '→';
      container.appendChild(arr);
    }
  });
}

/* ---------- Overview: Recent Findings ---------- */
function initFindings() {
  const data = [
    { flag: 'FEATURE_LEGACY_AUTH',    file: 'src/auth/legacy.cpp',     conf: 98, status: 'dead' },
    { flag: 'ENABLE_OLD_RENDERER',    file: 'src/render/gl_legacy.cpp', conf: 95, status: 'dead' },
    { flag: 'USE_DEPRECATED_SOCKET',  file: 'src/net/sock_v1.cpp',     conf: 92, status: 'dead' },
    { flag: 'FEATURE_TELEMETRY_V1',   file: 'src/telemetry/v1.cpp',    conf: 89, status: 'dead' },
    { flag: 'ENABLE_COMPAT_LAYER',    file: 'src/compat/bridge.cpp',   conf: 87, status: 'dead' },
    { flag: 'DEBUG_PRINT_VERBOSE',    file: 'src/utils/debug.cpp',     conf: 84, status: 'dead' },
    { flag: 'FEATURE_OAUTH1',         file: 'src/auth/oauth1.cpp',     conf: 81, status: 'dead' },
    { flag: 'USE_OLD_JSON_PARSER',    file: 'src/json/parser_v1.cpp',  conf: 79, status: 'dead' },
  ];
  const list = document.getElementById('findingsList');
  if (!list) return;
  list.innerHTML = data.map(d => `
    <div class="finding-item">
      <span class="fi-flag">${d.flag}</span>
      <span class="fi-file">${d.file}</span>
      <span class="fi-conf">${d.conf}%</span>
      <span class="fi-badge ${d.status}">${d.status.toUpperCase()}</span>
    </div>`).join('');
}

/* ---------- Boot: init overview ---------- */
window.addEventListener('DOMContentLoaded', () => {
  initKPIs();
  initOverviewDonut();
  drawGauge(94.2);
  initPipeline();
  initFindings();

  // placeholder stubs (filled in later parts)
  window.initBuildConfig  = window.initBuildConfig  || (() => {});
  window.initLLVM         = window.initLLVM         || (() => {});
  window.initDeadFeatures = window.initDeadFeatures || (() => {});
  window.initEvaluation   = window.initEvaluation   || (() => {});
  window.initTerminal     = window.initTerminal     || (() => {});

  /* Load Sample Project button */
  document.getElementById('loadSampleBtn')?.addEventListener('click', () => {
    // Switch to Build Config tab first
    switchTab('build-config');
    // Give initBuildConfig time to render the upload UI, then inject sample files
    setTimeout(() => {
      const files = Object.entries(window.SAMPLE_FILES || {}).map(([name, content]) => {
        const blob = new Blob([content], { type: 'text/plain' });
        return new File([blob], name, { type: 'text/plain' });
      });
      if (files.length && typeof window.initBuildConfig === 'function') {
        // Re-init so drop zone exists, then simulate file drop
        window._inited['build-config'] = false;
        window.initBuildConfig();
        setTimeout(() => {
          // Trigger the internal handleFiles function via file input change event
          const dt = new DataTransfer();
          files.forEach(f => dt.items.add(f));
          const inp = document.getElementById('fileInput');
          if (inp) {
            Object.defineProperty(inp, 'files', { value: dt.files, configurable: true });
            inp.dispatchEvent(new Event('change'));
          }
        }, 200);
      }
    }, 300);
  });
});
