// Seed Data with Multi-season Support & 1-10 Score Format
const DEFAULT_ANIMES = [
  {
    id: 16498, // Shingeki no Kyojin (Consolidated Franchise)
    title: "Shingeki no Kyojin (Saga Completa)",
    cover: "[https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-m5ZWy5TAYW7w.jpg](https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-m5ZWy5TAYW7w.jpg)",
    totalEpisodes: 89,
    watchedEpisodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    status: "FINISHED",
    score10: 9.1,
    seasons: [
      { name: "T1", start: 1, end: 25 },
      { name: "T2", start: 26, end: 37 },
      { name: "T3", start: 38, end: 59 },
      { name: "T4 (Final)", start: 60, end: 89 }
    ]
  },
  {
    id: 113415, // Jujutsu Kaisen
    title: "Jujutsu Kaisen",
    cover: "[https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-97F2m8aA1kGG.jpg](https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-97F2m8aA1kGG.jpg)",
    totalEpisodes: 47,
    watchedEpisodes: Array.from({length: 24}, (_, i) => i + 1),
    status: "RELEASING",
    score10: 8.7,
    seasons: [
      { name: "T1", start: 1, end: 24 },
      { name: "T2", start: 25, end: 47 }
    ]
  },
  {
    id: 151807, // Solo Leveling
    title: "Solo Leveling",
    cover: "[https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iwfISME.jpg](https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iwfISME.jpg)",
    totalEpisodes: 12,
    watchedEpisodes: [1, 2, 3, 4],
    status: "FINISHED",
    score10: 8.4,
    seasons: [
      { name: "T1", start: 1, end: 12 }
    ]
  }
];

let myAnimeList = JSON.parse(localStorage.getItem('anitrack_list')) || DEFAULT_ANIMES;
let currentFilter = 'all';
let activeAnimeId = null;
let activeSeasonIndex = 0;
let searchTimeout = null;
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  injectPwaManifest();
  registerServiceWorker();
  bindEvents();
  renderMyList();
  lucide.createIcons();
});

function initTheme() {
  const savedTheme = localStorage.getItem('anitrack_theme') || 'dark';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  } else {
    document.documentElement.classList.remove('dark');
    if (icon) icon.setAttribute('data-lucide', 'moon');
  }
  localStorage.setItem('anitrack_theme', theme);
  lucide.createIcons();
}

function bindEvents() {
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
  document.getElementById('tab-btn-my-list').addEventListener('click', () => switchTab('my-list'));
  document.getElementById('tab-btn-explore').addEventListener('click', () => switchTab('explore'));
  document.getElementById('tab-btn-airing').addEventListener('click', () => switchTab('airing'));

  document.getElementById('filter-all').addEventListener('click', () => setFilter('all'));
  document.getElementById('filter-watching').addEventListener('click', () => setFilter('watching'));
  document.getElementById('filter-completed').addEventListener('click', () => setFilter('completed'));

  document.getElementById('local-search').addEventListener('input', renderMyList);
  document.getElementById('sort-select').addEventListener('change', renderMyList);
  document.getElementById('api-search-input').addEventListener('input', debounceSearchApi);
  document.getElementById('api-sort-select').addEventListener('change', searchAniListAPI);
  document.getElementById('refresh-airing-btn').addEventListener('click', fetchAiringSchedule);

  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-file').addEventListener('change', importData);

  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer-btn').addEventListener('click', closeModal);
  document.getElementById('apply-range-btn').addEventListener('click', markRange);
  document.getElementById('mark-all-btn').addEventListener('click', () => toggleAllEpisodes(true));
  document.getElementById('unmark-all-btn').addEventListener('click', () => toggleAllEpisodes(false));
  document.getElementById('delete-anime-btn').addEventListener('click', deleteCurrentAnime);

  document.getElementById('pwa-install-btn').addEventListener('click', installPWA);
}

function saveState() {
  localStorage.setItem('anitrack_list', JSON.stringify(myAnimeList));
  renderMyList();
}

function switchTab(tabId) {
  ['my-list', 'explore', 'airing'].forEach(tab => {
    const el = document.getElementById(`tab-${tab}`);
    const btn = document.getElementById(`tab-btn-${tab}`);
    if (tab === tabId) {
      el.classList.remove('hidden');
      btn.classList.add('border-black', 'dark:border-white', 'text-black', 'dark:text-white');
      btn.classList.remove('border-transparent', 'text-zinc-500');
    } else {
      el.classList.add('hidden');
      btn.classList.remove('border-black', 'dark:border-white', 'text-black', 'dark:text-white');
      btn.classList.add('border-transparent', 'text-zinc-500');
    }
  });

  if (tabId === 'explore' && document.getElementById('api-results-grid').children.length === 0) {
    searchAniListAPI();
  } else if (tabId === 'airing') {
    fetchAiringSchedule();
  }
}

function renderMyList() {
  const grid = document.getElementById('my-anime-grid');
  const searchQuery = (document.getElementById('local-search').value || '').toLowerCase();
  const sortOption = document.getElementById('sort-select').value;
  grid.innerHTML = '';

  let filteredList = myAnimeList.filter(anime => anime.title.toLowerCase().includes(searchQuery));

  if (currentFilter === 'watching') {
    filteredList = filteredList.filter(a => a.watchedEpisodes.length < a.totalEpisodes);
  } else if (currentFilter === 'completed') {
    filteredList = filteredList.filter(a => a.watchedEpisodes.length >= a.totalEpisodes && a.totalEpisodes > 0);
  }

  if (sortOption === 'score-desc') {
    filteredList.sort((a, b) => (b.score10 || 0) - (a.score10 || 0));
  }

  let totalWatched = 0;
  let totalPossible = 0;
  myAnimeList.forEach(a => {
    totalWatched += a.watchedEpisodes.length;
    totalPossible += a.totalEpisodes;
  });

  document.getElementById('stat-total-animes').innerText = myAnimeList.length;
  document.getElementById('stat-total-episodes').innerText = totalWatched;
  document.getElementById('stat-total-time').innerText = `${Math.round((totalWatched * 24) / 60)}h`;
  document.getElementById('stat-global-progress').innerText = totalPossible > 0 ? `${Math.round((totalWatched / totalPossible) * 100)}%` : '0%';

  if (filteredList.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
        <i data-lucide="film" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p class="text-sm">No se encontraron animes en tu lista.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  filteredList.forEach(anime => {
    const progress = anime.totalEpisodes > 0 ? Math.round((anime.watchedEpisodes.length / anime.totalEpisodes) * 100) : 0;
    const remaining = anime.totalEpisodes - anime.watchedEpisodes.length;
    const scoreText = anime.score10 ? `⭐ ${anime.score10.toFixed(1)}/10` : '⭐ N/A';

    const card = document.createElement('div');
    card.className = "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col hover:border-zinc-400 dark:hover:border-zinc-600 transition";
    card.innerHTML = `
      <div class="flex p-4 gap-4">
        <img src="${anime.cover}" alt="${anime.title}" class="w-20 h-28 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-200 dark:bg-zinc-800">
        <div class="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-black dark:text-white truncate text-base">${anime.title}</h3>
              <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white shrink-0">${scoreText}</span>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">${anime.watchedEpisodes.length} / ${anime.totalEpisodes} eps totales</p>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500 dark:text-zinc-400">Progreso Global</span>
              <span class="font-mono font-bold text-black dark:text-white">${progress}%</span>
            </div>
            <div class="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-zinc-300 dark:border-zinc-700">
              <div class="bg-black dark:bg-white h-full transition-all duration-300" style="width: ${progress}%"></div>
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400 text-right">${remaining > 0 ? `Faltan ${remaining} eps` : '¡Saga Completada!'}</p>
          </div>
        </div>
      </div>
      <div class="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2.5 bg-white dark:bg-zinc-900 flex justify-between items-center text-xs">
        <button onclick="quickIncrement(${anime.id})" class="font-medium text-black dark:text-white hover:underline flex items-center gap-1">
          <i data-lucide="plus-circle" class="w-4 h-4"></i> +1 Capítulo
        </button>
        <button onclick="openModal(${anime.id})" class="text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1">
          <i data-lucide="sliders" class="w-4 h-4"></i> Gestionar Saga
        </button>
      </div>`;
    grid.appendChild(card);
  });
  lucide.createIcons();
}

function setFilter(filter) {
  currentFilter = filter;
  ['all', 'watching', 'completed'].forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    btn.className = (f === filter)
      ? "px-3 py-1.5 rounded-lg text-xs font-medium bg-black text-white dark:bg-white dark:text-black"
      : "px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800";
  });
  renderMyList();
}

function quickIncrement(id) {
  const anime = myAnimeList.find(a => a.id === id);
  if (anime && anime.watchedEpisodes.length < anime.totalEpisodes) {
    for (let i = 1; i <= anime.totalEpisodes; i++) {
      if (!anime.watchedEpisodes.includes(i)) {
        anime.watchedEpisodes.push(i);
        saveState();
        break;
      }
    }
  }
}

function openModal(id) {
  activeAnimeId = id;
  activeSeasonIndex = 0;
  const anime = myAnimeList.find(a => a.id === id);
  if (!anime) return;

  document.getElementById('modal-title').innerText = anime.title;
  document.getElementById('modal-cover').src = anime.cover;
  document.getElementById('modal-score-badge').innerText = anime.score10 ? `⭐ ${anime.score10.toFixed(1)}/10` : '⭐ N/A';

  renderSeasonTabs(anime);
  renderModalEpisodes(anime);

  document.getElementById('detail-modal').classList.remove('hidden');
}

function renderSeasonTabs(anime) {
  const tabsContainer = document.getElementById('season-tabs');
  tabsContainer.innerHTML = '';

  const seasons = anime.seasons && anime.seasons.length > 0 ? anime.seasons : [{ name: "Serie Completa", start: 1, end: anime.totalEpisodes }];

  seasons.forEach((season, idx) => {
    const btn = document.createElement('button');
    btn.className = `px-3 py-1 rounded-lg text-xs font-medium border transition whitespace-nowrap ${idx === activeSeasonIndex ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'}`;
    btn.innerText = season.name;
    btn.onclick = () => {
      activeSeasonIndex = idx;
      renderSeasonTabs(anime);
      renderModalEpisodes(anime);
    };
    tabsContainer.appendChild(btn);
  });
}

function renderModalEpisodes(anime) {
  const progress = anime.totalEpisodes > 0 ? Math.round((anime.watchedEpisodes.length / anime.totalEpisodes) * 100) : 0;
  const remaining = anime.totalEpisodes - anime.watchedEpisodes.length;

  document.getElementById('modal-ep-info').innerText = `${anime.watchedEpisodes.length} de ${anime.totalEpisodes} capítulos vistos (${progress}%)`;
  document.getElementById('modal-remaining').innerText = remaining > 0 ? `Te faltan ${remaining} capítulos para terminar toda la saga.` : '¡Has completado toda la saga!';
  document.getElementById('modal-progress-bar').style.width = `${progress}%`;

  const seasons = anime.seasons && anime.seasons.length > 0 ? anime.seasons : [{ name: "Serie Completa", start: 1, end: anime.totalEpisodes }];
  const currentSeason = seasons[activeSeasonIndex] || seasons[0];

  const grid = document.getElementById('modal-episodes-grid');
  grid.innerHTML = '';

  for (let i = currentSeason.start; i <= currentSeason.end; i++) {
    const isWatched = anime.watchedEpisodes.includes(i);
    const btn = document.createElement('button');
    btn.className = `py-1.5 text-xs font-mono rounded border transition ${isWatched ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'}`;
    btn.innerText = i;
    btn.onclick = () => toggleSingleEpisode(i);
    grid.appendChild(btn);
  }
}

function closeModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  activeAnimeId = null;
}

function toggleSingleEpisode(epNum) {
  const anime = myAnimeList.find(a => a.id === activeAnimeId);
  if (!anime) return;

  const index = anime.watchedEpisodes.indexOf(epNum);
  if (index > -1) {
    anime.watchedEpisodes.splice(index, 1);
  } else {
    anime.watchedEpisodes.push(epNum);
  }
  saveState();
  renderModalEpisodes(anime);
}

function markRange() {
  const start = parseInt(document.getElementById('range-start').value);
  const end = parseInt(document.getElementById('range-end').value);
  const anime = myAnimeList.find(a => a.id === activeAnimeId);

  if (!anime || isNaN(start) || isNaN(end) || start > end) return;

  for (let i = start; i <= end; i++) {
    if (i <= anime.totalEpisodes && !anime.watchedEpisodes.includes(i)) {
      anime.watchedEpisodes.push(i);
    }
  }
  saveState();
  renderModalEpisodes(anime);
}

function toggleAllEpisodes(mark) {
  const anime = myAnimeList.find(a => a.id === activeAnimeId);
  if (!anime) return;

  const seasons = anime.seasons && anime.seasons.length > 0 ? anime.seasons : [{ name: "Serie Completa", start: 1, end: anime.totalEpisodes }];
  const currentSeason = seasons[activeSeasonIndex] || seasons[0];

  for (let i = currentSeason.start; i <= currentSeason.end; i++) {
    const index = anime.watchedEpisodes.indexOf(i);
    if (mark && index === -1) {
      anime.watchedEpisodes.push(i);
    } else if (!mark && index > -1) {
      anime.watchedEpisodes.splice(index, 1);
    }
  }
  saveState();
  renderModalEpisodes(anime);
}

function deleteCurrentAnime() {
  if (confirm("¿Seguro que deseas eliminar este anime de tu lista?")) {
    myAnimeList = myAnimeList.filter(a => a.id !== activeAnimeId);
    saveState();
    closeModal();
  }
}

function debounceSearchApi() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(searchAniListAPI, 400);
}

async function searchAniListAPI() {
  const queryText = document.getElementById('api-search-input').value.trim();
  const sortVal = document.getElementById('api-sort-select').value;
  const grid = document.getElementById('api-results-grid');

  grid.innerHTML = `<div class="col-span-full py-8 text-center text-zinc-500 text-sm">Cargando resultados...</div>`;

  const query = `
    query ($search: String, $sort: [MediaSort]) {
      Page(perPage: 12) {
        media(search: $search, type: ANIME, sort: $sort) {
          id
          title { romaji english }
          coverImage { large }
          episodes
          status
          averageScore
          relations {
            edges {
              relationType
              node {
                id
                title { romaji }
                episodes
              }
            }
          }
        }
      }
    }`;

  try {
    const response = await fetch('[https://graphql.anilist.co](https://graphql.anilist.co)', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { search: queryText || undefined, sort: [sortVal] } })
    });

    const data = await response.json();
    const media = data.data.Page.media;
    grid.innerHTML = '';

    media.forEach(anime => {
      const exists = myAnimeList.some(a => a.id === anime.id);
      const title = anime.title.romaji || anime.title.english;
      
      // Calculate consolidated total episodes across main sequels if available
      let totalEps = anime.episodes || 12;
      let seasons = [{ name: "T1", start: 1, end: totalEps }];

      if (anime.relations && anime.relations.edges) {
        let currentEp = totalEps;
        let sCount = 2;
        anime.relations.edges.forEach(edge => {
          if (edge.relationType === 'SEQUEL' && edge.node.episodes) {
            const seqEps = edge.node.episodes;
            seasons.push({ name: `T${sCount}`, start: currentEp + 1, end: currentEp + seqEps });
            currentEp += seqEps;
            sCount++;
          }
        });
        totalEps = currentEp;
      }

      // 1 to 10 score conversion
      const score10 = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
      const scoreDisplay = score10 ? `⭐ ${score10}/10` : '⭐ N/A';

      const item = document.createElement('div');
      item.className = "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between space-y-3";
      item.innerHTML = `
        <div class="relative">
          <img src="${anime.coverImage.large}" class="w-full h-40 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800">
          <span class="absolute top-2 right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-white backdrop-blur-sm">${scoreDisplay}</span>
        </div>
        <div>
          <h4 class="font-bold text-xs truncate text-black dark:text-white">${title}</h4>
          <p class="text-[11px] text-zinc-500 mt-0.5">${totalEps} eps totales (${seasons.length} ${seasons.length > 1 ? 'temporadas' : 'temporada'})</p>
        </div>
        <button onclick='addFromAPI(${anime.id}, ${JSON.stringify(title)}, "${anime.coverImage.large}", ${totalEps}, "${anime.status}", ${score10 || 0}, ${JSON.stringify(seasons)})' 
                ${exists ? 'disabled' : ''} 
                class="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition ${exists ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 border border-zinc-300 dark:border-zinc-700' : 'bg-black text-white dark:bg-white dark:text-black'}">
          ${exists ? 'En tu lista' : '+ Agregar Saga'}
        </button>`;
      grid.appendChild(item);
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-500 text-sm">Error al conectar con la API.</div>`;
  }
}

function addFromAPI(id, title, cover, totalEpisodes, status, score10, seasons) {
  if (!myAnimeList.some(a => a.id === id)) {
    myAnimeList.push({ id, title, cover, totalEpisodes: totalEpisodes || 12, watchedEpisodes: [], status, score10, seasons });
    saveState();
    switchTab('my-list');
  }
}

async function fetchAiringSchedule() {
  const grid = document.getElementById('airing-grid');
  grid.innerHTML = `<div class="col-span-full py-8 text-center text-zinc-500 text-sm">Consultando agenda...</div>`;

  const query = `
    query {
      Page(perPage: 12) {
        airingSchedules(airingAt_greater: ${Math.floor(Date.now() / 1000)}, sort: TIME) {
          episode
          airingAt
          media {
            id
            title { romaji }
            coverImage { large }
            episodes
            averageScore
          }
        }
      }
    }`;

  try {
    const res = await fetch('[https://graphql.anilist.co](https://graphql.anilist.co)', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const schedules = data.data.Page.airingSchedules;

    grid.innerHTML = '';
    schedules.forEach(item => {
      const date = new Date(item.airingAt * 1000);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const score10 = item.media.averageScore ? (item.media.averageScore / 10).toFixed(1) : null;
      const scoreDisplay = score10 ? `⭐ ${score10}/10` : '';

      const div = document.createElement('div');
      div.className = "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex gap-3 items-center";
      div.innerHTML = `
        <img src="${item.media.coverImage.large}" class="w-12 h-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-xs truncate text-black dark:text-white">${item.media.title.romaji}</h4>
            <span class="text-[10px] font-mono text-zinc-400 shrink-0">${scoreDisplay}</span>
          </div>
          <p class="text-xs font-mono mt-1 text-black dark:text-white font-semibold">Episodio ${item.episode}</p>
          <p class="text-[11px] text-zinc-500">Hoy a las ${timeStr}</p>
        </div>`;
      grid.appendChild(div);
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-500 text-sm">No se pudo obtener la agenda.</div>`;
  }
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(myAnimeList, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `anitrack_backup_${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchorElem.click();
}

function importData(event) {
  const fileReader = new FileReader();
  fileReader.onload = function (e) {
    try {
      const importedList = JSON.parse(e.target.result);
      if (Array.isArray(importedList)) {
        myAnimeList = importedList;
        saveState();
        alert("¡Datos importados con éxito!");
      }
    } catch (err) {
      alert("El archivo subido no tiene un formato JSON válido.");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

function injectPwaManifest() {
  const manifestData = {
    name: "AniTrack — Anime Tracker",
    short_name: "AniTrack",
    start_url: "./",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [{
      src: "data:image/svg+xml;utf8,<svg xmlns='[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)' viewBox='0 0 512 512' fill='%23ffffff'><rect width='512' height='512' rx='128' fill='%23000000'/><path d='M150 360 L256 150 L362 360 L300 360 L256 270 L212 360 Z' fill='%23ffffff'/></svg>",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable"
    }]
  };
  const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = URL.createObjectURL(manifestBlob);
  document.head.appendChild(manifestLink);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swCode = `
      const CACHE_NAME = 'anitrack-v4';
      self.addEventListener('install', (e) => {
        e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['./'])));
      });
      self.addEventListener('fetch', (e) => {
        e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
      });`;
    const blob = new Blob([swCode], { type: 'text/javascript' });
    navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(console.error);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.remove('hidden');
  });
}

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        document.getElementById('pwa-install-btn').classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }
}