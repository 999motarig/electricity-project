const DEPARTMENTS = ['المشاريع', 'الإنشاءات', 'الصيانة', 'كل النظام'];
const ADMIN_ROLES = ['admin'];

const state = JSON.parse(localStorage.getItem('electricityContractSystem')) || {
  manager: { username: 'manager', password: '123456', role: 'admin', perms: ['كل النظام'] },
  construction: [],
  maintenance: [],
  projects: [],
  users: [
    { username: 'admin', password: '123456', role: 'admin', perms: ['كل النظام'] },
    { username: 'engineer', password: '123456', role: 'engineer', perms: ['الإنشاءات', 'الصيانة', 'المشاريع'] },
    { username: 'project', password: '123456', role: 'prohect Engineer', perms: ['المشاريع'] },
  ],
};

let currentSession = JSON.parse(localStorage.getItem('currentElectricityUser')) || {
  username: state.manager.username,
  role: state.manager.role,
  perms: state.manager.perms,
};

const save = () => localStorage.setItem('electricityContractSystem', JSON.stringify(state));
const saveSession = () => localStorage.setItem('currentElectricityUser', JSON.stringify(currentSession));
const $ = (selector) => document.querySelector(selector);
const fileNames = (input) => [...input.files].map((file) => file.name);
const statusClass = (status) => status === 'مكتمل' ? 'done' : status === 'جاري التنفيذ' ? '' : 'late';
const isAdmin = (session = currentSession) => session.role === 'admin' || session.perms.includes('كل النظام');
const normalizePerms = (perms = []) => perms.includes('كل النظام') ? ['كل النظام'] : perms.filter((perm) => DEPARTMENTS.includes(perm));
const canAccessDepartment = (department, session = currentSession) => isAdmin(session) || normalizePerms(session.perms).includes(department);

state.manager.role ||= 'admin';
state.manager.perms ||= ['كل النظام'];
state.construction.forEach((record) => { record.department ||= 'الإنشاءات'; });
state.maintenance.forEach((record) => { record.department ||= 'الصيانة'; });
state.projects.forEach((record) => { record.department ||= 'المشاريع'; });
save();


function recordDepartment(collection) {
  if (collection === 'construction') return 'الإنشاءات';
  if (collection === 'maintenance') return 'الصيانة';
  return 'المشاريع';
}

function filterByAccess(records) {
  if (isAdmin()) return records;
  return records.filter((record) => canAccessDepartment(record.department));
}

function updateAccessUI() {
  $('#activeUser').textContent = currentSession.username;
  $('#activeRole').textContent = `${currentSession.role} · ${currentSession.perms.join('، ')}`;
  document.querySelectorAll('nav a[data-department]').forEach((link) => {
    const departments = link.dataset.department.split(',');
    const allowed = isAdmin() || departments.some((department) => canAccessDepartment(department));
    link.classList.toggle('is-hidden-by-permission', !allowed);
  });
  document.querySelector('#manager').classList.toggle('is-hidden-by-permission', !isAdmin());
  document.querySelector('#users').classList.toggle('is-hidden-by-permission', !isAdmin());
  document.querySelector('#constructionTab').classList.toggle('is-hidden-by-permission', !canAccessDepartment('الإنشاءات'));
  document.querySelector('[data-tab="constructionTab"]').classList.toggle('is-hidden-by-permission', !canAccessDepartment('الإنشاءات'));
  document.querySelector('#maintenanceTab').classList.toggle('is-hidden-by-permission', !canAccessDepartment('الصيانة'));
  document.querySelector('[data-tab="maintenanceTab"]').classList.toggle('is-hidden-by-permission', !canAccessDepartment('الصيانة'));
  document.querySelector('#projects').classList.toggle('is-hidden-by-permission', !canAccessDepartment('المشاريع'));

  const activeTab = document.querySelector('.tab.active:not(.is-hidden-by-permission)');
  if (!activeTab) {
    const firstVisibleTab = document.querySelector('.tab:not(.is-hidden-by-permission)');
    document.querySelectorAll('.tab,.tab-panel').forEach((item) => item.classList.remove('active'));
    if (firstVisibleTab) {
      firstVisibleTab.classList.add('active');
      $(`#${firstVisibleTab.dataset.tab}`).classList.add('active');
    }
  }
}

function login(username, password) {
  const users = [state.manager, ...state.users];
  const user = users.find((entry) => entry.username === username && entry.password === password);
  if (!user) return false;
  currentSession = { username: user.username, role: user.role || 'admin', perms: normalizePerms(user.perms || ['كل النظام']) };
  saveSession();
  updateAccessUI();
  renderAll();
  return true;
}

document.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('nav a').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));

$('#themeToggle').addEventListener('click', () => document.body.classList.toggle('dark'));

$('#loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  if (!login(data.get('username').trim(), data.get('password'))) alert('بيانات الدخول غير صحيحة أو لا توجد صلاحية.');
  event.target.reset();
});

$('#logoutButton').addEventListener('click', () => {
  localStorage.removeItem('currentElectricityUser');
  currentSession = { username: state.manager.username, role: state.manager.role, perms: state.manager.perms };
  saveSession();
  updateAccessUI();
  renderAll();
});

$('#managerForm').addEventListener('submit', (event) => {
  event.preventDefault();
  state.manager.username = $('#managerUsername').value.trim();
  state.manager.password = $('#managerPassword').value;
  state.manager.role = 'admin';
  state.manager.perms = ['كل النظام'];
  currentSession = { username: state.manager.username, role: 'admin', perms: ['كل النظام'] };
  save();
  saveSession();
  updateAccessUI();
  $('#managerMessage').textContent = 'تم حفظ بيانات مدير المشروع وتحديث كلمة المرور.';
  $('#managerMessage').classList.add('success-text');
});

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  if (tab.classList.contains('is-hidden-by-permission')) return;
  document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.tab}`).classList.add('active');
}));

function collectWorkOrder(form, collection) {
  const data = new FormData(form);
  return {
    id: crypto.randomUUID(),
    department: recordDepartment(collection),
    category: collection === 'construction' ? 'إنشاءات' : 'صيانة',
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
    if (!canAccessDepartment(recordDepartment(collection))) return alert('ليست لديك صلاحية لإضافة بيانات هذا القسم.');
    state[collection].unshift(collectWorkOrder(event.target, collection));
    event.target.reset();
    save();
    renderAll();
  });
}

bindWorkForm('#constructionForm', 'construction');
bindWorkForm('#maintenanceForm', 'maintenance');

function renderWorkOrders(collection) {
  const department = recordDepartment(collection);
  const search = $(`#${collection}Search`).value.trim();
  const date = $(`#${collection}Date`).value;
  const rows = filterByAccess(state[collection])
    .filter((item) => item.department === department)
    .filter((item) => !search || item.number.includes(search))
    .filter((item) => !date || item.receiveDate === date || item.executeDate === date)
    .map((item) => `<tr>
      <td>${item.number}</td><td>${item.type}</td><td>${item.receiveDate}</td><td>${item.executeDate}</td>
      <td><span class="status ${statusClass(item.status)}">${item.status}</span></td>
      <td>${item.pdf ? `<button data-action="pdf" data-id="${item.id}" data-col="${collection}">فتح PDF</button>` : 'لا يوجد'}</td>
      <td>${item.images.length ? `<button data-action="images" data-id="${item.id}" data-col="${collection}">مشاهدة الصور (${item.images.length})</button>` : 'لا يوجد'}</td>
      <td><button data-action="edit" data-id="${item.id}" data-col="${collection}">تعديل</button> <button data-action="delete" data-id="${item.id}" data-col="${collection}">حذف</button></td>
    </tr>`).join('');
  $(`#${collection}Table`).innerHTML = rows || '<tr><td colspan="8">لا توجد أوامر مطابقة لصلاحياتك.</td></tr>';
}

['constructionSearch', 'constructionDate', 'maintenanceSearch', 'maintenanceDate'].forEach((id) => $(`#${id}`).addEventListener('input', renderAll));

document.querySelectorAll('[data-clear]').forEach((button) => button.addEventListener('click', () => {
  const collection = button.dataset.clear;
  $(`#${collection}Search`).value = '';
  $(`#${collection}Date`).value = '';
  renderAll();
}));

$('#projectForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!canAccessDepartment('المشاريع')) return alert('ليست لديك صلاحية لإضافة بيانات المشاريع.');
  const data = new FormData(event.target);
  state.projects.unshift({
    id: crypto.randomUUID(),
    department: 'المشاريع',
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
  if (!isAdmin()) return alert('إضافة المستخدمين متاحة للمدير فقط.');
  const data = new FormData(event.target);
  state.users.unshift({ username: data.get('username'), password: data.get('password'), role: data.get('role'), perms: normalizePerms(data.getAll('perm')) });
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
  if (!item || !canAccessDepartment(item.department)) return alert('لا يمكنك الوصول إلى هذا السجل.');
  if (actionButton.dataset.action === 'delete') {
    if (!isAdmin()) return alert('الحذف متاح للمدير فقط.');
    state[collection] = state[collection].filter((entry) => entry.id !== item.id);
    save(); renderAll(); return;
  }
  if (actionButton.dataset.action === 'pdf') showDetails('ملف PDF', `<p>${item.pdf}</p><p>في النسخة النهائية يفتح الملف من الخادم.</p>`);
  if (actionButton.dataset.action === 'images') showDetails('صور التنفيذ', `<ul>${item.images.map((name) => `<li>${name}</li>`).join('')}</ul>`);
  if (actionButton.dataset.action === 'edit') showDetails('تعديل الأمر', `<p>يعرض هذا السجل لأنه ضمن صلاحيات المستخدم الحالية.</p><pre>${JSON.stringify(item, null, 2)}</pre>`);
});

function renderProjects() {
  $('#projectReports').innerHTML = filterByAccess(state.projects).map((project) => `<article class="report">
    <h3>${project.name} - ${project.number}</h3>
    <p><strong>${project.type}</strong> · ${project.dayDate} · <span class="status ${statusClass(project.status)}">${project.status}</span></p>
    <progress value="${project.progress}" max="100"></progress><small>${project.progress}%</small>
    <p>${project.report}</p><small>القسم: ${project.department} · ملاحظات: ${project.notes || 'لا يوجد'} · صور اليوم: ${project.images.length}</small>
  </article>`).join('') || '<article class="report">لا توجد تقارير مشاريع ضمن صلاحياتك.</article>';
}

function renderUsers() {
  if (!isAdmin()) { $('#usersTable').innerHTML = '<tr><td colspan="4">إدارة المستخدمين متاحة للمدير فقط.</td></tr>'; return; }
  $('#usersTable').innerHTML = state.users.map((user, index) => `<tr><td>${user.username}</td><td>${user.role}</td><td>${user.perms.join('، ') || 'بدون'}</td><td><button onclick="state.users.splice(${index},1);save();renderAll();">حذف</button></td></tr>`).join('');
}

function renderFiles() {
  const orders = filterByAccess([...state.construction, ...state.maintenance, ...state.projects]);
  const files = orders.flatMap((order) => [
    ...((order.images || []).map((name) => ({ type: 'صورة', name, order: order.number, department: order.department }))),
    ...(order.pdf ? [{ type: 'PDF', name: order.pdf, order: order.number, department: order.department }] : []),
  ]);
  $('#filesGrid').innerHTML = files.map((file) => `<article class="file-card"><strong>${file.type}</strong><p>${file.name}</p><small>القسم: ${file.department} · مرتبط بالأمر: ${file.order}</small></article>`).join('') || '<article class="file-card">لا توجد ملفات ضمن صلاحياتك.</article>';
}

function renderAll() {
  updateAccessUI();
  $('#constructionCount').textContent = filterByAccess(state.construction).length;
  $('#maintenanceCount').textContent = filterByAccess(state.maintenance).length;
  $('#projectCount').textContent = filterByAccess(state.projects).length;
  renderWorkOrders('construction');
  renderWorkOrders('maintenance');
  renderProjects();
  renderUsers();
  renderFiles();
}

renderAll();
