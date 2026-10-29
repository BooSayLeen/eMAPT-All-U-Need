// eMAPT Line: the network map and station content.
// Each line = one exam domain. `pts` are the map waypoints (viewBox 1200 x 760), drawn with 45° bends.
// The last waypoint of a line is the first waypoint of the next one (interchange).
// A station with `brief` and `tasks` is playable. A station without them shows as "under construction".
// In any HTML text, [[word]] or [[shown text|key]] links to a GLOSSARY entry (tap for a definition).
// {{diagram:name}}, {{glossary}} are filled in by app.js.
//
// Task types:
//   mcq   { type, id }                                  → a question from window.QUESTIONS (js/data.js)
//   term  { type, prompt, accept:[regex], hint, solution, out, e }
//   spot  { type, prompt, file, lines:[...], bugs:{lineIndex: why}, notes:{lineIndex: why it's fine}, e }
//   hook  { type, prompt, code (with {0},{1}… blanks), blanks:[{o:[options], a:index}], out, e }
//   match { type, prompt, pairs:[[left, right], …], e }
//   order { type, prompt, steps:[in correct order], e }

window.METRO = {
  start: {
    id: "p0", name: "Platform 0", topic: "Start here: the exam, the words and the tools", pt: [80, 90],
    brief: `
<p>Welcome aboard. This game takes you from <b>zero</b> to <b>exam-ready</b> for the INE <b>eMAPT</b> (Mobile Application Penetration Tester).
Read this page once. Throughout the game, tap any [[dotted word|gloss]] to see what it means.</p>
<h3>1. The exam in one picture</h3>
<table class="t">
<tr><td><b>Time</b></td><td>12 hours, in INE's browser lab</td></tr>
<tr><td><b>Questions</b></td><td>45: multiple choice, <b>flags</b> you find inside <b>2 Android lab apps</b>, and a few short written answers</td></tr>
<tr><td><b>Lab</b></td><td>A Debian machine with an Android [[emulator]] and the tools. No internet</td></tr>
<tr><td><b>Pass mark</b></td><td><b>70%</b></td></tr>
</table>
<p>The questions come from <b>8 domains</b>. Each line on the map is one domain, and its share of the exam is:</p>
{{diagram:exam}}
<div class="callout tip"><b>Exam tip:</b> candidates report that <b>both lab apps needed [[Frida|frida]]</b>. You practise it on the Dynamic line (L5).</div>
<h3>2. How to ride</h3>
<ul class="rules">
<li><b>Stations open in order.</b> The train waits at the next one, and its dot pulses on the map.</li>
<li>Every station has three parts: <b>Briefing</b> (read), <b>Challenge</b> (2 to 4 tasks) and <b>Stamp</b> (your ticket).</li>
<li>Every wrong try makes you <b>2 minutes late</b>. No wrong tries means <b>On time</b>. You can ride any station again to improve.</li>
<li>On a phone, <b>swipe left</b> to go on and <b>swipe right</b> to go back. On the map, use <b>+</b> and <b>−</b> to zoom, then drag.</li>
</ul>
<h3>3. Words you will meet</h3>
{{glossary}}
<h3>4. Your toolbox</h3>
<table class="t">
<tr><th>Tool</th><th>What it does</th><th>Typical command</th></tr>
<tr><td><b>adb</b></td><td>Talks to the phone from your PC</td><td><code>adb shell</code></td></tr>
<tr><td><b>jadx</b></td><td>Shows the app's code as readable Java</td><td><code>jadx-gui app.apk</code></td></tr>
<tr><td><b>apktool</b></td><td>Unpacks the app to smali and the manifest, and rebuilds it</td><td><code>apktool d app.apk</code></td></tr>
<tr><td><b>Frida</b></td><td>Hooks a running app with JavaScript</td><td><code>frida -U -f com.app -l hook.js</code></td></tr>
<tr><td><b>objection</b></td><td>Ready-made Frida tricks (root and pinning bypass)</td><td><code>objection -g com.app explore</code></td></tr>
<tr><td><b>Burp Suite</b></td><td>Reads and changes the app's web traffic</td><td>proxy on <code>127.0.0.1:8080</code></td></tr>
</table>
<div class="callout key"><b>Practice lab at home:</b> an Android Studio emulator with a <b>"Google APIs"</b> system image (not "Google Play", so <code>adb root</code> works),
plus jadx, apktool, <code>pip install frida-tools objection</code>, a <b>frida-server</b> with the same version as your frida-tools, and Burp Suite Community.</div>
<h3>5. How a mobile pentest flows</h3>
{{diagram:flow}}
<p>The map follows the same path. You start with the foundations and threat modeling, then move through static analysis, reverse engineering, dynamic testing, the API, malware and reporting.</p>`,
    tasks: [
      {
        type: "term",
        prompt: "First, check your setup. <b>Ask [[adb]] to list the devices it can see</b>, so you know the emulator is connected.",
        accept: [/^adb devices( -l)?$/i],
        hint: "It is <code>adb</code> followed by the plural of \"device\".",
        solution: "adb devices",
        out: "List of devices attached\nemulator-5554\tdevice",
        e: "<code>device</code> means connected and ready. <code>unauthorized</code> means you must accept the prompt on the phone, and <code>offline</code> means you should run <code>adb kill-server</code> and try again. Once your device is listed, every other adb command will work.",
      },
      {
        type: "match",
        prompt: "Match each tool to its job.",
        pairs: [
          ["adb", "Talk to the phone from your PC"],
          ["jadx", "Read the app's code as Java"],
          ["apktool", "Unpack to smali and rebuild"],
          ["Frida", "Hook a running app"],
          ["Burp Suite", "Read and change web traffic"],
        ],
        e: "You will use all five in the exam. On each line you meet them in the order you need them.",
      },
      {
        type: "order",
        prompt: "Put the steps of a mobile pentest in order.",
        steps: [
          "Get the APK and see what it is (package, permissions)",
          "Read the code without running it (static)",
          "Run the app and hook it (dynamic)",
          "Attack the backend API it talks to",
          "Write up each finding with proof (report)",
        ],
        e: "Read first, then run, then go after the server, then write. If you get stuck in the exam, step back one stage: the answer is often in the code you have not read yet.",
      },
    ],
  },
  lines: [
    // ─────────────────────────── LINE 1 · FOUNDATIONS ───────────────────────────
    {
      key: "found", n: 1, name: "Foundations", color: "#1f8a4c", ink: "#fff", weight: 10,
      pts: [[80, 90], [500, 90]], badge: [290, 40],
      blurb: "How Android keeps apps apart, the four building blocks, the manifest, permissions and what is inside an APK. Every other line builds on this one.",
      stations: [
        {
          id: "f-sandbox", name: "Sandbox Square", topic: "One Linux user per app",
          brief: `
<p>Android runs on <b>Linux</b>. When you install an app, Android creates a <b>new Linux user</b> just for it (a [[UID|uid]] such as <code>u0_a61</code>).
The app's private folder belongs to that user only:</p>
<pre>/data/data/&lt;package&gt;/      (same as /data/user/0/&lt;package&gt;/)
  ├─ shared_prefs/   small XML key-value files
  ├─ databases/      SQLite files
  └─ files/          anything else</pre>
<p>App A cannot open app B's folder, because Linux file permissions stop it. [[SELinux|selinux]] is a second wall behind that.</p>
{{diagram:sandbox}}
<div class="callout key"><b>Key idea:</b> the sandbox stops <i>direct</i> file access between apps. Apps can still talk through the doors they open on purpose (exported components). That is where most bugs are.</div>
<div class="callout tip"><b>Exam tip:</b> on a [[rooted|root]] [[emulator]] you are root, so the walls are gone. You can read any app's private folder from an [[adb]] [[shell]] (<code>adb shell</code>). Check <code>shared_prefs</code> and <code>databases</code> first.</div>`,
          tasks: [
            {
              type: "term",
              prompt: "You have a [[root]] [[shell]] on the lab emulator. <b>List the files in SafeNote's private folder</b> (the package is <code>com.els.safenote</code>).",
              accept: [/^(adb shell )?(su -c )?["']?ls( -[a-z]+)* \/data\/(data|user\/0)\/com\.els\.safenote\/?["']?$/i],
              hint: "The private folder is <code>/data/data/&lt;package&gt;/</code>, and <code>ls</code> lists a folder.",
              solution: "ls /data/data/com.els.safenote/",
              out: "cache  code_cache  databases  files  shared_prefs",
              e: "<code>shared_prefs/</code> and <code>databases/</code> are the first places to look for tokens, PINs and passwords stored in cleartext ([[MASVS-STORAGE|masvs]]). In the old exam, the PIN hash was in <code>shared_prefs</code>.",
            },
            { type: "mcq", id: "f1" },
            { type: "mcq", id: "f4" },
          ],
        },
        {
          id: "f-components", name: "Component Cross", topic: "Activities, services, receivers, providers",
          brief: `
<p>An Android app is built from <b>four kinds of components</b>. Each one is a door into the app:</p>
<table class="t">
<tr><th>Component</th><th>What it is</th><th>How an attacker reaches it</th></tr>
<tr><td><b>Activity</b></td><td>A screen</td><td><code>am start -n pkg/.Activity</code></td></tr>
<tr><td><b>Service</b></td><td>Background work</td><td><code>am startservice</code></td></tr>
<tr><td><b>Broadcast receiver</b></td><td>Listens for events</td><td><code>am broadcast -a ACTION</code></td></tr>
<tr><td><b>Content provider</b></td><td>Shares data through <code>content://</code> [[URIs|uri]]</td><td><code>content query --uri …</code></td></tr>
</table>
<p>Components talk to each other with [[Intents|intent]], which are messages that say "open this" or "do this".</p>
{{diagram:components}}
<div class="callout key"><b>Key idea:</b> if a component is [[exported]], any app on the phone (and you, with <code>adb</code>) can call it. Exported and unprotected means it is part of the attack surface.</div>`,
          tasks: [
            {
              type: "match",
              prompt: "Match each component to what it does.",
              pairs: [
                ["Activity", "A screen the user sees"],
                ["Service", "Runs work in the background"],
                ["Broadcast receiver", "Reacts to system or app events"],
                ["Content provider", "Shares data through content:// URIs"],
              ],
              e: "Remember it as <b>screen, worker, listener, database door</b>. Content providers are the classic data-leak door: the old eMAPT app was broken through one.",
            },
            { type: "mcq", id: "f2" },
          ],
        },
        {
          id: "f-manifest", name: "Manifest Market", topic: "Reading AndroidManifest.xml",
          brief: `
<p><code>AndroidManifest.xml</code> (the [[manifest]]) is the app's ID card. It lists <b>every component</b>, the <b>permissions</b> and some important <b>security flags</b>.
It is the first file you read in any test.</p>
<table class="t">
<tr><th>Flag</th><th>Why you care</th></tr>
<tr><td><code>android:exported="true"</code></td><td>Other apps can call this component</td></tr>
<tr><td><code>android:debuggable="true"</code></td><td>Anyone can attach a debugger and run code as the app. It must be off in release builds</td></tr>
<tr><td><code>android:allowBackup="true"</code></td><td><code>adb backup</code> can copy the app's private data</td></tr>
<tr><td><code>android:usesCleartextTraffic="true"</code></td><td>Plain HTTP is allowed</td></tr>
<tr><td><code>&lt;intent-filter&gt;</code></td><td>On targetSdk ≤ 30 it silently makes the component exported</td></tr>
</table>
<div class="callout key"><b>Key idea:</b> an exported component needs a reason. The launcher activity (MAIN + LAUNCHER) <i>must</i> be exported, which is normal. An exported provider with no <code>android:permission</code> is a finding.</div>`,
          tasks: [
            {
              type: "spot",
              prompt: "SafeNote's manifest has <b>2 security bugs</b>. Tap the lines that contain them.",
              file: "AndroidManifest.xml",
              lines: [
                '<manifest package="com.els.safenote">',
                '  <uses-permission android:name="android.permission.INTERNET"/>',
                '  <application android:label="SafeNote"',
                '      android:allowBackup="false"',
                '      android:debuggable="true">',
                '    <activity android:name=".LoginActivity"',
                '        android:exported="true">',
                '      <intent-filter>',
                '        <action android:name="android.intent.action.MAIN"/>',
                '        <category android:name="android.intent.category.LAUNCHER"/>',
                '      </intent-filter>',
                '    </activity>',
                '    <provider android:name=".NotesProvider"',
                '        android:authorities="com.els.safenote.notes"',
                '        android:exported="true"/>',
                '  </application>',
                '</manifest>',
              ],
              bugs: {
                4: "<b>debuggable=\"true\"</b> in a release app lets anyone attach a [[debugger|jdwp]] (jdwp) and run code inside it. That is MASVS-RESILIENCE, and in the Top 10 it is M8 Security Misconfiguration.",
                14: "<b>An exported provider with no permission.</b> Any app can query <code>content://com.els.safenote.notes</code> and read the notes. That is MASVS-PLATFORM.",
              },
              notes: {
                1: "INTERNET is a normal permission. Almost every app has it.",
                3: "allowBackup=\"false\" is the safe value.",
                6: "This is the launcher activity (MAIN + LAUNCHER). It has to be exported so the home screen can open it.",
              },
              e: "When you read a manifest, check <b>debuggable</b>, <b>allowBackup</b>, and every <b>exported</b> component that has no permission.",
            },
            { type: "mcq", id: "f3" },
          ],
        },
        {
          id: "f-permissions", name: "Permission Park", topic: "normal · dangerous · signature",
          brief: `
<p>Permissions protect sensitive things. Each one has a <b>protection level</b>, which decides who gets it:</p>
<table class="t">
<tr><th>Level</th><th>Who gets it</th><th>Example</th></tr>
<tr><td><b>normal</b></td><td>Any app that asks, automatically</td><td>INTERNET</td></tr>
<tr><td><b>dangerous</b></td><td>Only if the user taps Allow (runtime prompt, Android 6+)</td><td>CAMERA, READ_CONTACTS</td></tr>
<tr><td><b>signature</b></td><td>Only apps signed with the <b>same certificate</b></td><td>The developer's own apps</td></tr>
</table>
<p>An app can also <b>protect its own component</b> by putting <code>android:permission="…"</code> on it. Then only callers that hold that permission can reach it.</p>
<div class="callout key"><b>Key idea:</b> a custom permission with the <b>normal</b> level protects nothing, because any app can request it. For components only meant for your own apps, the right choice is <b>signature</b>.</div>`,
          tasks: [
            {
              type: "match",
              prompt: "Match each protection setting to who can get through.",
              pairs: [
                ["protectionLevel=\"normal\"", "Any app that asks, automatically"],
                ["protectionLevel=\"dangerous\"", "Apps the user approves at runtime"],
                ["protectionLevel=\"signature\"", "Apps signed with the same certificate"],
                ["android:permission on a component", "Only callers holding that permission"],
              ],
              e: "In a test, when you see an exported component with <code>android:permission</code>, look up how that permission is declared. If it is <b>normal</b>, your attacker app can simply request it.",
            },
            { type: "mcq", id: "f7" },
            { type: "mcq", id: "f8" },
          ],
        },
        {
          id: "f-packages", name: "Package Pier", topic: "Inside APK and IPA files", junction: true,
          brief: `
<p>An <b>[[APK|apk]] is just a ZIP file</b>. Rename it to <code>.zip</code> and you can open it:</p>
<pre>SafeNote.apk
  ├─ AndroidManifest.xml   binary XML (apktool decodes it)
  ├─ classes.dex           the app's code as Dalvik bytecode
  ├─ resources.arsc        compiled resources (strings, IDs)
  ├─ res/  assets/         images, layouts, raw files
  ├─ lib/arm64-v8a/*.so    native C/C++ code
  └─ META-INF/             signing certificate (v1 scheme)</pre>
<p>[[apktool]] decodes it into readable XML and [[smali]], and can rebuild it. [[jadx]] turns the [[dex]] back into readable Java.</p>
<p>An iOS <b>IPA</b> is also a ZIP: <code>Payload/App.app/</code> contains the Mach-O binary and <code>Info.plist</code>.</p>
<div class="callout key"><b>Key idea:</b> [[signing]] proves the APK has not been changed, and that updates come from the same developer. It does <b>not</b> hide or encrypt the code. If you patch an APK, you must sign it again.</div>`,
          tasks: [
            {
              type: "term",
              prompt: "Decode <code>SafeNote.apk</code> with <b>apktool</b> so you can read its manifest and smali.",
              accept: [/^apktool (d|decode)( -f)?( -o \S+)? safenote\.apk( -o \S+)?( -f)?$/i],
              hint: "The apktool sub-command for decode is a single letter.",
              solution: "apktool d SafeNote.apk",
              out: "I: Using Apktool 2.9.3 on SafeNote.apk\nI: Loading resource table...\nI: Decoding AndroidManifest.xml with resources...\nI: Baksmaling classes.dex...\nI: Copying assets and libs...\nI: Copying original files...",
              e: "<code>apktool d</code> decodes, and <code>apktool b</code> rebuilds. To read the <i>logic</i>, use <code>jadx-gui SafeNote.apk</code>. To <i>change</i> it, edit the smali from apktool.",
            },
            {
              type: "match",
              prompt: "Match each file inside the APK to what it holds.",
              pairs: [
                ["classes.dex", "The app's code (Dalvik bytecode)"],
                ["AndroidManifest.xml", "Components, permissions, flags"],
                ["resources.arsc", "Compiled strings and resource IDs"],
                ["lib/arm64-v8a/*.so", "Native C/C++ code"],
                ["META-INF/", "Signing certificate and signatures"],
              ],
              e: "Look for secrets in <code>res/values/strings.xml</code>, in <code>assets/</code> and in the code. Native <code>.so</code> files need Ghidra rather than jadx.",
            },
            { type: "mcq", id: "f5" },
            { type: "mcq", id: "f9" },
          ],
        },
      ],
    },

    // ─────────────────────────── LINE 2 · THREAT MODELING ───────────────────────────
    {
      key: "threat", n: 2, name: "Threat Modeling", color: "#e0a100", ink: "#1c1b19", weight: 10,
      pts: [[500, 90], [1000, 90], [1110, 200]], badge: [760, 40],
      blurb: "Think like the attacker before you touch a tool: STRIDE, attack surface, trust boundaries, the Mobile Top 10 (2024) and MASVS.",
      stations: [
        {
          id: "t-stride", name: "STRIDE Street", topic: "6 kinds of threats",
          brief: `
<p>[[STRIDE|stride]] is a checklist of the six things that can go wrong. Each letter breaks one security property:</p>
<table class="t">
<tr><th></th><th>Threat</th><th>Breaks</th><th>Mobile example</th></tr>
<tr><td><b>S</b></td><td>Spoofing</td><td>Authentication</td><td>Replaying a stolen session token</td></tr>
<tr><td><b>T</b></td><td>Tampering</td><td>Integrity</td><td>Patching the APK to skip a license check</td></tr>
<tr><td><b>R</b></td><td>Repudiation</td><td>Non-repudiation</td><td>No server logs, so a user can deny a transfer</td></tr>
<tr><td><b>I</b></td><td>Information disclosure</td><td>Confidentiality</td><td>An exported provider leaks notes</td></tr>
<tr><td><b>D</b></td><td>Denial of service</td><td>Availability</td><td>A malformed intent crashes the app</td></tr>
<tr><td><b>E</b></td><td>Elevation of privilege</td><td>Authorization</td><td>A normal user calls an admin API</td></tr>
</table>
<div class="callout tip"><b>Exam tip:</b> ask yourself "what did the attacker <i>gain</i>?" Reading data is <b>I</b>, changing something is <b>T</b>, pretending to be someone is <b>S</b>, and getting more rights is <b>E</b>.</div>`,
          tasks: [
            {
              type: "match",
              prompt: "Match each attack to its STRIDE letter.",
              pairs: [
                ["Reusing a victim's stolen session token", "Spoofing"],
                ["Patching smali to skip the PIN check", "Tampering"],
                ["No audit log, so a user denies a payment", "Repudiation"],
                ["Malicious app reads notes via a provider", "Information disclosure"],
                ["Sending an empty intent crashes the app", "Denial of service"],
                ["A normal user calls /api/admin/users", "Elevation of privilege"],
              ],
              e: "STRIDE gives each finding a name and shows which property broke. You can use the same words in your report.",
            },
            { type: "mcq", id: "t1" },
            { type: "mcq", id: "t4" },
          ],
        },
        {
          id: "t-surface", name: "Surface Avenue", topic: "Where the attacker can get in",
          brief: `
<p>The <b>attack surface</b> is every place where outside input can reach the app:</p>
<table class="t">
<tr><th>Entry point</th><th>Who can reach it</th></tr>
<tr><td>[[Exported|exported]] components, [[deep links|deeplink]]</td><td>Any app on the phone, or a link in a web page</td></tr>
<tr><td>[[WebViews|webview]]</td><td>Whoever controls the loaded page</td></tr>
<tr><td>Network traffic</td><td>Anyone on the same Wi-Fi ([[man-in-the-middle|mitm]])</td></tr>
<tr><td>Backend API</td><td>Anyone with an HTTP client, without the app at all</td></tr>
<tr><td>Local storage, backups</td><td>Root, <code>adb backup</code>, a lost phone</td></tr>
</table>
<p>The three attackers to keep in mind are the <b>malicious app</b> (no root, same phone), the <b>network attacker</b>, and someone <b>holding the device</b>.</p>
<div class="callout tip"><b>Exam tip:</b> on a new APK, list the entry points first: exported components (manifest or <code>dumpsys</code>), deep links (<code>&lt;data android:scheme&gt;</code>), WebViews, and the API host.</div>`,
          tasks: [
            {
              type: "term",
              prompt: "No manifest file at hand? Ask Android itself. <b>Dump SafeNote's package info</b> (components, permissions, flags) from the device.",
              accept: [/^(adb shell )?dumpsys package com\.els\.safenote$/i, /^(adb shell )?pm dump com\.els\.safenote$/i],
              hint: "The command is <code>dumpsys</code>, followed by the word <code>package</code> and then the package name.",
              solution: "adb shell dumpsys package com.els.safenote",
              out: "Activity Resolver Table:\n  Non-Data Actions:\n      android.intent.action.MAIN:\n        5d1e0a2 com.els.safenote/.LoginActivity filter 9be4c71\nContentProvider Authorities:\n  [com.els.safenote.notes]:\n    Provider{8f3a2c1 com.els.safenote/.NotesProvider}\n      exported=true\nPackages:\n  Package [com.els.safenote] (c41b7e9):\n    flags=[ DEBUGGABLE HAS_CODE ALLOW_CLEAR_USER_DATA ]",
              e: "<code>dumpsys package</code> shows what is <b>actually installed</b>: the resolvers, the provider authorities and the flags (note <b>DEBUGGABLE</b>). It works even when the APK is obfuscated.",
            },
            { type: "mcq", id: "t7" },
            { type: "mcq", id: "t8" },
          ],
        },
        {
          id: "t-trust", name: "Trust Bridge", topic: "Never trust the client",
          brief: `
<p>A <b>trust boundary</b> is a line where data passes from something you don't control to something you do. The biggest one is between the <b>phone</b> and the <b>server</b>.</p>
{{diagram:trust}}
<p>Everything on the left side belongs to the attacker. They can read the code (jadx), change it (apktool), or [[hook]] it while it runs ([[Frida|frida]]).
So a check done <b>only in the app</b>, such as <code>isPremium()</code>, <code>isAdmin</code> or a PIN lock, is only a suggestion.</p>
<div class="callout key"><b>Key idea:</b> any decision that matters, like who you are and what you may do, must be enforced by the <b>server</b>. If it isn't, one Frida hook can bypass it.</div>
<div class="callout tip"><b>Frida in 30 seconds.</b> A Frida script is JavaScript that runs <i>inside</i> the app:
<pre>Java.perform(function () {              // wait until the app's Java code is loaded
  var Login = Java.use("com.app.Login");  // get a class by its full name
  Login.checkPin.implementation = function (pin) {   // replace one of its methods
    return true;                          // the new code: always say "PIN OK"
  };
});</pre>
<code>Java.use</code> gets a class, and <code>.implementation</code> replaces a method. <code>Java.choose</code> finds objects that already exist, and <code>Java.cast</code> changes an object's type. You will need those later.</div>`,
          tasks: [
            {
              type: "hook",
              prompt: "SafeNote unlocks premium notes when <code>Billing.isPremium()</code> returns true, and it only checks on the device. <b>Fill in the Frida hook</b> so the check always passes.",
              code: 'Java.perform(function () {\n  var Billing = {0}("com.els.safenote.Billing");\n  Billing.isPremium.{1} = function () {\n    return {2};\n  };\n});',
              blanks: [
                { o: ["Java.use", "Java.choose", "Java.cast"], a: 0 },
                { o: ["implementation", "overload", "value"], a: 0 },
                { o: ["true", "false", "this.isPremium()"], a: 0 },
              ],
              out: "[Pixel_7::SafeNote ]-> Billing.isPremium() hooked\n[Pixel_7::SafeNote ]-> Premium notes unlocked",
              e: "<code>Java.use</code> gets the class, and setting <code>.implementation</code> replaces the method. This is the <b>force</b> move (one of Frida's three). Because the server never checks, this is a <b>Tampering / Elevation</b> issue, which is MASVS-AUTH and MASVS-RESILIENCE.",
            },
            { type: "mcq", id: "t6" },
            { type: "mcq", id: "t5" },
          ],
        },
        {
          id: "t-top10", name: "Top Ten Terminal", topic: "OWASP Mobile Top 10 (2024)",
          brief: `
<p>The [[OWASP Mobile Top 10 (2024)|top10]] is the list of the most common mobile risks. Learn it in order:</p>
<table class="t">
<tr><td><b>M1</b></td><td>Improper Credential Usage <span class="muted">(hardcoded keys)</span></td></tr>
<tr><td><b>M2</b></td><td>Inadequate Supply Chain Security</td></tr>
<tr><td><b>M3</b></td><td>Insecure Authentication / Authorization</td></tr>
<tr><td><b>M4</b></td><td>Insufficient Input / Output Validation</td></tr>
<tr><td><b>M5</b></td><td>Insecure Communication <span class="muted">(HTTP, bad TLS)</span></td></tr>
<tr><td><b>M6</b></td><td>Inadequate Privacy Controls</td></tr>
<tr><td><b>M7</b></td><td>Insufficient Binary Protections <span class="muted">(no anti-tamper)</span></td></tr>
<tr><td><b>M8</b></td><td>Security Misconfiguration <span class="muted">(debuggable, exported)</span></td></tr>
<tr><td><b>M9</b></td><td>Insecure Data Storage</td></tr>
<tr><td><b>M10</b></td><td>Insufficient Cryptography</td></tr>
</table>
<div class="callout tip"><b>Trap:</b> the old <b>2016</b> list had "Improper Platform Usage" as M1. In <b>2024</b>, M1 is <b>Improper Credential Usage</b>.</div>`,
          tasks: [
            {
              type: "match",
              prompt: "Match each finding to its Mobile Top 10 (2024) item.",
              pairs: [
                ["API key hardcoded in strings.xml", "M1 Improper Credential Usage"],
                ["Login sent over plain HTTP", "M5 Insecure Communication"],
                ["No root, tamper or Frida detection", "M7 Insufficient Binary Protections"],
                ["debuggable=\"true\" in the release build", "M8 Security Misconfiguration"],
                ["Password saved in shared_prefs", "M9 Insecure Data Storage"],
                ["AES/ECB with a fixed key in the code", "M10 Insufficient Cryptography"],
              ],
              e: "In the exam you are often asked to <i>classify</i> a bug. Reading it from the Top 10 and from MASVS at once is the fastest way.",
            },
            { type: "mcq", id: "t2" },
            { type: "mcq", id: "t9" },
          ],
        },
        {
          id: "t-masvs", name: "MASVS Junction", topic: "MASVS categories and the process", junction: true,
          brief: `
<p>[[MASVS|masvs]] (the standard) says what a secure app must do. [[MASTG|mastg]] (the testing guide) says how to test it. [[MASWE|maswe]] lists the weaknesses.
MASVS v2 has <b>8 categories</b>:</p>
<table class="t">
<tr><td><b>STORAGE</b></td><td>Data at rest</td><td><b>CRYPTO</b></td><td>Algorithms and keys</td></tr>
<tr><td><b>AUTH</b></td><td>Login and sessions</td><td><b>NETWORK</b></td><td>TLS and pinning</td></tr>
<tr><td><b>PLATFORM</b></td><td>IPC, WebViews, UI</td><td><b>CODE</b></td><td>Input, dependencies, updates</td></tr>
<tr><td><b>RESILIENCE</b></td><td>Anti-tamper and anti-RE</td><td><b>PRIVACY</b></td><td>User data and tracking</td></tr>
</table>
<p>A [[threat model|threatmodel]] joins everything on this line into one process. Do it in about 10 minutes before you start attacking a lab app.</p>
<div class="callout key"><b>Next stop:</b> this is an interchange. The <b>Static Analysis</b> line starts here, and you will look for these same bugs in real code.</div>`,
          tasks: [
            {
              type: "order",
              prompt: "Put the threat-modeling steps in the right order.",
              steps: [
                "Map the app: its assets, data flows and components",
                "Mark trust boundaries and list the entry points",
                "Find the threats at each entry point with STRIDE",
                "Rate each risk (likelihood × impact, CVSS)",
                "Choose fixes and tests (MASVS / MASTG)",
              ],
              e: "Understand the app, see where you can get in, ask what can go wrong there, decide what matters most, then test it. The last step leads straight into the Static and Dynamic lines.",
            },
            {
              type: "match",
              prompt: "Match each finding to its MASVS category.",
              pairs: [
                ["Auth token stored in shared_prefs", "MASVS-STORAGE"],
                ["AES/ECB with a hardcoded key", "MASVS-CRYPTO"],
                ["App accepts any TLS certificate", "MASVS-NETWORK"],
                ["Exported provider leaks notes", "MASVS-PLATFORM"],
                ["Server trusts the app's isAdmin flag", "MASVS-AUTH"],
                ["No root or Frida detection", "MASVS-RESILIENCE"],
              ],
              e: "In a report, every finding gets a MASVS category, a matching MASTG test, and a Top 10 item. That is how you show the bug is real and important.",
            },
            { type: "mcq", id: "t10" },
          ],
        },
      ],
    },

    // ─────────────────────────── LINES 3–8 (Step 2) ───────────────────────────
    {
      key: "static", n: 3, name: "Static Analysis", color: "#1f5fbf", ink: "#fff", weight: 20,
      pts: [[1110, 200], [1110, 560], [1010, 660], [640, 660]], badge: [1160, 380],
      blurb: "Read the app without running it: decompile, hunt secrets, check storage, crypto, network config and iOS Info.plist.",
      stations: [
        { id: "s-decompile", name: "Decompile Dock", topic: "apktool + jadx" },
        { id: "s-secrets", name: "Secret Sidings", topic: "Hardcoded keys and URLs" },
        { id: "s-storage", name: "Storage Yard", topic: "shared_prefs, SQLite, files" },
        { id: "s-crypto", name: "Crypto Crescent", topic: "ECB, fixed keys, MD5" },
        { id: "s-netconfig", name: "NetConfig Row", topic: "network_security_config" },
        { id: "s-plist", name: "Plist Place", topic: "iOS Info.plist and ATS" },
        { id: "s-smali", name: "Smali Junction", topic: "From Java to smali", junction: true },
      ],
    },
    {
      key: "re", n: 4, name: "Reverse Engineering", color: "#e46a1c", ink: "#fff", weight: 10,
      pts: [[640, 660], [190, 660], [90, 560]], badge: [420, 712],
      blurb: "Read and change the code itself: smali, obfuscation, native libraries, and patch-rebuild-sign.",
      stations: [
        { id: "r-smali", name: "Smali Street", topic: "Reading smali" },
        { id: "r-r8", name: "R8 Road", topic: "Obfuscated code" },
        { id: "r-native", name: "Native Lane", topic: ".so files and JNI" },
        { id: "r-patch", name: "Patch Point", topic: "Edit, rebuild, align, sign" },
        { id: "r-repack", name: "Repack Junction", topic: "Full repack drill", junction: true },
      ],
    },
    {
      key: "dynamic", n: 5, name: "Dynamic & Runtime", color: "#7b3fa0", ink: "#fff", weight: 20,
      pts: [[90, 560], [90, 340], [190, 240], [660, 240]], badge: [40, 450],
      blurb: "Run the app and bend it: the three Frida moves, objection, root and pinning bypass, IPC and deep links.",
      stations: [
        { id: "d-spy", name: "Frida Spy", topic: "Watch arguments and returns" },
        { id: "d-force", name: "Frida Force", topic: "Change return values" },
        { id: "d-call", name: "Frida Call", topic: "Call methods yourself" },
        { id: "d-objection", name: "Objection Oval", topic: "Quick wins" },
        { id: "d-root", name: "Root Bypass", topic: "Defeat root detection" },
        { id: "d-pinning", name: "Pinning Pass", topic: "Defeat SSL pinning" },
        { id: "d-ipc", name: "Deep Link Jct", topic: "IPC, deep links, WebViews", junction: true },
      ],
    },
    {
      key: "api", n: 6, name: "API & Backend", color: "#c2337a", ink: "#fff", weight: 15,
      pts: [[660, 240], [850, 240], [920, 310], [920, 440], [860, 500]], badge: [980, 375],
      blurb: "Follow the traffic to the server: Burp, IDOR/BOLA, JWT, broken auth and the OWASP API Top 10.",
      stations: [
        { id: "a-proxy", name: "Proxy Place", topic: "Burp + the CA certificate" },
        { id: "a-bola", name: "BOLA Blvd", topic: "IDOR / BOLA" },
        { id: "a-jwt", name: "JWT Walk", topic: "Token attacks" },
        { id: "a-auth", name: "Auth Alley", topic: "Broken authentication" },
        { id: "a-rate", name: "Rate Limit Row", topic: "Brute force and limits" },
        { id: "a-top10", name: "API Junction", topic: "OWASP API Top 10", junction: true },
      ],
    },
    {
      key: "malware", n: 7, name: "Malware Analysis", color: "#b3261e", ink: "#fff", weight: 10,
      pts: [[860, 500], [330, 500]], badge: [600, 545],
      blurb: "Recognise how bad apps behave: accessibility abuse, overlays, droppers, persistence and IOCs.",
      stations: [
        { id: "m-a11y", name: "Accessibility Abbey", topic: "Accessibility abuse" },
        { id: "m-overlay", name: "Overlay Oval", topic: "Overlay attacks" },
        { id: "m-dropper", name: "Dropper Dock", topic: "Dynamic code loading" },
        { id: "m-persist", name: "Persistence Park", topic: "Boot receivers, services" },
        { id: "m-ioc", name: "IOC Junction", topic: "Indicators of compromise", junction: true },
      ],
    },
    {
      key: "report", n: 8, name: "Reporting", color: "#5b5a56", ink: "#fff", weight: 5,
      pts: [[330, 500], [260, 430], [260, 370], [600, 370]], badge: [215, 470],
      blurb: "Turn findings into points: CVSS 3.1, MASVS/MASTG references, evidence and clear fixes. Ends at eMAPT Central.",
      stations: [
        { id: "p-cvss", name: "CVSS Corner", topic: "Scoring with CVSS 3.1" },
        { id: "p-findings", name: "Findings Field", topic: "Writing a finding" },
        { id: "p-evidence", name: "Evidence Row", topic: "Proof and steps" },
        { id: "p-fix", name: "Remedy Road", topic: "Clear remediation" },
        { id: "central", name: "eMAPT Central", topic: "The full 45-question mock exam", central: true },
      ],
    },
  ],
};

// Tap-to-define words. Key → [title, plain-English definition].
window.GLOSSARY = {
  gloss: ["Dotted words", "Like this one. Tap any dotted word in a briefing or task to see a short definition."],
  apk: ["APK", "The Android app file. It is a ZIP that holds the code, the resources and the manifest."],
  package: ["Package name", "The app's unique ID, such as com.els.safenote. Most commands need it."],
  adb: ["adb", "Android Debug Bridge. A command-line tool on your PC that talks to the phone or emulator: install apps, open a shell, copy files."],
  emulator: ["Emulator", "A virtual Android phone that runs on your PC. The exam lab gives you one."],
  root: ["Root", "Full admin (superuser) rights on the device. With root you can read every app's private files."],
  shell: ["Shell", "A command line. adb shell opens one on the phone, so you can run Linux commands there."],
  uid: ["UID", "A Linux user ID. Android gives every app its own UID, and that keeps apps apart."],
  selinux: ["SELinux", "An extra Linux security layer. It has rules about what each app may touch, even beyond normal file permissions."],
  manifest: ["Manifest", "AndroidManifest.xml, the app's ID card: its components, permissions and security flags."],
  component: ["Component", "One of the four building blocks of an app: activity, service, broadcast receiver or content provider."],
  intent: ["Intent", "A message that asks Android to open a screen, start a service or deliver a broadcast."],
  ipc: ["IPC", "Inter-process communication: how apps talk to each other (Intents, content providers, bound services)."],
  exported: ["Exported", "A component that other apps (and you, with adb) are allowed to call."],
  uri: ["URI", "An address that points to data, such as content://com.app.notes/1 for a content provider."],
  dex: ["dex", "Dalvik Executable: the app's compiled code (classes.dex). Android runs it, and jadx turns it back into Java."],
  smali: ["smali", "A readable text form of dex code. apktool gives you smali, you can edit it, and then rebuild the app."],
  jadx: ["jadx", "A decompiler. It shows the app's code as readable Java, so you can understand the logic."],
  apktool: ["apktool", "Unpacks an APK into smali and readable XML (apktool d), and packs it back (apktool b)."],
  signing: ["Signing", "Every APK carries a developer signature. Android refuses an APK that was changed but not signed again."],
  jdwp: ["Debugger (JDWP)", "Java Debug Wire Protocol: how a debugger attaches to an app. It only works if the app is debuggable (or you are root)."],
  frida: ["Frida", "A tool that injects JavaScript into a running app, so you can watch or change its functions while it runs."],
  hook: ["Hook", "Code that catches a function call so you can see or change its arguments and what it returns."],
  burp: ["Burp Suite", "An HTTP proxy. It sits between the app and the server so you can read and change every request."],
  webview: ["WebView", "A small web browser inside an app. If it loads attacker content with JavaScript turned on, it can be abused."],
  deeplink: ["Deep link", "A link such as myapp://open?id=5 that opens a screen inside an app. A web page or another app can send it."],
  mitm: ["Man-in-the-middle", "An attacker who sits between the app and the server (for example on the same Wi-Fi) and reads or changes the traffic."],
  stride: ["STRIDE", "A checklist of 6 threats: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege."],
  threatmodel: ["Threat model", "A short plan of what could go wrong: the assets, the entry points, the threats and which ones matter most."],
  masvs: ["MASVS", "OWASP Mobile Application Security Verification Standard: what a secure app must do, in 8 categories (STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY)."],
  mastg: ["MASTG", "OWASP Mobile Application Security Testing Guide: how to test each MASVS requirement, step by step."],
  maswe: ["MASWE", "OWASP Mobile Application Security Weakness Enumeration: a list of specific mobile weaknesses, linked to MASVS."],
  top10: ["OWASP Mobile Top 10", "The 10 most common mobile risks. The current list is from 2024. M1 is Improper Credential Usage."],
};
