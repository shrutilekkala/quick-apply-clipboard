# QuickApply Clipboard

A local-first Chrome side-panel extension for keeping reusable job-application text, links, PDFs, and Word documents close at hand.

## Features

- Searchable snippets with custom categories
- One-click copy for text and URLs
- Local PDF, DOC, and DOCX uploads
- One-click download for stored files
- Favorites
- Add, edit, and delete snippets
- Right-click selected text on any page to save it to the Inbox category
- JSON backup and restore for text snippets
- Local Chrome storage; no server or account required

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `quick-apply-clipboard` folder.
5. Pin **QuickApply Clipboard** to the toolbar.
6. Click its icon to open the side panel.

## How items behave

- Text, URLs, application answers, project swaps, and resume bullets have a **Copy** action.
- PDF and Word document cards have a **Download** action instead of Copy.
- Uploaded files are stored locally in the extension's IndexedDB database. Snippet metadata is stored in `chrome.storage.local`.
- JSON export includes text snippets only. Download important files individually and keep a separate backup.

## Suggested categories

- Contact: email, phone number, mailing address
- URLs: LinkedIn, GitHub, portfolio
- Application Answers: work authorization, sponsorship, availability
- Project Swaps: role-specific project combinations
- Resume Bullets: frequently reused experience bullets
- Documents: resumes, cover letters, transcripts, and other application files

## Privacy

QuickApply Clipboard does not transmit or upload your content to a server. All snippets and files remain in the local Chrome profile where the extension is installed. Removing the extension or clearing its site data may remove saved content.

## Permissions

- `storage`: stores snippet metadata locally
- `unlimitedStorage`: allows larger local PDF and Word document storage
- `sidePanel`: displays the workspace in Chrome's side panel
- `contextMenus`: saves selected webpage text from the right-click menu

## License

No license is granted. Copyright remains with the repository owner.
