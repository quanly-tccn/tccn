/* Finance Manager — iOS compact native date/month picker.
   Only presentation: native input, value, events and form submissions stay intact. */
(function () {
  "use strict";

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  const SELECTOR = 'input[type="date"],input[type="month"],input[type="datetime-local"]';

  function displayValue(input) {
    const value = input.value || "";
    if (input.type === "month") {
      const match = /^(\d{4})-(\d{2})$/.exec(value);
      return match ? match[2] + "/" + match[1] : "Chọn tháng";
    }
    if (input.type === "date") {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      return match ? match[3] + "/" + match[2] + "/" + match[1] : "Chọn ngày";
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    return match ? match[3] + "/" + match[2] + "/" + match[1] + " " + match[4] + ":" + match[5] : "Chọn ngày và giờ";
  }

  function wrap(input) {
    if (input.closest(".fm-ios-date-shell") || !input.parentNode) return;
    const shell = document.createElement("span");
    shell.className = "fm-ios-date-shell";
    shell.dataset.financeIosPicker = input.type;
    const icon = document.createElement("span");
    icon.className = "fm-ios-date-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "📅";
    const display = document.createElement("span");
    display.className = "fm-ios-date-value";
    display.setAttribute("aria-hidden", "true");
    const sync = () => { display.textContent = displayValue(input); };
    input.parentNode.insertBefore(shell, input);
    shell.append(icon, display, input);
    sync();
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    input.addEventListener("focus", sync);
    input.addEventListener("blur", sync);
    if (input.form) input.form.addEventListener("reset", () => setTimeout(sync, 0));
  }

  function scan(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && root.matches(SELECTOR)) wrap(root);
    root.querySelectorAll(SELECTOR).forEach(wrap);
  }

  function init() {
    scan(document);
    // Budget, report and search controls can be created later by JS.
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          scan(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Value assignments made directly by other application scripts are
    // reflected when a control is tapped, and after navigation.
    document.addEventListener("click", event => {
      const input = event.target.closest && event.target.closest(SELECTOR);
      if (!input) return;
      const span = input.parentElement.querySelector(".fm-ios-date-value");
      if (span) span.textContent = displayValue(input);
    }, true);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once: true});
  } else init();
})();
