// ==============================================================================
// Quest-Forge: Quest & Battle Archive Repository (PC & Mobile Searchable Vault)
// Filters by Creator (QM), Park, Kingdom, and Keyword Search
// ==============================================================================

let archiveCatalogItems = [];

async function initArchivePage() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    currentUser = session.user;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    currentProfile = profile || {};
    currentPark = profile?.last_active_park || profile?.park || "Delver's Rest";
    currentKingdom = (typeof getKingdomForPark === 'function')
      ? getKingdomForPark(currentPark)
      : (profile?.kingdom || "The Freeholds of Amtgard");
    currentQMId = profile?.last_active_qm_id || currentUser.id;
    currentQMUsername = profile?.last_active_qm_username || profile?.username || 'Questmaster';

    // Load user theme/text preferences
    if (typeof loadPlayerStats === 'function') {
      await loadPlayerStats(currentUser.id);
    }

    const bannerEl = document.getElementById('archive-active-realm-banner');
    if (bannerEl) {
      const isMyRealm = Boolean(currentUser && currentQMId && String(currentUser.id) === String(currentQMId));
      bannerEl.innerText = isMyRealm
        ? `Active QM Realm: ${currentPark} (${currentKingdom}) — Creator: ${currentProfile?.username || currentQMUsername}`
        : `Viewing Realm: ${currentPark} (${currentKingdom}) — Active QM: ${currentQMUsername}`;
    }

    await fetchArchiveRepository();
  } catch (err) {
    console.error("Error initializing Archive page:", err);
  }
}

async function fetchArchiveRepository() {
  const container = document.getElementById('archive-cards-container');
  const countEl = document.getElementById('archive-results-count');

  try {
    const { data, error } = await supabaseClient
      .from('quest_archive')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (container) {
        container.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; text-align:center; padding:24px;">
            <h3 style="color:var(--warning); margin-bottom:8px;">⚠️ Archive Table Not Found</h3>
            <p style="color:var(--text-muted); font-size:13px; line-height:1.5;">
              Could not query <code>public.quest_archive</code> (${error.message}).<br>
              Please run the new <code>quest_archive</code> SQL snippet in your Supabase SQL Editor.
            </p>
          </div>
        `;
      }
      if (countEl) countEl.innerText = '0 archived entries';
      return;
    }

    archiveCatalogItems = data || [];
    populateArchiveFilterDropdowns();
    renderArchiveCatalog();
  } catch (err) {
    console.error("Failed to fetch quest_archive:", err);
  }
}

function populateArchiveFilterDropdowns() {
  const kingdomSelect = document.getElementById('archive-kingdom-filter');
  const parkSelect = document.getElementById('archive-park-filter');
  const creatorSelect = document.getElementById('archive-creator-filter');

  const curKingdom = kingdomSelect ? kingdomSelect.value : '';
  const curPark = parkSelect ? parkSelect.value : '';
  const curCreator = creatorSelect ? creatorSelect.value : '';

  // 1. Collect all Kingdoms from config + archived rows
  const kingdomSet = new Set(Object.keys(typeof AMTGARD_KINGDOMS_AND_PARKS !== 'undefined' ? AMTGARD_KINGDOMS_AND_PARKS : {}));
  archiveCatalogItems.forEach(item => {
    if (item.origin_kingdom) kingdomSet.add(item.origin_kingdom);
  });
  const kingdoms = Array.from(kingdomSet).sort((a, b) => a.localeCompare(b));

  if (kingdomSelect) {
    kingdomSelect.innerHTML = `<option value="">All Kingdoms</option>` +
      kingdoms.map(k => `<option value="${escapeArchiveHtml(k)}" ${k === curKingdom ? 'selected' : ''}>${escapeArchiveHtml(k)}</option>`).join('');
  }

  // 2. Collect Parks (scoped to selected Kingdom if chosen)
  const parkSet = new Set();
  if (typeof AMTGARD_KINGDOMS_AND_PARKS !== 'undefined') {
    Object.entries(AMTGARD_KINGDOMS_AND_PARKS).forEach(([k, parks]) => {
      if (!curKingdom || k === curKingdom) {
        (parks || []).forEach(p => parkSet.add(p));
      }
    });
  }
  archiveCatalogItems.forEach(item => {
    if ((!curKingdom || item.origin_kingdom === curKingdom) && item.origin_park) {
      parkSet.add(item.origin_park);
    }
  });
  const parks = Array.from(parkSet).sort((a, b) => a.localeCompare(b));

  if (parkSelect) {
    const validPark = parks.includes(curPark) ? curPark : '';
    parkSelect.innerHTML = `<option value="">All Parks</option>` +
      parks.map(p => `<option value="${escapeArchiveHtml(p)}" ${p === validPark ? 'selected' : ''}>${escapeArchiveHtml(p)}</option>`).join('');
  }

  // 3. Collect Creators (QMs) scoped by selected Kingdom & Park
  const activeParkVal = parkSelect ? parkSelect.value : '';
  const creatorSet = new Set();
  archiveCatalogItems.forEach(item => {
    if (curKingdom && item.origin_kingdom !== curKingdom) return;
    if (activeParkVal && item.origin_park !== activeParkVal) return;
    if (item.author_qm_username) creatorSet.add(item.author_qm_username);
  });
  const creators = Array.from(creatorSet).sort((a, b) => a.localeCompare(b));

  if (creatorSelect) {
    const validCreator = creators.includes(curCreator) ? curCreator : '';
    creatorSelect.innerHTML = `<option value="">All Creators</option>` +
      creators.map(c => `<option value="${escapeArchiveHtml(c)}" ${c === validCreator ? 'selected' : ''}>👑 ${escapeArchiveHtml(c)}</option>`).join('');
  }
}

function onArchiveKingdomFilterChange() {
  populateArchiveFilterDropdowns();
  renderArchiveCatalog();
}

function onArchiveParkFilterChange() {
  populateArchiveFilterDropdowns();
  renderArchiveCatalog();
}

function resetArchiveFilters() {
  const searchEl = document.getElementById('archive-search-input');
  const kingdomEl = document.getElementById('archive-kingdom-filter');
  const parkEl = document.getElementById('archive-park-filter');
  const creatorEl = document.getElementById('archive-creator-filter');

  if (searchEl) searchEl.value = '';
  if (kingdomEl) kingdomEl.value = '';
  if (parkEl) parkEl.value = '';
  if (creatorEl) creatorEl.value = '';

  populateArchiveFilterDropdowns();
  renderArchiveCatalog();
}

function escapeArchiveHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderArchiveCatalog() {
  const container = document.getElementById('archive-cards-container');
  const countEl = document.getElementById('archive-results-count');
  if (!container) return;

  const query = (document.getElementById('archive-search-input')?.value || '').trim().toLowerCase();
  const selectedKingdom = document.getElementById('archive-kingdom-filter')?.value || '';
  const selectedPark = document.getElementById('archive-park-filter')?.value || '';
  const selectedCreator = document.getElementById('archive-creator-filter')?.value || '';

  const filtered = archiveCatalogItems.filter(item => {
    if (selectedKingdom && item.origin_kingdom !== selectedKingdom) return false;
    if (selectedPark && item.origin_park !== selectedPark) return false;
    if (selectedCreator && item.author_qm_username !== selectedCreator) return false;

    if (query) {
      const haystack = [
        item.title,
        item.description,
        item.author_qm_username,
        item.origin_park,
        item.origin_kingdom,
        item.category,
        item.discipline
      ].map(s => String(s || '').toLowerCase()).join(' ');
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  if (countEl) {
    countEl.innerText = `Showing ${filtered.length} of ${archiveCatalogItems.length} archived ${archiveCatalogItems.length === 1 ? 'entry' : 'entries'}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <p class="empty-state" style="grid-column: 1 / -1;">
        No archived battles or quests match your current filters.
      </p>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => renderArchiveCardHtml(item)).join('');
}

function renderArchiveCardHtml(item) {
  const isBattle = item.category === 'Battle' || item.category === 'Combat';
  const rules = (typeof getQuestDurabilityRules === 'function')
    ? getQuestDurabilityRules(item)
    : {};

  const discName = isBattle
    ? 'Battle'
    : (item.discipline || (typeof getQuestDiscipline === 'function' ? getQuestDiscipline(item) : 'Service'));
  const discIcon = isBattle
    ? '⚔️'
    : (typeof getQuestDisciplineIcon === 'function' ? getQuestDisciplineIcon(discName) : '📜');

  const createdDate = item.created_at
    ? new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  let badgesHtml = '';
  if (isBattle) {
    const winGold = rules.victoryGold ?? item.reward_gold ?? 15;
    const lossGold = rules.defeatGold ?? item.reward_gold_defeat ?? 10;
    const monsterGold = rules.monsterReward ?? item.monster_reward ?? 10;
    const activeTeams = Array.isArray(rules.activeTeams) && rules.activeTeams.length > 0 ? rules.activeTeams : ['red', 'blue'];

    badgesHtml = `
      <span class="badge badge-battle">⚔️ Battle</span>
      <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold);">+${winGold}g Win</span>
      <span class="badge badge-type">+${lossGold}g Loss</span>
      ${rules.hasMonsters ? `<span class="badge badge-type" style="color:#fda4af;">👹 +${monsterGold}g Monster</span>` : ''}
      <span class="badge badge-type">Teams: ${activeTeams.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}</span>
      ${rules.rngLootDrops ? '<span class="badge badge-threat-loot" style="background:#7c3aed; color:white;">RNG Loot</span>' : ''}
    `;
  } else {
    const verMethod = rules.verificationMethod || item.verification_method || 'Quest Master';
    badgesHtml = `
      <span class="badge badge-discipline">${discIcon} ${escapeArchiveHtml(discName)}</span>
      <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold);">🪙 +${Number(item.reward_gold) || 0} Gold</span>
      <span class="badge badge-type" style="color:#c084fc; border-color:rgba(192,132,252,0.4);">
        ${verMethod === 'Quest Master' ? '👑 QM Verified' : '🤝 Self-Report'}
      </span>
      ${item.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
    `;
  }

  const isAuthor = Boolean(currentUser && item.author_qm_id && String(currentUser.id) === String(item.author_qm_id));

  return `
    <div class="archive-item-card">
      <div>
        <div class="archive-card-header" style="margin-bottom:10px;">
          <h3 class="archive-card-title">${discIcon} ${escapeArchiveHtml(item.title)}</h3>
          <span style="font-size:11px; color:var(--text-muted); white-space:nowrap;">${escapeArchiveHtml(createdDate)}</span>
        </div>

        <div class="archive-origin-row" style="margin-bottom:10px;">
          <span>Creator: <strong>👑 ${escapeArchiveHtml(item.author_qm_username || 'Questmaster')}</strong></span>
          <span>Park: <strong>${escapeArchiveHtml(item.origin_park || "Delver's Rest")}</strong></span>
          <span>Kingdom: <strong>${escapeArchiveHtml(item.origin_kingdom || 'The Freeholds of Amtgard')}</strong></span>
        </div>

        <div class="tag-container" style="margin-bottom:10px;">
          ${badgesHtml}
        </div>

        ${item.description
          ? `<p class="archive-desc">${escapeArchiveHtml(item.description)}</p>`
          : `<p class="archive-desc" style="color:var(--text-muted); font-style:italic;">No description provided.</p>`
        }
      </div>

      <div class="archive-card-footer">
        <button type="button" class="btn-buy" style="min-height:36px; padding:6px 14px; font-size:12px;" onclick="importArchiveItemToCatalog('${item.id}')">
          ➕ Copy to My Catalog
        </button>
        ${isAuthor ? `
          <button type="button" class="btn-delete" style="min-height:36px; padding:6px 12px; font-size:12px;" onclick="deleteArchiveItem('${item.id}')">
            🗑️ Remove from Archive
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

async function importArchiveItemToCatalog(archiveId) {
  if (!currentUser) return;

  const item = archiveCatalogItems.find(i => String(i.id) === String(archiveId));
  if (!item) return;

  const targetPark = currentPark || "Delver's Rest";
  const targetKingdom = currentKingdom || "The Freeholds of Amtgard";
  const targetQMUsername = currentProfile?.username || currentQMUsername || 'Questmaster';
  const isBattle = item.category === 'Battle' || item.category === 'Combat';

  const confirmed = confirm(
    `➕ Copy "${item.title}" into your ${isBattle ? 'Battle Catalog' : 'Quest Catalog'} at ${targetPark}?\n\n` +
    `It will be added in Closed state so you can review or edit it before opening it on the field.`
  );
  if (!confirmed) return;

  try {
    const insertPayload = {
      title: item.title,
      category: isBattle ? 'Battle' : 'Quest',
      discipline: item.discipline || 'Service',
      description: item.description || '',
      reward_gold: Number(item.reward_gold) || 0,
      reward_gold_defeat: Number(item.reward_gold_defeat) ?? 10,
      monster_reward: Number(item.monster_reward) ?? 10,
      scenario_card: item.scenario_card || '',
      repeatable: isBattle ? true : Boolean(item.repeatable),
      verification_method: item.verification_method || 'Quest Master',
      park: targetPark,
      kingdom: targetKingdom,
      qm_id: currentUser.id,
      qm_username: targetQMUsername,
      is_active: false
    };

    let { error } = await supabaseClient.from('quests').insert(insertPayload);

    if (error) {
      let fallbackPayload = { ...insertPayload };
      delete fallbackPayload.discipline;
      delete fallbackPayload.verification_method;
      delete fallbackPayload.monster_reward;
      delete fallbackPayload.reward_gold_defeat;
      const retry = await supabaseClient.from('quests').insert(fallbackPayload);
      error = retry.error;
    }

    if (error) {
      alert("Error copying to catalog: " + error.message);
      return;
    }

    alert(`✅ "${item.title}" has been copied into your ${isBattle ? 'Battle Catalog' : 'Quest Catalog'} at ${targetPark}!`);
  } catch (err) {
    console.error("Error importing archive item:", err);
    alert("Error importing item: " + (err.message || err));
  }
}

async function deleteArchiveItem(archiveId) {
  if (!currentUser) return;
  const item = archiveCatalogItems.find(i => String(i.id) === String(archiveId));
  if (!item) return;

  const confirmed = confirm(`🗑️ Permanently remove "${item.title}" from the Quest & Battle Archive?`);
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from('quest_archive')
      .delete()
      .eq('id', archiveId)
      .eq('author_qm_id', currentUser.id);

    if (error) {
      alert("Could not delete archived item: " + error.message);
      return;
    }

    archiveCatalogItems = archiveCatalogItems.filter(i => String(i.id) !== String(archiveId));
    populateArchiveFilterDropdowns();
    renderArchiveCatalog();
  } catch (err) {
    console.error("Error deleting archived item:", err);
  }
}

document.addEventListener('DOMContentLoaded', initArchivePage);

