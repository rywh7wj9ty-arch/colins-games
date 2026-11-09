(function () {
  'use strict';

  var SPECIES = window.BIRD_DIARY_SPECIES || [];
  var PLACES = window.BIRD_DIARY_PLACES || ['Sandwich Bay', 'Elmley', 'Stodmarsh', 'Grove Ferry', 'Garden', 'Other'];
  var LS_KEY = 'bird-diary-phone-v1';
  var DATA_URL = 'data/sightings.json?v=' + Date.now();

  var shared = { days: [] };
  var phone = loadPhone();
  var selectedSuggest = -1;

  var el = {
    place: document.getElementById('place'),
    birdInput: document.getElementById('birdInput'),
    suggest: document.getElementById('suggest'),
    btnAdd: document.getElementById('btnAdd'),
    btnMic: document.getElementById('btnMic'),
    micStatus: document.getElementById('micStatus'),
    todayLabel: document.getElementById('todayLabel'),
    todayPlace: document.getElementById('todayPlace'),
    todayList: document.getElementById('todayList'),
    todayEmpty: document.getElementById('todayEmpty'),
    log: document.getElementById('log'),
    logEmpty: document.getElementById('logEmpty'),
    filter: document.getElementById('filter'),
    filterResults: document.getElementById('filterResults'),
    btnStats: document.getElementById('btnStats'),
    statsPanel: document.getElementById('statsPanel'),
    statSpecies: document.getElementById('statSpecies'),
    statDays: document.getElementById('statDays'),
    statPlace: document.getElementById('statPlace'),
    yearList: document.getElementById('yearList'),
    btnExport: document.getElementById('btnExport'),
    exportBox: document.getElementById('exportBox')
  };

  function todayISO() {
    // Europe/London calendar date
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  }

  function formatDate(iso) {
    var parts = iso.split('-').map(Number);
    var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // use UTC parts so London calendar date stays stable
    return days[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  function loadPhone() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { days: [] };
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.days)) return { days: [] };
      return parsed;
    } catch (e) {
      return { days: [] };
    }
  }

  function savePhone() {
    localStorage.setItem(LS_KEY, JSON.stringify(phone));
  }

  function cloneDays(src) {
    return (src.days || []).map(function (d) {
      return {
        date: d.date,
        place: d.place || 'Other',
        birds: (d.birds || []).map(function (b) {
          return { name: b.name, count: Number(b.count) || 1, note: b.note || '', phone: !!b.phone };
        }),
        phoneOnly: !!d.phoneOnly
      };
    });
  }

  function mergeAll() {
    var byDate = {};
    cloneDays(shared).forEach(function (d) {
      byDate[d.date] = {
        date: d.date,
        place: d.place,
        birds: d.birds.map(function (b) {
          return { name: b.name, count: b.count, note: b.note, phone: false };
        })
      };
    });
    cloneDays(phone).forEach(function (d) {
      if (!byDate[d.date]) {
        byDate[d.date] = { date: d.date, place: d.place, birds: [] };
      } else if (d.place && d.place !== 'Other') {
        // phone place wins only if shared had Other / empty? Prefer shared place when present.
        if (!byDate[d.date].place || byDate[d.date].place === 'Other') byDate[d.date].place = d.place;
      }
      (d.birds || []).forEach(function (b) {
        var existing = byDate[d.date].birds.find(function (x) {
          return x.name.toLowerCase() === b.name.toLowerCase() && !!x.phone === true;
        });
        // If same species already on shared list, still show phone copy separately? Better: merge counts if phone-only add of same name
        var sharedHit = byDate[d.date].birds.find(function (x) {
          return x.name.toLowerCase() === b.name.toLowerCase() && !x.phone;
        });
        if (sharedHit) {
          // already in shared diary — skip phone duplicate display of same bird
          return;
        }
        if (existing) {
          existing.count += b.count;
        } else {
          byDate[d.date].birds.push({ name: b.name, count: b.count, note: b.note || '', phone: true });
        }
      });
    });
    return Object.keys(byDate)
      .sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; })
      .map(function (k) { return byDate[k]; });
  }

  function fillPlaces() {
    el.place.innerHTML = PLACES.map(function (p) {
      return '<option value="' + esc(p) + '">' + esc(p) + '</option>';
    }).join('');
    var saved = localStorage.getItem('bird-diary-last-place');
    if (saved && PLACES.indexOf(saved) >= 0) el.place.value = saved;
    else el.place.value = 'Elmley';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function normalizeQuery(q) {
    return String(q || '').trim().toLowerCase().replace(/[’']/g, "'");
  }

  var ALIAS_HINTS = {
    seo: 'Short-eared Owl',
    beardie: 'Bearded Reedling',
    'bearded tit': 'Bearded Reedling',
    kingfishers: 'Kingfisher'
  };

  function matchSpecies(q) {
    q = normalizeQuery(q);
    if (!q) return [];
    if (ALIAS_HINTS[q]) {
      var a = ALIAS_HINTS[q];
      return SPECIES.filter(function (s) { return s === a; }).concat(
        SPECIES.filter(function (s) { return s !== a && s.toLowerCase().indexOf(q) >= 0; })
      ).slice(0, 8);
    }
    var starts = [];
    var contains = [];
    SPECIES.forEach(function (s) {
      var low = s.toLowerCase();
      if (low.indexOf(q) === 0) starts.push(s);
      else if (low.indexOf(q) >= 0) contains.push(s);
    });
    return starts.concat(contains).slice(0, 8);
  }

  function showSuggest(items) {
    selectedSuggest = -1;
    if (!items.length) {
      el.suggest.hidden = true;
      el.suggest.innerHTML = '';
      return;
    }
    el.suggest.innerHTML = items.map(function (s, i) {
      return '<li role="option" data-i="' + i + '" id="sug-' + i + '">' + esc(s) + '</li>';
    }).join('');
    el.suggest.hidden = false;
  }

  function pickSuggest(name) {
    el.birdInput.value = name;
    el.suggest.hidden = true;
    el.birdInput.focus();
  }

  function addPhoneBird(name, count) {
    name = String(name || '').trim();
    if (!name) return;
    // prefer canonical species casing
    var hit = SPECIES.find(function (s) { return s.toLowerCase() === name.toLowerCase(); });
    if (hit) name = hit;
    else if (ALIAS_HINTS[normalizeQuery(name)]) name = ALIAS_HINTS[normalizeQuery(name)];
    count = count || 1;
    var day = todayISO();
    var place = el.place.value || 'Other';
    localStorage.setItem('bird-diary-last-place', place);
    var d = phone.days.find(function (x) { return x.date === day; });
    if (!d) {
      d = { date: day, place: place, birds: [] };
      phone.days.push(d);
    } else {
      d.place = place;
    }
    var b = d.birds.find(function (x) { return x.name.toLowerCase() === name.toLowerCase(); });
    if (b) b.count = (Number(b.count) || 0) + count;
    else d.birds.push({ name: name, count: count, note: '' });
    savePhone();
    el.birdInput.value = '';
    showSuggest([]);
    render();
  }

  function removePhoneBird(date, name) {
    var d = phone.days.find(function (x) { return x.date === date; });
    if (!d) return;
    d.birds = d.birds.filter(function (b) { return b.name.toLowerCase() !== name.toLowerCase(); });
    if (!d.birds.length) phone.days = phone.days.filter(function (x) { return x !== d; });
    savePhone();
    render();
  }

  function renderBirdItems(birds, date, allowRemovePhone) {
    return birds.map(function (b) {
      var tag = b.phone ? ' <span class="phone-tag">on this phone</span>' : '';
      var rm = (b.phone && allowRemovePhone)
        ? '<button type="button" class="rm" data-rm-date="' + esc(date) + '" data-rm-name="' + esc(b.name) + '" aria-label="Remove">×</button>'
        : '';
      var c = Number(b.count) || 1;
      return '<li><span class="bird-name">' + esc(b.name) + tag + '</span><span><span class="count">×' + c + '</span>' + rm + '</span></li>';
    }).join('');
  }

  function render() {
    var days = mergeAll();
    var today = todayISO();
    el.todayLabel.textContent = '· ' + formatDate(today);

    var todayDay = days.find(function (d) { return d.date === today; });
    if (todayDay && todayDay.birds.length) {
      el.todayPlace.textContent = todayDay.place || '';
      el.todayPlace.hidden = !todayDay.place;
      el.todayList.innerHTML = renderBirdItems(todayDay.birds, today, true);
      el.todayEmpty.hidden = true;
      el.todayList.hidden = false;
    } else {
      el.todayPlace.textContent = el.place.value || '';
      el.todayPlace.hidden = false;
      el.todayList.innerHTML = '';
      el.todayList.hidden = true;
      el.todayEmpty.hidden = false;
    }

    var others = days.filter(function (d) { return d.birds && d.birds.length; });
    if (!others.length) {
      el.log.innerHTML = '';
      el.logEmpty.hidden = false;
    } else {
      el.logEmpty.hidden = true;
      el.log.innerHTML = others.map(function (d) {
        return '<article class="day-card">' +
          '<header><span class="date">' + esc(formatDate(d.date)) + '</span><span class="place">' + esc(d.place || '') + '</span></header>' +
          '<ul class="day-birds">' + renderBirdItems(d.birds, d.date, true) + '</ul></article>';
      }).join('');
    }

    renderStats(days);
    renderFilter(days);
  }

  function yearOf(iso) { return iso.slice(0, 4); }

  function renderStats(days) {
    var y = yearOf(todayISO());
    var firstSeen = {};
    var placeCount = {};
    var daySet = {};
    days.forEach(function (d) {
      if (yearOf(d.date) !== y) return;
      if (!d.birds || !d.birds.length) return;
      daySet[d.date] = true;
      placeCount[d.place || 'Other'] = (placeCount[d.place || 'Other'] || 0) + 1;
      d.birds.forEach(function (b) {
        if (!firstSeen[b.name] || d.date < firstSeen[b.name]) firstSeen[b.name] = d.date;
      });
    });
    var species = Object.keys(firstSeen).sort(function (a, b) {
      return firstSeen[a] < firstSeen[b] ? -1 : firstSeen[a] > firstSeen[b] ? 1 : a.localeCompare(b);
    });
    el.statSpecies.textContent = String(species.length);
    el.statDays.textContent = String(Object.keys(daySet).length);
    var fav = Object.keys(placeCount).sort(function (a, b) { return placeCount[b] - placeCount[a]; })[0];
    el.statPlace.textContent = fav || '—';
    el.yearList.innerHTML = species.map(function (n) {
      return '<li><b>' + esc(n) + '</b> · ' + esc(formatDate(firstSeen[n])) + '</li>';
    }).join('') || '<li class="muted">No species yet this year.</li>';
  }

  function renderFilter(days) {
    var q = normalizeQuery(el.filter.value);
    if (!q) {
      el.filterResults.hidden = true;
      el.filterResults.innerHTML = '';
      return;
    }
    var hits = [];
    days.forEach(function (d) {
      (d.birds || []).forEach(function (b) {
        if (b.name.toLowerCase().indexOf(q) >= 0) {
          hits.push({ date: d.date, place: d.place, name: b.name, count: b.count, phone: b.phone });
        }
      });
    });
    el.filterResults.hidden = false;
    if (!hits.length) {
      el.filterResults.innerHTML = '<p class="muted">No matches.</p>';
      return;
    }
    el.filterResults.innerHTML = hits.map(function (h) {
      return '<div class="hit"><b>' + esc(h.name) + '</b> ×' + (h.count || 1) +
        (h.phone ? ' <span class="phone-tag">on this phone</span>' : '') +
        '<br><span class="muted">' + esc(formatDate(h.date)) + ' · ' + esc(h.place || '') + '</span></div>';
    }).join('');
  }

  function setupMic() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      el.btnMic.hidden = true;
      return;
    }
    el.btnMic.hidden = false;
    var rec = new SR();
    rec.lang = 'en-GB';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    var listening = false;
    el.btnMic.addEventListener('click', function () {
      if (listening) {
        try { rec.stop(); } catch (e) {}
        return;
      }
      el.micStatus.hidden = false;
      el.micStatus.textContent = 'Listening… say a bird name';
      el.btnMic.classList.add('listening');
      listening = true;
      try { rec.start(); } catch (e) {
        listening = false;
        el.btnMic.classList.remove('listening');
        el.micStatus.textContent = 'Could not start microphone';
      }
    });
    rec.onresult = function (ev) {
      var text = (ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || '';
      text = text.trim();
      el.micStatus.textContent = text ? ('Heard: ' + text) : 'Nothing heard';
      if (text) {
        var matches = matchSpecies(text);
        if (matches.length) pickSuggest(matches[0]);
        else el.birdInput.value = text.charAt(0).toUpperCase() + text.slice(1);
      }
    };
    rec.onerror = function () {
      el.micStatus.hidden = false;
      el.micStatus.textContent = 'Speech not available right now';
    };
    rec.onend = function () {
      listening = false;
      el.btnMic.classList.remove('listening');
    };
  }

  el.birdInput.addEventListener('input', function () {
    showSuggest(matchSpecies(el.birdInput.value));
  });
  el.birdInput.addEventListener('keydown', function (e) {
    var items = el.suggest.querySelectorAll('li');
    if (e.key === 'ArrowDown' && !el.suggest.hidden) {
      e.preventDefault();
      selectedSuggest = Math.min(items.length - 1, selectedSuggest + 1);
      items.forEach(function (li, i) { li.setAttribute('aria-selected', i === selectedSuggest ? 'true' : 'false'); });
    } else if (e.key === 'ArrowUp' && !el.suggest.hidden) {
      e.preventDefault();
      selectedSuggest = Math.max(0, selectedSuggest - 1);
      items.forEach(function (li, i) { li.setAttribute('aria-selected', i === selectedSuggest ? 'true' : 'false'); });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggest >= 0 && items[selectedSuggest]) pickSuggest(items[selectedSuggest].textContent);
      el.btnAdd.click();
    } else if (e.key === 'Escape') {
      showSuggest([]);
    }
  });
  el.suggest.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    pickSuggest(li.textContent);
  });
  el.btnAdd.addEventListener('click', function () {
    var raw = el.birdInput.value.trim();
    if (!raw) return;
    var m = raw.match(/^(.*?)(?:\s*[x×]\s*(\d+)|\s+(\d+))?$/i);
    var name = (m && m[1] ? m[1] : raw).trim();
    var count = (m && (m[2] || m[3])) ? parseInt(m[2] || m[3], 10) : 1;
    var matches = matchSpecies(name);
    if (matches.length === 1 || (matches.length && matches[0].toLowerCase() === name.toLowerCase())) name = matches[0];
    addPhoneBird(name, count || 1);
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-rm-name]');
    if (btn) {
      removePhoneBird(btn.getAttribute('data-rm-date'), btn.getAttribute('data-rm-name'));
      return;
    }
    if (!e.target.closest('.input-wrap')) showSuggest([]);
  });
  el.filter.addEventListener('input', function () { renderFilter(mergeAll()); });
  el.btnStats.addEventListener('click', function () {
    var open = el.statsPanel.hidden;
    el.statsPanel.hidden = !open;
    el.btnStats.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  el.place.addEventListener('change', function () {
    localStorage.setItem('bird-diary-last-place', el.place.value);
    // update today's phone place if exists
    var day = todayISO();
    var d = phone.days.find(function (x) { return x.date === day; });
    if (d) { d.place = el.place.value; savePhone(); render(); }
    else { el.todayPlace.textContent = el.place.value; }
  });
  el.btnExport.addEventListener('click', function () {
    if (!phone.days.length) {
      el.exportBox.hidden = false;
      el.exportBox.value = 'No phone-only entries to export.';
      return;
    }
    var text = 'Bird diary phone entries for Grok:\n' + JSON.stringify(phone, null, 2);
    el.exportBox.hidden = false;
    el.exportBox.value = text;
    el.exportBox.focus();
    el.exportBox.select();
    try {
      navigator.clipboard.writeText(text);
      el.btnExport.textContent = 'Copied';
      setTimeout(function () { el.btnExport.textContent = 'Export phone entries'; }, 1500);
    } catch (e) {
      el.btnExport.textContent = 'Select & copy';
    }
  });

  fillPlaces();
  setupMic();
  render();

  fetch(DATA_URL, { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      shared = data && Array.isArray(data.days) ? data : { days: [] };
      render();
    })
    .catch(function () {
      shared = { days: [] };
      render();
    });
})();
