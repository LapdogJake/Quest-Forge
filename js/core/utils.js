// ==============================================================================
// Quest-Forge: Core Navigation & Utility Functions
// ==============================================================================


// Main Navigation Tab Switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'active-monster', 'active-adventure', 'active-quest', 'active-battle'));

  const isBattleTab = tabName === 'battles' || tabName === 'battle' || tabName === 'heroes' || tabName === 'monsters';
  const isQuestTab = tabName === 'adventure' || tabName === 'quest' || tabName === 'quests';

  const targetTab = isBattleTab 
    ? document.getElementById('tab-battles')
    : (isQuestTab ? document.getElementById('tab-adventure') : document.getElementById(`tab-${tabName}`));

  if (targetTab) targetTab.classList.remove('hidden');

  const activeBtn = isBattleTab
    ? document.getElementById('nav-battles')
    : (isQuestTab ? document.getElementById('nav-adventure') : document.getElementById(`nav-${tabName}`));

  if (!activeBtn) return;

  if (isBattleTab) {
    activeBtn.classList.add('active');
    if (typeof fetchQuests === 'function') fetchQuests();
    if (typeof fetchMonsterEncounters === 'function') fetchMonsterEncounters();
  } else if (isQuestTab) {
    activeBtn.classList.add('active');
    activeBtn.classList.add('active-quest');
    if (typeof fetchQuests === 'function') fetchQuests();
  } else if (tabName === 'profile') {
    activeBtn.classList.add('active');
    if (typeof fetchUserSlotState === 'function') fetchUserSlotState();
    if (typeof fetchUserInventory === 'function') fetchUserInventory();
  } else if (tabName === 'admin') {
    activeBtn.classList.add('active');
    if (typeof fetchQMQuests === 'function') fetchQMQuests();
    if (typeof fetchQMQueues === 'function') fetchQMQueues();
  } else if (tabName === 'items' || tabName === 'store') {
    activeBtn.classList.add('active');
    const gold = currentParkProfile?.gold ?? currentProfile?.gold ?? 0;
    syncGoldDisplays(gold);
    if (typeof fetchUserInventory === 'function') fetchUserInventory();
  } else if (tabName === 'library') {
    activeBtn.classList.add('active');
    const isRulesActive = document.getElementById('library-subnav-rules')?.classList.contains('active');
    if (!isRulesActive) {
      if (typeof switchLibrarySubTab === 'function') switchLibrarySubTab('chronicles');
    }
    if (typeof renderChroniclesLibrary === 'function') renderChroniclesLibrary();
    if (typeof fetchChronicles === 'function') fetchChronicles();
    if (typeof renderRulesLibrary === 'function') renderRulesLibrary();
  } else {
    activeBtn.classList.add('active');
  }
}

// Synchronize all on-screen gold counter displays (Pouch/Items & Header)
function syncGoldDisplays(goldAmt) {
  const amt = Number(goldAmt) || 0;
  const itemsGold = document.getElementById('items-player-gold');
  if (itemsGold) itemsGold.innerText = amt;
  document.querySelectorAll('.player-gold-display').forEach(el => { el.innerText = amt; });
}

// Normalize park names to prevent mismatches caused by curly apostrophes, casing, or whitespace
function normalizeParkName(name) {
  if (!name) return '';
  return String(name).replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
}

// Lookup Battle Team metadata by team key
function getBattleTeamMeta(teamKey) {
  const norm = String(teamKey || '').toLowerCase().trim();
  if (norm === 'monster' || norm === 'monsters' || norm === 'standard monster') {
    return (typeof BATTLE_MONSTER_TEAM !== 'undefined') ? BATTLE_MONSTER_TEAM : {
      key: 'monster', label: 'Monsters', shortLabel: 'Monsters', icon: '👹', color: '#f43f5e', border: 'rgba(244, 63, 94, 0.5)', btnClass: 'btn-team-monster', boxClass: 'team-box-monster', defaultReward: 10
    };
  }
  const list = (typeof BATTLE_PLAYER_TEAMS !== 'undefined') ? BATTLE_PLAYER_TEAMS : [];
  if (norm === 'hero' || norm === 'heroes') {
    return list[0] || { key: 'red', label: 'Red Team', shortLabel: 'Red', icon: '🔴', color: '#ef4444', border: 'rgba(239, 68, 68, 0.45)', btnClass: 'btn-team-red', boxClass: 'team-box-red' };
  }
  return list.find(t => t.key === norm) || list[0] || {
    key: 'red', label: 'Red Team', shortLabel: 'Red', icon: '🔴', color: '#ef4444', border: 'rgba(239, 68, 68, 0.45)', btnClass: 'btn-team-red', boxClass: 'team-box-red'
  };
}

// Normalize a raw role_name / team string from DB into a valid team key for a given battle's activeTeams
function normalizeBattleMemberTeam(rawTeam, activeTeams = ['red', 'blue']) {
  const norm = String(rawTeam || '').toLowerCase().trim();
  if (norm === 'monster' || norm === 'monsters' || norm === 'standard monster') {
    if (activeTeams.includes('monster')) return 'monster';
    return activeTeams[1] || activeTeams[0] || 'blue';
  }
  if (norm === 'hero' || norm === 'heroes') {
    const firstPlayerTeam = activeTeams.find(t => t !== 'monster');
    return firstPlayerTeam || 'red';
  }
  if (activeTeams.includes(norm)) return norm;
  const firstPlayerTeam = activeTeams.find(t => t !== 'monster');
  return firstPlayerTeam || activeTeams[0] || 'red';
}

// Extract durability wear, multi-team setup, & participant rules from quest data or embedded metadata
function getQuestDurabilityRules(q) {
  let monstersAreNpc = q?.monsters_are_npc;
  let allowedItems = q?.allowed_items;
  let victoryGold = q?.reward_gold !== undefined ? Number(q.reward_gold) : 15;
  let defeatGold = q?.reward_gold_defeat !== undefined ? Number(q.reward_gold_defeat) : 10;

  let durabilityWear = q?.durability_wear !== undefined ? Number(q.durability_wear) : 1;
  let defeatPenalty = q?.defeat_penalty || 'none';
  let maxActive = q?.max_active !== undefined ? Number(q.max_active) : 0;
  let maxCompletions = q?.max_completions !== undefined ? Number(q.max_completions) : 0;
  let verificationMethod = q?.verification_method || 'Quest Master';
  let allowMidJoin = q?.allow_mid_join;
  let rngLootDrops = q?.rng_loot_drops;
  let discipline = q?.discipline;

  let battleMode = q?.battle_mode;
  let battleTeams = q?.battle_teams;
  let placementRewards = q?.placement_rewards;
  let monsterReward = q?.monster_reward;

  // Check fallback metadata embedded in scenario_card or description
  const textToCheck = `${q?.scenario_card || ''} ${q?.description || ''}`;
  const match = textToCheck.match(/<!--\s*RULES:\s*(\{.*?\})\s*-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (monstersAreNpc === undefined && parsed.monsters_are_npc !== undefined) {
        monstersAreNpc = parsed.monsters_are_npc;
      }
      if (!allowedItems && parsed.allowed_items !== undefined) {
        allowedItems = parsed.allowed_items;
      }
      if (parsed.reward_gold_defeat !== undefined || parsed.defeat_gold !== undefined) {
        defeatGold = Number(parsed.reward_gold_defeat !== undefined ? parsed.reward_gold_defeat : parsed.defeat_gold) || 0;
      }
      if (parsed.durability_wear !== undefined) {
        durabilityWear = Number(parsed.durability_wear);
      }
      if (parsed.defeat_penalty !== undefined) {
        defeatPenalty = String(parsed.defeat_penalty);
      }
      if (parsed.max_active !== undefined) {
        maxActive = Number(parsed.max_active);
      }
      if (parsed.max_completions !== undefined) {
        maxCompletions = Number(parsed.max_completions);
      }
      if (parsed.verification_method !== undefined || parsed.verification !== undefined) {
        verificationMethod = parsed.verification_method || parsed.verification;
      }
      if (allowMidJoin === undefined && parsed.allow_mid_join !== undefined) {
        allowMidJoin = Boolean(parsed.allow_mid_join);
      }
      if (rngLootDrops === undefined && (parsed.rng_loot_drops !== undefined || parsed.rng_loot !== undefined)) {
        rngLootDrops = Boolean(parsed.rng_loot_drops ?? parsed.rng_loot);
      }
      if (!discipline && parsed.discipline !== undefined) {
        discipline = parsed.discipline;
      }
      if (!battleMode && parsed.battle_mode !== undefined) {
        battleMode = parsed.battle_mode;
      }
      if ((!battleTeams || (Array.isArray(battleTeams) && battleTeams.length === 0)) && parsed.battle_teams !== undefined) {
        battleTeams = parsed.battle_teams;
      }
      if ((!placementRewards || (Array.isArray(placementRewards) && placementRewards.length === 0)) && parsed.placement_rewards !== undefined) {
        placementRewards = parsed.placement_rewards;
      }
      if (monsterReward === undefined && parsed.monster_reward !== undefined) {
        monsterReward = Number(parsed.monster_reward);
      }
    } catch (e) {
      console.warn("Failed to parse embedded quest rules", e);
    }
  }

  if (typeof battleTeams === 'string') {
    try { battleTeams = JSON.parse(battleTeams); } catch (_) { battleTeams = battleTeams.split(',').map(s => s.trim()).filter(Boolean); }
  }
  if (typeof placementRewards === 'string') {
    try { placementRewards = JSON.parse(placementRewards); } catch (_) { placementRewards = null; }
  }

  // Resolve battleMode ('pvp' vs 'pvm')
  const resolvedMode = (battleMode === 'pvm' || battleMode === 'pvp')
    ? battleMode
    : (Boolean(monstersAreNpc) ? 'pvm' : 'pvp');

  // Resolve active teams list
  let activeTeams = [];
  if (Array.isArray(battleTeams) && battleTeams.length > 0) {
    activeTeams = battleTeams.map(t => String(t).toLowerCase().trim()).filter(Boolean);
  } else {
    activeTeams = resolvedMode === 'pvm' ? ['monster', 'red'] : ['red', 'blue'];
  }

  // Ensure if PvM mode is active, 'monster' is included, and if PvP, 'monster' is excluded unless explicitly in activeTeams
  if (resolvedMode === 'pvm' && !activeTeams.includes('monster')) {
    activeTeams = ['monster', ...activeTeams];
  } else if (resolvedMode === 'pvp' && activeTeams.includes('monster')) {
    activeTeams = activeTeams.filter(t => t !== 'monster');
  }

  const playerTeams = activeTeams.filter(t => t !== 'monster');
  if (playerTeams.length === 0) {
    playerTeams.push('red');
    activeTeams.push('red');
  }

  const hasMonsters = activeTeams.includes('monster');
  const isMonsterNpc = hasMonsters || resolvedMode === 'pvm' || Boolean(monstersAreNpc);

  // Resolve 6-slot placement rewards array [1st, 2nd, 3rd, 4th, 5th, 6th]
  const defaultFirst = Number.isFinite(victoryGold) ? victoryGold : 15;
  const defaultOther = Number.isFinite(defeatGold) ? defeatGold : 10;
  let resolvedPlacements = [defaultFirst, defaultOther, defaultOther, defaultOther, defaultOther, defaultOther];
  if (Array.isArray(placementRewards) && placementRewards.length > 0) {
    for (let i = 0; i < 6; i++) {
      if (placementRewards[i] !== undefined && placementRewards[i] !== null && !isNaN(Number(placementRewards[i]))) {
        resolvedPlacements[i] = Math.max(0, Number(placementRewards[i]));
      }
    }
  }

  const resolvedMonsterReward = (monsterReward !== undefined && monsterReward !== null && !isNaN(Number(monsterReward)))
    ? Math.max(0, Number(monsterReward))
    : defaultOther;

  // Check if active player teams have distinct 2nd..Nth placement payouts (requiring ranked finish selection)
  const activePlacementSlices = resolvedPlacements.slice(0, Math.max(1, playerTeams.length));
  const nonFirstSlices = activePlacementSlices.slice(1);
  const isRankedPayout = playerTeams.length >= 2 && nonFirstSlices.some(val => val !== nonFirstSlices[0]);

  // Allowed magic items: defaults to all 3 categories (Trinket, Talisman, Artifact)
  let allowedTypes = ['Trinket', 'Talisman', 'Artifact'];
  if (allowedItems !== undefined && allowedItems !== null) {
    if (Array.isArray(allowedItems)) {
      allowedTypes = allowedItems;
    } else if (typeof allowedItems === 'string') {
      const trimmed = allowedItems.trim();
      allowedTypes = trimmed.length === 0 ? [] : trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    battleMode: hasMonsters ? 'pvm' : 'pvp',
    activeTeams,
    playerTeams,
    hasMonsters,
    monstersAreNpc: isMonsterNpc,
    placementRewards: resolvedPlacements,
    monsterReward: resolvedMonsterReward,
    isRankedPayout,
    allowedTypes: allowedTypes,
    victoryGold: resolvedPlacements[0],
    defeatGold: resolvedPlacements[1] ?? defaultOther,
    durabilityWear: Number.isFinite(durabilityWear) ? durabilityWear : 1,
    defeatPenalty: defeatPenalty || 'none',
    maxActive: Number.isFinite(maxActive) ? maxActive : 0,
    maxCompletions: Number.isFinite(maxCompletions) ? maxCompletions : 0,
    verificationMethod: verificationMethod || 'Quest Master',
    allowMidJoin: Boolean(allowMidJoin),
    rngLootDrops: Boolean(rngLootDrops),
    discipline: discipline || 'Service'
  };
}
