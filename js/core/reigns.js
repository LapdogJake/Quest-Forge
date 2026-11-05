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

    // Also sync base profiles table gold as reliable fallback
    try {
      const { data: profRow } = await supabaseClient
        .from('profiles')
        .select('gold')
        .eq('id', userId)
        .maybeSingle();
      if (profRow) {
        await supabaseClient
          .from('profiles')
          .update({ gold: Math.max(0, (Number(profRow.gold) || 0) + Number(amount)) })
          .eq('id', userId);
      }
    } catch (_) {}

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
      const resolvedUsername = currentProfile?.username || currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'Adventurer';
      await supabaseClient
        .from('profiles')
        .upsert({ 
          id: currentUser.id,
          username: resolvedUsername,
          park: newPark, 
          kingdom: derivedKingdom,
          last_active_park: newPark,
          last_active_kingdom: derivedKingdom,
          last_active_qm_id: targetQMId,
          last_active_qm_username: targetQMUsername
        }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Profile update error:', e);
    }
  }

  // 7. Fetch isolated inventory, quests, and battle queues for the newly active QM realm
  if (typeof fetchRealmItemConfig === 'function') await fetchRealmItemConfig(newPark, targetQMId);
  if (typeof fetchUserInventory === 'function') await fetchUserInventory();
  if (typeof fetchUserSlotState === 'function') await fetchUserSlotState();
  if (typeof fetchQuests === 'function') await fetchQuests();
  if (typeof fetchMonsterEncounters === 'function') await fetchMonsterEncounters();
  if (typeof fetchQMQuests === 'function') await fetchQMQuests();
  if (typeof fetchQMQueues === 'function') await fetchQMQueues();
  if (typeof fetchChronicles === 'function') await fetchChronicles();
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
// Global Lifetime Player Stats & Preferences (public.player_stats)
// ------------------------------------------------------------------------------

function getLocalPlayerStatsFallback(userId) {
  const defaultStats = {
    user_id: userId,
    wins: 0,
    losses: 0,
    quests_completed: 0,
    gold_collected: 0,
    player_class: localStorage.getItem('qf_player_class_' + userId) || 'Peasant',
    theme_mode: localStorage.getItem('qf_theme_mode') || 'dark',
    text_size: localStorage.getItem('qf_text_size') || 'normal'
  };
  if (!userId) return defaultStats;
  try {
    const raw = localStorage.getItem('qf_player_stats_' + userId);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultStats, ...parsed, user_id: userId };
    }
  } catch (_) {}
  return defaultStats;
}

function saveLocalPlayerStatsFallback(userId, statsObj) {
  if (!userId || !statsObj) return;
  try {
    localStorage.setItem('qf_player_stats_' + userId, JSON.stringify(statsObj));
    if (statsObj.player_class) {
      localStorage.setItem('qf_player_class_' + userId, statsObj.player_class);
    }
  } catch (_) {}
}

async function loadPlayerStats(userId = null) {
  const targetUserId = userId || currentUser?.id;
  if (!targetUserId) return null;

  const fallback = getLocalPlayerStatsFallback(targetUserId);

  try {
    const { data, error } = await supabaseClient
      .from('player_stats')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!error && data) {
      const merged = {
        ...fallback,
        ...data,
        wins: Number(data.wins) || 0,
        losses: Number(data.losses) || 0,
        quests_completed: Number(data.quests_completed) || 0,
        gold_collected: Number(data.gold_collected) || 0,
        player_class: data.player_class || fallback.player_class || 'Peasant',
        theme_mode: data.theme_mode || fallback.theme_mode || 'dark',
        text_size: data.text_size || fallback.text_size || 'normal'
      };
      saveLocalPlayerStatsFallback(targetUserId, merged);
      if (currentUser && String(currentUser.id) === String(targetUserId)) {
        currentPlayerStats = merged;
        if (typeof applyProfileSettingsToDOM === 'function') {
          applyProfileSettingsToDOM(merged.theme_mode, merged.text_size);
        }
        if (typeof renderPlayerStatsUI === 'function') {
          renderPlayerStatsUI();
        }
      }
      return merged;
    }

    // Row does not exist yet: insert initial row if table exists
    if (!error && !data) {
      const insertPayload = {
        user_id: targetUserId,
        wins: fallback.wins || 0,
        losses: fallback.losses || 0,
        quests_completed: fallback.quests_completed || 0,
        gold_collected: fallback.gold_collected || 0,
        player_class: fallback.player_class || 'Peasant',
        theme_mode: fallback.theme_mode || 'dark',
        text_size: fallback.text_size || 'normal'
      };
      const { data: created, error: insertErr } = await supabaseClient
        .from('player_stats')
        .upsert(insertPayload, { onConflict: 'user_id' })
        .select('*')
        .maybeSingle();

      if (!insertErr && created) {
        saveLocalPlayerStatsFallback(targetUserId, created);
        if (currentUser && String(currentUser.id) === String(targetUserId)) {
          currentPlayerStats = created;
          if (typeof renderPlayerStatsUI === 'function') renderPlayerStatsUI();
        }
        return created;
      }
    }
  } catch (err) {
    console.warn('Could not load player_stats from Supabase, using local fallback:', err);
  }

  if (currentUser && String(currentUser.id) === String(targetUserId)) {
    currentPlayerStats = fallback;
    if (typeof renderPlayerStatsUI === 'function') renderPlayerStatsUI();
  }
  return fallback;
}

async function recordPlayerStatsDelta(userId, deltas = {}) {
  if (!userId) return;
  const dWins = Math.max(0, Number(deltas.wins) || 0);
  const dLosses = Math.max(0, Number(deltas.losses) || 0);
  const dQuests = Math.max(0, Number(deltas.quests_completed) || 0);
  const dGold = Math.max(0, Number(deltas.gold_collected) || 0);

  if (dWins === 0 && dLosses === 0 && dQuests === 0 && dGold === 0) return;

  const fallback = getLocalPlayerStatsFallback(userId);
  let nextStats = {
    ...fallback,
    wins: (Number(fallback.wins) || 0) + dWins,
    losses: (Number(fallback.losses) || 0) + dLosses,
    quests_completed: (Number(fallback.quests_completed) || 0) + dQuests,
    gold_collected: (Number(fallback.gold_collected) || 0) + dGold
  };

  try {
    const { data: existing, error: selErr } = await supabaseClient
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!selErr) {
      if (existing) {
        const updatedPayload = {
          wins: (Number(existing.wins) || 0) + dWins,
          losses: (Number(existing.losses) || 0) + dLosses,
          quests_completed: (Number(existing.quests_completed) || 0) + dQuests,
          gold_collected: (Number(existing.gold_collected) || 0) + dGold,
          updated_at: new Date().toISOString()
        };
        const { data: savedRow } = await supabaseClient
          .from('player_stats')
          .update(updatedPayload)
          .eq('user_id', userId)
          .select('*')
          .maybeSingle();

        nextStats = savedRow || { ...existing, ...updatedPayload };
      } else {
        const insertPayload = {
          user_id: userId,
          wins: dWins,
          losses: dLosses,
          quests_completed: dQuests,
          gold_collected: dGold,
          player_class: fallback.player_class || 'Peasant',
          theme_mode: fallback.theme_mode || 'dark',
          text_size: fallback.text_size || 'normal',
          updated_at: new Date().toISOString()
        };
        const { data: insertedRow } = await supabaseClient
          .from('player_stats')
          .insert(insertPayload)
          .select('*')
          .maybeSingle();

        nextStats = insertedRow || insertPayload;
      }
    }
  } catch (err) {
    console.warn('Could not persist player_stats delta to Supabase:', err);
  }

  saveLocalPlayerStatsFallback(userId, nextStats);

  if (currentUser && String(currentUser.id) === String(userId)) {
    currentPlayerStats = nextStats;
    if (typeof renderPlayerStatsUI === 'function') {
      renderPlayerStatsUI();
    }
  }
}
