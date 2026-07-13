/* ============================================================
   GymTracker — логика приложения
   Данные хранятся в localStorage.
   ============================================================ */

/* ---------- Структура данных (JSON) ----------
{
  "machines": [
    {
      "id": "m_169283",
      "name": "Жим ногами",
      "photo": "data:image/... | https://... ",
      "reps": 12,
      "weight": 80
    }
  ],
  "diary": [
    {
      "id": "w_16938",
      "date": "2024-06-01",
      "exercise": "Жим ногами",
      "machineId": "m_169283",   // null если введено вручную
      "reps": 10,
      "weight": 60,
      "sets": 3
    }
  ]
}
------------------------------------------------ */

const STORE_KEY = 'gymtracker_data';

// ---------- Хранилище ----------
const Store = {
    read() {
        const raw = localStorage.getItem(STORE_KEY);
        return raw ? JSON.parse(raw) : { machines: [], diary: [] };
    },
    write(data) {
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
    }
};

let db = Store.read();
const uid = (p) => p + Date.now() + Math.floor(Math.random() * 1000);

// ---------- DOM-элементы ----------
const machinesList = document.getElementById('machinesList');
const diaryList = document.getElementById('diaryList');
const machineSelect = document.getElementById('machineSelect');

// ---------- Переключение вкладок ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ---------- Модалки ----------
const machineModal = document.getElementById('machineModal');
const workoutModal = document.getElementById('workoutModal');

function openModal(m) { m.classList.add('open'); }
function closeModal(m) { m.classList.remove('open'); }

document.getElementById('addMachineBtn').onclick = () => openModal(machineModal);
document.getElementById('addWorkoutBtn').onclick = () => {
    refreshMachineSelect();
    document.getElementById('workoutDate').value = new Date().toISOString().slice(0, 10);
    openModal(workoutModal);
};

// Закрытие по кнопке "Отмена" и клику по фону
document.querySelectorAll('[data-close]').forEach(b =>
    b.onclick = () => closeModal(b.closest('.modal-overlay'))
);
document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o); })
);

// ---------- Обработка фото (input type=file -> base64) ----------
const photoFile = document.getElementById('photoFile');
const photoUrl = document.getElementById('photoUrl');
const photoPreview = document.getElementById('photoPreview');
let currentPhotoData = '';

photoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentPhotoData = ev.target.result; // base64
        showPreview(currentPhotoData);
    };
    reader.readAsDataURL(file);
});

photoUrl.addEventListener('input', (e) => {
    currentPhotoData = e.target.value.trim();
    if (currentPhotoData) showPreview(currentPhotoData);
});

function showPreview(src) {
    photoPreview.src = src;
    photoPreview.classList.remove('hidden');
}

// ---------- Добавление тренажера ----------
document.getElementById('machineForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const machine = {
        id: uid('m_'),
        name: f.name.value.trim(),
        photo: currentPhotoData || 'icons/icon-192.png',
        reps: Number(f.reps.value) || 0,
        weight: Number(f.weight.value) || 0
    };
    db.machines.push(machine);
    Store.write(db);
    renderMachines();
    f.reset();
    currentPhotoData = '';
    photoPreview.classList.add('hidden');
    closeModal(machineModal);
});

function deleteMachine(id) {
    if (!confirm('Удалить тренажер?')) return;
    db.machines = db.machines.filter(m => m.id !== id);
    Store.write(db);
    renderMachines();
}

// ---------- Рендер тренажеров ----------
function renderMachines() {
    if (!db.machines.length) {
        machinesList.innerHTML = '<p class="empty">Пока нет тренажеров. Добавьте первый!</p>';
        return;
    }
    machinesList.innerHTML = db.machines.map(m => `
        <div class="machine-card">
            <img src="${m.photo}" alt="${escapeHtml(m.name)}" onerror="this.src='icons/icon-192.png'">
            <div class="info">
                <h4>${escapeHtml(m.name)}</h4>
                <div class="stats">🔁 ${m.reps} повт. · 🏋️ ${m.weight} кг</div>
            </div>
            <div class="card-footer">
                <button class="del-link" onclick="deleteMachine('${m.id}')">Удалить</button>
            </div>
        </div>
    `).join('');
}

// ---------- Заполнение select тренажерами ----------
function refreshMachineSelect() {
    machineSelect.innerHTML = '<option value="">— выбрать из тренажеров —</option>' +
        db.machines.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

// Автозаполнение полей при выборе тренажера
machineSelect.addEventListener('change', (e) => {
    const m = db.machines.find(x => x.id === e.target.value);
    if (m) {
        const f = document.getElementById('workoutForm');
        f.reps.value = m.reps;
        f.weight.value = m.weight;
    }
});

// ---------- Добавление записи в дневник ----------
document.getElementById('workoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const selectedMachine = db.machines.find(m => m.id === f.machineSelect.value);
    const exerciseName = f.manualName.value.trim() || (selectedMachine ? selectedMachine.name : '');

    if (!exerciseName) {
        alert('Выберите тренажер или введите название упражнения.');
        return;
    }

    const entry = {
        id: uid('w_'),
        date: f.date.value,
        exercise: exerciseName,
        machineId: selectedMachine ? selectedMachine.id : null,
        reps: Number(f.reps.value) || 0,
        weight: Number(f.weight.value) || 0,
        sets: Number(f.sets.value) || 1
    };
    db.diary.push(entry);
    Store.write(db);
    renderDiary();
    f.reset();
    closeModal(workoutModal);
});

function deleteEntry(id) {
    db.diary = db.diary.filter(e => e.id !== id);
    Store.write(db);
    renderDiary();
}

// ---------- Рендер дневника (группировка по датам) ----------
function renderDiary() {
    if (!db.diary.length) {
        diaryList.innerHTML = '<p class="empty">История пуста. Запишите первую тренировку!</p>';
        return;
    }

    // Группируем по дате
    const grouped = {};
    db.diary.forEach(e => {
        (grouped[e.date] = grouped[e.date] || []).push(e);
    });

    // Сортировка дат по убыванию
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    diaryList.innerHTML = dates.map(date => `
        <div class="diary-day">
            <h3>${formatDate(date)}</h3>
            ${grouped[date].map(e => `
                <div class="diary-entry">
                    <div>
                        <div class="ex-name">${escapeHtml(e.exercise)}</div>
                        <div class="ex-stats">${e.sets}×${e.reps} · ${e.weight} кг</div>
                    </div>
                    <button class="del-link" onclick="deleteEntry('${e.id}')">✕</button>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ---------- Утилиты ----------
function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

// ---------- Первичный рендер ----------
renderMachines();
renderDiary();

// ============================================================
// PWA: Регистрация Service Worker
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('✅ Service Worker зарегистрирован'))
            .catch(err => console.error('SW error:', err));
    });
}
