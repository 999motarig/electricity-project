const defaultCredentials = {
  manager: { username: 'manager', password: '123456' },
  planning: { username: 'planning', password: '123456' },
  projects: { username: 'projects', password: '123456' },
};

const themeToggle = document.querySelector('#themeToggle');
const navLinks = document.querySelectorAll('.nav-link');
const archiveSearch = document.querySelector('#archiveSearch');
const archiveRows = document.querySelectorAll('#archiveTable tr');
const planningOrders = [];
const projectReports = [];

function getCredentials(section) {
  const saved = localStorage.getItem(`${section}Credentials`);
  return saved ? JSON.parse(saved) : defaultCredentials[section];
}

function saveCredentials(section, username, password) {
  localStorage.setItem(`${section}Credentials`, JSON.stringify({ username, password }));
}

function setMessage(elementId, text, type = '') {
  const element = document.querySelector(`#${elementId}`);
  element.textContent = text;
  element.className = `form-message ${type}`.trim();
}

function openProtectedSection(section) {
  const content = document.querySelector(`#${section}Content`);
  const status = document.querySelector(`#${section}Status`);
  content.hidden = false;
  status.textContent = 'مفتوح';
  status.classList.add('open');
}

function validateLogin(section, username, password) {
  const credentials = getCredentials(section);
  return username === credentials.username && password === credentials.password;
}

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

document.querySelector('#managerLoginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#managerUsername').value.trim();
  const password = document.querySelector('#managerPassword').value;

  if (validateLogin('manager', username, password)) {
    openProtectedSection('planning');
    openProtectedSection('projects');
    setMessage('managerLoginMessage', 'تم تسجيل دخول مدير المشروع وفتح جميع الأقسام.', 'success');
    return;
  }

  setMessage('managerLoginMessage', 'اسم المستخدم أو كلمة السر غير صحيحة.', 'error');
});

document.querySelector('#managerCredentialsForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#managerNewUsername').value.trim();
  const password = document.querySelector('#managerNewPassword').value;
  saveCredentials('manager', username, password);
  setMessage('managerCredentialsMessage', 'تم تحديث بيانات مدير المشروع بنجاح.', 'success');
  event.target.reset();
});

['planning', 'projects'].forEach((section) => {
  document.querySelector(`#${section}LoginForm`).addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.querySelector(`#${section}Username`).value.trim();
    const password = document.querySelector(`#${section}Password`).value;

    if (validateLogin(section, username, password)) {
      openProtectedSection(section);
      setMessage(`${section}LoginMessage`, 'تم فتح القسم بنجاح.', 'success');
      return;
    }

    setMessage(`${section}LoginMessage`, 'بيانات الدخول غير صحيحة.', 'error');
  });

  document.querySelector(`#${section}CredentialsForm`).addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.querySelector(`#${section}NewUsername`).value.trim();
    const password = document.querySelector(`#${section}NewPassword`).value;
    saveCredentials(section, username, password);
    setMessage(`${section}CredentialsMessage`, 'تم تحديث اسم المستخدم وكلمة المرور.', 'success');
    event.target.reset();
  });
});

function fileSummary(fileInput) {
  if (!fileInput.files.length) return 'لا يوجد';
  return `${fileInput.files.length} ملف`;
}

function renderPlanningOrders() {
  const table = document.querySelector('#planningOrdersTable');
  table.innerHTML = planningOrders.map((order) => `
    <tr>
      <td>${order.category}</td>
      <td>${order.workNumber}</td>
      <td>${order.workType}</td>
      <td>${order.receivedDate}</td>
      <td>${order.executionDate}</td>
      <td>${order.attachments}</td>
    </tr>
  `).join('');
}

function handleWorkOrderSubmit(event, category) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  planningOrders.unshift({
    category,
    workNumber: data.get('workNumber'),
    workType: data.get('workType'),
    receivedDate: data.get('receivedDate'),
    executionDate: data.get('executionDate'),
    attachments: `${fileSummary(form.elements.executionImages)} صور / ${fileSummary(form.elements.workPdf)} PDF`,
  });
  renderPlanningOrders();
  form.reset();
}

document.querySelector('#constructionForm').addEventListener('submit', (event) => handleWorkOrderSubmit(event, 'إنشاءات'));
document.querySelector('#maintenanceForm').addEventListener('submit', (event) => handleWorkOrderSubmit(event, 'صيانة'));

document.querySelector('#projectWorkForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  projectReports.unshift({
    number: data.get('projectOrderNumber'),
    type: data.get('projectWorkType'),
    images: fileSummary(form.elements.dailyImages),
    report: data.get('dailyReport'),
    date: new Date().toLocaleDateString('ar-SA'),
  });

  const list = document.querySelector('#projectReportsList');
  list.innerHTML = projectReports.map((report) => `
    <article>
      <strong>${report.number} · ${report.type}</strong>
      <small>${report.date} · صور أعمال اليوم: ${report.images}</small>
      <p>${report.report}</p>
    </article>
  `).join('');
  form.reset();
});
