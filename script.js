// ハジメル.dev — script.js
(function () {
  'use strict';

  // 年表示
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // prefers-reduced-motion 確認
  var prefersReduce =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // IntersectionObserver でセクションを reveal
  if ('IntersectionObserver' in window && !prefersReduce) {
    var targets = document.querySelectorAll(
      '.section__h, .nayami__card, .riyu__item, .yakusoku__item, .flow__step, .voice__main, .voice__card, .price__card, .faq__item'
    );
    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  // スムーススクロール（#hash リンク、ヘッダー高さオフセット）
  var headerOffset = 60;
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var rect = target.getBoundingClientRect();
      var top = window.pageYOffset + rect.top - headerOffset;
      if (prefersReduce) {
        window.scrollTo(0, top);
      } else {
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
      // フォーカス移動（アクセシビリティ）
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // FAQ: 同時に1つだけ開く（任意挙動）
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });

  // Hero エディタ — タイプライター演出
  var editor = document.querySelector('.hero__editor .editor__body');
  if (editor && !prefersReduce && 'IntersectionObserver' in window) {
    // 行番号 (.ln) を除く全テキストノードを収集
    var walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) {
      var parent = n.parentElement;
      if (parent && parent.classList && parent.classList.contains('ln')) continue;
      textNodes.push({ node: n, original: n.nodeValue });
    }
    // 開始前に対象を空に
    textNodes.forEach(function (t) { t.node.nodeValue = ''; });
    editor.classList.add('is-typing');

    var started = false;
    var typeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || started) return;
        started = true;
        typeIO.disconnect();

        var nodeIdx = 0;
        var charIdx = 0;
        var baseSpeed = 22; // ms/文字
        function step() {
          if (nodeIdx >= textNodes.length) return; // 完了（カーソルは点滅し続ける）
          var t = textNodes[nodeIdx];
          if (charIdx < t.original.length) {
            t.node.nodeValue = t.original.slice(0, charIdx + 1);
            charIdx++;
            // 改行直後は少し溜める（リズム作り）
            var delay = baseSpeed + (Math.random() * 18);
            if (t.original.charAt(charIdx - 1) === '\n') delay += 80;
            setTimeout(step, delay);
          } else {
            nodeIdx++;
            charIdx = 0;
            setTimeout(step, 30);
          }
        }
        // 軽くディレイしてから開始（Heroが落ち着いてから）
        setTimeout(step, 320);
      });
    }, { threshold: 0.4 });
    typeIO.observe(editor);
  }
})();
