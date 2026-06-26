const themeToggle = document.querySelector('#themeToggle');
const navLinks = document.querySelectorAll('.nav-link');
const archiveSearch = document.querySelector('#archiveSearch');
const archiveRows = document.querySelectorAll('#archiveTable tr');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

archiveSearch.addEventListener('input', (event) => {
  const term = event.target.value.trim().toLowerCase();
  archiveRows.forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
});
