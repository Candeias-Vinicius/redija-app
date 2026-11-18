// Aplica o tema antes da primeira pintura para evitar o "flash" de tema claro.
// Arquivo externo (e não inline) por causa da Content-Security-Policy (script-src 'self').
(function () {
  try {
    var saved = localStorage.getItem('redija:darkMode');
    var prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === '1' || (saved === null && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // localStorage indisponível (modo privado/sandbox): mantém o tema claro
  }
})();
