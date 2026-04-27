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

  // u-underline 描画アニメ（viewport到達でscaleX）
  if ('IntersectionObserver' in window && !prefersReduce) {
    var underlines = document.querySelectorAll('.u-underline');
    if (underlines.length) {
      var ulIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-drawn');
            ulIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      underlines.forEach(function (el) { ulIO.observe(el); });
    }
  } else {
    // 動き抑制時は最初から描画済み
    document.querySelectorAll('.u-underline').forEach(function (el) {
      el.classList.add('is-drawn');
    });
  }

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

  // スクロール進捗バー + ナビ変色
  var navEl = document.querySelector('.nav');
  var progressBar = document.querySelector('.scroll-progress span');
  if (navEl) {
    var scrollTicking = false;
    function updateScroll() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      // 変色しきい値
      if (scrollTop > 32) navEl.classList.add('is-scrolled');
      else navEl.classList.remove('is-scrolled');
      // 進捗バー
      if (progressBar && docH > 0) {
        var ratio = Math.max(0, Math.min(1, scrollTop / docH));
        progressBar.style.transform = 'scaleX(' + ratio + ')';
      }
      scrollTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateScroll);
        scrollTicking = true;
      }
    }, { passive: true });
    updateScroll();
  }

  // 数字カウントアップ（§実績バー）
  var jissekiNums = document.querySelectorAll('.jisseki__num[data-target]');
  if (jissekiNums.length) {
    if (prefersReduce || !('IntersectionObserver' in window)) {
      // 動き抑制 / 非対応 → 即終値表示
      jissekiNums.forEach(function (el) {
        var val = el.querySelector('.jisseki__num-val');
        if (val) val.textContent = el.getAttribute('data-target');
      });
    } else {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          countIO.unobserve(el);
          var val = el.querySelector('.jisseki__num-val');
          if (!val) return;
          var target = parseInt(el.getAttribute('data-target'), 10) || 0;
          var duration = 1200;
          var start = null;
          function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
          function tick(ts) {
            if (start === null) start = ts;
            var elapsed = ts - start;
            var progress = Math.min(1, elapsed / duration);
            var eased = easeOutQuart(progress);
            var current = Math.round(target * eased);
            val.textContent = String(current);
            if (progress < 1) {
              window.requestAnimationFrame(tick);
            } else {
              val.textContent = String(target);
            }
          }
          // 開始前に 0 を表示
          val.textContent = '0';
          window.requestAnimationFrame(tick);
        });
      }, { threshold: 0.4 });
      jissekiNums.forEach(function (el) { countIO.observe(el); });
    }
  }

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

  // Hero エディタ — タイプライター演出（無限ループ + h1 variants）
  var editor = document.querySelector('.hero__editor .editor__body');
  if (editor && !prefersReduce && 'IntersectionObserver' in window) {
    // h1 内テキストの差し替えレパートリー
    var variants = [
      { greet: 'Hello, ',       str: 'hajimeru.dev'    },
      { greet: 'Welcome, ',     str: 'future dev!'     },
      { greet: 'Hi there, ',    str: 'you can do it!'  },
      { greet: "Let's start, ", str: 'your journey.'   }
    ];
    var variantIdx = 0;

    // 行番号 (.ln) を除く全テキストノードを収集
    var walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var greetEntry = null;
    var strEntry = null;
    var n;
    while ((n = walker.nextNode())) {
      var parent = n.parentElement;
      if (parent && parent.classList && parent.classList.contains('ln')) continue;
      var entry = { node: n, original: n.nodeValue };
      if (parent && parent.classList) {
        if (parent.classList.contains('greet')) greetEntry = entry;
        else if (parent.classList.contains('str')) strEntry = entry;
      }
      textNodes.push(entry);
    }
    var lnEls = Array.prototype.slice.call(editor.querySelectorAll('.ln'));

    // タイプ位置に追従するカーソル要素
    var caret = document.createElement('span');
    caret.className = 'caret';
    caret.textContent = '▍';
    var codeEl = editor.querySelector('code') || editor;
    codeEl.appendChild(caret);

    // 開始前に対象を空に
    textNodes.forEach(function (t) { t.node.nodeValue = ''; });
    editor.classList.add('is-typing');

    var nodeIdx = 0;
    var charIdx = 0;
    var lnIdx = 0;
    // 0.7倍速 (元 baseSpeed=22)
    var speedFactor = 1 / 0.7;
    var baseSpeed = 22 * speedFactor;

    function placeCaretAfter(node) {
      var parent = node.parentNode;
      if (!parent) return;
      if (caret.previousSibling !== node || caret.parentNode !== parent) {
        parent.insertBefore(caret, node.nextSibling);
      }
    }

    function step() {
      if (nodeIdx >= textNodes.length) {
        // 完了 — コメント明滅開始
        editor.classList.add('is-done');
        lnEls.forEach(function (el) { el.classList.add('is-shown'); });
        scheduleLoop();
        return;
      }
      var t = textNodes[nodeIdx];
      if (charIdx < t.original.length) {
        t.node.nodeValue = t.original.slice(0, charIdx + 1);
        charIdx++;
        placeCaretAfter(t.node);
        var typedChar = t.original.charAt(charIdx - 1);
        var delay = (baseSpeed + Math.random() * 18 * speedFactor);
        if (typedChar === '\n') {
          delay += 80 * speedFactor;
          lnIdx++;
          if (lnEls[lnIdx]) lnEls[lnIdx].classList.add('is-shown');
        }
        setTimeout(step, delay);
      } else {
        nodeIdx++;
        charIdx = 0;
        setTimeout(step, 30 * speedFactor);
      }
    }

    function startTyping() {
      // リセット
      editor.classList.remove('is-fading', 'is-done');
      editor.classList.add('is-typing');
      textNodes.forEach(function (t) { t.node.nodeValue = ''; });
      lnEls.forEach(function (el) { el.classList.remove('is-shown'); });
      if (lnEls[0]) lnEls[0].classList.add('is-shown');
      // caret を先頭に戻す
      codeEl.insertBefore(caret, codeEl.firstChild);
      nodeIdx = 0;
      charIdx = 0;
      lnIdx = 0;
      setTimeout(step, 320);
    }

    function scheduleLoop() {
      // 2秒待機 → fade out → variant 切替 → 再開
      setTimeout(function () {
        editor.classList.add('is-fading');
        setTimeout(function () {
          variantIdx = (variantIdx + 1) % variants.length;
          var v = variants[variantIdx];
          if (greetEntry) greetEntry.original = v.greet;
          if (strEntry) strEntry.original = v.str;
          startTyping();
        }, 600);
      }, 2000);
    }

    var started = false;
    var typeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || started) return;
        started = true;
        typeIO.disconnect();
        if (lnEls[0]) lnEls[0].classList.add('is-shown');
        // 軽くディレイしてから開始（Heroが落ち着いてから）
        setTimeout(step, 320);
      });
    }, { threshold: 0.4 });
    typeIO.observe(editor);
  }

  // pointer:fine 検出（タッチデバイス除外）
  var isFinePointer =
    window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches;

  // マグネティックボタン（カーソル追従、最大±5px、lerp 0.18）
  if (isFinePointer && !prefersReduce) {
    var magnets = document.querySelectorAll('.btn--primary, .btn--white, .btn--nav');
    magnets.forEach(function (btn) {
      var rafId = null;
      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var maxOffset = 5;
      var lerp = 0.18;

      function animate() {
        currentX += (targetX - currentX) * lerp;
        currentY += (targetY - currentY) * lerp;
        btn.style.setProperty('--mag-x', currentX.toFixed(2) + 'px');
        btn.style.setProperty('--mag-y', currentY.toFixed(2) + 'px');
        if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
          rafId = window.requestAnimationFrame(animate);
        } else {
          rafId = null;
          if (targetX === 0 && targetY === 0) {
            btn.style.removeProperty('--mag-x');
            btn.style.removeProperty('--mag-y');
          }
        }
      }

      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = (e.clientX - cx) / (rect.width / 2);
        var dy = (e.clientY - cy) / (rect.height / 2);
        targetX = Math.max(-1, Math.min(1, dx)) * maxOffset;
        targetY = Math.max(-1, Math.min(1, dy)) * maxOffset;
        if (rafId === null) rafId = window.requestAnimationFrame(animate);
      });

      btn.addEventListener('mouseleave', function () {
        targetX = 0;
        targetY = 0;
        if (rafId === null) rafId = window.requestAnimationFrame(animate);
      });
    });
  }

  // 3Dティルトカード（マウス位置で軸傾き、最大±4deg）
  if (isFinePointer && !prefersReduce) {
    var tiltCards = document.querySelectorAll('.nayami__card, .voice__card');
    tiltCards.forEach(function (card) {
      var maxDeg = 4;
      var tiltRaf = null;
      var pendingX = 0;
      var pendingY = 0;

      function applyTilt() {
        card.style.transform = 'perspective(800px) rotateX(' + pendingY.toFixed(2) + 'deg) rotateY(' + pendingX.toFixed(2) + 'deg)';
        tiltRaf = null;
      }

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = (e.clientX - cx) / (rect.width / 2);
        var dy = (e.clientY - cy) / (rect.height / 2);
        pendingX = Math.max(-1, Math.min(1, dx)) * maxDeg;
        pendingY = Math.max(-1, Math.min(1, -dy)) * maxDeg;
        if (tiltRaf === null) tiltRaf = window.requestAnimationFrame(applyTilt);
      });

      card.addEventListener('mouseleave', function () {
        pendingX = 0;
        pendingY = 0;
        if (tiltRaf === null) tiltRaf = window.requestAnimationFrame(applyTilt);
        // 完全に戻したら transform を消去
        setTimeout(function () {
          if (pendingX === 0 && pendingY === 0) {
            card.style.transform = '';
          }
        }, 300);
      });
    });
  }
})();
