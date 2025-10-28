// main.js - augment Supervisor Console integration for summary and export handling
(function(){
  const hub = window.CometHub || (window.CometHub = {});

  function ensureSummaryBindings(){
    // Update counts if supervisor state is available on window
    const sup = window.__AI_SUP_STATE__;
    if (!sup) return;
    const set = (id,val)=>{ const el = document.getElementById(id); if (el) el.textContent = String(val); };
    set('count-pending', (sup.recommendations||[]).length);
    set('count-applied', (sup.applied||[]).length);
    set('count-archived', (sup.archived||[]).length);
  }

  function mountExportHandler(){
    window.exportRecommendationsMarkdown = window.exportRecommendationsMarkdown || function(){
      const sup = window.__AI_SUP_STATE__ || {};
      const ts = new Date().toISOString();
      const md = [
        `# AI Recommendations Report`,
        `- Generated: ${ts}`,
        `- Pending: ${(sup.recommendations||[]).length}`,
        `- Applied: ${(sup.applied||[]).length}`,
        `- Archived: ${(sup.archived||[]).length}`,
        `\n## Pending`,
        ...(sup.recommendations||[]).map(r=>`- [${r.category}] ${r.title} — ${r.description}`),
        `\n## Applied`,
        ...(sup.applied||[]).map(r=>`- [${r.category}] ${r.title} — at ${r.appliedAt}`),
        `\n## Archived`,
        ...(sup.archived||[]).map(r=>`- [${r.category}] ${r.title} — at ${r.archivedAt}`)
      ].join('\n');

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ai-recommendations-${ts.replace(/[:.]/g,'-')}.md`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }

  function hook(){
    mountExportHandler();
    const obs = new MutationObserver(()=>ensureSummaryBindings());
    obs.observe(document.body,{childList:true,subtree:true});
    ensureSummaryBindings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hook);
  } else {
    hook();
  }
})();