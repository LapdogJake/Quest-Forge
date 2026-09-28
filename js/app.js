// ==============================================================================
// Quest-Forge: Application Lifecycle & Auth
// ==============================================================================

async function initDashboard() {
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
  currentKingdom = getKingdomForPark(currentPark);
  currentProfile.park = currentPark;
  currentProfile.kingdom = currentKingdom;

  // 2. Load the player's relational park profile sheet
  currentParkProfile = await loadUserParkProfile(currentUser.id, currentPark, currentKingdom);

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
  syncUserRoleUI(activeRole);

  // 5. Initialize Park Selector & affiliation banner
  initProfileGroupSelector();

  await fetchUserSlotState();
  fetchQuests();
  fetchMonsterEncounters();
  await fetchUserInventory();
  renderStoreCatalog();
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Bootstrap dashboard on page load
initDashboard();
