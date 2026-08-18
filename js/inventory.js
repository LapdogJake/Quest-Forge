// ==============================================================================
// Quest-Forge: Inventory, Merchant Store, & Durability Management
// ==============================================================================

async function fetchUserInventory() {
  const profileList = document.getElementById('profile-inventory-list');
  const sellList = document.getElementById('store-sell-list');
  const countLabel = document.getElementById('profile-inventory-count');

  if (!currentUser) return;

  const { data: inventory, error } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error("Error fetching inventory:", error);
    return;
  }

  if (!inventory || inventory.length === 0) {
    if (profileList) profileList.innerHTML = `<p class="empty-state">Your pouch is empty. Visit the Store to buy supplies!</p>`;
    if (sellList) sellList.innerHTML = `<p class="empty-state">No unexpired items available to sell.</p>`;
    if (countLabel) countLabel.innerText = "(0 items)";
    return;
  }

  const validItems = [];
  const expiredIds = [];

  inventory.forEach(item => {
    const status = getItemStatus(item);
    if (status.isExpired) {
      expiredIds.push(item.id);
    } else {
      validItems.push({ ...item, status });
    }
  });

  // Lazy cleanup of expired items from DB
  if (expiredIds.length > 0) {
    await supabaseClient.from('user_inventory').delete().in('id', expiredIds);
  }

  if (countLabel) countLabel.innerText = `(${validItems.length} item${validItems.length === 1 ? '' : 's'})`;

  if (validItems.length === 0) {
    if (profileList) profileList.innerHTML = `<p class="empty-state">Your items decayed away! Visit the Store to restock.</p>`;
    if (sellList) sellList.innerHTML = `<p class="empty-state">No unexpired items available to sell.</p>`;
    return;
  }

  // Profile Accordion: Item rows simply display their current row state.
  if (profileList) {
    profileList.innerHTML = validItems.map(item => {
      const durabilityMax = Number(item.durability_max ?? getCategoryDurabilityMax(getCategoryForItemName(item.item_name)) ?? 1);
      const durabilityCurrent = Number(item.durability_current ?? durabilityMax);
      const normalizedCurrent = Math.max(0, durabilityCurrent);

      return `<div class="item-card">
        <div class="item-info">
          <h4>${item.item_name}</h4>
          <small style="color:${item.status.percentLeft < 25 ? 'var(--danger)' : 'var(--text-muted)'};">
            ⌛ ${item.status.daysLeft}d left (${item.status.percentLeft}% fresh)
          </small>
          <small style="color:var(--text-muted);">
            Durability: ${normalizedCurrent}/${durabilityMax}
          </small>
        </div>
      </div>`;
    }).join('');
  }

  // Merchant Store "Sell Back" Sub-tab: Sell Button with Dynamic Value
  if (sellList) {
    sellList.innerHTML = validItems.map(item => {
      const durabilityMax = Number(item.durability_max ?? getCategoryDurabilityMax(getCategoryForItemName(item.item_name)) ?? 1);
      const durabilityCurrent = Number(item.durability_current ?? durabilityMax);
      const normalizedCurrent = Math.max(0, durabilityCurrent);

      return `<div class="item-card">
        <div class="item-info">
          <h4>${item.item_name}</h4>
          <small>Current Resale Value: <strong style="color:var(--gold);">${item.status.currentGoldValue} Gold</strong> (${item.status.daysLeft}d remaining)</small>
          <small style="color:var(--text-muted);">Durability: ${normalizedCurrent}/${durabilityMax}</small>
        </div>
        <button class="btn-sell" onclick="sellItem('${item.id}', ${item.status.currentGoldValue}, '${item.item_name}')">Sell (${item.status.currentGoldValue}g)</button>
      </div>`;
    }).join('');
  }
}

function renderStoreCatalog() {
  const container = document.getElementById('store-catalog-list');
  if (!container) return;

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
            <button class="btn-buy" onclick="buyItem('${item.item_name}', ${item.base_cost}, ${item.duration_hours})">Buy (${item.base_cost}g)</button>
          </div>
        `).join('')}
      </div>
    </details>`;
  }).join('');
}

async function buyItem(itemName, cost, durationHours) {
  if ((currentProfile?.gold || 0) < cost) {
    alert("⚠️ Not enough gold to purchase this item!");
    return;
  }

  const category = getCategoryForItemName(itemName);
  if (!category || !INVENTORY_LIMITS[category]) {
    alert("⚠️ This item does not belong to a recognized category.");
    return;
  }

  const { data: inventoryRows, error: inventoryError } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id);

  if (inventoryError) {
    alert("⚠️ Could not load your current inventory: " + inventoryError.message);
    return;
  }

  const activeRows = [];
  const expiredIds = [];

  for (const row of inventoryRows || []) {
    const status = getItemStatus(row);
    if (status.isExpired) {
      expiredIds.push(row.id);
    } else {
      activeRows.push({ ...row, status });
    }
  }

  if (expiredIds.length > 0) {
    await supabaseClient.from('user_inventory').delete().in('id', expiredIds);
  }

  const activeByCategory = activeRows.reduce((acc, row) => {
    const itemCategory = getCategoryForItemName(row.item_name);
    if (itemCategory) {
      acc[itemCategory] = (acc[itemCategory] || 0) + 1;
    }
    return acc;
  }, {});

  const currentCategoryCount = activeByCategory[category] || 0;
  const categoryLimit = INVENTORY_LIMITS[category];

  if (currentCategoryCount >= categoryLimit) {
    alert(`⚠️ Your ${category} pouch is full. You can carry ${categoryLimit} ${category}${categoryLimit === 1 ? '' : 's'} at most.`);
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVENTORY_LIFE_MS);
  const durabilityMax = getCategoryDurabilityMax(category);

  const { error } = await supabaseClient.from('user_inventory').insert({
    user_id: currentUser.id,
    item_name: itemName,
    base_cost: cost,
    purchased_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    quantity: 1,
    durability_current: durabilityMax,
    durability_max: durabilityMax
  });

  if (error) { alert("Error buying item: " + error.message); return; }

  // Deduct Gold
  const newGold = currentProfile.gold - cost;
  await supabaseClient.from('profiles').update({ gold: newGold }).eq('id', currentUser.id);
  currentProfile.gold = newGold;
  const goldEl = document.getElementById('profile-gold');
  if (goldEl) goldEl.innerText = newGold;

  alert(`🛒 Purchased ${itemName} for ${cost} Gold!`);
  await fetchUserInventory();
}

async function sellItem(itemId, goldValue, itemName) {
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

  const newGold = (currentProfile.gold || 0) + goldValue;
  await supabaseClient.from('profiles').update({ gold: newGold }).eq('id', currentUser.id);

  currentProfile.gold = newGold;
  const goldEl = document.getElementById('profile-gold');
  if (goldEl) goldEl.innerText = newGold;

  alert(`🪙 Sold ${itemName} for ${goldValue} Gold!`);
  await fetchUserInventory();
}

async function applyCombatDurabilityDamage(userId) {
  if (!userId) return;

  // 1. Attempt server-side atomic RPC if available
  try {
    const { error: rpcError } = await supabaseClient.rpc('apply_combat_durability_damage', {
      target_user_id: userId
    });

    if (!rpcError) {
      if (currentUser && userId === currentUser.id) {
        await fetchUserInventory();
      }
      return;
    }
  } catch (err) {
    // Fall back to client-side batch processing if RPC is not deployed
  }

  // 2. Client-side fallback
  const { data: rows, error } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Unable to read inventory durability rows:', error);
    return;
  }

  const rowsToDelete = [];
  const rowsToUpdate = [];

  for (const row of rows || []) {
    const status = getItemStatus(row);

    if (status.isExpired) {
      rowsToDelete.push(row.id);
      continue;
    }

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

  // Batch delete all depleted or expired items
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
          purchased_at: itemPatch.row.purchased_at,
          expires_at: itemPatch.row.expires_at,
          quantity: itemPatch.row.quantity || 1,
          durability_current: itemPatch.durability_current,
          durability_max: itemPatch.durability_max
        });

      if (insErr) console.error('Durability replace fallback insert failed:', insErr);
    }
  });

  await Promise.allSettled([deletePromise, ...updatePromises]);

  if (currentUser && userId === currentUser.id) {
    await fetchUserInventory();
  }
}
