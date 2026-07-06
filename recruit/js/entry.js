/* 応募フォーム — バリデーションと送信 */
(function () {
  "use strict";

  /* URLパラメータ ?type=tour → 見学モードを初期選択 */
  var params = new URLSearchParams(window.location.search);
  if (params.get("type") === "tour") {
    var tourRadio = document.querySelector('input[name="type"][value="tour"]');
    if (tourRadio) tourRadio.checked = true;
    var title = document.getElementById("formTitle");
    var lead = document.getElementById("formLead");
    if (title) title.textContent = "店舗見学・カジュアル面談";
    if (lead) lead.innerHTML = "履歴書不要・私服OK。<br>職場の空気を見てから、ゆっくり考えてください。";
  }

  var form = document.getElementById("entryForm");
  var done = document.getElementById("entryDone");
  if (!form) return;

  function validateField(field) {
    var input = field.querySelector('input[type="text"]');
    var ok;
    if (input) {
      ok = input.value.trim().length > 0;
    } else {
      ok = !!field.querySelector('input[type="radio"]:checked');
    }
    field.classList.toggle("has-error", !ok);
    return ok;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var fields = Array.prototype.slice.call(form.querySelectorAll(".field"));
    var allOk = fields.map(validateField).every(Boolean);
    if (!allOk) {
      var firstError = form.querySelector(".field.has-error");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    /* 実装メモ: 本番接続時はここで送信する。
       例) Formspree:
         fetch("https://formspree.io/f/XXXXXXXX", {
           method: "POST",
           headers: { "Accept": "application/json" },
           body: new FormData(form),
         }).then(showDone);
       現在はデモとして完了画面のみ表示します。 */
    showDone();
  });

  function showDone() {
    form.hidden = true;
    var typeChips = document.querySelector(".entry-form__type");
    var title = document.getElementById("formTitle");
    var lead = document.getElementById("formLead");
    if (typeChips) typeChips.hidden = true;
    if (title) title.hidden = true;
    if (lead) lead.hidden = true;
    done.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* 入力・選択したらエラー解除 */
  form.addEventListener("input", function (e) {
    var field = e.target.closest(".field");
    if (field && field.classList.contains("has-error")) validateField(field);
  });
})();
