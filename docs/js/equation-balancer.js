/**
 * equation-balancer.js
 * Atomic Smash — Equation Balancer game logic
 *
 * Module pattern mirrors the rest of the project (main.js / game.js style).
 * No external dependencies — runs as type="module" from equation-balancer.html.
 */

// ══════════════════════════════════════════════════════════════════════
// EQUATION DATA
// parts array:
//   null   → coefficient blank (player fills in)
//   string → static display text (formula or operator)
// a      → array of correct answers for each blank (left to right)
// x      → explanation shown after answering / on hint
// locked → true for already-balanced "read-only" rounds (no blanks)
// ══════════════════════════════════════════════════════════════════════
const EQS = [
    {
        t: 'Water synthesis',
        p: [null, 'H₂', ' + ', null, 'O₂', ' → ', null, 'H₂O'],
        a: [2, 1, 2],
        x: '2H₂ + O₂ → 2H₂O.  O₂ gives 2 O atoms, so 2 H₂O are needed, which then requires 2 H₂.  H: 4 = 4 ✓  O: 2 = 2 ✓',
    },
    {
        t: 'Methane combustion',
        p: ['CH₄', ' + ', null, 'O₂', ' → ', null, 'CO₂', ' + ', null, 'H₂O'],
        a: [2, 1, 2],
        x: 'CH₄ + 2O₂ → CO₂ + 2H₂O.  C: 1 = 1 ✓  H: 4 → 2H₂O ✓  O: 4 → 2O₂ ✓',
    },
    {
        t: 'Iron rusting',
        p: [null, 'Fe', ' + ', null, 'O₂', ' → ', null, 'Fe₂O₃'],
        a: [4, 3, 2],
        x: '4Fe + 3O₂ → 2Fe₂O₃.  4 Fe atoms → 2 × Fe₂O₃.  6 O atoms → 3 O₂.  Fe: 4 = 4 ✓  O: 6 = 6 ✓',
    },
    {
        t: 'Haber Process',
        p: ['N₂', ' + ', null, 'H₂', ' ⇌ ', null, 'NH₃'],
        a: [3, 2],
        x: 'N₂ + 3H₂ ⇌ 2NH₃.  N: 2 = 2 ✓  H: 6 = 6 ✓  Conditions: 450 °C, 200 atm, Fe catalyst.',
    },
    {
        t: 'Ethanol combustion',
        p: ['C₂H₅OH', ' + ', null, 'O₂', ' → ', null, 'CO₂', ' + ', null, 'H₂O'],
        a: [3, 2, 3],
        x: 'C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O.  C: 2 = 2 ✓  H: 6 = 6 ✓  O: 7 = 7 ✓',
    },
    {
        t: 'H₂O₂ decomposition',
        p: [null, 'H₂O₂', ' → ', null, 'H₂O', ' + ', 'O₂'],
        a: [2, 2],
        x: '2H₂O₂ → 2H₂O + O₂.  H: 4 = 4 ✓  O: 4 = 4 ✓  Catalysed by MnO₂.',
    },
    {
        t: 'Neutralisation (H₂SO₄)',
        p: ['H₂SO₄', ' + ', null, 'NaOH', ' → ', null, 'Na₂SO₄', ' + ', null, 'H₂O'],
        a: [2, 1, 2],
        x: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O.  Na: 2 = 2 ✓  H: 4 = 4 ✓  S: 1 = 1 ✓',
    },
    {
        t: 'Thermite reaction',
        p: [null, 'Al', ' + ', 'Fe₂O₃', ' → ', null, 'Al₂O₃', ' + ', null, 'Fe'],
        a: [2, 1, 2],
        x: '2Al + Fe₂O₃ → Al₂O₃ + 2Fe.  Al: 2 = 2 ✓  Fe: 2 = 2 ✓  O: 3 = 3 ✓',
    },
    {
        t: 'Contact Process',
        p: [null, 'SO₂', ' + ', 'O₂', ' ⇌ ', null, 'SO₃'],
        a: [2, 2],
        x: '2SO₂ + O₂ ⇌ 2SO₃.  S: 2 = 2 ✓  O: 6 = 6 ✓  V₂O₅ catalyst, ~450 °C.',
    },
    {
        t: 'Electrolysis of water',
        p: [null, 'H₂O', ' → ', null, 'H₂', ' + ', 'O₂'],
        a: [2, 2],
        x: '2H₂O → 2H₂ + O₂.  H: 4 = 4 ✓  O: 2 = 2 ✓  Requires direct current.',
    },
    {
        t: 'Magnesium burning',
        p: [null, 'Mg', ' + ', 'O₂', ' → ', null, 'MgO'],
        a: [2, 2],
        x: '2Mg + O₂ → 2MgO.  Mg: 2 = 2 ✓  O: 2 = 2 ✓  Produces a brilliant white flame.',
    },
    {
        t: 'Sodium + water',
        p: [null, 'Na', ' + ', null, 'H₂O', ' → ', null, 'NaOH', ' + ', null, 'H₂'],
        a: [2, 2, 2, 1],
        x: '2Na + 2H₂O → 2NaOH + H₂.  Na: 2 = 2 ✓  O: 2 = 2 ✓  H: 4 = 4 ✓',
    },
    {
        t: 'Propane combustion',
        p: ['C₃H₈', ' + ', null, 'O₂', ' → ', null, 'CO₂', ' + ', null, 'H₂O'],
        a: [5, 3, 4],
        x: 'C₃H₈ + 5O₂ → 3CO₂ + 4H₂O.  C: 3 = 3 ✓  H: 8 = 8 ✓  O: 10 = 10 ✓',
    },
    {
        t: 'CaCO₃ decomposition',
        p: ['CaCO₃', ' → ', 'CaO', ' + ', 'CO₂'],
        a: [],
        locked: true,
        x: 'Already balanced 1:1:1.  Thermal decomposition at ~900 °C — the lime kiln reaction. CaO is quicklime.',
    },
    {
        t: 'Ammonia in water',
        p: ['NH₃', ' + ', 'H₂O', ' ⇌ ', 'NH₄⁺', ' + ', 'OH⁻'],
        a: [],
        locked: true,
        x: 'Already balanced.  NH₃ accepts H⁺ from water — a Brønsted–Lowry base. NH₄⁺ is the conjugate acid.',
    },
];

// ══════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════
let idx       = 0;   // current equation index
let score     = 0;   // cumulative score
let correct   = 0;   // correct-answer count
let selCoeff  = null; // currently selected coefficient (1–8)
let userAns   = {};   // { blankIndex: chosenValue }
let roundDone = false;
let tVal      = 45;  // seconds remaining in current round
let tInt      = null; // setInterval handle

// ══════════════════════════════════════════════════════════════════════
// DOM REFERENCES  (grabbed once after DOMContentLoaded)
// ══════════════════════════════════════════════════════════════════════
let refs = {};

function grabRefs() {
    refs = {
        pRound:      document.getElementById('p-round'),
        pScore:      document.getElementById('p-score'),
        pTime:       document.getElementById('p-time'),
        pCorrect:    document.getElementById('p-correct'),
        timerBar:    document.getElementById('timer-bar'),
        eqDots:      document.getElementById('eq-dots'),
        gameArea:    document.getElementById('game-area'),
        endArea:     document.getElementById('end-area'),
        eqTitle:     document.getElementById('eq-title'),
        eqPanel:     document.getElementById('eq-panel'),
        pickerWrap:  document.getElementById('picker-wrap'),
        pickerLbl:   document.getElementById('picker-label'),
        pickerGrid:  document.getElementById('picker-grid'),
        btnCheck:    document.getElementById('btn-check'),
        btnHint:     document.getElementById('btn-hint'),
        btnNext:     document.getElementById('btn-next'),
        eqFeedback:  document.getElementById('eq-feedback'),
        endIcon:     document.getElementById('end-icon'),
        endHeading:  document.getElementById('end-heading'),
        endResult:   document.getElementById('end-result'),
        endScore:    document.getElementById('end-score'),
        btnPlayAgain:document.getElementById('btn-play-again'),
    };
}

// ══════════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    grabRefs();
    bindButtons();
    buildDots();
    renderRound();
});

function bindButtons() {
    refs.btnCheck.addEventListener('click',    checkAnswer);
    refs.btnHint.addEventListener('click',     giveHint);
    refs.btnNext.addEventListener('click',     nextRound);
    refs.btnPlayAgain.addEventListener('click', restart);
}

// ══════════════════════════════════════════════════════════════════════
// RESTART
// ══════════════════════════════════════════════════════════════════════
function restart() {
    idx = 0;
    score = 0;
    correct = 0;
    selCoeff = null;
    refs.endArea.classList.remove('show');
    refs.gameArea.style.display = '';
    refs.pScore.textContent   = '0';
    refs.pCorrect.textContent = '0';
    buildDots();
    renderRound();
}

// ══════════════════════════════════════════════════════════════════════
// PROGRESS DOTS
// ══════════════════════════════════════════════════════════════════════
function buildDots() {
    refs.eqDots.innerHTML = '';
    EQS.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'dot' + (i === 0 ? ' cur' : '');
        d.id = 'd' + i;
        refs.eqDots.appendChild(d);
    });
}

function setDot(i, cls) {
    const d = document.getElementById('d' + i);
    if (d) d.className = 'dot ' + cls;
}

// ══════════════════════════════════════════════════════════════════════
// RENDER ROUND
// ══════════════════════════════════════════════════════════════════════
function renderRound() {
    clearInterval(tInt);
    if (idx >= EQS.length) { showEnd(); return; }

    const eq = EQS[idx];
    selCoeff  = null;
    userAns   = {};
    roundDone = false;

    refs.pRound.textContent = `${idx + 1} / ${EQS.length}`;
    refs.eqTitle.textContent = eq.t;
    hideFeedback();

    // Update dots — keep past ones coloured, reset future ones
    EQS.forEach((_, i) => {
        const d = document.getElementById('d' + i);
        if (!d || i < idx) return;
        d.className = 'dot' + (i === idx ? ' cur' : '');
    });

    buildPanel(eq);

    // Locked (already-balanced) rounds: show explanation, skip picker
    if (eq.locked) {
        refs.pickerWrap.style.display = 'none';
        refs.btnCheck.style.display   = 'none';
        refs.btnHint.style.display    = 'none';
        refs.btnNext.style.display    = 'inline-flex';
        showFeedback('info', eq.x);
        startTimer(30);
        return;
    }

    // Normal interactive round
    refs.pickerWrap.style.display = '';
    refs.pickerLbl.textContent    = 'Select a number below, then click a blank to fill it in';
    refs.btnCheck.style.display   = 'inline-flex';
    refs.btnHint.style.display    = 'inline-flex';
    refs.btnNext.style.display    = 'none';
    buildPicker();
    startTimer(45);
}

// ══════════════════════════════════════════════════════════════════════
// BUILD EQUATION PANEL
// ══════════════════════════════════════════════════════════════════════
function buildPanel(eq) {
    refs.eqPanel.innerHTML = '';
    let bi = 0; // blank index

    eq.p.forEach(part => {
        if (part === null) {
            // Coefficient blank
            const i  = bi++;
            const el = document.createElement('div');
            el.className   = 'eq-blank';
            el.textContent = '?';
            el.id          = 'b' + i;
            el.addEventListener('click', () => { if (!roundDone) fillBlank(i, el); });
            refs.eqPanel.appendChild(el);
        } else {
            // Static text (formula or operator)
            const el = document.createElement('span');
            const t  = part.trim();
            el.className   = (t === '+' || t === '→' || t === '⇌') ? 'eq-op' : 'eq-sym';
            el.textContent = part;
            refs.eqPanel.appendChild(el);
        }
    });
}

// ══════════════════════════════════════════════════════════════════════
// BUILD COEFFICIENT PICKER  (1 – 8)
// ══════════════════════════════════════════════════════════════════════
function buildPicker() {
    refs.pickerGrid.innerHTML = '';
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(n => {
        const b = document.createElement('button');
        b.type          = 'button';
        b.className     = 'pick-btn';
        b.textContent   = n;
        b.addEventListener('click', () => {
            if (roundDone) return;
            selCoeff = n;
            refs.pickerGrid.querySelectorAll('.pick-btn').forEach(x => x.classList.remove('sel'));
            b.classList.add('sel');
        });
        refs.pickerGrid.appendChild(b);
    });
}

// ══════════════════════════════════════════════════════════════════════
// FILL A BLANK
// ══════════════════════════════════════════════════════════════════════
function fillBlank(i, el) {
    if (selCoeff === null) {
        showFeedback('info', 'Pick a number from the buttons below first, then click a blank.');
        return;
    }
    userAns[i]     = selCoeff;
    el.textContent = selCoeff;
    el.className   = 'eq-blank has-val';
}

// ══════════════════════════════════════════════════════════════════════
// TIMER
// ══════════════════════════════════════════════════════════════════════
function startTimer(max) {
    tVal = max;
    refs.timerBar.className  = 'timer-bar';
    refs.timerBar.style.width = '100%';
    refs.pTime.textContent   = tVal;

    tInt = setInterval(() => {
        tVal--;
        refs.pTime.textContent    = tVal;
        refs.timerBar.style.width = Math.max(0, (tVal / max) * 100) + '%';
        if (tVal <= 10) refs.timerBar.className = 'timer-bar danger';
        if (tVal <= 0)  { clearInterval(tInt); if (!roundDone) autoFail(); }
    }, 1000);
}

function autoFail() {
    roundDone = true;
    const eq  = EQS[idx];
    (eq.a || []).forEach((ans, i) => {
        const el = document.getElementById('b' + i);
        if (el) { el.textContent = ans; el.className = 'eq-blank wrong'; }
    });
    showFeedback('fail', "Time's up! " + eq.x);
    refs.btnNext.style.display  = 'inline-flex';
    refs.btnCheck.style.display = 'none';
    setDot(idx, 'fail');
}

// ══════════════════════════════════════════════════════════════════════
// CHECK ANSWER
// ══════════════════════════════════════════════════════════════════════
function checkAnswer() {
    if (roundDone) return;

    const eq = EQS[idx];
    const n  = (eq.a || []).length;

    if (n > 0) {
        const allFilled = Array.from({ length: n }, (_, i) => i).every(i => userAns[i] !== undefined);
        if (!allFilled) {
            showFeedback('info', 'Fill in all the blanks before checking.');
            return;
        }
    }

    clearInterval(tInt);
    roundDone = true;

    const allCorrect = Array.from({ length: n }, (_, i) => i).every(i => userAns[i] === eq.a[i]);

    // Colour each blank
    Array.from({ length: n }, (_, i) => i).forEach(i => {
        const el    = document.getElementById('b' + i);
        if (!el) return;
        const right = (userAns[i] === eq.a[i]);
        el.className   = 'eq-blank ' + (right ? 'correct' : 'wrong');
        if (!right) el.textContent = eq.a[i]; // reveal correct value
    });

    if (allCorrect) {
        const pts = Math.max(5, tVal * 2);
        score   += pts;
        correct += 1;
        refs.pScore.textContent   = score;
        refs.pCorrect.textContent = correct;
        showFeedback('ok', `✓ Correct! +${pts} pts (${tVal}s remaining).  ${eq.x}`);
        setDot(idx, 'done');
    } else {
        showFeedback('fail', '✗ Not quite — correct answers are shown above.  ' + eq.x);
        setDot(idx, 'fail');
    }

    refs.btnNext.style.display  = 'inline-flex';
    refs.btnCheck.style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════════
// HINT  — reveals the first blank
// ══════════════════════════════════════════════════════════════════════
function giveHint() {
    const eq = EQS[idx];
    if (!eq.a || !eq.a.length) return;
    const el = document.getElementById('b0');
    if (el && userAns[0] === undefined) {
        userAns[0]     = eq.a[0];
        el.textContent = eq.a[0];
        el.className   = 'eq-blank has-val';
    }
    showFeedback('info', `Hint: the first blank is ${eq.a[0]}.`);
}

function nextRound() { idx++; renderRound(); }

// ══════════════════════════════════════════════════════════════════════
// FEEDBACK HELPERS
// ══════════════════════════════════════════════════════════════════════
function showFeedback(type, msg) {
    refs.eqFeedback.className   = `eq-feedback show ${type}`;
    refs.eqFeedback.textContent = msg;
}

function hideFeedback() {
    refs.eqFeedback.className   = 'eq-feedback';
    refs.eqFeedback.textContent = '';
}

// ══════════════════════════════════════════════════════════════════════
// END SCREEN
// ══════════════════════════════════════════════════════════════════════
function showEnd() {
    clearInterval(tInt);
    refs.gameArea.style.display = 'none';
    refs.endArea.classList.add('show');

    const pct = Math.round((correct / EQS.length) * 100);
    refs.endScore.textContent   = score;
    refs.endIcon.textContent    = pct >= 80 ? '🏆' : pct >= 50 ? '🧪' : '⚗️';
    refs.endHeading.textContent = pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort!' : 'Keep practising!';
    refs.endResult.textContent  = `${correct} out of ${EQS.length} correct  (${pct}%)`;
}
