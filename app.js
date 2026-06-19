// ==========================================================================
// STATE MANAGEMENT & DEFAULTS
// ==========================================================================

const DEFAULT_TASKS = [
  // Routine tasks
  {
    id: 'm1',
    title: 'Hydrate (500ml warm water)',
    priority: 'high',
    activeDays: [0, 1, 2, 3, 4, 5, 6], // Every day
    completedDates: []
  },
  {
    id: 'm2',
    title: '10-minute mindfulness meditation',
    priority: 'medium',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'm3',
    title: 'Plan the day\'s goals & schedule',
    priority: 'high',
    activeDays: [1, 2, 3, 4, 5], // Weekdays
    completedDates: []
  },
  {
    id: 'm4',
    title: 'Light stretching or active exercise',
    priority: 'medium',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'a1',
    title: 'Deep work focus block (90 mins)',
    priority: 'high',
    activeDays: [1, 2, 3, 4, 5],
    completedDates: []
  },
  {
    id: 'a2',
    title: 'Post-lunch active walk (15 mins)',
    priority: 'low',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'a3',
    title: 'Inbox zero & communications review',
    priority: 'medium',
    activeDays: [1, 2, 3, 4, 5],
    completedDates: []
  },
  {
    id: 'e1',
    title: 'Journal & reflect on 3 wins',
    priority: 'medium',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'e2',
    title: 'Prepare layout/bag for tomorrow',
    priority: 'low',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    completedDates: []
  },
  {
    id: 'e3',
    title: 'Digital detox (no screens 30m before sleep)',
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
  accent: 'terracotta',
  picture: null,
  currentTab: 'calendar-view',
  currentUser: null
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ==========================================================================
// DYNAMIC LAZY LOADERS
// ==========================================================================
window.loadOneSignal = function() {
  if (document.getElementById('onesignal-script')) return;
  
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "0b9d40da-87af-421b-9554-72c07105971c",
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true
    });
    if (state.currentUser) {
      await OneSignal.login(state.currentUser);
    }
  });

  const script = document.createElement('script');
  script.id = 'onesignal-script';
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  document.head.appendChild(script);
};

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  loadData();
  setupTheme();
  setupNavigation();
  setupMobileNavigation();
  initDateDisplays();
  renderAll();
  setupEventListeners();
  initConfetti();
  setupAuthForm();
  updateAuthUI();
  
  // Auto-sync data if logged in
  if (state.currentUser) {
    await syncFromCloud();
  }
});

// ==========================================================================
// REMINDER ENGINE
// ==========================================================================
let reminderIntervalId = null;

// ==========================================================================
// TOAST NOTIFICATIONS (IN-APP FALLBACK)
// ==========================================================================
function showToastNotification(title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'glass';
  toast.style.padding = '1rem';
  toast.style.borderRadius = '12px';
  toast.style.display = 'flex';
  toast.style.flexDirection = 'column';
  toast.style.gap = '0.25rem';
  toast.style.transform = 'translateY(-20px)';
  toast.style.opacity = '0';
  toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  toast.style.pointerEvents = 'auto';
  toast.style.borderLeft = '4px solid var(--color-primary)';
  
  toast.innerHTML = `
    <div style="font-weight: bold; font-size: 0.95rem; color: var(--text-primary);">${title}</div>
    <div style="font-size: 0.85rem; color: var(--text-secondary);">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });
  
  // Play a soft sound if possible
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD//wEA');
    audio.play().catch(e => {});
  } catch(e) {}
  
  // Remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Old local reminder engine removed - Now using OneSignal for reliable scheduled delivery.

// Load data from LocalStorage
function loadData() {
  let savedUser = null;
  
  const authDataStr = localStorage.getItem('dayknot_auth');
  if (authDataStr) {
    try {
      const authData = JSON.parse(authDataStr);
      if (authData.expiresAt && new Date().getTime() < authData.expiresAt) {
        savedUser = authData.user;
        state.picture = authData.picture || null;
        state.theme = authData.theme || 'light';
        state.accent = authData.accent || 'terracotta';
      } else {
        localStorage.removeItem('dayknot_auth');
      }
    } catch (e) {}
  } else {
    savedUser = sessionStorage.getItem('dayknot_current_user');
    state.picture = sessionStorage.getItem('dayknot_picture') || null;
    state.theme = sessionStorage.getItem('dayknot_theme') || 'light';
    state.accent = sessionStorage.getItem('dayknot_accent') || 'terracotta';
  }

  if (!savedUser) {
    const legacyUser = localStorage.getItem('dayknot_current_user');
    if (legacyUser) {
      savedUser = legacyUser;
      sessionStorage.setItem('dayknot_current_user', legacyUser);
      localStorage.removeItem('dayknot_current_user');
    }
  }

  state.currentUser = savedUser || null;

  // Load tasks specific to the current active user (local cache)
  if (state.currentUser) {
    const userTasksKey = `dayknot_tasks_${state.currentUser}`;
    const userBestStreakKey = `dayknot_best_streak_${state.currentUser}`;
    
    const savedTasks = localStorage.getItem(userTasksKey);
    const savedBestStreak = localStorage.getItem(userBestStreakKey);
    
    if (savedTasks) {
      state.tasks = JSON.parse(savedTasks);
      state.tasks.forEach(t => {
        if (!t.activeDays) t.activeDays = [0, 1, 2, 3, 4, 5, 6];
        if (!t.completedDates) t.completedDates = [];
      });
    } else {
      state.tasks = DEFAULT_TASKS.map(t => ({ ...t, completedDates: [] }));
      saveTasks();
    }
    
    state.bestStreak = savedBestStreak ? parseInt(savedBestStreak, 10) : 0;
  } else {
    state.tasks = [];
    state.bestStreak = 0;
    state.theme = 'light';
    state.accent = 'terracotta';
    state.picture = null;
  }

  state.selectedDate = formatDateString(new Date());
}

function saveTasks() {
  if (state.currentUser) {
    const userTasksKey = `dayknot_tasks_${state.currentUser}`;
    localStorage.setItem(userTasksKey, JSON.stringify(state.tasks));
  }
}

function saveBestStreak() {
  if (state.currentUser) {
    const userBestStreakKey = `dayknot_best_streak_${state.currentUser}`;
    localStorage.setItem(userBestStreakKey, state.bestStreak);
  }
}

// Theme setup
function setupTheme() {
  document.documentElement.setAttribute('data-theme', state.theme || 'light');
  document.documentElement.setAttribute('data-accent', state.accent || 'terracotta');
  if (state.currentTab === 'analytics-view') {
    renderTrendChart();
  }
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
      if (target === 'analytics-view') renderAnalyticsDashboard();

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

// Calculate Weekly Completion %
function getWeeklyCompletionPercent() {
  const today = new Date();
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getDay(); // 0 is Sunday
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
  weekStart.setDate(diff);
  weekStart.setHours(0,0,0,0);

  let weeklyExpected = 0;
  let weeklyCompleted = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    if (d > today) continue; // Don't count future days in the week

    const dateStr = formatDateString(d);
    const dayIndex = d.getDay();
    const activeTasks = state.tasks.filter(t => t.activeDays && t.activeDays.includes(dayIndex));
    weeklyExpected += activeTasks.length;
    
    activeTasks.forEach(t => {
      if (t.completedDates && t.completedDates.includes(dateStr)) {
        weeklyCompleted++;
      }
    });
  }

  return weeklyExpected === 0 ? 0 : Math.round((weeklyCompleted / weeklyExpected) * 100);
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
  renderAnalyticsDashboard();
}

// Render Global Stat Widgets
function renderStatsWidgets() {
  const stats = getMonthlyStats();
  const currentStreak = calculateStreak();
  const weeklyPercent = getWeeklyCompletionPercent();

  // 1. Current Streak
  const currentStreakEl = document.getElementById('dashboard-current-streak');
  if (currentStreakEl) currentStreakEl.textContent = currentStreak;

  // 2. Best Streak
  const bestStreakEl = document.getElementById('dashboard-best-streak');
  if (bestStreakEl) bestStreakEl.textContent = state.bestStreak;

  // 3. Weekly Completion
  const weeklyEl = document.getElementById('dashboard-weekly-completion');
  if (weeklyEl) weeklyEl.textContent = `${weeklyPercent}%`;

  // 4. Monthly Completion
  const monthlyEl = document.getElementById('dashboard-monthly-completion');
  if (monthlyEl) monthlyEl.textContent = `${stats.consistency}%`;
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
    emptyCell.className = 'calendar-day-cell empty';
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
    cellEl.className = `calendar-day-cell`;
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
    atlasRemoveCompletion(taskId, dateStr);
  } else {
    // Check completion
    task.completedDates.push(dateStr);
    checked = true;
    atlasAddCompletion(taskId, dateStr);
    
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
const taskReminderEnabled = document.getElementById('task-reminder-enabled');
const taskReminderTime = document.getElementById('task-reminder-time');
const taskReminderTimeGroup = document.getElementById('task-reminder-time-group');

const btnTestNotification = document.getElementById('btn-test-notification');

taskReminderEnabled.addEventListener('change', (e) => {
  if (e.target.checked) {
    taskReminderTimeGroup.style.display = 'flex';
    // Request permission if not already decided
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  } else {
    taskReminderTimeGroup.style.display = 'none';
  }
});

btnTestNotification.addEventListener('click', async () => {
  // Always show the in-app toast
  showToastNotification("Testing Push...", "Contacting backend...");

  let permission = "default";
  if ("Notification" in window) {
    permission = Notification.permission;
  }
  
  if (permission === 'default') {
    try {
      if (window.OneSignal && window.OneSignal.Slidedown) {
        await window.OneSignal.Slidedown.promptPush();
      } else if ("Notification" in window) {
        await Notification.requestPermission();
      }
    } catch(e) {
      alert("Error asking for permission: " + e.message);
    }
    alert("Please grant notification permissions and then click Test Alert again.");
    return;
  }

  if (permission === 'denied') {
    alert("Notifications are blocked! Please open your browser/app settings and allow notifications for this app.");
    return;
  }

  if (permission === 'granted') {
    if (!state.currentUser) {
      alert("You must be logged in to test notifications.");
      return;
    }
    
    try {
      const res = await fetch('/api/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      showToastNotification("Success", "Backend accepted the test push! You should receive it in 10 seconds.");
    } catch (err) {
      alert(`Backend Error: ${err.message}`);
    }
  }
});

function openModal(editingTaskId = null) {
  taskForm.reset();
  
  if (editingTaskId) {
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    modalTitle.textContent = 'Edit Routine Task';
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskPrioritySelect.value = task.priority;
    
    if (task.reminderEnabled) {
      taskReminderEnabled.checked = true;
      taskReminderTimeGroup.style.display = 'flex';
      taskReminderTime.value = task.reminderTime || '';
    } else {
      taskReminderEnabled.checked = false;
      taskReminderTimeGroup.style.display = 'none';
      taskReminderTime.value = '';
    }

    // Check active days checkbox
    const dayCheckboxes = document.querySelectorAll('input[name="active-days"]');
    dayCheckboxes.forEach(cb => {
      cb.checked = task.activeDays.includes(parseInt(cb.value));
    });
  } else {
    modalTitle.textContent = 'Add Routine Task';
    taskIdInput.value = '';
    taskPrioritySelect.value = 'medium';
    taskReminderEnabled.checked = false;
    taskReminderTimeGroup.style.display = 'none';
    taskReminderTime.value = '';
    
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
  const reminderEnabled = taskReminderEnabled.checked;
  const reminderTime = reminderEnabled ? taskReminderTime.value : null;

  if (!title) return;
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
      task.reminderEnabled = reminderEnabled;
      task.reminderTime = reminderTime;
      
      // Clear from today's notified list so they can test it again
      const todayStr = formatDateString(new Date());
      const notifiedTasksKey = `dayknot_notified_${state.currentUser}_${todayStr}`;
      try {
        let notifiedTasks = JSON.parse(localStorage.getItem(notifiedTasksKey)) || [];
        notifiedTasks = notifiedTasks.filter(id => id !== task.id);
        localStorage.setItem(notifiedTasksKey, JSON.stringify(notifiedTasks));
      } catch(e) {}
      
      atlasUpdateTask(task);
    }
  } else {
    // Add new task template
    const newTask = {
      id: 'task_' + Date.now(),
      title,
      priority,
      activeDays: checkedDays,
      reminderEnabled,
      reminderTime,
      completedDates: []
    };
    state.tasks.push(newTask);
    atlasCreateTask(newTask);
  }

  saveTasks();
  renderAll();
  closeModal();
}

function deleteTemplateTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  atlasDeleteTask(id);
  renderAll();
  renderAll();
}

// ==========================================================================
// ANALYTICS DASHBOARD VIEW
// ==========================================================================

function renderAnalyticsDashboard() {
  const currentStreak = calculateStreak();
  const currentStreakEl = document.getElementById('analytics-current-streak');
  if (currentStreakEl) currentStreakEl.textContent = currentStreak;
  
  const bestStreakEl = document.getElementById('analytics-best-streak');
  if (bestStreakEl) bestStreakEl.textContent = state.bestStreak;

  // Calculate Weekly Completion %
  const weeklyPercent = getWeeklyCompletionPercent();
  const weeklyEl = document.getElementById('analytics-weekly-percent');
  if (weeklyEl) weeklyEl.textContent = `${weeklyPercent}%`;

  // Calculate Monthly Completion %
  const stats = getMonthlyStats();
  const monthlyEl = document.getElementById('analytics-monthly-percent');
  if (monthlyEl) monthlyEl.textContent = `${stats.consistency}%`;

  renderHabitHeatmap();
  renderTrendChart();
}

function renderHabitHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const today = new Date();
  const daysToShow = 365;
  
  const dates = [];
  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }

  const firstDate = dates[0];
  let emptyCellsStart = firstDate.getDay() - 1;
  if (emptyCellsStart < 0) emptyCellsStart = 6;
  
  for (let i = 0; i < emptyCellsStart; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.width = '14px';
    emptyCell.style.height = '14px';
    emptyCell.style.background = 'transparent';
    grid.appendChild(emptyCell);
  }

  dates.forEach(d => {
    const dateStr = formatDateString(d);
    const dayIndex = d.getDay();
    const activeTasks = state.tasks.filter(t => t.activeDays && t.activeDays.includes(dayIndex));
    let completed = 0;
    
    activeTasks.forEach(t => {
      if (t.completedDates && t.completedDates.includes(dateStr)) {
        completed++;
      }
    });

    let ratio = activeTasks.length === 0 ? 0 : completed / activeTasks.length;
    let levelClass = '';
    
    if (ratio === 0 && activeTasks.length > 0) {
      levelClass = '';
    } else if (ratio > 0 && ratio < 0.5) {
      levelClass = 'level-1';
    } else if (ratio >= 0.5 && ratio < 1) {
      levelClass = 'level-2';
    } else if (ratio === 1 && activeTasks.length > 0) {
      levelClass = 'level-3';
    }

    const cell = document.createElement('div');
    cell.className = `heatmap-cell ${levelClass}`;
    cell.title = `${dateStr}: ${completed}/${activeTasks.length} tasks completed`;
    grid.appendChild(cell);
  });
}

function renderTrendChart() {
  const canvas = document.getElementById('analytics-trend-chart');
  if (!canvas) return;

  // Lazy Load Chart.js
  if (typeof Chart === 'undefined') {
    if (document.getElementById('chartjs-script')) return; // Already loading
    const script = document.createElement('script');
    script.id = 'chartjs-script';
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.defer = true;
    script.onload = renderTrendChart;
    document.head.appendChild(script);
    return;
  }

  if (window.myTrendChart) {
    window.myTrendChart.destroy();
  }

  const today = new Date();
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateString(d);
    
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    labels.push(`${dayName} ${dayNum}`);

    const active = getActiveTasksForDate(dateStr);
    const completed = getCompletedTasksForDate(dateStr);

    const percent = active.length === 0 ? 0 : Math.round((completed.length / active.length) * 100);
    data.push(percent);
  }

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#9a3412';
  const primaryLightColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim() || '#c2410c';
  const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b';
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--card-border').trim() || 'rgba(0, 0, 0, 0.05)';

  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, primaryColor + '40');
  gradient.addColorStop(1, primaryColor + '00');

  window.myTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Completion Rate (%)',
        data: data,
        borderColor: primaryColor,
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: primaryColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: primaryLightColor,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            family: 'Outfit',
            size: 14,
            weight: '600'
          },
          bodyFont: {
            family: 'Outfit',
            size: 13
          },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Completion: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: {
            color: gridColor,
            borderDash: [5, 5]
          },
          ticks: {
            color: textMuted,
            font: {
              family: 'Outfit',
              size: 11
            },
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textMuted,
            font: {
              family: 'Outfit',
              size: 11
            }
          }
        }
      }
    }
  });
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
// BACKEND API CLIENT (calls Vercel serverless /api/* routes)
// ==========================================================================

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function apiDelete(path, body) {
  const res = await fetch(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Task sync helpers ──────────────────────────────────────────────────────

async function syncFromCloud() {
  if (!state.currentUser) return;
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(state.currentUser)}&_t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const { tasks: cloudTasks, completions: cloudCompletions } = data;

    if (cloudTasks.length > 0) {
      state.tasks = cloudTasks.map(t => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        reminderEnabled: t.reminderEnabled,
        reminderTime: t.reminderTime,
        activeDays: t.activeDays || [0, 1, 2, 3, 4, 5, 6],
        completedDates: cloudCompletions
          .filter(c => c.taskId === t._id)
          .map(c => c.completedDate),
      }));
      saveTasks();
      renderAll();
    } else {
      // First login — push local default tasks to cloud
      await pushLocalTasksToCloud();
    }
  } catch (err) {
    console.error('Cloud sync failed:', err);
  }
}

async function pushLocalTasksToCloud() {
  if (!state.currentUser || state.tasks.length === 0) return;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (const task of state.tasks) {
      await apiPost('/api/tasks', { userId: state.currentUser, timezone, task });
      
      // Sync local completions to cloud
      if (task.completedDates && task.completedDates.length > 0) {
        for (const dateStr of task.completedDates) {
          await atlasAddCompletion(task.id, dateStr);
        }
      }
    }
  } catch (err) {
    console.error('Failed to push tasks to cloud:', err);
  }
}

async function atlasCreateTask(task) {
  if (!state.currentUser) return;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await apiPost('/api/tasks', { userId: state.currentUser, timezone, task });
  } catch (err) {
    console.error('Create task error:', err);
  }
}

async function atlasUpdateTask(task) {
  if (!state.currentUser) return;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await apiPut('/api/tasks', {
      userId: state.currentUser,
      timezone,
      taskId: task.id,
      updates: { 
        title: task.title, 
        priority: task.priority, 
        activeDays: task.activeDays,
        reminderEnabled: task.reminderEnabled,
        reminderTime: task.reminderTime
      },
    });
  } catch (err) {
    console.error('Update task error:', err);
  }
}

async function atlasDeleteTask(taskId) {
  if (!state.currentUser) return;
  try {
    const res = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}&userId=${encodeURIComponent(state.currentUser)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
  } catch (err) {
    console.error('Delete task error:', err);
  }
}

async function atlasAddCompletion(taskId, dateStr) {
  if (!state.currentUser) return;
  try {
    await apiPost('/api/completions', {
      userId: state.currentUser,
      taskId,
      completedDate: dateStr,
    });
  } catch (err) {
    console.error('Add completion error:', err);
  }
}

async function atlasRemoveCompletion(taskId, dateStr) {
  if (!state.currentUser) return;
  try {
    await apiDelete('/api/completions', {
      userId: state.currentUser,
      taskId,
      completedDate: dateStr,
    });
  } catch (err) {
    console.error('Remove completion error:', err);
  }
}

// ==========================================================================
// AUTHENTICATION FORM SETUP
// ==========================================================================

function setupAuthForm() {
  const form = document.getElementById('auth-form');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const btnSubmit = document.getElementById('btn-auth-submit');
  const errorMsg = document.getElementById('auth-error-msg');
  const emailGroup = document.getElementById('auth-email-group');
  const emailInput = document.getElementById('auth-email');
  const usernameLabel = document.getElementById('auth-username-label');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const btnSignOut = document.getElementById('btn-sign-out');
  const btnMobileSignOut = document.getElementById('btn-mobile-sign-out');

  let authMode = 'login';

  // --- Google Identity Services (GIS) ---
  window.handleGoogleCredentialResponse = async (response) => {
    const credential = response.credential;
    if (!credential) return;

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Authenticating...';
    errorMsg.style.visibility = 'hidden';

    try {
      const res = await apiPost('/api/auth', { action: 'google', credential });
      state.currentUser = res.username;
      state.picture = res.picture || null;
      state.theme = res.theme || 'light';
      state.accent = res.accent || 'terracotta';

      const authData = { user: res.username, picture: res.picture, theme: res.theme, accent: res.accent, expiresAt: new Date().getTime() + 30 * 24 * 60 * 60 * 1000 };
      localStorage.setItem('dayknot_auth', JSON.stringify(authData));
      sessionStorage.removeItem('dayknot_current_user');
      
      setupTheme();
      usernameInput.value = '';
      passwordInput.value = '';
      if (emailInput) emailInput.value = '';

      loadData();
      updateAuthUI();
      renderAll();
      await syncFromCloud();
    } catch (err) {
      errorMsg.textContent = err.message || 'Google Sign-In failed';
      errorMsg.style.visibility = 'visible';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    }
  };

  // Lazy Load Google Identity Services
  window.loadGoogleAuth = function () {
    if (document.getElementById('google-gsi-script')) return;

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    
    script.onload = async () => {
      if (window.google) {
        try {
          const res = await fetch('/api/config');
          const config = await res.json();
          if (config.googleClientId) {
            google.accounts.id.initialize({
              client_id: config.googleClientId,
              callback: handleGoogleCredentialResponse
            });
            const googleBtnContainer = document.getElementById('google-btn-container');
            if (googleBtnContainer) {
              google.accounts.id.renderButton(
                googleBtnContainer,
                { theme: 'outline', size: 'large', width: 250, text: 'continue_with' }
              );
            }
          } else {
            console.warn('Google Client ID not found in server config.');
          }
        } catch (err) {
          console.error('Failed to load config for Google Sign-In', err);
        }
      }
    };
    document.head.appendChild(script);
  };

  tabLogin && tabLogin.addEventListener('click', () => {
    authMode = 'login';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    btnSubmit.textContent = 'Sign In';
    errorMsg.style.visibility = 'hidden';
    if (emailGroup) emailGroup.style.display = 'none';
    if (emailInput) emailInput.required = false;
    if (usernameLabel) usernameLabel.textContent = 'Email or Username';
  });

  tabSignup && tabSignup.addEventListener('click', () => {
    authMode = 'signup';
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    btnSubmit.textContent = 'Create Account';
    errorMsg.style.visibility = 'hidden';
    if (emailGroup) emailGroup.style.display = 'block';
    if (emailInput) emailInput.required = true;
    if (usernameLabel) usernameLabel.textContent = 'Display Name (Username)';
  });

  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

    if (!username || !password || (authMode === 'signup' && !email)) return;

    btnSubmit.disabled = true;
    btnSubmit.textContent = authMode === 'login' ? 'Signing In...' : 'Creating Account...';
    errorMsg.style.visibility = 'hidden';

    try {
      const passwordHash = await hashPassword(password);
      const res = await apiPost('/api/auth', { action: authMode, username, email, passwordHash });

      if (res.requiresVerification) {
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('verify-form').style.display = 'block';
        window.pendingVerificationEmail = res.email;
        btnSubmit.disabled = false;
        btnSubmit.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
        return;
      }

      state.currentUser = res.username;
      
      const rememberMe = document.getElementById('auth-remember-me');
      if (rememberMe && rememberMe.checked) {
        const expiresAt = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
        localStorage.setItem('dayknot_auth', JSON.stringify({ user: username, expiresAt }));
        sessionStorage.removeItem('dayknot_current_user');
        localStorage.removeItem('dayknot_current_user');
      } else {
        sessionStorage.setItem('dayknot_current_user', res.username);
        localStorage.removeItem('dayknot_auth');
        localStorage.removeItem('dayknot_current_user');
      }

      usernameInput.value = '';
      passwordInput.value = '';
      if (emailInput) emailInput.value = '';

      loadData();
      updateAuthUI();
      renderAll();

      // Sync data from cloud after login
      await syncFromCloud();
    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.style.visibility = 'visible';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    }
  });

  const verifyForm = document.getElementById('verify-form');
  const btnVerifySubmit = document.getElementById('btn-verify-submit');
  const verifyErrorMsg = document.getElementById('verify-error-msg');
  const verifyCodeInput = document.getElementById('verify-code');
  const btnVerifyCancel = document.getElementById('btn-verify-cancel');

  btnVerifyCancel && btnVerifyCancel.addEventListener('click', () => {
     document.getElementById('verify-form').style.display = 'none';
     document.getElementById('auth-form').style.display = 'block';
     verifyCodeInput.value = '';
     verifyErrorMsg.style.display = 'none';
  });

  verifyForm && verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = verifyCodeInput.value.trim();
    const email = window.pendingVerificationEmail;
    if (!code || !email) return;

    btnVerifySubmit.disabled = true;
    btnVerifySubmit.textContent = 'Verifying...';
    verifyErrorMsg.style.display = 'none';

    try {
      const res = await apiPost('/api/auth', { action: 'verify', email, code });
      
      state.currentUser = res.username;
      
      const rememberMe = document.getElementById('auth-remember-me');
      if (rememberMe && rememberMe.checked) {
        const expiresAt = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
        localStorage.setItem('dayknot_auth', JSON.stringify({ user: res.username, expiresAt }));
        sessionStorage.removeItem('dayknot_current_user');
        localStorage.removeItem('dayknot_current_user');
      } else {
        sessionStorage.setItem('dayknot_current_user', res.username);
        localStorage.removeItem('dayknot_auth');
        localStorage.removeItem('dayknot_current_user');
      }

      usernameInput.value = '';
      passwordInput.value = '';
      if (emailInput) emailInput.value = '';
      verifyCodeInput.value = '';

      document.getElementById('verify-form').style.display = 'none';
      document.getElementById('auth-form').style.display = 'block';

      loadData();
      updateAuthUI();
      renderAll();
      await syncFromCloud();
    } catch (err) {
      verifyErrorMsg.textContent = err.message;
      verifyErrorMsg.style.display = 'block';
    } finally {
      btnVerifySubmit.disabled = false;
      btnVerifySubmit.textContent = 'Verify Account';
    }
  });

  // --- Password Reset Flow ---
  const btnForgotPassword = document.getElementById('btn-forgot-password');
  const resetRequestForm = document.getElementById('reset-request-form');
  const btnResetRequestSubmit = document.getElementById('btn-reset-request-submit');
  const btnResetRequestCancel = document.getElementById('btn-reset-request-cancel');
  const resetRequestErrorMsg = document.getElementById('reset-request-error-msg');
  const resetEmailInput = document.getElementById('reset-email');

  const resetPasswordForm = document.getElementById('reset-password-form');
  const btnResetSubmit = document.getElementById('btn-reset-submit');
  const btnResetCancel = document.getElementById('btn-reset-cancel');
  const resetErrorMsg = document.getElementById('reset-error-msg');
  const resetCodeInput = document.getElementById('reset-code');
  const resetNewPasswordInput = document.getElementById('reset-new-password');

  btnForgotPassword && btnForgotPassword.addEventListener('click', () => {
    document.getElementById('auth-form').style.display = 'none';
    resetRequestForm.style.display = 'block';
    resetEmailInput.value = '';
    resetRequestErrorMsg.style.display = 'none';
  });

  btnResetRequestCancel && btnResetRequestCancel.addEventListener('click', () => {
    resetRequestForm.style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
  });

  resetRequestForm && resetRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetEmailInput.value.trim().toLowerCase();
    if (!email) return;

    btnResetRequestSubmit.disabled = true;
    btnResetRequestSubmit.textContent = 'Sending...';
    resetRequestErrorMsg.style.display = 'none';

    try {
      await apiPost('/api/password', { action: 'reset_request', email });
      window.pendingResetEmail = email;
      resetRequestForm.style.display = 'none';
      resetPasswordForm.style.display = 'block';
    } catch (err) {
      resetRequestErrorMsg.textContent = err.message;
      resetRequestErrorMsg.style.display = 'block';
    } finally {
      btnResetRequestSubmit.disabled = false;
      btnResetRequestSubmit.textContent = 'Send Reset Code';
    }
  });

  btnResetCancel && btnResetCancel.addEventListener('click', () => {
    resetPasswordForm.style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
    resetCodeInput.value = '';
    resetNewPasswordInput.value = '';
    resetErrorMsg.style.display = 'none';
  });

  resetPasswordForm && resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = resetCodeInput.value.trim();
    const newPassword = resetNewPasswordInput.value.trim();
    const email = window.pendingResetEmail;

    if (!code || !newPassword || !email) return;

    btnResetSubmit.disabled = true;
    btnResetSubmit.textContent = 'Updating...';
    resetErrorMsg.style.display = 'none';

    try {
      const newPasswordHash = await hashPassword(newPassword);
      await apiPost('/api/password', { action: 'reset', email, code, newPasswordHash });

      // Success, go back to login
      resetPasswordForm.style.display = 'none';
      document.getElementById('auth-form').style.display = 'block';
      if (usernameInput) usernameInput.value = email; // pre-fill
      alert('Password updated successfully. Please sign in with your new password.');
    } catch (err) {
      resetErrorMsg.textContent = err.message;
      resetErrorMsg.style.display = 'block';
    } finally {
      btnResetSubmit.disabled = false;
      btnResetSubmit.textContent = 'Update Password';
    }
  });

  const performSignOut = () => {
    localStorage.removeItem('dayknot_current_user');
    localStorage.removeItem('dayknot_auth');
    sessionStorage.removeItem('dayknot_current_user');
    sessionStorage.removeItem('dayknot_picture');
    sessionStorage.removeItem('dayknot_theme');
    sessionStorage.removeItem('dayknot_accent');
    state.currentUser = null;
    state.picture = null;
    state.tasks = [];
    state.bestStreak = 0;
    updateAuthUI();
    renderAll();
    const drawer = document.getElementById('side-nav-drawer');
    if (drawer) drawer.classList.remove('active');
  };

  btnSignOut && btnSignOut.addEventListener('click', performSignOut);
  btnMobileSignOut && btnMobileSignOut.addEventListener('click', performSignOut);
}

function updateAuthUI() {
  const overlay = document.getElementById('auth-overlay');
  const userDisplayName = document.getElementById('user-display-name');
  const sideDrawerUsername = document.getElementById('side-drawer-username');
  const modeDot = document.querySelector('.auth-mode-indicator .mode-dot');
  const modeText = document.querySelector('.auth-mode-indicator .mode-text');

  // Always cloud-connected now
  if (modeDot) modeDot.className = 'mode-dot online';
  if (modeText) modeText.textContent = 'Cloud Sync — MongoDB Atlas';

  if (state.currentUser) {
    overlay && overlay.classList.add('inactive');
    if (window.loadOneSignal) window.loadOneSignal();
    if (userDisplayName) userDisplayName.textContent = state.currentUser;
    if (sideDrawerUsername) sideDrawerUsername.textContent = state.currentUser;

    const avatars = document.querySelectorAll('.user-avatar, .profile-avatar');
    avatars.forEach(avatar => {
      if (state.picture) {
        avatar.innerHTML = `<img src="${state.picture}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">`;
      } else {
        avatar.textContent = '👤';
      }
    });

    const settingsAvatar = document.getElementById('settings-avatar-preview');
    if (settingsAvatar) {
      if (state.picture) {
        settingsAvatar.innerHTML = `<img src="${state.picture}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        settingsAvatar.textContent = '👤';
      }
    }
  } else {
    overlay && overlay.classList.remove('inactive');
    if (window.loadGoogleAuth) window.loadGoogleAuth();
  }
}


// --- Settings Form ---
function setupSettingsForm() {
  const btnSettings = document.getElementById('btn-settings');
  const userDisplayName = document.getElementById('user-display-name');
  const settingsModal = document.getElementById('settings-modal');
  const btnSettingsClose = document.getElementById('settings-modal-close');

  const openSettings = () => {
    if (!state.currentUser) return;
    document.getElementById('settings-username-input').value = state.currentUser;
    // reset all error msgs
    document.querySelectorAll('#settings-modal .auth-error-msg').forEach(el => el.style.display = 'none');
    settingsModal.classList.add('active');
  };

  const closeSettings = () => {
    settingsModal.classList.remove('active');
  };

  btnSettings && btnSettings.addEventListener('click', openSettings);
  userDisplayName && userDisplayName.addEventListener('click', openSettings);
  btnSettingsClose && btnSettingsClose.addEventListener('click', closeSettings);

  // Tab Switching Logic (Removed as all panes are now stacked vertically in one view)

  // Init Theme and Accent inputs
  const themeRadios = document.querySelectorAll('input[name="theme-pref"]');
  const accentBtns = document.querySelectorAll('.accent-btn');

  const updateServerTheme = async (theme, accent) => {
    try {
      await apiPost('/api/account', { action: 'update_theme', currentUser: state.currentUser, theme, accent });
      
      // Update local storage auth state
      if (localStorage.getItem('dayknot_auth')) {
        const authData = JSON.parse(localStorage.getItem('dayknot_auth'));
        if (theme) authData.theme = theme;
        if (accent) authData.accent = accent;
        localStorage.setItem('dayknot_auth', JSON.stringify(authData));
      } else {
        if (theme) sessionStorage.setItem('dayknot_theme', theme);
        if (accent) sessionStorage.setItem('dayknot_accent', accent);
      }
      
      if (theme) state.theme = theme;
      if (accent) state.accent = accent;
      setupTheme();
    } catch (err) {
      console.error('Failed to update theme preference:', err);
    }
  };

  themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) updateServerTheme(e.target.value, null);
    });
  });

  accentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      updateServerTheme(null, btn.dataset.color);
    });
  });

  // Helper to sync radio buttons UI when opening settings
  const syncSettingsUI = () => {
    themeRadios.forEach(radio => {
      if (radio.value === (state.theme || 'light')) radio.checked = true;
    });
  };
  
  // Hook openSettings to sync theme UI
  const originalOpenSettings = openSettings;
  btnSettings && btnSettings.removeEventListener('click', openSettings);
  userDisplayName && userDisplayName.removeEventListener('click', openSettings);
  
  const newOpenSettings = () => {
    syncSettingsUI();
    originalOpenSettings();
  };
  btnSettings && btnSettings.addEventListener('click', newOpenSettings);
  userDisplayName && userDisplayName.addEventListener('click', newOpenSettings);

  const mobileProfile = document.getElementById('mobile-profile-settings');
  if (mobileProfile) {
    mobileProfile.addEventListener('click', () => {
      const sideNavDrawer = document.getElementById('side-nav-drawer');
      if (sideNavDrawer) sideNavDrawer.classList.remove('active');
      newOpenSettings();
    });
  }

  // Avatar Upload Logic
  const avatarUpload = document.getElementById('settings-avatar-upload');
  const avatarStatus = document.getElementById('settings-avatar-status');
  
  avatarUpload && avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    avatarStatus.style.display = 'block';
    avatarStatus.style.color = 'var(--text-secondary)';
    avatarStatus.textContent = 'Processing image...';

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions, maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress image to WebP (or JPEG if WebP not supported)
        const base64Image = canvas.toDataURL('image/webp', 0.8);
        
        avatarStatus.textContent = 'Uploading...';
        
        // Send to backend
        apiPost('/api/account', { action: 'upload_picture', currentUser: state.currentUser, picture: base64Image })
          .then(res => {
            avatarStatus.style.color = 'var(--color-emerald)';
            avatarStatus.textContent = 'Avatar updated successfully!';
            
            state.picture = res.picture;
            
            if (localStorage.getItem('dayknot_auth')) {
              const authData = JSON.parse(localStorage.getItem('dayknot_auth'));
              authData.picture = res.picture;
              localStorage.setItem('dayknot_auth', JSON.stringify(authData));
            } else {
              sessionStorage.setItem('dayknot_picture', res.picture);
            }
            
            updateAuthUI();
            
            setTimeout(() => {
              avatarStatus.style.display = 'none';
            }, 3000);
          })
          .catch(err => {
            avatarStatus.style.color = 'var(--color-rose)';
            avatarStatus.textContent = 'Upload failed: ' + err.message;
          });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // 1. Update Username
  const usernameForm = document.getElementById('settings-username-form');
  const btnUsernameSubmit = document.getElementById('btn-settings-username-submit');
  const usernameError = document.getElementById('settings-username-error-msg');
  
  usernameForm && usernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('settings-username-input').value.trim().toLowerCase();
    if (!newUsername || newUsername === state.currentUser) return;

    btnUsernameSubmit.disabled = true;
    btnUsernameSubmit.textContent = 'Updating...';
    usernameError.style.display = 'none';

    try {
      const res = await apiPost('/api/account', { action: 'update_username', currentUser: state.currentUser, newUsername });
      if (localStorage.getItem('dayknot_auth')) {
        const currentAuth = JSON.parse(localStorage.getItem('dayknot_auth'));
        currentAuth.user = res.username;
        localStorage.setItem('dayknot_auth', JSON.stringify(currentAuth));
      } else if (sessionStorage.getItem('dayknot_current_user')) {
        sessionStorage.setItem('dayknot_current_user', res.username);
      }
      state.currentUser = res.username;
      updateAuthUI();
      renderAll();
      alert('Username updated successfully!');
    } catch (err) {
      usernameError.textContent = err.message;
      usernameError.style.display = 'block';
    } finally {
      btnUsernameSubmit.disabled = false;
      btnUsernameSubmit.textContent = 'Update Username';
    }
  });

  // 2. Change Email Request
  const emailForm = document.getElementById('settings-email-form');
  const btnEmailSubmit = document.getElementById('btn-settings-email-submit');
  const emailError = document.getElementById('settings-email-error-msg');
  const emailVerifyForm = document.getElementById('settings-email-verify-form');

  emailForm && emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById('settings-email-input').value.trim().toLowerCase();
    if (!newEmail) return;

    btnEmailSubmit.disabled = true;
    btnEmailSubmit.textContent = 'Sending code...';
    emailError.style.display = 'none';

    try {
      await apiPost('/api/account', { action: 'change_email_request', currentUser: state.currentUser, newEmail });
      window.pendingSettingsEmail = newEmail;
      emailForm.style.display = 'none';
      emailVerifyForm.style.display = 'block';
    } catch (err) {
      emailError.textContent = err.message;
      emailError.style.display = 'block';
    } finally {
      btnEmailSubmit.disabled = false;
      btnEmailSubmit.textContent = 'Change Email';
    }
  });

  // Change Email Verify
  const btnEmailVerifyCancel = document.getElementById('btn-settings-email-verify-cancel');
  const btnEmailVerifySubmit = document.getElementById('btn-settings-email-verify-submit');
  const emailVerifyError = document.getElementById('settings-email-verify-error-msg');

  btnEmailVerifyCancel && btnEmailVerifyCancel.addEventListener('click', () => {
    emailVerifyForm.style.display = 'none';
    emailForm.style.display = 'block';
    document.getElementById('settings-email-verify-input').value = '';
  });

  emailVerifyForm && emailVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('settings-email-verify-input').value.trim();
    if (!code || !window.pendingSettingsEmail) return;

    btnEmailVerifySubmit.disabled = true;
    btnEmailVerifySubmit.textContent = 'Verifying...';
    emailVerifyError.style.display = 'none';

    try {
      await apiPost('/api/account', { action: 'change_email_verify', currentUser: state.currentUser, code });
      alert('Email updated successfully!');
      emailVerifyForm.style.display = 'none';
      emailForm.style.display = 'block';
      document.getElementById('settings-email-input').value = '';
      document.getElementById('settings-email-verify-input').value = '';
    } catch (err) {
      emailVerifyError.textContent = err.message;
      emailVerifyError.style.display = 'block';
    } finally {
      btnEmailVerifySubmit.disabled = false;
      btnEmailVerifySubmit.textContent = 'Verify & Update Email';
    }
  });

  // 3. Change Password
  const passwordForm = document.getElementById('settings-password-form');
  const btnPasswordSubmit = document.getElementById('btn-settings-password-submit');
  const passwordError = document.getElementById('settings-password-error-msg');

  passwordForm && passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('settings-current-password-input').value.trim();
    const newPassword = document.getElementById('settings-new-password-input').value.trim();
    if (!currentPassword || !newPassword) return;

    btnPasswordSubmit.disabled = true;
    btnPasswordSubmit.textContent = 'Updating...';
    passwordError.style.display = 'none';

    try {
      const currentPasswordHash = await hashPassword(currentPassword);
      const newPasswordHash = await hashPassword(newPassword);
      await apiPost('/api/account', { action: 'change_password', currentUser: state.currentUser, currentPasswordHash, newPasswordHash });
      
      alert('Password updated successfully!');
      document.getElementById('settings-current-password-input').value = '';
      document.getElementById('settings-new-password-input').value = '';
    } catch (err) {
      passwordError.textContent = err.message;
      passwordError.style.display = 'block';
    } finally {
      btnPasswordSubmit.disabled = false;
      btnPasswordSubmit.textContent = 'Update Password';
    }
  });

  // 4. Delete Account
  const btnDeleteAccount = document.getElementById('btn-settings-delete-account');
  const deleteError = document.getElementById('settings-delete-error-msg');

  btnDeleteAccount && btnDeleteAccount.addEventListener('click', async () => {
    const confirmDelete = window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and all data will be lost.');
    if (!confirmDelete) return;

    btnDeleteAccount.disabled = true;
    btnDeleteAccount.textContent = 'Deleting...';
    deleteError.style.display = 'none';

    try {
      await apiPost('/api/account', { action: 'delete_account', currentUser: state.currentUser });
      
      alert('Your account has been deleted.');
      closeSettings();
      // Use existing sign-out logic to clear local state
      const performSignOut = document.getElementById('btn-sign-out').click(); 
    } catch (err) {
      deleteError.textContent = err.message;
      deleteError.style.display = 'block';
      btnDeleteAccount.disabled = false;
      btnDeleteAccount.textContent = 'Delete Account Permanently';
    }
  });
}

// Ensure this gets called on load
document.addEventListener('DOMContentLoaded', () => {
  setupSettingsForm();
});
