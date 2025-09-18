
// script.js
// 核心思路：监听表单 submit，维护总计数与每队计数，更新 DOM（出席数、进度条、每队计数、欢迎信息）
// 当达到目标时触发庆祝并高亮胜出队伍。

(function () {
  // ----- 配置 -----
  const MAX_COUNT = 50; // 目标人数（如需改动这里改）
  // teamValue 预期值： 'water' | 'net' | 'power' （如果你的 select value 不一样，可在 map 中调整）
  const TEAM_KEY_MAP = {
    water: 'water',
    net: 'net',
    power: 'power',
    // 兼容性：常见可能的 value 名称（可按需扩展）
    'waterwise': 'water',
    'netzero': 'net',
    'renewables': 'power',
  };

  // ----- 选择页面元素（多重尝试以提高兼容性） -----
  const form = document.getElementById('check-in-form') || document.querySelector('form#check-in-form') || document.querySelector('form');
  const nameInput = document.getElementById('attendeeName') || document.querySelector('input[name="attendeeName"], input[name="name"], input#attendee-name, input[type="text"]');
  const teamSelect = document.getElementById('teamSelect') || document.querySelector('select[name="team"], select#team-select, select');

  // Attendance display: "Attendance: X / 50" —— 尝试多种常见选择器
  const attendanceTextEl = document.getElementById('attendanceCount') || document.querySelector('.attendance-count') || document.querySelector('#attendance .count') || document.querySelector('#attendance');

  // Progress fill (用于设置 width)
  const progressFill = document.getElementById('progressFill') || document.querySelector('.progress-fill') || document.querySelector('.progress__bar .fill') || document.querySelector('.progress-inner');

  // 如果页面上想显示百分比的元素（可选）
  const progressPercentEl = document.getElementById('progressPercent') || document.querySelector('.progress-percent');

  // team count elements：尝试常见 id 命名： waterCount / netCount / powerCount 或 water-count / net-count / power-count
  const teamEls = {
    water: document.getElementById('waterCount') || document.getElementById('water-count') || document.querySelector('[data-team="water"] .team-count') || document.querySelector('.team-water .count'),
    net:   document.getElementById('netCount')   || document.getElementById('net-count')   || document.querySelector('[data-team="net"] .team-count')   || document.querySelector('.team-net .count'),
    power: document.getElementById('powerCount') || document.getElementById('power-count') || document.querySelector('[data-team="power"] .team-count') || document.querySelector('.team-power .count'),
  };

  // team card elements (用于高亮胜出队) - 可选，如果你的 HTML 有包裹卡片，可以添加 data-team 或 class，方便高亮
  const teamCardEls = {
    water: document.querySelector('[data-team="water"]') || document.querySelector('.team-water'),
    net: document.querySelector('[data-team="net"]') || document.querySelector('.team-net'),
    power: document.querySelector('[data-team="power"]') || document.querySelector('.team-power'),
  };

  // greeting / celebration area（若不存在会创建一个）
  let messageEl = document.getElementById('greetingMessage') || document.querySelector('.greeting-message');
  if (!messageEl) {
    // 尝试在表单上方或表单后创建一个区域
    const target = form || document.body;
    messageEl = document.createElement('div');
    messageEl.id = 'greetingMessage';
    messageEl.className = 'greeting-message';
    // 插入到 form 之前（如果 form 存在），否则放到 body 顶部
    if (target.parentNode) target.parentNode.insertBefore(messageEl, target);
    else document.body.insertBefore(messageEl, document.body.firstChild);
  }

  // celebration area
  let celebrationEl = document.getElementById('celebration') || document.querySelector('.celebration');
  if (!celebrationEl) {
    celebrationEl = document.createElement('div');
    celebrationEl.id = 'celebration';
    celebrationEl.className = 'celebration';
    celebrationEl.style.display = 'none';
    messageEl.parentNode.insertBefore(celebrationEl, messageEl.nextSibling);
  }

  // ----- 状态 -----
  let totalCount = 0;
  const teamCounts = {
    water: 0,
    net: 0,
    power: 0,
  };
  let celebrated = false; // 只庆祝一次，或当达到目标时

  // ----- 帮助函数 -----
  function normalizeTeamValue(value) {
    if (!value) return null;
    value = value.toString().trim().toLowerCase();
    return TEAM_KEY_MAP[value] || value;
  }

  function updateAttendanceDisplay() {
    if (attendanceTextEl) {
      // 常见展示： "Attendance: 7 / 50" 或直接 "7 / 50"
      attendanceTextEl.textContent = `Attendance: ${totalCount} / ${MAX_COUNT}`;
    }
  }

  function updateProgressBar() {
    if (!progressFill) return;
    const percent = Math.round((totalCount / MAX_COUNT) * 100);
    progressFill.style.width = `${Math.min(percent, 100)}%`;
    if (progressPercentEl) progressPercentEl.textContent = `${Math.min(percent, 100)}%`;
  }

  function updateTeamDisplays() {
    if (teamEls.water) teamEls.water.textContent = teamCounts.water;
    if (teamEls.net) teamEls.net.textContent = teamCounts.net;
    if (teamEls.power) teamEls.power.textContent = teamCounts.power;
  }

  function showGreeting(name, teamText) {
    // 简短的个性化欢迎信息
    messageEl.innerHTML = `🎉 Welcome, <strong>${escapeHtml(name)}</strong> from <strong>${escapeHtml(teamText)}</strong>!`;
    // 简短动画显示（可通过 CSS 优化）
    messageEl.style.opacity = '1';
    messageEl.style.transition = 'opacity 0.4s';
    // 3秒后淡出（但保留在DOM）
    setTimeout(() => {
      messageEl.style.opacity = '0.9';
    }, 3000);
  }

  function showCelebration(winningTeams) {
    // winningTeams: array of keys (可能并列)
    celebrated = true;
    // 显示庆祝信息
    const names = winningTeams.map(k => prettyTeamName(k)).join(' & ');
    celebrationEl.style.display = 'block';
    celebrationEl.innerHTML = `🎊 Goal reached! Top team: <strong>${escapeHtml(names)}</strong> — great job!`;
    // 给获胜队添加 class 'winner'（高亮）
    Object.keys(teamCardEls).forEach(k => {
      const el = teamCardEls[k];
      if (!el) return;
      if (winningTeams.includes(k)) el.classList.add('winner');
      else el.classList.remove('winner');
    });
    // 也可做简单 confetti（文本版）
    const confetti = document.createElement('div');
    confetti.className = 'mini-confetti';
    confetti.textContent = '🎉';
    celebrationEl.appendChild(confetti);
  }

  function prettyTeamName(key) {
    switch (key) {
      case 'water': return 'Team Water Wise';
      case 'net': return 'Team Net Zero';
      case 'power': return 'Team Renewables';
      default: return key;
    }
  }

  function determineWinningTeams() {
    const max = Math.max(teamCounts.water, teamCounts.net, teamCounts.power);
    const winners = [];
    Object.keys(teamCounts).forEach(k => {
      if (teamCounts[k] === max && max > 0) winners.push(k);
    });
    return winners;
  }

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ----- 表单 submit 处理 -----
  if (!form) {
    console.warn('Check-in form not found. Make sure your HTML has an id="check-in-form" or at least a <form>.');
    return;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = (nameInput && nameInput.value) ? nameInput.value.trim() : '';
    const rawTeamValue = (teamSelect && teamSelect.value) ? teamSelect.value : '';
    const teamKey = normalizeTeamValue(rawTeamValue);

    // 获取下拉中可读文本（例如 "Team Water Wise"）
    let teamText = rawTeamValue;
    try {
      if (teamSelect && teamSelect.selectedOptions && teamSelect.selectedOptions[0]) {
        teamText = teamSelect.selectedOptions[0].text;
      }
    } catch (e) { /* ignore */ }

    if (!name) {
      // 友好提示 —— 你可以换成页面内提示 dom 元素
      alert('Please enter a name before checking in.');
      return;
    }
    if (!teamKey) {
      alert('Please select a team.');
      return;
    }

    // 更新计数（总计与队伍）
    totalCount += 1;
    if (teamCounts[teamKey] === undefined) {
      // 如果是未知 key，先创建一个槽（兼容性）
      teamCounts[teamKey] = 1;
    } else {
      teamCounts[teamKey] += 1;
    }

    // 更新页面显示
    updateAttendanceDisplay();
    updateTeamDisplays();
    updateProgressBar();

    // 显示欢迎信息
    showGreeting(name, teamText);

    // 如果达到了目标，触发庆祝（只触发一次）
    if (totalCount >= MAX_COUNT && !celebrated) {
      const winners = determineWinningTeams();
      showCelebration(winners);
    }

    // 重置表单，准备下一个签到（保留焦点在 name 输入上）
    try { form.reset(); } catch (e) {}
    if (nameInput) nameInput.focus();
  });

  // 初始化页面（如果页面已有初始计数值，可以在此读取并初始化 totalCount/teamCounts）
  function initFromDOMIfPresent() {
    // 尝试从 DOM 读取现有数字（若页面有初始值）
    // attendanceTextEl 可能显示 "Attendance: 7 / 50" 或 "7 / 50"
    if (attendanceTextEl) {
      const txt = attendanceTextEl.textContent || '';
      const m = txt.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        totalCount = parseInt(m[1], 10);
      }
    }
    // teamEls water/net/power 里如果已有数字，读取之
    Object.keys(teamEls).forEach(k => {
      const el = teamEls[k];
      if (!el) return;
      const num = parseInt((el.textContent || '').trim(), 10);
      if (!isNaN(num)) teamCounts[k] = num;
    });

    // 顶层更新
    updateAttendanceDisplay();
    updateTeamDisplays();
    updateProgressBar();
  }

  initFromDOMIfPresent();

})(); // IIFE end
