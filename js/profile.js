// ==============================================================================
// Quest-Forge: Profile Tab UI, Realm Transfer Selectors, & Quest Abilities
// ==============================================================================

let selectedQuestAbilities = [];

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

  if (typeof syncChroniclesQMVisibility === 'function') {
    syncChroniclesQMVisibility();
  }
}

// Update the Active Group Affiliation Banner on the Profile tab
function updateGroupBannerDisplays() {
  const kingdomEl = document.getElementById('display-profile-kingdom');
  const parkEl = document.getElementById('display-profile-park');
  const qmEl = document.getElementById('display-profile-qm');
  const abilityEl = document.getElementById('display-profile-ability');

  const activeKingdom = currentKingdom || "The Freeholds of Amtgard";
  const activePark = currentPark || "Delver's Rest";
  const activeQM = currentQMUsername || "Default Realm";

  if (kingdomEl) kingdomEl.innerText = activeKingdom;
  if (parkEl) parkEl.innerText = activePark;
  if (qmEl) qmEl.innerText = activeQM;
  if (abilityEl) {
    const rawAbs = (selectedQuestAbilities && selectedQuestAbilities[0]) || (currentParkProfile?.quest_abilities?.[0]) || (currentProfile?.quest_abilities?.[0]) || "";
    abilityEl.innerText = rawAbs || "None";
  }
}

// ------------------------------------------------------------------------------
// Transfer Realm Accordion & Kingdom / Park / QM Dropdown Selectors
// ------------------------------------------------------------------------------

function toggleParkSelectorAccordion() {
  const accordionBody = document.getElementById('park-selector-accordion-body');
  const chevron = document.getElementById('park-selector-chevron');
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

async function handleBecomeQM() {
  const parkSelect = document.getElementById('profile-park-select');
  const kingdomSelect = document.getElementById('profile-kingdom-select');
  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }

  const park = parkSelect ? parkSelect.value : getActivePark();
  const kingdom = kingdomSelect ? kingdomSelect.value : getActiveKingdom();
  const username = currentProfile?.username || currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'Questmaster';

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
    // Ensure a row exists in public.profiles before upserting park_questmasters
    // to satisfy foreign key constraints (park_questmasters_user_id_fkey)
    await supabaseClient
      .from('profiles')
      .upsert({
        id: currentUser.id,
        username: username,
        kingdom: kingdom,
        park: park,
        last_active_kingdom: kingdom,
        last_active_park: park,
        role: currentProfile?.role || 'questmaster',
        gold: Number(currentProfile?.gold) || 0
      }, { onConflict: 'id' });

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

// ------------------------------------------------------------------------------
// Quest Abilities Management
// ------------------------------------------------------------------------------

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
  const selectEl = document.getElementById('profile-ability-select');
  const abilityEl = document.getElementById('display-profile-ability');

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

  // Ensure at most one ability is selected
  const activeAbility = selectedQuestAbilities[0] || "";
  selectedQuestAbilities = activeAbility ? [activeAbility] : [];

  if (abilityEl) {
    abilityEl.innerText = activeAbility || "None";
  }

  if (selectEl) {
    const list = (typeof AMTGARD_ROP_QUEST_ABILITIES !== 'undefined') ? AMTGARD_ROP_QUEST_ABILITIES : [];
    selectEl.innerHTML = [
      `<option value="">-- No Ability Selected --</option>`,
      ...list.map(ab => `<option value="${ab}" ${ab === activeAbility ? 'selected' : ''}>${ab}</option>`)
    ].join('');
  }
}

function handleAbilitySelectChange() {
  const selectEl = document.getElementById('profile-ability-select');
  if (!selectEl) return;
  const val = selectEl.value;
  selectedQuestAbilities = val ? [val] : [];
}

async function saveQuestAbilities() {
  if (!currentUser) return;

  const selectEl = document.getElementById('profile-ability-select');
  if (selectEl) {
    const val = selectEl.value;
    selectedQuestAbilities = val ? [val] : [];
  }

  if (currentParkProfile) currentParkProfile.quest_abilities = selectedQuestAbilities;
  if (currentProfile) currentProfile.quest_abilities = selectedQuestAbilities;

  // Collapse the accordion box
  const accordionBody = document.getElementById('abilities-accordion-body');
  const chevron = document.getElementById('abilities-chevron');
  if (accordionBody) accordionBody.classList.add('hidden');
  if (chevron) chevron.innerText = "▼";

  // Update the new display line
  const abilityEl = document.getElementById('display-profile-ability');
  if (abilityEl) {
    abilityEl.innerText = selectedQuestAbilities[0] || "None";
  }

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

    if (typeof fetchQuests === 'function') fetchQuests();
    if (typeof fetchMonsterEncounters === 'function') fetchMonsterEncounters();
  } catch (err) {
    console.warn("Could not save quest abilities to DB:", err);
  }
}

// ------------------------------------------------------------------------------
// Account Sign Out
// ------------------------------------------------------------------------------

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

