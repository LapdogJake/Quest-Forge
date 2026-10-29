// ==============================================================================
// Quest-Forge: QM Panel — Multi-Team Forge Battle & Battle Catalog
// (#qm-subtab-battle & #qm-subtab-queues)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Forge Battle & Inline Edit Form Helpers (Teams & Dynamic Placement Rewards)
// ------------------------------------------------------------------------------

const QM_TEAM_KEYS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

function getQMFormEl(baseId, questId = null) {
  const fullId = questId ? `${baseId}-${questId}` : baseId;
  return document.getElementById(fullId);
}

// Sync visibility of 2nd, 3rd, 4th, 5th place inputs between Victory and Defeat
function syncQMPlacementControls(count, questId = null) {
  const prefix = questId ? 'qm-edit' : 'qm';
  const safeCount = Math.max(0, Math.min(4, Number(count) || 0));

  const countInput = getQMFormEl(`${prefix}-extra-placements-count`, questId);
  if (countInput) countInput.value = String(safeCount);

  for (let p = 2; p <= 5; p++) {
    const idx = p - 1; // 1..4
    const wrapEl = getQMFormEl(`${prefix}-placement-wrap-${p}`, questId);
    if (wrapEl) {
      wrapEl.classList.toggle('hidden', idx > safeCount);
    }
  }

  const removeBtn = getQMFormEl(`${prefix}-btn-remove-placement`, questId);
  if (removeBtn) {
    removeBtn.classList.toggle('hidden', safeCount <= 0);
  }

  const addBtn = getQMFormEl(`${prefix}-btn-add-placement`, questId);
  if (addBtn) {
    addBtn.disabled = safeCount >= 4;
  }
}

function addQMBattlePlacement(questId = null) {
  const prefix = questId ? 'qm-edit' : 'qm';
  const countInput = getQMFormEl(`${prefix}-extra-placements-count`, questId);
  const curCount = countInput ? (parseInt(countInput.value, 10) || 0) : 0;
  if (curCount >= 4) return;

  const nextCount = curCount + 1;
  syncQMPlacementControls(nextCount, questId);

  const nextPlaceNum = nextCount + 1; // 2, 3, 4, or 5
  const nextInput = getQMFormEl(`${prefix}-battle-gold-place-${nextPlaceNum}`, questId);
  if (nextInput) {
    nextInput.focus();
  }
}

function removeQMBattlePlacement(questId = null) {
  const prefix = questId ? 'qm-edit' : 'qm';
  const countInput = getQMFormEl(`${prefix}-extra-placements-count`, questId);
  const curCount = countInput ? (parseInt(countInput.value, 10) || 0) : 0;
  if (curCount <= 0) return;

  const placeNumToClear = curCount + 1;
  const clearInput = getQMFormEl(`${prefix}-battle-gold-place-${placeNumToClear}`, questId);
  if (clearInput) clearInput.value = '';

  syncQMPlacementControls(curCount - 1, questId);
}

function readBattleConfigFromForm(questId = null) {
  const prefix = questId ? 'qm-edit' : 'qm';

  const monsterCheck = getQMFormEl(`${prefix}-team-check-monster`, questId);
  const includeMonster = Boolean(monsterCheck?.checked);

  const playerTeams = [];
  QM_TEAM_KEYS.forEach(tk => {
    const checkEl = getQMFormEl(`${prefix}-team-check-${tk}`, questId);
    if (checkEl && checkEl.checked) {
      playerTeams.push(tk);
    }
  });

  const battle_teams = [];
  if (includeMonster) battle_teams.push('monster');
  playerTeams.forEach(tk => battle_teams.push(tk));

  const victoryInput = getQMFormEl(`${prefix}-battle-gold-victory`, questId);
  const defeatInput = getQMFormEl(`${prefix}-battle-gold-defeat`, questId);
  const reward_gold = victoryInput ? Math.max(0, parseInt(victoryInput.value, 10) || 0) : 15;
  const reward_gold_defeat = defeatInput ? Math.max(0, parseInt(defeatInput.value, 10) || 0) : 10;

  const countInput = getQMFormEl(`${prefix}-extra-placements-count`, questId);
  const extraCount = countInput ? Math.max(0, Math.min(4, parseInt(countInput.value, 10) || 0)) : 0;

  const extra_placements = [];
  for (let i = 1; i <= extraCount; i++) {
    const placeNum = i + 1; // 2..5
    const placeInput = getQMFormEl(`${prefix}-battle-gold-place-${placeNum}`, questId);
    const rawVal = placeInput?.value?.trim();
    const parsedVal = rawVal !== '' && rawVal !== undefined ? parseInt(rawVal, 10) : reward_gold_defeat;
    extra_placements.push(Number.isFinite(parsedVal) && parsedVal >= 0 ? parsedVal : reward_gold_defeat);
  }

  const placement_rewards = [
    reward_gold,
    ...extra_placements,
    reward_gold_defeat,
    reward_gold_defeat,
    reward_gold_defeat,
    reward_gold_defeat,
    reward_gold_defeat
  ].slice(0, 6);

  const monsterRewardInput = getQMFormEl(`${prefix}-team-reward-monster`, questId);
  const monsterVal = monsterRewardInput ? parseInt(monsterRewardInput.value, 10) : 10;
  const monster_reward = Number.isFinite(monsterVal) && monsterVal >= 0 ? monsterVal : 10;

  return {
    battle_mode: includeMonster ? 'pvm' : 'pvp',
    battle_teams,
    playerTeams,
    includeMonster,
    monsters_are_npc: includeMonster,
    extra_placements,
    placement_rewards,
    monster_reward,
    reward_gold,
    reward_gold_defeat
  };
}

// Keep legacy hooks safe if called anywhere
function setQMBattleMode() {}
function handleQMTeamCheckChange() {}

window.addQMBattlePlacement = addQMBattlePlacement;
window.removeQMBattlePlacement = removeQMBattlePlacement;
window.setQMBattleMode = setQMBattleMode;
window.handleQMTeamCheckChange = handleQMTeamCheckChange;

// ------------------------------------------------------------------------------
// 2. Forge Battle Creator (#qm-subtab-battle)
// ------------------------------------------------------------------------------

async function createBattle() {
  const title = document.getElementById('qm-battle-title')?.value.trim();
  const category = 'Battle';
  const description = document.getElementById('qm-battle-description')?.value.trim() || '';
  const repeatable = true;

  if (!title) {
    alert("Please enter a Battle Title.");
    return;
  }

  const config = readBattleConfigFromForm(null);
  if (config.battle_teams.length < 2) {
    alert("Please check at least 2 Teams for the battle.");
    return;
  }

  const durabilityWearInput = document.getElementById('qm-battle-durability-wear');
  const durability_wear = durabilityWearInput ? Number(durabilityWearInput.value) : 1;

  const defeatPenaltyInput = document.getElementById('qm-battle-defeat-penalty');
  const defeat_penalty = defeatPenaltyInput ? defeatPenaltyInput.value : 'none';

  const allow_mid_join = Boolean(document.getElementById('qm-battle-allow-mid-join')?.checked);
  const rng_loot_drops = Boolean(document.getElementById('qm-battle-rng-loot')?.checked);

  const allowTrinket = document.getElementById('qm-item-trinket') ? document.getElementById('qm-item-trinket').checked : true;
  const allowTalisman = document.getElementById('qm-item-talisman') ? document.getElementById('qm-item-talisman').checked : true;
  const allowArtifact = document.getElementById('qm-item-artifact') ? document.getElementById('qm-item-artifact').checked : true;

  const allowedList = [];
  if (allowTrinket) allowedList.push('Trinket');
  if (allowTalisman) allowedList.push('Talisman');
  if (allowArtifact) allowedList.push('Artifact');
  const allowed_items = allowedList.join(',');

  const rulesMeta = `<!-- RULES: ${JSON.stringify({
    battle_mode: config.battle_mode,
    battle_teams: config.battle_teams,
    extra_placements: config.extra_placements,
    placement_rewards: config.placement_rewards,
    monster_reward: config.monster_reward,
    monsters_are_npc: config.monsters_are_npc,
    allowed_items: allowedList,
    reward_gold_defeat: config.reward_gold_defeat,
    defeat_gold: config.reward_gold_defeat,
    durability_wear,
    defeat_penalty,
    allow_mid_join,
    rng_loot_drops
  })} -->`;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const battlePayload = {
    title,
    category,
    reward_gold: config.reward_gold,
    reward_gold_defeat: config.reward_gold_defeat,
    battle_mode: config.battle_mode,
    battle_teams: config.battle_teams,
    placement_rewards: config.placement_rewards,
    monster_reward: config.monster_reward,
    monsters_are_npc: config.monsters_are_npc,
    durability_wear,
    defeat_penalty,
    allowed_items,
    description,
    scenario_card: rulesMeta,
    repeatable,
    allow_mid_join,
    rng_loot_drops,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: activeQMId,
    qm_username: activeQMUsername,
    is_active: true
  };

  let { error } = await supabaseClient.from('quests').insert(battlePayload);

  if (error) {
    let fallbackPayload = { ...battlePayload };
    const colMatch = error.message.match(/'([^']+)' column/) || error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
    if (colMatch && colMatch[1] && colMatch[1] in fallbackPayload) {
      delete fallbackPayload[colMatch[1]];
    }
    delete fallbackPayload.battle_mode;
    delete fallbackPayload.battle_teams;
    delete fallbackPayload.placement_rewards;
    delete fallbackPayload.monster_reward;
    delete fallbackPayload.durability_wear;
    delete fallbackPayload.defeat_penalty;
    delete fallbackPayload.allow_mid_join;
    delete fallbackPayload.rng_loot_drops;

    let retry = await supabaseClient.from('quests').insert(fallbackPayload);
    if (retry.error) {
      delete fallbackPayload.qm_id;
      delete fallbackPayload.qm_username;
      delete fallbackPayload.park;
      delete fallbackPayload.kingdom;
      delete fallbackPayload.monsters_are_npc;
      delete fallbackPayload.allowed_items;
      delete fallbackPayload.reward_gold_defeat;
      retry = await supabaseClient.from('quests').insert(fallbackPayload);
    }
    error = retry.error;
  }

  if (error) {
    alert("Failed to save battle: " + error.message);
    return;
  }

  alert(`⚔️ Battle "${title}" saved and opened on field!`);

  // Reset Forge Battle form
  if (document.getElementById('qm-battle-title')) document.getElementById('qm-battle-title').value = '';
  if (document.getElementById('qm-battle-description')) document.getElementById('qm-battle-description').value = '';
  if (document.getElementById('qm-battle-gold-victory')) document.getElementById('qm-battle-gold-victory').value = '15';
  if (document.getElementById('qm-battle-gold-defeat')) document.getElementById('qm-battle-gold-defeat').value = '10';
  for (let p = 2; p <= 5; p++) {
    const pEl = document.getElementById(`qm-battle-gold-place-${p}`);
    if (pEl) pEl.value = '';
  }
  syncQMPlacementControls(0, null);

  if (document.getElementById('qm-team-check-monster')) document.getElementById('qm-team-check-monster').checked = false;
  if (document.getElementById('qm-team-reward-monster')) document.getElementById('qm-team-reward-monster').value = '10';
  QM_TEAM_KEYS.forEach((tk, idx) => {
    const cEl = document.getElementById(`qm-team-check-${tk}`);
    if (cEl) cEl.checked = idx < 2;
  });

  if (document.getElementById('qm-battle-allow-mid-join')) document.getElementById('qm-battle-allow-mid-join').checked = false;
  if (document.getElementById('qm-battle-rng-loot')) document.getElementById('qm-battle-rng-loot').checked = false;
  if (document.getElementById('qm-battle-durability-wear')) document.getElementById('qm-battle-durability-wear').value = '1';
  if (document.getElementById('qm-battle-defeat-penalty')) document.getElementById('qm-battle-defeat-penalty').value = 'none';
  if (document.getElementById('qm-item-trinket')) document.getElementById('qm-item-trinket').checked = true;
  if (document.getElementById('qm-item-talisman')) document.getElementById('qm-item-talisman').checked = true;
  if (document.getElementById('qm-item-artifact')) document.getElementById('qm-item-artifact').checked = true;

  await fetchUserSlotState();
  await fetchQuests();
  await fetchMonsterEncounters();
  switchQMSubTab('queues');
}

// ------------------------------------------------------------------------------
// 3. Battle Catalog & Field Encounter State Management (#qm-subtab-queues)
// ------------------------------------------------------------------------------

async function fetchQMQueues() {
  const container = document.getElementById('qm-queue-list');
  if (!container) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser?.id;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';

  const { data: allBattleQuests, error: questError } = await supabaseClient
    .from('quests')
    .select('*')
    .or('category.eq.Battle,category.eq.Combat')
    .order('created_at', { ascending: false });

  if (questError) {
    container.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error loading battles: ${questError.message}</p>`;
    return;
  }

  const normActivePark = typeof normalizeParkName === 'function' ? normalizeParkName(activePark) : (activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  const myUserId = currentUser?.id;

  const battleQuests = (allBattleQuests || []).filter(q => {
    const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
    const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
    if (!parkMatches) return false;
    const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
    const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
    return qmMatches;
  });

  if (!battleQuests || battleQuests.length === 0) {
    container.innerHTML = `<p class="empty-state">No battle quests found for ${activePark} (${activeQMName}). Create one in the Forge Battle tab!</p>`;
    return;
  }

  const questIds = battleQuests.map(q => q.id);
  const { data: openQueues } = await supabaseClient
    .from('quest_queues')
    .select(`
      *,
      queue_members(*, profiles(id, username, quest_abilities)),
      encounter_monsters(*, profiles(id, username, quest_abilities))
    `)
    .in('quest_id', questIds)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false });

  const queuesByQuest = new Map();
  (openQueues || []).forEach(qq => {
    if (!queuesByQuest.has(qq.quest_id)) {
      queuesByQuest.set(qq.quest_id, qq);
    }
  });

  const stateRank = { 'live': 0, 'open': 1, 'closed': 2 };

  battleQuests.sort((a, b) => {
    const queueA = queuesByQuest.get(a.id);
    const queueB = queuesByQuest.get(b.id);

    let stateA = 'closed';
    if (queueA) {
      stateA = queueA.status === 'active' ? 'live' : (queueA.status === 'waiting' ? 'open' : 'closed');
    } else if (a.is_active) {
      stateA = 'open';
    }

    let stateB = 'closed';
    if (queueB) {
      stateB = queueB.status === 'active' ? 'live' : (queueB.status === 'waiting' ? 'open' : 'closed');
    } else if (b.is_active) {
      stateB = 'open';
    }

    const rankA = stateRank[stateA] ?? 99;
    const rankB = stateRank[stateB] ?? 99;
    if (rankA !== rankB) return rankA - rankB;

    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return (a.title || '').localeCompare(b.title || '');
  });

  const openCardIds = new Set(
    Array.from(container.querySelectorAll('details.quest-accordion[open]'))
      .map(el => el.getAttribute('data-quest-id'))
      .filter(Boolean)
  );

  const escapeAttr = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  container.innerHTML = battleQuests.map(q => {
    const activeQueue = queuesByQuest.get(q.id);
    const rules = typeof getQuestDurabilityRules === 'function'
      ? getQuestDurabilityRules(q)
      : {
          battleMode: 'pvp',
          activeTeams: ['red', 'blue'],
          playerTeams: ['red', 'blue'],
          hasMonsters: false,
          monstersAreNpc: false,
          extraPlacements: [],
          placementTiers: [
            { key: 'victory', label: '🥇 Victory (1st)', shortLabel: '1st', gold: 15 },
            { key: 'defeat', label: '💀 Defeat', shortLabel: 'Loss', gold: 10 }
          ],
          placementRewards: [15, 10, 10, 10, 10, 10],
          monsterReward: 10,
          isRankedPayout: false,
          allowedTypes: ['Trinket', 'Talisman', 'Artifact'],
          victoryGold: 15,
          defeatGold: 10,
          durabilityWear: 1,
          defeatPenalty: 'none',
          allowMidJoin: false,
          rngLootDrops: false
        };

    const activeTeams = Array.isArray(rules.activeTeams) && rules.activeTeams.length > 0
      ? rules.activeTeams
      : ['red', 'blue'];
    const playerTeams = Array.isArray(rules.playerTeams) && rules.playerTeams.length > 0
      ? rules.playerTeams
      : activeTeams.filter(t => t !== 'monster');
    const extraPlacements = Array.isArray(rules.extraPlacements) ? rules.extraPlacements : [];
    const placementTiers = Array.isArray(rules.placementTiers) && rules.placementTiers.length >= 2
      ? rules.placementTiers
      : [
          { key: 'victory', label: '🥇 Victory (1st)', shortLabel: '1st', gold: rules.victoryGold ?? 15 },
          { key: 'defeat', label: '💀 Defeat', shortLabel: 'Loss', gold: rules.defeatGold ?? 10 }
        ];

    const victoryGold = rules.victoryGold ?? Number(q.reward_gold) ?? 15;
    const defeatGold = rules.defeatGold ?? Number(q.reward_gold_defeat) ?? 10;
    const monsterReward = Number.isFinite(rules.monsterReward) ? Number(rules.monsterReward) : 10;

    let state = 'closed';
    if (activeQueue) {
      if (activeQueue.status === 'active') {
        state = 'live';
      } else if (activeQueue.status === 'waiting') {
        state = 'open';
      }
    } else if (q.is_active) {
      state = 'open';
    }

    let statusBadge = `<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; white-space:nowrap; padding:2px 4px; border:none;">⚪ Closed</span>`;
    if (state === 'live') {
      statusBadge = `<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; white-space:nowrap; padding:2px 4px; border:none;">🟠 Live</span>`;
    } else if (state === 'open') {
      statusBadge = `<span class="badge" style="background:transparent; color:#ffffff; font-size:12px; font-weight:600; white-space:nowrap; padding:2px 4px; border:none;">🟢 Open</span>`;
    }

    // Group active queue members by team
    const rostersByTeam = {};
    activeTeams.forEach(tk => { rostersByTeam[tk] = []; });

    (activeQueue?.queue_members || []).forEach(m => {
      const rawTeam = m.team || m.role_name || '';
      const teamKey = typeof normalizeBattleMemberTeam === 'function'
        ? normalizeBattleMemberTeam(rawTeam, activeTeams)
        : (activeTeams[0] || 'red');
      if (!rostersByTeam[teamKey]) rostersByTeam[teamKey] = [];
      rostersByTeam[teamKey].push({
        id: m.id,
        userId: m.user_id || m.profiles?.id,
        username: m.profiles?.username || 'Hero',
        abilities: Array.isArray(m.profiles?.quest_abilities) ? m.profiles.quest_abilities : [],
        sourceTable: 'queue_members'
      });
    });

    (activeQueue?.encounter_monsters || []).forEach(m => {
      const targetTeam = activeTeams.includes('monster')
        ? 'monster'
        : (activeTeams[1] || activeTeams[0] || 'monster');
      if (!rostersByTeam[targetTeam]) rostersByTeam[targetTeam] = [];
      const uid = m.user_id || m.profiles?.id;
      if (!rostersByTeam[targetTeam].some(existing => existing.userId && existing.userId === uid)) {
        rostersByTeam[targetTeam].push({
          id: m.id,
          userId: uid,
          username: m.profiles?.username || 'Monster',
          abilities: Array.isArray(m.profiles?.quest_abilities) ? m.profiles.quest_abilities : [],
          sourceTable: 'encounter_monsters'
        });
      }
    });

    const queueId = activeQueue?.id || '';
    const isOpenByDefault = state === 'live' || openCardIds.has(String(q.id));

    const hasTrinket = Array.isArray(rules.allowedTypes) ? rules.allowedTypes.includes('Trinket') : true;
    const hasTalisman = Array.isArray(rules.allowedTypes) ? rules.allowedTypes.includes('Talisman') : true;
    const hasArtifact = Array.isArray(rules.allowedTypes) ? rules.allowedTypes.includes('Artifact') : true;
    const curWear = Number.isFinite(rules.durabilityWear) ? Number(rules.durabilityWear) : 1;
    const curPenalty = rules.defeatPenalty || 'none';

    // Build Badges HTML
    const ordSuffix = ['2nd', '3rd', '4th', '5th'];
    const middleBadgesHtml = extraPlacements.map((amt, idx) => {
      return `<span class="badge badge-type" style="color:#cbd5e1; border-color:#475569; font-weight:600;">+${amt}g ${ordSuffix[idx] || `${idx + 2}th`}</span>`;
    }).join('');

    const commonBadgesHtml = `
      <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">+${victoryGold}g Win</span>
      ${middleBadgesHtml}
      <span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">+${defeatGold}g Loss</span>
      ${rules.hasMonsters
        ? `<span class="badge badge-type" style="color:#fda4af; border-color:rgba(244,63,94,0.4);">👹 +${monsterReward}g Monster</span>`
        : ''}
      ${rules.durabilityWear === 0
        ? '<span class="badge badge-active">No Gear Wear</span>'
        : (rules.durabilityWear === 2
          ? '<span class="badge badge-threat-loot">2x Gear Wear</span>'
          : (rules.durabilityWear >= 3
            ? `<span class="badge badge-threat-loot">${rules.durabilityWear}x Gear Wear</span>`
            : ''))}
      ${rules.defeatPenalty === 'items_lost'
        ? '<span class="badge badge-monster" style="background:#b91c1c; color:white; font-weight:bold;">Items Lost</span>'
        : (rules.defeatPenalty === 'total_ruin'
          ? '<span class="badge badge-monster" style="background:#7f1d1d; border:1px solid #ef4444; color:white; font-weight:bold;">Total Ruin</span>'
          : '')}
      ${rules.allowMidJoin
        ? '<span class="badge badge-active" style="background:#0284c7; color:white; border-color:#38bdf8;">Mid-Battle Joining</span>'
        : ''}
      ${rules.allowedTypes.length === 3
        ? '<span class="badge badge-active">All Items Active</span>'
        : (rules.allowedTypes.length === 0
          ? '<span class="badge badge-threat-loot">No Magic Items</span>'
          : `<span class="badge badge-type">${rules.allowedTypes.join(', ')}</span>`)}
      ${q.repeatable ? '<span class="badge badge-quest">Repeatable</span>' : ''}
      ${rules.rngLootDrops ? '<span class="badge badge-threat-loot" style="background:#7c3aed; color:white; border-color:#a855f7;">RNG Loot</span>' : ''}
    `;

    // Build QM Queue Roster Boxes
    const qmTeamBoxesHtml = activeTeams.map((teamKey, idx) => {
      const meta = typeof getBattleTeamMeta === 'function'
        ? getBattleTeamMeta(teamKey)
        : { key: teamKey, label: teamKey, shortLabel: teamKey, icon: '⚔️', color: '#38bdf8', border: 'rgba(56,189,248,0.35)', boxClass: 'hero-box', btnClass: 'btn-battle-hero' };

      const members = rostersByTeam[teamKey] || [];
      const isOddTotal = activeTeams.length % 2 === 1;
      const shouldSpanFull = isOddTotal && (teamKey === 'monster' || (!activeTeams.includes('monster') && idx === activeTeams.length - 1));

      return `
        <div class="queue-box ${meta.boxClass} ${shouldSpanFull ? 'span-full' : ''}">
          <div>
            <div class="queue-header-row">
              <h5 class="queue-header-title" style="color:${meta.color};">${meta.icon} ${meta.label}</h5>
              <span class="queue-count-pill" style="color:${meta.color}; border:1px solid ${meta.border};">${members.length}</span>
            </div>
            <div class="queue-roster-list">
              ${members.length > 0
                ? members.map(m => {
                    const uName = m.username || 'Warrior';
                    const abs = Array.isArray(m.abilities) ? m.abilities : [];
                    const showAbs = rules.hasMonsters || rules.monstersAreNpc || teamKey === 'monster';
                    const absBadge = (showAbs && abs.length > 0)
                      ? abs.map(a => `<span class="ability-pill" style="border-color:${meta.border}; color:${meta.color};">${a}</span>`).join('')
                      : '';
                    return `
                      <span class="party-member-tag" style="border-color:${meta.border}; justify-content:space-between; gap:4px;">
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                          👤 ${uName}${absBadge}
                        </span>
                        <button onclick="qmKickFromBattleQueue('${m.id}', '${m.sourceTable}', '${uName.replace(/'/g, "\\'")}', '${meta.label.replace(/'/g, "\\'")}')"
                          title="Remove ${uName} from ${meta.label}"
                          style="background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; padding:0 2px; line-height:1;">
                          ✖
                        </button>
                      </span>
                    `;
                  }).join('')
                : `<p style="font-size:11px; color:#64748b; margin:6px 0; font-style:italic; text-align:center;">No fighters yet.</p>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Build Resolution Section:
    // - If no extra placements were added (just Victory & Defeat): show 1-tap Winner buttons
    // - If 2nd/3rd/4th/5th Place were added via '+': show Placement dropdowns per active team
    let resolutionHtml = '';
    if (!rules.isRankedPayout) {
      const victorButtons = activeTeams.map(teamKey => {
        const meta = typeof getBattleTeamMeta === 'function'
          ? getBattleTeamMeta(teamKey)
          : { shortLabel: teamKey, icon: '⚔️', btnClass: 'btn-battle-hero' };
        return `
          <button class="btn-battle-action ${meta.btnClass}" style="min-height:42px; font-size:13px;" onclick="qmFinishBattle('${queueId}', '${q.id}', '${teamKey}')">
            ${meta.icon} ${meta.shortLabel} Won
          </button>
        `;
      }).join('');

      resolutionHtml = `
        <div class="qm-victor-grid" style="margin-top:4px; margin-bottom:10px;">
          ${victorButtons}
        </div>
      `;
    } else {
      const teamSelectorsHtml = playerTeams.map((teamKey, tIdx) => {
        const meta = typeof getBattleTeamMeta === 'function'
          ? getBattleTeamMeta(teamKey)
          : { label: teamKey, icon: '⚔️', color: '#38bdf8' };
        const defaultTierIdx = Math.min(tIdx, placementTiers.length - 1);
        const optionsHtml = placementTiers.map((tier, pIdx) => {
          return `<option value="${pIdx}" ${pIdx === defaultTierIdx ? 'selected' : ''}>${tier.label} (+${tier.gold}g)</option>`;
        }).join('');

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 8px; background:rgba(24,24,27,0.75); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
            <span style="font-size:12px; font-weight:700; color:${meta.color};">${meta.icon} ${meta.label}</span>
            <select id="qm-rank-select-${q.id}-${teamKey}" class="form-control" style="width:auto; min-width:155px; padding:4px 8px; font-size:12px; height:30px;">
              ${optionsHtml}
            </select>
          </div>
        `;
      }).join('');

      const monsterFixedRowHtml = rules.hasMonsters ? `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 8px; background:rgba(24,24,27,0.75); border:1px solid rgba(244,63,94,0.25); border-radius:6px;">
          <span style="font-size:12px; font-weight:700; color:#fda4af;">👹 Monsters</span>
          <span style="font-size:12px; font-weight:700; color:var(--gold);">Flat +${monsterReward}g</span>
        </div>
      ` : '';

      resolutionHtml = `
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(251,191,36,0.3); border-radius:8px; padding:10px; margin-top:4px; margin-bottom:10px;">
          <div style="font-size:11px; font-weight:700; color:var(--gold); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">
            🏆 Assign Team Placements
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
            ${teamSelectorsHtml}
            ${monsterFixedRowHtml}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-battle-action btn-battle-hero" style="flex:2; min-height:40px; font-size:13px;" onclick="qmFinishRankedBattle('${queueId}', '${q.id}')">
              🏆 Complete &amp; Pay Placements
            </button>
            ${rules.hasMonsters ? `
              <button class="btn-battle-action btn-team-monster" style="flex:1; min-height:40px; font-size:12px;" onclick="qmFinishBattle('${queueId}', '${q.id}', 'monster')">
                👹 Monsters Won
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Inline Edit Team Checkboxes
    const editTeamChecksHtml = QM_TEAM_KEYS.map(tk => {
      const meta = typeof getBattleTeamMeta === 'function' ? getBattleTeamMeta(tk) : { label: tk, icon: '⚔️', color: '#ffffff' };
      const isChecked = playerTeams.includes(tk);
      return `
        <label class="battle-team-check-item">
          <input type="checkbox" id="qm-edit-team-check-${tk}-${q.id}" ${isChecked ? 'checked' : ''}>
          <span style="color:${meta.color};">${meta.icon} ${meta.label}</span>
        </label>
      `;
    }).join('');

    const curExtraCount = extraPlacements.length;

    return `
      <details class="quest-accordion battle-accordion" data-quest-id="${q.id}" ${isOpenByDefault ? 'open' : ''} style="border: 1px solid var(--border); margin-bottom: 12px;">
        <summary>
          <span class="quest-summary-title" style="font-size:15px; font-weight:800;">⚔️ ${q.title}</span>
          <span class="quest-summary-actions">
            ${statusBadge}
          </span>
        </summary>

        <div class="quest-accordion-content">
          ${state === 'closed' ? `
            <!-- BADGES CONTAINER -->
            <div class="tag-container" style="margin-top:6px; margin-bottom:8px;">
              ${commonBadgesHtml}
            </div>

            <!-- DESCRIPTION -->
            ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:6px 0 10px 0; line-height:1.45;">${q.description}</p>` : ''}

            <!-- ACTIONS: CLOSED -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; gap:8px;">
              <button class="btn-battle-action btn-battle-hero" style="flex:1; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px; text-transform:none;" onclick="qmLaunchBattle('${q.id}')">
                Open
              </button>
              <button type="button" class="btn-secondary" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; border-radius:6px; background:#27272a; border:1px solid #3f3f46; color:#e4e4e7; cursor:pointer;" onclick="toggleQMBattleEdit('${q.id}')" title="Edit battle details">
                ✏️ Edit
              </button>
              <button class="btn-delete" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; justify-content:center; border-radius:6px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete battle from catalog">
                🗑️ Delete
              </button>
            </div>
          ` : `
            <!-- 1. MULTI-TEAM QUEUE ROSTER -->
            <div class="dual-queue-grid" style="margin-top:6px; margin-bottom:12px;">
              ${qmTeamBoxesHtml}
            </div>

            <!-- 2. SMART HYBRID VICTOR / PLACEMENT RESOLUTION -->
            ${resolutionHtml}

            <!-- 3. BADGES CONTAINER -->
            <div class="tag-container" style="margin-bottom:8px;">
              ${commonBadgesHtml}
            </div>

            <!-- 4. DESCRIPTION TEXT -->
            ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:6px 0 10px 0; line-height:1.45;">${q.description}</p>` : ''}

            <!-- 5. QM CONTROLS (BOTTOM) -->
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:8px;">
              ${state === 'open' ? `
                <button class="btn-accept" style="flex:2; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px;" onclick="qmStartCombat('${queueId}', '${q.id}')">
                  Go Live
                </button>
              ` : `
                <button style="flex:2; min-height:40px; font-size:13px; font-weight:bold; background:#27272a; color:#a1a1aa; border:1px solid #3f3f46; border-radius:6px; opacity:0.8; cursor:not-allowed; display:flex; align-items:center; justify-content:center;" disabled>
                  Live
                </button>
              `}
              <button class="btn-leave" style="flex:1; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px;" onclick="qmCloseBattle('${q.id}', '${queueId}')">
                Close
              </button>
              <button type="button" class="btn-secondary" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; border-radius:6px; background:#27272a; border:1px solid #3f3f46; color:#e4e4e7; cursor:pointer;" onclick="toggleQMBattleEdit('${q.id}')" title="Edit battle details">
                ✏️ Edit
              </button>
              <button class="btn-delete" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; justify-content:center; border-radius:6px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete battle from catalog">
                🗑️ Delete
              </button>
            </div>
          `}

          <!-- INLINE BATTLE EDIT FORM (TOGGLED VIA EDIT BUTTON) -->
          <div id="qm-battle-edit-form-${q.id}" class="hidden" style="margin-top:12px; padding:12px; background:#18181b; border:1px solid var(--gold); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="font-weight:700; font-size:13px; color:var(--gold);">✏️ Edit Battle</span>
              <button type="button" onclick="toggleQMBattleEdit('${q.id}', false)" style="background:transparent; border:none; color:var(--text-muted); font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
            </div>

            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:12px;">Battle Title</label>
              <input type="text" id="qm-edit-battle-title-${q.id}" class="form-control" value="${escapeAttr(q.title)}">
            </div>

            <div class="form-group" style="margin-bottom:10px;">
              <label style="font-size:12px;">Description</label>
              <textarea id="qm-edit-battle-description-${q.id}" class="form-control" style="min-height:70px;">${escapeAttr(q.description || '')}</textarea>
            </div>

            <!-- Inline Teams Selector -->
            <div class="form-group" style="background:#121214; padding:10px; border-radius:6px; border:1px solid var(--border); margin-bottom:10px;">
              <label style="font-weight:600; font-size:12px; color:var(--text); display:block; margin-bottom:8px;">
                Teams
              </label>
              <div class="battle-teams-check-grid">
                ${editTeamChecksHtml}
                <div class="battle-team-monster-row">
                  <label class="battle-team-monster-left">
                    <input type="checkbox" id="qm-edit-team-check-monster-${q.id}" ${rules.hasMonsters ? 'checked' : ''}>
                    <span style="color:#fda4af;">👹 Monsters</span>
                  </label>
                  <div class="battle-team-monster-right">
                    <span>Reward</span>
                    <input type="number" id="qm-edit-team-reward-monster-${q.id}" value="${monsterReward}" min="0">
                    <span>g</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Inline Sleek Dynamic Rewards Box (No Header Title, + / − on Bottom Right) -->
            <div class="battle-rewards-box" style="background:#121214; margin-bottom:10px;">
              <input type="hidden" id="qm-edit-extra-placements-count-${q.id}" value="${curExtraCount}">

              <div class="battle-rewards-row">
                <div class="battle-rewards-grid">
                  <div class="battle-reward-field">
                    <label>Victory</label>
                    <input type="number" id="qm-edit-battle-gold-victory-${q.id}" value="${victoryGold}" min="0">
                  </div>

                  <div class="battle-reward-field ${curExtraCount >= 1 ? '' : 'hidden'}" id="qm-edit-placement-wrap-2-${q.id}">
                    <label>2nd Place</label>
                    <input type="number" id="qm-edit-battle-gold-place-2-${q.id}" value="${extraPlacements[0] ?? ''}" placeholder="0" min="0">
                  </div>

                  <div class="battle-reward-field ${curExtraCount >= 2 ? '' : 'hidden'}" id="qm-edit-placement-wrap-3-${q.id}">
                    <label>3rd Place</label>
                    <input type="number" id="qm-edit-battle-gold-place-3-${q.id}" value="${extraPlacements[1] ?? ''}" placeholder="0" min="0">
                  </div>

                  <div class="battle-reward-field ${curExtraCount >= 3 ? '' : 'hidden'}" id="qm-edit-placement-wrap-4-${q.id}">
                    <label>4th Place</label>
                    <input type="number" id="qm-edit-battle-gold-place-4-${q.id}" value="${extraPlacements[2] ?? ''}" placeholder="0" min="0">
                  </div>

                  <div class="battle-reward-field ${curExtraCount >= 4 ? '' : 'hidden'}" id="qm-edit-placement-wrap-5-${q.id}">
                    <label>5th Place</label>
                    <input type="number" id="qm-edit-battle-gold-place-5-${q.id}" value="${extraPlacements[3] ?? ''}" placeholder="0" min="0">
                  </div>

                  <div class="battle-reward-field">
                    <label>Defeat</label>
                    <input type="number" id="qm-edit-battle-gold-defeat-${q.id}" value="${defeatGold}" min="0">
                  </div>
                </div>

                <div class="battle-rewards-actions-bottom">
                  <button type="button" id="qm-edit-btn-remove-placement-${q.id}" class="btn-placement-step ${curExtraCount > 0 ? '' : 'hidden'}" onclick="removeQMBattlePlacement('${q.id}')" title="Remove last placement">−</button>
                  <button type="button" id="qm-edit-btn-add-placement-${q.id}" class="btn-placement-step" ${curExtraCount >= 4 ? 'disabled' : ''} onclick="addQMBattlePlacement('${q.id}')" title="Add 2nd / 3rd / 4th / 5th Place">+</button>
                </div>
              </div>
            </div>

            <div class="form-group" style="background:#121214; padding:10px; border-radius:6px; border:1px solid var(--border); margin-bottom:12px;">
              <label style="font-weight:600; font-size:12px; color:var(--text); display:block; margin-bottom:8px;">
                Checked Items will consume Durability
              </label>
              <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; margin:0;">
                  <input type="checkbox" id="qm-edit-battle-trinket-${q.id}" ${hasTrinket ? 'checked' : ''} style="width:15px; height:15px;">
                  <span>Trinket</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; margin:0;">
                  <input type="checkbox" id="qm-edit-battle-talisman-${q.id}" ${hasTalisman ? 'checked' : ''} style="width:15px; height:15px;">
                  <span>Talisman</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; margin:0;">
                  <input type="checkbox" id="qm-edit-battle-artifact-${q.id}" ${hasArtifact ? 'checked' : ''} style="width:15px; height:15px;">
                  <span>Artifact</span>
                </label>
              </div>

              <div style="border-top:1px solid #27272a; padding-top:8px; display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; margin:0;">
                  <input type="checkbox" id="qm-edit-battle-midjoin-${q.id}" ${rules.allowMidJoin ? 'checked' : ''} style="width:15px; height:15px;">
                  <span>Allow Mid-Battle Joining</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; margin:0; color:var(--gold);">
                  <input type="checkbox" id="qm-edit-battle-rngloot-${q.id}" ${rules.rngLootDrops ? 'checked' : ''} style="width:15px; height:15px;">
                  <span>🎲 Roll Item Loot Drops on Victory</span>
                </label>
              </div>

              <div style="border-top:1px solid #27272a; padding-top:8px; margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div>
                  <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Gear Durability Wear</label>
                  <select id="qm-edit-battle-wear-${q.id}" class="form-control" style="padding:6px 8px; font-size:12px;">
                    <option value="1" ${curWear === 1 ? 'selected' : ''}>1 Wear (Standard)</option>
                    <option value="2" ${curWear === 2 ? 'selected' : ''}>2 Wear (Heavy)</option>
                    <option value="3" ${curWear === 3 ? 'selected' : ''}>3 Wear (Brutal)</option>
                    <option value="0" ${curWear === 0 ? 'selected' : ''}>0 Wear (No Gear Wear)</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Defeat Penalty</label>
                  <select id="qm-edit-battle-penalty-${q.id}" class="form-control" style="padding:6px 8px; font-size:12px;">
                    <option value="none" ${curPenalty === 'none' ? 'selected' : ''}>None (Standard)</option>
                    <option value="items_lost" ${curPenalty === 'items_lost' ? 'selected' : ''}>💀 Items Lost (Pouch Only)</option>
                    <option value="total_ruin" ${curPenalty === 'total_ruin' ? 'selected' : ''}>☠️ Total Ruin (Pouch + Bank + Gold)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button type="button" onclick="toggleQMBattleEdit('${q.id}', false)" style="background:#27272a; border:1px solid var(--border); color:var(--text); padding:8px 14px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">
                Cancel
              </button>
              <button type="button" id="btn-save-battle-${q.id}" onclick="qmSaveEditedBattle('${q.id}')" style="background:var(--primary); border:none; color:#ffffff; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </details>
    `;
  }).join('');
}

// ------------------------------------------------------------------------------
// 4. Battle Lifecycle & Multi-Team Resolution Handlers
// ------------------------------------------------------------------------------

async function qmLaunchBattle(questId) {
  const { error: questError } = await supabaseClient
    .from('quests')
    .update({ is_active: true })
    .eq('id', questId);

  if (questError) {
    alert("Error launching battle: " + questError.message);
    return;
  }

  const { data: existingQueues } = await supabaseClient
    .from('quest_queues')
    .select('id')
    .eq('quest_id', questId)
    .in('status', ['waiting', 'active']);

  if (!existingQueues || existingQueues.length === 0) {
    const { error: queueError } = await supabaseClient
      .from('quest_queues')
      .insert({ quest_id: questId, status: 'waiting' });
    if (queueError) {
      alert("Error opening line: " + queueError.message);
      return;
    }
  }

  await fetchUserSlotState();
  await fetchQMQueues();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function qmStartCombat(queueId, questId) {
  if (!queueId && questId) {
    await supabaseClient.from('quest_queues').insert({ quest_id: questId, status: 'active' });
  } else if (queueId) {
    const { error } = await supabaseClient
      .from('quest_queues')
      .update({ status: 'active' })
      .eq('id', queueId);
    if (error) {
      alert("Error starting combat: " + error.message);
      return;
    }
  }

  await fetchUserSlotState();
  await fetchQMQueues();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function qmCloseBattle(questId, queueId) {
  if (!confirm("Close/withdraw this battle from the field? Active queues will be closed.")) return;

  const updates = [
    supabaseClient.from('quests').update({ is_active: false }).eq('id', questId)
  ];
  if (queueId) {
    updates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId));
    updates.push(supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId));
  } else {
    updates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('quest_id', questId).in('status', ['waiting', 'active']));
  }

  await Promise.allSettled(updates);

  await fetchUserSlotState();
  await fetchQMQueues();
  await fetchQuests();
  await fetchMonsterEncounters();
}

async function fetchBattleResolutionContext(queueId, questId) {
  let queueData = null;
  if (queueId) {
    const { data: qd } = await supabaseClient
      .from('quest_queues')
      .select(`
        id,
        quest_id,
        queue_members(*),
        encounter_monsters(*)
      `)
      .eq('id', queueId)
      .maybeSingle();
    queueData = qd;
    if (!questId && qd?.quest_id) questId = qd.quest_id;
  }

  let questData = null;
  if (questId) {
    const { data: questRow } = await supabaseClient
      .from('quests')
      .select('*')
      .eq('id', questId)
      .maybeSingle();
    questData = questRow;
  }

  const rules = typeof getQuestDurabilityRules === 'function'
    ? getQuestDurabilityRules(questData)
    : {
        battleMode: 'pvp',
        activeTeams: ['red', 'blue'],
        playerTeams: ['red', 'blue'],
        hasMonsters: false,
        monstersAreNpc: false,
        extraPlacements: [],
        placementTiers: [
          { key: 'victory', label: '🥇 Victory (1st)', shortLabel: '1st', gold: 15 },
          { key: 'defeat', label: '💀 Defeat', shortLabel: 'Loss', gold: 10 }
        ],
        placementRewards: [15, 10, 10, 10, 10, 10],
        monsterReward: 10,
        allowedTypes: ['Trinket', 'Talisman', 'Artifact'],
        victoryGold: 15,
        defeatGold: 10,
        durabilityWear: 1,
        defeatPenalty: 'none',
        rngLootDrops: false
      };

  const activeTeams = rules.activeTeams || ['red', 'blue'];
  const teamUserIds = {};
  activeTeams.forEach(tk => { teamUserIds[tk] = []; });

  (queueData?.queue_members || []).forEach(m => {
    if (!m.user_id) return;
    const rawTeam = m.team || m.role_name || '';
    const tk = typeof normalizeBattleMemberTeam === 'function'
      ? normalizeBattleMemberTeam(rawTeam, activeTeams)
      : (activeTeams[0] || 'red');
    if (!teamUserIds[tk]) teamUserIds[tk] = [];
    if (!teamUserIds[tk].includes(m.user_id)) {
      teamUserIds[tk].push(m.user_id);
    }
  });

  (queueData?.encounter_monsters || []).forEach(m => {
    if (!m.user_id) return;
    const tk = activeTeams.includes('monster') ? 'monster' : (activeTeams[1] || activeTeams[0] || 'monster');
    if (!teamUserIds[tk]) teamUserIds[tk] = [];
    if (!teamUserIds[tk].includes(m.user_id)) {
      teamUserIds[tk].push(m.user_id);
    }
  });

  return { questId, questData, rules, activeTeams, teamUserIds };
}

// One-Tap Winner Resolution
async function qmFinishBattle(queueId, questId, winningTeamOrVictoryGold = 'red', legacyDefeatGold = null, legacyExplicitVictor = null) {
  const { questId: resolvedQuestId, questData, rules, activeTeams, teamUserIds } = await fetchBattleResolutionContext(queueId, questId);

  let winningTeam = 'red';
  if (typeof legacyExplicitVictor === 'string' && legacyExplicitVictor) {
    winningTeam = legacyExplicitVictor === 'monsters' ? 'monster' : (rules.playerTeams[0] || 'red');
  } else if (typeof winningTeamOrVictoryGold === 'string') {
    winningTeam = winningTeamOrVictoryGold;
  }

  if (winningTeam === 'heroes') winningTeam = rules.playerTeams[0] || 'red';
  if (winningTeam === 'monsters') winningTeam = activeTeams.includes('monster') ? 'monster' : (rules.playerTeams[1] || 'blue');

  const winMeta = typeof getBattleTeamMeta === 'function'
    ? getBattleTeamMeta(winningTeam)
    : { label: winningTeam, icon: '⚔️' };

  const victoryGold = rules.victoryGold ?? Number(questData?.reward_gold) ?? 15;
  const defeatGold = rules.defeatGold ?? Number(questData?.reward_gold_defeat) ?? 10;
  const monsterGold = Number.isFinite(rules.monsterReward) ? Number(rules.monsterReward) : 10;

  const payoutByTeam = {};
  activeTeams.forEach(tk => {
    if (tk === 'monster') {
      // Monsters always receive their flat Monster reward outside Victory/Defeat
      payoutByTeam[tk] = monsterGold;
    } else {
      payoutByTeam[tk] = tk === winningTeam ? victoryGold : defeatGold;
    }
  });

  const wearAmount = Number.isFinite(rules.durabilityWear) ? Number(rules.durabilityWear) : 1;
  const defeatPenalty = rules.defeatPenalty || 'none';

  let stakesWarning = '';
  if (defeatPenalty === 'items_lost') {
    stakesWarning = `\n\n⚠️ HIGH STAKES (Items Lost): Defeated player teams will LOSE ALL active pouch items!`;
  } else if (defeatPenalty === 'total_ruin') {
    stakesWarning = `\n\n☠️ TOTAL RUIN ACTIVE: Defeated player teams will LOSE ALL items AND have Gold reset to 0!`;
  }

  const teamSummaryLines = activeTeams.map(tk => {
    const meta = typeof getBattleTeamMeta === 'function' ? getBattleTeamMeta(tk) : { label: tk, icon: '⚔️' };
    const count = (teamUserIds[tk] || []).length;
    const gold = payoutByTeam[tk] ?? 0;
    const statusTag = tk === 'monster'
      ? 'MONSTER REWARD'
      : (tk === winningTeam ? 'VICTORY' : 'DEFEAT');
    return `• ${meta.icon} ${meta.label} (${count} players): +${gold}g each (${statusTag})`;
  }).join('\n');

  const confirmMsg = `Declare ${winMeta.icon} ${winMeta.label.toUpperCase()} the Victor?\n\n` +
    `${teamSummaryLines}\n\n` +
    `Combat Rules:\n` +
    `• Active Magic Items: ${rules.allowedTypes.length > 0 ? rules.allowedTypes.join(', ') : 'None'}\n` +
    `• Gear Durability Wear: ${wearAmount} per battle` +
    (rules.hasMonsters ? `\n• Monster Line: NPCs (0 gear wear)` : '') +
    stakesWarning + `\n\n` +
    `Distribute rewards and complete battle?`;

  if (!confirm(confirmMsg)) return;

  await executeBattleResolutionPayouts({
    queueId,
    questId: resolvedQuestId,
    questData,
    rules,
    activeTeams,
    teamUserIds,
    payoutByTeam,
    winningTeamKey: winningTeam,
    headlineLabel: `${winMeta.icon} ${winMeta.label}`
  });
}

// Ranked Multi-Team Placement Resolution (when 2nd/3rd/4th/5th Place rewards are configured)
async function qmFinishRankedBattle(queueId, questId) {
  const { questId: resolvedQuestId, questData, rules, activeTeams, teamUserIds } = await fetchBattleResolutionContext(queueId, questId);

  const placementTiers = Array.isArray(rules.placementTiers) && rules.placementTiers.length >= 2
    ? rules.placementTiers
    : [
        { key: 'victory', label: '🥇 Victory (1st)', shortLabel: '1st', gold: rules.victoryGold ?? 15 },
        { key: 'defeat', label: '💀 Defeat', shortLabel: 'Loss', gold: rules.defeatGold ?? 10 }
      ];

  const payoutByTeam = {};
  const tierByTeam = {};
  const playerTeams = rules.playerTeams || activeTeams.filter(tk => tk !== 'monster');
  const monsterGold = Number.isFinite(rules.monsterReward) ? Number(rules.monsterReward) : 10;

  let firstPlaceTeamKey = playerTeams[0] || 'red';
  let bestTierIdx = 99;

  playerTeams.forEach((tk, idx) => {
    const selectEl = document.getElementById(`qm-rank-select-${resolvedQuestId}-${tk}`);
    const defaultIdx = Math.min(idx, placementTiers.length - 1);
    const tierIdx = selectEl ? parseInt(selectEl.value, 10) : defaultIdx;
    const safeTierIdx = (Number.isFinite(tierIdx) && tierIdx >= 0 && tierIdx < placementTiers.length) ? tierIdx : defaultIdx;

    const chosenTier = placementTiers[safeTierIdx];
    tierByTeam[tk] = chosenTier;
    payoutByTeam[tk] = chosenTier.gold ?? 0;

    if (safeTierIdx < bestTierIdx) {
      bestTierIdx = safeTierIdx;
      firstPlaceTeamKey = tk;
    }
  });

  if (activeTeams.includes('monster')) {
    payoutByTeam['monster'] = monsterGold;
  }

  const teamSummaryLines = activeTeams.map(tk => {
    const meta = typeof getBattleTeamMeta === 'function' ? getBattleTeamMeta(tk) : { label: tk, icon: '⚔️' };
    const count = (teamUserIds[tk] || []).length;
    if (tk === 'monster') {
      return `• ${meta.icon} ${meta.label} (${count} players): Monster Reward → +${monsterGold}g each`;
    }
    const tier = tierByTeam[tk] || placementTiers[placementTiers.length - 1];
    return `• ${meta.icon} ${meta.label} (${count} players): ${tier.label} → +${tier.gold}g each`;
  }).join('\n');

  const wearAmount = Number.isFinite(rules.durabilityWear) ? Number(rules.durabilityWear) : 1;
  const confirmMsg = `Complete Ranked Battle & Distribute Placement Rewards?\n\n` +
    `${teamSummaryLines}\n\n` +
    `• Gear Durability Wear: ${wearAmount} per battle\n\n` +
    `Execute payouts and close battle?`;

  if (!confirm(confirmMsg)) return;

  const winMeta = typeof getBattleTeamMeta === 'function'
    ? getBattleTeamMeta(firstPlaceTeamKey)
    : { label: firstPlaceTeamKey, icon: '🏆' };

  await executeBattleResolutionPayouts({
    queueId,
    questId: resolvedQuestId,
    questData,
    rules,
    activeTeams,
    teamUserIds,
    payoutByTeam,
    winningTeamKey: firstPlaceTeamKey,
    headlineLabel: `${winMeta.icon} ${winMeta.label}`
  });
}

async function executeBattleResolutionPayouts({
  queueId,
  questId,
  questData,
  rules,
  activeTeams,
  teamUserIds,
  payoutByTeam,
  winningTeamKey,
  headlineLabel
}) {
  const wearAmount = Number.isFinite(rules.durabilityWear) ? Number(rules.durabilityWear) : 1;
  const defeatPenalty = rules.defeatPenalty || 'none';

  const goldPromises = [];
  const wearPromises = [];
  const penaltyPromises = [];
  const winningUserIds = [];

  activeTeams.forEach(tk => {
    const uids = teamUserIds[tk] || [];
    const goldAmt = payoutByTeam[tk] ?? 0;
    const isMonsterNpc = tk === 'monster' && (rules.hasMonsters || rules.monstersAreNpc);
    const isWinningTeam = tk === winningTeamKey;

    uids.forEach(uid => {
      if (goldAmt > 0) {
        goldPromises.push(awardFighterGold(uid, goldAmt));
      }
      if (!isMonsterNpc && wearAmount > 0) {
        wearPromises.push(applyCombatDurabilityDamage(uid, rules.allowedTypes, wearAmount));
      }
      if (!isMonsterNpc && !isWinningTeam && defeatPenalty !== 'none') {
        penaltyPromises.push(executeDefeatPenalty(uid, defeatPenalty));
      }
      if (!isMonsterNpc && isWinningTeam) {
        winningUserIds.push(uid);
      }
    });
  });

  let lootNotice = '';
  if (rules.rngLootDrops && winningUserIds.length > 0 && typeof rollItemLootDrops === 'function') {
    const battleDrops = await rollItemLootDrops(winningUserIds, true, questData?.qm_id, questData?.park, questData?.kingdom);
    if (battleDrops && battleDrops.length > 0) {
      const dropDetails = battleDrops.map(d => `• ${d.username}: ${d.items.join(', ')}`).join('\n');
      lootNotice = `\n\n🎲 MYSTERY LOOT DROPS:\n${dropDetails}`;
    } else {
      lootNotice = `\n\n🎲 Mystery Loot: Rolls were cast for ${winningUserIds.length} winner(s), but no items dropped.`;
    }
  }

  const queueUpdates = [];
  if (queueId) {
    queueUpdates.push(supabaseClient.from('quest_queues').update({ status: 'completed' }).eq('id', queueId));
    queueUpdates.push(supabaseClient.from('encounter_monsters').update({ status: 'completed' }).eq('queue_id', queueId));
  }
  if (questId) {
    queueUpdates.push(supabaseClient.from('quests').update({ is_active: false }).eq('id', questId));
  }

  await Promise.allSettled([...goldPromises, ...wearPromises, ...penaltyPromises, ...queueUpdates]);

  alert(`🎉 Battle finished! ${headlineLabel} victorious!\nRewards distributed and combat results processed.${lootNotice}`);
  initDashboard();
}

window.qmFinishRankedBattle = qmFinishRankedBattle;

async function executeDefeatPenalty(userId, penalty) {
  if (!userId || !penalty || penalty === 'none') return;
  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || null;

  try {
    if (penalty === 'items_lost') {
      let invQuery = supabaseClient
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .eq('park', activePark)
        .neq('storage_location', 'bank');

      if (activeQMId) {
        invQuery = invQuery.eq('qm_id', activeQMId);
      }
      await invQuery;
    } else if (penalty === 'total_ruin') {
      let invQuery = supabaseClient
        .from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .eq('park', activePark);

      if (activeQMId) {
        invQuery = invQuery.eq('qm_id', activeQMId);
      }
      await invQuery;

      let profQuery = supabaseClient
        .from('user_park_profiles')
        .update({ gold: 0 })
        .eq('user_id', userId)
        .eq('park', activePark);

      if (activeQMId) {
        profQuery = profQuery.eq('qm_id', activeQMId);
      }
      await profQuery;

      if (currentUser && currentUser.id === userId) {
        if (currentParkProfile) currentParkProfile.gold = 0;
        if (currentProfile) currentProfile.gold = 0;
        if (typeof syncGoldDisplays === 'function') syncGoldDisplays(0);
      }
    }
  } catch (err) {
    console.error('Error executing defeat penalty:', err);
  }
}

async function awardFighterGold(userId, goldAmt) {
  if (!userId || !goldAmt || goldAmt <= 0) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : (typeof getKingdomForPark === 'function' ? getKingdomForPark(activePark) : 'The Freeholds of Amtgard');
  const activeQMId = currentQMId || null;

  try {
    let profileQuery = supabaseClient
      .from('user_park_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('park', activePark);

    if (activeQMId) {
      profileQuery = profileQuery.eq('qm_id', activeQMId);
    }

    const { data: existingParkProfile } = await profileQuery.maybeSingle();

    let nextGold = goldAmt;
    if (existingParkProfile) {
      nextGold = (Number(existingParkProfile.gold) || 0) + goldAmt;
      await supabaseClient
        .from('user_park_profiles')
        .update({ gold: nextGold })
        .eq('id', existingParkProfile.id);
    } else {
      const { data: inserted } = await supabaseClient
        .from('user_park_profiles')
        .insert({
          user_id: userId,
          park: activePark,
          kingdom: activeKingdom,
          qm_id: activeQMId,
          role: (activeQMId && userId === activeQMId) ? 'questmaster' : 'player',
          gold: nextGold
        })
        .select('*')
        .maybeSingle();
      if (inserted && currentUser && currentUser.id === userId) {
        currentParkProfile = inserted;
      }
    }

    const { data: p } = await supabaseClient
      .from('profiles')
      .select('gold, park_gold')
      .eq('id', userId)
      .maybeSingle();

    if (p) {
      let parkGoldMap = p.park_gold;
      if (typeof parkGoldMap === 'string') {
        try { parkGoldMap = JSON.parse(parkGoldMap); } catch (e) { parkGoldMap = {}; }
      }
      if (!parkGoldMap || typeof parkGoldMap !== 'object') parkGoldMap = {};
      parkGoldMap[activePark] = nextGold;

      await supabaseClient
        .from('profiles')
        .update({
          gold: (Number(p.gold) || 0) + goldAmt,
          park_gold: parkGoldMap
        })
        .eq('id', userId);
    }

    if (currentUser && currentUser.id === userId) {
      if (!currentParkProfile) {
        currentParkProfile = { user_id: userId, park: activePark, kingdom: activeKingdom, qm_id: activeQMId, gold: nextGold };
      } else {
        currentParkProfile.gold = nextGold;
      }
      if (!currentProfile) currentProfile = {};
      currentProfile.gold = nextGold;
      if (typeof syncGoldDisplays === 'function') {
        syncGoldDisplays(nextGold);
      }
    }
  } catch (err) {
    console.error(`Error awarding ${goldAmt}g to user ${userId}:`, err);
  }
}

async function qmSetQueueStatus(queueId, status) {
  return qmStartCombat(queueId);
}
async function qmCompleteAndPayEncounter(queueId, rewardGold, pcUserIds, monsterUserIds) {
  return qmFinishBattle(queueId, null, 'red');
}

// ------------------------------------------------------------------------------
// 5. QM Kick Player Handlers & Inline Battle Edit Save
// ------------------------------------------------------------------------------

async function qmKickFromBattleQueue(memberId, sourceTable = 'queue_members', username = 'Fighter', teamLabel = 'Team') {
  const confirmed = confirm(`Remove "${username}" from ${teamLabel}?\n\nThis will remove them from the battle and free up their slot.`);
  if (!confirmed) return;

  try {
    const table = sourceTable === 'encounter_monsters' ? 'encounter_monsters' : 'queue_members';
    const { error } = await supabaseClient
      .from(table)
      .delete()
      .eq('id', memberId);

    if (error) {
      alert("Error removing fighter: " + error.message);
      return;
    }

    alert(`🚫 ${username} removed from ${teamLabel}.`);
    await fetchQMQueues();
    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
  } catch (err) {
    console.error("Error kicking fighter from queue:", err);
    alert("Error: " + (err.message || err));
  }
}

async function qmKickHeroFromQueue(memberId, username) {
  return qmKickFromBattleQueue(memberId, 'queue_members', username, 'Heroes Line');
}

async function qmKickMonsterFromQueue(claimId, username) {
  return qmKickFromBattleQueue(claimId, 'encounter_monsters', username, 'Monster Line');
}

window.qmKickFromBattleQueue = qmKickFromBattleQueue;
window.qmKickHeroFromQueue = qmKickHeroFromQueue;
window.qmKickMonsterFromQueue = qmKickMonsterFromQueue;

function toggleQMBattleEdit(questId, forceOpen = null) {
  const formEl = document.getElementById(`qm-battle-edit-form-${questId}`);
  if (!formEl) return;
  const shouldOpen = forceOpen !== null ? forceOpen : formEl.classList.contains('hidden');
  if (shouldOpen) {
    formEl.classList.remove('hidden');
    document.getElementById(`qm-edit-battle-title-${questId}`)?.focus();
  } else {
    formEl.classList.add('hidden');
  }
}

async function qmSaveEditedBattle(questId) {
  if (!questId) return;

  const title = document.getElementById(`qm-edit-battle-title-${questId}`)?.value.trim();
  const description = document.getElementById(`qm-edit-battle-description-${questId}`)?.value.trim() || '';

  if (!title) {
    alert("Please enter a Battle Title.");
    return;
  }

  const config = readBattleConfigFromForm(questId);
  if (config.battle_teams.length < 2) {
    alert("Please check at least 2 Teams for the battle.");
    return;
  }

  const allowTrinket = Boolean(document.getElementById(`qm-edit-battle-trinket-${questId}`)?.checked);
  const allowTalisman = Boolean(document.getElementById(`qm-edit-battle-talisman-${questId}`)?.checked);
  const allowArtifact = Boolean(document.getElementById(`qm-edit-battle-artifact-${questId}`)?.checked);

  const allowedList = [];
  if (allowTrinket) allowedList.push('Trinket');
  if (allowTalisman) allowedList.push('Talisman');
  if (allowArtifact) allowedList.push('Artifact');
  const allowed_items = allowedList.join(',');

  const allow_mid_join = Boolean(document.getElementById(`qm-edit-battle-midjoin-${questId}`)?.checked);
  const rng_loot_drops = Boolean(document.getElementById(`qm-edit-battle-rngloot-${questId}`)?.checked);

  const wearInput = document.getElementById(`qm-edit-battle-wear-${questId}`);
  const durability_wear = wearInput ? Number(wearInput.value) : 1;

  const penaltyInput = document.getElementById(`qm-edit-battle-penalty-${questId}`);
  const defeat_penalty = penaltyInput ? penaltyInput.value : 'none';

  const saveBtn = document.getElementById(`btn-save-battle-${questId}`);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";
  }

  try {
    const scenario_card = `<!-- RULES: ${JSON.stringify({
      battle_mode: config.battle_mode,
      battle_teams: config.battle_teams,
      extra_placements: config.extra_placements,
      placement_rewards: config.placement_rewards,
      monster_reward: config.monster_reward,
      monsters_are_npc: config.monsters_are_npc,
      allowed_items: allowedList,
      reward_gold_defeat: config.reward_gold_defeat,
      defeat_gold: config.reward_gold_defeat,
      durability_wear,
      defeat_penalty,
      allow_mid_join,
      rng_loot_drops
    })} -->`;

    const updatePayload = {
      title,
      reward_gold: config.reward_gold,
      reward_gold_defeat: config.reward_gold_defeat,
      battle_mode: config.battle_mode,
      battle_teams: config.battle_teams,
      placement_rewards: config.placement_rewards,
      monster_reward: config.monster_reward,
      monsters_are_npc: config.monsters_are_npc,
      durability_wear,
      defeat_penalty,
      allowed_items,
      description,
      scenario_card,
      allow_mid_join,
      rng_loot_drops
    };

    let { error } = await supabaseClient
      .from('quests')
      .update(updatePayload)
      .eq('id', questId);

    if (error) {
      console.warn("Initial battle update error, attempting schema fallback:", error.message);
      let fallbackPayload = { ...updatePayload };
      const colMatch = error.message.match(/'([^']+)' column/) || error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
      if (colMatch && colMatch[1] && colMatch[1] in fallbackPayload) {
        delete fallbackPayload[colMatch[1]];
      }
      delete fallbackPayload.battle_mode;
      delete fallbackPayload.battle_teams;
      delete fallbackPayload.placement_rewards;
      delete fallbackPayload.monster_reward;
      delete fallbackPayload.durability_wear;
      delete fallbackPayload.defeat_penalty;
      delete fallbackPayload.allow_mid_join;
      delete fallbackPayload.rng_loot_drops;

      let retry = await supabaseClient
        .from('quests')
        .update(fallbackPayload)
        .eq('id', questId);
      if (retry.error) {
        delete fallbackPayload.monsters_are_npc;
        delete fallbackPayload.allowed_items;
        delete fallbackPayload.reward_gold_defeat;
        retry = await supabaseClient
          .from('quests')
          .update(fallbackPayload)
          .eq('id', questId);
      }
      error = retry.error;
    }

    if (error) {
      alert("Failed to update battle: " + error.message);
      return;
    }

    alert(`⚔️ Battle "${title}" updated!`);
    await fetchQMQueues();
    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
  } catch (err) {
    console.error("Error updating battle:", err);
    alert("Error updating battle: " + (err.message || err));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save Changes";
    }
  }
}

window.toggleQMBattleEdit = toggleQMBattleEdit;
window.qmSaveEditedBattle = qmSaveEditedBattle;
