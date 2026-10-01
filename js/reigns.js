// ==============================================================================
// Quest-Forge: Kingdom, Park & Questmaster (QM) Reigns System
// Manages the 3-tier hierarchy: Kingdom -> Park -> QM Reign
// ==============================================================================

// Lookup Kingdom for a given Park (Kingdom is a sorting filter)
function getKingdomForPark(parkName) {
  if (!parkName) return 'The Freeholds of Amtgard';
  if (typeof AMTGARD_KINGDOMS_AND_PARKS === 'object') {
    for (const [kingdom, parks] of Object.entries(AMTGARD_KINGDOMS_AND_PARKS)) {
      if (Array.isArray(parks) && parks.includes(parkName)) {
        return kingdom;
      }
    }
  }
  return currentKingdom || 'The Freeholds of Amtgard';
}

// Load or initialize a player's relational park/QM profile sheet
async function loadUserParkProfile(userId, park, kingdom = null, qmId = null) {
  if (!userId || !park) return null;
  const targetKingdom = kingdom || getKingdomForPark(park);
  const targetQMId = qmId || currentQMId || null;

  try {
    let query = supabaseClient
      .from('user_park_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('park', park);

    if (targetQMId) {
      query = query.eq('qm_id', targetQMId);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      return data;
    }

    const isHostQM = targetQMId && userId === targetQMId;

    // Insert new park/QM profile sheet if none exists yet
    const insertPayload = {
      user_id: userId,
      park: park,
      kingdom: targetKingdom,
      qm_id: targetQMId,
      role: isHostQM ? 'questmaster' : 'player',
      gold: 0
    };

    const { data: newRow, error: insertErr } = await supabaseClient
      .from('user_park_profiles')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    if (!insertErr && newRow) {
      return newRow;
    }
  } catch (err) {
    console.warn('Could not read/insert user_park_profiles:', err);
  }

  // Graceful in-memory fallback
  return {
    user_id: userId,
    park: park,
    kingdom: targetKingdom,
    qm_id: targetQMId,
    role: (targetQMId && userId === targetQMId) ? 'questmaster' : 'player',
    gold: 0
  };
}

// UI helper to sync role badge and Questmaster panel visibility with the active park & QM reign
function syncUserRoleUI(role) {
  const roleBadgeEl = document.getElementById('role-badge');
  const navAdminEl = document.getElementById('nav-admin');

  const isCurrentQMHost = Boolean(currentUser && currentQMId && currentUser.id === currentQMId);
  const isQM = isCurrentQMHost || role === 'questmaster' || role === 'admin' || currentProfile?.role === 'admin';

  if (roleBadgeEl) {
    roleBadgeEl.innerText = isCurrentQMHost ? '👑 QUESTMASTER' : (role || 'player').toUpperCase();
    roleBadgeEl.style.display = 'inline-block';
  }

  if (navAdminEl) {
    navAdminEl.classList.toggle('hidden', !isQM);
  }

  if (isQM && typeof fetchQMQueues === 'function') {
    fetchQMQueues();
    fetchQMQuests();
  }
}

// Isolated Park & QM Currency (Gold) Management
function getParkGold(profile, park, qmId = null) {
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const targetQMId = qmId || currentQMId;
  
  if (currentParkProfile && currentParkProfile.park === targetPark && (!targetQMId || currentParkProfile.qm_id === targetQMId)) {
    return Number(currentParkProfile.gold) || 0;
  }
  return Number(currentParkProfile?.gold) || 0;
}

async function updateParkGold(amountOrNewTotal, isDelta = false, park = null, qmId = null) {
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const targetKingdom = getKingdomForPark(targetPark);
  const targetQMId = qmId || currentQMId || null;

  const currentAmt = (currentParkProfile && currentParkProfile.park === targetPark)
    ? Number(currentParkProfile.gold) || 0
    : getParkGold(currentProfile, targetPark, targetQMId);

  const nextGold = isDelta ? Math.max(0, currentAmt + amountOrNewTotal) : Math.max(0, amountOrNewTotal);

  if (!currentParkProfile) {
    currentParkProfile = { 
      user_id: currentUser?.id, 
      park: targetPark, 
      kingdom: targetKingdom, 
      qm_id: targetQMId, 
      role: (targetQMId && currentUser?.id === targetQMId) ? 'questmaster' : 'player', 
      gold: nextGold 
    };
  } else if (currentParkProfile.park === targetPark) {
    currentParkProfile.gold = nextGold;
  }

  if (!currentProfile) currentProfile = {};
  currentProfile.gold = nextGold;

  const activeParkNow = typeof getActivePark === 'function' ? getActivePark() : currentPark;
  if (targetPark === activeParkNow) {
    syncGoldDisplays(nextGold);
  }

  if (currentUser) {
    try {
      if (currentParkProfile?.id) {
        await supabaseClient
          .from('user_park_profiles')
          .update({ gold: nextGold })
          .eq('id', currentParkProfile.id);
      } else {
        let query = supabaseClient
          .from('user_park_profiles')
          .update({ gold: nextGold })
          .eq('user_id', currentUser.id)
          .eq('park', targetPark);

        if (targetQMId) {
          query = query.eq('qm_id', targetQMId);
        }
        await query;
      }
    } catch (e) {
      console.warn('Could not persist park gold:', e);
    }
  }

  return nextGold;
}

// Award gold to a specific user (used when QM verifies a player's quest completion)
async function awardGoldToUser(userId, amount, park = null, qmId = null) {
  if (!userId || !amount) return;
  const targetPark = park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
  const targetKingdom = getKingdomForPark(targetPark);
  const targetQMId = qmId || currentQMId || null;

  try {
    let query = supabaseClient
      .from('user_park_profiles')
      .select('id, gold')
      .eq('user_id', userId)
      .eq('park', targetPark);

    if (targetQMId) {
      query = query.eq('qm_id', targetQMId);
    }

    const { data: existingRow } = await query.maybeSingle();

    if (existingRow) {
      const newGold = Math.max(0, (Number(existingRow.gold) || 0) + Number(amount));
      await supabaseClient
        .from('user_park_profiles')
        .update({ gold: newGold })
        .eq('id', existingRow.id);
    } else {
      await supabaseClient
        .from('user_park_profiles')
        .insert({
          user_id: userId,
          park: targetPark,
          kingdom: targetKingdom,
          qm_id: targetQMId,
          role: 'player',
          gold: Number(amount)
        });
    }

    // If current logged-in user matches, sync local state and displays immediately
    if (currentUser && currentUser.id === userId) {
      const curAmt = (currentParkProfile && currentParkProfile.park === targetPark)
        ? Number(currentParkProfile.gold) || 0
        : Number(currentProfile?.gold) || 0;
      const nextGold = curAmt + Number(amount);
      if (currentParkProfile) currentParkProfile.gold = nextGold;
      if (currentProfile) currentProfile.gold = nextGold;
      syncGoldDisplays(nextGold);
    }
  } catch (err) {
    console.warn("Could not award gold to user:", err);
  }
}

// ------------------------------------------------------------------------------
// Kingdom, Park & QM Hierarchy Dropdown Selectors
// ------------------------------------------------------------------------------

async function initProfileGroupSelector() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  if (!kingdomSelect || !parkSelect) return;

  const activeKingdom = currentKingdom || "The Freeholds of Amtgard";
  const activePark = currentPark || "Delver's Rest";

  populateKingdomOptions(activeKingdom);
  populateParkOptions(activeKingdom, activePark);
  await populateQMOptions(activePark, currentQMId);
  updateGroupBannerDisplays();
}

function populateKingdomOptions(selectedKingdom) {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!kingdomSelect) return;

  const kingdoms = Object.keys(AMTGARD_KINGDOMS_AND_PARKS);
  kingdomSelect.innerHTML = kingdoms.map(k => 
    `<option value="${k}" ${k === selectedKingdom ? 'selected' : ''}>${k}</option>`
  ).join('');
}

function populateParkOptions(kingdom, selectedPark) {
  const parkSelect = document.getElementById('profile-park-select');
  if (!parkSelect) return;

  const parks = AMTGARD_KINGDOMS_AND_PARKS[kingdom] || [];
  parkSelect.innerHTML = parks.map(p => 
    `<option value="${p}" ${p === selectedPark ? 'selected' : ''}>${p}</option>`
  ).join('');
}

async function populateQMOptions(park, selectedQMId = null) {
  const qmSelect = document.getElementById('profile-qm-select');
  if (!qmSelect) return;

  qmSelect.innerHTML = `<option value="">Loading Questmasters...</option>`;

  try {
    const { data: qms, error } = await supabaseClient
      .from('park_questmasters')
      .select('*')
      .eq('park', park)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn("Could not load park QMs:", error);
    }

    parkQMsList = qms || [];

    if (parkQMsList.length === 0) {
      qmSelect.innerHTML = `<option value="" selected>👑 Default Realm (General)</option>`;
      return;
    }

    let foundSelected = false;
    const optionsHtml = parkQMsList.map(qm => {
      const isSelected = selectedQMId && (qm.user_id === selectedQMId || qm.id === selectedQMId);
      if (isSelected) foundSelected = true;
      return `<option value="${qm.user_id}" data-username="${qm.username}" ${isSelected ? 'selected' : ''}>👑 ${qm.username}</option>`;
    }).join('');

    qmSelect.innerHTML = optionsHtml;

    if (!foundSelected && parkQMsList.length > 0) {
      qmSelect.selectedIndex = 0;
    }
  } catch (err) {
    console.error("Error populating QM options:", err);
    qmSelect.innerHTML = `<option value="" selected>👑 Default Realm</option>`;
  }
}

async function handleKingdomFilterChange() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  if (!kingdomSelect || !parkSelect) return;

  const chosenKingdom = kingdomSelect.value;
  const parks = AMTGARD_KINGDOMS_AND_PARKS[chosenKingdom] || [];
  const firstPark = parks[0] || "Delver's Rest";

  populateParkOptions(chosenKingdom, firstPark);
  await populateQMOptions(firstPark);
}

async function handleParkFilterChange() {
  const parkSelect = document.getElementById('profile-park-select');
  if (!parkSelect) return;
  await populateQMOptions(parkSelect.value);
}

async function handleBecomeQM() {
  const parkSelect = document.getElementById('profile-park-select');
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }

  const isEmailConfirmed = Boolean(currentUser.email_confirmed_at || currentUser.confirmed_at);
  if (!isEmailConfirmed) {
    alert("⚠️ Email Verification Required:\n\nOnly confirmed email accounts can become Questmasters!\n\nPlease check your email for the confirmation link, or click 'Resend Link' under your Profile tab.");
    return;
  }

  const park = parkSelect ? parkSelect.value : getActivePark();
  const kingdom = kingdomSelect ? kingdomSelect.value : getActiveKingdom();
  const username = currentProfile?.username || currentUser.email?.split('@')[0] || 'Questmaster';

  // Enforce 1-Park QM Limit: check if user already holds a QM reign at another park
  const { data: existingQMs, error: qmCheckErr } = await supabaseClient
    .from('park_questmasters')
    .select('*')
    .eq('user_id', currentUser.id);

  if (existingQMs && existingQMs.length > 0) {
    const existingOther = existingQMs.find(qm => qm.park !== park);
    if (existingOther) {
      alert(
        `⚠️ Questmaster Limit Reached:\n\n` +
        `You are already an active Questmaster at "${existingOther.park}" (${existingOther.kingdom})!\n\n` +
        `Players may only hold 1 active Questmaster reign at a time. To start a new campaign here, switch to "${existingOther.park}" and click "End Campaign" at the bottom of your QM Panel.`
      );
      return;
    }
  }

  const confirmed = confirm(`Do you want to become a registered Questmaster for "${park}" in "${kingdom}"?\n\nThis will allow players to enter your QM realm, and unlocks your QM Panel!`);
  if (!confirmed) return;

  const btn = document.getElementById('btn-become-qm');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Registering...";
  }

  try {
    const { data, error } = await supabaseClient
      .from('park_questmasters')
      .upsert({
        user_id: currentUser.id,
        username: username,
        kingdom: kingdom,
        park: park
      }, { onConflict: 'user_id, park' })
      .select('*')
      .maybeSingle();

    if (error) {
      alert("Error registering as Questmaster: " + error.message);
      return;
    }

    alert(`👑 Congratulations! You are now a registered Questmaster for ${park}.\n\nYour realm is active and your QM Panel is unlocked!`);

    await populateQMOptions(park, currentUser.id);
    await saveActivePark(park, kingdom, currentUser.id, username);

    // Auto-collapse accordion
    const body = document.getElementById('park-selector-accordion-body');
    const chevron = document.getElementById('park-selector-chevron');
    if (body) body.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  } catch (err) {
    console.error("Error in handleBecomeQM:", err);
    alert("Could not register as QM: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "👑 Become QM Here";
    }
  }
}

// Permanently delete QM status and all forged encounters/progress for this park
async function handleEndCampaign() {
  if (!currentUser) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser.id;

  // Verify the user is actually the Questmaster of this realm
  if (activeQMId !== currentUser.id) {
    alert("⚠️ You can only end a campaign for your own active Questmaster realm.");
    return;
  }

  const promptInput = prompt(
    `⚠️ DANGER: END CAMPAIGN?\n\n` +
    `This will permanently close your Questmaster reign at "${activePark}", delete all forged battles & quests, and wipe group progress in this realm.\n\n` +
    `Type "END" to confirm:`
  );

  if (!promptInput || promptInput.trim().toUpperCase() !== 'END') {
    if (promptInput !== null) {
      alert("❌ Confirmation text did not match 'END'. Campaign was not ended.");
    }
    return;
  }

  const btn = document.getElementById('btn-end-campaign');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Ending Campaign...";
  }

  try {
    // 1. Fetch all quest IDs forged by this QM in this park
    const { data: qmQuests } = await supabaseClient
      .from('quests')
      .select('id')
      .eq('qm_id', currentUser.id);

    const questIds = (qmQuests || []).map(q => q.id);

    // 2. Delete all related queues and memberships
    if (questIds.length > 0) {
      const { data: qmQueues } = await supabaseClient
        .from('quest_queues')
        .select('id')
        .in('quest_id', questIds);

      const queueIds = (qmQueues || []).map(q => q.id);

      if (queueIds.length > 0) {
        await supabaseClient.from('queue_members').delete().in('queue_id', queueIds);
        await supabaseClient.from('encounter_monsters').delete().in('queue_id', queueIds);
        await supabaseClient.from('quest_queues').delete().in('id', queueIds);
      }

      await supabaseClient.from('user_quests').delete().in('quest_id', questIds);
      await supabaseClient.from('quests').delete().in('id', questIds);
    }

    // 3. Delete QM registration from park_questmasters
    await supabaseClient
      .from('park_questmasters')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('park', activePark);

    // 4. Update profile roles back to 'player'
    await supabaseClient
      .from('user_park_profiles')
      .update({ role: 'player' })
      .eq('user_id', currentUser.id)
      .eq('park', activePark);

    await supabaseClient
      .from('profiles')
      .update({ role: 'player', last_active_qm_id: null, last_active_qm_username: 'Default Realm' })
      .eq('id', currentUser.id);

    currentQMId = null;
    currentQMUsername = 'Default Realm';
    if (currentParkProfile) currentParkProfile.role = 'player';
    if (currentProfile) currentProfile.role = 'player';

    alert(`🏰 Campaign ended!\n\nYour Questmaster realm at ${activePark} has been deleted. You are now free to start a new campaign at any park.`);

    switchTab('profile');
    initDashboard();
  } catch (err) {
    console.error("Error ending campaign:", err);
    alert("❌ Error ending campaign: " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "End Campaign";
    }
  }
}

async function handleCommitParkChange() {
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  const parkSelect = document.getElementById('profile-park-select');
  const qmSelect = document.getElementById('profile-qm-select');

  if (!parkSelect) return;

  const selectedKingdom = kingdomSelect ? kingdomSelect.value : getActiveKingdom();
  const selectedPark = parkSelect.value;
  const selectedQMId = qmSelect ? qmSelect.value : null;
  const selectedQMOption = qmSelect ? qmSelect.options[qmSelect.selectedIndex] : null;
  const selectedQMUsername = selectedQMOption?.dataset?.username || (selectedQMOption?.text?.replace('👑 ', '') || 'Default Realm');

  const btn = document.getElementById('btn-change-park');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Entering...";
  }

  try {
    await saveActivePark(selectedPark, selectedKingdom, selectedQMId, selectedQMUsername);

    // Auto-collapse accordion
    const body = document.getElementById('park-selector-accordion-body');
    const chevron = document.getElementById('park-selector-chevron');
    if (body) body.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Enter Realm";
    }
  }
}

async function saveActivePark(newPark, kingdom = null, qmId = null, qmUsername = null) {
  if (!newPark) return;

  const derivedKingdom = kingdom || getKingdomForPark(newPark);
  const targetQMId = qmId || currentQMId || null;
  const targetQMUsername = qmUsername || currentQMUsername || 'Default Realm';

  // 1. Update reactive local state
  currentPark = newPark;
  currentKingdom = derivedKingdom;
  currentQMId = targetQMId;
  currentQMUsername = targetQMUsername;

  // 2. Load or initialize the relational park/QM profile sheet
  currentParkProfile = await loadUserParkProfile(currentUser?.id, newPark, derivedKingdom, targetQMId);

  if (!currentProfile) currentProfile = {};
  currentProfile.park = newPark;
  currentProfile.kingdom = derivedKingdom;
  currentProfile.last_active_qm_id = targetQMId;
  currentProfile.last_active_qm_username = targetQMUsername;

  // 3. Sync isolated gold display for newly active QM reign
  const newParkGold = Number(currentParkProfile?.gold) || 0;
  currentProfile.gold = newParkGold;
  syncGoldDisplays(newParkGold);

  // 4. Synchronize role UI (badge & Questmaster panel access)
  const isHost = Boolean(currentUser && targetQMId && currentUser.id === targetQMId);
  const activeRole = isHost ? 'questmaster' : (currentParkProfile?.role || 'player');
  syncUserRoleUI(activeRole);

  // 5. Update top banner display
  updateGroupBannerDisplays();

  // 6. Persist last active location & QM to Supabase profiles
  if (currentUser) {
    try {
      await supabaseClient
        .from('profiles')
        .update({ 
          park: newPark, 
          kingdom: derivedKingdom,
          last_active_park: newPark,
          last_active_kingdom: derivedKingdom,
          last_active_qm_id: targetQMId,
          last_active_qm_username: targetQMUsername
        })
        .eq('id', currentUser.id);
    } catch (e) {
      console.warn('Profile update error:', e);
    }
  }

  // 7. Fetch isolated inventory, quests, and battle queues for the newly active QM realm
  if (typeof fetchUserInventory === 'function') await fetchUserInventory();
  if (typeof fetchUserSlotState === 'function') await fetchUserSlotState();
  if (typeof fetchQuests === 'function') await fetchQuests();
  if (typeof fetchMonsterEncounters === 'function') await fetchMonsterEncounters();
  if (typeof fetchQMQuests === 'function') await fetchQMQuests();
  if (typeof fetchQMQueues === 'function') await fetchQMQueues();
}

function updateGroupBannerDisplays() {
  const kingdomEl = document.getElementById('display-profile-kingdom');
  const parkEl = document.getElementById('display-profile-park');
  const qmEl = document.getElementById('display-profile-qm');
  const qmPanelParkEl = document.getElementById('display-qm-park');

  const activeKingdom = currentKingdom || "The Freeholds of Amtgard";
  const activePark = currentPark || "Delver's Rest";
  const activeQM = currentQMUsername || "Default Realm";

  if (kingdomEl) kingdomEl.innerText = activeKingdom;
  if (parkEl) parkEl.innerText = activePark;
  if (qmEl) qmEl.innerText = `👑 ${activeQM}`;
  if (qmPanelParkEl) qmPanelParkEl.innerText = `${activePark} (${activeQM})`;
}

function getActivePark() {
  return currentPark || (currentProfile?.park) || "Delver's Rest";
}

function getActiveKingdom() {
  return currentKingdom || (currentProfile?.kingdom) || "The Freeholds of Amtgard";
}

function getActiveQMId() {
  return currentQMId || null;
}

function getActiveQMUsername() {
  return currentQMUsername || "Default Realm";
}

// ------------------------------------------------------------------------------
// Quest Abilities (Amtgard ROP) Management
// ------------------------------------------------------------------------------

let selectedQuestAbilities = [];

function toggleQuestAbilitiesAccordion() {
  const accordionBody = document.getElementById('abilities-accordion-body');
  const chevron = document.getElementById('abilities-chevron');
  if (!accordionBody) return;
  const isHidden = accordionBody.classList.contains('hidden');

  if (isHidden) {
    accordionBody.classList.remove('hidden');
    if (chevron) chevron.innerText = "▲";
  } else {
    accordionBody.classList.add('hidden');
    if (chevron) chevron.innerText = "▼";
  }
}

function initQuestAbilitiesUI() {
  const container = document.getElementById('abilities-chip-container');
  const countEl = document.getElementById('profile-abilities-count');
  if (!container) return;

  // Resolve user's stored abilities
  const rawAbs = currentParkProfile?.quest_abilities || currentProfile?.quest_abilities || [];
  if (typeof rawAbs === 'string') {
    try { selectedQuestAbilities = JSON.parse(rawAbs); } 
    catch { selectedQuestAbilities = rawAbs.split(',').map(s => s.trim()).filter(Boolean); }
  } else if (Array.isArray(rawAbs)) {
    selectedQuestAbilities = [...rawAbs];
  } else {
    selectedQuestAbilities = [];
  }

  if (countEl) countEl.innerText = `(${selectedQuestAbilities.length} active)`;

  const list = (typeof AMTGARD_ROP_QUEST_ABILITIES !== 'undefined') ? AMTGARD_ROP_QUEST_ABILITIES : [];
  const details = (typeof AMTGARD_ROP_QUEST_ABILITY_DETAILS !== 'undefined') ? AMTGARD_ROP_QUEST_ABILITY_DETAILS : {};
  container.innerHTML = list.map(ab => {
    const isSel = selectedQuestAbilities.includes(ab);
    const desc = (details[ab] || ab).replace(/"/g, '&quot;');
    return `<div class="ability-chip ${isSel ? 'selected' : ''}" title="${desc}" onclick="toggleAbilityChip('${ab.replace(/'/g, "\\'")}')">${ab}</div>`;
  }).join('');
}

function toggleAbilityChip(abilityName) {
  if (selectedQuestAbilities.includes(abilityName)) {
    selectedQuestAbilities = selectedQuestAbilities.filter(a => a !== abilityName);
  } else {
    selectedQuestAbilities.push(abilityName);
  }
  initQuestAbilitiesUI();
}

async function saveQuestAbilities() {
  if (!currentUser) return;

  if (currentParkProfile) currentParkProfile.quest_abilities = selectedQuestAbilities;
  if (currentProfile) currentProfile.quest_abilities = selectedQuestAbilities;

  try {
    if (currentParkProfile?.id) {
      await supabaseClient
        .from('user_park_profiles')
        .update({ quest_abilities: selectedQuestAbilities })
        .eq('id', currentParkProfile.id);
    }
    await supabaseClient
      .from('profiles')
      .update({ quest_abilities: selectedQuestAbilities })
      .eq('id', currentUser.id);

    alert("⚡ Quest abilities saved!");
    if (typeof fetchQuests === 'function') fetchQuests();
    if (typeof fetchMonsterEncounters === 'function') fetchMonsterEncounters();
  } catch (err) {
    console.warn("Could not save quest abilities to DB:", err);
    alert("Saved locally for this session!");
  }
}
