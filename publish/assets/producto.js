/* Zinguería Servizing · página de producto
   - Elegir variación + cantidad y agregar al carrito
   - Carrito compartido con la tienda estándar (misma clave en localStorage)
   - Enviar pedido por WhatsApp (mismo formato que la tienda) */
(function () {
    'use strict';

    var KEY = 'servizing_carrito_v1';          // la MISMA clave que usa tienda-zingueria/index.html
    var TEL = '5491138835229';
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };

    /* ---------- datos de la página + catálogo ---------- */
    var data = {};
    try { data = JSON.parse($('pp-data').textContent) || {}; } catch (e) { }
    var vars = data.variantes || [];
    var cat = window.SERVIZING_CATALOGO || {};
    vars.forEach(function (v) { if (!cat[v.id]) cat[v.id] = v.nombre; });   // por si catalogo.js no cargó
    var nombreDe = function (id) { return cat[id] || ''; };

    /* ---------- almacenamiento (con respaldo si localStorage está bloqueado) ---------- */
    var lsOk = (function () {
        try { localStorage.setItem('__sz', '1'); localStorage.removeItem('__sz'); return true; } catch (e) { return false; }
    })();
    function leer() {
        try {
            if (lsOk) { var c = JSON.parse(localStorage.getItem(KEY)); return c && typeof c === 'object' ? c : {}; }
            var w = JSON.parse(window.name); return (w && w.szCarrito) || {};
        } catch (e) { return {}; }
    }
    function guardar(c) {
        try {
            if (lsOk) localStorage.setItem(KEY, JSON.stringify(c));
            else window.name = JSON.stringify({ szCarrito: c });
        } catch (e) { }
    }

    var carrito = leer();

    function lineas() {
        return Object.keys(carrito)
            .filter(function (id) { return carrito[id] > 0 && nombreDe(id); })
            .map(function (id) { return { id: id, nombre: nombreDe(id), cant: carrito[id] }; });
    }

    function render() {
        carrito = leer();
        var ls = lineas();
        var unidades = ls.reduce(function (s, l) { return s + l.cant; }, 0);
        $('cart-items').innerHTML = ls.length
            ? ls.map(function (l) {
                return '<div class="cart-item"><div><h3 class="ci-nombre">' + esc(l.nombre) + '</h3>' +
                    '<div class="ci-detalle">x' + l.cant + '</div></div>' +
                    '<button type="button" class="ci-quitar" data-id="' + esc(l.id) + '">Quitar</button></div>';
            }).join('')
            : '<div class="cart-vacio">Todavía no agregaste productos</div>';
        var b = $('cart-badge');
        b.textContent = unidades;
        b.classList.toggle('vacio', unidades === 0);
    }

    function agregar(id, n) {
        carrito = leer();
        carrito[id] = (carrito[id] || 0) + n;
        guardar(carrito);
        render();
    }
    function quitar(id) {
        carrito = leer();
        if (!carrito[id]) return;
        carrito[id]--;
        if (carrito[id] <= 0) delete carrito[id];
        guardar(carrito);
        render();
    }

    $('cart-items').addEventListener('click', function (e) {
        var b = e.target.closest('.ci-quitar');
        if (b) quitar(b.getAttribute('data-id'));
    });

    /* ---------- panel del carrito ---------- */
    function posicionarPanel() {
        var h = document.querySelector('header');
        var top = h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0;
        $('cart-panel').style.top = top + 'px';
        $('cart-overlay').style.top = top + 'px';
    }
    function abrirCarrito() {
        posicionarPanel();
        $('cart-panel').classList.add('abierto');
        $('cart-overlay').classList.add('abierto');
    }
    function cerrarCarrito() {
        $('cart-panel').classList.remove('abierto');
        $('cart-overlay').classList.remove('abierto');
    }
    $('cart-fab').addEventListener('click', function () {
        $('cart-panel').classList.contains('abierto') ? cerrarCarrito() : abrirCarrito();
    });
    $('cart-overlay').addEventListener('click', cerrarCarrito);
    $('cart-close').addEventListener('click', cerrarCarrito);
    window.addEventListener('resize', function () {
        if ($('cart-panel').classList.contains('abierto')) posicionarPanel();
    }, { passive: true });

    $('cart-enviar').addEventListener('click', function () {
        var ls = lineas();
        var inp = $('cart-nombre'), err = $('cart-error');
        var nombre = inp.value.trim();
        inp.classList.remove('error');
        err.textContent = '';
        if (!ls.length) { err.textContent = 'Agregá al menos un producto.'; return; }
        if (!nombre) {
            inp.classList.add('error');
            err.textContent = 'Ingresá tu nombre y apellido.';
            inp.focus();
            return;
        }
        var msg = 'Hola! Quisiera hacer el siguiente pedido de la tienda estándar:\n\n';
        ls.forEach(function (l) { msg += '• ' + l.cant + ' x ' + l.nombre + '\n'; });
        msg += '\nNombre y apellido: ' + nombre;
        var url = 'https://api.whatsapp.com/send?phone=' + TEL + '&text=' + encodeURIComponent(msg);
        if (!window.open(url, '_blank')) location.href = url;     // si el navegador bloquea la ventana, abre en la misma
    });

    /* ---------- notificación "Agregado a tu pedido" ---------- */
    var aviso = $('ux-toast'), tAviso = 0;
    function avisar(n) {
        if (!aviso) return;
        aviso.innerHTML = '<span class="ux-t-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 7.8"/></svg></span>' +
            '<span class="ux-t-txt"><b>Agregado a tu pedido</b><small>' + n + (n === 1 ? ' unidad' : ' unidades') + ' \u00b7 <em>Ver pedido</em></small></span>';
        aviso.classList.remove('on'); void aviso.offsetWidth; aviso.classList.add('on');
        clearTimeout(tAviso); tAviso = setTimeout(function () { aviso.classList.remove('on'); }, 2600);
    }
    if (aviso) aviso.addEventListener('click', function () { aviso.classList.remove('on'); abrirCarrito(); });

    /* ---------- variación + cantidad ---------- */
    var selId = vars.length === 1 ? String(vars[0].id) : '';
    var cant = 1;

    var btn = $('pp-var-btn');           // solo existe si el producto tiene más de una variación
    var panel = $('pp-var-panel');
    var lista = $('pp-var-list');
    var ovl = $('pp-var-overlay');
    var mqMovil = window.matchMedia ? window.matchMedia('(max-width:767px)') : { matches: false };
    var CK = '<svg class="icon-svg mv-ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 16.6 4.9 12.3l-1.9 1.9 6.2 6.2L21 8.6l-1.9-1.9z"/></svg>';

    function renderSelect() {
        if (!btn) return;
        var sel = vars.filter(function (v) { return String(v.id) === selId; })[0];
        var lbl = $('pp-var-label');
        lbl.textContent = sel ? sel.nombre : 'Seleccione la opción';
        lbl.classList.toggle('vacio', !sel);
        lista.innerHTML = vars.map(function (v) {
            var act = sel && String(v.id) === String(sel.id);
            return '<li role="presentation"><button type="button" role="option" class="mv-opt' + (act ? ' activo' : '') +
                '" aria-selected="' + (act ? 'true' : 'false') + '" data-id="' + esc(v.id) + '"><span class="mv-t">' +
                esc(v.nombre) + '</span>' + CK + '</button></li>';
        }).join('');
    }
    var selAbierto = function () { return panel.classList.contains('abierto'); };

    function abrirSelect() {
        lista.style.maxHeight = '';
        panel.classList.remove('arriba');
        if (!mqMovil.matches) {                       // escritorio: se abre hacia donde haya lugar
            var r = btn.getBoundingClientRect();
            var abajo = window.innerHeight - r.bottom - 20, arriba = r.top - 20;
            var subir = abajo < 160 && arriba > abajo;
            lista.style.maxHeight = Math.max(120, Math.min(240, (subir ? arriba : abajo) - 6)) + 'px';
            panel.classList.toggle('arriba', subir);
        }
        panel.classList.add('abierto');
        ovl.classList.add('abierto');
        btn.setAttribute('aria-expanded', 'true');
        var op = lista.querySelector('.mv-opt.activo') || lista.querySelector('.mv-opt');
        if (op) {
            try { op.focus({ preventScroll: true }); } catch (e) { op.focus(); }
            lista.scrollTop = Math.max(0, op.offsetTop - lista.clientHeight / 2 + op.offsetHeight / 2);
        }
    }
    function cerrarSelect(foco) {
        if (!btn || !selAbierto()) return;
        panel.classList.remove('abierto');
        ovl.classList.remove('abierto');
        btn.setAttribute('aria-expanded', 'false');
        if (foco) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
    }

    if (btn) {
        renderSelect();
        btn.addEventListener('click', function () { selAbierto() ? cerrarSelect() : abrirSelect(); });
        ovl.addEventListener('click', function () { cerrarSelect(true); });
        $('pp-var-x').addEventListener('click', function () { cerrarSelect(true); });
        lista.addEventListener('click', function (e) {
            var b = e.target.closest('.mv-opt');
            if (!b) return;
            selId = b.getAttribute('data-id');
            renderSelect();
            cerrarSelect(true);
        });
        $('pp-var-select').addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && selAbierto()) { e.stopPropagation(); cerrarSelect(true); return; }
            var ops = Array.prototype.slice.call(lista.querySelectorAll('.mv-opt'));
            var i = ops.indexOf(document.activeElement);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!selAbierto()) { abrirSelect(); return; }
                var n = e.key === 'ArrowDown' ? Math.min(ops.length - 1, i + 1) : Math.max(0, i - 1);
                if (ops[n]) ops[n].focus();
            } else if (selAbierto() && (e.key === 'Home' || e.key === 'End')) {
                e.preventDefault();
                (e.key === 'Home' ? ops[0] : ops[ops.length - 1]).focus();
            } else if (e.key === 'Tab' && selAbierto()) {
                cerrarSelect();
            }
        });
        if (mqMovil.addEventListener) mqMovil.addEventListener('change', function () { cerrarSelect(); });
    }

    function pintarCant() { $('pp-qty').textContent = cant; }
    $('pp-menos').addEventListener('click', function () { cant = Math.max(1, cant - 1); pintarCant(); });
    $('pp-mas').addEventListener('click', function () { cant = Math.min(999, cant + 1); pintarCant(); });

    var add = $('pp-add'), timer = 0;
    add.addEventListener('click', function () {
        if (!selId) {                                  // falta elegir la variación
            btn.classList.add('error');
            setTimeout(function () { btn.classList.remove('error'); }, 1500);
            abrirSelect();
            return;
        }
        agregar(selId, cant);
        avisar(lineas().reduce(function (s, l) { return s + l.cant; }, 0));
        cant = 1; pintarCant();
        add.classList.add('ok');
        add.textContent = 'AGREGADO';
        clearTimeout(timer);
        timer = setTimeout(function () { add.classList.remove('ok'); add.textContent = 'AGREGAR AL CARRITO'; }, 1100);
        var f = $('cart-fab');
        f.classList.remove('pp-bump'); void f.offsetWidth; f.classList.add('pp-bump');
    });

    /* ---------- mantener el carrito al día (otra pestaña, botón "atrás", etc.) ---------- */
    window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) render(); });
    window.addEventListener('pageshow', render);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });

    /* ---------- imagen ampliada y menú móvil ---------- */
    var lb = $('pp-lb'), zoom = document.querySelector('.pp-zoom'), mb = $('mobile-menu-btn');
    function abrirLb() { lb.classList.add('on'); document.documentElement.style.overflow = 'hidden'; }
    function cerrarLb() { lb.classList.remove('on'); document.documentElement.style.overflow = ''; }
    if (zoom && lb) { zoom.addEventListener('click', abrirLb); lb.addEventListener('click', cerrarLb); }
    if (mb) mb.addEventListener('click', function () { $('mobile-menu').classList.toggle('hidden'); });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (lb) cerrarLb();
        cerrarCarrito();
    });

    render();
})();
