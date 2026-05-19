/* ============================================================
   Part 3: Dynamic File Upload + Real C++ / CMake Parser
   - Drag & drop / browse file upload
   - Real #define / #ifdef extraction from C++ source
   - Real CMakeLists.txt parsing
   - compile_commands.json ingestion
   ============================================================ */

/* ---- Override initBuildConfig with dynamic version ---- */
window.initBuildConfig = function () {

  const buildTab = document.getElementById('tab-build-config');
  if (!buildTab) return;

  /* Replace static content with upload UI */
  buildTab.querySelector('.two-col').innerHTML = `
    <!-- Upload Zone -->
    <div class="col-left">
      <div class="glass-card">
        <div class="card-header"><h3>📂 Upload Project Files</h3><div class="card-badge cyan">Dynamic</div></div>
        <div class="drop-zone" id="dropZone">
          <div class="dz-icon">⬆</div>
          <div class="dz-title">Drag & Drop Files Here</div>
          <div class="dz-sub">CMakeLists.txt · compile_commands.json · .cpp / .h files</div>
          <input type="file" id="fileInput" multiple accept=".cpp,.h,.hpp,.c,.json,.txt,.cmake" style="display:none"/>
          <button class="dz-btn" id="browseBtn">Browse Files</button>
        </div>
        <div class="uploaded-files" id="uploadedFiles"></div>
      </div>

      <div class="glass-card mt">
        <div class="card-header"><h3>📋 compile_commands.json</h3><div class="card-badge" id="ccBadge">Not loaded</div></div>
        <div class="json-viewer" id="jsonViewer"><span style="color:#475569">Upload compile_commands.json to view...</span></div>
      </div>
    </div>

    <!-- Right: extracted results -->
    <div class="col-right">
      <div class="glass-card">
        <div class="card-header">
          <h3>#define / #ifdef Extracted</h3>
          <div class="card-badge cyan" id="defineBadge">0 flags</div>
        </div>
        <div class="define-search">
          <input type="text" placeholder="Filter flags..." id="defineSearch"/>
          <span>⌕</span>
        </div>
        <div class="define-table-wrap">
          <table class="define-table">
            <thead><tr><th>Flag</th><th>Type</th><th>Files</th><th>Status</th></tr></thead>
            <tbody id="defineTbody"><tr><td colspan="4" style="color:#475569;text-align:center;padding:20px">Upload C++ files to extract flags...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="glass-card mt">
        <div class="card-header"><h3>🪵 Parser Log</h3></div>
        <div class="parser-log" id="parserLog"><span style="color:#475569">Waiting for files...</span></div>
      </div>
    </div>`;

  /* ---- inject upload styles ---- */
  if (!document.getElementById('uploadStyles')) {
    const s = document.createElement('style');
    s.id = 'uploadStyles';
    s.textContent = `
      .drop-zone{border:2px dashed rgba(0,245,255,0.3);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:.3s;margin-bottom:14px}
      .drop-zone:hover,.drop-zone.drag-over{border-color:#00f5ff;background:rgba(0,245,255,0.05)}
      .dz-icon{font-size:36px;margin-bottom:10px}
      .dz-title{color:#e2e8f0;font-weight:600;font-size:14px;margin-bottom:6px}
      .dz-sub{color:#64748b;font-size:11px;margin-bottom:16px}
      .dz-btn{background:linear-gradient(135deg,#00f5ff,#a855f7);border:none;color:#000;font-weight:700;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:12px;transition:.2s}
      .dz-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,245,255,0.3)}
      .uploaded-files{display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto}
      .uf-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-size:12px}
      .uf-icon{font-size:16px}
      .uf-name{color:#e2e8f0;flex:1;font-family:'JetBrains Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .uf-size{color:#64748b;font-size:10px;white-space:nowrap}
      .uf-status{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700}
      .uf-parsed{background:rgba(0,255,136,0.15);color:#00ff88}
      .uf-pending{background:rgba(255,215,0,0.15);color:#ffd700}
    `;
    document.head.appendChild(s);
  }

  /* ---- State ---- */
  const state = {
    files: [],       // { name, size, type, content }
    defines: [],     // extracted flags
    ccJson: null,
  };

  /* ---- File type helpers ---- */
  const isCpp   = n => /\.(cpp|c|cc|cxx|h|hpp)$/i.test(n);
  const isCmake = n => /CMakeLists\.txt$/i.test(n) || /\.cmake$/i.test(n);
  const isCC    = n => n === 'compile_commands.json';
  const fileIcon = n => isCpp(n)?'📄': isCmake(n)?'⚙': isCC(n)?'📋':'📁';
  const fmtSize  = b => b<1024?b+'B':b<1048576?(b/1024).toFixed(1)+'KB':(b/1048576).toFixed(1)+'MB';

  /* ---- Extract #define / #ifdef from C++ text ---- */
  function extractDefines(filename, text) {
    const found = {};

    // #define FLAG value  or  #define FLAG
    const defRe = /#define\s+([A-Z_][A-Z0-9_]*)\s*(\S*)/g;
    let m;
    while ((m = defRe.exec(text)) !== null) {
      const name = m[1], val = m[2] || '(defined)';
      if (!found[name]) found[name] = { name, val, type:'#define', files:new Set() };
      found[name].files.add(filename);
    }

    // #ifdef FLAG / #ifndef FLAG / #if defined(FLAG)
    const ifRe = /#ifn?def\s+([A-Z_][A-Z0-9_]*)|defined\(\s*([A-Z_][A-Z0-9_]*)\s*\)/g;
    while ((m = ifRe.exec(text)) !== null) {
      const name = m[1] || m[2];
      if (!found[name]) found[name] = { name, val:'—', type:'#ifdef', files:new Set() };
      found[name].files.add(filename);
    }

    return Object.values(found);
  }

  /* ---- Extract CMake defines ---- */
  function extractCMakeDefines(text) {
    const found = {};
    // add_definitions(-DFLAG or -DFLAG=val)
    const re = /(?:add_definitions|target_compile_definitions)\s*\([^)]*-D([A-Z_][A-Z0-9_]*)(?:=(\S+))?/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = m[1], val = m[2] || '1';
      if (!found[name]) found[name] = { name, val, type:'CMake -D', files:new Set(['CMakeLists.txt']) };
    }
    // option(FLAG "desc" ON/OFF)
    const optRe = /option\s*\(\s*([A-Z_][A-Z0-9_]*)\s+"[^"]*"\s+(ON|OFF)\s*\)/g;
    while ((m = optRe.exec(text)) !== null) {
      const name = m[1], val = m[2];
      if (!found[name]) found[name] = { name, val, type:'option()', files:new Set(['CMakeLists.txt']) };
    }
    return Object.values(found);
  }

  /* ---- Merge all defines ---- */
  function mergeDefines(newDefs) {
    newDefs.forEach(d => {
      const existing = state.defines.find(e => e.name === d.name);
      if (existing) {
        d.files.forEach(f => existing.files.add(f));
      } else {
        state.defines.push({ ...d, files: new Set(d.files) });
      }
    });
  }

  /* ---- Heuristic: guess if a flag is "dead" ---- */
  function guessStatus(d) {
    const n = d.name.toLowerCase();
    const deadKeywords = ['legacy','old','deprecated','compat','v1','debug_verbose','beta','experimental','unused'];
    const isDead = deadKeywords.some(k => n.includes(k))
      || d.val === '0' || d.val === 'OFF';
    return isDead ? 'dead' : 'live';
  }

  /* ---- Render define table ---- */
  function renderDefineTable(filter = '') {
    const tbody = document.getElementById('defineTbody');
    if (!tbody) return;
    const rows = state.defines.filter(d =>
      !filter || d.name.toLowerCase().includes(filter.toLowerCase())
    );
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:#475569;text-align:center;padding:20px">No flags match "${filter}"</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(d => {
      const status = guessStatus(d);
      const cls = status === 'dead' ? 'badge-dead' : 'badge-live';
      return `<tr>
        <td style="color:#00f5ff;font-size:11px">${d.name}</td>
        <td style="color:#a855f7;font-size:10px">${d.type}</td>
        <td style="color:#94a3b8">${d.files.size}</td>
        <td class="${cls}">${status.toUpperCase()}</td>
      </tr>`;
    }).join('');
    document.getElementById('defineBadge').textContent = rows.length + ' flags';
  }

  /* ---- Log helper ---- */
  function log(text, cls = 'pl-info') {
    const logEl = document.getElementById('parserLog');
    if (!logEl) return;
    if (logEl.querySelector('span')) logEl.innerHTML = '';
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /* ---- Render uploaded file list ---- */
  function renderFileList() {
    const container = document.getElementById('uploadedFiles');
    if (!container) return;
    container.innerHTML = state.files.map(f => `
      <div class="uf-item">
        <span class="uf-icon">${fileIcon(f.name)}</span>
        <span class="uf-name">${f.name}</span>
        <span class="uf-size">${fmtSize(f.size)}</span>
        <span class="uf-status uf-parsed">Parsed</span>
      </div>`).join('');
  }

  /* ---- Render file tree from uploaded files ---- */
  function buildFileTree() {
    const tree = document.getElementById('fileTree') || document.createElement('div');
    tree.innerHTML = state.files.map(f =>
      `<div class="ft-file ${guessStatus({name:f.name.toLowerCase(),val:'1',files:new Set()}) === 'dead' ? 'dead-file':'live-file'}">${fileIcon(f.name)} ${f.name}</div>`
    ).join('') || '<span style="color:#475569">No files uploaded</span>';
  }

  /* ---- Process a single file ---- */
  function processFile(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target.result;
        const rec = { name: file.name, size: file.size, content };
        state.files.push(rec);

        if (isCC(file.name)) {
          try {
            state.ccJson = JSON.parse(content);
            const jv = document.getElementById('jsonViewer');
            if (jv) {
              jv.innerHTML = state.ccJson.slice(0,3).map(entry => `
<span class="jv-key">"file"</span>: <span class="jv-str">"${entry.file||''}"</span><br>
<span class="jv-key">"command"</span>: <span class="jv-str">"${(entry.command||'').substring(0,80)}..."</span><br>
<span style="color:#334155">────────────────────────</span><br>`).join('');
              document.getElementById('ccBadge').textContent = state.ccJson.length + ' TUs';
              document.getElementById('ccBadge').className = 'card-badge cyan';
            }
            // extract -D flags from commands
            state.ccJson.forEach(entry => {
              const cmd = entry.command || entry.arguments?.join(' ') || '';
              const dRe = /-D([A-Z_][A-Z0-9_]*)(?:=(\S+))?/g;
              let m;
              while ((m = dRe.exec(cmd)) !== null) {
                mergeDefines([{ name:m[1], val:m[2]||'1', type:'compile_commands', files:new Set([entry.file||'?']) }]);
              }
            });
            log(`[OK]   compile_commands.json: ${state.ccJson.length} translation units found`, 'pl-ok');
          } catch(ex) {
            log(`[ERR]  Failed to parse compile_commands.json: ${ex.message}`, 'pl-err');
          }

        } else if (isCmake(file.name)) {
          const defs = extractCMakeDefines(content);
          mergeDefines(defs);
          log(`[OK]   ${file.name}: ${defs.length} CMake defines extracted`, 'pl-ok');

        } else if (isCpp(file.name)) {
          const defs = extractDefines(file.name, content);
          mergeDefines(defs);
          log(`[OK]   ${file.name}: ${defs.length} #define / #ifdef blocks found`, 'pl-ok');

        } else {
          log(`[INFO] ${file.name}: skipped (unsupported type)`, 'pl-info');
        }

        renderDefineTable(document.getElementById('defineSearch')?.value || '');
        renderFileList();
        buildFileTree();
        resolve();
      };
      reader.readAsText(file);
    });
  }

  /* ---- Handle file input ---- */
  async function handleFiles(fileList) {
    const logEl = document.getElementById('parserLog');
    if (logEl) logEl.innerHTML = '';
    log('[INFO] Starting parse...', 'pl-info');
    for (const file of Array.from(fileList)) {
      log(`[INFO] Reading: ${file.name}`, 'pl-info');
      await processFile(file);
    }
    log(`[OK]   Total unique flags: ${state.defines.length}`, 'pl-ok');
    log(`[OK]   Analysis ready ✓`, 'pl-ok');
  }

  /* ---- Wire up drop zone ---- */
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');

  browseBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => handleFiles(e.target.files));

  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  /* ---- Search filter ---- */
  document.getElementById('defineSearch')?.addEventListener('input', e => {
    renderDefineTable(e.target.value);
  });

  log('[INFO] Ready — upload your C++/CMake/compile_commands.json files', 'pl-info');
};
