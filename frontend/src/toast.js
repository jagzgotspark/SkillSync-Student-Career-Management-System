/**
 * SkillSync Global Toast Notification System
 * Usage:  toast('Message', 'success' | 'error' | 'info' | 'warning')
 *         toastConfirm('Are you sure?').then(ok => { if(ok) ... })
 */

(function () {
    // ── Inject CSS ───────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #toast-container {
            position: fixed; top: 1.25rem; right: 1.25rem;
            z-index: 99999; display: flex; flex-direction: column; gap: 0.6rem;
            pointer-events: none;
        }
        .toast {
            display: flex; align-items: center; gap: 0.75rem;
            padding: 0.85rem 1.25rem;
            border-radius: 0.875rem;
            font-family: 'Inter', sans-serif;
            font-size: 0.88rem; font-weight: 600;
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            min-width: 280px; max-width: 380px;
            pointer-events: auto;
            animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
            border: 1px solid;
            cursor: pointer;
        }
        .toast.hide { animation: toastOut 0.28s ease forwards; }
        .toast-success  { background: rgba(236,253,245,0.95); color: #065f46; border-color: rgba(16,185,129,0.3); }
        .toast-error    { background: rgba(254,242,242,0.95); color: #991b1b; border-color: rgba(239,68,68,0.3); }
        .toast-warning  { background: rgba(255,251,235,0.95); color: #92400e; border-color: rgba(245,158,11,0.3); }
        .toast-info     { background: rgba(239,246,255,0.95); color: #1e40af; border-color: rgba(99,102,241,0.3); }
        .toast-icon { font-size: 1.1rem; flex-shrink: 0; }
        .toast-close { margin-left: auto; font-size: 1rem; opacity: 0.5; cursor: pointer; flex-shrink: 0; }
        .toast-close:hover { opacity: 1; }
        @keyframes toastIn  { from { opacity:0; transform:translateX(50px) scale(0.9); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(60px); } }

        /* Dark mode support */
        body.dark .toast-success { background:rgba(6,78,59,0.9); color:#6ee7b7; }
        body.dark .toast-error   { background:rgba(127,29,29,0.9); color:#fca5a5; }
        body.dark .toast-info    { background:rgba(30,58,138,0.9); color:#93c5fd; }
        body.dark .toast-warning { background:rgba(120,53,15,0.9); color:#fcd34d; }

        /* Confirm dialog */
        #toast-confirm-backdrop {
            position:fixed; inset:0; z-index:100000;
            background:rgba(0,0,0,0.45); backdrop-filter:blur(6px);
            display:flex; align-items:center; justify-content:center;
            animation: fadeBack 0.2s ease;
        }
        @keyframes fadeBack { from {opacity:0} to {opacity:1} }
        #toast-confirm-box {
            background:rgba(255,255,255,0.95); border-radius:1.25rem;
            padding:2rem; max-width:360px; width:90%; text-align:center;
            box-shadow:0 20px 60px rgba(0,0,0,0.2);
            animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
            font-family:'Inter',sans-serif;
        }
        #toast-confirm-box h4 { font-size:1.05rem; font-weight:700; color:#1e1b4b; margin-bottom:0.5rem; }
        #toast-confirm-box p  { font-size:0.88rem; color:#6b7280; margin-bottom:1.5rem; }
        .confirm-btns { display:flex; gap:0.75rem; justify-content:center; }
        .confirm-btn  { padding:0.6rem 1.5rem; border-radius:0.625rem; border:none; font-weight:700; font-size:0.88rem; cursor:pointer; transition:transform 0.15s; }
        .confirm-btn:hover { transform:translateY(-1px); }
        .confirm-yes  { background:linear-gradient(90deg,#6366f1,#ec4899); color:white; }
        .confirm-no   { background:rgba(100,116,139,0.1); color:#475569; }
    `;
    document.head.appendChild(style);

    // ── Container ────────────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    // ── Main toast function ──────────────────────────────────────────────────
    window.toast = function (message, type = 'info', duration = 3500) {
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML = `
            <span class="toast-icon">${ICONS[type] || 'ℹ️'}</span>
            <span>${message}</span>
            <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
        `;
        container.appendChild(el);
        const dismiss = () => {
            el.classList.add('hide');
            setTimeout(() => el.remove(), 280);
        };
        el.addEventListener('click', dismiss);
        setTimeout(dismiss, duration);
        return el;
    };

    // ── Confirm dialog ───────────────────────────────────────────────────────
    window.toastConfirm = function (message, detail = '') {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.id = 'toast-confirm-backdrop';
            backdrop.innerHTML = `
                <div id="toast-confirm-box">
                    <h4>${message}</h4>
                    ${detail ? `<p>${detail}</p>` : ''}
                    <div class="confirm-btns">
                        <button class="confirm-btn confirm-no"  id="tcNo">Cancel</button>
                        <button class="confirm-btn confirm-yes" id="tcYes">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            backdrop.querySelector('#tcYes').onclick = () => { backdrop.remove(); resolve(true); };
            backdrop.querySelector('#tcNo').onclick  = () => { backdrop.remove(); resolve(false); };
            backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } };
        });
    };
})();
