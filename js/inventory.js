// ==============================================================================
// Quest-Forge: Inventory, Merchant Store, Durability, & Group Management
// ==============================================================================

// Helper accessors for active Amtgard group scoping
function getActivePark() {
  return currentProfile?.park || currentPark || "Delver's Rest";
}

function getActiveKingdom() {
  return getKingdomForPark(getActivePark());
}

function getActiveQMId() {
  return currentQMId || null;
}

function getActiveQMUsername() {
  return currentQMUsername || "Default Realm";
}

// ==============================================================================
// 1. Group Selector (Kingdom Filter -> Park Filter -> QM Reign Selection)
// ==============================================================================

async function initProfileGroupSelector() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  if (!kingdomSelect || !parkSelect) return;

  const activePark = getActivePark();
  const activeKingdom = getActiveKingdom();

  // Populate Kingdom options strictly from AMTGARD_KINGDOMS_AND_PARKS
  const kingdoms = Object.keys(AMTGARD_KINGDOMS_AND_PARKS);
  kingdomSelect.innerHTML = kingdoms.map(k => `<option value="${k}">${k}</option>`).join('');

  if (kingdoms.includes(activeKingdom)) {
    kingdomSelect.value = activeKingdom;
  } else {
    kingdomSelect.value = kingdoms[0] || 'The Freeholds of Amtgard';
  }

  // Populate park options strictly for the selected kingdom
  await populateParkOptions(kingdomSelect.value, activePark);
  updateGroupBannerDisplays();
}

function updateGroupBannerDisplays() {
  const activePark = getActivePark();
  const activeKingdom = getActiveKingdom();
  const activeQM = getActiveQMUsername();

  const kDisplay = document.getElementById('display-profile-kingdom');
  const pDisplay = document.getElementById('display-profile-park');
  const qmDisplay = document.getElementById('display-profile-qm');
  const qmParkDisplay = document.getElementById('display-qm-park');
  const qmHostDisplay = document.getElementById('display-qm-host');

  if (kDisplay) kDisplay.innerText = activeKingdom;
  if (pDisplay) pDisplay.innerText = activePark;
  if (qmDisplay) qmDisplay.innerText = `👑 ${activeQM}`;
  if (qmParkDisplay) qmParkDisplay.innerText = activePark;
  if (qmHostDisplay) qmHostDisplay.innerText = `👑 ${activeQM}`;
}

async function populateParkOptions(filterKingdom, parkToSelect = null) {
  const parkSelect = document.getElementById('profile-park-select');
  if (!parkSelect) return;

  // Strictly get the parks for the selected kingdom
  const parks = AMTGARD_KINGDOMS_AND_PARKS[filterKingdom] || [];
  parkSelect.innerHTML = parks.map(p => `<option value="${p}">${p}</option>`).join('');

  const targetPark = parkToSelect !== null ? parkToSelect : getActivePark();
  if (parks.includes(targetPark)) {
    parkSelect.value = targetPark;
  } else if (parks.length > 0) {
    parkSelect.value = parks[0];
  }

  await populateQMOptions(parkSelect.value, currentQMId);
}

async function populateQMOptions(parkName, qmToSelect = null) {
  const qmSelect = document.getElementById('profile-qm-select');
  if (!qmSelect) return;

  qmSelect.innerHTML = `<option value="">Loading Questmasters...</option>`;

  try {
    const { data: qms, error } = await supabaseClient
      .from('park_questmasters')
      .select('*')
      .eq('park', parkName)
      .order('created_at', { ascending: true });

    parkQMsList = qms || [];

    if (!qms || qms.length === 0) {
      qmSelect.innerHTML = `
        <option value="" data-username="Default Realm">👑 Default Realm (No active QM)</option>
      `;
      currentQMId = null;
      currentQMUsername = "Default Realm";
      return;
    }

    qmSelect.innerHTML = qms.map(qm => `
      <option value="${qm.user_id}" data-username="${qm.username}" ${qm.user_id === qmToSelect ? 'selected' : ''}>
        👑 ${qm.username}
      </option>
    `).join('');

    const targetQM = qmToSelect ? qms.find(q => q.user_id === qmToSelect) : qms[0];
    if (targetQM) {
      qmSelect.value = targetQM.user_id;
      currentQMId = targetQM.user_id;
      currentQMUsername = targetQM.username;
    } else {
      qmSelect.value = qms[0].user_id;
      currentQMId = qms[0].user_id;
      currentQMUsername = qms[0].username;
    }
  } catch (err) {
    console.warn("Could not load park QMs:", err);
    qmSelect.innerHTML = `<option value="" data-username="Default Realm">👑 Default Realm</option>`;
    currentQMId = null;
    currentQMUsername = "Default Realm";
  }
}

// Kingdom dropdown filter change
async function handleKingdomFilterChange() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!kingdomSelect) return;
  await populateParkOptions(kingdomSelect.value);
}

// Park dropdown filter change
async function handleParkFilterChange() {
  const parkSelect = document.getElementById('profile-park-select');
  if (!parkSelect) return;
  await populateQMOptions(parkSelect.value);
}

// Player clicks "Become QM Here"
async function handleBecomeQM() {
  const parkSelect = document.getElementById('profile-park-select');
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }

  const park = parkSelect ? parkSelect.value : getActivePark();
  const kingdom = kingdomSelect ? kingdomSelect.value : getActiveKingdom();
  const username = currentProfile?.username || currentUser.email?.split('@')[0] || 'Questmaster';

  const confirmed = confirm(`Do you want to become a registered Questmaster for "${park}" in "${kingdom}"?\n\nThis will allow players to enter your QM realm, and unlocks your QM Panel!`);
  if (!confirmed) return;

  const btn = document.getElementById('btn-become-qm');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registering...";
  }

  try {
    const { data, error } = await supabaseClient
      .from('park_questmasters')
      .upsert({
        user_id: currentUser.id,
        username: username,
        kingdom: kingdom,
        park: park
      }, { onConflict: 'user_id, park' })
      .select('*')
      .maybeSingle();

    if (error) {
      alert("Error registering as Questmaster: " + error.message);
      return;
    }

    alert(`👑 Congratulations! You are now a registered Questmaster for ${park}.\n\nYour realm is active and your QM Panel is unlocked!`);

    await populateQMOptions(park, currentUser.id);
    await saveActivePark(park, kingdom, currentUser.id, username);

    // Auto-collapse accordion
    const body = document.getElementById('park-selector-accordion-body');
    const chevron = document.getElementById('park-selector-chevron');
    if (body) body.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  } catch (err) {
    console.error("Error in handleBecomeQM:", err);
    alert("Could not register as QM: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "👑 Become QM Here";
    }
  }
}

// User commits to Kingdom / Park / QM by clicking "Enter Realm"
async function handleCommitParkChange() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  const qmSelect = document.getElementById('profile-qm-select');

  if (!parkSelect) return;

  const selectedKingdom = kingdomSelect ? kingdomSelect.value : getActiveKingdom();
  const selectedPark = parkSelect.value;
  const selectedQMId = qmSelect ? qmSelect.value : null;
  const selectedQMOption = qmSelect ? qmSelect.options[qmSelect.selectedIndex] : null;
  const selectedQMUsername = selectedQMOption?.dataset?.username || (selectedQMOption?.text?.replace('👑 ', '') || 'Default Realm');

  const btn = document.getElementById('btn-change-park');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Entering...";
  }

  try {
    await saveActivePark(selectedPark, selectedKingdom, selectedQMId, selectedQMUsername);

    // Auto-collapse accordion
    const body = document.getElementById('park-selector-accordion-body');
    const chevron = document.getElementById('park-selector-chevron');
    if (body) body.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Enter Realm";
    }
  }
}

async function saveActivePark(newPark, kingdom = null, qmId = null, qmUsername = null) {
  if (!newPark) return;

  const derivedKingdom = kingdom || getKingdomForPark(newPark);
  const targetQMId = qmId || currentQMId || null;
  const targetQMUsername = qmUsername || currentQMUsername || 'Default Realm';

  // 1. Update reactive local state
  currentPark = newPark;
  currentKingdom = derivedKingdom;
  currentQMId = targetQMId;
  currentQMUsername = targetQMUsername;

  // 2. Load or initialize the relational park/QM profile sheet
  currentParkProfile = await loadUserParkProfile(currentUser?.id, newPark, derivedKingdom, targetQMId);

  if (!currentProfile) currentProfile = {};
  currentProfile.park = newPark;
  currentProfile.kingdom = derivedKingdom;
  currentProfile.last_active_qm_id = targetQMId;
  currentProfile.last_active_qm_username = targetQMUsername;

  // 3. Sync isolated gold display for newly active QM reign
  const newParkGold = Number(currentParkProfile?.gold) || 0;
  currentProfile.gold = newParkGold;
  if (typeof syncGoldDisplays === 'function') {
    syncGoldDisplays(newParkGold);
  } else if (goldEl) {
    goldEl.innerText = newParkGold;
  }

  // 4. Synchronize role UI (badge & Questmaster panel access)
  const isHost = Boolean(currentUser && targetQMId && currentUser.id === targetQMId);
  const activeRole = isHost ? 'questmaster' : (currentParkProfile?.role || 'player');
  syncUserRoleUI(activeRole);

  // 5. Update top banner display
  updateGroupBannerDisplays();

  // 6. Persist last active location & QM to Supabase profiles
  if (currentUser) {
    try {
      await supabaseClient
        .from('profiles')
        .update({ 
          park: newPark, 
          kingdom: derivedKingdom,
          last_active_park: newPark,
          last_active_kingdom: derivedKingdom,
          last_active_qm_id: targetQMId,
          last_active_qm_username: targetQMUsername
        })
        .eq('id', currentUser.id);
    } catch (e) {
      console.warn('Profile update error:', e);
    }
  }

  // 7. Fetch isolated inventory, quests, and battle queues for the newly active QM realm
  await fetchUserInventory();
  if (typeof fetchUserSlotState === 'function') await fetchUserSlotState();
  if (typeof fetchQuests === 'function') await fetchQuests();
  if (typeof fetchMonsterEncounters === 'function') await fetchMonsterEncounters();
  if (typeof fetchQMQuests === 'function') await fetchQMQuests();
  if (typeof fetchQMQueues === 'function') await fetchQMQueues();
}

// Backwards-compatible aliases
function handleParkSelectChange() {}
function handleKingdomSelectChange() { handleKingdomFilterChange(); }
async function saveProfileGroup() { await handleCommitParkChange(); }

// ==============================================================================
// 2. Isolated Park Inventory Fetching & Display
// ==============================================================================

async function fetchUserInventory() {
  const profileList = document.getElementById('profile-inventory-list');
  const sellList = document.getElementById('store-sell-list');
  const countLabel = document.getElementById('profile-inventory-count');

  if (!currentUser) return;

  const activePark = getActivePark();
  const activeQMId = currentQMId;
  updateGroupBannerDisplays();

  // Strictly fetch inventory items belonging to the active park from the database
  const { data: allParkItems, error } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('park', activePark);

  if (error) {
    console.error("Error fetching inventory:", error);
    return;
  }

  const parkInventory = (allParkItems || []).filter(item => !item.qm_id || !activeQMId || item.qm_id === activeQMId);

  if (!parkInventory || parkInventory.length === 0) {
    if (profileList) {
      profileList.innerHTML = `<p class="empty-state">Your pouch is empty. Visit the Store to buy supplies!</p>`;
    }
    if (sellList) {
      sellList.innerHTML = `<p class="empty-state">No items available to sell.</p>`;
    }
    if (countLabel) countLabel.innerText = "(0 items)";
    return;
  }

  if (countLabel) {
    countLabel.innerText = `(${parkInventory.length} item${parkInventory.length === 1 ? '' : 's'})`;
  }

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);

  const calcFn = (typeof calculateItemValue === 'function')
    ? calculateItemValue
    : (bp, cur, mx) => (!mx || mx <= 0 ? 0 : Math.floor((bp || 0) * (Math.min(1, Math.max(0, cur) / mx))));

  // Profile Accordion: Item rows display item name and current durability
  if (profileList) {
    try {
      const cardsHtml = parkInventory.map(item => {
        const itemName = item?.item_name || 'Item';
        const cat = getCategoryForItemName(itemName);
        const fallbackMax = getCategoryDurabilityMax(cat) || 1;
        const durabilityMax = Math.max(1, Number(item?.durability_max || fallbackMax));
        const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
        const normalizedCurrent = Math.max(0, durabilityCurrent);
        const buyStorePrice = (typeof getItemStorePrice === 'function')
          ? getItemStorePrice(itemName, item?.base_cost)
          : Math.max(1, Number(item?.base_cost || 1));
        const currentValue = calcFn(buyStorePrice, normalizedCurrent, durabilityMax);

        return `<div class="item-card">
          <div class="item-info">
            <h4>${itemName}</h4>
            <small style="color:var(--gold);">Value: ${currentValue}g</small>
            <small style="color:var(--text-muted);">
              Durability: ${normalizedCurrent}/${durabilityMax}
            </small>
          </div>
        </div>`;
      }).join('');
      profileList.innerHTML = cardsHtml || `<p class="empty-state">Your pouch is empty. Visit the Store to buy supplies!</p>`;
    } catch (err) {
      console.error('Error rendering profile inventory list:', err);
      profileList.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error rendering pouch: ${err.message}</p>`;
    }
  }

  // Merchant Store "Sell Back" Sub-tab: Resale list isolated to active park
  if (sellList) {
    try {
      const sellCardsHtml = parkInventory.map(item => {
        const itemName = item?.item_name || 'Item';
        const cat = getCategoryForItemName(itemName);
        const fallbackMax = getCategoryDurabilityMax(cat) || 1;
        const durabilityMax = Math.max(1, Number(item?.durability_max || fallbackMax));
        const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
        const normalizedCurrent = Math.max(0, durabilityCurrent);
        const buyStorePrice = (typeof getItemStorePrice === 'function')
          ? getItemStorePrice(itemName, item?.base_cost)
          : Math.max(1, Number(item?.base_cost || 1));
        const sellGoldValue = calcFn(buyStorePrice, normalizedCurrent, durabilityMax);

        return `<div class="item-card">
          <div class="item-info">
            <h4>${itemName} <span style="font-size: 13px; color: var(--text-muted); font-weight: normal; margin-left: 6px;">(${normalizedCurrent}/${durabilityMax} dur)</span></h4>
          </div>
          <button class="btn-sell" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="sellItem('${item.id}', ${sellGoldValue}, '${itemName}')">
            ${isCombatLocked ? '🔒 In Battle' : `Sell (${sellGoldValue}g)`}
          </button>
        </div>`;
      }).join('');
      sellList.innerHTML = sellCardsHtml || `<p class="empty-state">No items available to sell.</p>`;
    } catch (err) {
      console.error('Error rendering store sell list:', err);
      sellList.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error rendering store sell list: ${err.message}</p>`;
    }
  }
}

// ==============================================================================
// 3. Store Catalog & Purchasing (Isolated by Park)
// ==============================================================================

function renderStoreCatalog() {
  const container = document.getElementById('store-catalog-list');
  if (!container) return;

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);
  const categories = ['Trinket', 'Talismans', 'Artifacts'];

  container.innerHTML = categories.map(category => {
    const items = STORE_CATALOG.filter(item => item.category === category);

    return `<details class="store-category">
      <summary class="store-category-summary">${category}</summary>
      <div class="item-grid store-category-items">
        ${items.map(item => `
          <div class="item-card">
            <div class="item-info">
              <h4>${item.item_name}</h4>
            </div>
            <button class="btn-buy" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="buyItem('${item.item_name}', ${item.base_cost}, ${item.duration_hours})">
              ${isCombatLocked ? '🔒 In Battle' : `Buy (${item.base_cost}g)`}
            </button>
          </div>
        `).join('')}
      </div>
    </details>`;
  }).join('');
}

async function buyItem(itemName, cost, durationHours) {
  if (activeBattleQuest || activeMonsterClaim) {
    alert("⚠️ Action Failed: Inventory is locked during active combat encounters!");
    return;
  }

  const activePark = getActivePark();
  const activeKingdom = getActiveKingdom();
  const currentParkGold = getParkGold(currentProfile, activePark);

  if (currentParkGold < cost) {
    alert("⚠️ Not enough gold to purchase this item!");
    return;
  }

  const category = getCategoryForItemName(itemName);
  if (!category || !INVENTORY_LIMITS[category]) {
    alert("⚠️ This item does not belong to a recognized category.");
    return;
  }

  const { data: parkInventory, error: inventoryError } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('park', activePark);

  if (inventoryError) {
    alert("⚠️ Could not load your current inventory: " + inventoryError.message);
    return;
  }

  // Pouch category capacity is strictly isolated to the active park's inventory
  const activeByCategory = (parkInventory || []).reduce((acc, row) => {
    let itemCategory = getCategoryForItemName(row.item_name);
    if (itemCategory === 'Talisman') itemCategory = 'Talismans';
    if (itemCategory === 'Artifact' || itemCategory === 'Legendary') itemCategory = 'Artifacts';
    if (itemCategory === 'Trinkets') itemCategory = 'Trinket';
    if (itemCategory) {
      acc[itemCategory] = (acc[itemCategory] || 0) + 1;
    }
    return acc;
  }, {});

  let normalizedCategory = category;
  if (normalizedCategory === 'Talisman') normalizedCategory = 'Talismans';
  if (normalizedCategory === 'Artifact' || normalizedCategory === 'Legendary') normalizedCategory = 'Artifacts';
  if (normalizedCategory === 'Trinkets') normalizedCategory = 'Trinket';

  const currentCategoryCount = activeByCategory[normalizedCategory] || 0;
  const categoryLimit = INVENTORY_LIMITS[normalizedCategory] || INVENTORY_LIMITS[category] || 1;

  if (currentCategoryCount >= categoryLimit) {
    alert(`⚠️ Your ${normalizedCategory} pouch is full. You can carry ${categoryLimit} ${normalizedCategory} at most.`);
    return;
  }

  const durabilityMax = getCategoryDurabilityMax(category);

  const inventoryPayload = {
    user_id: currentUser.id,
    item_name: itemName,
    base_cost: cost,
    quantity: 1,
    durability_current: durabilityMax,
    durability_max: durabilityMax,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: currentQMId || null
  };

  let { error } = await supabaseClient.from('user_inventory').insert(inventoryPayload);
  if (error && error.message.includes('qm_id')) {
    delete inventoryPayload.qm_id;
    let retry = await supabaseClient.from('user_inventory').insert(inventoryPayload);
    error = retry.error;
  }

  if (error) { alert("Error buying item: " + error.message); return; }

  // Deduct Gold from isolated park wallet
  await updateParkGold(cost * -1, true, activePark, currentQMId);

  alert(`🛒 Purchased ${itemName} for ${cost} Gold!`);
  await fetchUserInventory();
}

async function sellItem(itemId, goldValue, itemName) {
  if (activeBattleQuest || activeMonsterClaim) {
    alert("⚠️ Action Failed: Inventory is locked during active combat encounters!");
    return;
  }

  const { data: deletedRows, error } = await supabaseClient
    .from('user_inventory')
    .delete()
    .select('id')
    .eq('id', itemId)
    .eq('user_id', currentUser.id);

  if (error) {
    alert("⚠️ Could not sell item: " + error.message);
    return;
  }

  if (!deletedRows || deletedRows.length === 0) {
    alert("⚠️ This item could not be found in your pouch.");
    await fetchUserInventory();
    return;
  }

  const activePark = getActivePark();
  // Credit gold to isolated park wallet
  await updateParkGold(goldValue, true, activePark);

  alert(`🪙 Sold ${itemName} for ${goldValue} Gold!`);
  await fetchUserInventory();
}

// ==============================================================================
// 4. Durability Combat Damage Scoping
// ==============================================================================

async function applyCombatDurabilityDamage(userId, allowedCategories = null) {
  if (!userId) return;
  const activePark = getActivePark();

  // If allowedCategories is explicitly an empty list, no items consume durability
  if (Array.isArray(allowedCategories) && allowedCategories.length === 0) {
    return;
  }

  // Normalize allowedCategories into lowercased strings
  let allowedSet = null;
  if (Array.isArray(allowedCategories)) {
    allowedSet = new Set(
      allowedCategories.flatMap(cat => {
        const c = String(cat).toLowerCase().trim();
        return [c, c.endsWith('s') ? c.slice(0, -1) : c + 's'];
      })
    );
  }

  // 1. Attempt server-side atomic RPC ONLY if ALL magic items are allowed (no restrictions)
  const isUnrestricted = !allowedSet || (allowedSet.has('trinket') && allowedSet.has('talisman') && allowedSet.has('artifact'));
  if (isUnrestricted) {
    try {
      const { error: rpcError } = await supabaseClient.rpc('apply_combat_durability_damage', {
        target_user_id: userId,
        target_park: activePark
      });

      if (!rpcError) {
        if (currentUser && userId === currentUser.id) {
          await fetchUserInventory();
        }
        return;
      }
    } catch (err) {
      // Fall back to client-side batch processing
    }
  }

  // 2. Client-side processing: isolate durability damage to the active park's items and filter by allowed categories
  const { data: rows, error } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Unable to read inventory durability rows:', error);
    return;
  }

  const parkRows = (rows || []).filter(row => !row.park || row.park === activePark);

  const rowsToDelete = [];
  const rowsToUpdate = [];

  for (const row of parkRows) {
    const rawCategory = getCategoryForItemName(row.item_name);
    const category = (rawCategory || '').toLowerCase().trim();

    // Check if item's category is restricted
    if (allowedSet) {
      const isAllowed = allowedSet.has(category) || 
                        allowedSet.has(category + 's') || 
                        (category.endsWith('s') && allowedSet.has(category.slice(0, -1)));
      if (!isAllowed) {
        // Skip restricted magic items - do not consume durability
        continue;
      }
    }

    const defaultMax = getCategoryDurabilityMax(rawCategory);
    const durabilityMax = Number(row.durability_max ?? defaultMax ?? 1);
    const durabilityCurrent = Number(row.durability_current ?? durabilityMax);

    if (durabilityCurrent <= 1) {
      rowsToDelete.push(row.id);
    } else {
      const nextDurability = durabilityCurrent - 1;
      rowsToUpdate.push({
        id: row.id,
        row: row,
        durability_current: nextDurability,
        durability_max: durabilityMax
      });
    }
  }

  // Batch delete depleted items
  const deletePromise = rowsToDelete.length > 0
    ? supabaseClient.from('user_inventory').delete().in('id', rowsToDelete)
    : Promise.resolve();

  // Concurrent direct updates with fallback replacement
  const updatePromises = rowsToUpdate.map(async (itemPatch) => {
    const { data: updatedRows, error: updErr } = await supabaseClient
      .from('user_inventory')
      .update({
        durability_current: itemPatch.durability_current,
        durability_max: itemPatch.durability_max
      })
      .eq('id', itemPatch.id)
      .select();

    if (updErr || !updatedRows || updatedRows.length === 0) {
      await supabaseClient
        .from('user_inventory')
        .delete()
        .eq('id', itemPatch.id);

      const { error: insErr } = await supabaseClient
        .from('user_inventory')
        .insert({
          user_id: itemPatch.row.user_id,
          item_name: itemPatch.row.item_name,
          base_cost: itemPatch.row.base_cost,
          quantity: itemPatch.row.quantity || 1,
          durability_current: itemPatch.durability_current,
          durability_max: itemPatch.durability_max,
          park: itemPatch.row.park || activePark,
          kingdom: itemPatch.row.kingdom || getActiveKingdom()
        });

      if (insErr) console.error('Durability replace fallback insert failed:', insErr);
    }
  });

  await Promise.allSettled([deletePromise, ...updatePromises]);

  if (currentUser && userId === currentUser.id) {
    await fetchUserInventory();
  }
}
