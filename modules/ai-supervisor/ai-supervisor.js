/* AI Supervisor v2 – Temporal & Policy-Aware System (sandbox, no external deps) */
(function(){
  const state = window.CometSupervisorState = window.CometSupervisorState || {
    events: [],            // {id, module, action, payload, ts}
    approvals: [],         // {eventId, approvedBy, ts, policyTag?, auto: boolean}
    rollbacks: [],         // {eventId, ts, reason}
    insights: [],          // {id, ts, text, kind: 'temporal'|'policy'|'recommendation'}
    policies: {            // editable in UI
      autoApprove: true,
      lowRiskActions: ['logNote','uiHint','minorStyleUpdate'],
      perModuleAllow: {},  // e.g., {"moduleA":["refreshCache"]}
      temporalWindows: [5, 15, 60], // seconds for correlation windows
      sequenceSignatures: [         // patterns to detect
        { name:'A→B quick chain', seq: ['A:emit','B:consume'], withinSec: 5 },
      ],
      timelineLimit: 500
    },
    listeners: [] // UI subscribers
  };

  function now(){ return Date.now(); }
  function notify(){ state.listeners.forEach(fn=>{ try{ fn(state); }catch(e){} }); }

  // Public API to register events from modules (sandbox friendly)
  window.CometSupervisor = window.CometSupervisor || {};
  const api = window.CometSupervisor;

  api.recordEvent = function(module, action, payload){
    const evt = { id: 'e_'+Math.random().toString(36).slice(2), module, action, payload: clone(payload), ts: now() };
    state.events.push(evt);
    trimArrays();
    analyzeTemporal(evt);
    maybeAutoApprove(evt);
    notify();
    return evt.id;
  };

  api.rollback = function(eventId, reason){
    const exists = state.events.find(e=>e.id===eventId);
    if(!exists) return false;
    state.rollbacks.push({eventId, ts: now(), reason: reason||'manual'});
    addInsight(`Rollback executed for ${eventId} (${exists.module}:${exists.action})`, 'recommendation');
    logToRoadmap(`[ROLLBACK] ${exists.module}:${exists.action} for event ${eventId} — ${reason||''}`);
    notify();
    return true;
  };

  api.getState = function(){ return JSON.parse(JSON.stringify(state)); };
  api.onChange = function(fn){ if(typeof fn==='function'){ state.listeners.push(fn); fn(state);} };
  api.updatePolicies = function(newPolicies){
    Object.assign(state.policies, sanitizePolicies(newPolicies));
    addInsight('Policies updated by supervisor', 'policy');
    notify();
  };

  // Temporal correlation and insights
  function analyzeTemporal(newEvt){
    const wsecs = state.policies.temporalWindows || [5,15,60];
    for(const win of wsecs){
      const cutoff = newEvt.ts - win*1000;
      const windowEvents = state.events.filter(e=>e.ts>=cutoff && e.ts<=newEvt.ts);
      // simple pairwise: detect same module rapid repeats
      const repeats = windowEvents.filter(e=>e.module===newEvt.module && e.action===newEvt.action);
      if(repeats.length>=3){
        addInsight(`${newEvt.module}:${newEvt.action} occurred ${repeats.length} times within ${win}s`, 'temporal');
      }
      // cross-module trigger heuristic: A emits then B acts quickly
      for(const e of windowEvents){
        if(e===newEvt) continue;
        const dt = (newEvt.ts - e.ts)/1000;
        if(dt<=win && dt>0){
          addInsight(`${e.module}:${e.action} → ${newEvt.module}:${newEvt.action} within ${dt.toFixed(1)}s`, 'temporal');
        }
      }
    }
    // signature detection
    for(const sig of (state.policies.sequenceSignatures||[])){
      matchSignature(sig, newEvt);
    }
  }

  function matchSignature(sig, newEvt){
    // sig.seq like ['A:emit','B:consume']; withinSec
    const within = (sig.withinSec||10)*1000;
    const cutoff = newEvt.ts - within;
    const we = state.events.filter(e=>e.ts>=cutoff && e.ts<=newEvt.ts);
    const labels = we.map(e=>`${e.module}:${e.action}`);
    const seqStr = labels.join('>');
    const pattern = sig.seq.join('>');
    if(seqStr.includes(pattern)){
      addInsight(`Signature '${sig.name}' detected in last ${sig.withinSec||10}s`, 'temporal');
    }
  }

  // Policy-based auto-approval
  function maybeAutoApprove(evt){
    const p = state.policies;
    if(!p.autoApprove) return false;
    const lowRisk = new Set(p.lowRiskActions||[]);
    const perMod = p.perModuleAllow||{};
    const allowForModule = new Set(perMod[evt.module]||[]);
    if(lowRisk.has(evt.action) || allowForModule.has(evt.action)){
      approve(evt, '[policy:auto]');
      return true;
    }
    return false;
  }

  function approve(evt, policyTag){
    state.approvals.push({eventId: evt.id, approvedBy: 'AI-Supervisor', ts: now(), policyTag, auto: !!policyTag});
    // Always log to roadmap.md
    logToRoadmap(`[APPROVED${policyTag?(' '+policyTag):''}] ${evt.module}:${evt.action} ${compactPayload(evt.payload)} @ ${new Date().toISOString()}`);
    addInsight(`Approved ${evt.module}:${evt.action}${policyTag?(' '+policyTag):''}`, policyTag? 'policy':'recommendation');
    notify();
  }

  function compactPayload(p){
    try{ return JSON.stringify(p).slice(0,160); }catch(e){ return ''; }
  }

  // Documentation/logging into roadmap.md (in-editor only)
  function logToRoadmap(line){
    try{
      const docEl = document.querySelector('[aria-label="\\CometPlatform\\comet-platform\\roadmap.md"]');
      if(docEl){ /* tab exists */ }
      // Find any visible editor for roadmap
      const editor = findEditorByAria('roadmap.md');
      if(editor){
        const current = editor.textContent || '';
        // Append with newline
        editor.textContent = current + (current.endsWith('\n')?'':'\n') + line + '\n';
      }
    }catch(e){ /* sandbox safe */ }
  }

  function findEditorByAria(label){
    const tabs = Array.from(document.querySelectorAll('div[aria-label$="'+label+'"]'));
    // naive: pick a sibling editable textbox
    const editors = Array.from(document.querySelectorAll('[contenteditable="true"][role="textbox"]'));
    return editors[0] || null;
  }

  function addInsight(text, kind){
    state.insights.push({id: 'i_'+Math.random().toString(36).slice(2), ts: now(), text, kind});
    trimArrays();
  }

  function trimArrays(){
    const lim = state.policies.timelineLimit||500;
    if(state.events.length>lim) state.events.splice(0, state.events.length-lim);
    if(state.insights.length>lim) state.insights.splice(0, state.insights.length-lim);
    if(state.approvals.length>lim) state.approvals.splice(0, state.approvals.length-lim);
    if(state.rollbacks.length>lim) state.rollbacks.splice(0, state.rollbacks.length-lim);
  }

  // UI wiring (ai-supervisor.html expected containers)
  function render(){
    const container = document.getElementById('ai-supervisor-timeline');
    if(container){ container.innerHTML = buildTimelineHTML(); }
    const policyEl = document.getElementById('ai-supervisor-policy');
    if(policyEl){ policyEl.innerHTML = buildPolicyHTML(); attachPolicyHandlers(policyEl); }
  }

  function buildTimelineHTML(){
    // Merge actions, approvals, insights by time
    const items = [];
    for(const e of state.events){ items.push({ts:e.ts, html:`<div class="evt">[Action] ${e.module}:${e.action} ${escapeHtml(compactPayload(e.payload))}</div>`}); }
    for(const a of state.approvals){ items.push({ts:a.ts, html:`<div class="appr">[Approval] ${a.eventId} ${a.policyTag||''}</div>`}); }
    for(const i of state.insights){ items.push({ts:i.ts, html:`<div class="ins ${i.kind}">[Insight:${i.kind}] ${escapeHtml(i.text)}</div>`}); }
    for(const r of state.rollbacks){ items.push({ts:r.ts, html:`<div class="rb">[Rollback] ${r.eventId} — ${escapeHtml(r.reason||'')}</div>`}); }
    items.sort((a,b)=>a.ts-b.ts);
    const rows = items.map(x=>`<div class="row"><span class="t">${new Date(x.ts).toLocaleTimeString()}</span>${x.html}</div>`);
    return `<div class="timeline">${rows.join('')}</div>`;
  }

  function buildPolicyHTML(){
    const p = state.policies;
    return `
      <div class="policy">
        <label><input type="checkbox" id="pol-auto" ${p.autoApprove?'checked':''}/> Auto-approve low-risk</label>
        <div>
          <label>Low-risk actions (comma):</label>
          <input id="pol-low" type="text" value="${escapeAttr((p.lowRiskActions||[]).join(','))}"/>
        </div>
        <div>
          <label>Temporal windows (sec, comma):</label>
          <input id="pol-win" type="text" value="${escapeAttr((p.temporalWindows||[]).join(','))}"/>
        </div>
        <div>
          <label>Timeline limit:</label>
          <input id="pol-limit" type="number" min="50" max="2000" value="${p.timelineLimit||500}"/>
        </div>
        <button id="pol-save">Save Policies</button>
      </div>`;
  }

  function attachPolicyHandlers(root){
    const save = root.querySelector('#pol-save');
    if(save){
      save.onclick = ()=>{
        const auto = !!root.querySelector('#pol-auto')?.checked;
        const low = (root.querySelector('#pol-low')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const win = (root.querySelector('#pol-win')?.value||'').split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n)&&n>0);
        const limit = parseInt(root.querySelector('#pol-limit')?.value,10) || 500;
        api.updatePolicies({ autoApprove:auto, lowRiskActions:low, temporalWindows:win, timelineLimit:limit });
        render();
      };
    }
  }

  function sanitizePolicies(p){
    const out = {};
    if('autoApprove' in p) out.autoApprove = !!p.autoApprove;
    if('lowRiskActions' in p) out.lowRiskActions = (p.lowRiskActions||[]).filter(Boolean);
    if('perModuleAllow' in p) out.perModuleAllow = p.perModuleAllow||{};
    if('temporalWindows' in p) out.temporalWindows = (p.temporalWindows||[]).filter(n=>Number.isFinite(n)&&n>0);
    if('sequenceSignatures' in p) out.sequenceSignatures = p.sequenceSignatures||[];
    if('timelineLimit' in p) out.timelineLimit = Math.max(50, Math.min(2000, p.timelineLimit|0));
    return out;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }
  function clone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return null; } }

  // Periodic render sync
  state.listeners.push(render);
  setInterval(render, 1000);

  // Expose test hook to quickly simulate actions without network
  api.__demo = function(){
    api.recordEvent('A','emit',{x:1});
    setTimeout(()=>api.recordEvent('B','consume',{a:'ok'}), 1200);
    setTimeout(()=>api.recordEvent('A','emit',{x:2}), 2000);
    setTimeout(()=>api.recordEvent('B','consume',{a:'ok2'}), 2600);
    setTimeout(()=>api.recordEvent('UI','logNote',{msg:'note'}), 100);
  };
})();