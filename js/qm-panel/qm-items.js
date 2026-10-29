// ==============================================================================
// Quest-Forge: QM Panel — QM Item Management & RNG Loot Engine (#qm-subtab-items)
// ==============================================================================

// Roll Mystery Item Loot Drops for winning adventurers
async function rollItemLootDrops(winnerUserIds, isBattle = true, customQMId = null, customPark = null, customKingdom = null) {
  if (!Array.isArray(winnerUserIds) || winnerUserIds.length === 0) return [];
  const activePark = customPark || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const activeKingdom = customKingdom || (typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard");
  const activeQMId = (customQMId !== undefined && customQMId !== null) ? customQMId : (currentQMId || null);

  const trinketItems = STORE_CATALOG.filter(i => i.category === 'Trinket' || i.category === 'Trinkets');
  const talismanItems = STORE_CATALOG.filter(i => i.category === 'Talisman' || i.category === 'Talismans');
  const artifactItems = STORE_CATALOG.filter(i => i.category === 'Artifact' || i.category === 'Artifacts' || i.category === 'Legendary');

  const trinketConfig = (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES.trinket) || { rolls: 3, chance: 0.25 };
  const talismanConfig = (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES.talisman) || { rolls: 2, chance: 0.05 };
  const artifactConfig = (typeof RNG_LOOT_DROP_RATES !== 'undefined' && RNG_LOOT_DROP_RATES.artifact) || { rolls: 1, chance: 1 / 250 };

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

    // Trinket rolls (3 rolls @ 25% chance each)
    for (let i = 0; i < (trinketConfig.rolls || 3); i++) {
      if (Math.random() < trinketConfig.chance && trinketItems.length > 0) {
        const picked = trinketItems[Math.floor(Math.random() * trinketItems.length)];
        wonItems.push(picked);
      }
    }

    // Talisman rolls (2 rolls @ 5% chance each)
    for (let i = 0; i < (talismanConfig.rolls || 2); i++) {
      if (Math.random() < talismanConfig.chance && talismanItems.length > 0) {
        const picked = talismanItems[Math.floor(Math.random() * talismanItems.length)];
        wonItems.push(picked);
      }
    }

    // Artifact rolls (1 roll @ 1/250 chance = 0.4%)
    for (let i = 0; i < (artifactConfig.rolls || 1); i++) {
      if (Math.random() < artifactConfig.chance && artifactItems.length > 0) {
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

