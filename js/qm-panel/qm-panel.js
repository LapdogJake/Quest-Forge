// ==============================================================================
// Quest-Forge: QM Panel Navigation & Shared QM Actions
// ==============================================================================

// Questmaster Panel sub-navigation
function switchQMSubTab(subTabName) {
  const tabs = ['battle', 'queues', 'items', 'quest', 'library', 'economy'];
  tabs.forEach(tab => {
    const el = document.getElementById(`qm-subtab-${tab}`);
    if (el) el.classList.add('hidden');
    const navBtn = document.getElementById(`qm-subnav-${tab}`);
    if (navBtn) navBtn.classList.remove('active');
  });

  const normalized = (subTabName === 'create') ? 'battle' : ((subTabName === 'tools') ? 'economy' : subTabName);
  const targetTab = document.getElementById(`qm-subtab-${normalized}`);
  const targetNav = document.getElementById(`qm-subnav-${normalized}`);

  if (targetTab) targetTab.classList.remove('hidden');
  if (targetNav) targetNav.classList.add('active');

  if (normalized === 'library' && typeof fetchQMQuests === 'function') {
    fetchQMQuests();
  } else if (normalized === 'queues' && typeof fetchQMQueues === 'function') {
    fetchQMQueues();
  } else if (normalized === 'items' && typeof fetchRealmItemConfig === 'function') {
    fetchRealmItemConfig();
  }
}

// Permanently delete a battle or quest from the QM catalog
async function qmDeleteQuest(questId, questTitle) {
  let title = questTitle;
  if (!title) {
    const { data } = await supabaseClient.from('quests').select('title').eq('id', questId).maybeSingle();
    title = data?.title || 'Quest';
  }

  const confirmed = confirm(`Are you sure you want to delete "${title}"?\n\nThis will permanently remove it from the catalog.`);
  if (!confirmed) return;

  try {
    // 1. Delete associated quest queues and members/monsters
    const { data: queues } = await supabaseClient
      .from('quest_queues')
      .select('id')
      .eq('quest_id', questId);

    if (queues && queues.length > 0) {
      const queueIds = queues.map(q => q.id);
      await supabaseClient.from('queue_members').delete().in('queue_id', queueIds);
      await supabaseClient.from('encounter_monsters').delete().in('queue_id', queueIds);
      await supabaseClient.from('quest_queues').delete().in('id', queueIds);
    }

    // 2. Delete user quest assignments/records
    await supabaseClient.from('user_quests').delete().eq('quest_id', questId);

    // 3. Delete the quest itself (scoped to the owning QM) with .select() to verify rows affected
    let delQuery = supabaseClient.from('quests').delete().eq('id', questId);
    if (currentUser?.id) delQuery = delQuery.eq('qm_id', currentUser.id);
    const { data: deletedRows, error } = await delQuery.select();
    
    if (error) {
      alert("Failed to delete quest: " + error.message);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      alert("⚠️ Database blocked deleting this quest.\n\nThis happens when Supabase Row-Level Security (RLS) is missing DELETE policies.\n\nPlease run the SQL in 'supabase_setup.sql' in your Supabase SQL Editor!");
      return;
    }

    // 4. Refresh all states
    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
    if (typeof fetchQMQuests === 'function') {
      await fetchQMQuests();
    }
    if (typeof fetchQMQueues === 'function') {
      await fetchQMQueues();
    }
  } catch (err) {
    console.error("Error deleting quest:", err);
    alert("Error deleting quest: " + (err.message || err));
  }
}

window.qmDeleteQuest = qmDeleteQuest;

// Archive a battle or quest to public.quest_archive and remove it from the active mobile catalog
async function qmArchiveQuest(questId, questTitle) {
  if (!currentUser) return;

  const { data: q, error: fetchErr } = await supabaseClient
    .from('quests')
    .select('*')
    .eq('id', questId)
    .maybeSingle();

  if (fetchErr || !q) {
    alert("Could not load quest details to archive: " + (fetchErr?.message || 'Not found'));
    return;
  }

  const title = q.title || questTitle || 'Quest';
  const isBattle = q.category === 'Battle' || q.category === 'Combat';
  const confirmed = confirm(
    `📦 Archive "${title}"?\n\n` +
    `This will save it to the shared Quest & Battle Archive Repository and remove it from your active mobile catalog.`
  );
  if (!confirmed) return;

  try {
    const rules = (typeof getQuestDurabilityRules === 'function')
      ? getQuestDurabilityRules(q)
      : {};
    const discName = (typeof getQuestDiscipline === 'function')
      ? getQuestDiscipline(q)
      : (q.discipline || 'Service');

    const activePark = q.park || (typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest"));
    const activeKingdom = q.kingdom || (typeof getActiveKingdom === 'function' ? getActiveKingdom() : (currentKingdom || "The Freeholds of Amtgard"));
    const authorName = currentProfile?.username || q.qm_username || currentQMUsername || 'Questmaster';

    const archivePayload = {
      title: title,
      category: isBattle ? 'Battle' : 'Quest',
      discipline: isBattle ? 'Battle' : discName,
      description: q.description || '',
      reward_gold: Number(q.reward_gold) || 0,
      reward_gold_defeat: Number(rules.defeatGold ?? q.reward_gold_defeat ?? 10),
      monster_reward: Number(rules.monsterReward ?? q.monster_reward ?? 10),
      scenario_card: q.scenario_card || '',
      repeatable: Boolean(q.repeatable),
      verification_method: rules.verificationMethod || q.verification_method || 'Quest Master',
      author_qm_id: currentUser.id,
      author_qm_username: authorName,
      origin_park: activePark,
      origin_kingdom: activeKingdom
    };

    const { error: insertErr } = await supabaseClient
      .from('quest_archive')
      .insert(archivePayload);

    if (insertErr) {
      alert(
        "⚠️ Could not archive to quest_archive table: " + insertErr.message +
        "\n\nMake sure you have run the new quest_archive SQL in your Supabase SQL Editor! Your quest was kept in your active catalog."
      );
      return;
    }

    // Remove from active queues & quests catalog now that it is safely archived
    const { data: queues } = await supabaseClient
      .from('quest_queues')
      .select('id')
      .eq('quest_id', questId);

    if (queues && queues.length > 0) {
      const queueIds = queues.map(row => row.id);
      await supabaseClient.from('queue_members').delete().in('queue_id', queueIds);
      await supabaseClient.from('encounter_monsters').delete().in('queue_id', queueIds);
      await supabaseClient.from('quest_queues').delete().in('id', queueIds);
    }

    await supabaseClient.from('user_quests').delete().eq('quest_id', questId);

    let delQuery = supabaseClient.from('quests').delete().eq('id', questId);
    if (currentUser?.id) delQuery = delQuery.eq('qm_id', currentUser.id);
    await delQuery;

    alert(`📦 "${title}" has been archived to the Quest & Battle Repository!`);

    await fetchUserSlotState();
    await fetchQuests();
    await fetchMonsterEncounters();
    if (typeof fetchQMQuests === 'function') await fetchQMQuests();
    if (typeof fetchQMQueues === 'function') await fetchQMQueues();
  } catch (err) {
    console.error("Error archiving quest:", err);
    alert("Error archiving quest: " + (err.message || err));
  }
}

window.qmArchiveQuest = qmArchiveQuest;

