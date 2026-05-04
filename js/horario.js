function toggleDia(btn) {
  const clases = btn.nextElementSibling;
  const isOpen = clases.classList.contains('open');

  // Cerrar todos
  document.querySelectorAll('.dia-clases').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('active'));

  // Abrir el clicado si estaba cerrado
  if (!isOpen) {
    clases.classList.add('open');
    btn.classList.add('active');
  }
}