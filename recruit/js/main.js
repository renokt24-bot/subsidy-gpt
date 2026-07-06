/* 全力ストレッチ 採用サイト — interactions */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ローディング → ヒーロー出現 ---------- */
  var loader = document.getElementById("loader");
  function finishLoading() {
    document.body.classList.add("is-loaded");
    if (loader) loader.classList.add("is-done");
  }
  if (prefersReduced) {
    finishLoading();
  } else {
    // フォント読み込みを待ちつつ、ロゴ描画+コピーを最後まで見せる
    var minWait = new Promise(function (r) { setTimeout(r, 2300); });
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([minWait, fonts]).then(finishLoading);
    setTimeout(finishLoading, 4200); // フェイルセーフ
  }

  /* ---------- ヘッダー背景 & 追従CTA ---------- */
  var header = document.getElementById("header");
  var fixedCta = document.getElementById("fixedCta");
  var hero = document.getElementById("hero");
  var entry = document.getElementById("entry");

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);

    // ヒーローを2割過ぎたら出現、エントリーセクションでは重複するので隠す
    var threshold = hero ? hero.offsetHeight * 0.2 : 200;
    var nearEntry = false;
    if (entry) {
      var rect = entry.getBoundingClientRect();
      nearEntry = rect.top < window.innerHeight * 0.75;
    }
    var show = y > threshold && !nearEntry;
    fixedCta.classList.toggle("is-shown", show);
    fixedCta.setAttribute("aria-hidden", show ? "false" : "true");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- モバイルドロワー ---------- */
  var burger = document.getElementById("burger");
  var gnav = document.getElementById("gnav");
  if (burger && gnav) {
    burger.addEventListener("click", function () {
      var open = gnav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      document.body.style.overflow = open ? "hidden" : "";
    });
    gnav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        gnav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- スクロール出現 ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------- 実績カウントアップ ---------- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimal || "0", 10);
    var duration = 1600;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
    }
    if (prefersReduced) {
      el.textContent = target.toFixed(decimals);
    } else {
      requestAnimationFrame(frame);
    }
  }
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        countUp(e.target);
        countObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".js-count").forEach(function (el) {
    countObserver.observe(el);
  });

  /* ---------- パララックス(控えめ) ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  if (parallaxEls.length && !prefersReduced) {
    var ticking = false;
    function parallax() {
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.dataset.parallax) || 0.08;
        var rect = el.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
        el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(parallax);
      }
    }, { passive: true });
    parallax();
  }

  /* ---------- FAQ: 開いたら他を閉じる ---------- */
  var qas = document.querySelectorAll(".qa");
  qas.forEach(function (qa) {
    qa.addEventListener("toggle", function () {
      if (qa.open) {
        qas.forEach(function (other) {
          if (other !== qa) other.open = false;
        });
      }
    });
  });
})();
