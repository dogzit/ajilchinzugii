/**
 * A link to the editors' handbook in the admin sidebar.
 *
 * The guide only helps if it is where the work happens: an editor stuck on
 * "how do I publish this" is looking at this panel, not at a file someone
 * once sent them.
 */
export const GuideLink = () => (
  <a
    href="/guide"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'block',
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: '1px solid var(--theme-elevation-150)',
      fontSize: '0.8rem',
      lineHeight: 1.5,
      color: 'var(--theme-elevation-700)',
    }}
  >
    📘 Редакторын гарын авлага
    <span style={{ display: 'block', color: 'var(--theme-elevation-500)' }}>
      Editor handbook — opens in a new tab
    </span>
  </a>
);

export default GuideLink;
