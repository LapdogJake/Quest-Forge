// ==============================================================================
// Quest-Forge: Application Lifecycle & Auth
// ==============================================================================

async function initDashboard() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { 
      window.location.href = "login.html"; 
      return; 
    }

    currentUser = session.user;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    currentProfile = profile || {};

    // 1. Resolve player's active park
    currentPark = profile?.last_active_park || profile?.park || currentUser.user_metadata?.park || "Delver's Rest";
    currentKingdom = (typeof getKingdomForPark === 'function')
      ? getKingdomForPark(currentPark)
      : (profile?.kingdom || 'The Freeholds of Amtgard');

    currentProfile.park = currentPark;
    currentProfile.kingdom = currentKingdom;

    // 2. Load the player's relational park profile sheet
    if (typeof loadUserParkProfile === 'function') {
      currentParkProfile = await loadUserParkProfile(currentUser.id, currentPark, currentKingdom);
    } else {
      currentParkProfile = { park: currentPark, kingdom: currentKingdom, role: profile?.role || 'player', gold: profile?.gold || 0 };
    }

    // 3. User display and UI state
    const displayName = profile?.username || currentUser.user_metadata?.username || currentUser.email;
    const userDisplayEl = document.getElementById('user-display');
    const goldEl = document.getElementById('profile-gold');

    if (userDisplayEl) userDisplayEl.innerText = displayName;

    const activeGold = Number(currentParkProfile?.gold) || 0;
    currentProfile.gold = activeGold;
    if (goldEl) goldEl.innerText = activeGold;

    // 4. Synchronize role UI (badge & Questmaster panel access) for this park
    const activeRole = currentParkProfile?.role || profile?.role || 'player';
    if (typeof syncUserRoleUI === 'function') {
      syncUserRoleUI(activeRole);
    }

    // 5. Initialize Park Selector & affiliation banner
    if (typeof initProfileGroupSelector === 'function') {
      initProfileGroupSelector();
    }

    if (typeof fetchUserSlotState === 'function') await fetchUserSlotState();
    if (typeof fetchQuests === 'function') fetchQuests();
    if (typeof fetchMonsterEncounters === 'function') fetchMonsterEncounters();
    if (typeof fetchUserInventory === 'function') await fetchUserInventory();
    if (typeof renderStoreCatalog === 'function') renderStoreCatalog();
  } catch (err) {
    console.error('Fatal error during initDashboard:', err);
    const userDisplayEl = document.getElementById('user-display');
    if (userDisplayEl && currentUser) {
      userDisplayEl.innerText = currentUser.email || 'Player';
    }
  }
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Bootstrap dashboard on page load
initDashboard();
