// ==============================================================================
// Quest-Forge: Core Navigation & Utility Functions
// ==============================================================================

// Main Navigation Tab Switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'active-monster', 'active-adventure', 'active-quest'));

  const targetTab = document.getElementById(`tab-${tabName}`) || (tabName === 'quest' ? document.getElementById('tab-adventure') : null);
  if (targetTab) targetTab.classList.remove('hidden');

  const activeBtn = document.getElementById(`nav-${tabName}`) || (tabName === 'quest' ? document.getElementById('nav-adventure') : null);
  if (!activeBtn) return;

  if (tabName === 'monsters') {
    activeBtn.classList.add('active-monster');
    if (typeof fetchMonsterEncounters === 'function') fetchMonsterEncounters();
  } else if (tabName === 'adventure' || tabName === 'quest' || tabName === 'quests') {
    activeBtn.classList.add('active-quest');
    if (typeof fetchQuests === 'function') fetchQuests();
  } else if (tabName === 'heroes') {
    activeBtn.classList.add('active');
    if (typeof fetchQuests === 'function') fetchQuests();
  } else if (tabName === 'profile') {
    activeBtn.classList.add('active');
    if (typeof fetchUserSlotState === 'function') fetchUserSlotState();
    if (typeof fetchUserInventory === 'function') fetchUserInventory();
  } else if (tabName === 'admin') {
    activeBtn.classList.add('active');
    if (typeof fetchQMQuests === 'function') fetchQMQuests();
    if (typeof fetchQMQueues === 'function') fetchQMQueues();
  } else if (tabName === 'store') {
    activeBtn.classList.add('active');
    const gold = currentParkProfile?.gold ?? currentProfile?.gold ?? 0;
    syncGoldDisplays(gold);
    if (typeof fetchUserInventory === 'function') fetchUserInventory();
  } else {
    activeBtn.classList.add('active');
  }
}

// Synchronize all on-screen gold counter displays (Profile & Store)
function syncGoldDisplays(goldAmt) {
  const amt = Number(goldAmt) || 0;
  const profileGold = document.getElementById('profile-gold');
  if (profileGold) profileGold.innerText = amt;
  const storeGold = document.getElementById('store-player-gold');
  if (storeGold) storeGold.innerText = amt;
}

// Questmaster Panel sub-navigation
function switchQMSubTab(subTabName) {
  const tabs = ['battle', 'quest', 'library', 'queues'];
  tabs.forEach(tab => {
    const el = document.getElementById(`qm-subtab-${tab}`) || (tab === 'battle' ? document.getElementById('qm-subtab-create') : null);
    if (el) el.classList.add('hidden');
    const navBtn = document.getElementById(`qm-subnav-${tab}`) || (tab === 'battle' ? document.getElementById('qm-subnav-create') : null);
    if (navBtn) navBtn.classList.remove('active');
  });

  const normalized = (subTabName === 'create') ? 'battle' : subTabName;
  const targetTab = document.getElementById(`qm-subtab-${normalized}`) || (normalized === 'battle' ? document.getElementById('qm-subtab-create') : null);
  const targetNav = document.getElementById(`qm-subnav-${normalized}`) || (normalized === 'battle' ? document.getElementById('qm-subnav-create') : null);

  if (targetTab) targetTab.classList.remove('hidden');
  if (targetNav) targetNav.classList.add('active');

  if (normalized === 'library' && typeof fetchQMQuests === 'function') {
    fetchQMQuests();
  } else if (normalized === 'queues' && typeof fetchQMQueues === 'function') {
    fetchQMQueues();
  }
}

// Profile Park Selector Accordion Toggle
function toggleParkSelectorAccordion() {
  const accordionBody = document.getElementById('park-selector-accordion-body');
  const chevron = document.getElementById('park-selector-chevron');
  if (!accordionBody) return;
  const isHidden = accordionBody.classList.contains('hidden');

  if (isHidden) {
    accordionBody.classList.remove('hidden');
    if (chevron) chevron.innerText = "▲";
  } else {
    accordionBody.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  }
}

// Profile Accordion Toggle
function toggleProfileInventoryAccordion() {
  const accordionBody = document.getElementById('profile-inventory-accordion-body');
  const chevron = document.getElementById('profile-inventory-chevron');
  if (!accordionBody) return;
  const isHidden = accordionBody.classList.contains('hidden');

  if (isHidden) {
    accordionBody.classList.remove('hidden');
    if (chevron) chevron.innerText = "▲";
  } else {
    accordionBody.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  }
}

// Linear 1:1 Item Value & Durability Calculator (Based on buy-side store pricing)
// Formula: Floor(buyPrice * (currentDurability / maxDurability))
function calculateItemValue(basePrice, currentDurability, maxDurability) {
  const price = Math.max(0, Number(basePrice || 0));
  if (!maxDurability || maxDurability <= 0) return price;
  const ratio = Math.min(1, Math.max(0, currentDurability) / maxDurability);
  return Math.floor(price * ratio);
}

// Lookup official buy-side store catalog price for an item
function getItemStorePrice(itemName, fallbackCost = 1) {
  if (!itemName) return Math.max(1, Number(fallbackCost || 1));
  const normalized = itemName.replace(/’/g, "'").trim().toLowerCase();
  const match = STORE_CATALOG.find(item => item.item_name.replace(/’/g, "'").trim().toLowerCase() === normalized);
  return match?.base_cost !== undefined ? match.base_cost : Math.max(1, Number(fallbackCost || 1));
}

// Catalog category matchers
function getCategoryForItemName(itemName) {
  if (!itemName) return null;
  const normalized = itemName.replace(/’/g, "'").trim().toLowerCase();
  const match = STORE_CATALOG.find(item => item.item_name.replace(/’/g, "'").trim().toLowerCase() === normalized);
  return match?.category || null;
}

function getCategoryDurabilityMax(category) {
  if (!category) return 1;
  return DURABILITY_LIMITS[category] || 1;
}

// Extract durability wear & participant rules from quest data or embedded metadata
function getQuestDurabilityRules(q) {
  let monstersAreNpc = q?.monsters_are_npc;
  let allowedItems = q?.allowed_items;
  let defeatGold = Number(q?.reward_gold_defeat) || 0;

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
    defeatGold: defeatGold !== undefined && defeatGold !== null ? Number(defeatGold) : 0
  };
}
