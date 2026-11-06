PALMA WEBSITE — SET UP YOUR FREE STORE + ADMIN PANEL
=====================================================
Everything here is free: GitHub (stores your site) + Cloudflare Pages (hosts it) +
Sveltia CMS (your admin panel). One-time setup takes about 20–30 minutes.

After setup you manage everything at:   https://YOUR-SITE.pages.dev/admin
  - Products: add / edit / delete, photos, prices, sizes, in stock / sold out, bestsellers
  - Store settings: WhatsApp number, delivery fee, free-delivery amount, home page texts,
    home photo, scents section, our story, social links
When you press Save in the admin, your live site updates by itself in about 1 minute.


STEP 1 — Put the site on GitHub (free)
--------------------------------------
1. Create a free account at https://github.com  (remember your username).
2. Click "+" (top right) -> "New repository".
   Name: palma-site    Visibility: Public    -> "Create repository".
3. On the new page click "uploading an existing file".
4. Unzip palma-site.zip on your computer. Open the folder, select EVERYTHING inside it
   (admin, assets, data, images, index.html, shop.html ...) and drag it into the page.
   Press "Commit changes".

5. Tell the admin panel where your site lives:
   In your repository open  admin -> config.yml  -> click the pencil (Edit).
   Change  YOUR-GITHUB-USERNAME  to your real GitHub username. Press "Commit changes".


STEP 2 — Connect Cloudflare (free)
----------------------------------
1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create application -> Pages
   -> "Connect to Git".
2. Connect your GitHub account and choose the  palma-site  repository.
3. Build settings:  Framework preset: None.  Build command: (leave empty).
   Build output directory: /     -> "Save and Deploy".
4. Your site is live at  https://palma-site.pages.dev  (or the name Cloudflare shows).
   (If you made a test project earlier with drag-and-drop, you can delete it.)


STEP 3 — Create your admin "key" (one time)
-------------------------------------------
1. On GitHub: your photo (top right) -> Settings -> Developer settings
   -> Personal access tokens -> Fine-grained tokens -> "Generate new token".
2. Name: Palma admin.  Expiration: pick the longest option.
   Repository access: "Only select repositories" -> palma-site.
   Permissions -> Repository permissions -> Contents: "Read and write".
3. Generate and COPY the token (it starts with github_pat_). Keep it private, like a password.


STEP 4 — Log in to your admin panel
-----------------------------------
1. Open  https://YOUR-SITE.pages.dev/admin
2. Choose "Sign in with Token" and paste your token.
3. Open "My store" -> "Products" or "Store settings", make changes, press Save.
   Wait about 1 minute and refresh your site.
   The browser remembers you, so next time you go straight in.
   When the token expires, make a new one (Step 3) and sign in again.


HOW ORDERS WORK
---------------
Customer adds products to the cart -> fills name, phone and address -> presses
"Place order" -> sees a confirmation page with an order number.
At the same moment the full order is sent to your WhatsApp automatically
(by the free CallMeBot service). You call the customer, deliver, and collect cash.

One-time setup for automatic WhatsApp orders:
  1. Get your CallMeBot key: follow https://www.callmebot.com/blog/free-api-whatsapp-messages/
     (save their bot number in your contacts and send it: I allow callmebot to send me messages)
  2. Cloudflare -> Workers & Pages -> palmabodycare -> Settings -> Variables and Secrets
     -> Add:  Type: Secret   Name: CALLMEBOT_APIKEY   Value: your key  -> Save
  3. Deployments tab -> on the latest deployment press "..." -> Retry deployment.
If you change the WhatsApp number in Store settings, get a new CallMeBot key for the new number.

PHOTO TIPS
----------
Use JPG photos around 1200 px wide (under 500 KB) so the site stays fast.
Square or portrait photos look best. If a product has no photo, a drawn bottle is shown.
