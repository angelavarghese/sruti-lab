# Plan: Sruti Lab, built in one day and documented the next

## Decisions to lock in first

**Tech stack:** plain HTML, CSS and JavaScript. No framework, no build step. This is the safest choice for a one-day build because there is nothing to configure, nothing to break at deploy time, and GitHub Pages serves the files exactly as they are.

**Audio:** the Web Audio API built into the browser, with oscillators for the swaras and short noise or tone bursts for percussion. No audio libraries are needed.

**Live coding:** this is the one place I have to be straight with you. TidalCycles itself can't run inside a website, because it needs Haskell and SuperCollider on the user's machine. The browser port, **Strudel**, uses nearly the same mini-notation and the same cycle concept, and it can be embedded in a page. So the best setup is:
- **Embedded in the site:** a Strudel REPL pre-loaded with the code your app generates.
- **Separate, real Tidal:** a short screen recording of you live-coding the same korvai in actual TidalCycles, or run live during your viva. Because the mini-notation carries over, this is honest and not a trick.

You can say in your report that Strudel is a Tidal port, so the Tidal patterns carry over directly.

## Part 1: Setup (about 45 minutes)

1. **Install:** current Node LTS (only for convenience tools), and VS Code extensions **Live Server** and **Prettier**. Git you already have.
2. **Create the GitHub repository** named something like `sruti-lab`, public, with a README and a `.gitignore`. Clone it locally and open it in VS Code.
3. **Plan the file layout:**
   - an HTML page for the app shell
   - one stylesheet
   - a **data file** (swara ratios, tāla definitions)
   - a **math file** (pure functions with no audio and no UI)
   - an **audio file** (the sound engine)
   - one file per module (Melakarta, Korvai)
   - a main file that wires the tabs together
4. **Enable GitHub Pages** in the repo settings, deploying from the main branch root. Push a "hello world" page now and confirm the public link works. Deploying a trivial page on day one removes the biggest end-of-day risk.
5. **Use Live Server** for local testing. Remember that browsers block audio until the user clicks something, so every sound must be triggered by a button.

## Part 2: Day 1 build order

Work in this order. It goes from the most mathematical code to the most visible, so you can stop at any point with something working.

### Block A: Math and data (about 1.5 hours)

Build these as pure functions first and test them in the browser console before touching any UI.

**Swara data.** Define the 12 pitch positions, 0 to 11 semitones, with names: S, R1, R2/G1, R3/G2, G3, M1, M2, P, D1, D2/N1, D3/N2, N3. Then add three ratio tables:
- **12-TET:** 2 to the power of (semitone/12).
- **Just Intonation:** R1 16/15, R2/G1 9/8, R3/G2 6/5, G3 5/4, M1 4/3, M2 45/32, P 3/2, D1 8/5, D2/N1 5/3, D3/N2 9/5, N3 15/8.
- **Pythagorean:** 256/243, 9/8, 32/27, 81/64, 4/3, 729/512, 3/2, 128/81, 27/16, 16/9, 243/128.

Note that JI choices vary between sources, especially for M2 and the D/N values. Pick one, check it against Benson or Radhika Iyer, and document it as your assumption.

**Melakarta generator.** The 72-scale rule, using mela number n from 1 to 72:
- **Ma:** M1 if n ≤ 36, otherwise M2.
- **Chakra:** (n − 1) divided by 6, rounded down, gives chakras 0 to 11. Take that mod 6 to pick the **Ri-Ga pair** from the ordered list: R1G1, R1G2, R1G3, R2G2, R2G3, R3G3.
- **Position in chakra:** (n − 1) mod 6 picks the **Dha-Ni pair** from the same-shaped list: D1N1, D1N2, D1N3, D2N2, D2N3, D3N3.

**Check your generator against these known ragas:**
- #15 Mayamalavagowla: S R1 G3 M1 P D1 N3
- #29 Dheerasankarabharanam: S R2 G3 M1 P D2 N3
- #65 Mechakalyani: S R2 G3 M2 P D2 N3
- #72 Rasikapriya: S R3 G3 M2 P D3 N3

**Cents function:** 1200 × log₂(ratio). Sanity checks:
- A perfect fifth, 3/2, should be about 701.96 cents.
- JI major third, 5/4, should be about 386.31, which is 13.69 cents flat of 12-TET.

**Comma demo math:** 12 fifths stacked versus 7 octaves. The ratio is 531441/524288, about 23.46 cents.

### Block B: Audio engine (about 1 hour)

Write one small module that exposes: play a note at a frequency for a duration, play a scale sequentially, play two scales as an A/B comparison, start and stop a drone, and play a percussive hit.

Guidance:
- Use a sawtooth or a few summed oscillators rather than a plain sine, so it sounds like an instrument and not a test tone.
- Add a short attack and release envelope so notes don't click.
- Add a **tanpura-style drone** on S and P (and the upper S). It makes the tuning differences much easier to hear and makes the whole thing sound Carnatic. Treat this as high value for low effort.
- Pick the sa frequency from a dropdown (the user's "shruti"), which links directly to Unit I.

### Block C: Melakarta Explorer UI (about 2 hours)

- Selector by number (1 to 72) and by components (Ma, Ri-Ga, Dha-Ni), kept in sync.
- Show the raga name, its chakra and the arohana/avarohana.
- A **tuning selector** (12-TET, JI, Pythagorean) plus a "play all three in sequence" button.
- A **table** per swara with ratio, frequency and cents deviation from 12-TET.
- The **comma demo** as its own panel with a button that plays 12 stacked fifths, then the reduced octave-equivalent, so the user hears it fail to close.
- Optional if time allows: a small circular diagram of the 12 pitch classes, which ties into modular arithmetic mod 12.

### Block D: Korvai Solver (about 3 hours)

**Data.** For each tāla, store the aksharas and the vibhāga split: Adi 4+2+2 = 8, Rupaka 2+4 = 6, Jhampa 7+1+2 = 10, plus Khanda Chapu and Misra Chapu if you like. Verify these against your references.

**Gati:** 3, 4, 5, 7 or 9 pulses per akshara. Total pulses per āvartana = aksharas × gati.

**Solver logic.** The basic form, from my earlier message, is that a phrase of length p is played three times with gap g between repeats, and it must satisfy 3p + 2g = target. The target is a whole number of āvartanas (let the user choose 1 to 4), so that the final repeat ends on sama. Three refinements for correctness:
- Also include the **gapless** case (g = 0), which is a pure mukthayi.
- Add sensible filters, such as p ≥ 3 and optionally g ≤ p, otherwise you'll list silly solutions.
- Make clear in the report that this is the simplest korvai form, and that real korvais can nest multiple such structures. Saying so is a mark of rigor, not a weakness.

**Sanity check:** Adi in chatusra gati has 32 pulses. For one āvartana, (p=10, g=1) and (p=8, g=4) must both appear.

**Player.** This is the main technical pitfall. Do **not** use ordinary timers to schedule beats. They drift. Use the audio clock's own timeline and schedule events slightly ahead, so the rhythm stays tight. The user hears: a soft click on each akshara (with a different sound for sama, clap and wave points), then the korvai pulses on top.

**Visualization.** A circle divided into the āvartana's pulses, with vibhāga boundaries marked and the phrase and gap sections colored differently, plus a moving highlight while it plays. This is the most impressive visible part of the project.

**Syllables.** Display konnakol-style syllables for the phrase: Ta-Ka-Di-Mi for chatusra, Ta-Ki-Ta for tisra, and so on. Displaying them as text is enough. Speech synthesis is not needed.

### Block E: Live Lab with Strudel (about 1 hour)

- Add a third tab or section called "Live Lab".
- Embed a Strudel REPL using Strudel's official embed script (check the Strudel documentation site for the current instructions, since this has been changing).
- Add a **"Generate code" button** to the Korvai Solver that builds a mini-notation snippet for the chosen (tāla, gati, p, g): the phrase, then a rest for the gap, three times, over one cycle with a pulse track alongside. The same text works in both Strudel and TidalCycles, which is exactly why this approach works.
- Provide a **copy button** and a link that opens strudel.cc.
- Expect two caveats: the embed needs internet, and it needs a click before audio starts.
- In your report, credit Strudel and note its licence.

### Block F: Deploy and test (about 1 hour)

- Push, and open the public link in a fresh browser window.
- Test every tab with a click-through. Check the sound plays, the numbers match your hand-calculated checks, and the page works at a normal laptop resolution.
- Commit with sensible messages. Graders sometimes look at commit history.

## Part 3: The real TidalCycles piece

Do this **after** the site is deployed and working, with a strict 90-minute time limit, because Tidal setup is the biggest time sink in the whole project.

Rough path (follow the official installation page on tidalcycles.org for your operating system, since the exact steps differ between Windows, Mac and Linux):
1. Install **GHC and Cabal** (via GHCup), then install the **Tidal** library.
2. Install **SuperCollider**, then install **SuperDirt** from inside it.
3. Install the TidalCycles extension in VS Code.
4. Start SuperDirt, then evaluate a Tidal snippet from your Korvai Solver.

If it isn't working by the time limit, stop. Use the Strudel embed as your live-coding demonstration and mention honestly in the report that Tidal was used for design and Strudel for deployment. If it does work, record a 60 to 90 second screen capture of live-coding a korvai and keep it for your viva.

## Part 4: Day 2 documentation plan

**Report structure:**
1. Introduction and objective, with course-outcome mapping
2. Mathematical background, in three parts: tuning (ratios, cents, comma, irrationality of log(3/2)), melakarta combinatorics (6 × 6 × 2), and tāla structure with the korvai Diophantine constraint
3. Design and implementation, one subsection per module
4. Live-coding component and the Tidal/Strudel relationship
5. Results and verification: a table of your sanity checks (the four ragas, the cents values, the Adi korvai solutions)
6. Limitations: simplified korvai model, JI tuning choices, synthesized sound is not an instrument recording
7. Future work: Module 3 (spectrum and beating), more tālas, nested korvais
8. References (the course texts plus Strudel/Tidal documentation) and the live link

**Also produce:**
- A README with a description, the live link, a screenshot and how to run it locally.
- Five to eight screenshots, taken at the end of day 1 while everything is fresh.
- A short list of viva talking points on why the comma exists, why 3p + 2g works, and why the JI and TET third differ.

## Priority if time runs short

1. Melakarta Explorer with the three tunings and the cents table
2. Korvai Solver with the player
3. The circular visualization
4. The Strudel embed and code generation
5. The comma demo and drone polish
6. Real Tidal installation

