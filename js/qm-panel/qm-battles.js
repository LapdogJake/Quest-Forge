// ==============================================================================
// Quest-Forge: QM Panel — Multi-Team Forge Battle & Battle Catalog
// (#qm-subtab-battle & #qm-subtab-queues)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Forge Battle & Inline Edit Form Helpers (PvP / PvM Slider & Team Checklist)
// ------------------------------------------------------------------------------

const QM_TEAM_KEYS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
const QM_PLACEMENT_NAMES = [
  '🥇 1st Place',
  '🥈 2nd Place',
  '🥉 3rd Place',
  '4th Place',
  '5th Place',
  '6th Place'
];

function getQMFormEl(baseId, questId = null) {
  const fullId = questId ? `${baseId}-${questId}` : baseId;
  return document.getElementById(fullId);
}

function setQMBattleMode(mode, questId = null) {
  const normalizedMode = mode === 'pvm' ? 'pvm' : 'pvp';
  const prefix = questId ? 'qm-edit' : 'qm';

  const modeInput = getQMFormEl(`${prefix}-battle-mode`, questId);
  if (modeInput) modeInput.value = normalizedMode;

  const pvpBtn = getQMFormEl(`${prefix}-mode-btn-pvp`, questId);
  const pvmBtn = getQMFormEl(`${prefix}-mode-btn-pvm`, questId);
  const hintEl = getQMFormEl(`${prefix}-battle-mode-hint`, questId);

  if (pvpBtn) {
    pvpBtn.classList.toggle('active-pvp', normalizedMode === 'pvp');
  }
  if (pvmBtn) {
    pvmBtn.classList.toggle('active-pvm', normalizedMode === 'pvm');
  }
  if (hintEl) {
    hintEl.innerText = normalizedMode === 'pvm'
      ? 'Monsters are NPCs (0 Gear Wear)'
      : 'Player Teams Only';
  }

  const monsterRow = getQMFormEl(`${prefix}-team-row-monster`, questId);
  const monsterCheck = getQMFormEl(`${prefix}-team-check-monster`, questId);

  if (normalizedMode === 'pvm') {
    if (monsterRow) monsterRow.style.display = 'grid';
    if (monsterCheck) monsterCheck.checked = true;
    // Ensure at least Red Team is checked
    const anyPlayerChecked = QM_TEAM_KEYS.some(tk => getQMFormEl(`${prefix}-team-check-${tk}`, questId)?.checked);
    if (!anyPlayerChecked) {
      const redCheck = getQMFormEl(`${prefix}-team-check-red`, questId);
      if (redCheck) redCheck.checked = true;
    }
  } else {
    if (monsterRow) monsterRow.style.display = 'none';
    if (monsterCheck) monsterCheck.checked = false;
    // Ensure at least 2 player teams are checked in PvP
    const checkedPlayers = QM_TEAM_KEYS.filter(tk => getQMFormEl(`${prefix}-team-check-${tk}`, questId)?.checked);
    if (checkedPlayers.length < 2) {
      const redCheck = getQMFormEl(`${prefix}-team-check-red`, questId);
      const blueCheck = getQMFormEl(`${prefix}-team-check-blue`, questId);
      if (redCheck) redCheck.checked = true;
      if (blueCheck) blueCheck.checked = true;
    }
  }

  handleQMTeamCheckChange(questId);
}

function handleQMTeamCheckChange(questId = null) {
  const prefix = questId ? 'qm-edit' : 'qm';

  const monsterRow = getQMFormEl(`${prefix}-team-row-monster`, questId);
  const monsterCheck = getQMFormEl(`${prefix}-team-check-monster`, questId);
  if (monsterRow && monsterCheck) {
    monsterRow.classList.toggle('is-disabled', !monsterCheck.checked);
  }

  let checkedPlayerCount = 0;
  QM_TEAM_KEYS.forEach(tk => {
    const checkEl = getQMFormEl(`${prefix}-team-check-${tk}`, questId);
    if (checkEl && checkEl.checked) checkedPlayerCount++;
  });

  QM_TEAM_KEYS.forEach((tk, idx) => {
    const rowEl = getQMFormEl(`${prefix}-team-row-${tk}`, questId);
    const checkEl = getQMFormEl(`${prefix}-team-check-${tk}`, questId);
    const labelEl = getQMFormEl(`${prefix}-placement-label-${idx}`, questId);
    const rewardEl = getQMFormEl(`${prefix}-placement-reward-${idx}`, questId);

    const isTeamChecked = Boolean(checkEl?.checked);
    const isPlacementActive = idx < checkedPlayerCount;

    if (rowEl) {
      rowEl.classList.toggle('is-disabled', !isTeamChecked && !isPlacementActive);
    }
    if (labelEl) {
      labelEl.style.opacity = isPlacementActive ? '1' : '0.35';
    }
    if (rewardEl) {
      rewardEl.disabled = !isPlacementActive;
      rewardEl.style.opacity = isPlacementActive ? '1' : '0.4';
    }
  });
}

function readBattleConfigFromForm(questId = null) {
  const prefix = questId ? 'qm-edit' : 'qm';
  const modeInput = getQMFormEl(`${prefix}-battle-mode`, questId);
  const battle_mode = modeInput?.value === 'pvm' ? 'pvm' : 'pvp';

  const monsterCheck = getQMFormEl(`${prefix}-team-check-monster`, questId);
  const includeMonster = battle_mode === 'pvm' && (!monsterCheck || monsterCheck.checked);

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

  const placement_rewards = [];
  for (let i = 0; i < 6; i++) {
    const rewardEl = getQMFormEl(`${prefix}-placement-reward-${i}`, questId);
    const val = rewardEl ? parseInt(rewardEl.value, 10) : (i === 0 ? 15 : 10);
    placement_rewards.push(Number.isFinite(val) && val >= 0 ? val : 0);
  }

  const monsterRewardEl = getQMFormEl(`${prefix}-team-reward-monster`, questId);
  const monsterVal = monsterRewardEl ? parseInt(monsterRewardEl.value, 10) : 10;
  const monster_reward = Number.isFinite(monsterVal) && monsterVal >= 0 ? monsterVal : 10;

  return {
    battle_mode,
    battle_teams,
    playerTeams,
    includeMonster,
    monsters_are_npc: battle_mode === 'pvm',
    placement_rewards,
    monster_reward,
    reward_gold: placement_rewards[0] ?? 15,
    reward_gold_defeat: placement_rewards[1] ?? 10
  };
}

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
    alert(config.battle_mode === 'pvm'
      ? "Please select at least 1 Player Team along with the Monster Line."
      : "Please select at least 2 Player Teams for a PvP battle.");
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
  if (document.getElementById('qm-team-reward-monster')) document.getElementById('qm-team-reward-monster').value = '10';
  for (let i = 0; i < 6; i++) {
    const rEl = document.getElementById(`qm-placement-reward-${i}`);
    if (rEl) rEl.value = i === 0 ? '15' : '10';
  }
  QM_TEAM_KEYS.forEach((tk, idx) => {
    const cEl = document.getElementById(`qm-team-check-${tk}`);
    if (cEl) cEl.checked = idx < 2;
  });
  setQMBattleMode('pvp', null);

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

  // Sort battles: Live first (0), Open second (1), Closed last (2), newest created first
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
    const placementRewards = Array.isArray(rules.placementRewards) && rules.placementRewards.length >= 6
      ? rules.placementRewards
      : [Number(q.reward_gold) || 15, Number(q.reward_gold_defeat) || 10, 10, 10, 10, 10];
    const monsterReward = Number.isFinite(rules.monsterReward) ? Number(rules.monsterReward) : 10;

    // Determine state: 'closed' | 'open' | 'live'
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
    const modeBadgeHtml = rules.battleMode === 'pvm'
      ? '<span class="badge badge-monster" title="Player vs Monster (Monsters are NPCs with 0 gear wear)">👹 PvM</span>'
      : '<span class="badge badge-active" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.35);">⚔️ PvP</span>';

    let rewardBadgesHtml = '';
    if (rules.isRankedPayout && playerTeams.length > 2) {
      const rankLabels = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th', '6th'];
      rewardBadgesHtml = playerTeams.map((_, idx) => {
        const amt = placementRewards[idx] ?? 0;
        const isFirst = idx === 0;
        return `<span class="badge badge-type" style="${isFirst ? 'color:var(--gold); border-color:var(--gold); font-weight:bold;' : 'color:#cbd5e1; border-color:#475569;'}">${rankLabels[idx]}: +${amt}g</span>`;
      }).join('');
    } else {
      const winGold = placementRewards[0] ?? 15;
      const lossGold = placementRewards[1] ?? 10;
      rewardBadgesHtml = `
        <span class="badge badge-type" style="color:var(--gold); border-color:var(--gold); font-weight:bold;">+${winGold}g Win</span>
        ${playerTeams.length > 1 ? `<span class="badge badge-type" style="color:#94a3b8; border-color:#64748b;">+${lossGold}g Loss</span>` : ''}
      `;
    }
    if (rules.hasMonsters) {
      rewardBadgesHtml += `<span class="badge badge-type" style="color:#fda4af; border-color:rgba(244,63,94,0.4);">👹 Monster: +${monsterReward}g</span>`;
    }

    const commonBadgesHtml = `
      ${modeBadgeHtml}
      ${rewardBadgesHtml}
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
                    const showAbs = rules.battleMode === 'pvm' || rules.monstersAreNpc || teamKey === 'monster';
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

    // Build Smart Hybrid Resolution Section
    let resolutionHtml = '';
    if (!rules.isRankedPayout) {
      // One-Tap Winner Buttons for each active team
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
      // Ranked Placement Selector per Player Team + Complete button
      const rankOptionLabels = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place', '5th Place', '6th Place'];
      const teamSelectorsHtml = playerTeams.map((teamKey, tIdx) => {
        const meta = typeof getBattleTeamMeta === 'function'
          ? getBattleTeamMeta(teamKey)
          : { label: teamKey, icon: '⚔️', color: '#38bdf8' };
        const optionsHtml = playerTeams.map((_, pIdx) => {
          const goldAmt = placementRewards[pIdx] ?? 0;
          return `<option value="${pIdx}" ${pIdx === tIdx ? 'selected' : ''}>${rankOptionLabels[pIdx]} (+${goldAmt}g)</option>`;
        }).join('');

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 8px; background:rgba(24,24,27,0.75); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
            <span style="font-size:12px; font-weight:700; color:${meta.color};">${meta.icon} ${meta.label}</span>
            <select id="qm-rank-select-${q.id}-${teamKey}" class="form-control" style="width:auto; min-width:145px; padding:4px 8px; font-size:12px; height:30px;">
              ${optionsHtml}
            </select>
          </div>
        `;
      }).join('');

      resolutionHtml = `
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(251,191,36,0.3); border-radius:8px; padding:10px; margin-top:4px; margin-bottom:10px;">
          <div style="font-size:11px; font-weight:700; color:var(--gold); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">
            🏆 Assign Team Placements
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
            ${teamSelectorsHtml}
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

    // Build Inline Edit Team Checklist Rows
    const editPlayerCount = playerTeams.length;
    const editTeamRowsHtml = QM_TEAM_KEYS.map((tk, idx) => {
      const meta = typeof getBattleTeamMeta === 'function' ? getBattleTeamMeta(tk) : { label: tk, icon: '⚔️', color: '#ffffff' };
      const isChecked = playerTeams.includes(tk);
      const isPlacementActive = idx < editPlayerCount;
      const rewardVal = placementRewards[idx] ?? (idx === 0 ? 15 : 10);

      return `
        <div id="qm-edit-team-row-${tk}-${q.id}" class="battle-team-config-row ${(!isChecked && !isPlacementActive) ? 'is-disabled' : ''}">
          <label class="battle-team-check-label">
            <input type="checkbox" id="qm-edit-team-check-${tk}-${q.id}" ${isChecked ? 'checked' : ''} onchange="handleQMTeamCheckChange('${q.id}')">
            <span style="color:${meta.color};">${meta.icon} ${meta.label}</span>
          </label>
          <span class="battle-placement-tag" id="qm-edit-placement-label-${idx}-${q.id}" style="opacity:${isPlacementActive ? '1' : '0.35'};">${QM_PLACEMENT_NAMES[idx]}</span>
          <div class="battle-reward-input-wrap">
            <input type="number" id="qm-edit-placement-reward-${idx}-${q.id}" value="${rewardVal}" min="0" ${isPlacementActive ? '' : 'disabled'} style="opacity:${isPlacementActive ? '1' : '0.4'};">
            <span>g</span>
          </div>
        </div>
      `;
    }).join('');

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

            <!-- Inline Battle Mode Slider -->
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <span>Battle Mode</span>
                <span id="qm-edit-battle-mode-hint-${q.id}" style="font-size:11px; color:var(--text-muted); font-weight:500;">
                  ${rules.battleMode === 'pvm' ? 'Monsters are NPCs (0 Gear Wear)' : 'Player Teams Only'}
                </span>
              </label>
              <input type="hidden" id="qm-edit-battle-mode-${q.id}" value="${rules.battleMode}">
              <div class="battle-mode-slider">
                <button type="button" id="qm-edit-mode-btn-pvp-${q.id}" class="battle-mode-btn ${rules.battleMode === 'pvp' ? 'active-pvp' : ''}" onclick="setQMBattleMode('pvp', '${q.id}')">
                  ⚔️ PvP (Player vs Player)
                </button>
                <button type="button" id="qm-edit-mode-btn-pvm-${q.id}" class="battle-mode-btn ${rules.battleMode === 'pvm' ? 'active-pvm' : ''}" onclick="setQMBattleMode('pvm', '${q.id}')">
                  👹 PvM (Player vs Monster)
                </button>
              </div>
            </div>

            <!-- Inline Teams & Placement Rewards Checklist -->
            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <span>Active Teams &amp; Placement Rewards</span>
                <span style="font-size:11px; color:var(--text-muted);">Gold per placement</span>
              </label>
              <div class="battle-teams-config-list">
                <div id="qm-edit-team-row-monster-${q.id}" class="battle-team-config-row ${rules.hasMonsters ? '' : 'is-disabled'}" style="display:${rules.battleMode === 'pvm' ? 'grid' : 'none'};">
                  <label class="battle-team-check-label">
                    <input type="checkbox" id="qm-edit-team-check-monster-${q.id}" ${rules.hasMonsters ? 'checked' : ''} onchange="handleQMTeamCheckChange('${q.id}')">
                    <span style="color:#fda4af;">👹 Monsters (NPC Line)</span>
                  </label>
                  <span class="battle-placement-tag" style="color:#fda4af;">NPC Reward</span>
                  <div class="battle-reward-input-wrap">
                    <input type="number" id="qm-edit-team-reward-monster-${q.id}" value="${monsterReward}" min="0">
                    <span>g</span>
                  </div>
                </div>
                ${editTeamRowsHtml}
              </div>
            </div>

            <div class="form-group" style="margin-bottom:8px;">
              <label style="font-size:12px;">Public Description</label>
              <textarea id="qm-edit-battle-description-${q.id}" class="form-control" style="min-height:70px;">${escapeAttr(q.description || '')}</textarea>
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

// Helper to fetch and group queue fighters by team for resolution
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
        placementRewards: [15, 10, 10, 10, 10, 10],
        monsterReward: 10,
        allowedTypes: ['Trinket', 'Talisman', 'Artifact'],
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

// One-Tap Winner Resolution (supports both new `qmFinishBattle(queueId, questId, winningTeamKey)` and legacy 5-arg call)
async function qmFinishBattle(queueId, questId, winningTeamOrVictoryGold = 'red', legacyDefeatGold = null, legacyExplicitVictor = null) {
  const { questId: resolvedQuestId, questData, rules, activeTeams, teamUserIds } = await fetchBattleResolutionContext(queueId, questId);

  let winningTeam = 'red';
  if (typeof legacyExplicitVictor === 'string' && legacyExplicitVictor) {
    winningTeam = legacyExplicitVictor === 'monsters' ? 'monster' : (rules.playerTeams[0] || 'red');
  } else if (typeof winningTeamOrVictoryGold === 'string') {
    winningTeam = winningTeamOrVictoryGold;
  }

  // Normalize legacy 'heroes' / 'monsters' strings
  if (winningTeam === 'heroes') winningTeam = rules.playerTeams[0] || 'red';
  if (winningTeam === 'monsters') winningTeam = activeTeams.includes('monster') ? 'monster' : (rules.playerTeams[1] || 'blue');

  const winMeta = typeof getBattleTeamMeta === 'function'
    ? getBattleTeamMeta(winningTeam)
    : { label: winningTeam, icon: '⚔️' };

  const firstPlaceGold = rules.placementRewards?.[0] ?? Number(questData?.reward_gold) ?? 15;
  const otherPlaceGold = rules.placementRewards?.[1] ?? Number(questData?.reward_gold_defeat) ?? 10;
  const monsterGold = rules.monsterReward ?? otherPlaceGold;

  // Build Gold Payout Map per Team
  const payoutByTeam = {};
  activeTeams.forEach(tk => {
    if (tk === 'monster') {
      payoutByTeam[tk] = monsterGold;
    } else if (tk === winningTeam) {
      payoutByTeam[tk] = firstPlaceGold;
    } else {
      payoutByTeam[tk] = otherPlaceGold;
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
      ? (winningTeam === 'monster' ? 'VICTORY / NPC' : 'NPC REWARD')
      : (tk === winningTeam ? '🥇 1ST PLACE' : 'DEFEATED');
    return `• ${meta.icon} ${meta.label} (${count} players): +${gold}g each (${statusTag})`;
  }).join('\n');

  const confirmMsg = `Declare ${winMeta.icon} ${winMeta.label.toUpperCase()} the Victor?\n\n` +
    `${teamSummaryLines}\n\n` +
    `Combat Rules:\n` +
    `• Mode: ${rules.battleMode === 'pvm' ? '👹 PvM (Monsters take 0 gear wear)' : '⚔️ PvP (All teams take gear wear)'}\n` +
    `• Active Magic Items: ${rules.allowedTypes.length > 0 ? rules.allowedTypes.join(', ') : 'None'}\n` +
    `• Gear Durability Wear: ${wearAmount} per battle` +
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

// Ranked Multi-Team Placement Resolution (when 2nd..Nth place rewards differ)
async function qmFinishRankedBattle(queueId, questId) {
  const { questId: resolvedQuestId, questData, rules, activeTeams, teamUserIds } = await fetchBattleResolutionContext(queueId, questId);

  const playerTeams = rules.playerTeams || activeTeams.filter(tk => tk !== 'monster');
  const placementRewards = rules.placementRewards || [15, 10, 10, 10, 10, 10];
  const payoutByTeam = {};
  const placementIndexByTeam = {};

  let firstPlaceTeamKey = playerTeams[0] || 'red';
  let bestRankIdx = 99;

  playerTeams.forEach((tk, idx) => {
    const selectEl = document.getElementById(`qm-rank-select-${resolvedQuestId}-${tk}`);
    const rankIdx = selectEl ? parseInt(selectEl.value, 10) : idx;
    const safeRankIdx = Number.isFinite(rankIdx) && rankIdx >= 0 ? rankIdx : idx;
    placementIndexByTeam[tk] = safeRankIdx;
    payoutByTeam[tk] = placementRewards[safeRankIdx] ?? 0;

    if (safeRankIdx < bestRankIdx) {
      bestRankIdx = safeRankIdx;
      firstPlaceTeamKey = tk;
    }
  });

  if (activeTeams.includes('monster')) {
    payoutByTeam['monster'] = rules.monsterReward ?? 10;
  }

  const rankLabels = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place', '5th Place', '6th Place'];
  const teamSummaryLines = activeTeams.map(tk => {
    const meta = typeof getBattleTeamMeta === 'function' ? getBattleTeamMeta(tk) : { label: tk, icon: '⚔️' };
    const count = (teamUserIds[tk] || []).length;
    const gold = payoutByTeam[tk] ?? 0;
    const rankText = tk === 'monster'
      ? '👹 Monster Line'
      : (rankLabels[placementIndexByTeam[tk] ?? 0] || 'Participant');
    return `• ${meta.icon} ${meta.label} (${count} players): ${rankText} → +${gold}g each`;
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
    const isMonsterNpc = tk === 'monster' && (rules.battleMode === 'pvm' || rules.monstersAreNpc);
    const isWinningTeam = tk === winningTeamKey;

    uids.forEach(uid => {
      // 1. Gold payout
      if (goldAmt > 0) {
        goldPromises.push(awardFighterGold(uid, goldAmt));
      }
      // 2. Gear Durability Wear (skip for NPC Monsters)
      if (!isMonsterNpc && wearAmount > 0) {
        wearPromises.push(applyCombatDurabilityDamage(uid, rules.allowedTypes, wearAmount));
      }
      // 3. Defeat Penalty on losing player teams (never on NPC Monsters)
      if (!isMonsterNpc && !isWinningTeam && defeatPenalty !== 'none') {
        penaltyPromises.push(executeDefeatPenalty(uid, defeatPenalty));
      }
      // 4. Collect winning player IDs for RNG Loot
      if (!isMonsterNpc && isWinningTeam) {
        winningUserIds.push(uid);
      }
    });
  });

  // 5. RNG Loot Drops for winning players
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

  // 6. Mark queues completed and close battle quest
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

// Backward compatibility aliases
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
    alert(config.battle_mode === 'pvm'
      ? "Please select at least 1 Player Team along with the Monster Line."
      : "Please select at least 2 Player Teams for a PvP battle.");
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
