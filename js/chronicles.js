// ==============================================================================
// Quest-Forge: Chronicles System
// Realm History, Archived Quests, Kingdom Deeds, and Lore Records
// ==============================================================================

const CHRONICLES_DATA = [
  // Chronicle entries (Reign histories, legend logs, park lore) will be populated here
];

// Backwards compatibility data aliases
const ARCHIVE_DATA = CHRONICLES_DATA;
const MISC_DATA = CHRONICLES_DATA;
const MONSTERS_DATA = CHRONICLES_DATA;

/**
 * Render the Chronicles content inside the Library Chronicles sub-tab
 */
function renderChroniclesLibrary() {
  const container = document.getElementById('library-chronicles-container') 
    || document.getElementById('library-archive-container') 
    || document.getElementById('library-misc-container');
  if (!container) return;

  if (!CHRONICLES_DATA || CHRONICLES_DATA.length === 0) {
    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: 8px; padding: 28px 16px; text-align: center; margin: 8px 0;">
        <div style="font-size: 28px; margin-bottom: 8px;">📜</div>
        <div style="font-size: 15px; font-weight: 600; color: var(--gold); margin-bottom: 6px;">Chronicles of the Realm</div>
        <p style="margin: 0 auto; max-width: 420px; font-size: 12px; line-height: 1.6; color: var(--text-muted);">
          The Grand Archivist is preparing the annals of history. Past reigns, heroic deeds, and recorded battles will be chronicled here.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = CHRONICLES_DATA.map((entry) => {
    return `
      <details class="store-category" id="chronicle-entry-${entry.id}">
        <summary class="store-category-summary">${entry.title}</summary>
        <div class="store-category-items">
          ${entry.content || ''}
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

// Pre-render chronicles once DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderChroniclesLibrary();
    });
  } else {
    renderChroniclesLibrary();
  }
}
