# Brando B1 drawer correction QA · 2026-10-05

final result: blocked

The human rejected the preceding motion/modal despite passing automated checks.
New source: design/brandopolis-ui/reference/brando-b1/drawer-source.png (layout/context only;
exclude its humanized gem). New capture: drawer-desktop-preview.jpg in the same folder.
Both are compared together. Source 1672x941; preview 1348x926 capture with 620px drawer.
Different viewport/content means no pixel-exact full-page claim. Preview data is synthetic.

Iteration 1: right drawer and fixed composer worked, but disclosure row padding pushed the
quick-question controls below the initial fold. Reduced row padding, retained 44px primary
controls and captured again. Iteration 2: four quick-question controls visible above composer,
left Brando over attention, current decision/reason and counts visible without querying.
No additional desktop P0/P1/P2 finding within the authorized scope. The smaller nonhumanized
gem and concise introduction deliberately follow the explicit human direction over mockup art.

State motion uses one image without morph/stretch; fake-clock tests exercise finite cadence,
pause/visibility, neutral transition and identical source. Subjective quality still requires
human viewing; static screenshots cannot approve animation. Windows mobile/browser/regression
execution and human acceptance remain blockers. Production remains frozen.
