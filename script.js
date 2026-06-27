const state = JSON.parse(localStorage.getItem('electricityContractSystem')) || {
  manager: { username: 'manager', password: '123456' },
  construction: [],
  maintenance: [],
  projects: [],
  users: [
    { username: 'planning', password: '123456', role: 'مستخدم قسم التخطيط والإنشاءات', perms: ['الإنشاءات', 'الصيانة', 'المشاريع'] },
    { username: 'projects', password: '123456', role: 'مستخدم قسم المشاريع', perms: ['المشاريع'] },
    { username: 'admin', password: '123456', role: 'صلاحية كاملة لكل النظام', perms: ['كل النظام'] },
  ],
};

const save = () => localStorage.setItem('electricityContractSystem', JSON.stringify(state));
const $ = (selector) => document.querySelector(selector);
const fileNames = (input) => [...input.files].map((file) => file.name);
const statusClass = (status) => status === 'مكتمل' ? 'done' : status === 'جاري التنفيذ' ? '' : 'late';

document.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('nav a').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));

$('#themeToggle').addEventListener('click', () => document.body.classList.toggle('dark'));

$('#managerForm').addEventListener('submit', (event) => {
  event.preventDefault();
  state.manager.username = $('#managerUsername').value.trim();
  state.manager.password = $('#managerPassword').value;
  $('#activeUser').textContent = state.manager.username;
  $('#managerMessage').textContent = 'تم حفظ بيانات مدير المشروع وتحديث كلمة المرور.';
  $('#managerMessage').classList.add('success-text');
  save();
});

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.tab}`).classList.add('active');
}));

function collectWorkOrder(form, category) {
  const data = new FormData(form);
  return {
    id: crypto.randomUUID(),
    category,
    number: data.get('number'),
    type: data.get('type'),
    receiveDate: data.get('receiveDate'),
    executeDate: data.get('executeDate'),
    status: data.get('status'),
    images: fileNames(form.elements.images),
    pdf: fileNames(form.elements.pdf)[0] || '',
    notes: data.get('notes') || '',
  };
}

function bindWorkForm(formId, collection) {
  $(formId).addEventListener('submit', (event) => {
    event.preventDefault();
    state[collection].unshift(collectWorkOrder(event.target, collection === 'construction' ? 'إنشاءات' : 'صيانة'));
    event.target.reset();
    save();
    renderAll();
  });
}

bindWorkForm('#constructionForm', 'construction');
bindWorkForm('#maintenanceForm', 'maintenance');

function renderWorkOrders(collection) {
  const search = $(`#${collection}Search`).value.trim();
  const date = $(`#${collection}Date`).value;
  const rows = state[collection]
    .filter((item) => !search || item.number.includes(search))
    .filter((item) => !date || item.receiveDate === date || item.executeDate === date)
    .map((item) => `<tr>
      <td>${item.number}</td><td>${item.type}</td><td>${item.receiveDate}</td><td>${item.executeDate}</td>
      <td><span class="status ${statusClass(item.status)}">${item.status}</span></td>
      <td>${item.pdf ? `<button data-action="pdf" data-id="${item.id}" data-col="${collection}">فتح PDF</button>` : 'لا يوجد'}</td>
      <td>${item.images.length ? `<button data-action="images" data-id="${item.id}" data-col="${collection}">مشاهدة الصور (${item.images.length})</button>` : 'لا يوجد'}</td>
      <td><button data-action="edit" data-id="${item.id}" data-col="${collection}">تعديل</button> <button data-action="delete" data-id="${item.id}" data-col="${collection}">حذف</button></td>
    </tr>`).join('');
  $(`#${collection}Table`).innerHTML = rows || '<tr><td colspan="8">لا توجد أوامر مطابقة.</td></tr>';
}

['constructionSearch', 'constructionDate', 'maintenanceSearch', 'maintenanceDate'].forEach((id) => {
  $(`#${id}`).addEventListener('input', renderAll);
});

document.querySelectorAll('[data-clear]').forEach((button) => button.addEventListener('click', () => {
  const collection = button.dataset.clear;
  $(`#${collection}Search`).value = '';
  $(`#${collection}Date`).value = '';
  renderAll();
}));

$('#projectForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  state.projects.unshift({
    id: crypto.randomUUID(),
    number: data.get('number'),
    type: data.get('type'),
    name: data.get('name'),
    startDate: data.get('startDate'),
    status: data.get('status'),
    dayDate: data.get('dayDate'),
    images: fileNames(event.target.elements.images),
    progress: data.get('progress'),
    report: data.get('report'),
    notes: data.get('notes'),
  });
  event.target.reset();
  save();
  renderAll();
});

$('#userForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  state.users.unshift({ username: data.get('username'), password: data.get('password'), role: data.get('role'), perms: data.getAll('perm') });
  event.target.reset();
  save();
  renderAll();
});

function showDetails(title, content) {
  $('#detailsBody').innerHTML = `<h3>${title}</h3>${content}`;
  $('#detailsDialog').showModal();
}

document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const collection = actionButton.dataset.col;
  const item = state[collection].find((entry) => entry.id === actionButton.dataset.id);
  if (actionButton.dataset.action === 'delete') {
    state[collection] = state[collection].filter((entry) => entry.id !== item.id);
    save(); renderAll(); return;
  }
  if (actionButton.dataset.action === 'pdf') showDetails('ملف PDF', `<p>${item.pdf}</p><p>في النسخة النهائية يفتح الملف من الخادم.</p>`);
  if (actionButton.dataset.action === 'images') showDetails('صور التنفيذ', `<ul>${item.images.map((name) => `<li>${name}</li>`).join('')}</ul>`);
  if (actionButton.dataset.action === 'edit') showDetails('تعديل الأمر', `<p>يمكن للمدير تعديل السجل من قاعدة البيانات في النسخة المتكاملة.</p><pre>${JSON.stringify(item, null, 2)}</pre>`);
});

function renderProjects() {
  $('#projectReports').innerHTML = state.projects.map((project) => `<article class="report">
    <h3>${project.name} - ${project.number}</h3>
    <p><strong>${project.type}</strong> · ${project.dayDate} · <span class="status ${statusClass(project.status)}">${project.status}</span></p>
    <progress value="${project.progress}" max="100"></progress><small>${project.progress}%</small>
    <p>${project.report}</p><small>ملاحظات: ${project.notes || 'لا يوجد'} · صور اليوم: ${project.images.length}</small>
  </article>`).join('') || '<article class="report">لا توجد تقارير مشاريع بعد.</article>';
}

function renderUsers() {
  $('#usersTable').innerHTML = state.users.map((user, index) => `<tr><td>${user.username}</td><td>${user.role}</td><td>${user.perms.join('، ') || 'بدون'}</td><td><button onclick="state.users.splice(${index},1);save();renderAll();">حذف</button></td></tr>`).join('');
}

function renderFiles() {
  const orders = [...state.construction, ...state.maintenance];
  const files = orders.flatMap((order) => [
    ...order.images.map((name) => ({ type: 'صورة', name, order: order.number })),
    ...(order.pdf ? [{ type: 'PDF', name: order.pdf, order: order.number }] : []),
  ]);
  $('#filesGrid').innerHTML = files.map((file) => `<article class="file-card"><strong>${file.type}</strong><p>${file.name}</p><small>مرتبط بالأمر: ${file.order}</small></article>`).join('') || '<article class="file-card">لا توجد ملفات مرفوعة بعد.</article>';
}

function renderAll() {
  $('#constructionCount').textContent = state.construction.length;
  $('#maintenanceCount').textContent = state.maintenance.length;
  $('#projectCount').textContent = state.projects.length;
  renderWorkOrders('construction');
  renderWorkOrders('maintenance');
  renderProjects();
  renderUsers();
  renderFiles();
}

renderAll();
