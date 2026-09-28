// ==============================================================================
// Quest-Forge: Inventory, Merchant Store, Durability, & Group Management
// ==============================================================================

// Helper accessors for active Amtgard group scoping
function getActivePark() {
  return currentProfile?.park || currentPark || "Delver's Rest";
}

function getActiveKingdom() {
  return currentProfile?.kingdom || currentKingdom || 'The Freeholds of Amtgard';
}

// ==============================================================================
// 1. Group Selector (Kingdom & Park)
// ==============================================================================

function initProfileGroupSelector() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  if (!kingdomSelect || !parkSelect) return;

  const activeKingdom = getActiveKingdom();
  const activePark = getActivePark();

  // Populate Kingdom options
  const kingdoms = Object.keys(AMTGARD_KINGDOMS_AND_PARKS);
  let kingdomOptions = kingdoms.map(k => `<option value="${k}">${k}</option>`).join('');
  kingdomOptions += `<option value="__custom__">➕ Other / Custom Kingdom</option>`;
  kingdomSelect.innerHTML = kingdomOptions;

  // Set selected kingdom (or custom if not in standard list)
  if (kingdoms.includes(activeKingdom)) {
    kingdomSelect.value = activeKingdom;
  } else {
    kingdomSelect.value = '__custom__';
    const customKInput = document.getElementById('profile-custom-kingdom');
    if (customKInput) customKInput.value = activeKingdom;
  }

  populateParkOptions(activeKingdom, activePark);
  updateGroupBannerDisplays();
}

function populateParkOptions(selectedKingdom, activeParkToSelect = null) {
  const parkSelect = document.getElementById('profile-park-select');
  const customInputsRow = document.getElementById('profile-custom-inputs-row');
  const customKingdomGroup = document.getElementById('custom-kingdom-group');
  const customParkGroup = document.getElementById('custom-park-group');
  if (!parkSelect) return;

  const isCustomKingdom = selectedKingdom === '__custom__';
  if (customKingdomGroup) {
    customKingdomGroup.classList.toggle('hidden', !isCustomKingdom);
  }

  const parks = AMTGARD_KINGDOMS_AND_PARKS[selectedKingdom] || [];
  let parkOptions = parks.map(p => `<option value="${p}">${p}</option>`).join('');
  parkOptions += `<option value="__custom__">➕ Other / Custom Park</option>`;
  parkSelect.innerHTML = parkOptions;

  const targetPark = activeParkToSelect || getActivePark();
  if (parks.includes(targetPark)) {
    parkSelect.value = targetPark;
    if (customParkGroup) customParkGroup.classList.add('hidden');
  } else {
    parkSelect.value = '__custom__';
    if (customParkGroup) {
      customParkGroup.classList.remove('hidden');
      const customPInput = document.getElementById('profile-custom-park');
      if (customPInput) customPInput.value = targetPark || '';
    }
  }

  if (customInputsRow) {
    const showRow = isCustomKingdom || parkSelect.value === '__custom__';
    customInputsRow.classList.toggle('hidden', !showRow);
  }
}

function handleKingdomSelectChange() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!kingdomSelect) return;
  const selectedKingdom = kingdomSelect.value;
  populateParkOptions(selectedKingdom);
  handleParkSelectChange();
}

function handleParkSelectChange() {
  const parkSelect = document.getElementById('profile-park-select');
  const customInputsRow = document.getElementById('profile-custom-inputs-row');
  const customParkGroup = document.getElementById('custom-park-group');
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!parkSelect || !kingdomSelect) return;

  const isCustomPark = parkSelect.value === '__custom__';
  const isCustomKingdom = kingdomSelect.value === '__custom__';

  if (customParkGroup) {
    customParkGroup.classList.toggle('hidden', !isCustomPark);
  }
  if (customInputsRow) {
    customInputsRow.classList.toggle('hidden', !isCustomKingdom && !isCustomPark);
  }
}

async function saveProfileGroup() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  const customKingdomInput = document.getElementById('profile-custom-kingdom');
  const customParkInput = document.getElementById('profile-custom-park');
  const statusEl = document.getElementById('group-save-status');

  if (!kingdomSelect || !parkSelect) return;

  let finalKingdom = kingdomSelect.value === '__custom__'
    ? (customKingdomInput?.value.trim() || 'Custom Kingdom')
    : kingdomSelect.value;

  let finalPark = parkSelect.value === '__custom__'
    ? (customParkInput?.value.trim() || 'Custom Park')
    : parkSelect.value;

  if (!finalKingdom || !finalPark) {
    if (statusEl) {
      statusEl.style.color = 'var(--danger)';
      statusEl.innerText = '⚠️ Please specify both a Kingdom and a Park.';
    }
    return;
  }

  if (statusEl) {
    statusEl.style.color = 'var(--text-muted)';
    statusEl.innerText = 'Switching park & scoping inventory...';
  }

  // Update reactive local state
  currentPark = finalPark;
  currentKingdom = finalKingdom;
  if (!currentProfile) currentProfile = {};
  currentProfile.kingdom = finalKingdom;
  currentProfile.park = finalPark;

  // Persist group affiliation to Supabase profiles
  if (currentUser) {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ kingdom: finalKingdom, park: finalPark })
        .eq('id', currentUser.id);

      if (error) {
        console.warn('Profile group persistence warning:', error.message);
      }
    } catch (e) {
      console.warn('Profile update error:', e);
    }
  }

  updateGroupBannerDisplays();
  await fetchUserInventory();

  if (statusEl) {
    statusEl.style.color = 'var(--success)';
    statusEl.innerText = `✅ Active Park set to ${finalPark}! Inventory switched.`;
    setTimeout(() => {
      if (statusEl) statusEl.innerText = '';
    }, 4000);
  }
}

function updateGroupBannerDisplays() {
  const activeKingdom = getActiveKingdom();
  const activePark = getActivePark();

  const kDisplay = document.getElementById('display-profile-kingdom');
  const pDisplay = document.getElementById('display-profile-park');
  const invTitle = document.getElementById('profile-inventory-title');
  const storePark = document.getElementById('store-active-park-display');
  const storeKingdom = document.getElementById('store-active-kingdom-display');

  if (kDisplay) kDisplay.innerText = activeKingdom;
  if (pDisplay) pDisplay.innerText = activePark;
  if (invTitle) invTitle.innerText = `${activePark} Inventory`;
  if (storePark) storePark.innerText = activePark;
  if (storeKingdom) storeKingdom.innerText = activeKingdom;
}

// ==============================================================================
// 2. Isolated Park Inventory Fetching & Display
// ==============================================================================

async function fetchUserInventory() {
  const profileList = document.getElementById('profile-inventory-list');
  const sellList = document.getElementById('store-sell-list');
  const countLabel = document.getElementById('profile-inventory-count');

  if (!currentUser) return;

  const activePark = getActivePark();
  const activeKingdom = getActiveKingdom();
  updateGroupBannerDisplays();

  const { data: inventory, error } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error("Error fetching inventory:", error);
    return;
  }

  // Gracefully adopt any legacy items with NULL park to active park
  const unassigned = (inventory || []).filter(item => !item.park);
  if (unassigned.length > 0) {
    const unassignedIds = unassigned.map(item => item.id);
    supabaseClient
      .from('user_inventory')
      .update({ park: activePark, kingdom: activeKingdom })
      .in('id', unassignedIds)
      .then();
    unassigned.forEach(item => { item.park = activePark; item.kingdom = activeKingdom; });
  }

  // Strictly isolate inventory items for the player's active park
  const parkInventory = (inventory || []).filter(item => item.park === activePark);

  if (!parkInventory || parkInventory.length === 0) {
    if (profileList) {
      profileList.innerHTML = `<p class="empty-state">Your pouch is empty at <strong style="color:var(--primary);">${activePark}</strong>.<br><small>Visit the Store to acquire gear for this chapter!</small></p>`;
    }
    if (sellList) {
      sellList.innerHTML = `<p class="empty-state">No items available to sell at <strong style="color:var(--gold);">${activePark}</strong>.</p>`;
    }
    if (countLabel) countLabel.innerText = `(0 items at ${activePark})`;
    return;
  }

  if (countLabel) {
    countLabel.innerText = `(${parkInventory.length} item${parkInventory.length === 1 ? '' : 's'} at ${activePark})`;
  }

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);

  // Profile Accordion: Item rows display item name, durability, and scoped park
  if (profileList) {
    profileList.innerHTML = parkInventory.map(item => {
      const durabilityMax = Number(item.durability_max ?? getCategoryDurabilityMax(getCategoryForItemName(item.item_name)) ?? 1);
      const durabilityCurrent = Number(item.durability_current ?? durabilityMax);
      const normalizedCurrent = Math.max(0, durabilityCurrent);
      const currentValue = calculateItemValue(item.base_cost, normalizedCurrent, durabilityMax);

      return `<div class="item-card">
        <div class="item-info">
          <h4>${item.item_name}</h4>
          <small style="color:var(--gold);">Value: ${currentValue}g</small>
          <small style="color:var(--text-muted);">
            Durability: ${normalizedCurrent}/${durabilityMax} • 📍 ${item.park || activePark}
          </small>
        </div>
      </div>`;
    }).join('');
  }

  // Merchant Store "Sell Back" Sub-tab: Resale list isolated to active park
  if (sellList) {
    sellList.innerHTML = parkInventory.map(item => {
      const durabilityMax = Number(item.durability_max ?? getCategoryDurabilityMax(getCategoryForItemName(item.item_name)) ?? 1);
      const durabilityCurrent = Number(item.durability_current ?? durabilityMax);
      const normalizedCurrent = Math.max(0, durabilityCurrent);
      const sellGoldValue = calculateItemValue(item.base_cost, normalizedCurrent, durabilityMax);

      return `<div class="item-card">
        <div class="item-info">
          <h4>${item.item_name}</h4>
          <small>Resale Value: <strong style="color:var(--gold);">${sellGoldValue} Gold</strong> (${normalizedCurrent}/${durabilityMax} dur)</small>
          <small style="color:var(--text-muted);">Base: ${item.base_cost || 1}g • 📍 ${item.park || activePark}</small>
        </div>
        <button class="btn-sell" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="sellItem('${item.id}', ${sellGoldValue}, '${item.item_name}')">
          ${isCombatLocked ? '🔒 In Battle' : `Sell (${sellGoldValue}g)`}
        </button>
      </div>`;
    }).join('');
  }
}

// ==============================================================================
// 3. Store Catalog & Purchasing (Isolated by Park)
// ==============================================================================

function renderStoreCatalog() {
  const container = document.getElementById('store-catalog-list');
  if (!container) return;

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);
  const categories = ['Trinket', 'Talisman', 'Legendary'];

  container.innerHTML = categories.map(category => {
    const items = STORE_CATALOG.filter(item => item.category === category);

    return `<details class="store-category" ${category === 'Trinket' ? 'open' : ''}>
      <summary class="store-category-summary">${category}</summary>
      <div class="item-grid store-category-items">
        ${items.map(item => `
          <div class="item-card">
            <div class="item-info">
              <h4>${item.item_name}</h4>
              <small>${item.description}</small>
              <small style="color:var(--gold); margin-top:4px;">${item.category} • ${item.usage_limit || '1/Use'} </small>
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

  if ((currentProfile?.gold || 0) < cost) {
    alert("⚠️ Not enough gold to purchase this item!");
    return;
  }

  const category = getCategoryForItemName(itemName);
  if (!category || !INVENTORY_LIMITS[category]) {
    alert("⚠️ This item does not belong to a recognized category.");
    return;
  }

  const activePark = getActivePark();
  const activeKingdom = getActiveKingdom();

  const { data: inventoryRows, error: inventoryError } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id);

  if (inventoryError) {
    alert("⚠️ Could not load your current inventory: " + inventoryError.message);
    return;
  }

  // Pouch category capacity is strictly isolated to the active park's inventory
  const parkInventory = (inventoryRows || []).filter(row => (row.park === activePark || !row.park));

  const activeByCategory = parkInventory.reduce((acc, row) => {
    const itemCategory = getCategoryForItemName(row.item_name);
    if (itemCategory) {
      acc[itemCategory] = (acc[itemCategory] || 0) + 1;
    }
    return acc;
  }, {});

  const currentCategoryCount = activeByCategory[category] || 0;
  const categoryLimit = INVENTORY_LIMITS[category];

  if (currentCategoryCount >= categoryLimit) {
    alert(`⚠️ Your ${category} pouch at ${activePark} is full. You can carry ${categoryLimit} ${category}${categoryLimit === 1 ? '' : 's'} at most in this chapter.`);
    return;
  }

  const durabilityMax = getCategoryDurabilityMax(category);

  const { error } = await supabaseClient.from('user_inventory').insert({
    user_id: currentUser.id,
    item_name: itemName,
    base_cost: cost,
    quantity: 1,
    durability_current: durabilityMax,
    durability_max: durabilityMax,
    park: activePark,
    kingdom: activeKingdom
  });

  if (error) { alert("Error buying item: " + error.message); return; }

  // Deduct Gold from Profile
  const newGold = currentProfile.gold - cost;
  await supabaseClient.from('profiles').update({ gold: newGold }).eq('id', currentUser.id);
  currentProfile.gold = newGold;
  const goldEl = document.getElementById('profile-gold');
  if (goldEl) goldEl.innerText = newGold;

  alert(`🛒 Purchased ${itemName} for ${cost} Gold! Stored in your ${activePark} inventory.`);
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
    alert("⚠️ This item could not be found in your active park pouch.");
    await fetchUserInventory();
    return;
  }

  const newGold = (currentProfile.gold || 0) + goldValue;
  await supabaseClient.from('profiles').update({ gold: newGold }).eq('id', currentUser.id);

  currentProfile.gold = newGold;
  const goldEl = document.getElementById('profile-gold');
  if (goldEl) goldEl.innerText = newGold;

  alert(`🪙 Sold ${itemName} for ${goldValue} Gold!`);
  await fetchUserInventory();
}

// ==============================================================================
// 4. Durability Combat Damage Scoping
// ==============================================================================

async function applyCombatDurabilityDamage(userId) {
  if (!userId) return;
  const activePark = getActivePark();

  // 1. Attempt server-side atomic RPC with target_park parameter
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
    // Fall back to client-side batch processing if RPC is not deployed or has older signature
  }

  // 2. Client-side fallback: isolate durability damage to the active park's items
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
    const category = getCategoryForItemName(row.item_name);
    const defaultMax = getCategoryDurabilityMax(category);
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
