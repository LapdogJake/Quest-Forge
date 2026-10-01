// ==============================================================================
// Quest-Forge: Player Items, Pouch, Bank Vault, & Durability Engine
// Manages player active combat pouch, safe bank vault, item transfers, and wear
// ==============================================================================

// Calculate counts of items in a given storage location (pouch or bank)
function getStorageSlotCounts(itemsList) {
  const counts = { Trinket: 0, Talismans: 0, Artifacts: 0 };
  (itemsList || []).forEach(item => {
    let cat = getCategoryForItemName(item?.item_name);
    if (cat === 'Trinkets' || cat === 'Trinket') counts.Trinket++;
    else if (cat === 'Talisman' || cat === 'Talismans') counts.Talismans++;
    else if (cat === 'Artifact' || cat === 'Artifacts' || cat === 'Legendary') counts.Artifacts++;
  });
  return counts;
}

// Fetch and display user inventory for both Pouch and Bank in active Park & QM Reign
async function fetchUserInventory() {
  const pouchList = document.getElementById('pouch-items-list');
  const bankList = document.getElementById('bank-items-list');
  const profileList = document.getElementById('profile-inventory-list');
  const sellList = document.getElementById('store-sell-list');
  const countLabel = document.getElementById('profile-inventory-count');
  const pouchCapLabel = document.getElementById('pouch-capacity-summary');
  const bankCapLabel = document.getElementById('bank-capacity-summary');

  if (!currentUser) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || null;
  if (typeof updateGroupBannerDisplays === 'function') updateGroupBannerDisplays();

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

  // Normalize storage_location (default to 'pouch' if null or missing)
  const pouchItems = parkInventory.filter(item => !item.storage_location || item.storage_location === 'pouch');
  const bankItems = parkInventory.filter(item => item.storage_location === 'bank');

  // Update capacity counts
  const pouchCounts = getStorageSlotCounts(pouchItems);
  const bankCounts = getStorageSlotCounts(bankItems);

  if (pouchCapLabel) {
    pouchCapLabel.innerText = `Trinkets: ${pouchCounts.Trinket}/3 | Talismans: ${pouchCounts.Talismans}/2 | Artifact: ${pouchCounts.Artifacts}/1`;
  }
  if (bankCapLabel) {
    bankCapLabel.innerText = `Trinkets: ${bankCounts.Trinket}/3 | Talismans: ${bankCounts.Talismans}/2 | Artifact: ${bankCounts.Artifacts}/1`;
  }

  if (countLabel) {
    countLabel.innerText = `(${pouchItems.length} in pouch, ${bankItems.length} in bank)`;
  }

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);

  const calcFn = (typeof calculateItemValue === 'function')
    ? calculateItemValue
    : (bp, cur, mx) => (!mx || mx <= 0 ? 0 : Math.floor((bp || 0) * (Math.min(1, Math.max(0, cur) / mx))));

  // Render Pouch List
  if (pouchList) {
    if (pouchItems.length === 0) {
      pouchList.innerHTML = `<p class="empty-state">Your combat pouch is empty. Buy items from the Store or move them from your Bank vault!</p>`;
    } else {
      pouchList.innerHTML = pouchItems.map(item => {
        const itemName = item?.item_name || 'Item';
        const durabilityMax = getItemDurabilityMax(itemName) || Number(item?.durability_max) || 1;
        const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
        const normalizedCurrent = Math.max(0, durabilityCurrent);
        const buyStorePrice = (typeof getItemStorePrice === 'function')
          ? getItemStorePrice(itemName, item?.base_cost)
          : Math.max(1, Number(item?.base_cost || 1));
        const sellGoldValue = calcFn(buyStorePrice, normalizedCurrent, durabilityMax);

        return `<div class="item-card">
          <div class="item-info">
            <h4>${itemName}</h4>
            <small style="color:var(--gold);">Value: ${sellGoldValue}g</small>
            <small style="color:var(--text-muted);">
              Durability: ${normalizedCurrent}/${durabilityMax}
            </small>
          </div>
          <div class="item-actions">
            <button class="btn-transfer" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="transferItemStorage('${item.id}', 'bank')">
              ${isCombatLocked ? '🔒 Locked' : '🏦 To Bank'}
            </button>
            <button class="btn-sell" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="sellItem('${item.id}', ${sellGoldValue}, '${itemName}')">
              Sell (${sellGoldValue}g)
            </button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Render Bank List
  if (bankList) {
    if (bankItems.length === 0) {
      bankList.innerHTML = `<p class="empty-state">Your bank vault is empty. Move items from your pouch to protect them safely!</p>`;
    } else {
      bankList.innerHTML = bankItems.map(item => {
        const itemName = item?.item_name || 'Item';
        const durabilityMax = getItemDurabilityMax(itemName) || Number(item?.durability_max) || 1;
        const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
        const normalizedCurrent = Math.max(0, durabilityCurrent);
        const buyStorePrice = (typeof getItemStorePrice === 'function')
          ? getItemStorePrice(itemName, item?.base_cost)
          : Math.max(1, Number(item?.base_cost || 1));
        const sellGoldValue = calcFn(buyStorePrice, normalizedCurrent, durabilityMax);

        return `<div class="item-card">
          <div class="item-info">
            <h4>${itemName}</h4>
            <small style="color:var(--gold);">Value: ${sellGoldValue}g</small>
            <small style="color:var(--text-muted);">
              Durability: ${normalizedCurrent}/${durabilityMax} (Safe in Vault)
            </small>
          </div>
          <div class="item-actions">
            <button class="btn-transfer" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="transferItemStorage('${item.id}', 'pouch')">
              ${isCombatLocked ? '🔒 Locked' : '🎒 To Pouch'}
            </button>
            <button class="btn-sell" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="sellItem('${item.id}', ${sellGoldValue}, '${itemName}')">
              Sell (${sellGoldValue}g)
            </button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Profile Accordion (Displays Pouch Items summary)
  if (profileList) {
    try {
      if (pouchItems.length === 0 && bankItems.length === 0) {
        profileList.innerHTML = `<p class="empty-state">Your pouch and bank are empty. Visit the Items tab to buy gear!</p>`;
      } else {
        const cardsHtml = parkInventory.map(item => {
          const itemName = item?.item_name || 'Item';
          const isBank = item?.storage_location === 'bank';
          const durabilityMax = getItemDurabilityMax(itemName) || Number(item?.durability_max) || 1;
          const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
          const normalizedCurrent = Math.max(0, durabilityCurrent);
          const buyStorePrice = (typeof getItemStorePrice === 'function')
            ? getItemStorePrice(itemName, item?.base_cost)
            : Math.max(1, Number(item?.base_cost || 1));
          const currentValue = calcFn(buyStorePrice, normalizedCurrent, durabilityMax);

          return `<div class="item-card">
            <div class="item-info">
              <h4>${itemName} <span style="font-size:11px; padding:2px 6px; border-radius:4px; margin-left:6px; background:${isBank ? '#1e293b; color:#38bdf8;' : '#2e1065; color:#c084fc;'}">${isBank ? '🏦 Bank' : '🎒 Pouch'}</span></h4>
              <small style="color:var(--gold);">Value: ${currentValue}g</small>
              <small style="color:var(--text-muted);">
                Durability: ${normalizedCurrent}/${durabilityMax}
              </small>
            </div>
          </div>`;
        }).join('');
        profileList.innerHTML = cardsHtml;
      }
    } catch (err) {
      console.error('Error rendering profile inventory list:', err);
      profileList.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error rendering pouch: ${err.message}</p>`;
    }
  }

  // Store Sell List
  if (sellList) {
    try {
      if (parkInventory.length === 0) {
        sellList.innerHTML = `<p class="empty-state">No items available to sell.</p>`;
      } else {
        const sellCardsHtml = parkInventory.map(item => {
          const itemName = item?.item_name || 'Item';
          const isBank = item?.storage_location === 'bank';
          const durabilityMax = getItemDurabilityMax(itemName) || Number(item?.durability_max) || 1;
          const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
          const normalizedCurrent = Math.max(0, durabilityCurrent);
          const buyStorePrice = (typeof getItemStorePrice === 'function')
            ? getItemStorePrice(itemName, item?.base_cost)
            : Math.max(1, Number(item?.base_cost || 1));
          const sellGoldValue = calcFn(buyStorePrice, normalizedCurrent, durabilityMax);

          return `<div class="item-card">
            <div class="item-info">
              <h4>${itemName} <span style="font-size:11px; padding:2px 5px; border-radius:4px; margin-left:4px; background:${isBank ? '#1e293b; color:#38bdf8;' : '#2e1065; color:#c084fc;'}">${isBank ? '🏦 Bank' : '🎒 Pouch'}</span> <span style="font-size: 13px; color: var(--text-muted); font-weight: normal; margin-left: 6px;">(${normalizedCurrent}/${durabilityMax} dur)</span></h4>
            </div>
            <button class="btn-sell" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="sellItem('${item.id}', ${sellGoldValue}, '${itemName}')">
              ${isCombatLocked ? '🔒 In Battle' : `Sell (${sellGoldValue}g)`}
            </button>
          </div>`;
        }).join('');
        sellList.innerHTML = sellCardsHtml;
      }
    } catch (err) {
      console.error('Error rendering store sell list:', err);
      sellList.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error rendering store sell list: ${err.message}</p>`;
    }
  }
}

// Seamlessly transfer an item between Pouch and Bank
async function transferItemStorage(itemId, targetLocation) {
  if (activeBattleQuest || activeMonsterClaim) {
    alert("⚠️ Action Failed: Inventory is locked during active combat encounters!");
    return;
  }

  if (!currentUser || !itemId || (targetLocation !== 'pouch' && targetLocation !== 'bank')) {
    return;
  }

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || null;

  // 1. Fetch current inventory to validate capacity
  const { data: allParkItems, error: fetchErr } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('park', activePark);

  if (fetchErr) {
    alert("⚠️ Error transferring item: " + fetchErr.message);
    return;
  }

  const parkInventory = (allParkItems || []).filter(item => !item.qm_id || !activeQMId || item.qm_id === activeQMId);
  const targetItem = parkInventory.find(item => item.id === itemId);

  if (!targetItem) {
    alert("⚠️ Item not found in your inventory.");
    await fetchUserInventory();
    return;
  }

  const cat = getCategoryForItemName(targetItem.item_name);
  let normalizedCategory = cat;
  if (normalizedCategory === 'Talisman') normalizedCategory = 'Talismans';
  if (normalizedCategory === 'Artifact' || normalizedCategory === 'Legendary') normalizedCategory = 'Artifacts';
  if (normalizedCategory === 'Trinkets') normalizedCategory = 'Trinket';

  const targetLimit = (STORAGE_LIMITS[targetLocation] && STORAGE_LIMITS[targetLocation][normalizedCategory]) || 1;

  // Check how many items of this category are currently in the target location
  const existingInTarget = parkInventory.filter(item => {
    const loc = item.storage_location || 'pouch';
    if (loc !== targetLocation) return false;
    let itemCat = getCategoryForItemName(item.item_name);
    if (itemCat === 'Talisman') itemCat = 'Talismans';
    if (itemCat === 'Artifact' || itemCat === 'Legendary') itemCat = 'Artifacts';
    if (itemCat === 'Trinkets') itemCat = 'Trinket';
    return itemCat === normalizedCategory;
  });

  if (existingInTarget.length >= targetLimit) {
    const destName = targetLocation === 'pouch' ? 'Pouch' : 'Bank Vault';
    alert(`⚠️ Your ${destName} already contains ${existingInTarget.length}/${targetLimit} ${normalizedCategory}s.\n\nPlease move or sell an item before transferring!`);
    return;
  }

  // 2. Update storage_location in database
  let { error: updateErr } = await supabaseClient
    .from('user_inventory')
    .update({ storage_location: targetLocation })
    .eq('id', itemId);

  if (updateErr) {
    // Graceful fallback if storage_location column needs a refresh
    console.warn("Storage location update fallback:", updateErr);
    const { error: insErr } = await supabaseClient
      .from('user_inventory')
      .update({ storage_location: targetLocation })
      .match({ id: itemId, user_id: currentUser.id });
    if (insErr) {
      alert("⚠️ Failed to transfer item: " + insErr.message);
      return;
    }
  }

  const destTitle = targetLocation === 'pouch' ? '🎒 Pouch' : '🏦 Bank';
  alert(`📦 Moved "${targetItem.item_name}" to your ${destTitle}!`);
  await fetchUserInventory();
}

// Durability Combat Damage Engine: Applies wear ONLY to active Pouch equipment (Bank is safe!)
async function applyCombatDurabilityDamage(userId, allowedCategories = null, wearAmount = 1) {
  if (!userId) return;
  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const wear = Number.isFinite(wearAmount) ? Number(wearAmount) : 1;

  // If wear is 0 or allowedCategories is explicitly empty, no gear wear occurs
  if (wear <= 0 || (Array.isArray(allowedCategories) && allowedCategories.length === 0)) {
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

  // Fetch all inventory items for user
  const { data: rows, error } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Unable to read inventory durability rows:', error);
    return;
  }

  const activeQMId = currentQMId || null;
  // Filter strictly to active park & QM, AND strictly to items in POUCH (storage_location !== 'bank')
  const pouchRows = (rows || []).filter(row => {
    const isParkMatch = (!row.park || row.park === activePark) && (!row.qm_id || !activeQMId || row.qm_id === activeQMId);
    const isPouch = !row.storage_location || row.storage_location === 'pouch';
    return isParkMatch && isPouch;
  });

  const rowsToDelete = [];
  const rowsToUpdate = [];

  for (const row of pouchRows) {
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

    const defaultMax = getItemDurabilityMax(row.item_name) || getCategoryDurabilityMax(rawCategory);
    const durabilityMax = Number(row.durability_max ?? defaultMax ?? 1);
    const durabilityCurrent = Number(row.durability_current ?? durabilityMax);

    const nextDurability = durabilityCurrent - wear;

    if (nextDurability <= 0) {
      rowsToDelete.push(row.id);
    } else {
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
          storage_location: 'pouch',
          park: itemPatch.row.park || activePark,
          kingdom: itemPatch.row.kingdom || (typeof getActiveKingdom === 'function' ? getActiveKingdom() : 'The Freeholds of Amtgard'),
          qm_id: itemPatch.row.qm_id || activeQMId || null
        });

      if (insErr) console.error('Durability replace fallback insert failed:', insErr);
    }
  });

  await Promise.allSettled([deletePromise, ...updatePromises]);

  if (currentUser && userId === currentUser.id) {
    await fetchUserInventory();
  }
}
