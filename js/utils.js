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

// Extract durability wear & participant rules from quest data or embedded metadata
function getQuestDurabilityRules(q) {
  let monstersAreNpc = q?.monsters_are_npc;
  let allowedItems = q?.allowed_items;
  let defeatGold = Number(q?.reward_gold_defeat) || 0;

  let durabilityWear = q?.durability_wear !== undefined ? Number(q.durability_wear) : 1;
  let defeatPenalty = q?.defeat_penalty || 'none';
  let maxActive = q?.max_active !== undefined ? Number(q.max_active) : 0;
  let maxCompletions = q?.max_completions !== undefined ? Number(q.max_completions) : 0;
  let verificationMethod = q?.verification_method || 'Quest Master';
  let allowMidJoin = q?.allow_mid_join;
  let rngLootDrops = q?.rng_loot_drops;
  let discipline = q?.discipline;

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
      if (!defeatGold && (parsed.reward_gold_defeat !== undefined || parsed.defeat_gold !== undefined)) {
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
    } catch (e) {
      console.warn("Failed to parse embedded quest rules", e);
    }
  }

  // Monsters are NPC rule: default to false (normal battles always reduce monster durability)
  const isMonsterNpc = Boolean(monstersAreNpc);

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
    monstersAreNpc: isMonsterNpc,
    allowedTypes: allowedTypes,
    defeatGold: defeatGold !== undefined && defeatGold !== null ? Number(defeatGold) : 0,
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
