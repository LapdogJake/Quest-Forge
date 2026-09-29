// ==============================================================================
// Quest-Forge: Merchant Store & Economy Engine
// Manages buying, selling, and catalog display isolated by Park & QM Reign
// ==============================================================================

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

// Buy an item from the merchant store
async function buyItem(itemName, cost, durationHours) {
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

  // Pouch category capacity is strictly isolated to the active park & QM reign
  const activeItems = (parkInventory || []).filter(item => !item.qm_id || !currentQMId || item.qm_id === currentQMId);

  const activeByCategory = activeItems.reduce((acc, row) => {
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

  if (error) { 
    alert("Error buying item: " + error.message); 
    return; 
  }

  // Deduct Gold from isolated park wallet
  if (typeof updateParkGold === 'function') {
    await updateParkGold(cost * -1, true, activePark, currentQMId);
  }

  alert(`🛒 Purchased ${itemName} for ${cost} Gold!`);
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
    alert("⚠️ This item could not be found in your pouch.");
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
