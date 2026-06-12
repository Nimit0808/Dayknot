// ==========================================================================
// STATE MANAGEMENT & DEFAULTS
// ==========================================================================

const DEFAULT_TASKS = [
  // Morning tasks
  {
    id: 'm1',
    title: 'Hydrate (500ml warm water)',
    category: 'morning',
    priority: 'high',
    activeDays: [0, 1, 2, 3, 4, 5, 6], // Every day
    completedDates: []
  },
  {
    id: 'm2',
    title: '10-minute mindfulness meditation',
    category: 'morning',
    priority: 'medium',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'm3',
    title: 'Plan the day\'s goals & schedule',
    category: 'morning',
    priority: 'high',
    activeDays: [1, 2, 3, 4, 5], // Weekdays
    completedDates: []
  },
  {
    id: 'm4',
    title: 'Light stretching or active exercise',
    category: 'morning',
    priority: 'medium',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },

  // Afternoon tasks
  {
    id: 'a1',
    title: 'Deep work focus block (90 mins)',
    category: 'afternoon',
    priority: 'high',
    activeDays: [1, 2, 3, 4, 5],
    completedDates: []
  },
  {
    id: 'a2',
    title: 'Post-lunch active walk (15 mins)',
    category: 'afternoon',
    priority: 'low',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'a3',
    title: 'Inbox zero & communications review',
    category: 'afternoon',
    priority: 'medium',
    activeDays: [1, 2, 3, 4, 5],
    completedDates: []
  },

  // Evening tasks
  {
    id: 'e1',
    title: 'Journal & reflect on 3 wins',
    category: 'evening',
    priority: 'medium',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'e2',
    title: 'Prepare layout/bag for tomorrow',
    category: 'evening',
    priority: 'low',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'e3',
    title: 'Digital detox (no screens 30m before sleep)',
    category: 'evening',
    priority: 'high',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  }
];

let state = {
  tasks: [],
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-indexed
  selectedDate: null, // string 'YYYY-MM-DD'
  bestStreak: 0,
  theme: 'light',
  currentTab: 'calendar-view'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initSupabaseClient();
  setupTheme();
  setupNavigation();
  setupMobileNavigation();
  initDateDisplays();
  renderAll();
  setupEventListeners();
  setupCloudSyncForm();
  initConfetti();

  if (supabaseClient) {
    syncFromCloud();
  }
});

// Load data from LocalStorage
function loadData() {
  const savedTasks = localStorage.getItem('zenflow_monthly_tasks');
  const savedBestStreak = localStorage.getItem('zenflow_best_streak');
  const savedTheme = localStorage.getItem('zenflow_theme');

  if (savedTasks) {
    state.tasks = JSON.parse(savedTasks);
    // Backward compatibility check (make sure tasks have activeDays and completedDates arrays)
    state.tasks.forEach(t => {
      if (!t.activeDays) t.activeDays = [0, 1, 2, 3, 4, 5, 6];
      if (!t.completedDates) t.completedDates = [];
    });
  } else {
    // Check if there are tasks from the daily version to migrate
    const legacyTasks = localStorage.getItem('zenflow_tasks');
    if (legacyTasks) {
      state.tasks = JSON.parse(legacyTasks);
    } else {
      state.tasks = DEFAULT_TASKS;
    }
    saveTasks();
  }

  if (savedBestStreak) {
    state.bestStreak = parseInt(savedBestStreak, 10);
  } else {
    state.bestStreak = 0;
    saveBestStreak();
  }

  if (savedTheme) {
    state.theme = savedTheme;
  } else {
    state.theme = 'light'; // Light theme is default
  }

  // Set selected date to today by default
  state.selectedDate = formatDateString(new Date());
}

function saveTasks() {
  localStorage.setItem('zenflow_monthly_tasks', JSON.stringify(state.tasks));
}

function saveBestStreak() {
  localStorage.setItem('zenflow_best_streak', state.bestStreak);
}

// Theme setup
function setupTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
}

// Navigation Tabs
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-target');
      state.currentTab = target;

      document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(target).classList.add('active');

      // Re-render target tab contents in case layout needs refresh
      if (target === 'calendar-view') renderCalendarGrid();
      if (target === 'matrix-view') renderHabitMatrix();
      if (target === 'history-view') renderHistoryTable();
      if (target === 'configure-view') renderConfigurationView();

      // Sync Mobile Drawer state
      const sideNavDrawer = document.getElementById('side-nav-drawer');
      if (sideNavDrawer) {
        const drawerItems = sideNavDrawer.querySelectorAll('.side-drawer-item');
        drawerItems.forEach(item => {
          if (item.getAttribute('data-target') === target) {
            drawerItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
          }
        });
      }
    });
  });
}

function setupMobileNavigation() {
  const btnHamburger = document.getElementById('btn-hamburger');
  const sideNavDrawer = document.getElementById('side-nav-drawer');
  if (!sideNavDrawer) return;

  const btnClose = document.getElementById('side-drawer-close');
  const drawerItems = sideNavDrawer.querySelectorAll('.side-drawer-item');

  // Open drawer
  if (btnHamburger) {
    btnHamburger.addEventListener('click', () => {
      sideNavDrawer.classList.add('active');
    });
  }

  // Close drawer
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      sideNavDrawer.classList.remove('active');
    });
  }

  // Close drawer when clicking outside card
  sideNavDrawer.addEventListener('click', (e) => {
    if (e.target === sideNavDrawer) {
      sideNavDrawer.classList.remove('active');
    }
  });

  // Handle drawer item selection
  drawerItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');

      // Update active state in drawer
      drawerItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Programmatically click hidden desktop tab to switch view
      const desktopTab = document.querySelector(`.nav-tab[data-target="${target}"]`);
      if (desktopTab) {
        desktopTab.click();
      }

      // Close drawer
      sideNavDrawer.classList.remove('active');
    });
  });
}

function initDateDisplays() {
  updateMonthHeader();
}

function updateMonthHeader() {
  const monthDisplay = document.getElementById('current-month-display');
  monthDisplay.textContent = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;
}

// ==========================================================================
// DATE HELPERS
// ==========================================================================

function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateString(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year, month) {
  return new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
}

function getDayOfWeek(dateStr) {
  return parseDateString(dateStr).getDay();
}

// ==========================================================================
// BUSINESS CALCULATION ENGINE
// ==========================================================================

// Get active tasks for a specific date
function getActiveTasksForDate(dateStr) {
  const dayOfWeek = getDayOfWeek(dateStr);
  return state.tasks.filter(task => task.activeDays.includes(dayOfWeek));
}

// Get completed active tasks for a specific date
function getCompletedTasksForDate(dateStr) {
  const activeTasks = getActiveTasksForDate(dateStr);
  return activeTasks.filter(task => task.completedDates.includes(dateStr));
}

// Check if a specific date had a "perfect day" (100% completion of > 0 tasks)
function isPerfectDay(dateStr) {
  const active = getActiveTasksForDate(dateStr);
  if (active.length === 0) return false;
  const completed = getCompletedTasksForDate(dateStr);
  return active.length === completed.length;
}

// Calculate consistency and counts for the current month in view
function getMonthlyStats() {
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  let totalActiveTaskDays = 0;
  let totalCompletedTaskDays = 0;
  let perfectDaysCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const active = getActiveTasksForDate(dateStr);
    const completed = getCompletedTasksForDate(dateStr);

    totalActiveTaskDays += active.length;
    totalCompletedTaskDays += completed.length;

    if (active.length > 0 && active.length === completed.length) {
      perfectDaysCount++;
    }
  }

  const consistency = totalActiveTaskDays > 0 
    ? Math.round((totalCompletedTaskDays / totalActiveTaskDays) * 100) 
    : 0;

  return {
    consistency,
    completionsCount: totalCompletedTaskDays,
    totalCount: totalActiveTaskDays,
    perfectDaysCount
  };
}

// Calculate the current active streak based on perfect days scanning backwards
function calculateStreak() {
  const today = new Date();
  let currentStreak = 0;
  let checkDate = new Date(today);

  // Helper to get formatted string for checkDate
  const getCheckStr = (d) => formatDateString(d);

  // We scan starting from today
  const todayStr = getCheckStr(checkDate);
  const todayActive = getActiveTasksForDate(todayStr);

  // If today has active tasks and they are not yet perfect,
  // we check if yesterday was perfect. If yesterday was not perfect, streak is 0.
  // If today has no active tasks (e.g. rest day), we skip checking today and check from yesterday.
  let startFromYesterday = false;
  if (todayActive.length > 0 && !isPerfectDay(todayStr)) {
    // If today is partially done, the streak is still alive via yesterday's perfect day
    startFromYesterday = true;
  }

  if (startFromYesterday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = getCheckStr(checkDate);
    const activeTasks = getActiveTasksForDate(dateStr);

    // If there are no active tasks on this calendar day, we skip it (doesn't break streak)
    if (activeTasks.length === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      
      // Safety brake: don't loop back infinitely (limit search to 365 days)
      if (currentStreak > 365 || (today.getTime() - checkDate.getTime()) > (365 * 24 * 60 * 60 * 1000)) {
        break;
      }
      continue;
    }

    if (isPerfectDay(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break; // broken streak
    }
  }

  // Update personal best
  if (currentStreak > state.bestStreak) {
    state.bestStreak = currentStreak;
    saveBestStreak();
  }

  return currentStreak;
}

// ==========================================================================
// RENDER VIEWS
// ==========================================================================

function renderAll() {
  renderStatsWidgets();
  renderCalendarGrid();
  renderHabitMatrix();
  renderHistoryTable();
  renderConfigurationView();
  renderDrawer();
}

// Render Monthly Stat Widgets
function renderStatsWidgets() {
  const stats = getMonthlyStats();
  const currentStreak = calculateStreak();

  // 1. Monthly Consistency
  document.getElementById('monthly-consistency-text').textContent = `${stats.consistency}%`;
  document.getElementById('monthly-ratio-text').textContent = `${stats.completionsCount} of ${stats.totalCount} routines logged`;
  
  // Consistency progress ring fill
  const circle = document.getElementById('monthly-progress-ring-fill');
  const radius = circle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  const offset = circumference - (stats.consistency / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  // 2. Perfect Days
  document.getElementById('perfect-days-count').textContent = `${stats.perfectDaysCount} Day${stats.perfectDaysCount === 1 ? '' : 's'}`;

  // 3. Streak Metrics
  document.getElementById('streak-count').textContent = `${currentStreak} Day${currentStreak === 1 ? '' : 's'}`;
  document.getElementById('streak-best').textContent = `Personal Best: ${state.bestStreak} day${state.bestStreak === 1 ? '' : 's'}`;
}

// 1. Calendar Grid View
function renderCalendarGrid() {
  const gridEl = document.getElementById('calendar-grid');
  gridEl.innerHTML = '';

  const offset = getFirstDayOffset(state.currentYear, state.currentMonth);
  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  
  // System's real today date
  const sysTodayStr = formatDateString(new Date());

  // Padding cells from previous month
  for (let i = 0; i < offset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell glass empty';
    gridEl.appendChild(emptyCell);
  }

  // Actual day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(state.currentMonth + 1).padStart(2, '0');
    const cellDateStr = `${state.currentYear}-${monthStr}-${dayStr}`;
    
    const activeTasks = getActiveTasksForDate(cellDateStr);
    const completedTasks = getCompletedTasksForDate(cellDateStr);
    const isToday = cellDateStr === sysTodayStr;
    const isSelected = cellDateStr === state.selectedDate;

    const cellEl = document.createElement('div');
    cellEl.className = `calendar-day-cell glass`;
    if (isToday) cellEl.classList.add('today');
    if (isSelected) cellEl.classList.add('selected'); // highlighted selection

    const hasActive = activeTasks.length > 0;
    const isDayComplete = hasActive && activeTasks.length === completedTasks.length;

    if (isDayComplete) {
      cellEl.classList.add('completed-day');
    }

    let progressPercent = 0;
    if (hasActive) {
      progressPercent = Math.round((completedTasks.length / activeTasks.length) * 100);
    }

    cellEl.innerHTML = `
      <span class="day-number">${d}</span>
      ${hasActive ? `
        <div class="day-progress-info">
          <div class="day-progress-bar">
            <div class="day-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span class="day-ratio">${completedTasks.length}/${activeTasks.length} Done</span>
        </div>
      ` : `
        <span class="day-ratio" style="color: var(--text-muted); font-style: italic; font-size: 0.65rem;">Rest Day</span>
      `}
    `;

    // Click Day to Open Details Drawer
    cellEl.addEventListener('click', () => {
      // Set selection
      state.selectedDate = cellDateStr;
      
      // Update calendar styles manually for speed
      document.querySelectorAll('.calendar-day-cell').forEach(c => {
        if (!c.classList.contains('empty')) {
          c.classList.remove('selected');
        }
      });
      cellEl.classList.add('selected');

      // Load drawer details
      renderDrawer();
      openDrawer();
    });

    gridEl.appendChild(cellEl);
  }
}

// 2. Habit Matrix Table View
function renderHabitMatrix() {
  const headerRow = document.getElementById('matrix-header-row');
  const bodyEl = document.getElementById('matrix-body');
  
  headerRow.innerHTML = '';
  bodyEl.innerHTML = '';

  if (state.tasks.length === 0) {
    bodyEl.innerHTML = `
      <tr>
        <td colspan="35" style="padding: 3rem; text-align: center; color: var(--text-muted);">
          No routine tasks defined. Go to "Configure Routine" tab to add tasks.
        </td>
      </tr>
    `;
    return;
  }

  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);

  // 1. Draw Headers: "Routine Task", "1", "2", ... "31"
  const habitHeader = document.createElement('th');
  habitHeader.textContent = 'Routine Task';
  headerRow.appendChild(habitHeader);

  for (let d = 1; d <= daysInMonth; d++) {
    const dayHeader = document.createElement('th');
    dayHeader.textContent = d;
    headerRow.appendChild(dayHeader);
  }

  // Sort tasks alphabetically
  const sortedTasks = [...state.tasks].sort((a, b) => a.title.localeCompare(b.title));

  // 2. Draw Rows
  sortedTasks.forEach(task => {
    const tr = document.createElement('tr');

    // Task name column
    const tdName = document.createElement('td');
    tdName.textContent = task.title;
    tdName.title = task.title;
    tr.appendChild(tdName);

    // Days columns
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(state.currentMonth + 1).padStart(2, '0');
      const dateStr = `${state.currentYear}-${monthStr}-${dayStr}`;

      const cell = document.createElement('td');
      cell.className = 'matrix-cell';
      
      const isTaskActive = task.activeDays.includes(getDayOfWeek(dateStr));
      
      if (!isTaskActive) {
        cell.classList.add('inactive-day');
      } else {
        const isCompleted = task.completedDates.includes(dateStr);
        if (isCompleted) {
          cell.classList.add('completed');
          cell.innerHTML = `<span class="matrix-dot">✓</span>`;
        } else {
          cell.innerHTML = `<span class="matrix-dot"></span>`;
        }

        // Click Matrix cell toggles task status for that day!
        cell.addEventListener('click', (e) => {
          toggleTaskStatus(task.id, dateStr);
        });
      }

      tr.appendChild(cell);
    }

    bodyEl.appendChild(tr);
  });
}

// 3. Routine Configuration View
function renderConfigurationView() {
  const listEl = document.getElementById('list-tasks');
  const badgeEl = document.getElementById('count-tasks');
  if (!listEl) return;
  listEl.innerHTML = '';

  const tasks = state.tasks;
  if (badgeEl) badgeEl.textContent = `${tasks.length} Task${tasks.length === 1 ? '' : 's'}`;

  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div class="list-empty-state">
        <p>No routine tasks defined. Click "+ Add Routine Task" to get started.</p>
      </div>
    `;
    return;
  }

  // Sort alphabetically
  const sortedTasks = [...tasks].sort((a, b) => a.title.localeCompare(b.title));

  sortedTasks.forEach(task => {
    const itemEl = document.createElement('div');
    itemEl.className = 'task-item task-item-enter';

    let priorityText = 'Low';
    if (task.priority === 'high') priorityText = 'High';
    if (task.priority === 'medium') priorityText = 'Med';

    let activeDaysStr = '';
    if (task.activeDays.length === 7) {
      activeDaysStr = 'Daily';
    } else if (task.activeDays.length === 5 && !task.activeDays.includes(0) && !task.activeDays.includes(6)) {
      activeDaysStr = 'M-F';
    } else {
      const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      activeDaysStr = task.activeDays.map(d => dayLetters[d]).join('');
    }

    itemEl.innerHTML = `
      <div class="task-item-content">
        <div style="width: 22px; height: 22px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">⚙️</div>
        <div class="task-item-details">
          <span class="task-title" title="${task.title}">${task.title}</span>
          <div class="task-meta">
            <span class="priority-tag priority-${task.priority}">${priorityText}</span>
            <span class="days-tag">${activeDaysStr}</span>
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-action-icon btn-edit" data-id="${task.id}" title="Edit routine template">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
        </button>
        <button class="btn-action-icon btn-delete" data-id="${task.id}" title="Delete routine template">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    listEl.appendChild(itemEl);
  });
}

// 4. Detail Checklist Drawer
function renderDrawer() {
  const drawerDateTitle = document.getElementById('drawer-date-title');
  const drawerProgressSubtitle = document.getElementById('drawer-progress-subtitle');
  const progressFill = document.getElementById('drawer-progress-fill');

  const selectedDateObj = parseDateString(state.selectedDate);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  drawerDateTitle.textContent = selectedDateObj.toLocaleDateString('en-US', options);

  const activeTasks = getActiveTasksForDate(state.selectedDate);
  const completedTasks = getCompletedTasksForDate(state.selectedDate);

  const total = activeTasks.length;
  const done = completedTasks.length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  drawerProgressSubtitle.textContent = `${done} of ${total} tasks completed (${percentage}%)`;
  progressFill.style.width = `${percentage}%`;

  const listEl = document.getElementById('drawer-list-tasks');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (activeTasks.length === 0) {
    listEl.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); font-style:italic; text-align:center; padding:2rem;">No active tasks scheduled on this day.</div>`;
    return;
  }

  // Sort alphabetically
  const sortedActiveTasks = [...activeTasks].sort((a, b) => a.title.localeCompare(b.title));

  sortedActiveTasks.forEach(task => {
    const isCompleted = task.completedDates.includes(state.selectedDate);
    const itemEl = document.createElement('div');
    itemEl.className = `task-item ${isCompleted ? 'completed' : ''}`;
    
    let priorityText = 'Low';
    if (task.priority === 'high') priorityText = 'High';
    if (task.priority === 'medium') priorityText = 'Med';

    itemEl.innerHTML = `
      <div class="task-item-content">
        <div class="checkbox-wrapper">
          <input type="checkbox" ${isCompleted ? 'checked' : ''} data-id="${task.id}" class="drawer-toggle-checkbox">
          <div class="checkbox-custom">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>
        <div class="task-item-details">
          <span class="task-title" title="${task.title}">${task.title}</span>
          <div class="task-meta">
            <span class="priority-tag priority-${task.priority}">${priorityText}</span>
          </div>
        </div>
      </div>
    `;

    itemEl.addEventListener('click', (e) => {
      if (e.target.closest('input')) return;
      toggleTaskStatus(task.id, state.selectedDate);
    });

    listEl.appendChild(itemEl);
  });
}

// ==========================================================================
// CORE TACTICAL ACTIONS
// ==========================================================================

// Main Completion Toggle function
function toggleTaskStatus(taskId, dateStr) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const idx = task.completedDates.indexOf(dateStr);
  let checked = false;

  if (idx > -1) {
    // Uncheck completion
    task.completedDates.splice(idx, 1);
    cloudRemoveCompletion(taskId, dateStr);
  } else {
    // Check completion
    task.completedDates.push(dateStr);
    checked = true;
    cloudAddCompletion(taskId, dateStr);
    
    // Confetti pop!
    triggerTaskCelebration();
  }

  saveTasks();

  // If a perfect day is reached for the toggled date, pop a mega confetti!
  if (checked && isPerfectDay(dateStr)) {
    triggerMegaCelebration();
  }

  // Refresh current view contents
  renderStatsWidgets();
  if (state.currentTab === 'calendar-view') renderCalendarGrid();
  if (state.currentTab === 'matrix-view') renderHabitMatrix();
  if (state.currentTab === 'history-view') renderHistoryTable();
  renderDrawer();
}

// Drawer Open/Close Controls
const drawer = document.getElementById('detail-drawer');

function openDrawer() {
  drawer.classList.add('active');
}

function closeDrawer() {
  drawer.classList.remove('active');
}

// ==========================================================================
// 5. HISTORY LOG TABLE RENDER
// ==========================================================================

function renderHistoryTable() {
  const bodyEl = document.getElementById('history-table-body');
  if (!bodyEl) return;
  bodyEl.innerHTML = '';

  const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
  const sysTodayStr = formatDateString(new Date());

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(state.currentMonth + 1).padStart(2, '0');
    const dateStr = `${state.currentYear}-${monthStr}-${dayStr}`;

    const dateObj = parseDateString(dateStr);
    const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

    const activeTasks = getActiveTasksForDate(dateStr);
    const completedTasks = getCompletedTasksForDate(dateStr);

    const tr = document.createElement('tr');
    if (dateStr === sysTodayStr) {
      tr.classList.add('today');
    }

    // 1. Date Column
    const tdDate = document.createElement('td');
    tdDate.innerHTML = `<span style="font-weight:700;">${dateFormatted}</span>`;
    tr.appendChild(tdDate);

    // 2. Progress Column
    const tdProgress = document.createElement('td');
    const hasActive = activeTasks.length > 0;
    const percentage = hasActive ? Math.round((completedTasks.length / activeTasks.length) * 100) : 0;
    
    tdProgress.innerHTML = `
      <div class="history-progress-cell">
        <span class="history-progress-text">${completedTasks.length}/${activeTasks.length} (${percentage}%)</span>
        ${hasActive ? `
          <div class="history-progress-bar">
            <div class="history-progress-fill" style="width: ${percentage}%;"></div>
          </div>
        ` : ''}
      </div>
    `;
    tr.appendChild(tdProgress);

    // 3. Completed Tasks Column
    const tdCompleted = document.createElement('td');
    const compContainer = document.createElement('div');
    compContainer.className = 'task-chips-container';

    if (completedTasks.length > 0) {
      completedTasks.forEach(task => {
        const chip = document.createElement('span');
        chip.className = `task-chip afternoon`; // Unified tag style
        chip.textContent = task.title;
        chip.title = task.title;
        compContainer.appendChild(chip);
      });
    } else if (hasActive) {
      compContainer.innerHTML = `<span style="color:var(--text-muted); font-style:italic; font-size:0.75rem;">None completed</span>`;
    } else {
      compContainer.innerHTML = `<span style="color:var(--text-muted); font-style:italic; font-size:0.75rem;">-</span>`;
    }
    tdCompleted.appendChild(compContainer);

    // 4. Pending Tasks Column
    const tdPending = document.createElement('td');
    const pendContainer = document.createElement('div');
    pendContainer.className = 'task-chips-container';

    const pendingTasks = activeTasks.filter(t => !completedTasks.includes(t));

    if (pendingTasks.length > 0) {
      pendingTasks.forEach(task => {
        const chip = document.createElement('span');
        chip.className = 'task-chip pending';
        chip.textContent = task.title;
        chip.title = task.title;
        pendContainer.appendChild(chip);
      });
    } else if (hasActive) {
      pendContainer.innerHTML = `<span style="color:var(--color-emerald); font-weight:600; font-size:0.75rem;">All completed!</span>`;
    } else {
      pendContainer.innerHTML = `<span style="color:var(--text-muted); font-style:italic; font-size:0.75rem;">-</span>`;
    }
    tdPending.appendChild(pendContainer);

    // 5. Day Status Column
    const tdStatus = document.createElement('td');
    let statusText = 'No Progress 💤';
    let statusClass = 'status-empty';

    if (!hasActive) {
      statusText = 'Rest Day 🏝️';
      statusClass = 'status-rest';
    } else if (completedTasks.length === activeTasks.length) {
      statusText = 'Perfect Day 🎉';
      statusClass = 'status-perfect';
    } else if (completedTasks.length > 0) {
      statusText = 'In Progress 🏃';
      statusClass = 'status-progress';
    }

    tdStatus.innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
    tr.appendChild(tdStatus);

    // Click row opens drawer
    tr.addEventListener('click', () => {
      state.selectedDate = dateStr;
      renderDrawer();
      openDrawer();
    });

    bodyEl.appendChild(tr);
  }
}

// ==========================================================================
// MONTH NAVIGATION
// ==========================================================================

function navigateMonth(direction) {
  state.currentMonth += direction;
  
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear--;
  } else if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear++;
  }

  updateMonthHeader();
  renderStatsWidgets();

  if (state.currentTab === 'calendar-view') renderCalendarGrid();
  if (state.currentTab === 'matrix-view') renderHabitMatrix();
  if (state.currentTab === 'history-view') renderHistoryTable();
}

// ==========================================================================
// TEMPLATE EDITOR MODAL (CRUD FOR CONFIGURE VIEW)
// ==========================================================================

const modal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title-input');
const taskPrioritySelect = document.getElementById('task-priority-select');

function openModal(editingTaskId = null) {
  taskForm.reset();
  
  if (editingTaskId) {
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    modalTitle.textContent = 'Edit Routine Task';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskPrioritySelect.value = task.priority;

    // Check active days checkbox
    const dayCheckboxes = document.querySelectorAll('input[name="active-days"]');
    dayCheckboxes.forEach(cb => {
      cb.checked = task.activeDays.includes(parseInt(cb.value));
    });
  } else {
    modalTitle.textContent = 'Add Routine Task';
    taskIdInput.value = '';
    taskPrioritySelect.value = 'medium';
    
    // Check all days by default
    const dayCheckboxes = document.querySelectorAll('input[name="active-days"]');
    dayCheckboxes.forEach(cb => cb.checked = true);
  }
  
  modal.classList.add('active');
  taskTitleInput.focus();
}

function closeModal() {
  modal.classList.remove('active');
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = taskIdInput.value;
  const title = taskTitleInput.value.trim();
  const priority = taskPrioritySelect.value;
  
  const checkedDays = [];
  const dayCheckboxes = document.querySelectorAll('input[name="active-days"]:checked');
  dayCheckboxes.forEach(cb => {
    checkedDays.push(parseInt(cb.value));
  });

  if (checkedDays.length === 0) {
    alert('Please select at least one active day for this routine task.');
    return;
  }

  if (id) {
    // Edit existing task template
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.priority = priority;
      task.activeDays = checkedDays;
      cloudUpdateTask(task);
    }
  } else {
    // Add new task template
    const newTask = {
      id: 'task_' + Date.now(),
      title,
      category: 'morning', // Legacy fallback compatibility field
      priority,
      activeDays: checkedDays,
      completedDates: []
    };
    state.tasks.push(newTask);
    cloudCreateTask(newTask);
  }

  saveTasks();
  renderAll();
  closeModal();
}

function deleteTemplateTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  cloudDeleteTask(id);
  renderAll();
}

// ==========================================================================
// SYSTEM EVENT LISTENERS
// ==========================================================================

function setupEventListeners() {
  // Month navigation buttons
  document.getElementById('btn-prev-month').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('btn-next-month').addEventListener('click', () => navigateMonth(1));

  // Drawer close buttons
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });
  
  // Close drawer on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      closeModal();
    }
  });

  // FAB button Add
  document.getElementById('fab-add-task').addEventListener('click', () => openModal(null));

  // Inline "Add Task" buttons in columns
  document.querySelectorAll('.btn-add-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openModal(null);
    });
  });

  // Modal Cancel & Close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Form Submit
  taskForm.addEventListener('submit', handleFormSubmit);

  // Toggle checks inside Drawer list (event delegation)
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('drawer-toggle-checkbox')) {
      const id = e.target.getAttribute('data-id');
      toggleTaskStatus(id, state.selectedDate);
    }
  });

  // Edit/Delete triggers in Configure View (event delegation)
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openModal(id);
      return;
    }

    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (confirm('Are you sure you want to permanently remove this routine task template? This will erase its completion history.')) {
        deleteTemplateTask(id);
      }
    }
  });
}

// ==========================================================================
// CONFETTI CANVAS ENGINE
// ==========================================================================

let canvas, ctx;
let particles = [];
const colors = ['#f59e0b', '#06b6d4', '#8b5cf6', '#10b981', '#f43f5e', '#3b82f6'];

function initConfetti() {
  canvas = document.getElementById('confetti-canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class ConfettiParticle {
  constructor(x, y, isMega = false) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 4;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    
    const angle = isMega ? Math.random() * Math.PI * 2 : Math.random() * Math.PI - Math.PI;
    const speed = isMega ? Math.random() * 12 + 6 : Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.gravity = 0.2;
    this.drag = 0.98;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 10 - 5;
    this.opacity = 1;
    this.decay = Math.random() * 0.015 + 0.01;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.opacity -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function triggerTaskCelebration() {
  const x = window.innerWidth / 2;
  const y = window.innerHeight * 0.4;

  for (let i = 0; i < 25; i++) {
    particles.push(new ConfettiParticle(x, y, false));
  }

  if (particles.length === 25) {
    requestAnimationFrame(animateConfetti);
  }
}

function triggerMegaCelebration() {
  const leftX = 0;
  const rightX = window.innerWidth;
  const bottomY = window.innerHeight;

  for (let i = 0; i < 60; i++) {
    const p = new ConfettiParticle(leftX, bottomY, true);
    p.vx = Math.random() * 12 + 4;
    p.vy = -Math.random() * 16 - 8;
    particles.push(p);
  }

  for (let i = 0; i < 60; i++) {
    const p = new ConfettiParticle(rightX, bottomY, true);
    p.vx = -Math.random() * 12 - 4;
    p.vy = -Math.random() * 16 - 8;
    particles.push(p);
  }

  if (particles.length >= 120) {
    requestAnimationFrame(animateConfetti);
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    if (p.opacity <= 0) {
      particles.splice(i, 1);
    } else {
      p.draw();
    }
  }

  if (particles.length > 0) {
    requestAnimationFrame(animateConfetti);
  }
}

// ==========================================================================
// SUPABASE SYNC SYSTEM
// ==========================================================================

let supabaseClient = null;

function initSupabaseClient() {
  const url = localStorage.getItem('zenflow_supabase_url');
  const key = localStorage.getItem('zenflow_supabase_key');
  if (url && key) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      updateSyncUI('connected');
      return true;
    } catch (err) {
      console.error('Error creating Supabase client:', err);
      updateSyncUI('error');
      return false;
    }
  }
  updateSyncUI('disconnected');
  return false;
}

async function syncFromCloud() {
  if (!supabaseClient) return;
  updateSyncUI('syncing');

  try {
    const { data: cloudTasks, error: taskErr } = await supabaseClient
      .from('tasks')
      .select('*');

    if (taskErr) throw taskErr;

    const { data: completionsData, error: compErr } = await supabaseClient
      .from('completions')
      .select('task_id, completed_date');

    if (compErr) throw compErr;

    if (cloudTasks && cloudTasks.length > 0) {
      state.tasks = cloudTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        category: 'morning', // Legacy fallback compatibility field
        activeDays: t.active_days || [0, 1, 2, 3, 4, 5, 6],
        completedDates: completionsData
          ? completionsData.filter(c => c.task_id === t.id).map(c => c.completed_date)
          : []
      }));
      
      saveTasks();
      renderAll();
    } else {
      await pushAllTasksToCloud();
    }
    updateSyncUI('connected');
  } catch (err) {
    console.error('Error syncing from cloud:', err);
    updateSyncUI('error');
  }
}

async function pushAllTasksToCloud() {
  if (!supabaseClient || state.tasks.length === 0) return;
  try {
    const tasksToUpload = state.tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      active_days: t.activeDays
    }));

    const { error: taskErr } = await supabaseClient
      .from('tasks')
      .upsert(tasksToUpload);

    if (taskErr) throw taskErr;

    const completionsToUpload = [];
    state.tasks.forEach(t => {
      t.completedDates.forEach(date => {
        completionsToUpload.push({
          task_id: t.id,
          completed_date: date
        });
      });
    });

    if (completionsToUpload.length > 0) {
      const { error: compErr } = await supabaseClient
        .from('completions')
        .upsert(completionsToUpload);
      if (compErr) throw compErr;
    }
  } catch (err) {
    console.error('Failed to initialize cloud database:', err);
  }
}

async function cloudCreateTask(task) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('tasks').insert({
      id: task.id,
      title: task.title,
      priority: task.priority,
      active_days: task.activeDays
    });
  } catch (err) {
    console.error('Cloud create task error:', err);
  }
}

async function cloudUpdateTask(task) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('tasks').update({
      title: task.title,
      priority: task.priority,
      active_days: task.activeDays
    }).eq('id', task.id);
  } catch (err) {
    console.error('Cloud update task error:', err);
  }
}

async function cloudDeleteTask(taskId) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('tasks').delete().eq('id', taskId);
  } catch (err) {
    console.error('Cloud delete task error:', err);
  }
}

async function cloudAddCompletion(taskId, dateStr) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('completions').insert({
      task_id: taskId,
      completed_date: dateStr
    });
  } catch (err) {
    console.error('Cloud add completion error:', err);
  }
}

async function cloudRemoveCompletion(taskId, dateStr) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('completions').delete().eq('task_id', taskId).eq('completed_date', dateStr);
  } catch (err) {
    console.error('Cloud remove completion error:', err);
  }
}

function setupCloudSyncForm() {
  const form = document.getElementById('supabase-config-form');
  if (!form) return;

  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');
  const btnDisconnect = document.getElementById('btn-sync-disconnect');

  urlInput.value = localStorage.getItem('zenflow_supabase_url') || '';
  keyInput.value = localStorage.getItem('zenflow_supabase_key') || '';

  if (supabaseClient) {
    btnDisconnect.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    const key = keyInput.value.trim();

    if (!url || !key) return;

    localStorage.setItem('zenflow_supabase_url', url);
    localStorage.setItem('zenflow_supabase_key', key);

    const success = initSupabaseClient();
    if (success) {
      btnDisconnect.style.display = 'block';
      await syncFromCloud();
    }
  });

  btnDisconnect.addEventListener('click', () => {
    localStorage.removeItem('zenflow_supabase_url');
    localStorage.removeItem('zenflow_supabase_key');
    urlInput.value = '';
    keyInput.value = '';
    btnDisconnect.style.display = 'none';
    supabaseClient = null;
    updateSyncUI('disconnected');
    
    // Reload local tasks
    loadData();
    renderAll();
  });
}

function updateSyncUI(status) {
  const badge = document.getElementById('sync-status-badge');
  if (!badge) return;

  badge.className = 'status-badge';
  if (status === 'connected') {
    badge.classList.add('status-perfect');
    badge.textContent = 'Connected ✅';
  } else if (status === 'syncing') {
    badge.classList.add('status-progress');
    badge.textContent = 'Syncing 🔄';
  } else if (status === 'error') {
    badge.classList.add('status-empty');
    badge.textContent = 'Connection Error ❌';
  } else {
    badge.classList.add('status-rest');
    badge.textContent = 'Disconnected';
  }
}
