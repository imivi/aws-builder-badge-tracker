# AWS Builder badge progress tracker

This is a browser add-on that tracks badge progress on the AWS Builder Center website: https://builder.aws.com/profile?tab=badges

![AWS Builder Badge Tracker Screenshot](https://raw.githubusercontent.com/imivi/aws-builder-badge-tracker/main/docs/screenshot.png)

Tracking badges progress is useful because AWS offers generous rewards:

## Rewards

| Milestone | Reward | Value | Description |
| --- | --- | --- | --- |
| **Profile Completion** | **12 Months AWS Skill Builder Premium** | ~$449 / yr | Full access to 900+ on-demand courses, 600+ hands-on AWS Builder Labs, AWS Jam challenges, and official certification exam prep. |
| **7 Badges Earned** | **$10 AWS Promotional Credits** | $10 | Cloud credits applied directly to your AWS account to offset infrastructure and service usage. |
| **14 Badges Earned** | **$20 AWS Promotional Credits** | $20 | Additional cloud promotional credits ($30 total earned). |
| **21 Badges Earned** | **AWS Certification Exam Voucher** | $100 | 100% discount exam voucher for AWS Foundational certifications (such as *AWS Certified Cloud Practitioner* or *AWS Certified AI Practitioner*). |

> [!NOTE]
> Rewards are offered as part of the AWS Builder Center community & student rewards program for eligible verified accounts. Badges are earned through community engagement (posts, comments, streaks, profile completion) rather than course tests.

## Features

The add-on includes a menu that lists every badge activity, and the user must manually mark completed activities.

* mark badges as complete ("get 10 votes", "get 10 likes", etc)
* mark daily activity done ("like content daily", etc), resets automatically every day
* mark weekly activity done ("vote on wishes weekly"), resets automatically every week
* etc.

The add-on also alerts the user if a day or week has been missed.

## Badges

| Badge Name | Goal / Requirement |
| --- | --- |
| **Idea Influencer** | Get 10 votes on your wishes. |
| **First Wish** | Publish your first wish in AWS Wishlist. |
| **Knowledge Seeker** | Read 10 different articles. |
| **Discussion Debut** | Join the conversation by commenting on content. |
| **First Article** | Publish your first article. |
| **Hello, World!** | Complete the About section in your profile to introduce yourself in Builder Center. |
| **Photo Finisher** | Upload a photo to your profile. |
| **7-Day Visit Streak** | Visit Builder Center daily for seven consecutive days while signed in. |
| **7-Day Comment Streak** | Comment daily for seven consecutive days. |
| **7-Day Like Streak** | Like content daily for seven consecutive days. |
| **4-Week Wish Vote Streak** | Vote on wishes weekly for four consecutive weeks. |
| **4-Week Article Publishing Streak** | Publish an article weekly for four consecutive weeks. |
| **30-Day Visit Streak** | Visit Builder Center daily for 30 consecutive days while signed in. |
| **30-Day Comment Streak** | Comment daily for 30 consecutive days. |
| **30-Day Like Streak** | Like content daily for 30 consecutive days. |
| **90-Day Visit Streak** | Visit Builder Center daily for 90 consecutive days while signed in. |
| **90-Day Comment Streak** | Comment daily for 90 consecutive days. |
| **90-Day Like Streak** | Like content daily for 90 consecutive days. |
| **Valued Creator** | Get 10 likes on five of your articles. |
| **Meaningful Contributor** | Get 10 likes on five of your comments. |

## Installation

### Loading as Temporary Add-on (Firefox)
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select [dist/firefox/manifest.json](file:///home/imivi/Dev/aws-builder-badges-addon/dist/firefox/manifest.json) or [dist/aws-builder-badges-firefox.zip](file:///home/imivi/Dev/aws-builder-badges-addon/dist/aws-builder-badges-firefox.zip).
*(Note: Temporary add-ons are removed when Firefox restarts).*

### Permanent Installation in Firefox (Unlisted Self-Distribution)
To keep the extension permanently installed across browser restarts without publishing it publicly on the Firefox Add-ons store:

#### 1. Submit for Automated Signing
1. Build the distribution package:
   ```bash
   npm run build
   ```
2. Navigate to your [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/addons).
3. Click **Submit a New Add-on**.
4. Select **"On your own"** (self-distribution / unlisted) so it will **not** be listed or searchable publicly on AMO.
5. Upload `dist/aws-builder-badges-firefox.zip`.
6. When asked about code generators, minifiers, or bundlers, select **"No"**.

#### 2. Download the Signed `.xpi` File
1. Go to [https://addons.mozilla.org/en-US/developers/addons](https://addons.mozilla.org/en-US/developers/addons).
2. Click on **AWS Builder Badges Tracker** in your add-ons list.
3. In the left-hand sidebar menu, select **Manage Status & Versions**.
4. Click on your approved version number (e.g., **1.0.0**).
5. Click the download link ending in **`.xpi`** (e.g., `aws_builder_badges_tracker-1.0.0.xpi`) to save it locally.

#### 3. Install the `.xpi` into Firefox
- **Option A (Drag & Drop):** Drag and drop the downloaded `.xpi` file into any open Firefox browser window, then click **Add**.
- **Option B (Via Add-ons Manager):** Open `about:addons` in Firefox, click the gear icon (⚙️) in the upper-right corner, select **Install Add-on From File...**, and select your downloaded `.xpi`.

The extension is now permanently installed and will persist across browser restarts, updates, and reboots.

> **Tip (Automated Signing with `web-ext`):**
> You can also sign directly from the command line using an AMO API Key & Secret:
> ```bash
> npx web-ext sign --source-dir dist/firefox --api-key="YOUR_KEY" --api-secret="YOUR_SECRET"
> ```

### Loading in Google Chrome / Chromium
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the unpacked directory: [dist/chrome](file:///home/imivi/Dev/aws-builder-badges-addon/dist/chrome).

### Building Distribution Packages
Run the build script to generate packages for both Firefox and Chrome:
```bash
npm run build
```
This produces:
- `dist/aws-builder-badges-firefox.zip` (and `dist/firefox/`)
- `dist/aws-builder-badges-chrome.zip` (and `dist/chrome/`)

## Architecture & Components

* **[manifest.json](file:///home/imivi/Dev/aws-builder-badges-addon/manifest.json)**: Manifest V3 WebExtension definition with Gecko ID `aws-builder-badges@tracker`.
* **[popup/](file:///home/imivi/Dev/aws-builder-badges-addon/popup)**:
  * **Checklist Tab**: Daily (Visit, Comment, Like) and Weekly (Wish votes, Article publishing) activities with streak counters and reset countdowns.
  * **Badges Tab**: Complete list of all 20 badges with category filters, search, and manual progress counters (+/-) or completion checkboxes.
  * **Alerts Tab**: History of missed day/week alerts and lost streak warnings.
  * **Settings Tab**: Notifications toggle, auto-visit detection toggle, JSON export/import for backup, and data reset.
* **[background/](file:///home/imivi/Dev/aws-builder-badges-addon/background)**: Background service managing periodic streak checks (alarms), toolbar badge counter (pending daily tasks), and browser notifications.
* **[content/](file:///home/imivi/Dev/aws-builder-badges-addon/content)**: In-page floating widget on `builder.aws.com` providing quick status and optional auto-recording for daily visits.
* **[common/](file:///home/imivi/Dev/aws-builder-badges-addon/common)**: Shared data models, storage synchronization, and date streak calculations.

## Running Tests
Run the unit tests via Node.js test runner:
```bash
npm test
```