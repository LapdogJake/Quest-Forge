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

// Time-decay and dynamic resale valuation calculator
function getItemStatus(item) {
  const now = Date.now();
  const purchasedAt = new Date(item.purchased_at).getTime();
  const expiresAt = new Date(item.expires_at).getTime();

  const totalDuration = expiresAt - purchasedAt;
  const timeRemaining = expiresAt - now;

  if (timeRemaining <= 0) {
    return { isExpired: true, currentGoldValue: 0, daysLeft: 0, percentLeft: 0 };
  }

  const ratio = timeRemaining / totalDuration;
  const currentGoldValue = Math.floor((item.base_cost || 0) * ratio);
  const daysLeft = Math.max(1, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
  const percentLeft = Math.round(ratio * 100);

  return { isExpired: false, currentGoldValue, daysLeft, percentLeft };
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

// Catalog category matchers
function getCategoryForItemName(itemName) {
  const match = STORE_CATALOG.find(item => item.item_name === itemName);
  return match?.category || null;
}

function getCategoryDurabilityMax(category) {
  return DURABILITY_LIMITS[category] || 1;
}
