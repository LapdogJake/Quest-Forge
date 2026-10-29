// ==============================================================================
// Quest-Forge: QM Panel — QM Item Management, Economy Overrides, Custom Items & RNG Loot (#qm-subtab-items)
// ==============================================================================

let currentRealmItemConfig = {
  overrides: {},
  custom_items: [],
  loot_rates: null,
  buyback_percent: 100,
  configRowId: null
};

// Resolve the active buy-back percentage for item selling (0 to 100, default 100%)
function getActiveBuybackPercent(config = currentRealmItemConfig) {
  if (config && config.buyback_percent !== undefined && config.buyback_percent !== null && Number.isFinite(Number(config.buyback_percent))) {
    return Math.max(0, Math.min(100, Math.round(Number(config.buyback_percent))));
  }
  return 100;
}

function getRealmItemConfigStorageKey(park, qmId) {
  const normPark = (typeof normalizeParkName === 'function')
    ? normalizeParkName(park || '')
    : String(park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  return `qf_realm_item_config_${normPark || 'default'}_${qmId || 'default'}`;
}

function normalizeCatalogCategory(cat) {
  if (cat === 'Trinkets' || cat === 'Trinket') return 'Trinket';
  if (cat === 'Talisman' || cat === 'Talismans') return 'Talismans';
  if (cat === 'Artifact' || cat === 'Artifacts' || cat === 'Legendary') return 'Artifacts';
  return 'Trinket';
}

// Rebuild global STORE_CATALOG in place from DEFAULT_STORE_CATALOG + realm overrides + custom items
function rebuildActiveStoreCatalog(config = currentRealmItemConfig) {
  const baseCatalog = (typeof DEFAULT_STORE_CATALOG !== 'undefined' && Array.isArray(DEFAULT_STORE_CATALOG))
    ? DEFAULT_STORE_CATALOG
    : [];

  const overrides = (config && typeof config.overrides === 'object' && config.overrides) ? config.overrides : {};
  const customItems = (config && Array.isArray(config.custom_items)) ? config.custom_items : [];

  const mergedDefaults = baseCatalog.map(defItem => {
    const ov = overrides[defItem.id] || overrides[defItem.item_name] || null;
    const cost = (ov && ov.base_cost !== undefined && Number.isFinite(Number(ov.base_cost)))
      ? Math.max(0, Math.round(Number(ov.base_cost)))
      : defItem.base_cost;
    const dur = (ov && ov.durability_max !== undefined && Number.isFinite(Number(ov.durability_max)))
      ? Math.max(1, Math.round(Number(ov.durability_max)))
      : defItem.durability_max;

    return {
      ...defItem,
      category: normalizeCatalogCategory(defItem.category),
      base_cost: cost,
      durability_max: dur,
      default_cost: defItem.base_cost,
      default_durability: defItem.durability_max,
      is_custom: false,
      is_overridden: (cost !== defItem.base_cost || dur !== defItem.durability_max)
    };
  });

  const mergedCustom = customItems
    .filter(ci => ci && ci.item_name)
    .map(ci => ({
      id: ci.id || ('custom-' + String(ci.item_name).toLowerCase().replace(/[^a-z0-9]+/g, '-')),
      item_name: String(ci.item_name).trim(),
      category: normalizeCatalogCategory(ci.category),
      base_cost: Math.max(0, Math.round(Number(ci.base_cost ?? 5))),
      durability_max: Math.max(1, Math.round(Number(ci.durability_max ?? 1))),
      is_custom: true,
      is_overridden: false
    }));

  const fullCatalog = [...mergedDefaults, ...mergedCustom];
  if (typeof STORE_CATALOG !== 'undefined' && Array.isArray(STORE_CATALOG)) {
    STORE_CATALOG.splice(0, STORE_CATALOG.length, ...fullCatalog);
  }
  syncActiveLootDropRatesGlobal(config);
  return fullCatalog;
}

// Resolve the 6 individual drop slot percentages (3 Trinkets, 2 Talismans, 1 Artifact)
function getActiveLootDropSlots(config = currentRealmItemConfig) {
  const defaults = (typeof DEFAULT_RNG_LOOT_DROP_SLOTS !== 'undefined' && DEFAULT_RNG_LOOT_DROP_SLOTS)
    ? DEFAULT_RNG_LOOT_DROP_SLOTS
    : { trinket: [25, 25, 25], talisman: [5, 5], artifact: [0.4] };

  const saved = (config && config.loot_rates && typeof config.loot_rates === 'object') ? config.loot_rates : null;

  const parseSlotArray = (arr, defArr) => {
    return defArr.map((defVal, idx) => {
      if (Array.isArray(arr) && arr[idx] !== undefined && arr[idx] !== null && Number.isFinite(Number(arr[idx]))) {
        return Math.max(0, Math.min(100, Math.round(Number(arr[idx]) * 100) / 100));
      }
      return defVal;
    });
  };

  return {
    trinket: parseSlotArray(saved?.trinket, defaults.trinket || [25, 25, 25]),
    talisman: parseSlotArray(saved?.talisman, defaults.talisman || [5, 5]),
    artifact: parseSlotArray(saved?.artifact, defaults.artifact || [0.4])
  };
}

function syncActiveLootDropRatesGlobal(config = currentRealmItemConfig) {
  const slots = getActiveLootDropSlots(config);
  if (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES) {
    RNG_LOOT_DROP_RATES.trinket = {
      rolls: slots.trinket.length,
      chance: (slots.trinket[0] ?? 25) / 100,
      slots: slots.trinket
    };
    RNG_LOOT_DROP_RATES.talisman = {
      rolls: slots.talisman.length,
      chance: (slots.talisman[0] ?? 5) / 100,
      slots: slots.talisman
    };
    RNG_LOOT_DROP_RATES.artifact = {
      rolls: slots.artifact.length,
      chance: (slots.artifact[0] ?? 0.4) / 100,
      slots: slots.artifact
    };
  }
}

// Fetch the active park & QM realm's item economy overrides and custom items
async function fetchRealmItemConfig(customPark = null, customQMId = null) {
  const activePark = customPark || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const activeQMId = (customQMId !== null && customQMId !== undefined) ? customQMId : (currentQMId || currentUser?.id || null);
  const normActivePark = (typeof normalizeParkName === 'function')
    ? normalizeParkName(activePark)
    : String(activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();

  let loadedConfig = null;
  let foundRowId = null;

  try {
    const { data: rows, error } = await supabaseClient
      .from('quests')
      .select('id, title, description, scenario_card, park, qm_id, category')
      .eq('title', '__REALM_ITEM_CONFIG__');

    if (!error && Array.isArray(rows) && rows.length > 0) {
      const matchingRow = rows.find(r => {
        const normRPark = (typeof normalizeParkName === 'function')
          ? normalizeParkName(r.park || '')
          : String(r.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
        const parkMatches = !normRPark || !normActivePark || (normRPark === normActivePark);
        const qmMatches = !r.qm_id || !activeQMId || (r.qm_id === activeQMId);
        return parkMatches && qmMatches;
      });

      if (matchingRow) {
        foundRowId = matchingRow.id;
        const rawJson = matchingRow.description || matchingRow.scenario_card || '';
        if (rawJson) {
          try {
            loadedConfig = JSON.parse(rawJson);
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.warn('Could not query realm item config from Supabase:', err);
  }

  // Fallback to localStorage cache if no DB row found yet
  const storageKey = getRealmItemConfigStorageKey(activePark, activeQMId);
  if (!loadedConfig) {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        loadedConfig = JSON.parse(cached);
      }
    } catch (_) {}
  } else {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        overrides: loadedConfig.overrides || {},
        custom_items: loadedConfig.custom_items || [],
        loot_rates: loadedConfig.loot_rates || null,
        buyback_percent: (loadedConfig.buyback_percent !== undefined && loadedConfig.buyback_percent !== null) ? Number(loadedConfig.buyback_percent) : 100
      }));
    } catch (_) {}
  }

  currentRealmItemConfig = {
    overrides: (loadedConfig && typeof loadedConfig.overrides === 'object' && loadedConfig.overrides) ? loadedConfig.overrides : {},
    custom_items: (loadedConfig && Array.isArray(loadedConfig.custom_items)) ? loadedConfig.custom_items : [],
    loot_rates: (loadedConfig && loadedConfig.loot_rates) ? loadedConfig.loot_rates : null,
    buyback_percent: (loadedConfig && loadedConfig.buyback_percent !== undefined && loadedConfig.buyback_percent !== null && Number.isFinite(Number(loadedConfig.buyback_percent)))
      ? Math.max(0, Math.min(100, Math.round(Number(loadedConfig.buyback_percent))))
      : 100,
    configRowId: foundRowId
  };

  rebuildActiveStoreCatalog(currentRealmItemConfig);

  if (typeof renderStoreCatalog === 'function') {
    renderStoreCatalog();
  }
  renderQMItemsPanel();

  return currentRealmItemConfig;
}

// Persist the active park & QM realm's item config
async function saveRealmItemConfig(newConfig = currentRealmItemConfig) {
  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawQMId = currentQMId || currentUser?.id || null;
  const activeQMId = (rawQMId && uuidRegex.test(rawQMId)) ? rawQMId : (currentUser?.id && uuidRegex.test(currentUser.id) ? currentUser.id : null);
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const serializedPayload = {
    overrides: newConfig.overrides || {},
    custom_items: newConfig.custom_items || [],
    loot_rates: newConfig.loot_rates || null,
    buyback_percent: getActiveBuybackPercent(newConfig)
  };
  const jsonString = JSON.stringify(serializedPayload);

  // 1. Save immediately to localStorage
  try {
    const storageKey = getRealmItemConfigStorageKey(activePark, activeQMId);
    localStorage.setItem(storageKey, jsonString);
  } catch (_) {}

  // 2. Persist to Supabase quests table as hidden RealmConfig row
  try {
    let targetRowId = newConfig.configRowId || currentRealmItemConfig.configRowId || null;

    if (!targetRowId) {
      const { data: existingRows } = await supabaseClient
        .from('quests')
        .select('id, park, qm_id')
        .eq('title', '__REALM_ITEM_CONFIG__');

      const normActivePark = (typeof normalizeParkName === 'function')
        ? normalizeParkName(activePark)
        : String(activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();

      const matched = (existingRows || []).find(r => {
        const normRPark = (typeof normalizeParkName === 'function')
          ? normalizeParkName(r.park || '')
          : String(r.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
        return (!normRPark || normRPark === normActivePark) && (!r.qm_id || !activeQMId || r.qm_id === activeQMId);
      });

      if (matched) targetRowId = matched.id;
    }

    if (targetRowId) {
      const { error: updErr } = await supabaseClient
        .from('quests')
        .update({
          description: jsonString,
          scenario_card: jsonString,
          is_active: false
        })
        .eq('id', targetRowId);

      if (updErr) {
        console.warn('Error updating realm item config row:', updErr.message);
      } else {
        currentRealmItemConfig.configRowId = targetRowId;
      }
    } else {
      const insertPayload = {
        title: '__REALM_ITEM_CONFIG__',
        category: 'RealmConfig',
        description: jsonString,
        scenario_card: jsonString,
        reward_gold: 0,
        is_active: false,
        park: activePark,
        kingdom: activeKingdom,
        qm_id: activeQMId,
        qm_username: activeQMUsername
      };

      let { data: insData, error: insErr } = await supabaseClient
        .from('quests')
        .insert(insertPayload)
        .select('id')
        .maybeSingle();

      if (insErr) {
        let fallbackPayload = { ...insertPayload };
        if (insErr.message.includes('qm_id') || insErr.message.includes('qm_username')) {
          delete fallbackPayload.qm_id;
          delete fallbackPayload.qm_username;
        }
        if (insErr.message.includes('park')) delete fallbackPayload.park;
        if (insErr.message.includes('kingdom')) delete fallbackPayload.kingdom;
        if (insErr.message.includes('scenario_card')) delete fallbackPayload.scenario_card;

        const retry = await supabaseClient
          .from('quests')
          .insert(fallbackPayload)
          .select('id')
          .maybeSingle();
        insData = retry.data;
      }

      if (insData && insData.id) {
        currentRealmItemConfig.configRowId = insData.id;
      }
    }
  } catch (err) {
    console.warn('Could not persist realm item config to Supabase:', err);
  }

  currentRealmItemConfig.overrides = serializedPayload.overrides;
  currentRealmItemConfig.custom_items = serializedPayload.custom_items;
  currentRealmItemConfig.loot_rates = serializedPayload.loot_rates;
  currentRealmItemConfig.buyback_percent = serializedPayload.buyback_percent;

  rebuildActiveStoreCatalog(currentRealmItemConfig);

  if (typeof renderStoreCatalog === 'function') {
    renderStoreCatalog();
  }
  renderQMItemsPanel();
  if (typeof fetchUserInventory === 'function') {
    fetchUserInventory();
  }
}

// Auto-update durability default when switching custom item type
function onQMCustomItemTypeChange() {
  const catSelect = document.getElementById('qm-custom-item-category');
  const durInput = document.getElementById('qm-custom-item-durability');
  if (!catSelect || !durInput) return;

  const val = catSelect.value;
  if (val === 'Trinket') durInput.value = '1';
  else if (val === 'Talismans') durInput.value = '5';
  else if (val === 'Artifacts') durInput.value = '20';
}

// Create a new Custom Item for the park
async function qmCreateCustomItem() {
  const nameInput = document.getElementById('qm-custom-item-name');
  const catSelect = document.getElementById('qm-custom-item-category');
  const costInput = document.getElementById('qm-custom-item-cost');
  const durInput = document.getElementById('qm-custom-item-durability');

  const rawName = (nameInput?.value || '').trim();
  if (!rawName) {
    alert('Please enter an Item Name.');
    return;
  }

  const normalizedCheck = rawName.replace(/’/g, "'").toLowerCase();
  const existsInCatalog = STORE_CATALOG.some(
    item => item.item_name.replace(/’/g, "'").trim().toLowerCase() === normalizedCheck
  );
  if (existsInCatalog) {
    alert(`An item named "${rawName}" already exists in the catalog.`);
    return;
  }

  const category = normalizeCatalogCategory(catSelect?.value || 'Trinket');
  const base_cost = Math.max(0, Math.round(Number(costInput?.value ?? 5) || 0));
  const durability_max = Math.max(1, Math.round(Number(durInput?.value ?? 1) || 1));

  const newCustomItem = {
    id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    item_name: rawName,
    category,
    base_cost,
    durability_max
  };

  if (!Array.isArray(currentRealmItemConfig.custom_items)) {
    currentRealmItemConfig.custom_items = [];
  }
  currentRealmItemConfig.custom_items.push(newCustomItem);

  await saveRealmItemConfig(currentRealmItemConfig);

  if (nameInput) nameInput.value = '';
  if (costInput) costInput.value = '5';
  onQMCustomItemTypeChange();

  alert(`Added custom item "${rawName}" to the Store!`);
}

// Render the 6 adjustable RNG drop rate sliders & inputs (#qm-loot-rng-controls)
function renderQMLootDropControls() {
  const container = document.getElementById('qm-loot-rng-controls');
  if (!container) return;

  const defaults = (typeof DEFAULT_RNG_LOOT_DROP_SLOTS !== 'undefined' && DEFAULT_RNG_LOOT_DROP_SLOTS)
    ? DEFAULT_RNG_LOOT_DROP_SLOTS
    : { trinket: [25, 25, 25], talisman: [5, 5], artifact: [0.4] };

  const activeSlots = getActiveLootDropSlots(currentRealmItemConfig);

  const slotRows = [
    { tier: 'trinket', index: 0, label: 'Trinket Drop 1', val: activeSlots.trinket[0], def: defaults.trinket[0] },
    { tier: 'trinket', index: 1, label: 'Trinket Drop 2', val: activeSlots.trinket[1], def: defaults.trinket[1] },
    { tier: 'trinket', index: 2, label: 'Trinket Drop 3', val: activeSlots.trinket[2], def: defaults.trinket[2] },
    { tier: 'talisman', index: 0, label: 'Talisman Drop 1', val: activeSlots.talisman[0], def: defaults.talisman[0] },
    { tier: 'talisman', index: 1, label: 'Talisman Drop 2', val: activeSlots.talisman[1], def: defaults.talisman[1] },
    { tier: 'artifact', index: 0, label: 'Artifact Drop 1', val: activeSlots.artifact[0], def: defaults.artifact[0] }
  ];

  container.innerHTML = slotRows.map(row => {
    const isModified = Math.abs(Number(row.val) - Number(row.def)) > 0.001;
    return `<div style="display:grid; grid-template-columns: minmax(115px, 1.1fr) 1fr 78px; gap:10px; align-items:center; padding:8px 10px; background:#121214; border:1px solid ${isModified ? '#52525b' : '#27272a'}; border-radius:6px;">
      <div>
        <div style="font-size:13px; font-weight:600; color:var(--text);">${row.label}</div>
        <small style="font-size:11px; color:var(--text-muted);">Default: ${row.def}%${isModified ? ' (Modified)' : ''}</small>
      </div>
      <div style="display:flex; align-items:center;">
        <input type="range" id="qm-loot-slider-${row.tier}-${row.index}" min="0" max="100" step="0.1" value="${row.val}" style="width:100%; cursor:pointer; accent-color:#a1a1aa;" oninput="syncQMLootRateInput('${row.tier}', ${row.index}, 'slider')">
      </div>
      <div style="display:flex; align-items:center; gap:4px;">
        <input type="number" id="qm-loot-num-${row.tier}-${row.index}" class="form-control" min="0" max="100" step="0.1" value="${row.val}" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;" oninput="syncQMLootRateInput('${row.tier}', ${row.index}, 'number')">
        <span style="font-size:12px; color:var(--text-muted); font-weight:600;">%</span>
      </div>
    </div>`;
  }).join('');
}

// Keep slider and percentage input synced in real time
function syncQMLootRateInput(tier, index, source) {
  const sliderEl = document.getElementById(`qm-loot-slider-${tier}-${index}`);
  const numEl = document.getElementById(`qm-loot-num-${tier}-${index}`);
  if (!sliderEl || !numEl) return;

  if (source === 'slider') {
    numEl.value = sliderEl.value;
  } else {
    const raw = parseFloat(numEl.value);
    if (Number.isFinite(raw)) {
      const clamped = Math.max(0, Math.min(100, raw));
      sliderEl.value = String(clamped);
    }
  }
}

// Read the 6 loot drop rate inputs from the DOM
function readQMLootDropInputsFromDOM() {
  const defaults = (typeof DEFAULT_RNG_LOOT_DROP_SLOTS !== 'undefined' && DEFAULT_RNG_LOOT_DROP_SLOTS)
    ? DEFAULT_RNG_LOOT_DROP_SLOTS
    : { trinket: [25, 25, 25], talisman: [5, 5], artifact: [0.4] };

  const readVal = (tier, idx, defVal) => {
    const el = document.getElementById(`qm-loot-num-${tier}-${idx}`);
    if (!el) return defVal;
    const parsed = parseFloat(el.value);
    if (!Number.isFinite(parsed)) return defVal;
    return Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
  };

  const trinket = [
    readVal('trinket', 0, defaults.trinket[0]),
    readVal('trinket', 1, defaults.trinket[1]),
    readVal('trinket', 2, defaults.trinket[2])
  ];
  const talisman = [
    readVal('talisman', 0, defaults.talisman[0]),
    readVal('talisman', 1, defaults.talisman[1])
  ];
  const artifact = [
    readVal('artifact', 0, defaults.artifact[0])
  ];

  const matchesDefault =
    trinket.every((v, i) => Math.abs(v - defaults.trinket[i]) < 0.001) &&
    talisman.every((v, i) => Math.abs(v - defaults.talisman[i]) < 0.001) &&
    artifact.every((v, i) => Math.abs(v - defaults.artifact[i]) < 0.001);

  return matchesDefault ? null : { trinket, talisman, artifact };
}

// Save all 6 RNG drop rate slots
async function qmSaveLootDropRates() {
  currentRealmItemConfig.loot_rates = readQMLootDropInputsFromDOM();
  await saveRealmItemConfig(currentRealmItemConfig);
  alert('Item loot drop rates saved!');
}

// Reset a single drop slot back to its default percentage
async function qmResetSingleLootSlot(tier, index) {
  const defaults = (typeof DEFAULT_RNG_LOOT_DROP_SLOTS !== 'undefined' && DEFAULT_RNG_LOOT_DROP_SLOTS)
    ? DEFAULT_RNG_LOOT_DROP_SLOTS
    : { trinket: [25, 25, 25], talisman: [5, 5], artifact: [0.4] };

  const active = getActiveLootDropSlots(currentRealmItemConfig);
  if (active[tier] && defaults[tier] && defaults[tier][index] !== undefined) {
    active[tier][index] = defaults[tier][index];
  }

  const matchesDefault =
    active.trinket.every((v, i) => Math.abs(v - defaults.trinket[i]) < 0.001) &&
    active.talisman.every((v, i) => Math.abs(v - defaults.talisman[i]) < 0.001) &&
    active.artifact.every((v, i) => Math.abs(v - defaults.artifact[i]) < 0.001);

  currentRealmItemConfig.loot_rates = matchesDefault ? null : active;
  await saveRealmItemConfig(currentRealmItemConfig);
}

// Reset all 6 drop slots back to their baked-in defaults
async function qmResetLootDropRates() {
  if (!currentRealmItemConfig.loot_rates) {
    alert('All item loot drop rates are already set to their default values.');
    return;
  }
  if (!confirm('Reset all 6 item loot drop rates back to default (Trinkets: 25%, Talismans: 5%, Artifact: 0.4%)?')) {
    return;
  }
  currentRealmItemConfig.loot_rates = null;
  await saveRealmItemConfig(currentRealmItemConfig);
}

// Render the Buy Percentage slider & input inside #qm-subtab-items
function renderQMBuybackControls() {
  const sliderEl = document.getElementById('qm-buyback-slider');
  const numEl = document.getElementById('qm-buyback-num');
  const noteEl = document.getElementById('qm-buyback-default-note');
  const pct = getActiveBuybackPercent(currentRealmItemConfig);

  if (sliderEl) sliderEl.value = String(pct);
  if (numEl) numEl.value = String(pct);
  if (noteEl) {
    noteEl.textContent = pct !== 100
      ? `Default: 100% (Modified to ${pct}%)`
      : 'Default: 100% (1-for-1)';
  }
}

// Sync the Buy Percentage slider and number input in real time
function syncQMBuybackInput(source) {
  const sliderEl = document.getElementById('qm-buyback-slider');
  const numEl = document.getElementById('qm-buyback-num');
  if (!sliderEl || !numEl) return;

  if (source === 'slider') {
    numEl.value = sliderEl.value;
  } else {
    const raw = parseFloat(numEl.value);
    if (Number.isFinite(raw)) {
      const clamped = Math.max(0, Math.min(100, Math.round(raw)));
      sliderEl.value = String(clamped);
    }
  }
}

// Save the realm's Buy Percentage (0-100%)
async function qmSaveBuybackPercent() {
  const numEl = document.getElementById('qm-buyback-num');
  const sliderEl = document.getElementById('qm-buyback-slider');
  const raw = parseFloat(numEl ? numEl.value : (sliderEl ? sliderEl.value : '100'));
  const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 100;

  currentRealmItemConfig.buyback_percent = pct;
  await saveRealmItemConfig(currentRealmItemConfig);
  alert(`Buy-back percentage saved (${pct}%)!`);
}

// Reset the realm's Buy Percentage back to 100% (1-for-1)
async function qmResetBuybackPercent() {
  if (getActiveBuybackPercent(currentRealmItemConfig) === 100) {
    alert('Buy-back percentage is already set to the default 100% (1-for-1).');
    return;
  }
  if (!confirm('Reset buy-back percentage back to 100% (1-for-1)?')) {
    return;
  }
  currentRealmItemConfig.buyback_percent = 100;
  await saveRealmItemConfig(currentRealmItemConfig);
}

// Render the QM Item Economy & Custom Item list inside #qm-item-economy-list
function renderQMItemsPanel() {
  renderQMLootDropControls();
  renderQMBuybackControls();
  fetchQMRealmPlayers(false);
  const container = document.getElementById('qm-item-economy-list');
  if (!container) return;

  const categories = [
    { key: 'Trinket', label: 'Trinkets' },
    { key: 'Talismans', label: 'Talismans' },
    { key: 'Artifacts', label: 'Artifacts' }
  ];

  container.innerHTML = categories.map(catObj => {
    const items = STORE_CATALOG.filter(item => normalizeCatalogCategory(item.category) === catObj.key);

    const rowsHtml = items.map(item => {
      const safeId = String(item.id).replace(/'/g, "\\'");
      const escapedName = String(item.item_name || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      if (item.is_custom) {
        return `<div class="qm-economy-item-row" data-item-id="${item.id}" data-is-custom="true" style="display:grid; grid-template-columns: minmax(120px, 1fr) 74px 74px; gap:8px; align-items:center; padding:8px 10px; background:#121214; border:1px solid #27272a; border-radius:6px; margin-bottom:6px;">
          <div style="min-width:0;">
            <input type="text" id="qm-item-name-${item.id}" class="form-control" value="${escapedName}" style="margin:0 0 4px 0; padding:5px 8px; font-size:13px;" title="Custom Item Name">
            <div style="display:flex; align-items:center; gap:6px;">
              <select id="qm-item-cat-${item.id}" class="form-control" style="margin:0; padding:3px 6px; font-size:11px; width:auto;" title="Item Type">
                <option value="Trinket" ${catObj.key === 'Trinket' ? 'selected' : ''}>Trinket</option>
                <option value="Talismans" ${catObj.key === 'Talismans' ? 'selected' : ''}>Talisman</option>
                <option value="Artifacts" ${catObj.key === 'Artifacts' ? 'selected' : ''}>Artifact</option>
              </select>
              <button type="button" class="btn-delete" style="width:auto; padding:3px 7px; font-size:11px; border-radius:4px; margin:0;" onclick="qmDeleteCustomItem('${safeId}')" title="Delete custom item">Delete</button>
            </div>
          </div>
          <div>
            <input type="number" id="qm-item-cost-${item.id}" class="form-control" value="${item.base_cost}" min="0" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;" title="Cost">
          </div>
          <div>
            <input type="number" id="qm-item-dur-${item.id}" class="form-control" value="${item.durability_max}" min="1" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;" title="Durability">
          </div>
        </div>`;
      }

      const defCost = item.default_cost ?? item.base_cost;
      const defDur = item.default_durability ?? item.durability_max;
      const isModified = (item.base_cost !== defCost || item.durability_max !== defDur);

      return `<div class="qm-economy-item-row" data-item-id="${item.id}" data-is-custom="false" style="display:grid; grid-template-columns: minmax(120px, 1fr) 74px 74px; gap:8px; align-items:center; padding:8px 10px; background:#121214; border:1px solid ${isModified ? '#52525b' : '#27272a'}; border-radius:6px; margin-bottom:6px;">
        <div style="min-width:0;">
          <div style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapedName}</div>
          <small style="font-size:11px; color:var(--text-muted);">Default: ${defCost}g &bull; ${defDur} dur${isModified ? ' (Modified)' : ''}</small>
        </div>
        <div>
          <input type="number" id="qm-item-cost-${item.id}" class="form-control" value="${item.base_cost}" min="0" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;" title="Cost">
        </div>
        <div>
          <input type="number" id="qm-item-dur-${item.id}" class="form-control" value="${item.durability_max}" min="1" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;" title="Durability">
        </div>
      </div>`;
    }).join('');

    return `<details class="store-category" open style="margin-bottom:12px;">
      <summary class="store-category-summary" style="display:flex; justify-content:space-between; align-items:center;">
        <span>${catObj.label} (${items.length})</span>
      </summary>
      <div style="padding:8px 4px 2px 4px;">
        <div style="display:grid; grid-template-columns: minmax(120px, 1fr) 74px 74px; gap:8px; padding:0 10px 6px 10px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
          <span>Item</span>
          <span style="text-align:center;">Cost</span>
          <span style="text-align:center;">Durability</span>
        </div>
        ${rowsHtml || '<p class="empty-state" style="margin:6px 0;">No items in this category.</p>'}
      </div>
    </details>`;
  }).join('');
}

// Save a single item row (baked-in override or custom item edit)
async function qmSaveSingleItem(itemId) {
  const costInput = document.getElementById(`qm-item-cost-${itemId}`);
  const durInput = document.getElementById(`qm-item-dur-${itemId}`);
  if (!costInput || !durInput) return;

  const newCost = Math.max(0, Math.round(Number(costInput.value) || 0));
  const newDur = Math.max(1, Math.round(Number(durInput.value) || 1));

  const customIndex = (currentRealmItemConfig.custom_items || []).findIndex(ci => ci.id === itemId);
  if (customIndex !== -1) {
    const nameInput = document.getElementById(`qm-item-name-${itemId}`);
    const catSelect = document.getElementById(`qm-item-cat-${itemId}`);
    const updatedName = (nameInput?.value || '').trim();
    if (!updatedName) {
      alert('Custom item name cannot be empty.');
      return;
    }
    currentRealmItemConfig.custom_items[customIndex] = {
      ...currentRealmItemConfig.custom_items[customIndex],
      item_name: updatedName,
      category: normalizeCatalogCategory(catSelect?.value || currentRealmItemConfig.custom_items[customIndex].category),
      base_cost: newCost,
      durability_max: newDur
    };
  } else {
    const defItem = (typeof DEFAULT_STORE_CATALOG !== 'undefined' ? DEFAULT_STORE_CATALOG : []).find(d => d.id === itemId);
    if (!defItem) return;

    if (!currentRealmItemConfig.overrides) currentRealmItemConfig.overrides = {};
    if (newCost === defItem.base_cost && newDur === defItem.durability_max) {
      delete currentRealmItemConfig.overrides[itemId];
    } else {
      currentRealmItemConfig.overrides[itemId] = {
        base_cost: newCost,
        durability_max: newDur
      };
    }
  }

  await saveRealmItemConfig(currentRealmItemConfig);
}

// Save all modified item rows across the entire catalog at once
async function qmSaveAllItemEconomy() {
  const rows = document.querySelectorAll('.qm-economy-item-row');
  if (!rows || rows.length === 0) return;

  const nextOverrides = { ...(currentRealmItemConfig.overrides || {}) };
  const nextCustomItems = [...(currentRealmItemConfig.custom_items || [])];
  const baseDefaults = (typeof DEFAULT_STORE_CATALOG !== 'undefined' && Array.isArray(DEFAULT_STORE_CATALOG))
    ? DEFAULT_STORE_CATALOG
    : [];

  for (const row of rows) {
    const itemId = row.getAttribute('data-item-id');
    const isCustom = row.getAttribute('data-is-custom') === 'true';
    const costInput = document.getElementById(`qm-item-cost-${itemId}`);
    const durInput = document.getElementById(`qm-item-dur-${itemId}`);
    if (!itemId || !costInput || !durInput) continue;

    const newCost = Math.max(0, Math.round(Number(costInput.value) || 0));
    const newDur = Math.max(1, Math.round(Number(durInput.value) || 1));

    if (isCustom) {
      const idx = nextCustomItems.findIndex(ci => ci.id === itemId);
      if (idx !== -1) {
        const nameInput = document.getElementById(`qm-item-name-${itemId}`);
        const catSelect = document.getElementById(`qm-item-cat-${itemId}`);
        const trimmedName = (nameInput?.value || '').trim() || nextCustomItems[idx].item_name;
        nextCustomItems[idx] = {
          ...nextCustomItems[idx],
          item_name: trimmedName,
          category: normalizeCatalogCategory(catSelect?.value || nextCustomItems[idx].category),
          base_cost: newCost,
          durability_max: newDur
        };
      }
    } else {
      const defItem = baseDefaults.find(d => d.id === itemId);
      if (!defItem) continue;
      if (newCost === defItem.base_cost && newDur === defItem.durability_max) {
        delete nextOverrides[itemId];
      } else {
        nextOverrides[itemId] = {
          base_cost: newCost,
          durability_max: newDur
        };
      }
    }
  }

  currentRealmItemConfig.overrides = nextOverrides;
  currentRealmItemConfig.custom_items = nextCustomItems;
  if (document.getElementById('qm-loot-num-trinket-0')) {
    currentRealmItemConfig.loot_rates = readQMLootDropInputsFromDOM();
  }

  await saveRealmItemConfig(currentRealmItemConfig);
  alert('Store catalog & item economy saved!');
}

// Reset a single baked-in item back to its default Cost & Durability
async function qmResetSingleItem(itemId) {
  if (currentRealmItemConfig.overrides && currentRealmItemConfig.overrides[itemId]) {
    delete currentRealmItemConfig.overrides[itemId];
    await saveRealmItemConfig(currentRealmItemConfig);
  }
}

// Reset all baked-in items back to their default Cost & Durability
async function qmResetAllItemDefaults() {
  const hasOverrides = currentRealmItemConfig.overrides && Object.keys(currentRealmItemConfig.overrides).length > 0;
  if (!hasOverrides) {
    alert('All baked-in items are already set to their default cost and durability.');
    return;
  }

  if (!confirm('Reset all baked-in items back to their default cost and durability? (Your custom items will be kept.)')) {
    return;
  }

  currentRealmItemConfig.overrides = {};
  await saveRealmItemConfig(currentRealmItemConfig);
}

// Delete a custom item from the park catalog
async function qmDeleteCustomItem(itemId) {
  const target = (currentRealmItemConfig.custom_items || []).find(ci => ci.id === itemId);
  const label = target?.item_name || 'this custom item';
  if (!confirm(`Delete custom item "${label}" from the store?`)) return;

  currentRealmItemConfig.custom_items = (currentRealmItemConfig.custom_items || []).filter(ci => ci.id !== itemId);
  await saveRealmItemConfig(currentRealmItemConfig);
}

// Roll Mystery Item Loot Drops for winning adventurers
async function rollItemLootDrops(winnerUserIds, isBattle = true, customQMId = null, customPark = null, customKingdom = null) {
  if (!Array.isArray(winnerUserIds) || winnerUserIds.length === 0) return [];
  const activePark = customPark || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const activeKingdom = customKingdom || (typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard");
  const activeQMId = (customQMId !== undefined && customQMId !== null) ? customQMId : (currentQMId || null);

  const trinketItems = STORE_CATALOG.filter(i => i.category === 'Trinket' || i.category === 'Trinkets');
  const talismanItems = STORE_CATALOG.filter(i => i.category === 'Talisman' || i.category === 'Talismans');
  const artifactItems = STORE_CATALOG.filter(i => i.category === 'Artifact' || i.category === 'Artifacts' || i.category === 'Legendary');

  const dropSlots = getActiveLootDropSlots(currentRealmItemConfig);

  // Fetch usernames so we can report drops clearly to the QM & UI
  let usernameMap = new Map();
  try {
    const { data: userProfiles } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .in('id', winnerUserIds);

    (userProfiles || []).forEach(p => {
      if (p && p.id) usernameMap.set(p.id, p.username || 'Adventurer');
    });
  } catch (err) {
    console.warn("Could not fetch user profiles for loot drop report", err);
  }

  const allAwardedDrops = [];

  for (const uid of winnerUserIds) {
    const wonItems = [];

    // Trinket rolls (3 individual drop slots, default 25% each)
    for (const pct of (dropSlots.trinket || [25, 25, 25])) {
      const chance = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
      if (chance > 0 && Math.random() < chance && trinketItems.length > 0) {
        const picked = trinketItems[Math.floor(Math.random() * trinketItems.length)];
        wonItems.push(picked);
      }
    }

    // Talisman rolls (2 individual drop slots, default 5% each)
    for (const pct of (dropSlots.talisman || [5, 5])) {
      const chance = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
      if (chance > 0 && Math.random() < chance && talismanItems.length > 0) {
        const picked = talismanItems[Math.floor(Math.random() * talismanItems.length)];
        wonItems.push(picked);
      }
    }

    // Artifact rolls (1 individual drop slot, default 0.4%)
    for (const pct of (dropSlots.artifact || [0.4])) {
      const chance = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
      if (chance > 0 && Math.random() < chance && artifactItems.length > 0) {
        const picked = artifactItems[Math.floor(Math.random() * artifactItems.length)];
        wonItems.push(picked);
      }
    }

    if (wonItems.length === 0) continue;

    // Fetch user inventory to check capacity
    const { data: userItems, error: invFetchErr } = await supabaseClient
      .from('user_inventory')
      .select('*')
      .eq('user_id', uid)
      .eq('park', activePark);

    if (invFetchErr) {
      console.error(`Error fetching inventory for user ${uid} during loot roll:`, invFetchErr);
    }

    const parkItems = (userItems || []).filter(item => !item.qm_id || !activeQMId || item.qm_id === activeQMId);
    let runningPouch = parkItems.filter(item => !item.storage_location || item.storage_location === 'pouch');
    let runningBank = parkItems.filter(item => item.storage_location === 'bank');

    const awardedNames = [];

    for (const item of wonItems) {
      const cat = getCategoryForItemName(item.item_name);
      let normCat = cat;
      if (normCat === 'Talisman') normCat = 'Talismans';
      if (normCat === 'Artifact' || normCat === 'Legendary') normCat = 'Artifacts';
      if (normCat === 'Trinkets') normCat = 'Trinket';

      const pouchLimit = (STORAGE_LIMITS.pouch && (STORAGE_LIMITS.pouch[normCat] || STORAGE_LIMITS.pouch[cat])) || 1;
      const bankLimit = (STORAGE_LIMITS.bank && (STORAGE_LIMITS.bank[normCat] || STORAGE_LIMITS.bank[cat])) || 1;

      const pouchCount = runningPouch.filter(i => {
        let c = getCategoryForItemName(i.item_name);
        if (c === 'Talisman') c = 'Talismans';
        if (c === 'Artifact' || c === 'Legendary') c = 'Artifacts';
        if (c === 'Trinkets') c = 'Trinket';
        return c === normCat;
      }).length;

      const bankCount = runningBank.filter(i => {
        let c = getCategoryForItemName(i.item_name);
        if (c === 'Talisman') c = 'Talismans';
        if (c === 'Artifact' || c === 'Legendary') c = 'Artifacts';
        if (c === 'Trinkets') c = 'Trinket';
        return c === normCat;
      }).length;

      let destLocation = null;
      if (pouchCount < pouchLimit) {
        destLocation = 'pouch';
      } else if (bankCount < bankLimit) {
        destLocation = 'bank';
      }

      if (!destLocation) {
        console.warn(`Loot drop: User ${uid} has full pouch and bank for ${normCat}. Item "${item.item_name}" could not be stored.`);
        continue;
      }

      const durMax = item.durability_max || (typeof getItemDurabilityMax === 'function' ? getItemDurabilityMax(item.item_name) : 1);

      const payload = {
        user_id: uid,
        item_name: item.item_name,
        base_cost: item.base_cost || 1,
        quantity: 1,
        durability_current: durMax,
        durability_max: durMax,
        storage_location: destLocation,
        park: activePark,
        kingdom: activeKingdom,
        qm_id: activeQMId
      };

      let insPayload = { ...payload };
      let { error: insErr } = await supabaseClient.from('user_inventory').insert(insPayload);
      if (insErr && insErr.message && insErr.message.includes('qm_id')) {
        delete insPayload.qm_id;
        const retry = await supabaseClient.from('user_inventory').insert(insPayload);
        insErr = retry.error;
      }
      if (insErr && insErr.message && insErr.message.includes('storage_location')) {
        delete insPayload.storage_location;
        const retry = await supabaseClient.from('user_inventory').insert(insPayload);
        insErr = retry.error;
      }

      if (insErr) {
        console.error(`Failed to insert loot drop item "${item.item_name}" for user ${uid}:`, insErr);
      } else {
        awardedNames.push(`${item.item_name} (${destLocation === 'pouch' ? '🎒 Pouch' : '🏦 Bank'})`);
        if (destLocation === 'pouch') runningPouch.push(payload);
        else runningBank.push(payload);
      }
    }

    if (awardedNames.length > 0) {
      allAwardedDrops.push({
        userId: uid,
        username: usernameMap.get(uid) || 'Adventurer',
        items: awardedNames
      });

      if (currentUser && currentUser.id === uid) {
        alert(`🎲 MYSTERY LOOT DROP!\n\nYou discovered:\n• ${awardedNames.join('\n• ')}`);
        try {
          localStorage.setItem('qf_last_inventory_seen_' + currentUser.id, new Date().toISOString());
        } catch (e) {}
      }
    }
  }

  return allAwardedDrops;
}

// ==============================================================================
// Phase 4: Editable Player Items & Gold (QM Player Inspector)
// ==============================================================================

let qmRealmPlayersCache = [];
let qmSelectedPlayerId = null;

// Fetch all players affiliated with the active park & QM realm
async function fetchQMRealmPlayers(forceRefresh = false) {
  const resultsEl = document.getElementById('qm-player-search-results');
  if (!resultsEl) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser?.id || null;
  const normActivePark = (typeof normalizeParkName === 'function')
    ? normalizeParkName(activePark)
    : String(activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();

  try {
    const [profilesRes, parkProfilesRes, invRes] = await Promise.all([
      supabaseClient.from('profiles').select('id, username, gold, park, last_active_park, last_active_qm_id'),
      supabaseClient.from('user_park_profiles').select('id, user_id, park, qm_id, gold, role'),
      supabaseClient.from('user_inventory').select('user_id, park, qm_id')
    ]);

    const allProfiles = profilesRes.data || [];
    const allParkProfiles = parkProfilesRes.data || [];
    const allInvRows = invRes.data || [];

    const normMatch = (pName) => {
      if (!pName) return false;
      const n = (typeof normalizeParkName === 'function')
        ? normalizeParkName(pName)
        : String(pName).replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
      return n === normActivePark;
    };

    const parkSheetByUser = new Map();
    allParkProfiles.forEach(pp => {
      if (!pp || !pp.user_id) return;
      if (normMatch(pp.park) && (!pp.qm_id || !activeQMId || pp.qm_id === activeQMId)) {
        const existing = parkSheetByUser.get(pp.user_id);
        if (!existing || (activeQMId && pp.qm_id === activeQMId)) {
          parkSheetByUser.set(pp.user_id, pp);
        }
      }
    });

    const invUserIdsInPark = new Set();
    allInvRows.forEach(ir => {
      if (ir && ir.user_id && normMatch(ir.park) && (!ir.qm_id || !activeQMId || ir.qm_id === activeQMId)) {
        invUserIdsInPark.add(ir.user_id);
      }
    });

    let realmPlayers = allProfiles
      .filter(prof => {
        if (!prof || !prof.id) return false;
        const inParkProfile = parkSheetByUser.has(prof.id);
        const inInv = invUserIdsInPark.has(prof.id);
        const homeOrActiveMatch = normMatch(prof.park) || normMatch(prof.last_active_park);
        return inParkProfile || inInv || homeOrActiveMatch;
      })
      .map(prof => {
        const sheet = parkSheetByUser.get(prof.id);
        const gold = sheet !== undefined ? (Number(sheet.gold) || 0) : (Number(prof.gold) || 0);
        return {
          userId: prof.id,
          username: prof.username || 'Adventurer',
          gold,
          parkProfileId: sheet?.id || null
        };
      });

    // Fallback: if no players matched the park filter yet, include all profiles so QM can still search anyone
    if (realmPlayers.length === 0 && allProfiles.length > 0) {
      realmPlayers = allProfiles.map(prof => {
        const sheet = parkSheetByUser.get(prof.id);
        return {
          userId: prof.id,
          username: prof.username || 'Adventurer',
          gold: sheet !== undefined ? (Number(sheet.gold) || 0) : (Number(prof.gold) || 0),
          parkProfileId: sheet?.id || null
        };
      });
    }

    realmPlayers.sort((a, b) => a.username.localeCompare(b.username));
    qmRealmPlayersCache = realmPlayers;

    if (qmSelectedPlayerId) {
      await renderQMSelectedPlayerPanel(qmSelectedPlayerId);
    }
  } catch (err) {
    console.warn('Error fetching realm players for QM inspector:', err);
  }
}

// Close the player search dropdown when clicking outside
if (typeof document !== 'undefined' && !window.__qmPlayerDropdownListenerBound) {
  window.__qmPlayerDropdownListenerBound = true;
  document.addEventListener('click', (e) => {
    const searchInput = document.getElementById('qm-player-search-input');
    const resultsEl = document.getElementById('qm-player-search-results');
    if (!resultsEl || resultsEl.classList.contains('hidden')) return;
    if (searchInput && (searchInput.contains(e.target) || resultsEl.contains(e.target))) return;
    resultsEl.classList.add('hidden');
  });
}

// Auto-populating dropdown list matching the search box
function filterQMRealmPlayers() {
  const resultsEl = document.getElementById('qm-player-search-results');
  const searchInput = document.getElementById('qm-player-search-input');
  if (!resultsEl || !searchInput) return;

  const query = (searchInput.value || '').trim().toLowerCase();
  const filtered = qmRealmPlayersCache.filter(p => !query || p.username.toLowerCase().includes(query));

  resultsEl.classList.remove('hidden');

  if (filtered.length === 0) {
    resultsEl.innerHTML = `<div style="padding:10px 12px; font-size:12px; color:var(--text-muted);">No matching players found.</div>`;
    return;
  }

  resultsEl.innerHTML = filtered.map(p => {
    const isSelected = p.userId === qmSelectedPlayerId;
    const escapedName = String(p.username)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div onclick="selectQMPlayerForEdit('${p.userId}')" style="padding:9px 12px; font-size:13px; font-weight:600; cursor:pointer; background:${isSelected ? '#27272a' : 'transparent'}; color:var(--text); border-bottom:1px solid #27272a; display:flex; justify-content:space-between; align-items:center;">
      <span>${escapedName}</span>
      <span style="color:var(--text-muted); font-size:12px;">${p.gold}g</span>
    </div>`;
  }).join('');
}

// Select a player from the dropdown to inspect & edit their Gold, Pouch, and Inventory
async function selectQMPlayerForEdit(userId) {
  qmSelectedPlayerId = userId || null;
  const cachedPlayer = qmRealmPlayersCache.find(p => p.userId === userId);
  const searchInput = document.getElementById('qm-player-search-input');
  const resultsEl = document.getElementById('qm-player-search-results');

  if (searchInput && cachedPlayer) {
    searchInput.value = cachedPlayer.username;
  }
  if (resultsEl) {
    resultsEl.classList.add('hidden');
  }

  await renderQMSelectedPlayerPanel(qmSelectedPlayerId);
}

// Render the selected player's 3 clearly defined sub-boxes:
// 1. Give Players Gold
// 2. Give Player Items
// 3. Edit Pouch/Inventory
async function renderQMSelectedPlayerPanel(userId) {
  const panel = document.getElementById('qm-selected-player-panel');
  if (!panel) return;

  if (!userId) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }

  panel.classList.remove('hidden');

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser?.id || null;
  const cachedPlayer = qmRealmPlayersCache.find(p => p.userId === userId);
  const playerName = cachedPlayer?.username || 'Adventurer';
  const escapedPlayerName = String(playerName).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Fetch fresh gold & inventory for this player
  let playerGold = cachedPlayer?.gold ?? 0;
  let parkProfileId = cachedPlayer?.parkProfileId || null;

  try {
    let sheetQuery = supabaseClient
      .from('user_park_profiles')
      .select('id, gold, qm_id')
      .eq('user_id', userId)
      .eq('park', activePark);

    const { data: sheetRows } = await sheetQuery;
    if (Array.isArray(sheetRows) && sheetRows.length > 0) {
      const matchedSheet = sheetRows.find(r => !r.qm_id || !activeQMId || r.qm_id === activeQMId) || sheetRows[0];
      if (matchedSheet) {
        parkProfileId = matchedSheet.id;
        playerGold = Number(matchedSheet.gold) || 0;
        if (cachedPlayer) {
          cachedPlayer.gold = playerGold;
          cachedPlayer.parkProfileId = parkProfileId;
        }
      }
    }
  } catch (_) {}

  const { data: rawItems } = await supabaseClient
    .from('user_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('park', activePark);

  const playerItems = (rawItems || []).filter(item => !item.qm_id || !activeQMId || item.qm_id === activeQMId);
  const pouchItems = playerItems.filter(item => !item.storage_location || item.storage_location === 'pouch');
  const bankItems = playerItems.filter(item => item.storage_location === 'bank');

  // Build Store Catalog options for granting an item
  const catOrder = [
    { key: 'Trinket', label: 'Trinkets' },
    { key: 'Talismans', label: 'Talismans' },
    { key: 'Artifacts', label: 'Artifacts' }
  ];

  const catalogOptionsHtml = catOrder.map(cObj => {
    const cItems = STORE_CATALOG.filter(i => normalizeCatalogCategory(i.category) === cObj.key);
    if (cItems.length === 0) return '';
    return `<optgroup label="${cObj.label}">
      ${cItems.map(i => {
        const esc = String(i.item_name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `<option value="${esc}" data-dur="${i.durability_max || 1}" data-cost="${i.base_cost || 0}">${esc} (${i.base_cost}g • ${i.durability_max} dur)</option>`;
      }).join('')}
    </optgroup>`;
  }).join('');

  const firstCatalogDur = STORE_CATALOG[0]?.durability_max || 1;

  const renderEditableItemRow = (item) => {
    const itemName = item.item_name || 'Item';
    const escName = String(itemName).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const maxDur = Number(item.durability_max) || (typeof getItemDurabilityMax === 'function' ? getItemDurabilityMax(itemName) : 1);
    const curDur = item.durability_current !== undefined && item.durability_current !== null ? Number(item.durability_current) : maxDur;
    const loc = item.storage_location === 'bank' ? 'bank' : 'pouch';

    return `<div class="qm-player-inv-row" data-inv-id="${item.id}" style="padding:8px 10px; background:#18181b; border:1px solid #27272a; border-radius:6px; margin-bottom:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
        <div style="font-size:13px; font-weight:600; color:var(--text); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escName}</div>
        <button type="button" class="btn-delete" style="width:auto; padding:3px 8px; font-size:11px; border-radius:4px; margin:0; flex-shrink:0;" onclick="qmDeletePlayerInventoryItem('${item.id}')" title="Remove item">✕</button>
      </div>
      <div style="display:grid; grid-template-columns: 1.2fr 1fr 1fr; gap:8px; align-items:end;">
        <div>
          <label style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:2px;">Location</label>
          <select id="qm-pitem-loc-${item.id}" class="form-control" style="margin:0; padding:5px 6px; font-size:12px;">
            <option value="pouch" ${loc === 'pouch' ? 'selected' : ''}>Pouch</option>
            <option value="bank" ${loc === 'bank' ? 'selected' : ''}>Inventory</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:2px; text-align:center;">Cur Dur</label>
          <input type="number" id="qm-pitem-cur-${item.id}" class="form-control" value="${curDur}" min="0" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;">
        </div>
        <div>
          <label style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:2px; text-align:center;">Max Dur</label>
          <input type="number" id="qm-pitem-max-${item.id}" class="form-control" value="${maxDur}" min="1" style="margin:0; padding:5px 6px; font-size:13px; text-align:center;">
        </div>
      </div>
    </div>`;
  };

  panel.innerHTML = `
    <!-- Box 1: Give Players Gold -->
    <div style="background:#121214; border:1px solid #27272a; padding:12px; border-radius:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:13px; font-weight:700; color:var(--text);">Give Players Gold</span>
        <span style="font-size:12px; color:var(--text-muted);">${escapedPlayerName}</span>
      </div>
      <div style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center;">
        <input type="number" id="qm-edit-player-gold" class="form-control" value="${playerGold}" min="0" style="margin:0; padding:8px 10px; font-size:14px;">
        <button type="button" class="btn btn-primary" style="width:auto; padding:8px 16px; font-size:13px; font-weight:700; border-radius:6px; margin:0;" onclick="qmSavePlayerGold(false)">Save Gold</button>
      </div>
    </div>

    <!-- Box 2: Give Player Items -->
    <div style="background:#121214; border:1px solid #27272a; padding:12px; border-radius:6px;">
      <div style="font-size:13px; font-weight:700; color:var(--text); margin-bottom:8px;">Give Player Items</div>
      <div style="margin-bottom:8px;">
        <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:3px;">Item</label>
        <select id="qm-grant-item-select" class="form-control" style="margin:0; padding:7px 8px; font-size:13px;" onchange="onQMGrantItemSelectChange()">
          ${catalogOptionsHtml}
        </select>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:10px;">
        <div>
          <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:3px;">Location</label>
          <select id="qm-grant-item-location" class="form-control" style="margin:0; padding:7px 8px; font-size:13px;">
            <option value="pouch" selected>Pouch</option>
            <option value="bank">Inventory</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:3px;">Durability</label>
          <input type="number" id="qm-grant-item-durability" class="form-control" value="${firstCatalogDur}" min="1" style="margin:0; padding:7px 8px; font-size:13px; text-align:center;">
        </div>
      </div>
      <button type="button" class="btn btn-primary" style="width:100%; padding:10px; font-size:13px; font-weight:700; border-radius:6px; margin:0;" onclick="qmGrantItemToPlayer()">Add Item</button>
    </div>

    <!-- Box 3: Edit Pouch/Inventory -->
    <div style="background:#121214; border:1px solid #27272a; padding:12px; border-radius:6px;">
      <div style="font-size:13px; font-weight:700; color:var(--text); margin-bottom:8px;">Edit Pouch/Inventory</div>

      <div style="margin-bottom:10px;">
        <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Pouch (${pouchItems.length})</div>
        ${pouchItems.length > 0 ? pouchItems.map(renderEditableItemRow).join('') : '<p class="empty-state" style="margin:4px 0 8px 0; font-size:12px;">No items in Pouch.</p>'}
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Inventory (${bankItems.length})</div>
        ${bankItems.length > 0 ? bankItems.map(renderEditableItemRow).join('') : '<p class="empty-state" style="margin:4px 0 0 0; font-size:12px;">No items in Inventory.</p>'}
      </div>

      ${playerItems.length > 0 ? `<button type="button" class="btn btn-primary" style="width:100%; padding:10px; font-size:13px; font-weight:700; border-radius:6px; margin:0;" onclick="qmSaveAllPlayerChanges()">Save Pouch/Inventory</button>` : ''}
    </div>
  `;
}

// Auto-fill max durability when selecting an item to grant to a player
function onQMGrantItemSelectChange() {
  const selectEl = document.getElementById('qm-grant-item-select');
  const durInput = document.getElementById('qm-grant-item-durability');
  if (!selectEl || !durInput) return;

  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  const dur = selectedOpt ? parseInt(selectedOpt.getAttribute('data-dur') || '1', 10) : 1;
  durInput.value = String(Math.max(1, dur || 1));
}

// Save edited Gold for the selected player
async function qmSavePlayerGold(silent = false) {
  if (!qmSelectedPlayerId) return;
  const goldInput = document.getElementById('qm-edit-player-gold');
  if (!goldInput) return;

  const newGold = Math.max(0, Math.round(Number(goldInput.value) || 0));
  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;

  try {
    const { data: rows } = await supabaseClient
      .from('user_park_profiles')
      .select('id, qm_id')
      .eq('user_id', qmSelectedPlayerId)
      .eq('park', activePark);

    const matchedRow = (rows || []).find(r => !r.qm_id || !activeQMId || r.qm_id === activeQMId) || (rows || [])[0];

    if (matchedRow) {
      await supabaseClient
        .from('user_park_profiles')
        .update({ gold: newGold })
        .eq('id', matchedRow.id);
    } else {
      await supabaseClient
        .from('user_park_profiles')
        .insert({
          user_id: qmSelectedPlayerId,
          park: activePark,
          kingdom: activeKingdom,
          qm_id: activeQMId,
          role: 'player',
          gold: newGold
        });
    }

    // Also update base profiles.gold as fallback
    await supabaseClient
      .from('profiles')
      .update({ gold: newGold })
      .eq('id', qmSelectedPlayerId);

    // Update cache & UI
    const cached = qmRealmPlayersCache.find(p => p.userId === qmSelectedPlayerId);
    if (cached) cached.gold = newGold;

    // If editing the currently logged-in user, sync header gold immediately
    if (currentUser && currentUser.id === qmSelectedPlayerId) {
      if (currentParkProfile) currentParkProfile.gold = newGold;
      if (currentProfile) currentProfile.gold = newGold;
      if (typeof syncGoldDisplays === 'function') syncGoldDisplays(newGold);
    }

    if (!silent) {
      alert(`Updated player gold to ${newGold}g!`);
    }
  } catch (err) {
    console.error('Error saving player gold:', err);
    if (!silent) alert('Failed to update player gold: ' + (err.message || err));
  }
}

// Grant / Add an item from the catalog to the selected player's Pouch or Inventory
async function qmGrantItemToPlayer() {
  if (!qmSelectedPlayerId) return;

  const selectEl = document.getElementById('qm-grant-item-select');
  const locEl = document.getElementById('qm-grant-item-location');
  const durEl = document.getElementById('qm-grant-item-durability');
  if (!selectEl || !selectEl.value) return;

  const itemName = selectEl.value;
  const storage_location = locEl?.value === 'bank' ? 'bank' : 'pouch';
  const catalogMatch = STORE_CATALOG.find(i => i.item_name === itemName);
  const durVal = Math.max(1, Math.round(Number(durEl?.value) || catalogMatch?.durability_max || 1));
  const costVal = catalogMatch?.base_cost ?? 1;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const activeQMId = currentQMId || currentUser?.id || null;

  const payload = {
    user_id: qmSelectedPlayerId,
    item_name: itemName,
    base_cost: costVal,
    quantity: 1,
    durability_current: durVal,
    durability_max: durVal,
    storage_location,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: activeQMId
  };

  let insPayload = { ...payload };
  let { error } = await supabaseClient.from('user_inventory').insert(insPayload);
  if (error && error.message && error.message.includes('qm_id')) {
    delete insPayload.qm_id;
    const retry = await supabaseClient.from('user_inventory').insert(insPayload);
    error = retry.error;
  }
  if (error && error.message && error.message.includes('storage_location')) {
    delete insPayload.storage_location;
    const retry = await supabaseClient.from('user_inventory').insert(insPayload);
    error = retry.error;
  }

  if (error) {
    alert('Failed to add item to player: ' + error.message);
    return;
  }

  await renderQMSelectedPlayerPanel(qmSelectedPlayerId);
  if (currentUser && currentUser.id === qmSelectedPlayerId && typeof fetchUserInventory === 'function') {
    await fetchUserInventory();
  }
}

// Save edits to a single item in the selected player's Pouch / Inventory
async function qmSavePlayerInventoryItem(invId, silent = false) {
  if (!invId) return;

  const locEl = document.getElementById(`qm-pitem-loc-${invId}`);
  const curEl = document.getElementById(`qm-pitem-cur-${invId}`);
  const maxEl = document.getElementById(`qm-pitem-max-${invId}`);
  if (!curEl || !maxEl) return;

  const storage_location = locEl?.value === 'bank' ? 'bank' : 'pouch';
  const durability_max = Math.max(1, Math.round(Number(maxEl.value) || 1));
  const durability_current = Math.max(0, Math.round(Number(curEl.value) ?? durability_max));

  const { error } = await supabaseClient
    .from('user_inventory')
    .update({
      storage_location,
      durability_current,
      durability_max
    })
    .eq('id', invId);

  if (error) {
    if (!silent) alert('Failed to update item: ' + error.message);
    return;
  }

  if (!silent) {
    await renderQMSelectedPlayerPanel(qmSelectedPlayerId);
    if (currentUser && currentUser.id === qmSelectedPlayerId && typeof fetchUserInventory === 'function') {
      await fetchUserInventory();
    }
  }
}

// Delete an item from the selected player's Pouch / Inventory
async function qmDeletePlayerInventoryItem(invId) {
  if (!invId) return;
  if (!confirm('Remove this item from the player?')) return;

  const { error } = await supabaseClient
    .from('user_inventory')
    .delete()
    .eq('id', invId);

  if (error) {
    alert('Failed to remove item: ' + error.message);
    return;
  }

  await renderQMSelectedPlayerPanel(qmSelectedPlayerId);
  if (currentUser && currentUser.id === qmSelectedPlayerId && typeof fetchUserInventory === 'function') {
    await fetchUserInventory();
  }
}

// Save Gold + all edited Pouch/Inventory items for the selected player in one click
async function qmSaveAllPlayerChanges() {
  if (!qmSelectedPlayerId) return;

  await qmSavePlayerGold(true);

  const itemRows = document.querySelectorAll('.qm-player-inv-row');
  const savePromises = [];
  for (const row of itemRows) {
    const invId = row.getAttribute('data-inv-id');
    if (invId) {
      savePromises.push(qmSavePlayerInventoryItem(invId, true));
    }
  }
  await Promise.allSettled(savePromises);

  await renderQMSelectedPlayerPanel(qmSelectedPlayerId);
  if (currentUser && currentUser.id === qmSelectedPlayerId && typeof fetchUserInventory === 'function') {
    await fetchUserInventory();
  }

  alert('Player gold and inventory changes saved!');
}

