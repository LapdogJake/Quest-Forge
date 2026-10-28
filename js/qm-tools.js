// ==============================================================================
// Quest-Forge: QM Panel — QM Tools & Campaign Controls (#qm-subtab-economy)
// ==============================================================================

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

    // 3. Delete QM registration from park_questmasters and associated chronicles
    await supabaseClient
      .from('park_questmasters')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('park', activePark);

    try {
      await supabaseClient
        .from('chronicles')
        .delete()
        .eq('qm_id', currentUser.id);
    } catch (e) {
      console.warn('Chronicles campaign cleanup notice:', e);
    }

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

