// ==============================================================================
// Quest-Forge: Player Inventory & Combat Durability Engine
// Manages player pouch contents, durability display, and battle equipment wear
// ==============================================================================

// Fetch and display user inventory for the currently active Park and QM Reign
async function fetchUserInventory() {
  const profileList = document.getElementById('profile-inventory-list');
  const sellList = document.getElementById('store-sell-list');
  const countLabel = document.getElementById('profile-inventory-count');

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

// Durability Combat Damage Engine: Applies wear to active equipment following battle rules
async function applyCombatDurabilityDamage(userId, allowedCategories = null) {
  if (!userId) return;
  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");

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

  const activeQMId = currentQMId || null;
  const parkRows = (rows || []).filter(row => (!row.park || row.park === activePark) && (!row.qm_id || !activeQMId || row.qm_id === activeQMId));

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
