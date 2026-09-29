// ==============================================================================
// Quest-Forge: Helper & Utility Functions
// ==============================================================================

// Tab navigation
function switchTab(tabName) {
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'active-monster', 'active-adventure'));

  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (tabName === 'monsters') {
    activeBtn.classList.add('active-monster');
    fetchMonsterEncounters();
  } else if (tabName === 'adventure') {
    activeBtn.classList.add('active-adventure');
    fetchQuests();
  } else if (tabName === 'heroes') {
    activeBtn.classList.add('active');
    fetchQuests();
  } else if (tabName === 'profile') {
    activeBtn.classList.add('active');
    fetchUserSlotState();
    fetchUserInventory();
  } else if (tabName === 'admin') {
    activeBtn.classList.add('active');
    fetchQMQuests();
    fetchQMQueues();
  } else if (tabName === 'store') {
    activeBtn.classList.add('active');
    const gold = currentParkProfile?.gold ?? currentProfile?.gold ?? 0;
    syncGoldDisplays(gold);
    fetchUserInventory();
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

// Merchant Store sub-navigation
function switchStoreSubTab(subTab) {
  document.getElementById('store-subtab-buy').classList.add('hidden');
  document.getElementById('store-subtab-sell').classList.add('hidden');
  document.getElementById('store-subnav-buy').classList.remove('active');
  document.getElementById('store-subnav-sell').classList.remove('active');

  if (subTab === 'buy') {
    document.getElementById('store-subtab-buy').classList.remove('hidden');
    document.getElementById('store-subnav-buy').classList.add('active');
  } else {
    document.getElementById('store-subtab-sell').classList.remove('hidden');
    document.getElementById('store-subnav-sell').classList.add('active');
    fetchUserInventory();
  }
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

  if (normalized === 'library') {
    fetchQMQuests();
  } else if (normalized === 'queues') {
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
  const isHidden = accordionBody.classList.contains('hidden');

  if (isHidden) {
    accordionBody.classList.remove('hidden');
    chevron.innerText = "▲";
  } else {
    accordionBody.classList.add('hidden');
    chevron.innerText = "▼";
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
    allowedTypes: allowedTypes
  };
}

// Lookup Kingdom for a given Park (Kingdom is a sorting filter)
function getKingdomForPark(parkName) {
  if (!parkName) return 'The Freeholds of Amtgard';
  if (typeof AMTGARD_KINGDOMS_AND_PARKS === 'object') {
    for (const [kingdom, parks] of Object.entries(AMTGARD_KINGDOMS_AND_PARKS)) {
      if (Array.isArray(parks) && parks.includes(parkName)) {
        return kingdom;
      }
    }
  }
  return currentKingdom || 'The Freeholds of Amtgard';
}

// Load or initialize a player's relational park/QM profile sheet
async function loadUserParkProfile(userId, park, kingdom = null, qmId = null) {
  if (!userId || !park) return null;
  const targetKingdom = kingdom || getKingdomForPark(park);
  const targetQMId = qmId || currentQMId || null;

  try {
    let query = supabaseClient
      .from('user_park_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('park', park);

    if (targetQMId) {
      query = query.eq('qm_id', targetQMId);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      return data;
    }

    const isHostQM = targetQMId && userId === targetQMId;

    // Insert new park/QM profile sheet if none exists yet
    const insertPayload = {
      user_id: userId,
      park: park,
      kingdom: targetKingdom,
      qm_id: targetQMId,
      role: isHostQM ? 'questmaster' : 'player',
      gold: 0
    };

    const { data: newRow, error: insertErr } = await supabaseClient
      .from('user_park_profiles')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    if (!insertErr && newRow) {
      return newRow;
    }
  } catch (err) {
    console.warn('Could not read/insert user_park_profiles:', err);
  }

  // Graceful in-memory fallback
  return {
    user_id: userId,
    park: park,
    kingdom: targetKingdom,
    qm_id: targetQMId,
    role: (targetQMId && userId === targetQMId) ? 'questmaster' : 'player',
    gold: 0
  };
}

// UI helper to sync role badge and Questmaster panel visibility with the active park & QM reign
function syncUserRoleUI(role) {
  const roleBadgeEl = document.getElementById('role-badge');
  const navAdminEl = document.getElementById('nav-admin');

  const isCurrentQMHost = Boolean(currentUser && currentQMId && currentUser.id === currentQMId);
  const isQM = isCurrentQMHost || role === 'questmaster' || role === 'admin' || currentProfile?.role === 'admin';

  if (roleBadgeEl) {
    roleBadgeEl.innerText = isCurrentQMHost ? '👑 QUESTMASTER' : (role || 'player').toUpperCase();
    roleBadgeEl.style.display = 'inline-block';
  }

  if (navAdminEl) {
    navAdminEl.classList.toggle('hidden', !isQM);
  }

  if (isQM && typeof fetchQMQueues === 'function') {
    fetchQMQueues();
    fetchQMQuests();
  }
}

// Isolated Park & QM Currency (Gold) Management
function getParkGold(profile, park, qmId = null) {
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const targetQMId = qmId || currentQMId;
  
  if (currentParkProfile && currentParkProfile.park === targetPark && (!targetQMId || currentParkProfile.qm_id === targetQMId)) {
    return Number(currentParkProfile.gold) || 0;
  }
  return Number(currentParkProfile?.gold) || 0;
}

async function updateParkGold(amountOrNewTotal, isDelta = false, park = null, qmId = null) {
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const targetKingdom = getKingdomForPark(targetPark);
  const targetQMId = qmId || currentQMId || null;

  const currentAmt = (currentParkProfile && currentParkProfile.park === targetPark)
    ? Number(currentParkProfile.gold) || 0
    : getParkGold(currentProfile, targetPark, targetQMId);

  const nextGold = isDelta ? Math.max(0, currentAmt + amountOrNewTotal) : Math.max(0, amountOrNewTotal);

  if (!currentParkProfile) {
    currentParkProfile = { 
      user_id: currentUser?.id, 
      park: targetPark, 
      kingdom: targetKingdom, 
      qm_id: targetQMId,
      role: (targetQMId && currentUser?.id === targetQMId) ? 'questmaster' : 'player', 
      gold: nextGold 
    };
  } else if (currentParkProfile.park === targetPark) {
    currentParkProfile.gold = nextGold;
  }

  if (!currentProfile) currentProfile = {};
  currentProfile.gold = nextGold;

  const activeParkNow = typeof getActivePark === 'function' ? getActivePark() : currentPark;
  if (targetPark === activeParkNow) {
    syncGoldDisplays(nextGold);
  }

  if (currentUser) {
    try {
      // 1. Relational update on user_park_profiles for this specific QM reign
      await supabaseClient
        .from('user_park_profiles')
        .update({ gold: nextGold })
        .eq('user_id', currentUser.id)
        .eq('park', targetPark);
    } catch (e) {
      console.warn('Could not persist park gold:', e);
    }
  }

  return nextGold;
}
