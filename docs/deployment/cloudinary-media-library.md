# Cloudinary catalogue media

The catalogue media library uses signed, direct browser uploads. Image binaries never pass through Express or MongoDB. MongoDB stores verified Cloudinary references and dimensions only.

## Required backend environment variables

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_MEDIA_FOLDER` (optional; defaults to `dae2uni/catalogue`)

Keep the API secret only in the private backend environment. It must not be configured in Vite/Vercel, committed, logged, or returned by an API response. The cloud name and API key are returned only to authenticated catalogue editors as part of a short-lived signed upload intent.

## Free-plan setup

1. Create a Cloudinary product environment dedicated to DAE2UNI production.
2. Copy the cloud name, API key, and API secret into the private alwaysdata backend environment.
3. Do not create an unsigned upload preset. The application signs every upload server-side.
4. Keep Cloudinary's default authenticated management access and review Free-plan storage/bandwidth usage periodically.
5. Restart the backend and confirm an authorized editor can request an upload intent. Without these variables, media endpoints fail closed with `MEDIA_PROVIDER_UNAVAILABLE`; catalogue records without media remain usable.

## Enforced application policy

- Owner, Co-Owner, and Admin roles only.
- Cloudinary rejects non-JPG/PNG/WebP/AVIF uploads from the signed request. The browser rejects files over 5 MB before transfer, and the backend independently rejects and cleans up any provider response over 5 MB before it can be attached.
- Minimum 96×96 for university logos and 480×240 for other catalogue images.
- Ten-minute upload intents bound to the requesting user and exact target record.
- The signed public ID/version response is verified, then the backend reads authoritative format, size, dimensions, and delivery URL directly from Cloudinary's authenticated Admin API before attachment. Browser-supplied metadata is never trusted.
- Replacement detaches the old asset atomically. Shared assets are deleted only after reference checks; failed provider deletion remains marked and is retried opportunistically by later authorized uploads.

No database migration is required. Existing universities, campuses, programs, imports, and API consumers remain valid without media fields.
