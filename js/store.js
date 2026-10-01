// ==============================================================================
// Quest-Forge: Merchant Store & Economy Engine
// Manages buying, selling, and catalog display isolated by Park & QM Reign
// ==============================================================================

// Items tab sub-navigation (Pouch / Bank / Store)
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

// Merchant Store sub-navigation (Buy / Sell Back)
function switchStoreSubTab(subTab) {
  const buyTab = document.getElementById('store-subtab-buy');
  const sellTab = document.getElementById('store-subtab-sell');
  const buyNav = document.getElementById('store-subnav-buy');
  const sellNav = document.getElementById('store-subnav-sell');

  if (buyTab) buyTab.classList.add('hidden');
  if (sellTab) sellTab.classList.add('hidden');
  if (buyNav) buyNav.classList.remove('active');
  if (sellNav) sellNav.classList.remove('active');

  if (subTab === 'buy') {
    if (buyTab) buyTab.classList.remove('hidden');
    if (buyNav) buyNav.classList.add('active');
  } else {
    if (sellTab) sellTab.classList.remove('hidden');
    if (sellNav) sellNav.classList.add('active');
    if (typeof fetchUserInventory === 'function') fetchUserInventory();
  }
}

// Render the merchant catalog organized by category (Trinket, Talismans, Artifacts)
function renderStoreCatalog() {
  const container = document.getElementById('store-catalog-list');
  if (!container) return;

  const isCombatLocked = Boolean(activeBattleQuest || activeMonsterClaim);
  const categories = ['Trinket', 'Talismans', 'Artifacts'];

  container.innerHTML = categories.map(category => {
    const items = STORE_CATALOG.filter(item => item.category === category);

    return `<details class="store-category" open>
      <summary class="store-category-summary">${category} (${category === 'Trinket' ? 'Max 3 Pouch / 3 Bank' : (category === 'Talismans' ? 'Max 2 Pouch / 2 Bank' : 'Max 1 Pouch / 1 Bank')})</summary>
      <div class="item-grid store-category-items">
        ${items.map(item => {
          const maxDur = item.durability_max || (typeof getItemDurabilityMax === 'function' ? getItemDurabilityMax(item.item_name) : 1);
          return `<div class="item-card">
            <div class="item-info">
              <h4>${item.item_name} <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">(${maxDur} dur)</span></h4>
              <small style="color:var(--text-muted);">${item.description || ''}</small>
            </div>
            <button class="btn-buy" ${isCombatLocked ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="buyItem('${item.item_name}', ${item.base_cost})">
              ${isCombatLocked ? '🔒 In Battle' : `Buy (${item.base_cost}g)`}
            </button>
          </div>`;
        }).join('')}
      </div>
    </details>`;
  }).join('');
}

// Buy an item from the merchant store (fills Pouch first, then Bank)
async function buyItem(itemName, cost) {
  if (activeBattleQuest || activeMonsterClaim) {
    alert("⚠️ Action Failed: Inventory is locked during active combat encounters!");
    return;
  }

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : (currentKingdom || "The Freeholds of Amtgard");
  const currentParkGold = typeof getParkGold === 'function' ? getParkGold(currentProfile, activePark) : (currentParkProfile?.gold || 0);

  if (currentParkGold < cost) {
    alert("⚠️ Not enough gold to purchase this item!");
    return;
  }

  const category = getCategoryForItemName(itemName);
  if (!category) {
    alert("⚠️ This item does not belong to a recognized category.");
    return;
  }

  let normalizedCategory = category;
  if (normalizedCategory === 'Talisman') normalizedCategory = 'Talismans';
  if (normalizedCategory === 'Artifact' || normalizedCategory === 'Legendary') normalizedCategory = 'Artifacts';
  if (normalizedCategory === 'Trinkets') normalizedCategory = 'Trinket';

  const { data: parkInventory, error: inventoryError } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('park', activePark);

  if (inventoryError) {
    alert("⚠️ Could not load your current inventory: " + inventoryError.message);
    return;
  }

  // Inventory items isolated to the active park & QM reign
  const activeItems = (parkInventory || []).filter(item => !item.qm_id || !currentQMId || item.qm_id === currentQMId);

  // Split into Pouch and Bank items
  const pouchItems = activeItems.filter(item => !item.storage_location || item.storage_location === 'pouch');
  const bankItems = activeItems.filter(item => item.storage_location === 'bank');

  const pouchCount = pouchItems.filter(item => {
    let c = getCategoryForItemName(item.item_name);
    if (c === 'Talisman') c = 'Talismans';
    if (c === 'Artifact' || c === 'Legendary') c = 'Artifacts';
    if (c === 'Trinkets') c = 'Trinket';
    return c === normalizedCategory;
  }).length;

  const bankCount = bankItems.filter(item => {
    let c = getCategoryForItemName(item.item_name);
    if (c === 'Talisman') c = 'Talismans';
    if (c === 'Artifact' || c === 'Legendary') c = 'Artifacts';
    if (c === 'Trinkets') c = 'Trinket';
    return c === normalizedCategory;
  }).length;

  const pouchLimit = (STORAGE_LIMITS.pouch && STORAGE_LIMITS.pouch[normalizedCategory]) || 1;
  const bankLimit = (STORAGE_LIMITS.bank && STORAGE_LIMITS.bank[normalizedCategory]) || 1;

  let destLocation = null;
  if (pouchCount < pouchLimit) {
    destLocation = 'pouch';
  } else if (bankCount < bankLimit) {
    destLocation = 'bank';
  } else {
    alert(`⚠️ Both your Pouch and Bank are full of ${normalizedCategory}s!\n(Pouch: ${pouchCount}/${pouchLimit}, Bank: ${bankCount}/${bankLimit})\n\nPlease sell an item before purchasing more.`);
    return;
  }

  const durabilityMax = (typeof getItemDurabilityMax === 'function') 
    ? getItemDurabilityMax(itemName) 
    : (getCategoryDurabilityMax(category) || 1);

  const inventoryPayload = {
    user_id: currentUser.id,
    item_name: itemName,
    base_cost: cost,
    quantity: 1,
    durability_current: durabilityMax,
    durability_max: durabilityMax,
    storage_location: destLocation,
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
  if (error && error.message.includes('storage_location')) {
    delete inventoryPayload.storage_location;
    let retry = await supabaseClient.from('user_inventory').insert(inventoryPayload);
    error = retry.error;
  }

  if (error) { 
    alert("Error buying item: " + error.message); 
    return; 
  }

  // Deduct Gold from isolated park wallet
  if (typeof updateParkGold === 'function') {
    await updateParkGold(cost * -1, true, activePark, currentQMId);
  }

  const destName = destLocation === 'pouch' ? '🎒 Pouch' : '🏦 Bank Vault';
  alert(`🛒 Purchased ${itemName} for ${cost} Gold!\n(Placed in ${destName})`);
  
  if (typeof fetchUserInventory === 'function') {
    await fetchUserInventory();
  }
}

// Sell an item back to the merchant for scaled durability value
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
    alert("⚠️ This item could not be found in your inventory.");
    if (typeof fetchUserInventory === 'function') await fetchUserInventory();
    return;
  }

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  // Credit gold to isolated park wallet
  if (typeof updateParkGold === 'function') {
    await updateParkGold(goldValue, true, activePark, currentQMId);
  }

  alert(`🪙 Sold ${itemName} for ${goldValue} Gold!`);
  if (typeof fetchUserInventory === 'function') {
    await fetchUserInventory();
  }
}
