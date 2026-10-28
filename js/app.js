// ==============================================================================
// Quest-Forge: Application Lifecycle & Auth
// ==============================================================================

async function initDashboard() {
  try {
    // 0. Safeguard: If landing on dashboard with password recovery tokens, activate recovery view
    if (window.__IS_RECOVERY) {
      activateRecoveryView();
      return;
    }

    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    if (
      hashParams.get('type') === 'recovery' || 
      searchParams.get('type') === 'recovery' || 
      window.location.hash.includes('type=recovery')
    ) {
      window.__IS_RECOVERY = true;
      activateRecoveryView();
      return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    currentUser = session.user;

    let { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!profile) {
      const defaultUsername = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'Adventurer';
      const defaultPark = currentUser.user_metadata?.park || "Delver's Rest";
      const defaultKingdom = currentUser.user_metadata?.kingdom || ((typeof getKingdomForPark === 'function') ? getKingdomForPark(defaultPark) : 'The Freeholds of Amtgard');

      const { data: createdProfile } = await supabaseClient
        .from('profiles')
        .upsert({
          id: currentUser.id,
          username: defaultUsername,
          role: 'player',
          gold: 0,
          kingdom: defaultKingdom,
          park: defaultPark,
          last_active_kingdom: defaultKingdom,
          last_active_park: defaultPark
        }, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      profile = createdProfile || {
        id: currentUser.id,
        username: defaultUsername,
        role: 'player',
        gold: 0,
        kingdom: defaultKingdom,
        park: defaultPark,
        last_active_kingdom: defaultKingdom,
        last_active_park: defaultPark
      };
    }

    currentProfile = profile || {};

    // 1. Resolve player's active park & QM reign
    currentPark = profile?.last_active_park || profile?.park || currentUser.user_metadata?.park || "Delver's Rest";
    currentKingdom = (typeof getKingdomForPark === 'function')
      ? getKingdomForPark(currentPark)
      : (profile?.kingdom || 'The Freeholds of Amtgard');

    currentQMId = profile?.last_active_qm_id || null;
    currentQMUsername = profile?.last_active_qm_username || null;

    if (!currentQMId) {
      try {
        const { data: firstQM } = await supabaseClient
          .from('park_questmasters')
          .select('*')
          .eq('park', currentPark)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstQM) {
          currentQMId = firstQM.user_id;
          currentQMUsername = firstQM.username;
        } else {
          currentQMId = null;
          currentQMUsername = "Default Realm";
        }
      } catch (e) {
        currentQMId = null;
        currentQMUsername = "Default Realm";
      }
    }

    currentProfile.park = currentPark;
    currentProfile.kingdom = currentKingdom;
    currentProfile.last_active_qm_id = currentQMId;
    currentProfile.last_active_qm_username = currentQMUsername;

    // 2. Load the player's relational park/QM profile sheet
    if (typeof loadUserParkProfile === 'function') {
      currentParkProfile = await loadUserParkProfile(currentUser.id, currentPark, currentKingdom, currentQMId);
    } else {
      currentParkProfile = { park: currentPark, kingdom: currentKingdom, qm_id: currentQMId, role: profile?.role || 'player', gold: profile?.gold || 0 };
    }

    // 3. User display and UI state
    const displayName = profile?.username || currentUser.user_metadata?.username || currentUser.email;
    const userDisplayEl = document.getElementById('user-display');
    if (userDisplayEl) userDisplayEl.innerText = displayName;


    const activeGold = Number(currentParkProfile?.gold) || 0;
    currentProfile.gold = activeGold;
    if (typeof syncGoldDisplays === 'function') {
      syncGoldDisplays(activeGold);
    }

    // 4. Synchronize role UI (badge & Questmaster panel access)
    const isHost = Boolean(currentUser && currentQMId && currentUser.id === currentQMId);
    const activeRole = isHost ? 'questmaster' : (currentParkProfile?.role || profile?.role || 'player');
    if (typeof syncUserRoleUI === 'function') {
      syncUserRoleUI(activeRole);
    }

    // 5. Initialize Park & QM Selector & affiliation banner
    if (typeof initProfileGroupSelector === 'function') {
      await initProfileGroupSelector();
    }

    if (typeof initQuestAbilitiesUI === 'function') {
      initQuestAbilitiesUI();
    }

    if (typeof fetchUserSlotState === 'function') await fetchUserSlotState();
    if (typeof fetchQuests === 'function') fetchQuests();
    if (typeof fetchMonsterEncounters === 'function') fetchMonsterEncounters();
    if (typeof fetchUserInventory === 'function') await fetchUserInventory();
    if (typeof renderStoreCatalog === 'function') renderStoreCatalog();
    if (typeof renderLibrary === 'function') renderLibrary();
    if (typeof fetchChronicles === 'function') fetchChronicles();
  } catch (err) {
    console.error('Fatal error during initDashboard:', err);
    const userDisplayEl = document.getElementById('user-display');
    if (userDisplayEl && currentUser) {
      userDisplayEl.innerText = currentUser.email || 'Player';
    }
  }
}


// Password Recovery Handlers & View Management
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerText = '🙈';
  } else {
    input.type = 'password';
    btn.innerText = '👁️';
  }
}

function activateRecoveryView() {
  document.documentElement.classList.add('recovery-mode');
  const mainCont = document.querySelector('main.container');
  const bottomNav = document.querySelector('nav.bottom-nav');
  const recView = document.getElementById('recovery-view');
  if (mainCont) mainCont.classList.add('hidden');
  if (bottomNav) bottomNav.classList.add('hidden');
  if (recView) recView.classList.remove('hidden');

  // Check for error parameters in URL (e.g., expired or invalid token)
  const hash = window.location.hash ? window.location.hash.substring(1) : '';
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(window.location.search);
  const urlError = hashParams.get('error_description') ||
                   searchParams.get('error_description') ||
                   hashParams.get('error') ||
                   searchParams.get('error');

  const errSection = document.getElementById('recovery-error-section');
  const errText = document.getElementById('recovery-error-text');
  const form = document.getElementById('recovery-form');

  if (urlError) {
    if (form) form.classList.add('hidden');
    if (errSection) errSection.classList.remove('hidden');
    if (errText) errText.innerText = "⚠️ " + decodeURIComponent(urlError.replace(/\+/g, ' '));
  } else {
    if (form) form.classList.remove('hidden');
    if (errSection) errSection.classList.add('hidden');
  }
}

async function handleRecoverySubmit(e) {
  if (e) e.preventDefault();
  const pass = document.getElementById('recovery-pass')?.value;
  const confirmPass = document.getElementById('recovery-confirm-pass')?.value;
  const statusEl = document.getElementById('recovery-status');
  const btn = document.getElementById('btn-recovery-submit');

  if (!pass || !confirmPass) {
    if (statusEl) {
      statusEl.style.color = "#f87171";
      statusEl.innerText = "Please fill out both password fields.";
    }
    return;
  }

  if (pass.length < 6) {
    if (statusEl) {
      statusEl.style.color = "#f87171";
      statusEl.innerText = "Password must be at least 6 characters long.";
    }
    return;
  }

  if (pass !== confirmPass) {
    if (statusEl) {
      statusEl.style.color = "#f87171";
      statusEl.innerText = "Passwords do not match.";
    }
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) {
    statusEl.style.color = "#c084fc";
    statusEl.innerText = "Updating password...";
  }

  try {
    const { data, error } = await supabaseClient.auth.updateUser({ password: pass });
    if (error) {
      if (statusEl) {
        statusEl.style.color = "#f87171";
        statusEl.innerText = error.message;
      }
      if (btn) btn.disabled = false;
    } else {
      if (statusEl) {
        statusEl.style.color = "#86efac";
        statusEl.innerText = "✨ Password successfully updated! Redirecting to Realm...";
      }
      setTimeout(() => {
        // Clean URL from hash tokens and load clean dashboard
        window.location.href = window.location.origin + window.location.pathname;
      }, 1500);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.style.color = "#f87171";
      statusEl.innerText = err.message || "Failed to update password.";
    }
    if (btn) btn.disabled = false;
  }
}

window.togglePasswordVisibility = togglePasswordVisibility;
window.activateRecoveryView = activateRecoveryView;
window.handleRecoverySubmit = handleRecoverySubmit;

// Listen for recovery auth events
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    window.__IS_RECOVERY = true;
    activateRecoveryView();
  } else if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
    if (session?.user) {
      currentUser = session.user;
    }
  }
});

// Bootstrap dashboard on page load
initDashboard();
