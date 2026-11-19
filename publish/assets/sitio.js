/* Zinguería Servizing · enlaces robustos en cualquier contexto.
   Si la página se abrió como archivo (file://) o como ".../index.html" (hosting sin "index automático"
   de carpetas), todos los enlaces internos a carpetas pasan a apuntar al index.html explícito.
   En un hosting normal (URL limpia) no toca nada, así las URLs siguen siendo las de siempre. */
(function () {
    var explicito = location.protocol === 'file:' || /\.html?$/i.test(location.pathname);
    if (!explicito) return;

    function arreglar(a) {
        var h = a.getAttribute('href');
        if (!h || /^(#|[a-z][a-z0-9+.-]*:)/i.test(h)) return;      // anclas y enlaces externos
        var m = h.match(/^([^?#]*)([?#][\s\S]*)?$/);
        var ruta = m[1], resto = m[2] || '';
        if (!ruta) return;
        if (ruta === '.' || ruta === '..') ruta += '/';
        if (ruta.charAt(ruta.length - 1) === '/') a.setAttribute('href', ruta + 'index.html' + resto);
    }
    function recorrer(raiz) {
        if (raiz.nodeType !== 1) return;
        if (raiz.tagName === 'A') arreglar(raiz);
        var l = raiz.querySelectorAll ? raiz.querySelectorAll('a[href]') : [];
        for (var i = 0; i < l.length; i++) arreglar(l[i]);
    }
    try {
        new MutationObserver(function (ms) {
            for (var i = 0; i < ms.length; i++)
                for (var j = 0; j < ms[i].addedNodes.length; j++) recorrer(ms[i].addedNodes[j]);
        }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { }
    document.addEventListener('DOMContentLoaded', function () { recorrer(document.documentElement); });
})();
