/**
 * A stand-in for `sharp` in the Workers bundle.
 *
 * `sharp` is a native binary. workerd cannot load it at all — not a missing
 * polyfill, a different kind of thing entirely. Payload takes `sharp` as an
 * optional dependency and simply skips resizing and format conversion when
 * it is absent, which is what this makes happen.
 *
 * What is lost with it matters more than the resizing: re-encoding through
 * sharp is what dropped an uploaded photograph's EXIF, including its GPS
 * coordinates (CLAUDE.md rule 4, and the comment in collections/media.ts
 * that says so). On Workers that has to be done another way before any
 * image reaches the bucket — see src/lib/exif.ts.
 *
 * Only aliased in for the Cloudflare build (next.config.ts). On Vercel and
 * in the CLI, the real `sharp` is still used.
 */
export default undefined;
