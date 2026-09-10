const CAPTURE_PWA_HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#09090b">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Life OS">
  <title>Life OS // Omni-Slate</title>

  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          },
          colors: {
            bg: '#09090b',
            card: '#121215',
            border: '#27272a',
            subtle: '#3f3f46'
          }
        }
      }
    };
  </script>

  <style>
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: 'Inter', sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .glow-focus:focus-within {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.35), 0 0 20px -2px rgba(99, 102, 241, 0.2);
    }
    .press-effect:active {
      transform: scale(0.98);
    }
    .recording-active {
      background-color: rgba(244, 63, 94, 0.15) !important;
      color: #fb7185 !important;
      border-color: rgba(244, 63, 94, 0.5) !important;
      box-shadow: 0 0 14px rgba(244, 63, 94, 0.45), 0 0 24px rgba(168, 85, 247, 0.35);
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 14px rgba(244, 63, 94, 0.45), 0 0 24px rgba(168, 85, 247, 0.35); }
      50% { opacity: 0.9; transform: scale(1.05); box-shadow: 0 0 20px rgba(244, 63, 94, 0.6), 0 0 32px rgba(168, 85, 247, 0.5); }
    }
    .drop-active {
      border-color: rgba(99, 102, 241, 0.8) !important;
      background-color: rgba(99, 102, 241, 0.08) !important;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500/30">

  <!-- Header -->
  <header class="max-w-lg w-full mx-auto flex items-center justify-between pt-2 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="h-6 w-6 rounded-md bg-gradient-to-tr from-indigo-500 via-purple-600 to-indigo-400 p-[1px] shadow-sm flex items-center justify-center">
        <div class="h-full w-full bg-[#09090b] rounded-[5px] flex items-center justify-center">
          <div class="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></div>
        </div>
      </div>
      <div>
        <h1 class="text-xs font-semibold tracking-wider text-zinc-300 uppercase">Life OS</h1>
        <p class="text-[10px] text-zinc-500 font-mono tracking-tight">UNIVERSAL OMNI-SLATE</p>
      </div>
    </div>

    <!-- Header Controls: Bio-Rhythm & Status Badge -->
    <div class="flex items-center gap-2">
      <!-- Bio-Rhythm Quick Controls -->
      <div class="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-full p-1 shadow-sm">
        <button 
          type="button" 
          id="sleepBtn" 
          title="Log Sleep"
          class="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-indigo-300 hover:text-white hover:bg-indigo-950/80 active:scale-95 transition-all flex items-center gap-1 press-effect"
        >
          <span>🌙</span>
          <span class="font-mono">Sleep</span>
        </button>
        <button 
          type="button" 
          id="wakeBtn" 
          title="Log Wake"
          class="px-2.5 py-0.5 rounded-full text-[11px] font-medium text-amber-300 hover:text-white hover:bg-amber-950/80 active:scale-95 transition-all flex items-center gap-1 press-effect"
        >
          <span>☀️</span>
          <span class="font-mono">Awake</span>
        </button>
      </div>

      <!-- Status Badge -->
      <div id="statusPill" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
        <span id="statusDot" class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        <span id="statusText">READY</span>
      </div>
    </div>
  </header>

  <!-- Universal Omni-Slate Card -->
  <main class="max-w-lg w-full mx-auto my-auto">
    <div class="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-2xl space-y-4 glow-focus transition-all duration-200">
      
      <!-- Auto-Expanding Textarea & Dropzone -->
      <div id="dropZone" class="relative bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden focus-within:border-indigo-500/60 transition-colors">
        <textarea 
          id="textInput" 
          rows="4" 
          placeholder="Dump anything... voice, expenses, tasks, or notes. Life OS will route it." 
          class="w-full bg-transparent p-4 text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-600 resize-none leading-relaxed transition-all"
        ></textarea>

        <!-- Staged Attachment Preview Pill (if file attached) -->
        <div id="attachmentPreview" class="hidden mx-4 mb-3 p-2 bg-[#18181b] border border-[#27272a] rounded-lg flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2 overflow-hidden">
            <div id="thumbContainer" class="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 text-zinc-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
              </svg>
            </div>
            <div class="overflow-hidden">
              <p id="attachmentName" class="truncate font-medium text-zinc-200 text-xs">attachment.pdf</p>
              <p id="attachmentSize" class="text-[10px] text-zinc-500 font-mono">0 KB</p>
            </div>
          </div>
          <button type="button" id="removeAttachmentBtn" class="h-6 w-6 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex items-center justify-between gap-3 pt-1">
        <div class="flex items-center gap-1.5">
          <!-- Voice Dictation Button -->
          <button 
            type="button" 
            id="micBtn" 
            title="Voice Dictation"
            class="h-10 w-10 rounded-xl bg-[#09090b] border border-[#27272a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 flex items-center justify-center transition-all press-effect"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
          </button>

          <!-- File Upload / Camera Button -->
          <button 
            type="button" 
            id="attachBtn" 
            title="Attach image or document"
            class="h-10 w-10 rounded-xl bg-[#09090b] border border-[#27272a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 flex items-center justify-center transition-all press-effect"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
          </button>
          <input type="file" id="fileInput" accept="image/*,application/pdf" class="hidden" />

          <!-- Clear Button -->
          <button 
            type="button" 
            id="clearBtn" 
            title="Clear all"
            class="h-10 w-10 rounded-xl bg-[#09090b] border border-[#27272a] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 flex items-center justify-center transition-all press-effect"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span id="charCount" class="text-[11px] text-zinc-500 font-mono hidden sm:inline">0 chars</span>
          
          <!-- Submit Button -->
          <button 
            type="button" 
            id="submitBtn" 
            class="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold tracking-wide flex items-center gap-2 shadow-lg shadow-indigo-500/20 press-effect transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg id="btnIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"></path>
            </svg>
            <span id="btnText">Capture</span>
            <span class="hidden sm:inline text-[10px] font-mono text-indigo-200 bg-indigo-700/50 px-1 rounded border border-indigo-400/30">⌘↵</span>
          </button>
        </div>
      </div>

      <!-- Offline Queue Indicator -->
      <div id="queueNotice" class="hidden text-center pt-1 border-t border-[#1e1e24]">
        <button type="button" id="flushQueueBtn" class="text-[11px] text-amber-400/90 hover:text-amber-300 font-mono underline cursor-pointer">
          Pending offline items waiting to sync
        </button>
      </div>

    </div>
  </main>

  <!-- Footer -->
  <footer class="max-w-lg w-full mx-auto text-center pb-2 pt-4">
    <p class="text-[11px] text-zinc-600 font-mono">ZERO-FRICTION SLATE // ASIA/MANILA UTC+8</p>
  </footer>

  <!-- Toast Container -->
  <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700 text-zinc-200 text-xs font-medium shadow-2xl backdrop-blur flex items-center gap-2 transition-all duration-300 opacity-0 pointer-events-none translate-y-2">
    <span id="toastDot" class="h-2 w-2 rounded-full bg-emerald-400"></span>
    <span id="toastMsg">Synced to Cloud</span>
  </div>

  <!-- Cashew Personal Expense Modal -->
  <div id="cashewModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden transition-all duration-200">
    <div class="max-w-sm w-full bg-[#121215] border border-[#27272a] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 glow-focus">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-xs font-semibold tracking-wider text-zinc-200 uppercase">Cashew Quick-Log</h2>
            <p class="text-[10px] text-zinc-500 font-mono">PERSONAL EXPENSE DETECTED</p>
          </div>
        </div>
        <button type="button" id="closeCashewModal" class="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="bg-[#09090b] border border-[#27272a] rounded-xl p-4 text-center space-y-1.5">
        <p class="text-xs text-zinc-400 font-medium truncate" id="cashewDesc">Personal Outlay</p>
        <p class="text-2xl font-bold font-mono tracking-tight text-white" id="cashewAmountText">Personal Expense: ₱0.00</p>
        <p id="cashewStatus" class="text-[10px] text-zinc-500 font-mono">Tap below to copy amount & launch Cashew</p>
      </div>

      <div class="flex gap-2 pt-1">
        <button 
          type="button" 
          id="logToCashewBtn" 
          class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 press-effect transition-all"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
          <span id="logToCashewText">Log to Cashew</span>
        </button>
        <button 
          type="button" 
          id="dismissCashewBtn" 
          class="px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium press-effect transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>

  <!-- Morning Launch Pad Briefing Modal -->
  <div id="briefingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md hidden transition-all duration-200">
    <div class="max-w-md w-full bg-[#121215] border border-[#27272a] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 glow-focus max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-sm text-base">
            ☀️
          </div>
          <div>
            <h2 class="text-xs font-bold tracking-wider text-zinc-100 uppercase">Morning Launch Pad</h2>
            <p class="text-[10px] text-zinc-500 font-mono">LIGAO SENTRY // ASIA/MANILA</p>
          </div>
        </div>
        <button type="button" id="closeBriefingBtn" class="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Greeting & Overview -->
      <div class="space-y-1">
        <p id="briefingGreeting" class="text-sm font-semibold text-zinc-100 leading-snug">Good morning, Gian!</p>
      </div>

      <!-- Metrics Row (Rest & Weather Pills) -->
      <div class="grid grid-cols-2 gap-2.5">
        <!-- Rest Metrics Pill -->
        <div class="bg-[#09090b] border border-[#27272a] rounded-xl p-3 flex flex-col justify-between">
          <span class="text-[10px] font-mono uppercase text-indigo-400 font-semibold tracking-wider">Rest Metrics</span>
          <p id="briefingSleepStats" class="text-sm font-bold font-mono text-zinc-100 mt-1">7.50h sleep</p>
          <span id="briefingDebtStats" class="text-[10px] font-mono text-zinc-500">0.50h debt</span>
        </div>

        <!-- Weather Indicator Pill -->
        <div class="bg-[#09090b] border border-[#27272a] rounded-xl p-3 flex flex-col justify-between">
          <span class="text-[10px] font-mono uppercase text-amber-400 font-semibold tracking-wider">Ligao Weather</span>
          <p id="briefingWeatherTemp" class="text-sm font-bold font-mono text-zinc-100 mt-1">26°C</p>
          <span id="briefingWeatherRain" class="text-[10px] font-mono text-zinc-500">53% rain risk</span>
        </div>
      </div>

      <!-- Summaries -->
      <div class="bg-[#09090b]/60 border border-[#1f1f23] rounded-xl p-3 space-y-1.5 text-xs text-zinc-300">
        <p id="briefingSleepSummary" class="text-xs text-zinc-300 leading-relaxed"></p>
        <p id="briefingWeatherSummary" class="text-xs text-zinc-400 leading-relaxed"></p>
      </div>

      <!-- Urgent Deliverables Section -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono uppercase text-rose-400 font-bold tracking-wider flex items-center gap-1.5">
            <span class="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Urgent Radar (Next 48–72h)
          </span>
          <span id="briefingUrgentCount" class="text-[10px] font-mono text-zinc-500">0 pending</span>
        </div>
        <div class="bg-[#09090b] border border-[#27272a] rounded-xl p-3 max-h-36 overflow-y-auto">
          <ul id="briefingUrgentList" class="space-y-2 text-xs text-zinc-200"></ul>
        </div>
      </div>

      <!-- Quiz Radar Section (Risk >= 40%) -->
      <div id="briefingQuizSection" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1.5">
            <span>🎯</span> Quiz Radar (Risk &ge; 40%)
          </span>
          <span id="briefingQuizCount" class="text-[10px] font-mono text-zinc-500">0 monitored</span>
        </div>
        <div id="briefingQuizContainer" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
      </div>

      <!-- Gear Checklist Section -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider flex items-center gap-1.5">
            <span>🎒</span> Gear & Prep Checklist
          </span>
          <span class="text-[10px] font-mono text-zinc-500">Tap to check</span>
        </div>
        <div id="briefingGearContainer" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
      </div>

      <!-- Action Button -->
      <div class="pt-1">
        <button 
          type="button" 
          id="dismissBriefingBtn" 
          class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 press-effect transition-all"
        >
          <span>Dismiss / Let's Work</span>
          <span>🚀</span>
        </button>
      </div>

    </div>
  </div>

  <script>
    const BEARER_TOKEN = '26RBRR09';

    const dropZone = document.getElementById('dropZone');
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const micBtn = document.getElementById('micBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const clearBtn = document.getElementById('clearBtn');
    const attachmentPreview = document.getElementById('attachmentPreview');
    const thumbContainer = document.getElementById('thumbContainer');
    const attachmentName = document.getElementById('attachmentName');
    const attachmentSize = document.getElementById('attachmentSize');
    const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastDot = document.getElementById('toastDot');
    const queueNotice = document.getElementById('queueNotice');
    const flushQueueBtn = document.getElementById('flushQueueBtn');

    // Cashew Modal Elements
    const cashewModal = document.getElementById('cashewModal');
    const cashewDesc = document.getElementById('cashewDesc');
    const cashewAmountText = document.getElementById('cashewAmountText');
    const cashewStatus = document.getElementById('cashewStatus');
    const logToCashewBtn = document.getElementById('logToCashewBtn');
    const dismissCashewBtn = document.getElementById('dismissCashewBtn');
    const closeCashewModal = document.getElementById('closeCashewModal');

    let currentPersonalExpense = null;

    let stagedAttachment = null;
    let isRecording = false;
    let recognition = null;

    function triggerHaptic() {
      if (navigator.vibrate) {
        try { navigator.vibrate(10); } catch(e) {}
      }
    }

    // Auto-resize textarea
    function autoResizeTextarea() {
      textInput.style.height = 'auto';
      textInput.style.height = Math.min(Math.max(textInput.scrollHeight, 100), 380) + 'px';
      updateCharCount();
    }

    function updateCharCount() {
      const len = textInput.value.length;
      charCount.textContent = len + (len === 1 ? ' char' : ' chars');
    }

    textInput.addEventListener('input', autoResizeTextarea);

    // Web Speech API initialization
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording-active');
        statusText.textContent = 'LISTENING...';
        statusDot.className = 'h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping';
      };

      recognition.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          }
        }
        if (final) {
          const current = textInput.value;
          textInput.value = (current ? current.trim() + ' ' : '') + final.trim();
          autoResizeTextarea();
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
        stopRecording();
      };

      recognition.onend = () => {
        stopRecording();
      };
    }

    function toggleRecording() {
      triggerHaptic();
      if (!SpeechRecognition) {
        showToast('Voice dictation not supported in browser', true);
        return;
      }
      if (isRecording) {
        recognition.stop();
        stopRecording();
      } else {
        try {
          recognition.start();
        } catch (err) {
          try { recognition.stop(); } catch(e) {}
        }
      }
    }

    function stopRecording() {
      isRecording = false;
      micBtn.classList.remove('recording-active');
      updateNetworkStatus();
    }

    micBtn.addEventListener('click', toggleRecording);

    // Attachments & Dropzone
    attachBtn.addEventListener('click', () => {
      triggerHaptic();
      fileInput.click();
    });

    function processFile(file) {
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        showToast('File size exceeds 20MB limit', true);
        return;
      }

      triggerHaptic();
      const reader = new FileReader();
      reader.onload = () => {
        stagedAttachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result
        };
        renderAttachmentPreview();
      };
      reader.readAsDataURL(file);
    }

    fileInput.addEventListener('change', (e) => {
      processFile(e.target.files[0]);
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drop-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drop-active');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        processFile(dt.files[0]);
      }
    });

    function renderAttachmentPreview() {
      if (!stagedAttachment) {
        attachmentPreview.classList.add('hidden');
        return;
      }

      attachmentName.textContent = stagedAttachment.name;
      const sizeKb = Math.round(stagedAttachment.size / 1024);
      attachmentSize.textContent = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

      if (stagedAttachment.type.startsWith('image/')) {
        thumbContainer.innerHTML = '<img src="' + stagedAttachment.data + '" class="h-full w-full object-cover rounded" />';
      } else {
        thumbContainer.innerHTML = '<svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
      }

      attachmentPreview.classList.remove('hidden');
    }

    removeAttachmentBtn.addEventListener('click', () => {
      triggerHaptic();
      stagedAttachment = null;
      fileInput.value = '';
      attachmentPreview.classList.add('hidden');
    });

    clearBtn.addEventListener('click', () => {
      triggerHaptic();
      textInput.value = '';
      stagedAttachment = null;
      fileInput.value = '';
      attachmentPreview.classList.add('hidden');
      autoResizeTextarea();
    });

    // Toast
    let toastTimeout;
    function showToast(message, isError = false, isWarning = false) {
      clearTimeout(toastTimeout);
      toastMsg.textContent = message;
      if (isError) {
        toastDot.className = 'h-2 w-2 rounded-full bg-rose-500';
      } else if (isWarning) {
        toastDot.className = 'h-2 w-2 rounded-full bg-amber-400';
      } else {
        toastDot.className = 'h-2 w-2 rounded-full bg-emerald-400';
      }
      toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');

      toastTimeout = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
      }, 2800);
    }

    // Cashew Modal Functions
    function showCashewModal(personalExpense) {
      if (!personalExpense || typeof personalExpense.amount === 'undefined') return;
      currentPersonalExpense = personalExpense;
      cashewDesc.textContent = personalExpense.description || 'Personal Outlay';
      cashewAmountText.textContent = 'Personal Expense: ₱' + personalExpense.amount;
      cashewStatus.textContent = 'Tap below to copy amount & launch Cashew';
      cashewStatus.className = 'text-[10px] text-zinc-500 font-mono';
      cashewModal.classList.remove('hidden');
    }

    function hideCashewModal() {
      cashewModal.classList.add('hidden');
    }

    if (closeCashewModal) closeCashewModal.addEventListener('click', hideCashewModal);
    if (dismissCashewBtn) dismissCashewBtn.addEventListener('click', hideCashewModal);

    if (logToCashewBtn) {
      logToCashewBtn.addEventListener('click', async () => {
        triggerHaptic();
        if (currentPersonalExpense && typeof currentPersonalExpense.amount !== 'undefined') {
          const amtStr = currentPersonalExpense.amount.toString();
          try {
            await navigator.clipboard.writeText(amtStr);
            cashewStatus.textContent = '✓ Amount ₱' + amtStr + ' copied to clipboard! Launching Cashew...';
            cashewStatus.className = 'text-[10px] text-emerald-400 font-mono font-medium';
            showToast('Copied ₱' + amtStr + ' to clipboard');
          } catch (clipErr) {
            console.warn('Clipboard write failed:', clipErr);
            cashewStatus.textContent = '₱' + amtStr + ' copied for Cashew';
          }

          // Deep-link launch Cashew app via custom URI scheme
          try {
            window.location.href = 'cashew://';
          } catch (intentErr) {
            console.log('Cashew intent not handled:', intentErr);
          }
        }
      });
    }

    // Bio-Rhythm Header Controls
    const sleepBtn = document.getElementById('sleepBtn');
    const wakeBtn = document.getElementById('wakeBtn');

    async function handleBioClick(action) {
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) {}
      }

      const isSleep = action === 'SLEEP';
      const btn = isSleep ? sleepBtn : wakeBtn;
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50');
      }

      const payload = {
        uuid: Date.now().toString(),
        event_type: 'BIO_EVENT',
        timestamp: new Date().toISOString(),
        data: { action }
      };

      try {
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }

        const res = await fetch('/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + BEARER_TOKEN
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error('HTTP ' + res.status + ': ' + errText);
        }

        const data = await res.json();
        if (isSleep) {
          showToast('🌙 Sleep logged at ' + (data.timestamp || 'now'));
        } else {
          showToast('☀️ Awake! ' + data.duration + 'h sleep (Debt: ' + data.debt + 'h)');
          if (data.briefing) {
            showMorningBriefing(data.briefing, data);
          }
        }
      } catch (err) {
        console.error('Bio event failed:', err);
        showToast('Bio event error: ' + err.message, true);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('opacity-50');
        }
      }
    }

    // Morning Briefing Modal Logic
    const briefingModal = document.getElementById('briefingModal');
    const closeBriefingBtn = document.getElementById('closeBriefingBtn');
    const dismissBriefingBtn = document.getElementById('dismissBriefingBtn');
    const briefingGreeting = document.getElementById('briefingGreeting');
    const briefingSleepStats = document.getElementById('briefingSleepStats');
    const briefingDebtStats = document.getElementById('briefingDebtStats');
    const briefingWeatherTemp = document.getElementById('briefingWeatherTemp');
    const briefingWeatherRain = document.getElementById('briefingWeatherRain');
    const briefingSleepSummary = document.getElementById('briefingSleepSummary');
    const briefingWeatherSummary = document.getElementById('briefingWeatherSummary');
    const briefingUrgentCount = document.getElementById('briefingUrgentCount');
    const briefingUrgentList = document.getElementById('briefingUrgentList');
    const briefingQuizSection = document.getElementById('briefingQuizSection');
    const briefingQuizCount = document.getElementById('briefingQuizCount');
    const briefingQuizContainer = document.getElementById('briefingQuizContainer');
    const briefingGearContainer = document.getElementById('briefingGearContainer');

    function closeBriefing() {
      if (briefingModal) briefingModal.classList.add('hidden');
    }

    if (closeBriefingBtn) closeBriefingBtn.addEventListener('click', closeBriefing);
    if (dismissBriefingBtn) dismissBriefingBtn.addEventListener('click', closeBriefing);

    function showMorningBriefing(briefing, rawData) {
      if (!briefingModal) return;

      briefingGreeting.textContent = briefing.greeting || 'Good morning, Gian!';
      briefingSleepStats.textContent = (rawData.duration || '0.00') + 'h sleep';
      briefingDebtStats.textContent = (rawData.debt || '0.00') + 'h debt';

      const temp = rawData.weather?.temperature ?? 26;
      const rain = rawData.weather?.precipitation_probability ?? 0;
      briefingWeatherTemp.textContent = temp + '°C';
      briefingWeatherRain.textContent = rain + '% rain risk';

      briefingSleepSummary.textContent = '🌙 ' + (briefing.sleep_summary || 'Sleep duration logged.');
      briefingWeatherSummary.textContent = '🌤️ ' + (briefing.weather_summary || 'Weather assessed.');

      // Urgent Deliverables
      const urgent = briefing.urgent_deliverables || [];
      briefingUrgentCount.textContent = urgent.length + (urgent.length === 1 ? ' item' : ' items');
      briefingUrgentList.innerHTML = '';
      if (urgent.length === 0) {
        briefingUrgentList.innerHTML = '<li class="text-zinc-500 italic py-1">No urgent deliverables due within 48–72 hours. Runway is clear!</li>';
      } else {
        urgent.forEach(item => {
          const li = document.createElement('li');
          li.className = 'flex items-start gap-2 text-zinc-200';
          li.innerHTML = '<span class="text-rose-400 mt-0.5">•</span><span class="flex-1">' + item + '</span>';
          briefingUrgentList.appendChild(li);
        });
      }

      // Quiz Radar (Risk >= 40%)
      const allRisks = briefing.quiz_risks || [];
      const highRisks = allRisks.filter(q => (typeof q.probability === 'number' ? q.probability : parseInt(q.probability, 10)) >= 40);
      if (briefingQuizCount) {
        briefingQuizCount.textContent = highRisks.length + (highRisks.length === 1 ? ' alert' : ' alerts');
      }
      if (briefingQuizContainer) {
        briefingQuizContainer.innerHTML = '';
        if (highRisks.length === 0) {
          briefingQuizContainer.innerHTML = '<div class="p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-zinc-500 text-xs italic">All assessed subjects < 40% quiz risk. Clear sailing!</div>';
        } else {
          highRisks.forEach(q => {
            const prob = Math.round(q.probability || 0);
            const pillColor = prob >= 70
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300';
            const card = document.createElement('div');
            card.className = 'p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] space-y-1';
            card.innerHTML = '<div class="flex items-center justify-between gap-2">' +
              '<span class="text-xs font-semibold text-zinc-200 truncate">[' + (q.subject || 'General') + '] <span class="text-zinc-400 font-normal">Prof. ' + (q.teacher || 'Faculty') + '</span></span>' +
              '<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ' + pillColor + '">' + prob + '% Risk</span>' +
              '</div>' +
              '<p class="text-[11px] text-zinc-400 font-sans leading-snug">' + (q.rationale || 'Behavioral alert') + '</p>';
            briefingQuizContainer.appendChild(card);
          });
        }
      }

      // Gear Checklist
      const gear = briefing.gear_checklist || [];
      briefingGearContainer.innerHTML = '';
      gear.forEach((item, idx) => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2.5 p-2 rounded-lg bg-[#09090b] border border-[#27272a] hover:border-zinc-700 cursor-pointer transition-colors text-xs text-zinc-200';
        label.innerHTML = '<input type="checkbox" id="gear_' + idx + '" class="rounded border-zinc-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-zinc-900 cursor-pointer h-4 w-4"><span class="select-none transition-all">' + item + '</span>';

        const checkbox = label.querySelector('input');
        const span = label.querySelector('span');
        checkbox.addEventListener('change', () => {
          triggerHaptic();
          if (checkbox.checked) {
            span.classList.add('line-through', 'opacity-40');
            label.classList.add('opacity-60');
          } else {
            span.classList.remove('line-through', 'opacity-40');
            label.classList.remove('opacity-60');
          }
        });

        briefingGearContainer.appendChild(label);
      });

      briefingModal.classList.remove('hidden');
    }

    if (sleepBtn) sleepBtn.addEventListener('click', () => handleBioClick('SLEEP'));
    if (wakeBtn) wakeBtn.addEventListener('click', () => handleBioClick('WAKE'));

    // Offline Queue
    function getOfflineQueue() {
      try {
        return JSON.parse(localStorage.getItem('offline_queue') || '[]');
      } catch (e) {
        return [];
      }
    }

    function saveOfflineQueue(queue) {
      localStorage.setItem('offline_queue', JSON.stringify(queue));
      updateQueueUI();
    }

    function updateQueueUI() {
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        queueNotice.classList.remove('hidden');
        flushQueueBtn.textContent = 'Sync ' + queue.length + ' offline item' + (queue.length > 1 ? 's' : '') + ' now';
        if (navigator.onLine && !isRecording) {
          statusText.textContent = queue.length + ' PENDING';
          statusDot.className = 'h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse';
        }
      } else {
        queueNotice.classList.add('hidden');
        if (navigator.onLine && !isRecording) {
          statusText.textContent = 'READY';
          statusDot.className = 'h-1.5 w-1.5 rounded-full bg-emerald-400';
        }
      }
    }

    window.addEventListener('online', () => {
      updateNetworkStatus();
      flushQueue();
    });

    window.addEventListener('offline', () => {
      updateNetworkStatus();
    });

    function updateNetworkStatus() {
      if (isRecording) return;
      if (navigator.onLine) {
        statusDot.className = 'h-1.5 w-1.5 rounded-full bg-emerald-400';
        statusText.textContent = 'READY';
      } else {
        statusDot.className = 'h-1.5 w-1.5 rounded-full bg-rose-500';
        statusText.textContent = 'OFFLINE';
      }
      updateQueueUI();
    }

    async function flushQueue() {
      const queue = getOfflineQueue();
      if (queue.length === 0 || !navigator.onLine) return;

      let syncedCount = 0;
      const remaining = [];

      for (const item of queue) {
        try {
          const res = await fetch('/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + BEARER_TOKEN
            },
            body: JSON.stringify(item)
          });
          if (res.ok) {
            syncedCount++;
          } else {
            remaining.push(item);
          }
        } catch (err) {
          remaining.push(item);
        }
      }

      saveOfflineQueue(remaining);
      if (syncedCount > 0) {
        showToast('Synced ' + syncedCount + ' queued item' + (syncedCount > 1 ? 's' : '') + ' to Cloud');
      }
    }

    if (flushQueueBtn) {
      flushQueueBtn.addEventListener('click', () => {
        triggerHaptic();
        flushQueue();
      });
    }

    // Submit Dispatch
    async function handleSubmit() {
      const text = textInput.value.trim();
      if (!text && !stagedAttachment) {
        showToast('Type a note, speak, or attach a file', true);
        textInput.focus();
        return;
      }

      if (isRecording && recognition) {
        recognition.stop();
        stopRecording();
      }

      triggerHaptic();
      submitBtn.disabled = true;
      btnText.textContent = 'Routing...';
      const originalSvg = btnIcon.innerHTML;
      btnIcon.classList.add('animate-spin');
      btnIcon.innerHTML = '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>';

      const payload = {
        uuid: Date.now().toString(),
        event_type: "OMNI_CAPTURE",
        timestamp: new Date().toISOString(),
        data: {
          raw_input: text,
          attachment: stagedAttachment ? stagedAttachment.data : null
        }
      };

      try {
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }

        const res = await fetch('/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + BEARER_TOKEN
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }

        const resData = await res.json();

        // Dynamic feedback toasts based on triage classification
        const t = resData?.triage || resData;
        if (t && t.is_expense && t.expense && t.is_stakeholder && t.stakeholder) {
          showToast('Logged: ₱' + t.expense.amount + ' Expense & ' + t.stakeholder.name);
        } else if (t && t.is_expense && t.expense) {
          showToast('Queued Expense: ₱' + t.expense.amount + ' (' + t.expense.description + ')');
        } else if (t && t.is_stakeholder && t.stakeholder) {
          showToast('Logged Stakeholder: ' + t.stakeholder.name);
        } else {
          showToast('Captured to Life OS Buffer');
        }

        textInput.value = '';
        stagedAttachment = null;
        fileInput.value = '';
        attachmentPreview.classList.add('hidden');
        autoResizeTextarea();
      } catch (err) {
        const queue = getOfflineQueue();
        queue.push(payload);
        saveOfflineQueue(queue);
        showToast('Cached Offline (Will sync when connected)', false, true);
        textInput.value = '';
        stagedAttachment = null;
        fileInput.value = '';
        attachmentPreview.classList.add('hidden');
        autoResizeTextarea();
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Capture';
        btnIcon.classList.remove('animate-spin');
        btnIcon.innerHTML = originalSvg;
        updateQueueUI();
      }
    }

    submitBtn.addEventListener('click', handleSubmit);

    // Keyboard shortcut: Cmd + Enter / Ctrl + Enter
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });

    updateNetworkStatus();
    updateQueueUI();
  </script>
</body>
</html>`;

let inMemoryGoogleToken = null;
let inMemoryGoogleTokenExpiry = 0;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(request.method === 'HEAD' ? null : CAPTURE_PWA_HTML, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
      return new Response('Not Found', { status: 404 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const rawBody = await request.text();
    const isAuthorized = await verifyRequestAuth(request, rawBody, env.INGESTION_SECRET);
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: 'Malformed JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/capture') {
        if (!payload.event_type) payload.event_type = 'OMNI_CAPTURE';
        if (!payload.uuid) payload.uuid = Date.now().toString();
        if (!payload.timestamp) payload.timestamp = new Date().toISOString();
        if (!payload.data) {
          payload.data = {
            raw_input: payload.raw_input || '',
            attachment: payload.attachment || null
          };
        }
      }

      const { uuid, event_type, timestamp, data } = payload;

      if (!uuid || !event_type || !timestamp || typeof data !== 'object' || data === null) {
        return new Response(JSON.stringify({ error: 'Malformed Payload Schema' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const existing = await env.IDEMPOTENCY_KV.get(uuid);
      if (existing === 'IN_FLIGHT' || existing === 'COMPLETED') {
        return new Response(JSON.stringify({ status: 'DUPLICATE_IGNORED', uuid }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await env.IDEMPOTENCY_KV.put(uuid, 'IN_FLIGHT', { expirationTtl: 86400 });

      if (event_type === 'OMNI_CAPTURE') {
        try {
          const triageResult = await handleOmniCapture(uuid, data, env, ctx);
          await env.IDEMPOTENCY_KV.put(uuid, 'COMPLETED', { expirationTtl: 86400 });
          return new Response(JSON.stringify(triageResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          console.error(`OMNI_CAPTURE pipeline failed for ${uuid}:`, err);
          await env.IDEMPOTENCY_KV.put(uuid, 'FAILED', { expirationTtl: 60 });
          await env.IDEMPOTENCY_KV.put(
            `DLQ_${uuid}`,
            JSON.stringify({
              error: err.message,
              event_type,
              timestamp,
              failed_at: new Date().toISOString()
            }),
            { expirationTtl: 604800 }
          );
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      if (event_type === 'BIO_EVENT') {
        const bioResult = await handleEvent(uuid, event_type, timestamp, data, env);
        return new Response(JSON.stringify(bioResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      ctx.waitUntil(handleEvent(uuid, event_type, timestamp, data, env));

      return new Response(JSON.stringify({ status: 'ACKNOWLEDGED', uuid }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid request', detail: err.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Verifies request authentication using Web Crypto.
 * Supports:
 * 1. HMAC-SHA256 signature verification via X-Signature-256 / X-Hub-Signature-256 / X-Signature
 * 2. Bearer token matching with timing-safe comparison
 */
async function verifyRequestAuth(request, rawBody, secret) {
  if (!secret) return false;

  // 1. Check for HMAC signature header
  const signatureHeader = request.headers.get('X-Signature-256') ||
                          request.headers.get('X-Hub-Signature-256') ||
                          request.headers.get('X-Signature');
  if (signatureHeader && rawBody) {
    const isValidHmac = await verifyHmacSignature(rawBody, signatureHeader, secret);
    if (isValidHmac) return true;
  }

  // 2. Check Authorization: Bearer <INGESTION_SECRET> with timing-safe comparison
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const isTokenValid = await timingSafeEqual(token, secret);
    if (isTokenValid) return true;
  }

  return false;
}

/**
 * Web Crypto native HMAC-SHA256 verification.
 */
async function verifyHmacSignature(payload, signatureStr, secret) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const cleanSig = signatureStr.replace(/^sha256=/i, '').trim();
    let sigBytes;

    if (/^[0-9a-fA-F]+$/.test(cleanSig) && cleanSig.length % 2 === 0) {
      const match = cleanSig.match(/.{1,2}/g);
      sigBytes = new Uint8Array(match ? match.map(byte => parseInt(byte, 16)) : []);
    } else {
      const binary = atob(cleanSig);
      sigBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    }

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payload)
    );
  } catch {
    return false;
  }
}

/**
 * Timing-safe string comparison using Web Crypto HMAC digests.
 */
async function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);

  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, aBytes),
    crypto.subtle.sign('HMAC', key, bBytes)
  ]);

  const viewA = new Uint8Array(digestA);
  const viewB = new Uint8Array(digestB);

  let mismatch = 0;
  for (let i = 0; i < viewA.length; i++) {
    mismatch |= viewA[i] ^ viewB[i];
  }
  return mismatch === 0;
}

async function handleEvent(uuid, eventType, timestamp, data, env, ctx) {
  try {
    const result = await routeEvent(eventType, uuid, data, env, ctx);
    await env.IDEMPOTENCY_KV.put(uuid, 'COMPLETED', { expirationTtl: 86400 });
    return result;
  } catch (err) {
    console.error(`Error handling event ${uuid} (${eventType}):`, err);
    // Unlock quickly (60s) rather than leaving the key IN_FLIGHT for 24h,
    // so a manual or automated DLQ replay with the same UUID is not blocked.
    await env.IDEMPOTENCY_KV.put(uuid, 'FAILED', { expirationTtl: 60 });
    await env.IDEMPOTENCY_KV.put(
      `DLQ_${uuid}`,
      JSON.stringify({
        error: err.message,
        event_type: eventType,
        timestamp,
        failed_at: new Date().toISOString()
      }),
      { expirationTtl: 604800 }
    );
    throw err;
  }
}

async function routeEvent(eventType, uuid, data, env, ctx) {
  if (eventType === 'EXPENSE_OR_AMBAGAN') {
    await appendAmbaganRow(data, env);
    return null;
  } else if (eventType === 'STAKEHOLDER_UPDATE') {
    await appendStakeholderRow(data, env);
    return null;
  } else if (eventType === 'OMNI_CAPTURE') {
    return await handleOmniCapture(uuid, data, env, ctx);
  } else if (eventType === 'BIO_EVENT') {
    return await handleBioEvent(uuid, data, env);
  } else {
    throw new Error(`Unsupported event type: ${eventType}`);
  }
}

function getManilaDate(inputDate) {
  if (inputDate && typeof inputDate === 'string' && !inputDate.includes('{') && !inputDate.includes('(') && /^\d{4}-\d{2}-\d{2}$/.test(inputDate.trim())) {
    return inputDate.trim();
  }
  const now = new Date();
  const manilaTime = new Date(now.getTime() + 8 * 3600 * 1000);
  return manilaTime.toISOString().slice(0, 10);
}

function getManilaTimestamp(dateObj) {
  const now = dateObj ? new Date(dateObj) : new Date();
  const manilaTime = new Date(now.getTime() + 8 * 3600 * 1000);
  return manilaTime.toISOString().replace('T', ' ').slice(0, 19);
}

function getManilaDayOfWeek(dateObj) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = dateObj ? new Date(dateObj) : new Date();
  const manilaTime = new Date(now.getTime() + 8 * 3600 * 1000);
  return days[manilaTime.getUTCDay()];
}

async function appendAmbaganRow(data, env) {
  const masterSpreadsheetId = env.SPREADSHEET_ID || '1QfPPf0ikte0wFVmjzXIfpLCwMjjDts0iFQkuHCUPG-M';
  const values = [[
    data.id || ('amb_' + Date.now().toString(36)),
    getManilaDate(data.date),
    data.description || 'Untitled Expense',
    data.amount || 0,
    getManilaDate(data.due_date),
    data.category || 'Ambagan',
    'Queued'
  ]];
  await appendToSheet(masterSpreadsheetId, 'Ambagan_Queue!A:G', values, env);
}

async function appendStakeholderRow(data, env) {
  const masterSpreadsheetId = env.SPREADSHEET_ID || '1QfPPf0ikte0wFVmjzXIfpLCwMjjDts0iFQkuHCUPG-M';
  // data = { name, text_lines, date } — raw notification payload from MacroDroid.
  // The actual extraction happens here, server-side, via Gemini Flash.
  const extracted = await classifyStakeholderSignal(data.name, data.text_lines, env);

  const values = [[
    data.name,
    extracted.role_context,
    extracted.status_dependency || extracted.work_style_preference || '',
    extracted.interaction_summary || extracted.active_dependencies || '',
    'Active',
    getManilaDate(data.date)
  ]];
  await appendToSheet(masterSpreadsheetId, 'Stakeholder_Graph!A:F', values, env);
}

async function handleBioEvent(uuid, data, env) {
  const masterSpreadsheetId = env.SPREADSHEET_ID || '1QfPPf0ikte0wFVmjzXIfpLCwMjjDts0iFQkuHCUPG-M';
  const action = (data?.action || '').trim().toUpperCase();
  const timestamp = getManilaTimestamp();

  if (action === 'SLEEP') {
    const row = [timestamp, 'SLEEP', '', '', 'Nightly Rest'];
    await appendToSheet(masterSpreadsheetId, 'Bio_Rhythms!A:E', [row], env);
    return {
      status: 'LOGGED',
      action: 'SLEEP',
      timestamp: timestamp
    };
  } else if (action === 'WAKE') {
    let rows = [];
    try {
      rows = await readSheetRows(masterSpreadsheetId, 'Bio_Rhythms!A:E', env);
    } catch (readErr) {
      console.warn(`Could not read Bio_Rhythms rows: ${readErr.message}`);
      rows = [];
    }

    let latestSleepRow = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r && r[1] && String(r[1]).trim().toUpperCase() === 'SLEEP') {
        latestSleepRow = r;
        break;
      }
    }

    const wakeDate = new Date();
    let duration = 0;

    if (latestSleepRow && latestSleepRow[0]) {
      const rawSleepTime = String(latestSleepRow[0]).trim();
      const isoSleepStr = rawSleepTime.replace(' ', 'T');
      const sleepDate = new Date(
        isoSleepStr.includes('+') || isoSleepStr.includes('Z')
          ? isoSleepStr
          : isoSleepStr + '+08:00'
      );
      if (!isNaN(sleepDate.getTime())) {
        duration = Math.max(0, (wakeDate.getTime() - sleepDate.getTime()) / (1000 * 60 * 60));
      }
    }

    const debt = Math.max(0, 8.0 - duration);

    const row = [
      timestamp,
      'WAKE',
      duration.toFixed(2),
      debt.toFixed(2),
      'Morning Wake'
    ];

    await appendToSheet(masterSpreadsheetId, 'Bio_Rhythms!A:E', [row], env);

    // Parallel external calls: Weather, Active Deliverables, Teacher Profiles
    const [weather, deliverables, teacherProfiles] = await Promise.all([
      getLigaoWeather(),
      getActiveDeliverables(masterSpreadsheetId, env),
      getTeacherProfiles(masterSpreadsheetId, env)
    ]);

    // Teacher Quiz Radar Risk Computation
    const quizRisks = calculateTeacherQuizRisks(teacherProfiles);

    // Morning Launch Pad Briefing synthesis
    const briefing = await generateMorningBriefing(
      { duration: duration.toFixed(2), debt: debt.toFixed(2) },
      weather,
      deliverables,
      quizRisks,
      env
    );

    return {
      status: 'LOGGED',
      action: 'WAKE',
      duration: duration.toFixed(2),
      debt: debt.toFixed(2),
      weather: weather,
      briefing: briefing
    };
  } else {
    throw new Error(`Invalid bio action: ${data?.action}. Expected SLEEP or WAKE.`);
  }
}

async function getLigaoWeather() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=13.2413&longitude=123.5413&current=temperature_2m,precipitation_probability,weather_code&timezone=Asia%2FManila';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data?.current || {};
    return {
      temperature: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : 26,
      precipitation_probability: typeof cur.precipitation_probability === 'number' ? cur.precipitation_probability : 0,
      weather_code: cur.weather_code ?? 0
    };
  } catch (err) {
    console.warn('Weather fetch failed:', err.message);
    return {
      temperature: 26,
      precipitation_probability: 0,
      weather_code: 0,
      error: err.message
    };
  }
}

async function getActiveDeliverables(spreadsheetId, env) {
  try {
    const rows = await readSheetRows(spreadsheetId, 'Deliverables_Radar!A:F', env);
    if (!rows || rows.length === 0) return [];

    const now = new Date();
    const manilaTime = new Date(now.getTime() + 8 * 3600 * 1000);
    const active = [];

    for (const r of rows) {
      if (!r || r.length < 5) continue;
      const status = (r[5] || '').toString().trim().toLowerCase();
      if (status === 'active' || !status) {
        const dueDate = (r[4] || '').toString().trim();
        const subject = (r[1] || '').toString().trim();
        const title = (r[2] || '').toString().trim();
        const prereqs = (r[3] || '').toString().trim();

        let hoursUntilDue = null;
        let isUrgent = false;
        if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          const dueEpoch = new Date(dueDate + 'T23:59:59+08:00').getTime();
          const diffHours = (dueEpoch - manilaTime.getTime()) / (1000 * 3600);
          hoursUntilDue = Math.round(diffHours);
          if (diffHours <= 72) {
            isUrgent = true;
          }
        }

        active.push({
          taskId: r[0] || '',
          subject,
          title,
          prerequisites: prereqs,
          due_date: dueDate,
          is_urgent: isUrgent,
          hours_until_due: hoursUntilDue
        });
      }
    }
    return active;
  } catch (err) {
    console.warn('Could not read Deliverables_Radar:', err.message);
    return [];
  }
}

async function getTeacherProfiles(spreadsheetId, env) {
  try {
    const rows = await readSheetRows(spreadsheetId, 'Teacher_Profiles!A:G', env);
    if (!rows || rows.length === 0) return [];

    const map = new Map();
    for (const r of rows) {
      if (!r || r.length === 0) continue;
      const teacher = (r[0] || '').toString().trim();
      const subject = (r[1] || '').toString().trim();
      if (!teacher || teacher.toLowerCase() === 'teacher_name' || teacher.toLowerCase() === 'name') continue;
      const observation = (r[2] || '').toString().trim();
      const status = (r[3] || '').toString().trim();
      const lastAssessmentDate = (r[4] || '').toString().trim();
      const baseRiskLevel = (r[5] || 'Low').toString().trim();

      const key = `${teacher.toLowerCase()}__${subject.toLowerCase()}`;
      map.set(key, {
        teacher,
        subject,
        observation,
        status,
        last_assessment_date: lastAssessmentDate,
        base_risk: baseRiskLevel
      });
    }
    return Array.from(map.values());
  } catch (err) {
    console.warn('Could not read Teacher_Profiles:', err.message);
    return [];
  }
}

function calculateTeacherQuizRisks(teacherProfiles) {
  if (!Array.isArray(teacherProfiles) || teacherProfiles.length === 0) {
    return [];
  }

  const manilaTodayStr = getManilaDate();
  const todayDate = new Date(manilaTodayStr + 'T00:00:00+08:00');
  const risks = [];

  for (const tp of teacherProfiles) {
    let baseRisk = 20; // Low = 20%
    const normRisk = (tp.base_risk || 'Low').toLowerCase();
    if (normRisk === 'critical' || normRisk === 'high') {
      baseRisk = 75;
    } else if (normRisk === 'medium' || normRisk === 'med') {
      baseRisk = 50;
    } else {
      baseRisk = 20;
    }

    let elapsedDays = 0;
    if (tp.last_assessment_date && /^\d{4}-\d{2}-\d{2}$/.test(tp.last_assessment_date)) {
      const assessDate = new Date(tp.last_assessment_date + 'T00:00:00+08:00');
      if (!isNaN(assessDate.getTime())) {
        const diffMs = todayDate.getTime() - assessDate.getTime();
        elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    let rawProbability = baseRisk + (elapsedDays * 10);

    // Qualitative habit notes adjustment
    const obs = (tp.observation || '').toLowerCase();
    let habitBonus = 0;
    if (/pop\s*quiz|unannounced|surprise|strict|frequent|daily|random/i.test(obs)) {
      habitBonus += 10;
    }
    if (/announced only|no quiz|lenient|rarely|gives advance/i.test(obs)) {
      habitBonus -= 15;
    }

    const finalProbability = Math.min(95, Math.max(5, rawProbability + habitBonus));

    let rationale = `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} since last assessment (Base: ${tp.base_risk || 'Low'}).`;
    if (tp.observation) {
      rationale += ` Habit Note: "${tp.observation}".`;
    }

    risks.push({
      subject: tp.subject,
      teacher: tp.teacher,
      probability: Math.round(finalProbability),
      rationale: rationale
    });
  }

  // Sort descending by probability
  risks.sort((a, b) => b.probability - a.probability);
  return risks;
}

async function generateMorningBriefing(sleepStats, weather, deliverables, quizRisks, env) {
  const currentDay = getManilaDayOfWeek();
  const currentDate = getManilaDate();

  const prompt = `You are the Morning Launch Pad AI for Gian's Life OS in Ligao, Albay, Philippines.
Reference Date: ${currentDay}, ${currentDate} (Asia/Manila).

Sleep Stats:
- Duration: ${sleepStats.duration} hours
- Sleep Debt: ${sleepStats.debt} hours (against 8.0h baseline)

Weather Status in Ligao:
- Temperature: ${weather.temperature}°C
- Rain Probability: ${weather.precipitation_probability}%

Pending Active Deliverables:
${deliverables && deliverables.length > 0
  ? deliverables.map(d => `- [${d.subject}] ${d.title} (Due: ${d.due_date}${d.is_urgent ? ' - URGENT' : ''})`).join('\n')
  : 'None currently scheduled.'}

Teacher Quiz Radar & Risk Assessment:
${quizRisks && quizRisks.length > 0
  ? quizRisks.map(q => `- [${q.subject}] Teacher: ${q.teacher} | Risk: ${q.probability}% | Notes: ${q.rationale}`).join('\n')
  : 'No teacher profiles logged yet.'}

Synthesize an actionable morning briefing in this EXACT JSON structure:
{
  "greeting": string,
  "sleep_summary": string,
  "weather_summary": string,
  "urgent_deliverables": [string],
  "quiz_risks": [
    { "subject": string, "teacher": string, "probability": number, "rationale": string }
  ],
  "gear_checklist": [string]
}

Guidelines:
- In "quiz_risks", refine or mirror the teacher assessments provided above.
- In "urgent_deliverables", include items due within the next 48–72 hours with format "[Subject] Title (Due Date)".
- In "gear_checklist":
  * If rain probability > 30%, include an umbrella.
  * If any deliverable or high quiz risk involves math, physics, engineering, or calculations, include "Casio fx-991ES Plus Scientific Calculator".
  * Always include standard daily essentials: "Laptop & Charger", "Student ID", "Transit Float / Barya".

Respond with STRICT JSON ONLY. No markdown, no commentary.`;

  const models = [
    '@cf/meta/llama-3.1-8b-instruct-fast',
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3.3-70b-instruct'
  ];

  for (const model of models) {
    try {
      const aiRes = await env.AI.run(model, {
        messages: [
          { role: 'system', content: 'You are an intelligent executive morning assistant. Output strict JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 600
      });

      let parsed = null;
      if (aiRes && typeof aiRes.response === 'object' && aiRes.response !== null) {
        parsed = aiRes.response;
      } else {
        let rawText = '';
        if (typeof aiRes === 'string') {
          rawText = aiRes;
        } else if (aiRes?.choices?.[0]?.message?.content) {
          rawText = aiRes.choices[0].message.content;
        } else if (typeof aiRes?.response === 'string') {
          rawText = aiRes.response;
        } else if (typeof aiRes?.text === 'string') {
          rawText = aiRes.text;
        }

        if (!rawText) throw new Error(`Empty response from Workers AI (${model})`);

        let cleanJson = rawText.trim();
        const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match) cleanJson = match[1].trim();
        else {
          const firstBrace = cleanJson.indexOf('{');
          const lastBrace = cleanJson.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
          }
        }
        parsed = JSON.parse(cleanJson);
      }
      return {
        greeting: String(parsed.greeting || `Good morning, Gian! Ready for ${currentDay}.`),
        sleep_summary: String(parsed.sleep_summary || `${sleepStats.duration}h sleep recorded; debt: ${sleepStats.debt}h`),
        weather_summary: String(parsed.weather_summary || `${weather.temperature}°C in Ligao with ${weather.precipitation_probability}% rain probability`),
        urgent_deliverables: Array.isArray(parsed.urgent_deliverables) ? parsed.urgent_deliverables : [],
        quiz_risks: Array.isArray(parsed.quiz_risks) && parsed.quiz_risks.length > 0 ? parsed.quiz_risks : quizRisks,
        gear_checklist: Array.isArray(parsed.gear_checklist) ? parsed.gear_checklist : ['Laptop & Charger', 'Student ID', 'Transit Float / Barya']
      };
    } catch (e) {
      console.warn(`Briefing synthesis failed on ${model}:`, e.message);
    }
  }

  // Resilient fallback
  const urgentList = deliverables.filter(d => d.is_urgent).map(d => `[${d.subject}] ${d.title} (Due ${d.due_date})`);
  const gear = ['Student ID', 'Transit Float / Barya', 'Laptop & Charger'];
  if (weather.precipitation_probability > 30) gear.unshift(`Umbrella (Rain risk: ${weather.precipitation_probability}%)`);
  const hasMathPhysics = deliverables.some(d => /math|phys|calculus|algebra|stat/i.test(d.subject + ' ' + d.title));
  if (hasMathPhysics) gear.push('Casio fx-991ES Plus Scientific Calculator');

  return {
    greeting: `Good morning, Gian! Ready for ${currentDay}.`,
    sleep_summary: `${sleepStats.duration}h rest logged (Sleep debt: ${sleepStats.debt}h).`,
    weather_summary: `${weather.temperature}°C in Ligao with ${weather.precipitation_probability}% rain probability.`,
    urgent_deliverables: urgentList,
    quiz_risks: quizRisks,
    gear_checklist: gear
  };
}

async function handleOmniCapture(uuid, data, env, ctx) {
  const rawInput = data?.raw_input || '';
  let triageResult = {
    is_expense: false,
    expense: null,
    is_stakeholder: false,
    stakeholder: null
  };

  if (rawInput && rawInput.trim()) {
    triageResult = await triageOmniInput(rawInput.trim(), env);
  }

  const masterSpreadsheetId = env.SPREADSHEET_ID || '1QfPPf0ikte0wFVmjzXIfpLCwMjjDts0iFQkuHCUPG-M';
  const writePromises = [];
  const date = getManilaDate();

  // If is_expense is true, append a row to Ambagan_Queue:
  // [uuid, date, expense.description, expense.amount, expense.due_date, expense.category, "Queued"]
  if (triageResult.is_expense && triageResult.expense) {
    const row = [
      uuid,
      date,
      triageResult.expense.description,
      triageResult.expense.amount,
      triageResult.expense.due_date,
      triageResult.expense.category,
      'Queued'
    ];
    writePromises.push(
      appendToSheet(masterSpreadsheetId, 'Ambagan_Queue!A:G', [row], env, 'INSERT_ROWS')
    );
  }

  // If is_stakeholder is true, append a row to Stakeholder_Graph:
  // [stakeholder.name, stakeholder.role_context, stakeholder.status_dependency, stakeholder.interaction_summary, "Active", date]
  if (triageResult.is_stakeholder && triageResult.stakeholder) {
    const row = [
      triageResult.stakeholder.name,
      triageResult.stakeholder.role_context,
      triageResult.stakeholder.status_dependency,
      triageResult.stakeholder.interaction_summary,
      'Active',
      date
    ];
    writePromises.push(
      appendToSheet(masterSpreadsheetId, 'Stakeholder_Graph!A:F', [row], env, 'INSERT_ROWS')
    );
  }

  // Persist freeform omni-capture to KV buffer with 30-day retention
  const key = `OMNI_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  writePromises.push(
    env.IDEMPOTENCY_KV.put(key, JSON.stringify({
      uuid,
      ...data,
      triage: triageResult,
      captured_at: new Date().toISOString()
    }), { expirationTtl: 2592000 }).catch(err => console.error('Failed to persist OMNI capture to KV:', err.message))
  );

  // Await all sheet writes and persistence so errors bubble up
  await Promise.all(writePromises);

  return triageResult;
}

async function triageOmniInput(rawInput, env) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const currentDate = getManilaDate();
  const currentDay = getManilaDayOfWeek();

  const prompt = 'You are the triage engine for Gian\'s Life OS.\n' +
    `Reference Date: ${currentDay}, ${currentDate} (Asia/Manila, UTC+8).\n\n` +
    'Extract structured information from the raw user input into this exact JSON format:\n' +
    '{\n' +
    '  "is_expense": boolean,\n' +
    '  "expense": {\n' +
    '    "description": string,\n' +
    '    "amount": number,\n' +
    '    "category": string,\n' +
    '    "due_date": string\n' +
    '  } | null,\n' +
    '  "is_stakeholder": boolean,\n' +
    '  "stakeholder": {\n' +
    '    "name": string,\n' +
    '    "role_context": string,\n' +
    '    "status_dependency": string,\n' +
    '    "interaction_summary": string\n' +
    '  } | null\n' +
    '}\n\n' +
    'Rules:\n' +
    '1. "is_expense": Set to true if the input describes an expense, contribution (ambagan), personal purchase, or money owed. ' +
    'Extract "description", numeric "amount", "category" (e.g., Food, Commute, Ambagan, Project, Supplies, Academics, General), and "due_date" (YYYY-MM-DD, infer relative to Reference Date ' + currentDate + ', or default to ' + currentDate + '). If no expense is mentioned, set "is_expense" to false and "expense" to null.\n' +
    '2. "is_stakeholder": Set to true if the input describes an interaction, collaboration, deliverable dependency, or update involving a specific person (classmate, colleague, professor, partner, etc.). ' +
    'Extract "name", "role_context" (their role or context), "status_dependency" (what is needed, blocked, or pending), and "interaction_summary" (summary of what occurred or was discussed). If no stakeholder is mentioned, set "is_stakeholder" to false and "stakeholder" to null.\n' +
    '3. Both "is_expense" and "is_stakeholder" can be true simultaneously if the input mentions both.\n' +
    '4. "due_date" MUST be formatted as YYYY-MM-DD.\n' +
    '5. Respond ONLY with a valid JSON object matching the schema. No markdown formatting, no commentary.\n\n' +
    'Raw User Input:\n"""\n' + rawInput + '\n"""';

  const modelCascade = [
    env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  const models = [...new Set(modelCascade)];

  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 800));
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`Model ${model} capacity spike (${res.status})`);
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Gemini API error (${model}): ${res.status} - ${errBody}`);
        }

        const result = await res.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error(`Empty response from ${model}`);

        let cleanJson = rawText.trim();
        const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match) {
          cleanJson = match[1].trim();
        } else {
          const firstBrace = cleanJson.indexOf('{');
          const lastBrace = cleanJson.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanJson = cleanJson.slice(firstBrace, lastBrace + 1).trim();
          }
        }

        const parsed = JSON.parse(cleanJson);
        const isExpense = Boolean(parsed.is_expense && parsed.expense);
        const isStakeholder = Boolean(parsed.is_stakeholder && parsed.stakeholder);

        return {
          is_expense: isExpense,
          expense: isExpense ? {
            description: String(parsed.expense.description || 'Untitled Expense').trim(),
            amount: typeof parsed.expense.amount === 'number' 
              ? parsed.expense.amount 
              : (parseFloat(parsed.expense.amount) || 0),
            category: String(parsed.expense.category || 'General').trim(),
            due_date: getManilaDate(parsed.expense.due_date)
          } : null,
          is_stakeholder: isStakeholder,
          stakeholder: isStakeholder ? {
            name: String(parsed.stakeholder.name || 'Unknown').trim(),
            role_context: String(parsed.stakeholder.role_context || '').trim(),
            status_dependency: String(parsed.stakeholder.status_dependency || '').trim(),
            interaction_summary: String(parsed.stakeholder.interaction_summary || '').trim()
          } : null
        };
      } catch (err) {
        lastError = err;
        if (err.message && err.message.includes('API_KEY_INVALID')) throw err;
      }
    }
  }

  throw new Error(`Gemini Flash triage failed across all models: ${lastError?.message || 'Unknown error'}`);
}

async function classifyStakeholderSignal(name, textLines, env) {
  const messageText = Array.isArray(textLines) ? textLines.join('\n') : String(textLines || '');
  const modelCascade = [
    env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash'
  ];
  const models = [...new Set(modelCascade)];

  const prompt = 'You are a triage classifier for a personal project-collaboration log. ' +
    'Given a short chat excerpt involving "' + name + '", extract structured collaboration signals. ' +
    'Respond ONLY with raw JSON, no markdown, no commentary, matching exactly this schema: ' +
    '{"role_context": string, "work_style_preference": string, "reliability_vector": string, ' +
    '"conflict_deescalation": string, "active_dependencies": string}. ' +
    'If a field cannot be determined from the text, use an empty string for that field.\n\n' +
    'Message excerpt:\n"""\n' + messageText + '\n"""';

  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 800));
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`Model ${model} capacity spike (${res.status})`);
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Gemini API error (${model}): ${res.status} - ${errBody}`);
        }

        const result = await res.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error(`Empty response from ${model}`);

        const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          role_context: parsed.role_context || '',
          work_style_preference: parsed.work_style_preference || '',
          reliability_vector: parsed.reliability_vector || '',
          conflict_deescalation: parsed.conflict_deescalation || '',
          active_dependencies: parsed.active_dependencies || ''
        };
      } catch (err) {
        lastError = err;
        if (err.message && err.message.includes('API_KEY_INVALID')) throw err;
      }
    }
  }

  // Fallback values so payload write never drops if entire cascade is throttling
  return {
    role_context: 'Pending Analysis (Capacity Throttle)',
    work_style_preference: '',
    reliability_vector: '',
    conflict_deescalation: '',
    active_dependencies: messageText.slice(0, 150)
  };
}

async function appendToSheet(spreadsheetId, range, values, env, insertDataOption = 'INSERT_ROWS') {
  const token = await getGoogleAuthToken(env);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=${insertDataOption}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (errorText.includes('Unable to parse range:') && range.includes('!')) {
      const tabName = range.split('!')[0];
      console.warn(`Tab [${tabName}] missing in [${spreadsheetId}], auto-creating sheet tab...`);
      await ensureSheetTab(spreadsheetId, tabName, env);
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });
      if (retryRes.ok) return;
    }
    throw new Error(`Google Sheets API error for ID [${spreadsheetId}]: ${res.status} - ${errorText}`);
  }
}

async function readSheetRows(spreadsheetId, range, env) {
  const token = await getGoogleAuthToken(env);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (errorText.includes('Unable to parse range:') && range.includes('!')) {
      const tabName = range.split('!')[0];
      console.warn(`Tab [${tabName}] missing in [${spreadsheetId}] on read, auto-creating sheet tab...`);
      await ensureSheetTab(spreadsheetId, tabName, env);
      return [];
    }
    throw new Error(`Google Sheets API read error for ID [${spreadsheetId}]: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.values || [];
}

async function ensureSheetTab(spreadsheetId, sheetTitle, env) {
  try {
    const token = await getGoogleAuthToken(env);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: sheetTitle }
            }
          }
        ]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Could not add sheet tab [${sheetTitle}]: ${errText}`);
    }
  } catch (err) {
    console.warn(`Error auto-creating sheet tab [${sheetTitle}]:`, err.message);
  }
}

async function getGoogleAuthToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (inMemoryGoogleToken && inMemoryGoogleTokenExpiry > now + 60) {
    return inMemoryGoogleToken;
  }

  // Fallback: check KV cache so warm isolates or KV cache hit avoids re-signing
  const cached = await env.IDEMPOTENCY_KV.get('GOOGLE_ACCESS_TOKEN_CACHE');
  if (cached) {
    inMemoryGoogleToken = cached;
    inMemoryGoogleTokenExpiry = now + 2400;
    return cached;
  }

  if (!env.GOOGLE_PRIVATE_KEY || env.GOOGLE_PRIVATE_KEY.length < 500) {
    throw new Error(`GOOGLE_PRIVATE_KEY is missing or truncated (length: ${env.GOOGLE_PRIVATE_KEY ? env.GOOGLE_PRIVATE_KEY.length : 0})`);
  }

  const pemContents = env.GOOGLE_PRIVATE_KEY
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\\\\n/g, '')
    .replace(/[\r\n\s"]/g, '');

  let binaryDer;
  try {
    binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  } catch (b64Err) {
    throw new Error(`Base64 decode error on GOOGLE_PRIVATE_KEY: ${b64Err.message}`);
  }

  let privateKey;
  try {
    privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch (pkcs8Err) {
    // If key was provided in PKCS#1 format, wrap it into standard PKCS#8 DER
    try {
      const pkcs8Der = convertPkcs1ToPkcs8(binaryDer);
      privateKey = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8Der.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } catch {
      throw new Error(`Invalid PKCS8 input (raw length: ${env.GOOGLE_PRIVATE_KEY.length}, b64 length: ${pemContents.length}): ${pkcs8Err.message}`);
    }
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const jwt = `${signatureInput}.${base64url(new Uint8Array(signature))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`OAuth error: ${JSON.stringify(tokenData)}`);
  }

  // Cache in module-level variable and KV slightly under the real 3600s expiry so a stale token is never used.
  inMemoryGoogleToken = tokenData.access_token;
  inMemoryGoogleTokenExpiry = now + (tokenData.expires_in || 3600);
  await env.IDEMPOTENCY_KV.put('GOOGLE_ACCESS_TOKEN_CACHE', tokenData.access_token, { expirationTtl: 3000 });

  return tokenData.access_token;
}

function base64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Wraps PKCS#1 RSA private key DER bytes into PKCS#8 DER structure
 */
function convertPkcs1ToPkcs8(pkcs1Bytes) {
  function encodeDerLength(len) {
    if (len < 128) return [len];
    const bytes = [];
    let temp = len;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    return [0x80 | bytes.length, ...bytes];
  }

  const version = [0x02, 0x01, 0x00];
  const algoId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0x77, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...encodeDerLength(pkcs1Bytes.length), ...pkcs1Bytes];
  const body = [...version, ...algoId, ...octet];
  return new Uint8Array([0x30, ...encodeDerLength(body.length), ...body]);
}
