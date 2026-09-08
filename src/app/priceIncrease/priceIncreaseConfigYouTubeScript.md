# Price Increase Module — Config Setup Tutorial Script

**Format:** Screen recording with voiceover  
**Estimated length:** 8–12 minutes  
**Audience:** Internal team members who will be configuring the module each season

---

## INTRO (0:00 – 0:45)

**[Screen: App home / dashboard — not yet on Price Increase]**

> "Hey everyone. In this video I'm going to walk you through how to set up the Price Increase module from scratch. This is the tool we use to calculate how much each customer's lawn care price should go up each season, and then communicate that back to SA5 by assigning a flag to the customer.
>
> There are three things you need to configure before the module can run: your increase flag mappings, your season increase plan, and your price increase settings. We'll go through each one.
>
> Let's get started."

---

## SECTION 1 — Navigate to Config (0:45 – 1:15)

**[Action: Click on "Price Increase" in the nav bar]**

> "First, navigate to the Price Increase module. You'll land on the Config tab by default — that's where all the setup lives."

**[Screen: Config page loads — two sections visible: "Price Increase Settings" and "Increase Flag Mappings"]**

> "You can see two sections here. At the top is Price Increase Settings — that's where we define the rules for how increases are calculated. At the bottom is Increase Flag Mappings — that's where we connect our calculated percentages to actual flags in RealGreen.
>
> We're going to start at the bottom and work our way up, because the settings depend on the flags being set up first."

---

## SECTION 2 — Increase Flag Mappings (1:15 – 3:30)

**[Screen: Scrolled to "Increase Flag Mappings" section]**

> "The Increase Flag Mappings section is how we bridge the gap between a calculated percentage and what we can actually communicate to RealGreen. RealGreen doesn't understand 'give this customer a 6.3% increase' — it understands flags. So we create a set of flags, each representing a specific increase percentage, and the system will assign the closest matching flag to each customer."

**[Action: Click in the left box — scroll through the available flags list]**

> "On the left, you'll see all the available flags from RealGreen. These are flags we've already created in the CRM specifically for price increases — things like 'PI-3%', 'PI-5%', 'PI-8%', and so on."

**[Action: Click on "PI-3%" in the left box to highlight it]**

> "Click a flag to select it..."

**[Action: Click the right-arrow button to move it to the right box]**

> "...then click the arrow to add it to your mappings."

**[Screen: "PI-3%" appears in the right box with an empty input field]**

> "Now I need to tell the system what percentage this flag represents. Since this is our 3% flag, I'll type 3."

**[Action: Click the input field next to "PI-3%" and type "3"]**

> "The value is an integer — 3 means 3 percent. The system doesn't accept decimals here because our flags are whole-number percentages."

**[Action: Repeat for PI-5% (type 5), PI-8% (type 8), PI-10% (type 10), PI-12% (type 12)]**

> "Let me add the rest of our flags. I'll add 5%, 8%, 10%, and 12%."

**[Screen: Right box shows all 5 flags sorted ascending: 3, 5, 8, 10, 12]**

> "Notice they automatically sort by percentage — lowest to highest. That's intentional, because when the system resolves which flag to assign, it needs to find the closest match in this sorted list."

**[Action: Scroll down to the Exempt Flag and Manual Flag dropdowns]**

> "Below the picker, there are two special flag assignments. The Exempt Flag is for customers who should be skipped entirely — maybe they're on a contract or have a special arrangement. The Manual Flag is for customers where someone has already manually set their price in RealGreen and we don't want the system to override it."

**[Action: Click the Exempt Flag dropdown and select "PI-Exempt" from the list]**

> "I'll set our exempt flag here..."

**[Action: Click the Manual Flag dropdown and select "PI-Manual"]**

> "...and our manual flag here. These save immediately when you select them."

**[Action: Scroll back up to the Save Changes button — it should be highlighted in red/destructive]**

> "Now I need to save the flag mappings. You'll notice the Save Changes button is highlighted — that's the system telling you there are unsaved changes. Click it to save."

**[Action: Click Save Changes]**

> "Done. The flag mappings are saved. Now let's set up our season increase plan."

---

## SECTION 3 — Season Increase Plan (3:30 – 5:30)

**[Screen: Scroll back up to "Price Increase Settings" section]**

> "Season increase plans live inside the Settings sheet — you create and manage them right there in context. Let me show you how that works."

**[Action: Click the "New" button in the Price Increase Settings section]**

**[Screen: Settings sheet slides in from the right]**

> "The settings sheet opens. You can see there's a field for 'Increase Plan' with a dropdown and two icon buttons next to it. The plus button creates a new plan, and the pencil button edits the currently selected one."

**[Action: Click the plus (+) button next to the Increase Plan dropdown]**

**[Screen: Inline plan editor expands below the dropdown]**

> "An inline editor appears right here in the sheet. This is where we define how much prices increase each season."

**[Action: Type "Moderate 2026" in the Label field]**

> "First, give the plan a name. I'll call this one 'Moderate 2026' since we're setting up a moderate increase schedule for this season."

**[Action: Click "Add Season" button]**

**[Screen: Row appears: S2 | [0] | 0.00%]**

> "Click Add Season to add your first season. Season 2 is the first renewal — season 1 is when the customer was originally sold, so there's no increase in year one."

**[Action: Click the input for S2 and type "5"]**

**[Screen: Cumulative column updates to 5.00%]**

> "I'll set season 2 to 5%. You can see the cumulative column updates in real time — after season 2, customers will be 5% above their original acquisition price."

**[Action: Click "Add Season" again]**

**[Action: Type "3" in the S3 input]**

**[Screen: Cumulative updates to 8.15%]**

> "Season 3 gets a 3% increase. The cumulative is now 8.15% — that's compounded, not just added. So 5% followed by 3% gives you 8.15%, not 8%."

**[Action: Add S4 with 2%, S5 with 2%]**

**[Screen: Cumulative shows ~12.5% after S5]**

> "I'll add a couple more seasons at 2% each. After 5 seasons, customers are about 12.5% above their original price. That's the compounded effect of gradual increases."

**[Action: Click "Save Plan"]**

**[Screen: Inline editor collapses; "Moderate 2026" appears selected in the Increase Plan dropdown]**

> "Click Save Plan. The plan is saved and automatically selected in the dropdown — you don't have to go find it. Now let's fill in the rest of the settings."

---

## SECTION 4 — Price Increase Settings (5:30 – 8:30)

**[Screen: Settings sheet still open, Increase Plan now shows "Moderate 2026"]**

> "Now let's fill in the rest of the settings. These control the rules for how the system calculates and caps increases."

**[Action: Click the Label field and type "Moderate 2026"]**

> "Give the settings a label — I'll match it to the plan name so it's easy to identify."

**[Action: Click the Program dropdown and select "LWN"]**

> "Select the program code. This is the program we're running price increases for — in our case, that's LWN, our lawn care program. The system will only evaluate customers who have an active program with this code."

**[Action: Fill in Max Now: 8]**

> "Max Now is the maximum increase we'll apply in this run. Even if a customer's calculated increase is higher, we'll cap it at 8% for this season. This prevents sticker shock."

**[Action: Fill in Max Ever: 20]**

> "Max Ever is the lifetime cap — a customer's price will never be more than 20% above their original acquisition price, no matter how many seasons they've been with us."

**[Action: Fill in Ongoing: 2]**

> "Ongoing is the percentage applied every season after the plan runs out. Our plan covers seasons 2 through 5 — after that, every season gets a 2% increase indefinitely."

**[Action: Fill in Upsell Threshold: 2, Upsell Bonus: 1, Min Increase: 2]**

> "The upsell bonus rewards customers who have multiple programs. If a customer has more than 2 other active programs, we reduce their increase by 1% for each additional program — but never below 2%. So a customer with 4 programs gets a 2% reduction, bringing an 8% increase down to 6%."

**[Action: Fill in Manual Attention Threshold: 3]**

> "The manual attention threshold flags customers for review. If a customer's calculated increase is more than 3% above our Max Now cap, we'll mark them for manual review — that means someone should look at their account before we apply anything."

**[Action: Click the "Round" radio button for Flag Rounding]**

> "Flag Rounding controls what happens when a customer's calculated percentage falls between two of our flags. 'Round' picks the nearest flag — so a 6.4% increase would get the 5% flag, and a 6.6% would get the 8% flag. 'Ceil' always rounds up, 'Floor' always rounds down. Round is the most balanced option for most seasons."

**[Action: Click Save]**

**[Screen: Sheet closes; new settings card appears in the list]**

> "Click Save. The settings are created. Now we need to activate them."

**[Action: Click "Set Active" on the new settings card]**

**[Screen: Card gets the "Active" badge and accent background]**

> "Click Set Active to make these the live settings. Only one settings configuration can be active at a time — this is what the system will use when it runs calculations."

---

## SECTION 5 — Verify and Wrap Up (8:30 – 9:30)

**[Screen: Config page showing the active settings card and the flag mappings section]**

> "Let's do a quick review of what we've set up.
>
> We have our flag mappings — five flags covering 3% through 12%, with an exempt flag and a manual flag configured.
>
> We have our season increase plan — 'Moderate 2026' — which applies 5% in season 2, 3% in season 3, and 2% per season after that.
>
> And we have our price increase settings — targeting the LWN program, capping at 8% this season and 20% lifetime, with a 2% upsell bonus for multi-program customers.
>
> That's everything the system needs to run. When you navigate to the Summary or By Customer tabs, you'll see the calculated results for every customer in the LWN program."

**[Action: Click the "Summary" tab in the tab bar]**

> "The Summary tab will show you aggregate statistics — total revenue impact, how many customers are getting each flag, and so on. We'll cover that in a separate video."

**[Action: Click back to "Config" tab]**

> "If you ever need to adjust the plan mid-season — say you want to be more aggressive — you can create a new settings configuration, set it active, and the calculations will update immediately. The old configuration stays in the list so you have a record of what was used."

---

## OUTRO (9:30 – 10:00)

**[Screen: Config page]**

> "That's the full configuration walkthrough. To summarize the order of operations:
>
> One — set up your increase flag mappings and assign your exempt and manual flags.
>
> Two — create your season increase plan inside the settings sheet.
>
> Three — fill in the rest of the settings and set them active.
>
> If you have questions, drop them in the comments. Thanks for watching."

---

## PRODUCTION NOTES

- **Recommended screen resolution:** 1920x1080, browser at 100% zoom
- **Cursor highlighting:** Use a cursor highlighter tool so viewers can follow clicks
- **Pause points:** Pause 1–2 seconds after each action before speaking the next line
- **Re-takes:** The flag mapping section (Section 2) has the most steps — consider recording it in one continuous take to avoid jump cuts
- **B-roll opportunity:** The cumulative percentage updating in real time as seasons are added is visually compelling — consider a slow zoom or highlight effect there
