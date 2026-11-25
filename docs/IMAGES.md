# Product photos: saving storage

You have three ways to add photos in Admin -> Products. Linked images use no Supabase storage at all.

1. **Paste a link** (best for saving space): upload the photo to Cloudinary or ImageKit, copy its link, paste it in "Paste image link".
   Only `https://res.cloudinary.com/...` and `https://ik.imagekit.io/...` links are accepted (photo-sharing and page links can break).
   The site automatically asks them for a smaller, faster version for each screen (resize + best format).
2. **Upload a file**: photos are shrunk in your browser first (max 1600 px, WebP), usually 100-300 KB instead of 3-5 MB.
   Deleting an uploaded photo also deletes it from storage.
3. **Custom domain**: if you give ImageKit/Cloudinary your own domain (for example images.yourshop.pk), add it to `EXTRA_IMAGE_HOSTS` in `src/lib/site-config.ts`.

Tips: use the star on a thumbnail to make it the main photo. Use square or 4:5 portrait photos, 1200-1600 px wide.

## Cloudinary quick start

Create a free account, open Media Library, upload, then copy the image's URL. Folder per product keeps things tidy.

## ImageKit quick start

Create a free account, open Media Library, upload, then copy the image's URL (it starts with ik.imagekit.io).
