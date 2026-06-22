(function () {
  const display = document.getElementById('display');
  const historyEl = document.getElementById('history');
  const clearBtn = document.getElementById('clearBtn');
  const keys = document.querySelectorAll('.key');
  const operatorButtons = {
    add: document.querySelector('[data-action="add"]'),
    subtract: document.querySelector('[data-action="subtract"]'),
    multiply: document.querySelector('[data-action="multiply"]'),
    divide: document.querySelector('[data-action="divide"]')
  };

  let current = '0';
  let previous = null;
  let pendingOp = null;
  let justEvaluated = false;
  let overwrite = true;

  const MAX_DIGITS = 9;

  function formatNumber(numStr) {
    if (numStr === 'Error') return numStr;
    const isNeg = numStr.startsWith('-');
    let n = isNeg ? numStr.slice(1) : numStr;
    let [intPart, decPart] = n.split('.');

    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    let result = intPart;
    if (decPart !== undefined) result += '.' + decPart;
    return (isNeg ? '-' : '') + result;
  }

  function fitDisplay() {
    const len = display.textContent.replace(/[,.]/g, '').length;
    if (len > 8) {
      display.style.fontSize = '52px';
    } else if (len > 6) {
      display.style.fontSize = '64px';
    } else {
      display.style.fontSize = '84px';
    }
  }

  function render() {
    display.textContent = formatNumber(current);
    fitDisplay();
    clearBtn.textContent = (current !== '0' || !overwrite) && !justEvaluated ? 'C' : 'AC';

    Object.values(operatorButtons).forEach(btn => btn.classList.remove('active'));
    if (pendingOp && !justEvaluated) {
      operatorButtons[pendingOp].classList.add('active');
    }
  }

  function symbolFor(op) {
    return { add: '+', subtract: '−', multiply: '×', divide: '÷' }[op];
  }

  function updateHistory() {
    if (previous !== null && pendingOp) {
      historyEl.textContent = `${formatNumber(previous)} ${symbolFor(pendingOp)}`;
    } else {
      historyEl.textContent = '';
    }
  }

  function inputDigit(d) {
    if (justEvaluated) {
      previous = null;
      pendingOp = null;
      justEvaluated = false;
      historyEl.textContent = '';
    }
    if (overwrite) {
      current = d;
      overwrite = false;
    } else {
      const digitCount = current.replace('-', '').replace('.', '').length;
      if (digitCount >= MAX_DIGITS) return;
      current = current === '0' ? d : current + d;
    }
    render();
  }

  function inputDecimal() {
    if (justEvaluated) {
      current = '0';
      previous = null;
      pendingOp = null;
      justEvaluated = false;
      historyEl.textContent = '';
      overwrite = false;
    }
    if (overwrite) {
      current = '0';
      overwrite = false;
    }
    if (!current.includes('.')) {
      current += '.';
    }
    render();
  }

  function clearAll() {
    current = '0';
    previous = null;
    pendingOp = null;
    justEvaluated = false;
    overwrite = true;
    historyEl.textContent = '';
    render();
  }

  function clearEntry() {
    current = '0';
    overwrite = true;
    render();
  }

  function negate() {
    if (current === '0') return;
    current = current.startsWith('-') ? current.slice(1) : '-' + current;
    render();
  }

  function percent() {
    const val = parseFloat(current);
    if (isNaN(val)) return;
    let result;
    if (previous !== null && pendingOp) {
      const base = parseFloat(previous);
      result = (base * (val / 100));
    } else {
      result = val / 100;
    }
    current = trimResult(result);
    overwrite = true;
    render();
  }

  function trimResult(num) {
    if (!isFinite(num)) return 'Error';
    if (Object.is(num, -0)) num = 0;
    let str = num.toPrecision(10);
    if (str.includes('.')) {
      str = str.replace(/0+$/, '').replace(/\.$/, '');
    }
    if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-6 && num !== 0)) {
      str = num.toExponential(4);
    }
    return str;
  }

  function compute(a, b, op) {
    a = parseFloat(a);
    b = parseFloat(b);
    switch (op) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function chooseOperator(op) {
    if (pendingOp && !overwrite) {
      const result = compute(previous, current, pendingOp);
      current = trimResult(result);
      previous = current;
    } else {
      previous = current;
    }
    pendingOp = op;
    overwrite = true;
    justEvaluated = false;
    updateHistory();
    render();
  }

  function equals() {
    if (pendingOp === null || previous === null) {
      render();
      return;
    }
    const result = compute(previous, current, pendingOp);
    historyEl.textContent = `${formatNumber(previous)} ${symbolFor(pendingOp)} ${formatNumber(current)} =`;
    current = trimResult(result);
    previous = null;
    pendingOp = null;
    overwrite = true;
    justEvaluated = true;
    render();
  }

  function handleAction(action, value) {
    switch (action) {
      case 'number': inputDigit(value); break;
      case 'decimal': inputDecimal(); break;
      case 'clear':
        if (clearBtn.textContent === 'AC') clearAll(); else clearEntry();
        break;
      case 'negate': negate(); break;
      case 'percent': percent(); break;
      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
        chooseOperator(action);
        break;
      case 'equals': equals(); break;
    }
  }

  keys.forEach(key => {
    key.addEventListener('click', () => {
      const action = key.dataset.action;
      const value = key.dataset.value;
      handleAction(action, value);
    });
  });

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    let matched = null;

    if (/^[0-9]$/.test(k)) {
      inputDigit(k);
      matched = `[data-action="number"][data-value="${k}"]`;
    } else if (k === '.') {
      inputDecimal();
      matched = '[data-action="decimal"]';
    } else if (k === '+') {
      chooseOperator('add');
      matched = '[data-action="add"]';
    } else if (k === '-') {
      chooseOperator('subtract');
      matched = '[data-action="subtract"]';
    } else if (k === '*') {
      chooseOperator('multiply');
      matched = '[data-action="multiply"]';
    } else if (k === '/') {
      e.preventDefault();
      chooseOperator('divide');
      matched = '[data-action="divide"]';
    } else if (k === 'Enter' || k === '=') {
      equals();
      matched = '[data-action="equals"]';
    } else if (k === 'Backspace') {
      if (!overwrite && current.length > 1) {
        current = current.slice(0, -1);
        if (current === '-' || current === '') current = '0';
      } else {
        current = '0';
        overwrite = true;
      }
      render();
    } else if (k === 'Escape') {
      clearAll();
      matched = '[data-action="clear"]';
    } else if (k === '%') {
      percent();
      matched = '[data-action="percent"]';
    }

    if (matched) {
      const btn = document.querySelector(matched);
      if (btn) {
        btn.classList.add('flash');
        setTimeout(() => btn.classList.remove('flash'), 110);
      }
    }
  });

  render();
})();
