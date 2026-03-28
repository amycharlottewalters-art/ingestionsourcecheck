const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 100%; } body { font-family: 'Lato', sans-serif; font-size: 1rem; }
  .app-shell { min-height: 100vh; background: #FAFAFA; }
  .tool-root { font-family: 'Lato', sans-serif; background: #FAFAFA; min-height: 100vh; color: #1a1a1a; }
  
  /* Config */
  .config-panel { background: #fff; border-bottom: 1px solid #E5E7EB; }
  .config-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; min-height: 44px; }
  .config-header-left { display: flex; align-items: center; gap: 8px; font-size: 0.9375rem; font-weight: 700; color: #4B5563; letter-spacing: 0.06em; text-transform: uppercase; }
  .config-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; }
  .config-dot.missing { background: #EF4444; }
  .config-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px; }
  .config-field { display: flex; flex-direction: column; gap: 4px; }
  .config-label { font-size: 0.875rem; font-weight: 700; color: #4B5563; letter-spacing: 0.04em; }
  .config-input-wrap { position: relative; display: flex; }
  .config-input { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 40px 10px 12px; font-family: 'Lato', sans-serif; font-size: 1rem; color: #111; background: #FAFAFA; outline: none; min-height: 44px; }
  .config-input:focus { border-color: #3B82F6; background: #fff; }
  .config-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6B7280; padding: 4px; min-width: 28px; min-height: 28px; display: flex; align-items: center; justify-content: center; }
  
  /* Progress */
  .progress-bar { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 12px 16px; }
  .progress-steps { display: flex; align-items: center; gap: 0; }
  .progress-step { display: flex; align-items: center; gap: 6px; flex: 1; }
  .progress-step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8125rem; font-weight: 700; flex-shrink: 0; transition: all 0.2s; }
  .progress-step-dot.done { background: #3B82F6; color: #fff; }
  .progress-step-dot.active { background: #EFF6FF; border: 2px solid #3B82F6; color: #3B82F6; }
  .progress-step-dot.future { background: #F3F4F6; color: #6B7280; }
  .progress-step-label { font-size: 0.75rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; display: none; }
  @media (min-width: 480px) { .progress-step-label { display: block; } }
  .progress-step-label.active { color: #3B82F6; }
  .progress-line { flex: 1; height: 2px; background: #E5E7EB; margin: 0 4px; }
  .progress-line.done { background: #3B82F6; }
  
  /* Page */
  .page { padding: 20px 16px; max-width: 680px; margin: 0 auto; }
  .page-title { font-size: 1.5rem; font-weight: 700; color: #111; margin-bottom: 4px; }
  .page-subtitle { font-size: 1.0625rem; color: #4B5563; font-weight: 300; margin-bottom: 24px; }
  
  /* Cards */
  .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .card-title { font-size: 0.9375rem; font-weight: 700; color: #374151; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; }
  
  /* Stats row */
  .stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
  @media (min-width: 400px) { .stats-row { grid-template-columns: repeat(3, 1fr); } }
  .stat-box { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 12px; text-align: center; }
  .stat-num { font-size: 1.875rem; font-weight: 700; color: #3B82F6; line-height: 1; }
  .stat-label { font-size: 0.8125rem; color: #6B7280; font-weight: 400; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  
  /* Strand badges */
  .strand-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.04em; }
  
  /* Domain group */
  .domain-group { margin-bottom: 10px; }
  .domain-header { font-size: 0.8125rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px 0; }
  .topic-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .topic-chip { padding: 5px 10px; border-radius: 20px; font-size: 0.875rem; font-weight: 400; cursor: pointer; border: 1.5px solid #E5E7EB; background: #fff; color: #374151; transition: all 0.15s; min-height: 32px; display: flex; align-items: center; position: relative; }
  .topic-chip:hover { border-color: #93C5FD; }
  .topic-chip.selected { background: #EFF6FF; border-color: #3B82F6; color: #1D4ED8; font-weight: 700; }
  .topic-chip-conf { font-size: 0.75rem; margin-left: 5px; opacity: 0.7; }
  
  /* Inputs */
  .field { margin-bottom: 14px; }
  .label { font-size: 0.875rem; font-weight: 700; color: #374151; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; display: block; }
  .input { width: 100%; border: 1.5px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; font-family: 'Lato', sans-serif; font-size: 1.125rem; color: #111; background: #fff; outline: none; min-height: 44px; }
  .input:focus { border-color: #3B82F6; }
  .textarea { min-height: 140px; resize: vertical; line-height: 1.5; }
  
  /* Buttons */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 8px; padding: 0 18px; font-family: 'Lato', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.15s; min-height: 44px; }
  .btn-primary { background: #3B82F6; color: #fff; }
  .btn-primary:hover { background: #2563EB; }
  .btn-primary:disabled { background: #93C5FD; cursor: not-allowed; }
  .btn-secondary { background: #F3F4F6; color: #374151; }
  .btn-secondary:hover { background: #E5E7EB; }
  .btn-danger { background: #FEE2E2; color: #991B1B; }
  .btn-danger:hover { background: #FECACA; }
  .btn-success { background: #DCFCE7; color: #166534; }
  .btn-success:hover { background: #BBF7D0; }
  .btn-full { width: 100%; }
  .btn-sm { min-height: 36px; padding: 0 12px; font-size: 0.9375rem; }
  
  /* Domain multi-select */
  .domain-select-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .domain-pill { padding: 6px 12px; border-radius: 20px; font-size: 0.875rem; font-weight: 400; cursor: pointer; border: 1.5px solid #E5E7EB; background: #fff; color: #374151; transition: all 0.15s; min-height: 36px; display: flex; align-items: center; }
  .domain-pill.selected { background: #EFF6FF; border-color: #3B82F6; color: #1D4ED8; font-weight: 700; }
  
  /* Streaming output */
  .stream-box { background: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; font-size: 1.0625rem; line-height: 1.7; color: #1F2937; white-space: pre-wrap; font-family: 'Lato', sans-serif; max-height: 60vh; overflow-y: auto; font-weight: 300; }
  
  /* Loading */
  .loading-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px 20px; text-align: center; }
  .spinner { width: 36px; height: 36px; border: 3px solid #E5E7EB; border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-msg { font-size: 1rem; color: #4B5563; font-weight: 300; }
  
  /* Alert / notice */
  .alert { padding: 12px 14px; border-radius: 8px; font-size: 0.9375rem; margin-bottom: 12px; line-height: 1.5; }
  .alert-warn { background: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; }
  .alert-error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }
  .alert-info { background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; }
  .alert-success { background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; }
  
  /* Scholar card */
  .scholar-card { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
  .scholar-card.excluded { opacity: 0.45; }
  .scholar-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .scholar-card-name { font-size: 1.125rem; font-weight: 700; color: #111; }
  .scholar-card-id { font-size: 0.875rem; color: #6B7280; }
  .toggle-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .toggle { width: 40px; height: 22px; border-radius: 11px; background: #E5E7EB; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; border: none; }
  .toggle.on { background: #3B82F6; }
  .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
  .toggle.on::after { transform: translateX(18px); }
  .toggle-label { font-size: 0.9375rem; color: #374151; }
  .confidence-row { display: flex; gap: 6px; }
  .conf-btn { padding: 4px 10px; border-radius: 6px; font-size: 0.875rem; font-weight: 700; border: 1.5px solid #E5E7EB; background: #fff; cursor: pointer; min-height: 32px; color: #4B5563; }
  .conf-btn.active-high { background: #DCFCE7; border-color: #86EFAC; color: #166534; }
  .conf-btn.active-medium { background: #FFFBEB; border-color: #FCD34D; color: #92400E; }
  .conf-btn.active-low { background: #FEF2F2; border-color: #FECACA; color: #991B1B; }
  
  /* Source review card */
  .review-card { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .review-card.approved { border-color: #86EFAC; background: #F0FDF4; }
  .review-card.rejected { border-color: #FECACA; background: #FEF2F2; opacity: 0.6; }
  .review-card-header { margin-bottom: 12px; }
  .review-card-title { font-size: 1.125rem; font-weight: 700; color: #111; }
  .review-card-sub { font-size: 0.9375rem; color: #4B5563; margin-top: 2px; }
  .review-section { margin-bottom: 10px; }
  .review-section-label { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6B7280; margin-bottom: 5px; }
  .claim-item { font-size: 1rem; color: #374151; padding: 4px 0; line-height: 1.5; border-bottom: 1px solid #F9FAFB; }
  .angle-item { font-size: 1rem; color: #374151; padding: 8px 12px; border-left: 3px solid #3B82F6; background: #EFF6FF; border-radius: 0 6px 6px 0; margin-bottom: 6px; line-height: 1.5; }
  .tag-list { display: flex; flex-wrap: wrap; gap: 5px; }
  .tag { padding: 3px 8px; border-radius: 6px; font-size: 0.875rem; background: #F3F4F6; color: #374151; }
  .quote-block { background: #FAFAFA; border-left: 3px solid #D1D5DB; padding: 8px 12px; border-radius: 0 6px 6px 0; font-size: 0.9375rem; color: #374151; font-style: italic; margin-bottom: 5px; }
  .quote-ref { font-size: 0.8125rem; color: #6B7280; margin-top: 3px; font-style: normal; }
  
  /* Session resume cards */
  .session-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s; }
  .session-card:hover { border-color: #93C5FD; }
  .session-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .session-card-desc { font-size: 1rem; font-weight: 700; color: #111; }
  .session-card-meta { font-size: 0.875rem; color: #6B7280; margin-top: 3px; }
  
  /* Gap list */
  .gap-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F3F4F6; font-size: 0.9375rem; }
  .gap-domain { color: #6B7280; font-size: 0.8125rem; }
  
  /* Upload area */
  .upload-area { border: 2px dashed #D1D5DB; border-radius: 10px; padding: 28px 20px; text-align: center; cursor: pointer; transition: border-color 0.15s; }
  .upload-area:hover, .upload-area.drag { border-color: #3B82F6; background: #EFF6FF; }
  .upload-icon { font-size: 1.875rem; margin-bottom: 8px; }
  .upload-text { font-size: 1rem; color: #4B5563; }
  .upload-sub { font-size: 0.875rem; color: #6B7280; margin-top: 4px; }
  
  /* Collapsible */
  .collapsible-header { cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
  .collapsible-body { overflow: hidden; }
  
  /* Divider */
  .divider { border: none; border-top: 1px solid #E5E7EB; margin: 16px 0; }
  
  /* Chunk list */
  .chunk-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 6px; font-size: 0.9375rem; }
  .chunk-status { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .chunk-status.done { color: #166534; }
  .chunk-status.current { color: #1D4ED8; }
  .chunk-status.pending { color: #6B7280; }
  
  /* Word count badge */
  .word-count { font-size: 0.875rem; color: #6B7280; margin-top: 4px; }
  
  /* Per-topic confidence inline */
  .per-topic-conf { display: flex; align-items: center; gap: 4px; margin-top: 4px; margin-left: 4px; }
  .ptc-label { font-size: 0.8125rem; color: #6B7280; }
  .ptc-btn { padding: 2px 7px; border-radius: 4px; font-size: 0.8125rem; font-weight: 700; border: 1px solid #E5E7EB; background: #fff; cursor: pointer; min-height: 26px; color: #4B5563; }
  .ptc-btn.active-high { background: #DCFCE7; border-color: #86EFAC; color: #166534; }
  .ptc-btn.active-medium { background: #FFFBEB; border-color: #FCD34D; color: #92400E; }
  .ptc-btn.active-low { background: #FEF2F2; border-color: #FECACA; color: #991B1B; }
  
  /* Action row */
  .action-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  
  /* Topic count badge next to domain */
  .domain-count { background: #F3F4F6; color: #4B5563; font-size: 0.75rem; padding: 1px 6px; border-radius: 10px; font-weight: 700; }
  
  .mt-12 { margin-top: 12px; }
  .mt-16 { margin-top: 16px; }
  .mb-8 { margin-bottom: 8px; }
  .mb-16 { margin-bottom: 16px; }
  .text-muted { color: #6B7280; font-size: 0.9375rem; }
  .flex-row { display: flex; gap: 8px; align-items: center; }
  .flex-between { display: flex; justify-content: space-between; align-items: center; }
  
  /* Strand bar */
  .strand-bar { display: flex; flex-direction: column; gap: 5px; }
  .strand-row { display: flex; align-items: center; gap: 8px; font-size: 0.9375rem; }
  .strand-name { width: 110px; flex-shrink: 0; font-weight: 400; color: #374151; }
  .strand-track { flex: 1; background: #F3F4F6; border-radius: 3px; height: 8px; overflow: hidden; }
  .strand-fill { height: 100%; border-radius: 3px; background: #3B82F6; transition: width 0.4s; }
  .strand-count { font-size: 0.875rem; color: #6B7280; width: 28px; text-align: right; flex-shrink: 0; }
  
  select.input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
  
  /* Scholar detail panel */
  .scholar-detail-row { display: flex; align-items: flex-start; gap: 8px; padding: "6px 0"; font-size: 0.9375rem; }
  .scholar-detail-label { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; width: 90px; flex-shrink: 0; padding-top: 2px; }
  .scholar-detail-value { flex: 1; color: #374151; line-height: 1.5; }

  /* Slide-up panel */
  .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; animation: fadeIn 0.2s; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .panel-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 16px 16px 0 0; z-index: 101; max-height: 90vh; display: flex; flex-direction: column; animation: slideUp 0.25s ease-out; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 0; flex-shrink: 0; }
  .panel-title { font-size: 1.125rem; font-weight: 700; color: #111; }
  .panel-close { background: #F3F4F6; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 1.125rem; display: flex; align-items: center; justify-content: center; color: #374151; }
  .panel-tabs { display: flex; border-bottom: 1px solid #E5E7EB; padding: 0 16px; margin-top: 12px; flex-shrink: 0; }
  .panel-tab { padding: 8px 16px; font-family: 'Lato', sans-serif; font-size: 0.9375rem; font-weight: 700; color: #6B7280; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; min-height: 40px; }
  .panel-tab.active { color: #3B82F6; border-bottom-color: #3B82F6; }
  .panel-body { flex: 1; overflow-y: auto; padding: 16px; }
  .panel-fab { position: fixed; bottom: 100px; right: 12px; z-index: 99; background: #3B82F6; color: #fff; border: none; border-radius: 50px; padding: 0 14px; height: 40px; font-family: 'Lato', sans-serif; font-size: 0.9375rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(59,130,246,0.4); display: flex; align-items: center; gap: 6px; transition: background 0.15s; }
  .panel-fab:hover { background: #2563EB; }

  .post-commit-report { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; font-size: 0.9375rem; color: #1F2937; white-space: pre-wrap; font-weight: 300; line-height: 1.6; margin-bottom: 16px; max-height: 280px; overflow-y: auto; }

  /* Top nav tabs */
  .top-nav { background: #fff; border-bottom: 1px solid #E5E7EB; display: flex; gap: 0; }
  .top-nav-tab { flex: 1; padding: 12px 16px; font-family: 'Lato', sans-serif; font-size: 0.9375rem; font-weight: 700; color: #6B7280; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; text-align: center; text-transform: uppercase; letter-spacing: 0.06em; transition: all 0.15s; min-height: 44px; }
  .top-nav-tab.active { color: #3B82F6; border-bottom-color: #3B82F6; }
  .top-nav-tab:hover:not(.active) { color: #374151; }

  /* Scholar manager */
  .scholar-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
  .scholar-row:last-child { border-bottom: none; }
  .scholar-row-name { flex: 1; font-size: 1.0625rem; font-weight: 700; color: #111; }
  .scholar-row-meta { font-size: 0.875rem; color: #6B7280; }
  .scholar-row.inactive { opacity: 0.45; }
  .edit-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .edit-input { border: 1.5px solid #3B82F6; border-radius: 6px; padding: 8px 12px; font-family: 'Lato', sans-serif; font-size: 0.9375rem; color: #111; background: #fff; outline: none; min-height: 38px; box-sizing: border-box; }
  .edit-select { border: 1.5px solid #3B82F6; border-radius: 6px; padding: 8px 12px; font-family: 'Lato', sans-serif; font-size: 0.9375rem; color: #111; background: #fff; outline: none; min-height: 38px; appearance: none; box-sizing: border-box; }
  .scholar-search { width: 100%; border: 1.5px solid #E5E7EB; border-radius: 8px; padding: 9px 12px; font-family: 'Lato', sans-serif; font-size: 1rem; color: #111; background: #fff; outline: none; min-height: 44px; margin-bottom: 12px; }
  .scholar-search:focus { border-color: #3B82F6; }
`;
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

// Google Fonts
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap";
document.head.appendChild(FONT_LINK);
