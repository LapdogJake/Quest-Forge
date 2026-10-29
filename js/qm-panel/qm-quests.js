// ==============================================================================
// Quest-Forge: QM Panel — Forge Quest & Quest Catalog (#qm-subtab-quest & #qm-subtab-library)
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Forge Quest (#qm-subtab-quest)
// ------------------------------------------------------------------------------

async function createAdventureQuest() {
  const title = document.getElementById('qm-quest-title')?.value.trim();
  const discipline = document.getElementById('qm-quest-discipline')?.value || 'Service';
  const category = 'Quest';
  const goldInput = document.getElementById('qm-quest-gold');
  const reward_gold = goldInput ? (parseInt(goldInput.value) || 0) : 0;
  const description = document.getElementById('qm-quest-description')?.value.trim() || '';
  const repeatable = Boolean(document.getElementById('qm-quest-repeatable')?.checked);

  const verification_method = document.getElementById('qm-quest-verification')?.value || 'Quest Master';

  if (!title) { alert("Please enter a Quest Title."); return; }

  const rulesMeta = `<!-- RULES: ${JSON.stringify({ discipline, verification_method, repeatable })} -->`;
  const scenarioWithMeta = rulesMeta;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeKingdom = typeof getActiveKingdom === 'function' ? getActiveKingdom() : "The Freeholds of Amtgard";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawQMId = currentQMId || currentUser?.id || null;
  const activeQMId = (rawQMId && uuidRegex.test(rawQMId)) ? rawQMId : (currentUser?.id && uuidRegex.test(currentUser.id) ? currentUser.id : null);
  const activeQMUsername = currentQMUsername || currentProfile?.username || 'Questmaster';

  const questPayload = {
    title,
    discipline,
    category,
    reward_gold,
    description,
    scenario_card: scenarioWithMeta,
    repeatable,
    park: activePark,
    kingdom: activeKingdom,
    qm_id: activeQMId,
    qm_username: activeQMUsername,
    verification_method,
    is_active: true
  };

  let { error } = await supabaseClient.from('quests').insert(questPayload);

  // Resilient retry loop if any optional column is missing in Supabase schema cache
  if (error) {
    console.warn("Initial quest insert error, attempting schema fallback:", error.message);
    let fallbackPayload = { ...questPayload };

    // 1. Remove column identified directly in the error message
    const colMatch = error.message.match(/'([^']+)' column/) || error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
    if (colMatch && colMatch[1] && colMatch[1] in fallbackPayload) {
      delete fallbackPayload[colMatch[1]];
    }

    // 2. Remove recently added custom columns if they don't exist yet in user's Supabase schema
    // (Note: discipline and verification_method are already safely preserved inside scenario_card metadata)
    delete fallbackPayload.discipline;
    delete fallbackPayload.verification_method;

    // 3. ONLY remove park / kingdom / qm_id if the error message explicitly says those columns don't exist!
    if (error.message.includes('qm_id') || error.message.includes('qm_username')) {
      delete fallbackPayload.qm_id;
      delete fallbackPayload.qm_username;
    }
    if (error.message.includes('park')) delete fallbackPayload.park;
    if (error.message.includes('kingdom')) delete fallbackPayload.kingdom;
    if (error.message.includes('repeatable')) delete fallbackPayload.repeatable;

    let retry = await supabaseClient.from('quests').insert(fallbackPayload);
    if (retry.error) {
      console.warn("Second retry attempt for quest insert:", retry.error.message);
      const colMatch2 = retry.error.message.match(/'([^']+)' column/) || retry.error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
      if (colMatch2 && colMatch2[1] && colMatch2[1] in fallbackPayload) {
        delete fallbackPayload[colMatch2[1]];
      }
      if (retry.error.message.includes('repeatable')) delete fallbackPayload.repeatable;
      if (retry.error.message.includes('qm_id')) delete fallbackPayload.qm_id;
      if (retry.error.message.includes('qm_username')) delete fallbackPayload.qm_username;
      if (retry.error.message.includes('park')) delete fallbackPayload.park;
      if (retry.error.message.includes('kingdom')) delete fallbackPayload.kingdom;

      retry = await supabaseClient.from('quests').insert(fallbackPayload);
    }
    error = retry.error;
  }

  if (error) {
    console.error("Failed to save quest:", error);
    alert("Failed to save quest: " + error.message);
    return;
  }

  alert(`📜 Quest "${title}" published to catalog!`);

  if (document.getElementById('qm-quest-title')) document.getElementById('qm-quest-title').value = '';
  if (document.getElementById('qm-quest-discipline')) document.getElementById('qm-quest-discipline').value = 'Service';
  if (document.getElementById('qm-quest-description')) document.getElementById('qm-quest-description').value = '';
  if (goldInput) goldInput.value = '5';
  if (document.getElementById('qm-quest-repeatable')) document.getElementById('qm-quest-repeatable').checked = false;
  if (document.getElementById('qm-quest-verification')) document.getElementById('qm-quest-verification').value = 'Quest Master';

  await fetchUserSlotState();
  await fetchQuests();
  switchQMSubTab('library');
  if (typeof fetchQMQuests === 'function') {
    await fetchQMQuests();
  }
}

// ------------------------------------------------------------------------------
// 2. Quest Catalog (#qm-subtab-library)
// ------------------------------------------------------------------------------

// QM Catalog Engine (Non-Battle Quests only)
async function fetchQMQuests() {
  const container = document.getElementById('qm-quest-list');
  if (!container) return;

  const activePark = typeof getActivePark === 'function' ? getActivePark() : (currentPark || "Delver's Rest");
  const activeQMId = currentQMId || currentUser?.id;
  const activeQMName = typeof getActiveQMUsername === 'function' ? getActiveQMUsername() : 'Default Realm';
  const normActivePark = typeof normalizeParkName === 'function' ? normalizeParkName(activePark) : (activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  const myUserId = currentUser?.id;

  try {
    const { data: quests, error: questsErr } = await supabaseClient
      .from('quests')
      .select('*')
      .order('created_at', { ascending: false });

    if (questsErr) {
      console.error("Error querying quests in QM catalog:", questsErr);
      container.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error loading catalog: ${questsErr.message}</p>`;
      return;
    }

    // Only non-battle (Quest) quests belonging to the active park & QM are shown in the Quest Catalog tab
    const nonBattleQuests = (quests || []).filter(q => {
      if (q.category === 'Battle' || q.category === 'Combat' || q.category === 'RealmConfig' || q.title === '__REALM_ITEM_CONFIG__') return false;

      // Lenient park check (handles curly/straight apostrophes, case, null/unassigned)
      const normQPark = typeof normalizeParkName === 'function' ? normalizeParkName(q.park) : (q.park || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
      const parkMatches = !normQPark || !normActivePark || (normQPark === normActivePark);
      if (!parkMatches) return false;

      // QM / Creator match:
      // Show if unassigned QM, OR matches active QM, OR created by the currently logged-in user
      const isMyQuest = Boolean(myUserId && q.qm_id === myUserId);
      const qmMatches = !q.qm_id || !activeQMId || (q.qm_id === activeQMId) || isMyQuest;
      return qmMatches;
    });

    // Sort: Quest Open first, Quest Closed second; then by Discipline, then by title
    nonBattleQuests.sort((a, b) => {
      const stateA = a.is_active ? 0 : 1;
      const stateB = b.is_active ? 0 : 1;
      if (stateA !== stateB) return stateA - stateB;

      const discA = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(a) : 'Service';
      const discB = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(b) : 'Service';
      const idxA = (typeof DISCIPLINE_ORDER !== 'undefined') ? DISCIPLINE_ORDER.indexOf(discA) : -1;
      const idxB = (typeof DISCIPLINE_ORDER !== 'undefined') ? DISCIPLINE_ORDER.indexOf(discB) : -1;
      const posA = idxA !== -1 ? idxA : 999;
      const posB = idxB !== -1 ? idxB : 999;
      if (posA !== posB) return posA - posB;
      return (a.title || '').localeCompare(b.title || '');
    });

    if (nonBattleQuests.length === 0) {
      container.innerHTML = `<p class="empty-state">No non-battle quests in the catalog for ${activePark} (${activeQMName}).</p>`;
      return;
    }

    const nonBattleQuestIds = nonBattleQuests.map(q => q.id);

    // 1. Fetch user quest rows directly without relational join to prevent PostgREST foreign key cache errors
    let userAssignments = [];
    try {
      const { data: rawAssignments, error: uqErr } = await supabaseClient
        .from('user_quests')
        .select('id, quest_id, user_id, status, created_at')
        .in('quest_id', nonBattleQuestIds);

      if (uqErr) {
        console.warn("Could not query user_quests in QM catalog:", uqErr);
      } else if (rawAssignments) {
        userAssignments = rawAssignments;
      }
    } catch (err) {
      console.error("Fatal error fetching user_quests in QM catalog:", err);
    }

    // 2. Fetch profiles for all distinct users who accepted or completed these quests
    const userIds = [...new Set(userAssignments.map(u => u.user_id).filter(Boolean))];
    const profilesMap = new Map();

    if (userIds.length > 0) {
      try {
        const { data: profs, error: profErr } = await supabaseClient
          .from('profiles')
          .select('id, username, quest_abilities')
          .in('id', userIds);

        if (!profErr && profs) {
          profs.forEach(p => profilesMap.set(p.id, p));
        }
      } catch (err) {
        console.warn("Could not resolve profiles for questers:", err);
      }
    }

    // 3. Attach profile info and organize into active vs completed maps
    const activeByQuest = new Map();
    const completedByQuest = new Map();

    userAssignments.forEach(ua => {
      const prof = profilesMap.get(ua.user_id);
      ua.profiles = {
        id: ua.user_id,
        username: prof?.username || 'Adventurer',
        quest_abilities: prof?.quest_abilities || []
      };

      const st = (ua.status || '').toLowerCase();
      if (st === 'accepted' || st === 'active') {
        if (!activeByQuest.has(ua.quest_id)) activeByQuest.set(ua.quest_id, []);
        activeByQuest.get(ua.quest_id).push(ua);
      } else if (st === 'completed') {
        if (!completedByQuest.has(ua.quest_id)) completedByQuest.set(ua.quest_id, []);
        completedByQuest.get(ua.quest_id).push(ua);
      }
    });

    const openCardIds = new Set(
      Array.from(container.querySelectorAll('details.quest-accordion[open]'))
        .map(el => el.getAttribute('data-quest-id'))
        .filter(Boolean)
    );

    const escapeAttr = (str) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const disciplinesList = (typeof QUEST_DISCIPLINES !== 'undefined' && Array.isArray(QUEST_DISCIPLINES))
      ? QUEST_DISCIPLINES
      : [
          { name: 'Service', icon: '🌹' },
          { name: 'Bardic', icon: '🎵' },
          { name: 'Roleplay', icon: '🎭' },
          { name: 'Exploration', icon: '🌿' },
          { name: 'Crafting', icon: '🛠' },
          { name: 'Arts & Sciences', icon: '🎨' },
          { name: 'Knowledge', icon: '📚' },
          { name: 'Challenge', icon: '🏆' },
          { name: 'Trial', icon: '🏅' }
        ];

    container.innerHTML = nonBattleQuests.map(q => {
      const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(q) : { maxActive: 0, maxCompletions: 0, verificationMethod: 'Quest Master' };
      const maxActive = rules.maxActive || 0;
      const maxCompletions = rules.maxCompletions || 0;
      const verificationMethod = rules.verificationMethod || 'Quest Master';
      const discName = typeof getQuestDiscipline === 'function' ? getQuestDiscipline(q) : 'Service';
      const discIcon = typeof getQuestDisciplineIcon === 'function' ? getQuestDisciplineIcon(discName) : '🌹';

      const activeList = activeByQuest.get(q.id) || [];
      const activeCount = activeList.length;
      const isOpen = openCardIds.has(String(q.id));

      const borderColor = q.is_active ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)';
      const statusBadge = q.is_active
        ? '<span class="badge badge-active" style="background:#16a34a; color:white; border-color:#22c55e; font-size:11px; font-weight:700; white-space:nowrap; padding:3px 8px;">🟢 Quest Open</span>'
        : '<span class="badge badge-draft" style="color:#94a3b8; border-color:#52525b; font-size:11px; font-weight:700; white-space:nowrap; padding:3px 8px;">⚪ Quest Closed</span>';

      return `
        <details class="quest-accordion" data-quest-id="${q.id}" ${isOpen ? 'open' : ''} style="border: 2px solid ${borderColor}; margin-bottom: 12px;">
          <summary>
            <span class="quest-summary-title" style="font-size:14px; font-weight:700;">${discIcon} ${q.title}</span>
            <span class="quest-summary-actions">
              ${activeCount > 0 ? `<span style="font-size:12px; color:#94a3b8; font-weight:600;">👥 ${activeCount}</span>` : ''}
              ${statusBadge}
            </span>
          </summary>

          <div class="quest-accordion-content" style="padding-top:6px;">
            <!-- 1. BADGES CONTAINER -->
            <div class="tag-container" style="margin-bottom:8px;">
              <span class="badge badge-discipline">${discIcon} ${discName}</span>
              <span class="badge badge-type">🪙 ${q.reward_gold} Gold</span>
              <span class="badge badge-type" style="color:#c084fc; border-color:rgba(192,132,252,0.4);">
                ${verificationMethod === 'Quest Master' ? '👑 QM Verified' : '🤝 Self-Report'}
              </span>
              ${q.repeatable ? '<span class="badge badge-quest">🔁 Repeatable</span>' : ''}
            </div>

            <!-- 2. DESCRIPTION -->
            ${q.description ? `<p style="font-size:13px; color:#cbd5e1; margin:6px 0 10px 0; line-height:1.45;">${q.description}</p>` : ''}

            <!-- 3. QUESTER ROSTER -->
            <div class="qm-questers-box" style="margin-top:8px; margin-bottom:10px;">
              <div class="qm-questers-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-weight:700; font-size:12px; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">
                    Questers
                  </span>
                  <span class="queue-count-pill" style="color:var(--primary); border:1px solid rgba(56,189,248,0.3);">${activeCount}</span>
                </div>
              </div>
              <div class="qm-questers-list">
                ${activeList.length > 0 ? activeList.map(aq => {
                  const uName = aq.profiles?.username || 'Adventurer';
                  const abs = Array.isArray(aq.profiles?.quest_abilities) ? aq.profiles.quest_abilities : [];
                  const absBadges = abs.map(a => `<span class="ability-pill">${a}</span>`).join('');
                  return `
                    <div class="qm-quester-item">
                      <div class="qm-quester-info">
                        <span class="qm-quester-name">👤 ${uName}</span>
                        ${absBadges}
                      </div>
                      <div class="qm-quester-actions">
                        <button class="btn-qm-verify" onclick="qmVerifyCompleteQuest('${aq.id}', '${aq.user_id}', '${q.id}', ${q.reward_gold}, '${(q.title || '').replace(/'/g, "\\'")}', ${maxCompletions})">
                          Complete
                        </button>
                        <button class="btn-qm-kick" onclick="qmKickUserFromQuest('${aq.id}', '${(uName).replace(/'/g, "\\'")}', '${(q.title || '').replace(/'/g, "\\'")}')">
                          Kick
                        </button>
                      </div>
                    </div>
                  `;
                }).join('') : '<p class="empty-roster-msg">No players currently on this quest.</p>'}
              </div>
            </div>

            <!-- 4. BOTTOM ACTIONS -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; gap:8px;">
              ${q.is_active ? `
                <button class="btn-leave" style="flex:1; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px;" onclick="toggleQuestDeployment('${q.id}', true)">
                  Close
                </button>
              ` : `
                <button class="btn-battle-action btn-battle-hero" style="flex:1; min-height:40px; font-size:13px; font-weight:bold; border-radius:6px; text-transform:none;" onclick="toggleQuestDeployment('${q.id}', false)">
                  Open
                </button>
              `}
              <button type="button" class="btn-secondary" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; border-radius:6px; background:#27272a; border:1px solid #3f3f46; color:#e4e4e7; cursor:pointer;" onclick="toggleQMQuestEdit('${q.id}')" title="Edit quest details">
                ✏️ Edit
              </button>
              <button class="btn-delete" style="min-height:40px; padding:8px 14px; font-size:13px; font-weight:bold; justify-content:center; border-radius:6px;" onclick="qmDeleteQuest('${q.id}', '${(q.title || '').replace(/'/g, "\\'")}')" title="Delete quest from catalog">
                🗑️ Delete
              </button>
            </div>

            <!-- 5. INLINE EDIT FORM (TOGGLED VIA EDIT BUTTON) -->
            <div id="qm-quest-edit-form-${q.id}" class="hidden" style="margin-top:12px; padding:12px; background:#18181b; border:1px solid var(--primary); border-radius:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <span style="font-weight:700; font-size:13px; color:var(--primary);">✏️ Edit Quest</span>
                <button type="button" onclick="toggleQMQuestEdit('${q.id}', false)" style="background:transparent; border:none; color:var(--text-muted); font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
              </div>

              <div class="form-group" style="margin-bottom:8px;">
                <label style="font-size:12px;">Quest Title</label>
                <input type="text" id="qm-edit-quest-title-${q.id}" class="form-control" value="${escapeAttr(q.title)}">
              </div>

              <div class="form-row" style="margin-bottom:8px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:12px;">Discipline</label>
                  <select id="qm-edit-quest-discipline-${q.id}" class="form-control">
                    ${disciplinesList.map(d => `<option value="${d.name}" ${d.name === discName ? 'selected' : ''}>${d.icon} ${d.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:12px;">Reward Gold</label>
                  <input type="number" id="qm-edit-quest-gold-${q.id}" class="form-control" value="${Number(q.reward_gold) || 0}" min="0">
                </div>
              </div>

              <div class="form-group" style="margin-bottom:8px;">
                <label style="font-size:12px;">Description & Objectives</label>
                <textarea id="qm-edit-quest-description-${q.id}" class="form-control" style="min-height:75px;">${escapeAttr(q.description || '')}</textarea>
              </div>

              <div class="form-group" style="margin-bottom:10px;">
                <label style="font-size:12px;">Verification System</label>
                <select id="qm-edit-quest-verification-${q.id}" class="form-control">
                  <option value="Quest Master" ${verificationMethod === 'Quest Master' ? 'selected' : ''}>Questmaster</option>
                  <option value="Honor" ${verificationMethod === 'Honor' ? 'selected' : ''}>Honor</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom:12px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px; margin:0;">
                  <input type="checkbox" id="qm-edit-quest-repeatable-${q.id}" ${q.repeatable ? 'checked' : ''} style="width:16px; height:16px;">
                  <span>Repeatable Quest</span>
                </label>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button type="button" onclick="toggleQMQuestEdit('${q.id}', false)" style="background:#27272a; border:1px solid var(--border); color:var(--text); padding:8px 14px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;">
                  Cancel
                </button>
                <button type="button" id="btn-save-quest-${q.id}" onclick="qmSaveEditedQuest('${q.id}')" style="background:var(--primary); border:none; color:#ffffff; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </details>
      `;
    }).join('');
  } catch (err) {
    console.error("Fatal error rendering QM quests catalog:", err);
    container.innerHTML = `<p class="empty-state" style="color:var(--danger);">Error rendering quest catalog: ${err.message || err}</p>`;
  }
}

async function qmVerifyCompleteQuest(userQuestId, userId, questId, rewardGold, questTitle, maxCompletions = 0) {
  const confirmed = confirm(`Verify completion for this player on "${questTitle}"?\n\nThis will award +${rewardGold} Gold to their character and complete the quest.`);
  if (!confirmed) return;

  try {
    // 1. Mark user_quest as completed
    const { error: updateErr } = await supabaseClient
      .from('user_quests')
      .update({ status: 'completed' })
      .eq('id', userQuestId);

    if (updateErr) {
      alert("Error completing quest: " + updateErr.message);
      return;
    }

    // 2. Award gold to user in active park/QM
    if (typeof awardGoldToUser === 'function') {
      await awardGoldToUser(userId, rewardGold);
    }

    // 3. Trigger RNG Loot Drops if quest has them enabled
    const { data: qData } = await supabaseClient.from('quests').select('*').eq('id', questId).maybeSingle();
    const rules = typeof getQuestDurabilityRules === 'function' ? getQuestDurabilityRules(qData) : { rngLootDrops: false };
    let lootNotice = '';
    if (rules.rngLootDrops && typeof rollItemLootDrops === 'function') {
      const dropResults = await rollItemLootDrops([userId], false, qData?.qm_id, qData?.park, qData?.kingdom);
      if (dropResults && dropResults.length > 0 && dropResults[0].items && dropResults[0].items.length > 0) {
        const drop = dropResults[0];
        lootNotice = `\n\n🎲 MYSTERY LOOT DROPPED!\n${drop.username} received:\n• ${drop.items.join('\n• ')}`;
      } else {
        lootNotice = `\n\n🎲 Mystery Loot: Roll cast, but no items dropped.`;
      }
    }

    // 4. Check if max completions reached
    if (maxCompletions > 0) {
      const { data: compRows } = await supabaseClient
        .from('user_quests')
        .select('id')
        .eq('quest_id', questId)
        .eq('status', 'completed');

      const totalCompleted = compRows?.length || 0;
      if (totalCompleted >= maxCompletions) {
        // Auto close field openings
        await supabaseClient.from('quests').update({ is_active: false }).eq('id', questId);
        alert(`🏆 Quest "${questTitle}" finished! Max completions (${maxCompletions}/${maxCompletions}) reached. Quest is now closed on the field.${lootNotice}`);
      } else {
        alert(`✨ Quest verified! +${rewardGold}g awarded to player (${totalCompleted}/${maxCompletions} completed).${lootNotice}`);
      }
    } else {
      alert(`✨ Quest verified! +${rewardGold}g awarded to player.${lootNotice}`);
    }

    await fetchQMQuests();
    await fetchUserSlotState();
    await fetchQuests();
  } catch (err) {
    console.error("Error verifying quest completion:", err);
    alert("Error: " + (err.message || err));
  }
}

async function qmKickUserFromQuest(userQuestId, username, questTitle) {
  const confirmed = confirm(`Remove "${username}" from "${questTitle}"?\n\nThis will remove them from the active quest list and free up their quest slot.`);
  if (!confirmed) return;

  try {
    await supabaseClient
      .from('user_quests')
      .update({ status: 'abandoned' })
      .eq('id', userQuestId);

    alert(`🚫 ${username} removed from "${questTitle}".`);
    await fetchQMQuests();
    await fetchUserSlotState();
    await fetchQuests();
  } catch (err) {
    console.error("Error kicking user from quest:", err);
    alert("Error removing player: " + (err.message || err));
  }
}

window.qmVerifyCompleteQuest = qmVerifyCompleteQuest;
window.qmKickUserFromQuest = qmKickUserFromQuest;

async function toggleQuestDeployment(questId, currentActiveState) {
  const nextState = !currentActiveState;
  const { error } = await supabaseClient.from('quests').update({ is_active: nextState }).eq('id', questId);

  if (error) {
    alert("Error updating quest deployment: " + error.message);
    return;
  }

  // Archive user completions/assignments when QM toggles quest deployment state (off or on)
  await supabaseClient.from('user_quests').update({ status: 'closed' }).eq('quest_id', questId);

  await fetchUserSlotState();
  await fetchQMQuests();
  await fetchQuests();
  await fetchMonsterEncounters();
}

function toggleQMQuestEdit(questId, forceOpen = null) {
  const formEl = document.getElementById(`qm-quest-edit-form-${questId}`);
  if (!formEl) return;
  const shouldOpen = forceOpen !== null ? forceOpen : formEl.classList.contains('hidden');
  if (shouldOpen) {
    formEl.classList.remove('hidden');
    document.getElementById(`qm-edit-quest-title-${questId}`)?.focus();
  } else {
    formEl.classList.add('hidden');
  }
}

async function qmSaveEditedQuest(questId) {
  if (!questId) return;

  const title = document.getElementById(`qm-edit-quest-title-${questId}`)?.value.trim();
  const discipline = document.getElementById(`qm-edit-quest-discipline-${questId}`)?.value || 'Service';
  const goldInput = document.getElementById(`qm-edit-quest-gold-${questId}`);
  const reward_gold = goldInput ? (parseInt(goldInput.value, 10) || 0) : 0;
  const description = document.getElementById(`qm-edit-quest-description-${questId}`)?.value.trim() || '';
  const verification_method = document.getElementById(`qm-edit-quest-verification-${questId}`)?.value || 'Quest Master';
  const repeatable = Boolean(document.getElementById(`qm-edit-quest-repeatable-${questId}`)?.checked);

  if (!title) {
    alert("Please enter a Quest Title.");
    return;
  }

  const saveBtn = document.getElementById(`btn-save-quest-${questId}`);
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";
  }

  try {
    const scenario_card = `<!-- RULES: ${JSON.stringify({ discipline, verification_method, repeatable })} -->`;

    const updatePayload = {
      title,
      discipline,
      reward_gold,
      description,
      scenario_card,
      repeatable,
      verification_method
    };

    let { error } = await supabaseClient
      .from('quests')
      .update(updatePayload)
      .eq('id', questId);

    // Resilient fallback if any optional column is missing in Supabase schema cache
    if (error) {
      console.warn("Initial quest update error, attempting schema fallback:", error.message);
      let fallbackPayload = { ...updatePayload };
      const colMatch = error.message.match(/'([^']+)' column/) || error.message.match(/column ["']?([^"'\s]+)["']? of relation/);
      if (colMatch && colMatch[1] && colMatch[1] in fallbackPayload) {
        delete fallbackPayload[colMatch[1]];
      }
      delete fallbackPayload.discipline;
      delete fallbackPayload.verification_method;
      if (error.message.includes('repeatable')) delete fallbackPayload.repeatable;

      const retry = await supabaseClient
        .from('quests')
        .update(fallbackPayload)
        .eq('id', questId);
      error = retry.error;
    }

    if (error) {
      alert("Failed to update quest: " + error.message);
      return;
    }

    alert(`✨ Quest "${title}" updated!`);
    await fetchQMQuests();
    await fetchUserSlotState();
    await fetchQuests();
  } catch (err) {
    console.error("Error updating quest:", err);
    alert("Error updating quest: " + (err.message || err));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save Changes";
    }
  }
}

window.toggleQMQuestEdit = toggleQMQuestEdit;
window.qmSaveEditedQuest = qmSaveEditedQuest;


