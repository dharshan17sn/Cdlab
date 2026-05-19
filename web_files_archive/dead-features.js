/* ============================================================
   Part 5: Dead Feature Report
   - Monaco-style C++ editor with dead code highlighted
   - Dead flag list with confidence scores
   - Feature dependency graph (D3.js)
   - Runtime toggle analysis panel
   ============================================================ */

window.initDeadFeatures = function () {
  initEditorTabs();
  initDeadList();
  initDepGraph();
  initRuntimeToggles();
};

/* ============================================================
   Monaco-style C++ Editor with dead block highlighting
   ============================================================ */
const EDITOR_FILES = {
  'main.cpp': {
    lines: [
      { n:1,  code:'#include <iostream>',                              dead:false, cls:'' },
      { n:2,  code:'#include "features.h"',                           dead:false, cls:'' },
      { n:3,  code:'',                                                dead:false, cls:'' },
      { n:4,  code:'int main() {',                                    dead:false, cls:'' },
      { n:5,  code:'  // ---- Renderer ----',                         dead:false, cls:'me-comment' },
      { n:6,  code:'#ifdef ENABLE_VULKAN',                            dead:false, cls:'me-macro' },
      { n:7,  code:'  vulkan_init();    // LIVE PATH',                dead:false, cls:'' },
      { n:8,  code:'#endif',                                          dead:false, cls:'me-macro' },
      { n:9,  code:'',                                                dead:false, cls:'' },
      { n:10, code:'#ifdef ENABLE_OLD_RENDERER   // ☠ DEAD FLAG',     dead:true,  cls:'me-macro' },
      { n:11, code:'  legacy_gl_start();          // DEAD CODE',       dead:true,  cls:'' },
      { n:12, code:'#endif',                                          dead:true,  cls:'me-macro' },
      { n:13, code:'',                                                dead:false, cls:'' },
      { n:14, code:'  // ---- Auth ----',                             dead:false, cls:'me-comment' },
      { n:15, code:'#ifdef FEATURE_OAUTH2',                           dead:false, cls:'me-macro' },
      { n:16, code:'  auth_oauth2_init();  // LIVE',                  dead:false, cls:'' },
      { n:17, code:'#endif',                                          dead:false, cls:'me-macro' },
      { n:18, code:'',                                                dead:false, cls:'' },
      { n:19, code:'#ifdef FEATURE_LEGACY_AUTH   // ☠ DEAD FLAG',     dead:true,  cls:'me-macro' },
      { n:20, code:'  legacy_auth_start();        // DEAD CODE',       dead:true,  cls:'' },
      { n:21, code:'  connect_old_auth_server();  // DEAD CODE',       dead:true,  cls:'' },
      { n:22, code:'#endif',                                          dead:true,  cls:'me-macro' },
      { n:23, code:'',                                                dead:false, cls:'' },
      { n:24, code:'#ifdef FEATURE_OAUTH1        // ☠ DEAD FLAG',     dead:true,  cls:'me-macro' },
      { n:25, code:'  oauth1_flow();             // DEAD CODE',        dead:true,  cls:'' },
      { n:26, code:'#endif',                                          dead:true,  cls:'me-macro' },
      { n:27, code:'',                                                dead:false, cls:'' },
      { n:28, code:'  // ---- Networking ----',                       dead:false, cls:'me-comment' },
      { n:29, code:'#ifdef USE_ASYNC_NET',                            dead:false, cls:'me-macro' },
      { n:30, code:'  async_net_start(); // LIVE',                    dead:false, cls:'' },
      { n:31, code:'#endif',                                          dead:false, cls:'me-macro' },
      { n:32, code:'',                                                dead:false, cls:'' },
      { n:33, code:'#ifdef USE_DEPRECATED_SOCKET // ☠ DEAD FLAG',     dead:true,  cls:'me-macro' },
      { n:34, code:'  deprecated_socket_connect(); // DEAD CODE',      dead:true,  cls:'' },
      { n:35, code:'#endif',                                          dead:true,  cls:'me-macro' },
      { n:36, code:'',                                                dead:false, cls:'' },
      { n:37, code:'#ifdef DEBUG_PRINT_VERBOSE   // ☠ DEAD FLAG',     dead:true,  cls:'me-macro' },
      { n:38, code:'  std::cout << "[DBG] verbose"; // DEAD',          dead:true,  cls:'' },
      { n:39, code:'#endif',                                          dead:true,  cls:'me-macro' },
      { n:40, code:'',                                                dead:false, cls:'' },
      { n:41, code:'  return 0;',                                     dead:false, cls:'' },
      { n:42, code:'}',                                               dead:false, cls:'' },
    ]
  },
  'auth.cpp': {
    lines: [
      { n:1,  code:'#include "features.h"',                           dead:false, cls:'' },
      { n:2,  code:'',                                                dead:false, cls:'' },
      { n:3,  code:'// ---- LIVE: OAuth2 ----',                       dead:false, cls:'me-comment' },
      { n:4,  code:'#ifdef FEATURE_OAUTH2',                           dead:false, cls:'me-macro' },
      { n:5,  code:'void auth_oauth2_init() {',                       dead:false, cls:'' },
      { n:6,  code:'  oauth2_exchange_code();',                       dead:false, cls:'' },
      { n:7,  code:'  oauth2_refresh_token();',                       dead:false, cls:'' },
      { n:8,  code:'}',                                               dead:false, cls:'' },
      { n:9,  code:'#endif',                                          dead:false, cls:'me-macro' },
      { n:10, code:'',                                                dead:false, cls:'' },
      { n:11, code:'// ---- DEAD: Legacy Auth ----',                  dead:true,  cls:'me-comment' },
      { n:12, code:'#ifdef FEATURE_LEGACY_AUTH  // ☠ DEAD FLAG',      dead:true,  cls:'me-macro' },
      { n:13, code:'void legacy_auth_start() {',                      dead:true,  cls:'' },
      { n:14, code:'  connect_old_auth_server(); // UNREACHABLE',      dead:true,  cls:'' },
      { n:15, code:'  validate_legacy_token();   // UNREACHABLE',      dead:true,  cls:'' },
      { n:16, code:'  sync_user_db_v1();         // UNREACHABLE',      dead:true,  cls:'' },
      { n:17, code:'}',                                               dead:true,  cls:'' },
      { n:18, code:'#endif',                                          dead:true,  cls:'me-macro' },
      { n:19, code:'',                                                dead:false, cls:'' },
      { n:20, code:'#ifdef FEATURE_OAUTH1        // ☠ DEAD FLAG',     dead:true,  cls:'me-macro' },
      { n:21, code:'void oauth1_flow() {',                            dead:true,  cls:'' },
      { n:22, code:'  oauth1_sign_request();    // UNREACHABLE',       dead:true,  cls:'' },
      { n:23, code:'}',                                               dead:true,  cls:'' },
      { n:24, code:'#endif',                                          dead:true,  cls:'me-macro' },
    ]
  },
  'features.h': {
    lines: [
      { n:1,  code:'#pragma once',                                    dead:false, cls:'' },
      { n:2,  code:'',                                                dead:false, cls:'' },
      { n:3,  code:'// LIVE flags',                                   dead:false, cls:'me-comment' },
      { n:4,  code:'#define ENABLE_VULKAN         1',                 dead:false, cls:'me-macro' },
      { n:5,  code:'#define FEATURE_OAUTH2        1',                 dead:false, cls:'me-macro' },
      { n:6,  code:'#define USE_ASYNC_NET         1',                 dead:false, cls:'me-macro' },
      { n:7,  code:'',                                                dead:false, cls:'' },
      { n:8,  code:'// DEAD flags ☠',                                 dead:false, cls:'me-comment' },
      { n:9,  code:'#define ENABLE_OLD_RENDERER   0  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:10, code:'#define FEATURE_LEGACY_AUTH   1  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:11, code:'#define FEATURE_OAUTH1        0  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:12, code:'#define USE_DEPRECATED_SOCKET 1  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:13, code:'#define DEBUG_PRINT_VERBOSE   0  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:14, code:'#define USE_OLD_JSON_PARSER   1  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:15, code:'#define EXPERIMENTAL_AI       0  // ☠ DEAD',      dead:true,  cls:'me-macro' },
      { n:16, code:'#define OLD_CRYPTO_V1         1  // ☠ DEAD',      dead:true,  cls:'me-macro' },
    ]
  }
};

let activeEditorFile = 'main.cpp';

function renderEditor(filename) {
  activeEditorFile = filename;
  const data = EDITOR_FILES[filename];
  if (!data) return;

  const editor = document.getElementById('monacoEditor');
  if (!editor) return;

  editor.innerHTML = data.lines.map(l => {
    const deadCls = l.dead ? 'me-dead' : '';
    const codeSafe = escapeHtml(l.code);
    return `<div class="me-line ${deadCls}">
      <span class="me-num">${l.n}</span>
      <span class="me-code ${l.cls}">${syntaxColor(codeSafe)}</span>
    </div>`;
  }).join('');

  // Update tab buttons
  document.querySelectorAll('.editor-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.file === filename);
  });
}

function initEditorTabs() {
  const tabsEl = document.getElementById('editorTabs');
  if (!tabsEl) return;

  tabsEl.innerHTML = Object.keys(EDITOR_FILES).map(f =>
    `<button class="editor-tab-btn ${f===activeEditorFile?'active':''}" data-file="${f}">${f}</button>`
  ).join('');

  tabsEl.querySelectorAll('.editor-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderEditor(btn.dataset.file));
  });

  renderEditor(activeEditorFile);
}

function syntaxColor(code) {
  return code
    .replace(/(#ifdef|#ifndef|#if|#endif|#define|#pragma|#include)/g, '<span class="me-macro">$1</span>')
    .replace(/\b(int|void|return|std|cout|endl|true|false)\b/g, '<span class="me-kw">$1</span>')
    .replace(/(\/\/.*)/g, '<span class="me-comment">$1</span>')
    .replace(/(".*?")/g, '<span class="me-str">$1</span>');
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ============================================================
   Dead Flag List
   ============================================================ */
const DEAD_FLAGS = [
  { flag:'FEATURE_LEGACY_AUTH',   file:'auth.cpp',        lines:'12-18', conf:98 },
  { flag:'ENABLE_OLD_RENDERER',   file:'main.cpp',        lines:'10-12', conf:95 },
  { flag:'USE_DEPRECATED_SOCKET', file:'main.cpp',        lines:'33-35', conf:92 },
  { flag:'FEATURE_TELEMETRY_V1',  file:'telemetry.cpp',   lines:'5-20',  conf:89 },
  { flag:'ENABLE_COMPAT_LAYER',   file:'compat.cpp',      lines:'1-48',  conf:87 },
  { flag:'DEBUG_PRINT_VERBOSE',   file:'main.cpp',        lines:'37-39', conf:84 },
  { flag:'FEATURE_OAUTH1',        file:'auth.cpp',        lines:'20-24', conf:81 },
  { flag:'USE_OLD_JSON_PARSER',   file:'json.cpp',        lines:'8-30',  conf:79 },
  { flag:'EXPERIMENTAL_AI',       file:'ai.cpp',          lines:'1-80',  conf:55 },
  { flag:'OLD_CRYPTO_V1',         file:'crypto.cpp',      lines:'4-60',  conf:73 },
  { flag:'ENABLE_XML_COMPAT',     file:'xml.cpp',         lines:'1-35',  conf:70 },
  { flag:'USE_OPENGL_LEGACY',     file:'render.cpp',      lines:'10-45', conf:95 },
];

function initDeadList() {
  const list = document.getElementById('deadList');
  if (!list) return;
  list.innerHTML = DEAD_FLAGS.map(d => `
    <div class="dl-item" title="Click to jump to ${d.file}:${d.lines}" onclick="jumpToFlag('${d.flag}','${d.file}')">
      <span class="dl-conf">${d.conf}%</span>
      <div class="dl-flag">☠ ${d.flag}</div>
      <div class="dl-meta">${d.file} · lines ${d.lines}</div>
      <div style="margin-top:6px;height:3px;background:rgba(255,255,255,0.06);border-radius:2px">
        <div style="width:${d.conf}%;height:100%;background:linear-gradient(90deg,#ff3a5c,#ffd700);border-radius:2px"></div>
      </div>
    </div>`).join('');
}

window.jumpToFlag = function(flag, file) {
  if (EDITOR_FILES[file]) renderEditor(file);
};

/* ============================================================
   Feature Dependency Graph (D3.js)
   ============================================================ */
function initDepGraph() {
  const svg = d3.select('#depGraph');
  if (svg.empty()) return;
  const W = svg.node().getBoundingClientRect().width || 800;
  const H = 340;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const nodes = [
    { id:'ENABLE_VULKAN',         state:'live' },
    { id:'FEATURE_OAUTH2',        state:'live' },
    { id:'USE_ASYNC_NET',         state:'live' },
    { id:'ENABLE_TELEMETRY_V2',   state:'live' },
    { id:'ENABLE_OLD_RENDERER',   state:'dead' },
    { id:'FEATURE_LEGACY_AUTH',   state:'dead' },
    { id:'FEATURE_OAUTH1',        state:'dead' },
    { id:'USE_DEPRECATED_SOCKET', state:'dead' },
    { id:'FEATURE_TELEMETRY_V1',  state:'dead' },
    { id:'OLD_CRYPTO_V1',         state:'dead' },
  ];

  const links = [
    { source:'FEATURE_LEGACY_AUTH', target:'OLD_CRYPTO_V1',         type:'dead' },
    { source:'FEATURE_LEGACY_AUTH', target:'USE_DEPRECATED_SOCKET',  type:'dead' },
    { source:'FEATURE_OAUTH1',      target:'FEATURE_LEGACY_AUTH',    type:'dead' },
    { source:'ENABLE_OLD_RENDERER', target:'FEATURE_LEGACY_AUTH',    type:'dead' },
    { source:'ENABLE_VULKAN',       target:'FEATURE_OAUTH2',         type:'live' },
    { source:'FEATURE_OAUTH2',      target:'USE_ASYNC_NET',          type:'live' },
    { source:'USE_ASYNC_NET',       target:'ENABLE_TELEMETRY_V2',    type:'live' },
    { source:'FEATURE_TELEMETRY_V1',target:'USE_DEPRECATED_SOCKET',  type:'dead' },
  ];

  const defs = svg.append('defs');
  ['live','dead'].forEach(t => {
    defs.append('marker')
      .attr('id',`dep-arr-${t}`)
      .attr('viewBox','0 -4 8 8').attr('refX',22).attr('refY',0)
      .attr('markerWidth',5).attr('markerHeight',5).attr('orient','auto')
      .append('path').attr('d','M0,-4L8,0L0,4')
      .attr('fill',t==='live'?'#00ff88':'#ff3a5c');
  });

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d=>d.id).distance(130))
    .force('charge', d3.forceManyBody().strength(-350))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide(60));

  const link = svg.selectAll('.dep-link')
    .data(links).enter().append('line')
    .attr('stroke', d=>d.type==='live'?'#00ff88':'#ff3a5c')
    .attr('stroke-width',1.5).attr('stroke-opacity',.6)
    .attr('stroke-dasharray', d=>d.type==='dead'?'5,3':null)
    .attr('marker-end', d=>`url(#dep-arr-${d.type})`);

  const node = svg.selectAll('.dep-node')
    .data(nodes).enter().append('g')
    .call(d3.drag()
      .on('start',(e,d)=>{ if(!e.active) sim.alphaTarget(.3).restart(); d.fx=d.x;d.fy=d.y; })
      .on('drag', (e,d)=>{ d.fx=e.x;d.fy=e.y; })
      .on('end',  (e,d)=>{ if(!e.active) sim.alphaTarget(0); d.fx=null;d.fy=null; }));

  node.append('rect')
    .attr('x',-68).attr('y',-14).attr('width',136).attr('height',28).attr('rx',6)
    .attr('fill', d=>d.state==='live'?'rgba(0,255,136,0.08)':'rgba(255,58,92,0.1)')
    .attr('stroke', d=>d.state==='live'?'#00ff88':'#ff3a5c')
    .attr('stroke-width',1.2);

  node.append('text')
    .attr('text-anchor','middle').attr('dominant-baseline','middle')
    .attr('font-family',"'JetBrains Mono',monospace").attr('font-size',9)
    .attr('fill',d=>d.state==='live'?'#00ff88':'#ff7096')
    .text(d=>d.id);

  sim.on('tick',()=>{
    link
      .attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
      .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
  });
}

/* ============================================================
   Runtime Toggle Analysis
   ============================================================ */
const TOGGLES = [
  { name:'ENABLE_VULKAN',        live:true,  type:'static' },
  { name:'FEATURE_OAUTH2',       live:true,  type:'static' },
  { name:'USE_ASYNC_NET',        live:true,  type:'static' },
  { name:'ENABLE_TELEMETRY_V2',  live:true,  type:'runtime' },
  { name:'FEATURE_LEGACY_AUTH',  live:false, type:'static' },
  { name:'ENABLE_OLD_RENDERER',  live:false, type:'static' },
  { name:'USE_DEPRECATED_SOCKET',live:false, type:'static' },
  { name:'EXPERIMENTAL_AI',      live:false, type:'runtime' },
  { name:'DEBUG_PRINT_VERBOSE',  live:false, type:'env-var' },
  { name:'OLD_CRYPTO_V1',        live:false, type:'static' },
];

function initRuntimeToggles() {
  const list = document.getElementById('toggleList');
  if (!list) return;
  list.innerHTML = TOGGLES.map((t,i) => `
    <div class="tl-item">
      <div>
        <div class="tl-name">${t.name}</div>
        <div style="font-size:10px;color:#475569;margin-top:2px">${t.type}</div>
      </div>
      <label class="tl-switch">
        <input type="checkbox" ${t.live?'checked':''} id="tog-${i}" onchange="onToggle(${i},this.checked)"/>
        <span class="tl-slider"></span>
      </label>
    </div>`).join('');
}

window.onToggle = function(idx, checked) {
  TOGGLES[idx].live = checked;
  // Live feedback — rerender dead list counts
  const liveCount = TOGGLES.filter(t=>t.live).length;
  const deadCount = TOGGLES.filter(t=>!t.live).length;
  const tpDead = document.getElementById('tp-dead');
  const tpLive = document.getElementById('tp-live');
  if (tpDead) tpDead.textContent = DEAD_FLAGS.length + deadCount;
  if (tpLive) tpLive.textContent = 389 - deadCount + liveCount;
};
