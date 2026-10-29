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

    // 3. Delete the quest itself with .select() to verify rows affected
    const { data: deletedRows, error } = await supabaseClient.from('quests').delete().eq('id', questId).select();
    
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

