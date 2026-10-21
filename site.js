/* Общий JS всех сайтов: UTM, подмена заголовка, A/B, согласие на cookies, аналитика, цели, квиз, карта. */
(function () {
  var cfg = JSON.parse(document.getElementById('cfg').textContent);
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var q = new URLSearchParams(location.search);

  // UTM: запоминаем на сессию, чтобы метка дожила до клика по мессенджеру
  var utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('utm', JSON.stringify(utm));
    else utm = JSON.parse(sessionStorage.getItem('utm') || '{}');
  } catch (e) {}
  var tag = utm.utm_source ? ' [' + [utm.utm_source, utm.utm_campaign].filter(Boolean).join('/') + ']' : '';

  // Заголовок: сначала совпадение с объявлением по ключу, иначе A/B
  var h1 = document.querySelector('.hero h1'), variant = 'a';
  var key = q.get('h') || utm.utm_term || utm.utm_campaign;
  if (h1 && key && cfg.headlines && cfg.headlines[key]) { h1.textContent = cfg.headlines[key]; variant = 'utm'; }
  else if (h1 && cfg.title_b) {
    variant = store.get('ab') || (Math.random() < 0.5 ? 'a' : 'b');
    store.set('ab', variant);
    if (variant === 'b') h1.textContent = cfg.title_b;
  }

  // Аналитика — только после согласия
  var A = cfg.analytics || {};
  function load(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
  function startAnalytics() {
    if (A.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', A.ga4, { ab_variant: variant });
      load('https://www.googletagmanager.com/gtag/js?id=' + A.ga4);
    }
    if (A.meta_pixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', A.meta_pixel); fbq('track', 'PageView');
    }
    if (A.clarity) {
      (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, 'clarity', 'script', A.clarity);
      clarity('set', 'ab_variant', variant);
    }
  }
  if (A.ga4 || A.meta_pixel || A.clarity) {
    var choice = store.get('consent'), bar = document.getElementById('consent');
    if (choice === 'yes') startAnalytics();
    else if (!choice && bar) {
      bar.hidden = false;
      bar.addEventListener('click', function (e) {
        var v = e.target.getAttribute('data-consent');
        if (!v) return;
        store.set('consent', v); bar.hidden = true;
        if (v === 'yes') startAnalytics();
      });
    }
  }

  function track(name, params) {
    params = params || {}; params.ab_variant = variant;
    if (window.gtag) gtag('event', name, params);
    if (window.fbq && name === 'generate_lead') fbq('track', 'Contact');
    if (window.clarity) clarity('event', name);
  }
  function wa(text) { return 'https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent(text); }

  // Цели: любой клик по мессенджеру / телефону / почте
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-goal]');
    if (!a || a.hasAttribute('data-quiz')) return;
    var g = a.getAttribute('data-goal');
    if (g === 'whatsapp' && cfg.wa && a.href.indexOf('text=') < 0) a.href = wa(cfg.msg + tag);
    track('generate_lead', { method: g });
  });

  // Карта Google — только по клику (скорость + нет cookies до клика)
  document.querySelectorAll('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = b.getAttribute('data-map'); f.title = b.textContent; f.loading = 'lazy';
      b.replaceWith(f);
    });
  });

  // Блок продажи: прячем мобильную кнопку, когда сайт уехал и открылся лендинг студии
  var site = document.querySelector('.site'), mbar = document.querySelector('.mbar');
  if (document.getElementById('pitch') && site && mbar) {
    window.addEventListener('scroll', function () {
      mbar.style.visibility = window.scrollY + window.innerHeight > site.offsetHeight + 40 ? 'hidden' : '';
    }, { passive: true });
  }

  // Вкладки прайса
  document.querySelectorAll('[data-tabs]').forEach(function (bar) {
    var root = bar.parentNode;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]');
      if (!b) return;
      bar.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === b); });
      root.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
      track('price_tab', { tab: b.textContent });
    });
  });

  // Фильтр портфолио
  document.querySelectorAll('[data-chips]').forEach(function (bar) {
    var grid = bar.closest('section').querySelector('[data-portfolio]');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      bar.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.toggle('on', x === b); });
      grid.querySelectorAll('[data-cat]').forEach(function (fig) { fig.hidden = f !== '*' && fig.getAttribute('data-cat') !== f; });
    });
  });

  // Заявки: имя + телефон -> endpoint (Google Apps Script) и/или Web3Forms; без них -> WhatsApp с контактами
  var L = cfg.leads || {};
  function sendLead(data) {
    var jobs = [];
    if (L.endpoint) jobs.push(fetch(L.endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) }));
    if (L.web3forms) jobs.push(fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ access_key: L.web3forms, subject: 'Заявка з сайту ' + cfg.brand, from_name: cfg.brand }, data))
    }));
    return Promise.all(jobs);
  }
  function answersOf(form) {
    return [].slice.call(form.querySelectorAll('.qstep[data-q]')).map(function (s) {
      var v = [].map.call(s.querySelectorAll('input:checked'), function (x) { return x.value; }).join(', ');
      return s.getAttribute('data-q') + ': ' + (v || '-');
    }).join('\n');
  }
  function detailsOf(form) {
    return [].slice.call(form.querySelectorAll('[data-label]')).filter(function (e) { return e.value; })
      .map(function (e) { return e.getAttribute('data-label') + ': ' + e.value; }).join('\n');
  }
  // Даты заезда не раньше сегодня; кнопка «Забронювати» у номера подставляет номер в форму
  var today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type=date]').forEach(function (i) { i.min = today; });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-room]'), sel = document.querySelector('select[name=room]');
    if (a && sel) sel.value = a.getAttribute('data-room');
  });
  document.querySelectorAll('[data-lead]').forEach(function (form) {
    var err = form.querySelector('[data-err]'), btn = form.querySelector('[type=submit]');
    form.addEventListener('submit', function () {
      var name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim();
      var msg = !name ? form.elements.name : phone.replace(/\D/g, '').length < 9 ? form.elements.phone : null;
      if (msg) {
        err.textContent = msg.name === 'name' ? cfg.t.err_name : cfg.t.err_phone;
        err.hidden = false; msg.focus(); return;
      }
      err.hidden = true;
      var data = {
        name: name, phone: phone, source: form.getAttribute('data-lead'),
        service: form.elements.service ? form.elements.service.value : '',
        answers: answersOf(form) || detailsOf(form), page: cfg.page,
        utm: [utm.utm_source, utm.utm_medium, utm.utm_campaign, utm.utm_term].filter(Boolean).join(' / '),
        ab_variant: variant
      };
      track('generate_lead', { method: 'form', source: data.source });
      var thanks = form.parentNode.querySelector('[data-thanks]');
      function done() { form.hidden = true; if (thanks) { thanks.hidden = false; thanks.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
      if (!L.endpoint && !L.web3forms) {
        if (cfg.wa) {
          var text = cfg.msg + tag + '\n' + name + ', ' + phone + (data.service ? '\n' + data.service : '') + (data.answers ? '\n' + data.answers : '');
          window.open(wa(text), '_blank');
        }
        return done();
      }
      btn.disabled = true; btn.textContent = cfg.t.sending;
      sendLead(data).then(done, done);
    });
  });

  // Квиз: шаги
  var form = document.querySelector('[data-quiz-form]');
  if (form) {
    var steps = [].slice.call(form.querySelectorAll('.qstep')), i = 0, started = false;
    var prev = form.querySelector('[data-prev]'), next = form.querySelector('[data-next]');
    form.classList.add('js');
    function show() {
      steps.forEach(function (s, n) { s.hidden = n !== i; });
      prev.hidden = i === 0;
      next.hidden = i >= steps.length - 1;
      if (i === steps.length - 1) track('quiz_contacts');
    }
    function answered() { return !steps[i].querySelector('.opts') || steps[i].querySelector('input:checked'); }
    next.addEventListener('click', function () {
      if (!answered()) { steps[i].classList.add('need'); return; }
      steps[i].classList.remove('need'); i++; show();
    });
    prev.addEventListener('click', function () { i--; show(); });
    form.addEventListener('change', function (e) {
      if (!started) { started = true; track('quiz_start'); }
      if (e.target.type === 'radio' && i < steps.length - 1) setTimeout(function () { i++; show(); }, 200);
    });
    show();
  }
})();
