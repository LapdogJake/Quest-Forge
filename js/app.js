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
  currentKingdom = profile?.kingdom || currentUser.user_metadata?.kingdom || 'Emerald Hills';
  currentPark = profile?.park || currentUser.user_metadata?.park || 'Midnight Sun';
  currentProfile.kingdom = currentKingdom;
  currentProfile.park = currentPark;

  const displayName = profile?.username || currentUser.user_metadata?.username || currentUser.email;

  const userDisplayEl = document.getElementById('user-display');
  const goldEl = document.getElementById('profile-gold');
  const roleBadgeEl = document.getElementById('role-badge');
  const navAdminEl = document.getElementById('nav-admin');

  if (userDisplayEl) userDisplayEl.innerText = displayName;
  if (goldEl) goldEl.innerText = profile?.gold || 0;

  // Initialize Amtgard Group Selection
  initProfileGroupSelector();
  updateGroupBannerDisplays();

  if (profile?.role === 'questmaster' || profile?.role === 'admin') {
    if (navAdminEl) navAdminEl.classList.remove('hidden');
    if (roleBadgeEl) {
      roleBadgeEl.innerText = profile.role.toUpperCase();
      roleBadgeEl.style.display = 'inline-block';
    }
    fetchQMQueues();
    fetchQMQuests();
  }

  await fetchUserSlotState();
  fetchQuests();
  fetchMonsterEncounters();
  fetchUserInventory();
  renderStoreCatalog();
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Bootstrap dashboard on page load
initDashboard();
