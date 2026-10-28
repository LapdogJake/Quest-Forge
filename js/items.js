// ==============================================================================
// Quest-Forge: Items Tab (Sub-Navigation, Item Helpers, Pouch, Inventory, & Wear)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Items Tab Sub-Navigation (Pouch / Inventory / Store)
// ------------------------------------------------------------------------------

function switchItemsSubTab(subTab) {
  const pouchTab = document.getElementById('items-subtab-pouch');
  const bankTab = document.getElementById('items-subtab-bank');
  const storeTab = document.getElementById('items-subtab-store');

  const pouchNav = document.getElementById('items-subnav-pouch');
  const bankNav = document.getElementById('items-subnav-bank');
  const storeNav = document.getElementById('items-subnav-store');

  if (pouchTab) pouchTab.classList.add('hidden');
  if (bankTab) bankTab.classList.add('hidden');
  if (storeTab) storeTab.classList.add('hidden');

  if (pouchNav) pouchNav.classList.remove('active');
  if (bankNav) bankNav.classList.remove('active');
  if (storeNav) storeNav.classList.remove('active');

  if (subTab === 'pouch') {
    if (pouchTab) pouchTab.classList.remove('hidden');
    if (pouchNav) pouchNav.classList.add('active');
  } else if (subTab === 'bank') {
    if (bankTab) bankTab.classList.remove('hidden');
    if (bankNav) bankNav.classList.add('active');
  } else if (subTab === 'store') {
    if (storeTab) storeTab.classList.remove('hidden');
    if (storeNav) storeNav.classList.add('active');
  }

  if (typeof fetchUserInventory === 'function') {
    fetchUserInventory();
  }
}

// ------------------------------------------------------------------------------
// 2. Item Pricing, Category, & Durability Helpers
// ------------------------------------------------------------------------------

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

function getItemDurabilityMax(itemName) {
  if (!itemName) return 1;
  const normalized = itemName.replace(/’/g, "'").trim().toLowerCase();
  const match = STORE_CATALOG.find(item => item.item_name.replace(/’/g, "'").trim().toLowerCase() === normalized);
  if (match && Number.isFinite(match.durability_max)) {
    return match.durability_max;
  }
  const cat = match?.category || getCategoryForItemName(itemName);
  return getCategoryDurabilityMax(cat);
}

function getCategoryDurabilityMax(category) {
  if (!category) return 1;
  return DURABILITY_LIMITS[category] || 1;
}

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

function normalizeItemStorageCategory(itemName) {
  let c = getCategoryForItemName(itemName);
  if (c === 'Trinkets' || c === 'Trinket') return 'Trinket';
  if (c === 'Talisman' || c === 'Talismans') return 'Talismans';
  if (c === 'Artifact' || c === 'Artifacts' || c === 'Legendary') return 'Artifacts';
  return 'Trinket';
}

// ------------------------------------------------------------------------------
// 3. Pouch & Inventory (Bank) Rendering & Fetching
// ------------------------------------------------------------------------------

function renderPouchItems(pouchItems, pouchCounts, isCombatLocked) {
  const pouchList = document.getElementById('pouch-items-list');
  if (!pouchList) return;

  const categories = ['Trinket', 'Talismans', 'Artifacts'];

  pouchList.innerHTML = categories.map(category => {
    const catItems = pouchItems.filter(item => normalizeItemStorageCategory(item?.item_name) === category);
    const curCount = pouchCounts[category] || 0;
    const maxCount = (STORAGE_LIMITS.pouch && STORAGE_LIMITS.pouch[category]) || 1;

    const itemsHtml = catItems.map(item => {
      const itemName = item?.item_name || 'Item';
      const durabilityMax = getItemDurabilityMax(itemName) || Number(item?.durability_max) || 1;
      const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
      const normalizedCurrent = Math.max(0, durabilityCurrent);

      return `<div class="item-card">
        <div class="item-info">
          <h4>${itemName}</h4>
          <small style="color:var(--text-muted);">Durability: ${normalizedCurrent}/${durabilityMax}</small>
        </div>
        <div class="item-actions">
          <button class="btn-transfer" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="transferItemStorage('${item.id}', 'bank')">
            ${isCombatLocked ? '🔒 Locked' : 'Inventory ↳'}
          </button>
        </div>
      </div>`;
    }).join('');

    return `<details class="store-category" ${catItems.length > 0 ? 'open' : ''}>
      <summary class="store-category-summary">${category} (${curCount}/${maxCount})</summary>
      <div class="item-grid store-category-items">
        ${itemsHtml}
      </div>
    </details>`;
  }).join('');
}

function renderBankItems(bankItems, bankCounts, isCombatLocked) {
  const bankList = document.getElementById('bank-items-list');
  if (!bankList) return;

  const categories = ['Trinket', 'Talismans', 'Artifacts'];

  bankList.innerHTML = categories.map(category => {
    const catItems = bankItems.filter(item => normalizeItemStorageCategory(item?.item_name) === category);
    const curCount = bankCounts[category] || 0;
    const maxCount = (STORAGE_LIMITS.bank && STORAGE_LIMITS.bank[category]) || 1;

    const itemsHtml = catItems.map(item => {
      const itemName = item?.item_name || 'Item';
      const durabilityMax = getItemDurabilityMax(itemName) || Number(item?.durability_max) || 1;
      const durabilityCurrent = Number(item?.durability_current !== undefined && item?.durability_current !== null ? item.durability_current : durabilityMax);
      const normalizedCurrent = Math.max(0, durabilityCurrent);
      const buyStorePrice = getItemStorePrice(itemName, item?.base_cost);
      const sellGoldValue = calculateItemValue(buyStorePrice, normalizedCurrent, durabilityMax);

      return `<div class="item-card">
        <div class="item-info">
          <h4>${itemName}</h4>
          <small style="color:var(--text-muted);">Durability: ${normalizedCurrent}/${durabilityMax}</small>
        </div>
        <div class="item-actions">
          <button class="btn-transfer" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="transferItemStorage('${item.id}', 'pouch')">
            ${isCombatLocked ? '🔒 Locked' : '↰ Pouch'}
          </button>
          <button class="btn-sell" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="sellItem('${item.id}', ${sellGoldValue}, '${itemName}')">
            Sell (${sellGoldValue}g)
          </button>
        </div>
      </div>`;
    }).join('');

    return `<details class="store-category" ${catItems.length > 0 ? 'open' : ''}>
      <summary class="store-category-summary">${category} (${curCount}/${maxCount})</summary>
      <div class="item-grid store-category-items">
        ${itemsHtml}
      </div>
    </details>`;
  }).join('');
}

// Fetch and display user inventory for both Pouch and Bank in active Park & QM Reign
async function fetchUserInventory() {
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

  // Detect newly awarded mystery loot for the logged-in player
  try {
    const lastSeenKey = 'qf_last_inventory_seen_' + currentUser.id;
    const lastSeen = localStorage.getItem(lastSeenKey);
    const nowIso = new Date().toISOString();

    if (!lastSeen) {
      // First visit: initialize baseline timestamp so we don't alert on historic items
      localStorage.setItem(lastSeenKey, nowIso);
    } else {
      const lastSeenTime = new Date(lastSeen).getTime();
      const newMysteryItems = (allParkItems || []).filter(item => {
        if (!item.created_at) return false;
        return new Date(item.created_at).getTime() > lastSeenTime;
      });

      if (newMysteryItems.length > 0) {
        localStorage.setItem(lastSeenKey, nowIso);
        const itemLines = newMysteryItems.map(i => `• ${i.item_name} (${i.storage_location === 'bank' ? '🏦 Bank' : '🎒 Pouch'})`).join('\n');
        alert(`🎲 NEW MYSTERY LOOT RECEIVED!\n\nA Quest Master awarded you loot:\n${itemLines}`);
      }
    }
  } catch (notifErr) {
    console.warn("Could not check for new inventory notifications", notifErr);
  }

  const parkInventory = (allParkItems || []).filter(item => !item.qm_id || !activeQMId || item.qm_id === activeQMId);

  // Normalize storage_location (default to 'pouch' if null or missing)
  const pouchItems = parkInventory.filter(item => !item.storage_location || item.storage_location === 'pouch');
  const bankItems = parkInventory.filter(item => item.storage_location === 'bank');

  // Update capacity counts
  const pouchCounts = getStorageSlotCounts(pouchItems);
  const bankCounts = getStorageSlotCounts(bankItems);

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);

  renderPouchItems(pouchItems, pouchCounts, isCombatLocked);
  renderBankItems(bankItems, bankCounts, isCombatLocked);
}

// ------------------------------------------------------------------------------
// 4. Storage Transfers & Combat Durability Wear Engine
// ------------------------------------------------------------------------------

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

  const normalizedCategory = normalizeItemStorageCategory(targetItem.item_name);
  const targetLimit = (STORAGE_LIMITS[targetLocation] && STORAGE_LIMITS[targetLocation][normalizedCategory]) || 1;

  // Check how many items of this category are currently in the target location
  const existingInTarget = parkInventory.filter(item => {
    const loc = item.storage_location || 'pouch';
    if (loc !== targetLocation) return false;
    return normalizeItemStorageCategory(item.item_name) === normalizedCategory;
  });

  if (existingInTarget.length >= targetLimit) {
    const destName = targetLocation === 'pouch' ? 'Pouch' : 'Inventory';
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

