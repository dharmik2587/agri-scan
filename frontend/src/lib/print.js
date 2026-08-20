// Client-side PDF via browser print dialog. Users can 'Save as PDF' from the
// dialog on any modern browser (desktop, iOS Safari, Chrome Android).
//
// The strategy: temporarily add a class to <body> that hides everything except
// the target element (matched by a data attribute), then invoke window.print(),
// then remove the class after the print dialog closes.

const PRINT_BODY_CLASS = "printing";

function ensureStyles() {
  if (document.getElementById("agriscan-print-styles")) return;
  const style = document.createElement("style");
  style.id = "agriscan-print-styles";
  style.textContent = `
    @media print {
      body.printing header,
      body.printing footer,
      body.printing nav,
      body.printing [data-testid="app-nav"],
      body.printing [data-print-hide="true"] {
        display: none !important;
      }
      body.printing [data-print-root]:not([data-print-root="active"]) {
        display: none !important;
      }
      body.printing [data-print-root="active"] {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        background: #fff !important;
        color: #111 !important;
      }
      body.printing [data-print-root="active"] * {
        color-adjust: exact;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body.printing {
        background: #fff !important;
      }
    }
    @page {
      size: A4;
      margin: 14mm 12mm;
    }
  `;
  document.head.appendChild(style);
}

export function printElementBySelector(selector) {
  ensureStyles();
  const target = document.querySelector(selector);
  if (!target) {
    window.print();
    return;
  }
  const prevAttr = target.getAttribute("data-print-root");
  target.setAttribute("data-print-root", "active");
  document.body.classList.add(PRINT_BODY_CLASS);
  const cleanup = () => {
    document.body.classList.remove(PRINT_BODY_CLASS);
    if (prevAttr === null) target.removeAttribute("data-print-root");
    else target.setAttribute("data-print-root", prevAttr);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  // Safari may not fire afterprint reliably — hard cleanup after a delay
  setTimeout(cleanup, 30000);
  try {
    window.print();
  } catch (e) {
    cleanup();
  }
}
