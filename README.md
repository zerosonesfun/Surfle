# Surfle
A Chromium Webring browser extension. [Download the extension zip file](https://download-directory.github.io/?url=https%3A%2F%2Fgithub.com%2Fzerosonesfun%2FSurfle%2Ftree%2Fmain%2Fextension)
[Use the bookmarklet](https://github.com/zerosonesfun/Surfle/discussions/5)

![Surfle Logo](https://raw.githubusercontent.com/zerosonesfun/surfle/refs/heads/main/surfle-200.png)

---

A Webring is a loop or chain of websites connected together that you can easily browse through. Surfle has two modes:
1. **Surfle Mode** - Browse through the official Surfle Webring.
2. **Bookmarks Mode** - Any bookmarks folder with "webring" in the name can be selected as the list of websites you browse through.

[Join our discussions](https://github.com/zerosonesfun/Surfle/discussions)

---

## ℹ️ How to Install & Use
Getting started with Surfle is super easy. Once we’re officially live in the Chrome Web Store, here’s how to install it:

### 🔧 Install in Seconds

1. **Go to the Chrome Web Store**
   Visit the Surfle extension page here:
   [chrome.google.com/webstore/detail/surfle/your-extension-id](https://chrome.google.com/webstore/detail/surfle/your-extension-id)
   (Link will be updated when live!)

2. **Click “Add to Chrome”**
   A confirmation popup will appear. Click **Add Extension**.

3. **That’s it!**
   Surfle will now appear as a small turtle 🐢 icon in your browser toolbar.

### 🌀 Start Surfing

1. Click the **Surfle** icon to open the popup.
2. Toggle **Surfle Mode** on to surf the official webring.
3. Or switch to **Bookmarks Mode** and pick your own webring folder. Any browser bookmarks folder with webring in the name is selectable.
4. Click **Start Surfle** and use keyboard arrows (← →) or mobile taps to navigate.

### 😎 Create a Webring Mix

Create a folder of bookmarks that your friends might like, name the folder webring-whatever (the webring part is important), and export. Send it to a friend who also uses Surfle. How do you export? This could be a feature in a future version of Surfle, but for now you can search the Chrome Extension store for "export bookmarks" and use something [like this](https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn).

---

## ➕ Add Your Site to the Surfle Webring

Want to join the Surfle webring and be part of a flow of cool, independent websites? Here’s how to add your site.

[Reply to this discussion thread](https://github.com/zerosonesfun/Surfle/discussions/4), **OR**:

### 🌊 Super Simple Steps

1. **Create a GitHub account**
   If you don’t have one yet, sign up here: [github.com/join](https://github.com/join)

2. **Fork this repo**

   * At the top of this page, click the **Fork** button
   * This makes your own copy of the Surfle project where you can safely make changes

3. **Edit `webring.json`**

   * In your fork, find and open the `webring.json` file
   * Click the pencil ✏️ icon to edit it
   * Add your site URL to the list, like this:

     ```json
     [
       "https://upviber.com",
       "https://wilcosky.com",
       "https://thirtythreeseconds.com",
       "https://yoursite.com"
     ]
     ```

   ✅ Make sure to include the full URL (with `https://`)
   
   ✅ Your site must be added to the end of the current list
   
   ✅ Don't forget to add a comma to the URL above yours and put quotations around yours

5. **Commit your changes**

   * Scroll down and write a quick message like: `Added my site to webring`
   * Click **Commit changes**

6. **Open a Pull Request**

   * Visit the main Surfle repo
   * GitHub should show a button: **Compare & pull request** — click it
   * Double-check your changes, then click **Create pull request**

✨ Done! Once we review and approve your PR, you’ll be riding the Surfle wave with us.

---
