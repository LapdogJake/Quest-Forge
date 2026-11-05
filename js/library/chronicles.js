// ==============================================================================
// Quest-Forge: Chronicles System
// Questmaster-Scoped Journal Feed, Quest Summaries, Lore & Announcements
// ==============================================================================

// In-memory list of active chronicles
let chroniclesList = [];

// In-memory map of chronicle_id -> array of comments sorted by timestamp (oldest -> newest)
let chronicleCommentsByEntry = {};

// Local storage keys for offline & resilience fallback
const CHRONICLES_STORAGE_KEY = 'qf_chronicles_store';
const CHRONICLE_COMMENTS_STORAGE_KEY = 'qf_chronicle_comments_store';

// Standard UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
}

/**
 * Check if the active user possesses Questmaster privileges FOR THE CURRENTLY ACTIVE REALM
 */
function isQMAuthorized() {
  if (typeof currentUser === 'undefined' || !currentUser) return false;

  const isCurrentQMHost = Boolean(
    typeof currentQMId !== 'undefined' && currentQMId && String(currentUser.id) === String(currentQMId)
  );

  const isAdmin =
    (typeof currentProfile !== 'undefined' && currentProfile?.role === 'admin') ||
    (typeof currentParkProfile !== 'undefined' && currentParkProfile?.role === 'admin');

  return isCurrentQMHost || isAdmin;
}

/**
 * Retrieve the active Questmaster ID for Chronicles (strictly QM-scoped)
 */
function getChronicleActiveQMId() {
  // If current user is a Questmaster viewing/authoring in their own realm:
  if (isQMAuthorized() && typeof currentUser !== 'undefined' && currentUser?.id) {
    if (typeof currentQMId !== 'undefined' && currentQMId) {
      return currentQMId;
    }
    return currentUser.id;
  }

  // For adventurers/players: return the active QM ID of the realm they entered
  if (typeof currentQMId !== 'undefined' && currentQMId) {
    return currentQMId;
  }
  if (typeof currentParkProfile !== 'undefined' && currentParkProfile?.qm_id) {
    return currentParkProfile.qm_id;
  }
  if (typeof currentProfile !== 'undefined' && currentProfile?.last_active_qm_id) {
    return currentProfile.last_active_qm_id;
  }

  // Fallback: Check park's registered Questmasters if session hasn't explicitly selected one
  if (typeof parkQMsList !== 'undefined' && Array.isArray(parkQMsList) && parkQMsList.length > 0) {
    const activePark = getChronicleActivePark();
    const matchingQM = parkQMsList.find(q => q.park === activePark) || parkQMsList[0];
    if (matchingQM?.user_id) {
      return matchingQM.user_id;
    }
  }

  return null;
}

/**
 * Retrieve current active park name
 */
function getChronicleActivePark() {
  if (typeof getActivePark === 'function') {
    return getActivePark();
  }
  return (typeof currentPark !== 'undefined' && currentPark)
    || (typeof currentParkProfile !== 'undefined' && currentParkProfile?.park)
    || (typeof currentProfile !== 'undefined' && currentProfile?.park)
    || "Delver's Rest";
}

/**
 * Retrieve author display persona name
 */
function getChronicleAuthorName() {
  return (typeof currentParkProfile !== 'undefined' && currentParkProfile?.username)
    || (typeof currentProfile !== 'undefined' && currentProfile?.username)
    || (typeof currentUser !== 'undefined' && currentUser?.user_metadata?.username)
    || (typeof currentQMUsername !== 'undefined' && currentQMUsername)
    || 'Questmaster';
}

/**
 * Safe HTML string escaping
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format timestamp into user-friendly date
 */
function formatChronicleDate(dateInput) {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Local storage persistence helpers
 */
function loadLocalChronicles() {
  try {
    const raw = localStorage.getItem(CHRONICLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read chronicles from localStorage:', e);
  }
  return [];
}

function saveLocalChronicles(list) {
  try {
    localStorage.setItem(CHRONICLES_STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.warn('Could not write chronicles to localStorage:', e);
  }
}

function loadLocalChronicleComments() {
  try {
    const raw = localStorage.getItem(CHRONICLE_COMMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return {};
}

function saveLocalChronicleComments(mapObj) {
  try {
    localStorage.setItem(CHRONICLE_COMMENTS_STORAGE_KEY, JSON.stringify(mapObj || {}));
  } catch (e) {}
}

function formatCommentTimestamp(dateInput) {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (e) {
    return String(dateInput);
  }
}

function formatCommentBodyWithMentions(rawBody) {
  const safe = escapeHTML(rawBody || '');
  return safe.replace(/(^|\s)(@[A-Za-z0-9_.\-]+)/g, '$1<span class="chronicle-mention">$2</span>');
}

async function fetchChronicleComments(chronicleIds = []) {
  const localMap = loadLocalChronicleComments();
  chronicleCommentsByEntry = { ...localMap };

  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

  const validUuidIds = (chronicleIds || []).filter(id => isValidUUID(String(id)));
  if (validUuidIds.length === 0) return;

  try {
    const { data, error } = await supabaseClient
      .from('chronicle_comments')
      .select('*')
      .in('chronicle_id', validUuidIds)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      const grouped = {};
      validUuidIds.forEach(cid => { grouped[cid] = []; });
      data.forEach(row => {
        const cid = String(row.chronicle_id);
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push(row);
      });
      // Sort each thread strictly by timestamp ascending
      Object.keys(grouped).forEach(cid => {
        grouped[cid].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      });
      chronicleCommentsByEntry = { ...localMap, ...grouped };
      saveLocalChronicleComments(chronicleCommentsByEntry);
    }
  } catch (err) {
    console.warn('Could not fetch chronicle_comments:', err);
  }
}

/**
 * Fetch chronicles from Supabase with Questmaster scoping, graceful auto-sync, and local storage fallback
 */
async function fetchChronicles() {
  const activePark = getChronicleActivePark();
  const activeQMId = getChronicleActiveQMId();

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('chronicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        chroniclesList = data;

        // Auto-sync: If this device has any local drafts/posts authored by current QM
        // that failed to insert into Supabase earlier (e.g. from a non-UUID or schema error),
        // automatically upload them to Supabase so players can see them immediately!
        if (isQMAuthorized() && typeof currentUser !== 'undefined' && currentUser?.id) {
          const localEntries = loadLocalChronicles();
          for (const localEntry of localEntries) {
            if (localEntry && (localEntry.author_id === currentUser.id || !localEntry.author_id)) {
              const alreadyInDb = chroniclesList.some(e => 
                (e.id && localEntry.id && String(e.id) === String(localEntry.id)) ||
                (e.title === localEntry.title && e.created_at === localEntry.created_at)
              );
              if (!alreadyInDb && localEntry.title && localEntry.body) {
                try {
                  const syncPayload = {
                    title: localEntry.title,
                    body: localEntry.body,
                    category: localEntry.category || 'Chronicle',
                    park: localEntry.park || activePark,
                    author_id: isValidUUID(currentUser.id) ? currentUser.id : null,
                    author_name: localEntry.author_name || getChronicleAuthorName(),
                    is_pinned: Boolean(localEntry.is_pinned),
                    expires_at: localEntry.expires_at || null
                  };
                  if (isValidUUID(activeQMId)) {
                    syncPayload.qm_id = activeQMId;
                  }
                  const { data: syncedRow, error: syncErr } = await supabaseClient
                    .from('chronicles')
                    .insert(syncPayload)
                    .select('*')
                    .maybeSingle();

                  if (!syncErr && syncedRow) {
                    localEntry.id = syncedRow.id;
                    chroniclesList.unshift(syncedRow);
                  }
                } catch (syncEx) {
                  console.warn('Chronicle auto-sync notice:', syncEx);
                }
              }
            }
          }
        }

        saveLocalChronicles(chroniclesList);
        await fetchChronicleComments(chroniclesList.map(c => c.id));
        renderChroniclesLibrary();
        return chroniclesList;
      } else if (error) {
        console.warn('Supabase fetch error for chronicles:', error.message);
      }
    } catch (err) {
      console.warn('Network or schema issue fetching chronicles:', err);
    }
  }

  // Fallback to locally persisted entries
  chroniclesList = loadLocalChronicles();
  chronicleCommentsByEntry = loadLocalChronicleComments();
  renderChroniclesLibrary();
  return chroniclesList;
}

/**
 * Sorting & Filtering Priority (Strictly Questmaster-Scoped):
 * 1. Must match active Questmaster realm (if activeQMId is active) or active park
 * 2. Active Announcements at the top (unless expired, in which case expired are hidden)
 * 3. Pinned posts next
 * 4. Chronological (newest first) for both Chronicles and Lore
 */
function getSortedAndFilteredChronicles() {
  const activePark = getChronicleActivePark();
  const normActivePark = (activePark || '').replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
  const activeQMId = getChronicleActiveQMId();
  const myUserId = (typeof currentUser !== 'undefined' && currentUser?.id) || null;
  const now = Date.now();

  return chroniclesList
    .filter(entry => {
      // 0. Active park scoping: entries must match player's active park (with apostrophe normalization)
      if (normActivePark && entry.park) {
        const normEntryPark = String(entry.park).replace(/[\u2018\u2019']/g, "'").trim().toLowerCase();
        if (normEntryPark && normEntryPark !== normActivePark) {
          return false;
        }
      }

      // 1. STRICT QUESTMASTER SCOPING:
      // Must match the currently selected Questmaster's realm (activeQMId)
      if (activeQMId) {
        const matchesQM = String(entry.qm_id || '') === String(activeQMId) || String(entry.author_id || '') === String(activeQMId);
        if (!matchesQM) return false;
      } else {
        if (entry.qm_id) return false;
      }

      // 2. Expiration check for announcements
      if (entry.category === 'Announcement' && entry.expires_at) {
        let expTime;
        if (typeof entry.expires_at === 'string' && entry.expires_at.length === 10) {
          expTime = new Date(`${entry.expires_at}T23:59:59`).getTime();
        } else {
          expTime = new Date(entry.expires_at).getTime();
        }
        if (now > expTime) {
          return false; // Auto-hide expired announcements
        }
      }

      return true;
    })
    .sort((a, b) => {
      const aIsAnnouncement = a.category === 'Announcement';
      const bIsAnnouncement = b.category === 'Announcement';

      // Active announcements anchored to the top
      if (aIsAnnouncement && !bIsAnnouncement) return -1;
      if (!aIsAnnouncement && bIsAnnouncement) return 1;

      // Pinned posts next
      const aPinned = Boolean(a.is_pinned);
      const bPinned = Boolean(b.is_pinned);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Chronological (newest first)
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
}

/**
 * Synchronize Questmaster button visibility based on permissions
 */
function syncChroniclesQMVisibility() {
  const qmHeader = document.getElementById('chronicles-qm-header');
  const isQM = isQMAuthorized();

  if (qmHeader) {
    if (isQM) {
      qmHeader.classList.remove('hidden');
      qmHeader.style.display = 'block';
    } else {
      qmHeader.classList.add('hidden');
      qmHeader.style.display = 'none';
      cancelChronicleForm(); // Close form if user lost QM permissions
    }
  }
}

/**
 * Toggle the creation form card
 */
function toggleChronicleForm(forceOpen = null) {
  const formCard = document.getElementById('chronicle-form-card');
  if (!formCard) return;

  const shouldOpen = forceOpen !== null ? forceOpen : formCard.classList.contains('hidden');

  if (shouldOpen) {
    formCard.classList.remove('hidden');
    document.getElementById('chronicle-title-input')?.focus();
  } else {
    formCard.classList.add('hidden');
  }
}

/**
 * Close and reset the creation / edit form
 */
function cancelChronicleForm() {
  const formCard = document.getElementById('chronicle-form-card');
  const form = document.getElementById('chronicle-editor-form');
  const heading = document.getElementById('chronicle-form-heading');
  const submitBtn = document.getElementById('chronicle-submit-btn');
  const editIdInput = document.getElementById('chronicle-edit-id');
  const expiresContainer = document.getElementById('chronicle-expires-container');

  if (form) form.reset();
  if (editIdInput) editIdInput.value = '';
  if (heading) heading.innerHTML = '<span>📜</span> <span>New Chronicle Entry</span>';
  if (submitBtn) submitBtn.innerText = 'Publish Entry';
  if (expiresContainer) expiresContainer.classList.add('hidden');

  if (formCard) formCard.classList.add('hidden');
}

/**
 * Handle category selector changes (conditionally show expiration date picker)
 */
function handleChronicleCategoryChange(category) {
  const expiresContainer = document.getElementById('chronicle-expires-container');
  if (!expiresContainer) return;

  if (category === 'Announcement') {
    expiresContainer.classList.remove('hidden');
  } else {
    expiresContainer.classList.add('hidden');
    const expiresInput = document.getElementById('chronicle-expires-input');
    if (expiresInput) expiresInput.value = '';
  }
}

/**
 * Toast notification banner helper
 */
function showChronicleToast(message, type = 'success') {
  let toastContainer = document.getElementById('qf-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'qf-toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const accent = type === 'error' ? '#ef4444' : '#10b981';
  const icon = type === 'error' ? '⚠️' : '✨';

  toast.style.cssText = `
    background: #18181b;
    color: #ffffff;
    border-left: 4px solid ${accent};
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    border: 1px solid rgba(255,255,255,0.1);
    pointer-events: auto;
  `;
  toast.innerHTML = `<span>${icon}</span><span style="flex:1;">${escapeHTML(message)}</span>`;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/**
 * Handle form submission: Publish or Update Entry
 */
async function handleSaveChronicle(event) {
  if (event) event.preventDefault();

  if (!isQMAuthorized()) {
    showChronicleToast('Only Questmasters can publish chronicles.', 'error');
    return;
  }

  const editIdInput = document.getElementById('chronicle-edit-id');
  const titleInput = document.getElementById('chronicle-title-input');
  const categorySelect = document.getElementById('chronicle-category-select');
  const expiresInput = document.getElementById('chronicle-expires-input');
  const pinnedInput = document.getElementById('chronicle-pinned-input');
  const bodyInput = document.getElementById('chronicle-body-input');
  const submitBtn = document.getElementById('chronicle-submit-btn');

  const editId = editIdInput ? editIdInput.value.trim() : '';
  const title = titleInput ? titleInput.value.trim() : '';
  const category = categorySelect ? categorySelect.value : 'Chronicle';
  const expires_at = (category === 'Announcement' && expiresInput && expiresInput.value) ? expiresInput.value : null;
  const is_pinned = pinnedInput ? pinnedInput.checked : false;
  const body = bodyInput ? bodyInput.value.trim() : '';

  if (!title) {
    showChronicleToast('Please enter an entry title.', 'error');
    return;
  }

  if (!body) {
    showChronicleToast('Please provide text for the body.', 'error');
    return;
  }

  const activePark = getChronicleActivePark();
  const activeQMId = getChronicleActiveQMId();
  const authorName = getChronicleAuthorName();
  const authorId = (typeof currentUser !== 'undefined' && currentUser?.id) || null;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = editId ? 'Updating...' : 'Publishing...';
  }

  try {
    if (editId) {
      // UPDATE EXISTING ENTRY
      const index = chroniclesList.findIndex(e => String(e.id) === String(editId));
      if (index !== -1) {
        chroniclesList[index] = {
          ...chroniclesList[index],
          title,
          category,
          expires_at,
          is_pinned,
          body,
          updated_at: new Date().toISOString()
        };
      }

      // Persist to Supabase if available (strictly scoped to the owning QM)
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
          let updQuery = supabaseClient
            .from('chronicles')
            .update({
              title,
              category,
              expires_at,
              is_pinned,
              body,
              updated_at: new Date().toISOString()
            })
            .eq('id', editId);
          if (authorId) updQuery = updQuery.eq('qm_id', authorId);
          await updQuery;
        } catch (dbErr) {
          console.warn('Supabase update notice:', dbErr);
        }
      }

      saveLocalChronicles(chroniclesList);
      cancelChronicleForm();
      showChronicleToast('Chronicle entry updated successfully!');
      renderChroniclesLibrary();

      // Automatically expand updated entry
      const updatedEl = document.getElementById(`chronicle-card-${editId}`);
      if (updatedEl) {
        updatedEl.open = true;
        updatedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

    } else {
      // CREATE NEW ENTRY (Scoped strictly to this Questmaster's realm)
      const validQMId = isValidUUID(activeQMId) ? activeQMId : null;
      const validAuthorId = isValidUUID(authorId) ? authorId : null;

      const generatedUUID = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
        ? crypto.randomUUID() 
        : null;

      const tempId = generatedUUID || ('chronicle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

      const newEntry = {
        id: tempId,
        qm_id: validQMId || (validAuthorId ? validAuthorId : null),
        park: activePark,
        title,
        body,
        category,
        author_id: validAuthorId,
        author_name: authorName,
        is_pinned: Boolean(is_pinned),
        expires_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add to beginning of local array
      chroniclesList.unshift(newEntry);

      // Persist to Supabase if available
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
          const insertPayload = {
            title,
            body,
            category,
            park: activePark,
            author_name: authorName,
            is_pinned: Boolean(is_pinned),
            expires_at: expires_at || null
          };
          if (validQMId) insertPayload.qm_id = validQMId;
          else if (validAuthorId) insertPayload.qm_id = validAuthorId;

          if (validAuthorId) insertPayload.author_id = validAuthorId;
          if (generatedUUID) insertPayload.id = generatedUUID;

          const { data: dbRow, error } = await supabaseClient
            .from('chronicles')
            .insert(insertPayload)
            .select('*')
            .maybeSingle();

          if (!error && dbRow) {
            newEntry.id = dbRow.id;
            newEntry.created_at = dbRow.created_at || newEntry.created_at;
          } else if (error) {
            console.warn('Supabase insert notice, attempting schema fallback:', error.message);
            if (error.message && error.message.includes('qm_id')) {
              const fallback = { ...insertPayload };
              delete fallback.qm_id;
              const { data: fallbackRow } = await supabaseClient
                .from('chronicles')
                .insert(fallback)
                .select('*')
                .maybeSingle();
              if (fallbackRow) newEntry.id = fallbackRow.id;
            }
          }
        } catch (dbErr) {
          console.warn('Supabase insert exception:', dbErr);
        }
      }

      saveLocalChronicles(chroniclesList);
      cancelChronicleForm();
      showChronicleToast('Chronicle published successfully!');
      renderChroniclesLibrary();

      // Automatically open newly posted entry
      const newEl = document.getElementById(`chronicle-card-${newEntry.id}`);
      if (newEl) {
        newEl.open = true;
        newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } catch (err) {
    console.error('Error saving chronicle:', err);
    showChronicleToast('Error saving chronicle: ' + (err.message || err), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = editId ? 'Save Changes' : 'Publish Entry';
    }
  }
}

/**
 * Open form pre-populated in edit mode
 */
function openEditChronicle(id) {
  if (!isQMAuthorized()) return;

  const entry = chroniclesList.find(e => String(e.id) === String(id));
  if (!entry) return;

  toggleChronicleForm(true);

  const editIdInput = document.getElementById('chronicle-edit-id');
  const titleInput = document.getElementById('chronicle-title-input');
  const categorySelect = document.getElementById('chronicle-category-select');
  const expiresInput = document.getElementById('chronicle-expires-input');
  const pinnedInput = document.getElementById('chronicle-pinned-input');
  const bodyInput = document.getElementById('chronicle-body-input');
  const heading = document.getElementById('chronicle-form-heading');
  const submitBtn = document.getElementById('chronicle-submit-btn');

  if (editIdInput) editIdInput.value = entry.id;
  if (titleInput) titleInput.value = entry.title;
  if (categorySelect) {
    categorySelect.value = entry.category;
    handleChronicleCategoryChange(entry.category);
  }
  if (expiresInput && entry.expires_at) {
    const d = new Date(entry.expires_at);
    if (!isNaN(d.getTime())) {
      expiresInput.value = d.toISOString().split('T')[0];
    } else {
      expiresInput.value = entry.expires_at;
    }
  }
  if (pinnedInput) pinnedInput.checked = Boolean(entry.is_pinned);
  if (bodyInput) bodyInput.value = entry.body;

  if (heading) heading.innerHTML = '<span>✏️</span> <span>Edit Chronicle Entry</span>';
  if (submitBtn) submitBtn.innerText = 'Save Changes';

  const formCard = document.getElementById('chronicle-form-card');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Permanently delete a chronicle entry
 */
async function handleDeleteChronicle(id) {
  if (!isQMAuthorized()) return;

  if (!confirm('Are you sure you want to permanently delete this chronicle entry?')) {
    return;
  }

  try {
    chroniclesList = chroniclesList.filter(e => String(e.id) !== String(id));
    saveLocalChronicles(chroniclesList);

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        let delQuery = supabaseClient
          .from('chronicles')
          .delete()
          .eq('id', id);
        if (typeof currentUser !== 'undefined' && currentUser?.id) {
          delQuery = delQuery.eq('qm_id', currentUser.id);
        }
        await delQuery;
      } catch (dbErr) {
        console.warn('Supabase delete notice:', dbErr);
      }
    }

    showChronicleToast('Chronicle entry deleted.');
    renderChroniclesLibrary();
  } catch (err) {
    console.error('Error deleting chronicle:', err);
    showChronicleToast('Could not delete chronicle: ' + (err.message || err), 'error');
  }
}

/**
 * Populate @Username into the chronicle's comment input and focus it
 */
function replyToChronicleComment(chronicleId, username) {
  const inputEl = document.getElementById(`chronicle-comment-input-${chronicleId}`);
  if (!inputEl) return;
  const cleanUser = String(username || 'Adventurer').replace(/\s+/g, '');
  const mentionPrefix = `@${cleanUser} `;
  const currentVal = inputEl.value || '';
  if (!currentVal.startsWith(mentionPrefix)) {
    inputEl.value = mentionPrefix + currentVal;
  }
  inputEl.focus();
  try {
    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
  } catch (_) {}
}

/**
 * Submit a new comment under a Chronicle entry
 */
async function handlePostChronicleComment(event, chronicleId) {
  if (event) event.preventDefault();
  if (!chronicleId) return;

  if (typeof currentUser === 'undefined' || !currentUser) {
    showChronicleToast('Please sign in to post a comment.', 'error');
    return;
  }

  const inputEl = document.getElementById(`chronicle-comment-input-${chronicleId}`);
  const submitBtn = document.getElementById(`chronicle-comment-submit-${chronicleId}`);
  const body = inputEl ? inputEl.value.trim() : '';

  if (!body) return;

  const username = getChronicleAuthorName();
  const activePark = getChronicleActivePark();
  const activeQMId = getChronicleActiveQMId();
  const generatedUUID = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : ('comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

  const newComment = {
    id: generatedUUID,
    chronicle_id: chronicleId,
    qm_id: isValidUUID(activeQMId) ? activeQMId : null,
    park: activePark,
    user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
    username: username,
    body: body,
    created_at: new Date().toISOString()
  };

  if (submitBtn) submitBtn.disabled = true;

  try {
    if (!Array.isArray(chronicleCommentsByEntry[chronicleId])) {
      chronicleCommentsByEntry[chronicleId] = [];
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient && isValidUUID(String(chronicleId))) {
      const insertPayload = {
        chronicle_id: chronicleId,
        park: activePark,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        username: username,
        body: body
      };
      if (isValidUUID(activeQMId)) insertPayload.qm_id = activeQMId;

      const { data: dbRow, error } = await supabaseClient
        .from('chronicle_comments')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (!error && dbRow) {
        newComment.id = dbRow.id;
        newComment.created_at = dbRow.created_at || newComment.created_at;
      } else if (error) {
        console.warn('Could not save comment to Supabase (using local fallback):', error.message);
      }
    }

    chronicleCommentsByEntry[chronicleId].push(newComment);
    chronicleCommentsByEntry[chronicleId].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    saveLocalChronicleComments(chronicleCommentsByEntry);

    if (inputEl) inputEl.value = '';
    renderChroniclesLibrary();
  } catch (err) {
    console.error('Error posting chronicle comment:', err);
    showChronicleToast('Could not post comment: ' + (err.message || err), 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * Delete a comment (allowed for comment author or active realm Questmaster)
 */
async function handleDeleteChronicleComment(commentId, chronicleId) {
  if (!commentId || !chronicleId) return;
  if (!confirm('Delete this comment?')) return;

  try {
    if (Array.isArray(chronicleCommentsByEntry[chronicleId])) {
      chronicleCommentsByEntry[chronicleId] = chronicleCommentsByEntry[chronicleId].filter(
        c => String(c.id) !== String(commentId)
      );
      saveLocalChronicleComments(chronicleCommentsByEntry);
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient && isValidUUID(String(commentId))) {
      await supabaseClient
        .from('chronicle_comments')
        .delete()
        .eq('id', commentId);
    }

    renderChroniclesLibrary();
  } catch (err) {
    console.error('Error deleting chronicle comment:', err);
  }
}

/**
 * Render the Chronicles feed inside the Library Chronicles sub-tab (strictly QM-scoped)
 */
function renderChroniclesLibrary() {
  const container = document.getElementById('library-chronicles-container') 
    || document.getElementById('library-archive-container') 
    || document.getElementById('library-misc-container');

  if (!container) return;

  // Preserve open state of expanded chronicle cards across re-renders
  const openCardIds = new Set(
    Array.from(container.querySelectorAll('details.chronicle-card[open]')).map(el => el.id)
  );

  // Sync QM creation button visibility
  syncChroniclesQMVisibility();

  const sortedEntries = getSortedAndFilteredChronicles();
  const isQM = isQMAuthorized();
  const myUserId = (typeof currentUser !== 'undefined' && currentUser?.id) || null;

  // Empty state handling
  if (!sortedEntries || sortedEntries.length === 0) {
    container.innerHTML = `
      <p class="empty-state" style="text-align:center; padding:28px 16px; color:var(--text-muted); font-size:13px; line-height:1.6; margin:12px 0;">
        The archives for this realm are currently quiet. Check back after the next quest.
      </p>
    `;
    return;
  }

  // Render collapsible journal cards
  container.innerHTML = sortedEntries.map((entry) => {
    const rawCategory = entry.category || 'Chronicle';
    const categoryClass = 'chronicle-type-' + rawCategory.toLowerCase();
    const pinnedClass = entry.is_pinned ? 'chronicle-pinned' : '';
    const badgeClass = 'badge-' + rawCategory.toLowerCase();
    const cardDomId = `chronicle-card-${entry.id}`;
    const openAttr = openCardIds.has(cardDomId) ? ' open' : '';

    const comments = Array.isArray(chronicleCommentsByEntry[entry.id])
      ? chronicleCommentsByEntry[entry.id]
      : [];

    const commentsListHtml = comments.length > 0
      ? comments.map(c => {
          const canDelete = Boolean(isQM || (myUserId && c.user_id && String(c.user_id) === String(myUserId)));
          const safeReplyUser = String(c.username || 'Adventurer').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return `
            <div class="chronicle-comment-item">
              <div class="chronicle-comment-header">
                <div class="chronicle-comment-author-wrap">
                  <strong class="chronicle-comment-author">${escapeHTML(c.username || 'Adventurer')}</strong>
                  <span class="chronicle-comment-time">${escapeHTML(formatCommentTimestamp(c.created_at))}</span>
                </div>
                <div class="chronicle-comment-actions">
                  <button type="button" class="chronicle-comment-reply-btn" onclick="replyToChronicleComment('${entry.id}', '${safeReplyUser}')">
                    @Reply
                  </button>
                  ${canDelete ? `
                    <button type="button" class="chronicle-comment-del-btn" onclick="handleDeleteChronicleComment('${c.id}', '${entry.id}')" title="Delete comment">
                      ✕
                    </button>
                  ` : ''}
                </div>
              </div>
              <div class="chronicle-comment-body">${formatCommentBodyWithMentions(c.body)}</div>
            </div>
          `;
        }).join('')
      : `<p class="chronicle-comments-empty">No comments yet. Start the conversation!</p>`;

    return `
      <details class="store-category chronicle-card ${categoryClass} ${pinnedClass}" id="${cardDomId}"${openAttr}>
        <!-- Collapsed Card Header: Displays Title, Comment Count (if any), and Posted Date -->
        <summary class="store-category-summary chronicle-card-summary">
          <div class="chronicle-header-title-wrap">
            ${entry.is_pinned ? '<span title="Pinned to Top">📌</span>' : ''}
            <span class="chronicle-header-title">${escapeHTML(entry.title)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
            ${comments.length > 0 ? `<span style="font-size:11px; color:var(--text-muted); font-weight:600;">💬 ${comments.length}</span>` : ''}
            <span class="chronicle-header-date">${formatChronicleDate(entry.created_at)}</span>
          </div>
        </summary>

        <!-- Expanded Card Details -->
        <div class="store-category-items">
          <!-- Body with line breaks preserved -->
          <div class="chronicle-body-content" style="margin-top:4px;">${escapeHTML(entry.body)}</div>

          <!-- Metadata Pill & Author (Underneath Description) -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:11px; color:var(--text-muted);">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge ${badgeClass}">${escapeHTML(rawCategory)}</span>
              ${entry.is_pinned ? '<span class="badge" style="background:#1e3a5f; color:#93c5fd; border:1px solid #3b82f6;">📌 Pinned</span>' : ''}
            </div>
            <div>
              <span>by </span><strong style="color:var(--text);">${escapeHTML(entry.author_name || 'Questmaster')}</strong>
            </div>
          </div>

          ${(entry.expires_at || isQM) ? `
            <!-- Card Footer (Expiration & Role-Gated Controls) -->
            <div class="chronicle-card-footer">
              <div style="font-size:11px; color:var(--text-muted);">
                ${entry.expires_at ? `<span>⏰ Expires: ${formatChronicleDate(entry.expires_at)}</span>` : ''}
              </div>

              <!-- In-Card QM Controls: Edit & Delete buttons positioned at bottom-right -->
              ${isQM ? `
                <div class="chronicle-qm-actions">
                  <button type="button" class="chronicle-btn-action" onclick="openEditChronicle('${entry.id}')" title="Edit this entry">
                    ✏️ Edit
                  </button>
                  <button type="button" class="chronicle-btn-action chronicle-btn-delete" onclick="handleDeleteChronicle('${entry.id}')" title="Delete this entry">
                    🗑️ Delete
                  </button>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Comments & @Reply Section -->
          <div class="chronicle-comments-section">
            <div class="chronicle-comments-title">Comments (${comments.length})</div>
            <div class="chronicle-comments-list" id="chronicle-comments-list-${entry.id}">
              ${commentsListHtml}
            </div>
            <form class="chronicle-comment-form" onsubmit="handlePostChronicleComment(event, '${entry.id}')">
              <input
                type="text"
                id="chronicle-comment-input-${entry.id}"
                class="form-control chronicle-comment-input"
                placeholder="Write a comment or @reply..."
                maxlength="500"
                autocomplete="off"
              >
              <button type="submit" id="chronicle-comment-submit-${entry.id}" class="chronicle-comment-post-btn">
                Post
              </button>
            </form>
          </div>
        </div>
      </details>
    `;
  }).join('');
}

// Backwards-compatible aliases
const renderChronicles = renderChroniclesLibrary;
const renderArchiveLibrary = renderChroniclesLibrary;
const renderMiscLibrary = renderChroniclesLibrary;
const renderMonstersLibrary = renderChroniclesLibrary;
const renderDurabilityLibrary = renderChroniclesLibrary;

// Initial bootstrap on script evaluation
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fetchChronicles();
    });
  } else {
    fetchChronicles();
  }
}
