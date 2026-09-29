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
  } else {
    activeBtn.classList.add('active');
  }
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
  document.getElementById('qm-subtab-create').classList.add('hidden');
  document.getElementById('qm-subtab-library').classList.add('hidden');
  document.getElementById('qm-subtab-queues').classList.add('hidden');

  document.getElementById('qm-subnav-create').classList.remove('active');
  document.getElementById('qm-subnav-library').classList.remove('active');
  document.getElementById('qm-subnav-queues').classList.remove('active');

  if (subTabName === 'create') {
    document.getElementById('qm-subtab-create').classList.remove('hidden');
    document.getElementById('qm-subnav-create').classList.add('active');
  } else if (subTabName === 'library') {
    document.getElementById('qm-subtab-library').classList.remove('hidden');
    document.getElementById('qm-subnav-library').classList.add('active');
    fetchQMQuests();
  } else if (subTabName === 'queues') {
    document.getElementById('qm-subtab-queues').classList.remove('hidden');
    document.getElementById('qm-subnav-queues').classList.add('active');
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

// Linear 1:1 Item Value & Durability Calculator (Static baseline pricing across parks)
function calculateItemValue(basePrice, currentDurability, maxDurability) {
  const price = Math.max(1, Number(basePrice || 1));
  if (!maxDurability || maxDurability <= 0) return price;
  const ratio = Math.max(0, currentDurability) / maxDurability;
  return Math.max(1, Math.round(price * ratio));
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

// Load or initialize a player's relational park profile sheet
async function loadUserParkProfile(userId, park, kingdom = null) {
  if (!userId || !park) return null;
  const targetKingdom = kingdom || getKingdomForPark(park);

  try {
    const { data, error } = await supabaseClient
      .from('user_park_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('park', park)
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    // Insert new park profile sheet if none exists yet
    const { data: newRow, error: insertErr } = await supabaseClient
      .from('user_park_profiles')
      .upsert({
        user_id: userId,
        park: park,
        kingdom: targetKingdom,
        role: 'player',
        gold: 0
      }, { onConflict: 'user_id, park' })
      .select('*')
      .single();

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
    role: 'player',
    gold: 0
  };
}

// UI helper to sync role badge and Questmaster panel visibility with the active park's sheet
function syncUserRoleUI(role) {
  const roleBadgeEl = document.getElementById('role-badge');
  const navAdminEl = document.getElementById('nav-admin');

  const isQM = role === 'questmaster' || role === 'admin' || currentProfile?.role === 'admin';

  if (roleBadgeEl) {
    roleBadgeEl.innerText = (role || 'player').toUpperCase();
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

// Isolated Park Currency (Gold) Management
function getParkGold(profile, park) {
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  if (currentParkProfile && currentParkProfile.park === targetPark) {
    return Number(currentParkProfile.gold) || 0;
  }
  let parkGoldMap = profile?.park_gold;
  if (typeof parkGoldMap === 'string') {
    try { parkGoldMap = JSON.parse(parkGoldMap); } catch (e) { parkGoldMap = {}; }
  }
  if (parkGoldMap && typeof parkGoldMap === 'object' && parkGoldMap[targetPark] !== undefined) {
    return Number(parkGoldMap[targetPark]) || 0;
  }
  return 0;
}

async function updateParkGold(amountOrNewTotal, isDelta = false, park = null) {
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const targetKingdom = getKingdomForPark(targetPark);

  const currentAmt = (currentParkProfile && currentParkProfile.park === targetPark)
    ? Number(currentParkProfile.gold) || 0
    : getParkGold(currentProfile, targetPark);

  const nextGold = isDelta ? Math.max(0, currentAmt + amountOrNewTotal) : Math.max(0, amountOrNewTotal);

  if (!currentParkProfile) {
    currentParkProfile = { user_id: currentUser?.id, park: targetPark, kingdom: targetKingdom, role: 'player', gold: nextGold };
  } else if (currentParkProfile.park === targetPark) {
    currentParkProfile.gold = nextGold;
  }

  if (!currentProfile) currentProfile = {};
  currentProfile.gold = nextGold;

  const goldEl = document.getElementById('profile-gold');
  const activeParkNow = typeof getActivePark === 'function' ? getActivePark() : currentPark;
  if (goldEl && targetPark === activeParkNow) {
    goldEl.innerText = nextGold;
  }

  if (currentUser) {
    try {
      // 1. Relational update on user_park_profiles
      await supabaseClient
        .from('user_park_profiles')
        .upsert({
          user_id: currentUser.id,
          park: targetPark,
          kingdom: targetKingdom,
          gold: nextGold
        }, { onConflict: 'user_id, park' });

      // 2. Backup update on profiles table
      let parkGoldMap = currentProfile.park_gold;
      if (typeof parkGoldMap === 'string') {
        try { parkGoldMap = JSON.parse(parkGoldMap); } catch (e) { parkGoldMap = {}; }
      }
      if (!parkGoldMap || typeof parkGoldMap !== 'object') parkGoldMap = {};
      parkGoldMap[targetPark] = nextGold;
      currentProfile.park_gold = parkGoldMap;

      await supabaseClient
        .from('profiles')
        .update({
          park_gold: parkGoldMap,
          gold: nextGold
        })
        .eq('id', currentUser.id);
    } catch (e) {
      console.warn('Could not persist park gold:', e);
    }
  }

  return nextGold;
}
