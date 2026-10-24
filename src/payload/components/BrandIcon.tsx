/** Small mark used in the admin header and on the browser tab. */
export const BrandIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    role="img"
    aria-label="Ажилчин Зөгий"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* A honeycomb cell: the bee, without a literal insect. */}
    <path
      d="M12 2.5 20 7v10l-8 4.5L4 17V7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3.2" fill="#b06e07" />
  </svg>
);

export default BrandIcon;
