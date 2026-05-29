// Get effective Elo ratings for a match pair, handling host-vs-host correctly.
// When two hosts meet, only one gets the home bonus (randomly assigned).
// For QF/SF/Final rounds, only USA keeps the home advantage (Mexico/Canada do not host these rounds).
function getMatchElos(team1, team2, round) {
    let elo1 = teamEloRatings[team1] || 1500;
    let elo2 = teamEloRatings[team2] || 1500;

    const isDeepRound = round === "qf" || round === "sf" || round === "f";

    // Only USA hosts in deep knockout rounds
    const effectiveHosts = isDeepRound ? ["🇺🇸 United States"] : HOST_NATIONS;

    const team1IsHost = effectiveHosts.includes(team1);
    const team2IsHost = effectiveHosts.includes(team2);

    if (team1IsHost && team2IsHost) {
        // Two hosts meet — randomly pick which one is the actual home team
        if (Math.random() < 0.5) {
            elo1 += HOME_ADVANTAGE;
        } else {
            elo2 += HOME_ADVANTAGE;
        }
    } else if (team1IsHost) {
        elo1 += HOME_ADVANTAGE;
    } else if (team2IsHost) {
        elo2 += HOME_ADVANTAGE;
    }

    return { elo1, elo2 };
}

// Elo-based win probability (from Python codebase)
function calculateEloProbability(rating1, rating2) {
    return 1 / (1 + Math.pow(10, (rating2 - rating1) / 600));
}

// ===== Goal Scorer Selection =====
// Get tracked golden boot players for a given team (by JS team name)
function getTrackedPlayers(teamName) {
    return goldenBootPlayers.filter(p => p.team === teamName);
}

// Select a scorer for a single goal using Normalized Relative Probability Pool
// Returns a scorer string like "Harry Kane", "Own Goal", or "Squad Player"
function selectScorer(teamName) {
    // 1.5% flat chance of own goal
    if (Math.random() < 0.015) {
        return "Own Goal";
    }

    const tracked = getTrackedPlayers(teamName);
    if (tracked.length === 0) {
        return "Squad Player";
    }

    // Sum GPG as lottery tickets, add squad chaos weight of 0.40
    const totalPool = tracked.reduce((sum, p) => sum + p.gpg, 0) + 0.40;

    const roll = Math.random() * totalPool;
    let cumulative = 0;

    for (const player of tracked) {
        cumulative += player.gpg;
        if (roll <= cumulative) {
            return player.player;
        }
    }

    // Landed in the chaos zone — untracked squad player
    return "Squad Player";
}

// Generate scorers for all goals a team scored in a match
function generateScorers(teamName, goals) {
    const scorers = [];
    for (let i = 0; i < goals; i++) {
        scorers.push(selectScorer(teamName));
    }
    return scorers;
}

// Sample from a discrete probability distribution
// distribution: array of { goals, prob } objects where prob sums to 1
function sampleFromDistribution(distribution) {
    const roll = Math.random();
    let cumulative = 0;
    for (const entry of distribution) {
        cumulative += entry.prob;
        if (roll < cumulative) return entry.goals;
    }
    return distribution[distribution.length - 1].goals;
}

// Discrete distribution for total goals per match in 90 minutes
const MATCH_GOAL_DISTRIBUTION = [
    { goals: 0, prob: 0.1042 },
    { goals: 1, prob: 0.1823 },
    { goals: 2, prob: 0.2240 },
    { goals: 3, prob: 0.2604 },
    { goals: 4, prob: 0.0938 },
    { goals: 5, prob: 0.0625 },
    { goals: 6, prob: 0.0312 },
    { goals: 7, prob: 0.0312 },
    { goals: 8, prob: 0.0104 }
];

// Simulate a match using Elo ratings with discrete-distribution goals. Returns { g1, g2 }
// Optionally accepts pre-computed Elos so callers can reuse the same home-team assignment.
function simulateEloMatch(team1, team2, matchElos) {
    const { elo1, elo2 } = matchElos || getMatchElos(team1, team2);
    const eloProb = calculateEloProbability(elo1, elo2);
    const eloDiff = Math.abs(elo1 - elo2);

    // Draw probability: ~28% for equal teams, decays as Elo gap widens
    const drawProb = 0.28 * Math.exp(-eloDiff / 300);
    const decidedProb = 1.0 - drawProb;

    const team1WinProb = decidedProb * eloProb;
    const team2WinProb = decidedProb * (1.0 - eloProb);

    // Expected goals based on Elo probability (avg ~2.6 total per match)
    const totalExpectedGoals = 2.6;
    const team1_xG = totalExpectedGoals * eloProb;
    const team2_xG = totalExpectedGoals * (1.0 - eloProb);

    const rand = Math.random();
    let g1, g2;

    if (rand < team1WinProb) {
        // Team 1 wins
        let totalGoals = sampleFromDistribution(MATCH_GOAL_DISTRIBUTION);
        if (totalGoals === 0) totalGoals = 1; // min 1-0 result
        const winnerMin = Math.floor(totalGoals / 2) + 1;
        const remaining = totalGoals - winnerMin;
        // Distribute remaining goals with Elo-probability bias toward the winner
        let winnerExtra = 0;
        for (let i = 0; i < remaining; i++) {
            if (Math.random() < eloProb) winnerExtra++;
        }
        g1 = winnerMin + winnerExtra;
        g2 = totalGoals - g1;
    } else if (rand < team1WinProb + team2WinProb) {
        // Team 2 wins
        let totalGoals = sampleFromDistribution(MATCH_GOAL_DISTRIBUTION);
        if (totalGoals === 0) totalGoals = 1; // min 0-1 result
        const winnerMin = Math.floor(totalGoals / 2) + 1;
        const remaining = totalGoals - winnerMin;
        // Distribute remaining goals with Elo-probability bias toward the winner
        let winnerExtra = 0;
        for (let i = 0; i < remaining; i++) {
            if (Math.random() < (1 - eloProb)) winnerExtra++;
        }
        g2 = winnerMin + winnerExtra;
        g1 = totalGoals - g2;
    } else {
        // Draw — split evenly (if odd, reduce by 1 so both teams get equal goals)
        let totalGoals = sampleFromDistribution(MATCH_GOAL_DISTRIBUTION);
        if (totalGoals % 2 !== 0) totalGoals -= 1;
        g1 = totalGoals / 2;
        g2 = totalGoals / 2;
    }

    return { g1, g2, team1_xG, team2_xG, eloProb, scorers1: generateScorers(team1, g1), scorers2: generateScorers(team2, g2) };
}

// Simulate a knockout match with extra time and penalties
function simulateKnockoutMatchFull(team1, team2, round) {
    // Compute Elos once so the same home-team assignment is used for 90-min and ET
    const matchElos = getMatchElos(team1, team2, round);

    // Step 1: 90 minutes
    const { g1: s1, g2: s2, team1_xG: xg1, team2_xG: xg2, eloProb } = simulateEloMatch(team1, team2, matchElos);

    // Decided in regular time
    if (s1 !== s2) {
        return {
            s1, s2, aet: false, aet_s1: 0, aet_s2: 0,
            penalties: false, pen_s1: 0, pen_s2: 0,
            winner: s1 > s2 ? team1 : team2,
            xg1, xg2, eloProb,
            scorers1: generateScorers(team1, s1), scorers2: generateScorers(team2, s2)
        };
    }

    // Step 2: Extra time — multiply Elo difference by 1.25 (Fatigue Stretch)
    const baseDiff = matchElos.elo1 - matchElos.elo2;
    const etDiff = baseDiff * 1.25;
    const etEloProb = 1 / (1 + Math.pow(10, (-etDiff) / 600));

    // Extra time total goals distribution (most ET periods are 0-0)
    const etGoalDistribution = [
        { goals: 0, prob: 0.70 },
        { goals: 1, prob: 0.20 },
        { goals: 2, prob: 0.08 },
        { goals: 3, prob: 0.02 }
    ];

    // 60% of extra-time periods still end in a draw.
    // Remaining 40% follows the adjusted Elo probability.
    const etDecidedProb = 0.4;
    const etTeam1Prob = etDecidedProb * etEloProb;
    const etTeam2Prob = etDecidedProb * (1.0 - etEloProb);

    const etRoll = Math.random();
    let aet_s1 = 0, aet_s2 = 0;

    if (etRoll < etTeam1Prob) {
        // Team 1 wins in extra time
        let etTotal = sampleFromDistribution(etGoalDistribution);
        if (etTotal === 0) etTotal = 1; // at least 1-0 in ET
        aet_s1 = Math.floor(etTotal / 2) + 1;
        aet_s2 = etTotal - aet_s1;
        return {
            s1, s2, aet: true, aet_s1, aet_s2,
            penalties: false, pen_s1: 0, pen_s2: 0,
            winner: team1,
            xg1, xg2, eloProb,
            scorers1: generateScorers(team1, s1 + aet_s1), scorers2: generateScorers(team2, s2 + aet_s2)
        };
    } else if (etRoll < etTeam1Prob + etTeam2Prob) {
        // Team 2 wins in extra time
        let etTotal = sampleFromDistribution(etGoalDistribution);
        if (etTotal === 0) etTotal = 1; // at least 0-1 in ET
        aet_s2 = Math.floor(etTotal / 2) + 1;
        aet_s1 = etTotal - aet_s2;
        return {
            s1, s2, aet: true, aet_s1, aet_s2,
            penalties: false, pen_s1: 0, pen_s2: 0,
            winner: team2,
            xg1, xg2, eloProb,
            scorers1: generateScorers(team1, s1 + aet_s1), scorers2: generateScorers(team2, s2 + aet_s2)
        };
    }

    // ET ended in a draw — sample ET goals and split evenly
    let etTotal = sampleFromDistribution(etGoalDistribution);
    if (etTotal % 2 !== 0) etTotal -= 1;
    aet_s1 = etTotal / 2;
    aet_s2 = etTotal / 2;

    // Step 3: Penalty shootout — pure coin toss weighted by kick order
    const team1KicksFirst = Math.random() < 0.5;
    let penWinner;
    if (team1KicksFirst) {
        penWinner = Math.random() < 0.54 ? team1 : team2;
    } else {
        penWinner = Math.random() < 0.54 ? team2 : team1;
    }

    // Generate plausible shootout scores
    let pen_s1 = 2 + Math.floor(Math.random() * 3); // 2-4
    let pen_s2 = 2 + Math.floor(Math.random() * 3);
    if (penWinner === team1 && pen_s1 <= pen_s2) pen_s1 = pen_s2 + 1 + Math.floor(Math.random() * 2);
    if (penWinner === team2 && pen_s2 <= pen_s1) pen_s2 = pen_s1 + 1 + Math.floor(Math.random() * 2);

    return {
        s1, s2, aet: true, aet_s1, aet_s2,
        penalties: true, pen_s1, pen_s2,
        winner: penWinner,
        xg1, xg2, eloProb,
        scorers1: generateScorers(team1, s1 + aet_s1), scorers2: generateScorers(team2, s2 + aet_s2)
    };
}

let knockoutState = { r32: [], r16: [], qf: [], sf: [], f: [], champion: null };
let savedGroupTables = null;
let savedBestThirdPlaces = null;

// Tournament stats
let tournamentStats = null;

document.addEventListener("DOMContentLoaded", () => {
    renderGroupStage();

    document.getElementById("reset-btn").addEventListener("click", resetAll);

    const aiBtn = document.getElementById("ai-sim-btn");
    if (aiBtn) aiBtn.addEventListener("click", runFullAISimulation);

    const multiBtn = document.getElementById("multi-sim-btn");
    if (multiBtn) {
        multiBtn.addEventListener("click", () => {
            const input = prompt("How many simulations to run?", "500");
            const n = parseInt(input);
            if (n && n > 0) {
                runMultiSimulation(n);
            }
        });
    }

    // How It Works modal
    const howBtn = document.getElementById("how-it-works-btn");
    const howOverlay = document.getElementById("how-modal-overlay");
    const howClose = document.getElementById("how-modal-close");
    if (howBtn && howOverlay) {
        howBtn.addEventListener("click", () => { howOverlay.style.display = "flex"; });
        if (howClose) howClose.addEventListener("click", () => { howOverlay.style.display = "none"; });
        howOverlay.addEventListener("click", (e) => {
            if (e.target === howOverlay) howOverlay.style.display = "none";
        });
    }

});

// Render team name with flag image (reliable across all browsers/platforms)
function renderTeam(name) {
    const code = teamFlagCode[name];
    const cleanName = name.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/u, '').replace(/\u{1F3F4}[\u{E0020}-\u{E007F}]+/u, '').trim();
    if (code) {
        return '<img src="https://flagcdn.com/16x12/' + code + '.png" alt="" class="team-flag"> ' + cleanName;
    }
    return name;
}

function renderGroupStage() {
    const container = document.getElementById("groups-container");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(groupsData).forEach(groupName => {
        const groupCard = document.createElement("div");
        groupCard.className = "group-card";
        groupCard.innerHTML = `<h3>Group ${groupName}</h3>`;

        const teams = groupsData[groupName];
        const fixtures = [
            [teams[0], teams[1]], [teams[2], teams[3]],
            [teams[0], teams[2]], [teams[1], teams[3]],
            [teams[0], teams[3]], [teams[1], teams[2]]
        ];

        fixtures.forEach((match) => {
            const row = document.createElement("div");
            row.className = "group-match-row";
            row.innerHTML = `
                <span style="font-size:0.85rem; width:40%; text-align:right;">${renderTeam(match[0])}</span>
                <div class="score-inputs">
                    <input type="number" min="0" class="score-input score-t1" value="0">
                    <span class="match-vs">vs</span>
                    <input type="number" min="0" class="score-input score-t2" value="0">
                </div>
                <span style="font-size:0.85rem; width:40%; text-align:left;">${renderTeam(match[1])}</span>
            `;
            row.setAttribute("data-t1", match[0]);
            row.setAttribute("data-t2", match[1]);
            groupCard.appendChild(row);
        });

        container.appendChild(groupCard);
    });
}

function processGroupStage() {
    let groupResults = {};
    let thirdPlaceTeams = [];
    let tableData = {};
    Object.keys(groupsData).forEach(g => {
        groupsData[g].forEach(team => { tableData[team] = { name: team, group: g, points: 0, gd: 0, gf: 0 }; });
    });

    const matchRows = document.querySelectorAll(".group-match-row");
    matchRows.forEach(row => {
        const input1 = row.querySelector(".score-t1");
        const input2 = row.querySelector(".score-t2");
        const t1 = row.getAttribute("data-t1");
        const t2 = row.getAttribute("data-t2");
        const g1 = parseInt(input1.value) || 0;
        const g2 = parseInt(input2.value) || 0;

        tableData[t1].gf += g1; tableData[t2].gf += g2;
        tableData[t1].gd += (g1 - g2); tableData[t2].gd += (g2 - g1);

        if (g1 > g2) { tableData[t1].points += 3; }
        else if (g2 > g1) { tableData[t2].points += 3; }
        else { tableData[t1].points += 1; tableData[t2].points += 1; }
    });

    Object.keys(groupsData).forEach(g => {
        let groupTeams = groupsData[g].map(t => tableData[t]);
        groupTeams.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

        groupResults[g] = {
            1: groupTeams[0].name,
            2: groupTeams[1].name,
            3: groupTeams[2].name,
            4: groupTeams[3].name
        };

        thirdPlaceTeams.push({ team: groupTeams[2].name, group: g, points: groupTeams[2].points, gd: groupTeams[2].gd });
    });

    thirdPlaceTeams.sort((a, b) => b.points - a.points || b.gd - a.gd);
    let best8ThirdPlaces = thirdPlaceTeams.slice(0, 8);

    // Save for group tables view
    savedGroupTables = {};
    Object.keys(groupsData).forEach(g => {
        let sorted = groupsData[g].map(t => tableData[t]);
        sorted.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
        savedGroupTables[g] = sorted;
    });
    savedBestThirdPlaces = best8ThirdPlaces;
    renderGroupTables();
    document.getElementById("group-tables-container").classList.remove("id-disabled");

    knockoutState.r32 = [];
    let get3rd = (idx) => best8ThirdPlaces[idx] ? best8ThirdPlaces[idx].team : `3rd Place Pool #${idx + 1}`;

    const officialR32Layout = [
        { id: 0, matchNo: 73, t1: groupResults['A'][2], t2: groupResults['B'][2] },
        { id: 1, matchNo: 74, t1: groupResults['E'][1], t2: get3rd(0) },
        { id: 2, matchNo: 75, t1: groupResults['F'][1], t2: groupResults['C'][2] },
        { id: 3, matchNo: 76, t1: groupResults['C'][1], t2: groupResults['F'][2] },
        { id: 4, matchNo: 77, t1: groupResults['I'][1], t2: get3rd(1) },
        { id: 5, matchNo: 78, t1: groupResults['E'][2], t2: groupResults['I'][2] },
        { id: 6, matchNo: 79, t1: groupResults['A'][1], t2: get3rd(2) },
        { id: 7, matchNo: 80, t1: groupResults['L'][1], t2: get3rd(3) },
        { id: 8, matchNo: 81, t1: groupResults['D'][1], t2: get3rd(4) },
        { id: 9, matchNo: 82, t1: groupResults['G'][1], t2: get3rd(5) },
        { id: 10, matchNo: 83, t1: groupResults['K'][2], t2: groupResults['L'][2] },
        { id: 11, matchNo: 84, t1: groupResults['H'][1], t2: groupResults['J'][2] },
        { id: 12, matchNo: 85, t1: groupResults['B'][1], t2: get3rd(6) },
        { id: 13, matchNo: 86, t1: groupResults['J'][1], t2: groupResults['H'][2] },
        { id: 14, matchNo: 87, t1: groupResults['K'][1], t2: get3rd(7) },
        { id: 15, matchNo: 88, t1: groupResults['D'][2], t2: groupResults['G'][2] }
    ];

    officialR32Layout.forEach(m => {
        knockoutState.r32.push({
            id: m.id, matchNo: m.matchNo, t1: m.t1, t2: m.t2,
            winner: null, s1: "", s2: "",
            aet: false, aet_s1: 0, aet_s2: 0,
            penalties: false, pen_s1: 0, pen_s2: 0,
            scorers1: [], scorers2: []
        });
    });

    setupBlankRounds();

    const koSection = document.getElementById("knockout-section");
    if (koSection) koSection.classList.remove("id-disabled");
    renderBracket();
}

function setupBlankRounds() {
    const blankMatch = () => ({ t1: null, t2: null, winner: null, s1: "", s2: "", aet: false, aet_s1: 0, aet_s2: 0, penalties: false, pen_s1: 0, pen_s2: 0, scorers1: [], scorers2: [] });
    knockoutState.r16 = Array(8).fill(null).map((_, i) => ({ id: i, ...blankMatch() }));
    knockoutState.qf = Array(4).fill(null).map((_, i) => ({ id: i, ...blankMatch() }));
    knockoutState.sf = Array(2).fill(null).map((_, i) => ({ id: i, ...blankMatch() }));
    knockoutState.f = [{ id: 0, ...blankMatch() }];
    knockoutState.champion = null;
}

function renderBracket() {
    renderKoRound(knockoutState.r32, "r32-slots", "r32");
    renderKoRound(knockoutState.r16, "r16-slots", "r16");
    renderKoRound(knockoutState.qf, "qf-slots", "qf");
    renderKoRound(knockoutState.sf, "sf-slots", "sf");
    renderKoRound(knockoutState.f, "f-slots", "f");

    const champField = document.getElementById("champion-name");
    if (champField) champField.innerHTML = knockoutState.champion ? renderTeam(knockoutState.champion) : "???";
}

function renderKoRound(matches, containerId, roundKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    matches.forEach(match => {
        const matchBox = document.createElement("div");
        matchBox.className = "match-box";

        const name1 = match.t1 || "Waiting...";
        const name2 = match.t2 || "Waiting...";

        // Compute display scores for AET / penalty matches
        let displayS1 = match.s1, displayS2 = match.s2;
        let suffix1 = "", suffix2 = "";
        if (match.winner && match.aet) {
            displayS1 = match.s1 + match.aet_s1;
            displayS2 = match.s2 + match.aet_s2;
            if (match.penalties) {
                // Put (p) on the winner's score
                if (match.winner === match.t1) suffix1 = " (p)";
                else suffix2 = " (p)";
            }
        }

        const div1 = document.createElement("div");
        div1.className = `ko-team ${match.winner === match.t1 && match.t1 ? 'advanced' : ''} ${match.winner && match.winner !== match.t1 ? 'eliminated' : ''}`;

        if (!match.t1 || !match.t2) {
            div1.innerHTML = renderTeam(name1);
        } else if (match.winner && match.aet) {
            div1.innerHTML = `<span>${renderTeam(name1)}</span><span class="score-input score-display">${displayS1}${suffix1}</span>`;
        } else {
            div1.innerHTML = `<span>${renderTeam(name1)}</span><input type="number" min="0" class="score-input" value="${displayS1}" onchange="advanceTeamScore('${roundKey}', ${match.id}, this.value, 't1')">`;
        }

        const div2 = document.createElement("div");
        div2.className = `ko-team ${match.winner === match.t2 && match.t2 ? 'advanced' : ''} ${match.winner && match.winner !== match.t2 ? 'eliminated' : ''}`;

        if (!match.t1 || !match.t2) {
            div2.innerHTML = renderTeam(name2);
        } else if (match.winner && match.aet) {
            div2.innerHTML = `<span>${renderTeam(name2)}</span><span class="score-input score-display">${displayS2}${suffix2}</span>`;
        } else {
            div2.innerHTML = `<span>${renderTeam(name2)}</span><input type="number" min="0" class="score-input" value="${displayS2}" onchange="advanceTeamScore('${roundKey}', ${match.id}, this.value, 't2')">`;
        }

        matchBox.appendChild(div1);
        matchBox.appendChild(div2);

        // Show extra time / penalty label if applicable
        if (match.winner && match.aet) {
            const info = document.createElement("div");
            info.className = "ko-info";
            if (match.penalties) {
                info.innerText = `AET (${match.pen_s1}-${match.pen_s2} pens)`;
            } else {
                info.innerText = "AET";
            }
            matchBox.appendChild(info);
        }

        container.appendChild(matchBox);
    });
}

function advanceTeamScore(currentRound, matchId, val, teamType) {
    let match = knockoutState[currentRound][matchId];
    if (teamType === 't1') match.s1 = val; else match.s2 = val;

    if (match.s1 !== "" && match.s2 !== "" && match.s1 !== undefined && match.s2 !== undefined) {
        let g1 = parseInt(match.s1) || 0;
        let g2 = parseInt(match.s2) || 0;
        let winner = null;

        if (g1 > g2) winner = match.t1;
        else if (g2 > g1) winner = match.t2;
        else {
            let p = prompt(`Match Tied! Enter Penalty Shootout Winner:\n1 for ${match.t1}\n2 for ${match.t2}`);
            winner = (p === "2") ? match.t2 : match.t1;
        }
        pushToNextRound(currentRound, matchId, winner);
    }
}

// Run one-click full tournament simulation using Elo ratings
function runFullAISimulation() {
    renderGroupStage();

    // Initialize tournament stats collector
    initTournamentStats();

    // Simulate group stage matches
    const matchRows = document.querySelectorAll(".group-match-row");
    matchRows.forEach(row => {
        const t1 = row.getAttribute("data-t1");
        const t2 = row.getAttribute("data-t2");
        const { g1, g2, team1_xG, team2_xG, eloProb, scorers1, scorers2 } = simulateEloMatch(t1, t2);

        const inp1 = row.querySelector(".score-t1");
        const inp2 = row.querySelector(".score-t2");
        if (inp1 && inp2) {
            inp1.value = g1;
            inp2.value = g2;
        }

        collectGroupMatchData(t1, t2, g1, g2, team1_xG, team2_xG, eloProb, scorers1, scorers2);
    });

    processGroupStage();

    // Simulate knockout stages with ET and penalties
    const rounds = ["r32", "r16", "qf", "sf", "f"];
    rounds.forEach(roundKey => {
        if (knockoutState[roundKey]) {
            knockoutState[roundKey].forEach(match => {
                if (match.t1 && match.t2) {
                    const result = simulateKnockoutMatchFull(match.t1, match.t2, roundKey);
                    match.s1 = result.s1;
                    match.s2 = result.s2;
                    match.aet = result.aet;
                    match.aet_s1 = result.aet_s1;
                    match.aet_s2 = result.aet_s2;
                    match.penalties = result.penalties;
                    match.pen_s1 = result.pen_s1;
                    match.pen_s2 = result.pen_s2;
                    match.scorers1 = result.scorers1;
                    match.scorers2 = result.scorers2;
                    pushToNextRound(roundKey, match.id, result.winner);

                    collectKOMatchData(roundKey, match, result);
                }
            });
        }
    });

    // Compute and save tournament stats
    finalizeAndSaveTournamentStats();

    const koSec = document.getElementById("knockout-section");
    if (koSec) koSec.scrollIntoView({ behavior: 'smooth' });
}

function renderGroupTables() {
    const container = document.getElementById("group-tables-container");
    if (!container || !savedGroupTables) return;

    // Build group tables grid
    let html = '<div class="tables-grid">';
    Object.keys(savedGroupTables).sort().forEach(g => {
        html += `<div class="table-card"><h3>Group ${g}</h3><table>
            <tr><th>Pos</th><th>Team</th><th>Pts</th><th>GF</th><th>GA</th><th>GD</th></tr>`;
        savedGroupTables[g].forEach((t, i) => {
            const posClass = i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : '';
            html += `<tr class="${posClass}">
                <td>${i + 1}</td><td>${renderTeam(t.name)}</td>
                <td class="pts-col">${t.points}</td>
                <td>${t.gf}</td><td>${t.gf - t.gd}</td>
                <td class="${t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : ''}">${t.gd > 0 ? '+' : ''}${t.gd}</td>
            </tr>`;
        });
        html += '</table></div>';
    });
    html += '</div>';

    // Best third-placed teams
    if (savedBestThirdPlaces) {
        html += '<div class="third-place-section"><h3>Best Third-Placed Teams (advancing to R32)</h3><ol class="third-place-list">';
        savedBestThirdPlaces.forEach((t, i) => {
            html += `<li><span class="tp-team">${renderTeam(t.team)}</span> <span class="tp-stats">Group ${t.group} &middot; ${t.points} pts &middot; ${t.gd > 0 ? '+' : ''}${t.gd} GD</span></li>`;
        });
        html += '</ol></div>';
    }

    container.innerHTML = html;
}

/* =====================================================================
   Tournament Stats Dashboard
   ===================================================================== */

function initTournamentStats(stats) {
    const target = stats || tournamentStats || {};
    target.teams = {};
    target.matches = [];
    target.highestScoring = null;
    target.biggestBlowout = null;
    target.marathonMatch = null;
    target.biggestSmashAndGrab = { deficit: 0 };
    target.hostility = { teamDeltas: {} };
    // Initialize all 48 teams
    Object.values(groupsData).forEach(group => {
        group.forEach(team => {
            target.teams[team] = {
                gf: 0, ga: 0, mp: 0, w: 0, d: 0, l: 0,
                elo: teamEloRatings[team] || 1500,
                etMinutes: 0, pensWon: 0, pensLost: 0,
                xgCreated: 0, xgConceded: 0
            };
        });
    });
    // Initialize hostility trackers for hostile + rival nations + USA
    [...HOSTILE_NATIONS, ...RIVAL_NATIONS, "🇺🇸 United States"].forEach(nation => {
        target.hostility.teamDeltas[nation] = { totalDelta: 0, matchCount: 0 };
    });
    if (!stats) tournamentStats = target;
    return target;
}

function collectGroupMatchData(t1, t2, g1, g2, xg1, xg2, eloProb, scorers1, scorers2, stats) {
    const s = stats || tournamentStats;
    const d = s.teams;
    d[t1].gf += g1; d[t1].ga += g2; d[t1].mp += 1;
    d[t2].gf += g2; d[t2].ga += g1; d[t2].mp += 1;
    if (g1 > g2) { d[t1].w++; d[t2].l++; }
    else if (g2 > g1) { d[t2].w++; d[t1].l++; }
    else { d[t1].d++; d[t2].d++; }

    // Track xG
    d[t1].xgCreated += xg1; d[t1].xgConceded += xg2;
    d[t2].xgCreated += xg2; d[t2].xgConceded += xg1;

    // Track geopolitical hostility deltas
    const h = s.hostility.teamDeltas;
    const t1Outcome = g1 > g2 ? 1.0 : g1 === g2 ? 0.5 : 0.0;
    const t2Outcome = g2 > g1 ? 1.0 : g2 === g1 ? 0.5 : 0.0;
    const t1Prob = eloProb;
    const t2Prob = 1.0 - eloProb;
    if (h[t1] !== undefined) { h[t1].totalDelta += t1Outcome - t1Prob; h[t1].matchCount++; }
    if (h[t2] !== undefined) { h[t2].totalDelta += t2Outcome - t2Prob; h[t2].matchCount++; }

    const total = g1 + g2;
    const margin = Math.abs(g1 - g2);
    const record = { t1, t2, g1, g2, round: "Group Stage", scorers1, scorers2 };
    s.matches.push(record);

    if (!s.highestScoring || total > s.highestScoring.total)
        s.highestScoring = { total, ...record };
    if (!s.biggestBlowout || margin > s.biggestBlowout.margin)
        s.biggestBlowout = { margin, ...record };

    // Check for Smash & Grab (winner had lower xG)
    if (g1 > g2 && xg1 < xg2) {
        const deficit = xg2 - xg1;
        if (deficit > s.biggestSmashAndGrab.deficit) {
            s.biggestSmashAndGrab = { winner: t1, loser: t2, score: `${g1}-${g2}`, deficit, xg1, xg2, round: "Group Stage" };
        }
    } else if (g2 > g1 && xg2 < xg1) {
        const deficit = xg1 - xg2;
        if (deficit > s.biggestSmashAndGrab.deficit) {
            s.biggestSmashAndGrab = { winner: t2, loser: t1, score: `${g2}-${g1}`, deficit, xg1, xg2, round: "Group Stage" };
        }
    }
}

function collectKOMatchData(roundKey, match, result, stats) {
    const s = stats || tournamentStats;
    const t1 = match.t1, t2 = match.t2;
    const g1 = parseInt(result.s1) + (result.aet ? result.aet_s1 : 0);
    const g2 = parseInt(result.s2) + (result.aet ? result.aet_s2 : 0);

    const d = s.teams;
    d[t1].gf += g1; d[t1].ga += g2; d[t1].mp += 1;
    d[t2].gf += g2; d[t2].ga += g1; d[t2].mp += 1;
    if (g1 > g2) { d[t1].w++; d[t2].l++; }
    else { d[t2].w++; d[t1].l++; }

    // Track xG (from 90-min simulation)
    const xg1 = result.xg1 || 0;
    const xg2 = result.xg2 || 0;
    d[t1].xgCreated += xg1; d[t1].xgConceded += xg2;
    d[t2].xgCreated += xg2; d[t2].xgConceded += xg1;

    // Track geopolitical hostility deltas (using 90-min eloProb)
    const eloProb = result.eloProb || 0.5;
    const h = s.hostility.teamDeltas;
    const t1Outcome = g1 > g2 ? 1.0 : g1 === g2 ? 0.5 : 0.0;
    const t2Outcome = g2 > g1 ? 1.0 : g2 === g1 ? 0.5 : 0.0;
    if (h[t1] !== undefined) { h[t1].totalDelta += t1Outcome - eloProb; h[t1].matchCount++; }
    if (h[t2] !== undefined) { h[t2].totalDelta += t2Outcome - (1.0 - eloProb); h[t2].matchCount++; }

    if (result.aet) {
        d[t1].etMinutes += 30;
        d[t2].etMinutes += 30;
    }
    if (result.penalties) {
        if (result.winner === t1) { d[t1].pensWon++; d[t2].pensLost++; }
        else { d[t2].pensWon++; d[t1].pensLost++; }
    }

    const roundLabels = { r32: "Round of 32", r16: "Round of 16", qf: "Quarter-Final", sf: "Semi-Final", f: "Final" };
    const label = roundLabels[roundKey] || roundKey;
    const total = g1 + g2;
    const margin = Math.abs(g1 - g2);
    const record = { t1, t2, g1, g2, round: label, aet: result.aet, penalties: result.penalties, scorers1: result.scorers1, scorers2: result.scorers2 };
    s.matches.push(record);

    if (!s.highestScoring || total > s.highestScoring.total)
        s.highestScoring = { total, ...record };
    if (!s.biggestBlowout || margin > s.biggestBlowout.margin)
        s.biggestBlowout = { margin, ...record };
    if (result.penalties && !s.marathonMatch)
        s.marathonMatch = record;

    // Check for Smash & Grab (winner had lower xG)
    if (g1 > g2 && xg1 < xg2) {
        const deficit = xg2 - xg1;
        if (deficit > s.biggestSmashAndGrab.deficit) {
            s.biggestSmashAndGrab = { winner: t1, loser: t2, score: `${g1}-${g2}`, deficit, xg1, xg2, round: label };
        }
    } else if (g2 > g1 && xg2 < xg1) {
        const deficit = xg1 - xg2;
        if (deficit > s.biggestSmashAndGrab.deficit) {
            s.biggestSmashAndGrab = { winner: t2, loser: t1, score: `${g2}-${g1}`, deficit, xg1, xg2, round: label };
        }
    }
}

function computeStageAssignments(koState) {
    const ks = koState || knockoutState;
    const allTeams = new Set();
    Object.values(groupsData).forEach(g => g.forEach(t => allTeams.add(t)));

    function teamsInRound(round) {
        const s = new Set();
        (ks[round] || []).forEach(m => {
            if (m.t1) s.add(m.t1);
            if (m.t2) s.add(m.t2);
        });
        return s;
    }

    const r32S = teamsInRound("r32");
    const r16S = teamsInRound("r16");
    const qfS = teamsInRound("qf");
    const sfS = teamsInRound("sf");
    const fS = teamsInRound("f");

    const map = {};
    allTeams.forEach(t => map[t] = "Group Stage");
    r32S.forEach(t => map[t] = "Round of 32");
    r16S.forEach(t => map[t] = "Round of 16");
    qfS.forEach(t => map[t] = "Quarter-Finals");
    sfS.forEach(t => map[t] = "Semi-Finals");
    fS.forEach(t => map[t] = "Final");
    if (ks.champion) map[ks.champion] = "Champion";
    return map;
}

function finalizeAndSaveTournamentStats() {
    const stageMap = computeStageAssignments();
    const d = tournamentStats.teams;
    Object.keys(d).forEach(team => { d[team].stage = stageMap[team] || "Group Stage"; });

    const teamList = Object.keys(d);

    // Golden Boot — most goals scored
    const goldenBoot = teamList.reduce((a, b) => d[a].gf > d[b].gf ? a : b);

    // Iron Curtain — fewest goals conceded (min 3 matches)
    const eligibleDef = teamList.filter(t => d[t].mp >= 3);
    const ironCurtain = eligibleDef.length ? eligibleDef.reduce((a, b) => d[a].ga < d[b].ga ? a : b) : null;

    // Sniper Award — best goal difference
    const sniper = teamList.reduce((a, b) => (d[a].gf - d[a].ga) > (d[b].gf - d[b].ga) ? a : b);

    // Cinderella Award — most over-performing team (largest surplus of actual stage vs Elo-based expectation)
    const cinderellaElos = teamList.map(t => d[t].elo);
    const cinderellaMinElo = Math.min(...cinderellaElos);
    const cinderellaMaxElo = Math.max(...cinderellaElos);
    const cinderellaRange = cinderellaMaxElo - cinderellaMinElo;
    const cinderellaCandidates = teamList.filter(t => STAGE_SCORE[d[t].stage] >= 2)
        .map(t => ({
            team: t,
            surplus: STAGE_SCORE[d[t].stage] - (cinderellaRange > 0 ? ((d[t].elo - cinderellaMinElo) / cinderellaRange) * 6 : 0)
        }));
    const cinderella = cinderellaCandidates.length
        ? cinderellaCandidates.sort((a, b) => b.surplus - a.surplus)[0].team
        : null;

    // Fraud Watch — highest Elo that went out earliest (didn't win). No minimum stage filter.
    const fraudCandidates = teamList.filter(t => d[t].stage !== "Champion");
    const fraudWatch = fraudCandidates.length
        ? fraudCandidates.sort((a, b) =>
            STAGE_SCORE[d[a].stage] - STAGE_SCORE[d[b].stage] || d[b].elo - d[a].elo)[0]
        : null;

    // Chaos Magnet — most extra time minutes
    const chaosCandidates = teamList.filter(t => d[t].etMinutes > 0);
    const chaosMagnet = chaosCandidates.length
        ? chaosCandidates.sort((a, b) => d[b].etMinutes - d[a].etMinutes)[0]
        : null;

    // === xG-Based Awards ===

    // Sniper Award (Clinical Overperformance) — biggest positive diff between actual goals and xG
    const sniperOver = teamList
        .filter(t => d[t].mp >= 3)
        .sort((a, b) => (d[b].gf - d[b].xgCreated) - (d[a].gf - d[a].xgCreated))[0];
    const sniperOverDiff = sniperOver ? d[sniperOver].gf - d[sniperOver].xgCreated : 0;

    // Wooden Boot (Anemic Underperformance) — biggest negative diff between actual goals and xG
    const woodenBoot = teamList
        .filter(t => d[t].mp >= 3)
        .sort((a, b) => (d[a].gf - d[a].xgCreated) - (d[b].gf - d[b].xgCreated))[0];
    const woodenBootDiff = woodenBoot ? d[woodenBoot].gf - d[woodenBoot].xgCreated : 0;

    // Most Dominant Attack — highest avg xG per match
    const dominantAttack = teamList
        .filter(t => d[t].mp >= 3)
        .sort((a, b) => (d[b].xgCreated / d[b].mp) - (d[a].xgCreated / d[a].mp))[0];
    const dominantAttackAvg = dominantAttack ? (d[dominantAttack].xgCreated / d[dominantAttack].mp).toFixed(2) : 0;

    // Most Rigid Defense — lowest avg xG allowed per match
    const rigidDefense = teamList
        .filter(t => d[t].mp >= 3)
        .sort((a, b) => (d[a].xgConceded / d[a].mp) - (d[b].xgConceded / d[b].mp))[0];
    const rigidDefenseAvg = rigidDefense ? (d[rigidDefense].xgConceded / d[rigidDefense].mp).toFixed(2) : 0;

    // Smash & Grab — single match with biggest xG upset
    const smashAndGrab = tournamentStats.biggestSmashAndGrab.deficit > 0 ? tournamentStats.biggestSmashAndGrab : null;

    // === Geopolitical Hostility Index ===
    const h = tournamentStats.hostility.teamDeltas;
    const hostileEntries = [];
    [...HOSTILE_NATIONS, ...RIVAL_NATIONS].forEach(nation => {
        const entry = h[nation];
        if (entry && entry.matchCount > 0) {
            hostileEntries.push({ nation, avgDelta: entry.totalDelta / entry.matchCount });
        }
    });

    // Peak hostility: use the BEST-PERFORMING hostile/rival nation's avg delta.
    // If Iran wins the whole tournament, the rating reflects Iran — not the
    // diluted average of Iran + Haiti + Iraq + Mexico + Canada.
    const peakEntry = hostileEntries.length
        ? hostileEntries.reduce((a, b) => a.avgDelta > b.avgDelta ? a : b)
        : null;
    const aggregateDelta = peakEntry ? peakEntry.avgDelta : 0;
    const peakNation = peakEntry ? peakEntry.nation : null;

    // USA performance delta — used to amplify/reduce the annoyance factor
    const usaEntry = h["🇺🇸 United States"];
    const usaAvgDelta = (usaEntry && usaEntry.matchCount > 0) ? (usaEntry.totalDelta / usaEntry.matchCount) : 0;

    // Adjusted annoyance: peak hostile performance relative to USA's own performance
    const adjustedRating = aggregateDelta - usaAvgDelta;

    // Persona Non Grata — hostile/rival nation with highest individual avg delta
    const personaNonGrata = hostileEntries.length
        ? hostileEntries.sort((a, b) => b.avgDelta - a.avgDelta)[0]
        : null;

    // Most notable USA vs hostile/rival result
    const hostileRivalSet = new Set([...HOSTILE_NATIONS, ...RIVAL_NATIONS]);
    let notableUSMatch = null;
    tournamentStats.matches.forEach(m => {
        let usaTeam, opponent, usaScore, oppScore, usaLost;
        if (m.t1 === "🇺🇸 United States" && hostileRivalSet.has(m.t2)) {
            usaTeam = m.t1; opponent = m.t2; usaScore = m.g1; oppScore = m.g2; usaLost = m.g2 > m.g1;
        } else if (m.t2 === "🇺🇸 United States" && hostileRivalSet.has(m.t1)) {
            usaTeam = m.t2; opponent = m.t1; usaScore = m.g2; oppScore = m.g1; usaLost = m.g1 > m.g2;
        }
        if (usaTeam) {
            const margin = Math.abs(usaScore - oppScore);
            if (!notableUSMatch || margin > notableUSMatch.margin) {
                notableUSMatch = { opponent, usaScore, oppScore, margin, usaLost, round: m.round };
            }
        }
    });

    // === Golden Boot — tally all named scorers across all matches ===
    const goalTally = {};
    const playerTeamMap = {};
    tournamentStats.matches.forEach(m => {
        if (m.scorers1) {
            m.scorers1.forEach(name => {
                if (name !== "Own Goal" && name !== "Squad Player") {
                    goalTally[name] = (goalTally[name] || 0) + 1;
                    playerTeamMap[name] = m.t1;
                }
            });
        }
        if (m.scorers2) {
            m.scorers2.forEach(name => {
                if (name !== "Own Goal" && name !== "Squad Player") {
                    goalTally[name] = (goalTally[name] || 0) + 1;
                    playerTeamMap[name] = m.t2;
                }
            });
        }
    });
    // Sort all scorers by goals descending, then group into medal tiers (ties share medals)
    const allScorers = Object.entries(goalTally)
        .sort((a, b) => b[1] - a[1])
        .map(([name, goals]) => ({ name, team: playerTeamMap[name], goals }));
    const medalTiers = [];
    const seenGoals = new Set();
    let totalMedalPlayers = 0;
    for (const p of allScorers) {
        if (!seenGoals.has(p.goals)) {
            if (totalMedalPlayers >= 3) break;
            seenGoals.add(p.goals);
            const medals = ['&#x1f947;', '&#x1f948;', '&#x1f949;'];
            const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
            const labels = ['Gold', 'Silver', 'Bronze'];
            const idx = medalTiers.length;
            medalTiers.push({ goals: p.goals, medal: medals[idx], color: medalColors[idx], label: labels[idx], players: [] });
        }
        medalTiers[medalTiers.length - 1].players.push(p);
        totalMedalPlayers++;
    }

    // Tin Medal — highest GPG golden boot player who scored 0 goals
    const teamsWithData = new Set(Object.keys(tournamentStats.teams));
    let tinMedal = null;
    for (const p of goldenBootPlayers) {
        if (p.team && teamsWithData.has(p.team) && !goalTally[p.player]) {
            if (!tinMedal || p.gpg > tinMedal.gpg) {
                tinMedal = { name: p.player, team: p.team, gpg: p.gpg };
            }
        }
    }

    tournamentStats.summary = {
        goldenBootTop3: medalTiers,
        tinMedal,
        goldenBoot, ironCurtain, sniper,
        cinderella, fraudWatch, chaosMagnet,
        sniperOver, sniperOverDiff,
        woodenBoot, woodenBootDiff,
        dominantAttack, dominantAttackAvg,
        rigidDefense, rigidDefenseAvg,
        smashAndGrab,
        aggregateDelta, usaAvgDelta, adjustedRating, peakNation, personaNonGrata, notableUSMatch,
        highestScoring: tournamentStats.highestScoring,
        biggestBlowout: tournamentStats.biggestBlowout,
        marathonMatch: tournamentStats.marathonMatch
    };

    renderTournamentStats();
    document.getElementById("stats-container").classList.remove("id-disabled");
}

// Extract flag emoji from team name (handles regional indicators and subdivision flags like England)
function extractFlagEmoji(teamName) {
    if (!teamName) return '';
    const regionalMatch = teamName.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
    if (regionalMatch) return regionalMatch[0];
    const subdivisionMatch = teamName.match(/\u{1F3F4}[\u{E0020}-\u{E007F}]+/u);
    if (subdivisionMatch) return subdivisionMatch[0];
    return '';
}

function renderTournamentStats() {
    const container = document.getElementById("stats-container");
    if (!container || !tournamentStats || !tournamentStats.summary) return;

    const s = tournamentStats.summary;
    const d = tournamentStats.teams;

    let html = '<div class="stats-dashboard">';

    // ---- Golden Boot Podium (with ties) ----
    if (s.goldenBootTop3 && s.goldenBootTop3.length > 0) {
        html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x26bd; Golden Boot Leaders</div><div style="grid-column: 1 / -1; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">';
        s.goldenBootTop3.forEach((tier, idx) => {
            const isGold = idx === 0;
            tier.players.forEach(p => {
                const flag = extractFlagEmoji(p.team);
                html += `<div style="background: var(--card-bg); border: 2px solid ${tier.color}; border-radius: 10px; padding: 16px 24px; text-align: center; min-width: 150px; ${isGold ? 'transform: scale(1.08);' : ''}">
                    <div style="font-size: 1.8rem;">${tier.medal}</div>
                    <div style="font-size: 1.4rem; margin: 4px 0;">${flag}</div>
                    <div style="font-weight: bold; font-size: 1rem; color: var(--text-color);">${p.name}</div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: ${tier.color}; margin-top: 4px;">${tier.goals} goal${tier.goals !== 1 ? 's' : ''}</div>
                </div>`;
            });
        });
        html += '</div>';
    }

    // Tin Medal — highest GPG player who bageled
    if (s.tinMedal) {
        const flag = extractFlagEmoji(s.tinMedal.team);
        html += `<div style="grid-column: 1 / -1; display: flex; justify-content: center;">
            <div style="background: var(--card-bg); border: 2px solid #8a8a8a; border-radius: 10px; padding: 12px 24px; text-align: center; min-width: 200px; opacity: 0.75;">
                <div style="font-size: 1.4rem;">&#x1f947; ...wait, no. &#x1f4e6;</div>
                <div style="font-size: 1.3rem; margin: 2px 0;">${flag}</div>
                <div style="font-weight: bold; font-size: 1rem; color: var(--text-color);">${s.tinMedal.name}</div>
                <div style="font-size: 0.85rem; color: #8a8a8a; margin-top: 2px;">Tin Medal &mdash; ${s.tinMedal.gpg.toFixed(2)} GPG, 0 goals scored</div>
            </div>
        </div>`;
    }

    // ---- Anomaly Badges ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f3c6; Anomaly Badges</div>';

    if (s.cinderella) {
        html += `<div class="stats-card badge-cinderella">
            <h3><span class="stats-emoji">&#x1f984;</span> Cinderella Award</h3>
            <div class="stats-value">${renderTeam(s.cinderella)}</div>
            <div class="stats-detail">Elo ${d[s.cinderella].elo} &mdash; Reached ${d[s.cinderella].stage}</div>
        </div>`;
    }
    if (s.fraudWatch) {
        html += `<div class="stats-card badge-fraud">
            <h3><span class="stats-emoji">&#x1f6a8;</span> Fraud Watch</h3>
            <div class="stats-value">${renderTeam(s.fraudWatch)}</div>
            <div class="stats-detail">Elo ${d[s.fraudWatch].elo} &mdash; Eliminated in ${d[s.fraudWatch].stage}</div>
        </div>`;
    }
    if (s.chaosMagnet) {
        html += `<div class="stats-card badge-chaos">
            <h3><span class="stats-emoji">&#x26a1;</span> Chaos Magnet</h3>
            <div class="stats-value">${renderTeam(s.chaosMagnet)}</div>
            <div class="stats-detail">${d[s.chaosMagnet].etMinutes} minutes of extra time played</div>
        </div>`;
    }

    // ---- Team Performance Pillars ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f3c6; Team Performance Pillars</div>';

    if (s.goldenBoot) {
        html += `<div class="stats-card pillar-golden">
            <h3><span class="stats-emoji">&#x26bd;</span> Golden Boot</h3>
            <div class="stats-value">${renderTeam(s.goldenBoot)}</div>
            <div class="stats-detail">${d[s.goldenBoot].gf} goals scored in ${d[s.goldenBoot].mp} matches</div>
        </div>`;
    }
    if (s.ironCurtain) {
        html += `<div class="stats-card pillar-curtain">
            <h3><span class="stats-emoji">&#x1f6e1;&#xfe0f;</span> Iron Curtain</h3>
            <div class="stats-value">${renderTeam(s.ironCurtain)}</div>
            <div class="stats-detail">Only ${d[s.ironCurtain].ga} goals conceded in ${d[s.ironCurtain].mp} matches</div>
        </div>`;
    }
    if (s.sniper) {
        const gd = d[s.sniper].gf - d[s.sniper].ga;
        html += `<div class="stats-card pillar-sniper">
            <h3><span class="stats-emoji">&#x1f3af;</span> Sniper Award</h3>
            <div class="stats-value">${renderTeam(s.sniper)}</div>
            <div class="stats-detail">Best goal difference: ${gd > 0 ? '+' : ''}${gd}</div>
        </div>`;
    }

    // ---- Expected Goals (xG) Metrics ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f4ca; Expected Goals (xG) Metrics</div>';

    if (s.sniperOver) {
        html += `<div class="stats-card pillar-sniper">
            <h3><span class="stats-emoji">&#x1f3af;</span> Clinical Overperformance</h3>
            <div class="stats-value">${renderTeam(s.sniperOver)}</div>
            <div class="stats-detail">Scored ${d[s.sniperOver].gf} goals from ${d[s.sniperOver].xgCreated.toFixed(1)} xG (${s.sniperOverDiff > 0 ? '+' : ''}${s.sniperOverDiff.toFixed(1)})</div>
        </div>`;
    }
    if (s.woodenBoot) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1fab5;</span> Wooden Boot</h3>
            <div class="stats-value">${renderTeam(s.woodenBoot)}</div>
            <div class="stats-detail">Created ${d[s.woodenBoot].xgCreated.toFixed(1)} xG but scored only ${d[s.woodenBoot].gf} goals (${s.woodenBootDiff.toFixed(1)})</div>
        </div>`;
    }
    if (s.dominantAttack) {
        html += `<div class="stats-card badge-cinderella">
            <h3><span class="stats-emoji">&#x2694;&#xfe0f;</span> Most Dominant Attack</h3>
            <div class="stats-value">${renderTeam(s.dominantAttack)}</div>
            <div class="stats-detail">${s.dominantAttackAvg} xG per match</div>
        </div>`;
    }
    if (s.rigidDefense) {
        html += `<div class="stats-card pillar-curtain">
            <h3><span class="stats-emoji">&#x1f6e1;&#xfe0f;</span> Most Rigid Defense</h3>
            <div class="stats-value">${renderTeam(s.rigidDefense)}</div>
            <div class="stats-detail">Only ${s.rigidDefenseAvg} xG allowed per match</div>
        </div>`;
    }
    if (s.smashAndGrab) {
        html += `<div class="stats-card badge-chaos">
            <h3><span class="stats-emoji">&#x1f3b0;</span> Smash &amp; Grab</h3>
            <div class="stats-value">${renderTeam(s.smashAndGrab.winner)} ${s.smashAndGrab.score} ${renderTeam(s.smashAndGrab.loser)}</div>
            <div class="stats-detail">Won despite xG deficit of ${s.smashAndGrab.deficit.toFixed(1)} &mdash; ${s.smashAndGrab.round}</div>
        </div>`;
    }

    // ---- Geopolitical Hostility Index ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f1fa;&#x1f1f8; The Donald Trump Annoyance Factor</div>';

    if (s.adjustedRating !== undefined) {
        const delta = s.adjustedRating;
        const rawDelta = s.aggregateDelta;
        const usaDelta = s.usaAvgDelta;
        const sign = delta > 0 ? '+' : '';
        const usaSign = usaDelta > 0 ? '+' : '';
        const peakLabel = s.peakNation ? ` (peaked by ${renderTeam(s.peakNation)})` : '';
        let flavorText, labelClass;
        if (delta > 0.15) {
            flavorText = 'Tremendous spite. The hostile nations performed vastly better than the fake news analytics predicted. A very bad look for the security apparatus!';
            labelClass = 'badge-fraud';
        } else if (delta >= -0.15) {
            flavorText = 'Totally standard results. They came to our beautiful, great stadiums, they played, they didn\'t do much. Frankly, nobody is talking about them.';
            labelClass = 'badge-chaos';
        } else {
            flavorText = 'Complete and total shutdown. The hostile nations collapsed under the sheer pressure of American exceptionalism. They are losing badly, folks. Sad!';
            labelClass = 'pillar-sniper';
        }

        html += `<div class="stats-card ${labelClass}" style="grid-column: 1 / -1;">
            <h3><span class="stats-emoji">&#x1f4a2;</span> Global Spite Rating: ${sign}${delta.toFixed(2)}</h3>
            <div class="stats-detail" style="margin-top: 4px;">Peak hostile/rival delta: ${rawDelta > 0 ? '+' : ''}${rawDelta.toFixed(2)}${peakLabel} &middot; Team USA: ${usaSign}${usaDelta.toFixed(2)}</div>
            <div class="stats-detail" style="font-style: italic;">&ldquo;${flavorText}&rdquo;</div>
        </div>`;

        if (s.personaNonGrata) {
            const p = s.personaNonGrata;
            const pSign = p.avgDelta > 0 ? '+' : '';
            html += `<div class="stats-card badge-cinderella" style="grid-column: 1 / -1;">
                <h3><span class="stats-emoji">&#x1f6ab;</span> Persona Non Grata Trophy</h3>
                <div class="stats-value">${renderTeam(p.nation)}</div>
                <div class="stats-detail">Highest individual spite rating: ${pSign}${p.avgDelta.toFixed(2)} &mdash; officially the most geopolitically disruptive team of the summer.</div>
            </div>`;
        }

        if (s.notableUSMatch) {
            const m = s.notableUSMatch;
            const resultLabel = m.usaLost ? '&#x1f534; Shock Defeat' : '&#x1f4aa; Statement Win';
            const hostClass = m.usaLost ? 'badge-fraud' : 'pillar-sniper';
            html += `<div class="stats-card ${hostClass}" style="grid-column: 1 / -1;">
                <h3>${resultLabel}</h3>
                <div class="stats-value">${renderTeam("🇺🇸 United States")} ${m.usaScore} &minus; ${m.oppScore} ${renderTeam(m.opponent)}</div>
                <div class="stats-detail">${m.round} &mdash; ${m.usaLost ? 'Lost by' : 'Won by'} ${m.margin} goal${m.margin > 1 ? 's' : ''}</div>
            </div>`;
        }
    }

    // ---- Match Superlatives ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f3c6; Match Superlatives</div>';

    if (s.highestScoring) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1f525;</span> Highest Scoring Match</h3>
            <div class="stats-value">${renderTeam(s.highestScoring.t1)} ${s.highestScoring.g1} &minus; ${s.highestScoring.g2} ${renderTeam(s.highestScoring.t2)}</div>
            <div class="stats-detail">${s.highestScoring.total} total goals &mdash; ${s.highestScoring.round}</div>
        </div>`;
    }
    if (s.biggestBlowout) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1f4a5;</span> Biggest Blowout</h3>
            <div class="stats-value">${renderTeam(s.biggestBlowout.t1)} ${s.biggestBlowout.g1} &minus; ${s.biggestBlowout.g2} ${renderTeam(s.biggestBlowout.t2)}</div>
            <div class="stats-detail">Won by ${s.biggestBlowout.margin} goals &mdash; ${s.biggestBlowout.round}</div>
        </div>`;
    }
    if (s.marathonMatch) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1f3c3;</span> Marathon Match</h3>
            <div class="stats-value">${renderTeam(s.marathonMatch.t1)} ${s.marathonMatch.g1} &minus; ${s.marathonMatch.g2} ${renderTeam(s.marathonMatch.t2)}</div>
            <div class="stats-detail">Went to penalties &mdash; ${s.marathonMatch.round}</div>
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function pushToNextRound(currentRound, matchId, selectedTeam, koState, skipRender) {
    const ks = koState || knockoutState;
    const prevWinner = ks[currentRound][matchId].winner;
    ks[currentRound][matchId].winner = selectedTeam;

    if (prevWinner && prevWinner !== selectedTeam) resetDownstream(prevWinner, ks);

    if (currentRound === "r32") {
        const r16Map = {
            0: { nextId: 0, slot: 't1' }, 2: { nextId: 0, slot: 't2' },
            1: { nextId: 1, slot: 't1' }, 4: { nextId: 1, slot: 't2' },
            3: { nextId: 2, slot: 't1' }, 5: { nextId: 2, slot: 't2' },
            6: { nextId: 3, slot: 't1' }, 7: { nextId: 3, slot: 't2' },
            10: { nextId: 4, slot: 't1' }, 11: { nextId: 4, slot: 't2' },
            8: { nextId: 5, slot: 't1' }, 9: { nextId: 5, slot: 't2' },
            13: { nextId: 6, slot: 't1' }, 15: { nextId: 6, slot: 't2' },
            12: { nextId: 7, slot: 't1' }, 14: { nextId: 7, slot: 't2' }
        };
        let target = r16Map[matchId];
        if (target) ks.r16[target.nextId][target.slot] = selectedTeam;

    } else if (currentRound === "r16") {
        let nextMatchId = Math.floor(matchId / 2);
        if (matchId % 2 === 0) ks.qf[nextMatchId].t1 = selectedTeam;
        else ks.qf[nextMatchId].t2 = selectedTeam;

    } else if (currentRound === "qf") {
        let nextMatchId = Math.floor(matchId / 2);
        if (matchId % 2 === 0) ks.sf[nextMatchId].t1 = selectedTeam;
        else ks.sf[nextMatchId].t2 = selectedTeam;

    } else if (currentRound === "sf") {
        if (matchId === 0) ks.f[0].t1 = selectedTeam;
        else ks.f[0].t2 = selectedTeam;

    } else if (currentRound === "f") {
        ks.champion = selectedTeam;
    }
    if (!skipRender) renderBracket();
}

function resetDownstream(teamName, koState) {
    const ks = koState || knockoutState;
    const rounds = ["r16", "qf", "sf", "f"];
    rounds.forEach(r => {
        ks[r].forEach(m => {
            if (m.t1 === teamName) { m.t1 = null; m.winner = null; m.s1 = ""; m.aet = false; m.aet_s1 = 0; m.aet_s2 = 0; m.penalties = false; m.pen_s1 = 0; m.pen_s2 = 0; }
            if (m.t2 === teamName) { m.t2 = null; m.winner = null; m.s2 = ""; m.aet = false; m.aet_s1 = 0; m.aet_s2 = 0; m.penalties = false; m.pen_s1 = 0; m.pen_s2 = 0; }
        });
    });
    if (ks.champion === teamName) ks.champion = null;
}

function resetAll() {
    knockoutState = { r32: [], r16: [], qf: [], sf: [], f: [], champion: null };
    savedGroupTables = null;
    savedBestThirdPlaces = null;
    tournamentStats = null;
    // Hide multi-sim container and show single-tournament sections
    const multiSimContainer = document.getElementById("multi-sim-container");
    if (multiSimContainer) multiSimContainer.style.display = "none";
    const multiSimProgress = document.getElementById("multi-sim-progress");
    if (multiSimProgress) multiSimProgress.style.display = "none";
    // Re-enable single-tournament sections if hidden by multi-sim
    const groupStageSection = document.querySelector('.stage-section');
    if (groupStageSection) groupStageSection.style.display = '';
    const koSection = document.getElementById("knockout-section");
    if (koSection) { koSection.style.display = ''; koSection.classList.add("id-disabled"); }
    const tablesContainer = document.getElementById("group-tables-container");
    if (tablesContainer) { tablesContainer.style.display = ''; tablesContainer.classList.add("id-disabled"); tablesContainer.innerHTML = ""; }
    const statsContainer = document.getElementById("stats-container");
    if (statsContainer) { statsContainer.style.display = ''; statsContainer.classList.add("id-disabled"); statsContainer.innerHTML = ""; }
    // Restore hr elements
    document.querySelectorAll('hr').forEach(el => el.style.display = '');
    renderGroupStage();
    renderBracket();
}

// =====================================================================
// Headless Simulation Functions (for Multi-Tournament Mode)
// =====================================================================

// Compute group stage results from a fixture map (no DOM reads)
function computeGroupStageResults(fixtureMap) {
    let tableData = {};
    let thirdPlaceTeams = [];

    Object.keys(groupsData).forEach(g => {
        groupsData[g].forEach(team => {
            tableData[team] = { name: team, group: g, points: 0, gd: 0, gf: 0 };
        });
    });

    Object.keys(fixtureMap).forEach(g => {
        fixtureMap[g].forEach(f => {
            const t1 = f.t1, t2 = f.t2, g1 = f.g1, g2 = f.g2;
            tableData[t1].gf += g1; tableData[t2].gf += g2;
            tableData[t1].gd += (g1 - g2); tableData[t2].gd += (g2 - g1);
            if (g1 > g2) { tableData[t1].points += 3; }
            else if (g2 > g1) { tableData[t2].points += 3; }
            else { tableData[t1].points += 1; tableData[t2].points += 1; }
        });
    });

    let groupResults = {};
    Object.keys(groupsData).forEach(g => {
        let groupTeams = groupsData[g].map(t => tableData[t]);
        groupTeams.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

        groupResults[g] = {
            1: groupTeams[0].name,
            2: groupTeams[1].name,
            3: groupTeams[2].name,
            4: groupTeams[3].name
        };
        thirdPlaceTeams.push({ team: groupTeams[2].name, group: g, points: groupTeams[2].points, gd: groupTeams[2].gd });
    });

    thirdPlaceTeams.sort((a, b) => b.points - a.points || b.gd - a.gd);
    let best8ThirdPlaces = thirdPlaceTeams.slice(0, 8);
    return { groupResults, best8ThirdPlaces };
}

// Build a fresh knockout bracket from group results (no global knockoutState dependency)
function buildKnockoutBracket(groupResults, best8ThirdPlaces) {
    let get3rd = (idx) => best8ThirdPlaces[idx] ? best8ThirdPlaces[idx].team : `3rd Place Pool #${idx + 1}`;

    const officialR32Layout = [
        { id: 0, matchNo: 73, t1: groupResults['A'][2], t2: groupResults['B'][2] },
        { id: 1, matchNo: 74, t1: groupResults['E'][1], t2: get3rd(0) },
        { id: 2, matchNo: 75, t1: groupResults['F'][1], t2: groupResults['C'][2] },
        { id: 3, matchNo: 76, t1: groupResults['C'][1], t2: groupResults['F'][2] },
        { id: 4, matchNo: 77, t1: groupResults['I'][1], t2: get3rd(1) },
        { id: 5, matchNo: 78, t1: groupResults['E'][2], t2: groupResults['I'][2] },
        { id: 6, matchNo: 79, t1: groupResults['A'][1], t2: get3rd(2) },
        { id: 7, matchNo: 80, t1: groupResults['L'][1], t2: get3rd(3) },
        { id: 8, matchNo: 81, t1: groupResults['D'][1], t2: get3rd(4) },
        { id: 9, matchNo: 82, t1: groupResults['G'][1], t2: get3rd(5) },
        { id: 10, matchNo: 83, t1: groupResults['K'][2], t2: groupResults['L'][2] },
        { id: 11, matchNo: 84, t1: groupResults['H'][1], t2: groupResults['J'][2] },
        { id: 12, matchNo: 85, t1: groupResults['B'][1], t2: get3rd(6) },
        { id: 13, matchNo: 86, t1: groupResults['J'][1], t2: groupResults['H'][2] },
        { id: 14, matchNo: 87, t1: groupResults['K'][1], t2: get3rd(7) },
        { id: 15, matchNo: 88, t1: groupResults['D'][2], t2: groupResults['G'][2] }
    ];

    const blankMatch = () => ({ t1: null, t2: null, winner: null, s1: "", s2: "", aet: false, aet_s1: 0, aet_s2: 0, penalties: false, pen_s1: 0, pen_s2: 0, scorers1: [], scorers2: [] });

    let koState = {
        r32: [],
        r16: Array(8).fill(null).map((_, i) => ({ id: i, ...blankMatch() })),
        qf: Array(4).fill(null).map((_, i) => ({ id: i, ...blankMatch() })),
        sf: Array(2).fill(null).map((_, i) => ({ id: i, ...blankMatch() })),
        f: [{ id: 0, ...blankMatch() }],
        champion: null
    };

    officialR32Layout.forEach(m => {
        koState.r32.push({
            id: m.id, matchNo: m.matchNo, t1: m.t1, t2: m.t2,
            winner: null, s1: "", s2: "",
            aet: false, aet_s1: 0, aet_s2: 0,
            penalties: false, pen_s1: 0, pen_s2: 0,
            scorers1: [], scorers2: []
        });
    });

    return koState;
}

// Run all knockout rounds on a local koState, collecting match data into stats
function simulateKnockoutStage(koState, stats) {
    const rounds = ["r32", "r16", "qf", "sf", "f"];
    rounds.forEach(roundKey => {
        if (koState[roundKey]) {
            koState[roundKey].forEach(match => {
                if (match.t1 && match.t2) {
                    const result = simulateKnockoutMatchFull(match.t1, match.t2, roundKey);
                    match.s1 = result.s1;
                    match.s2 = result.s2;
                    match.aet = result.aet;
                    match.aet_s1 = result.aet_s1;
                    match.aet_s2 = result.aet_s2;
                    match.penalties = result.penalties;
                    match.pen_s1 = result.pen_s1;
                    match.pen_s2 = result.pen_s2;
                    match.scorers1 = result.scorers1;
                    match.scorers2 = result.scorers2;
                    pushToNextRound(roundKey, match.id, result.winner, koState, true);
                    collectKOMatchData(roundKey, match, result, stats);
                }
            });
        }
    });
}

// Run a single headless tournament simulation, returning results
function runSingleHeadlessSimulation() {
    const stats = initTournamentStats({});
    const fixtureMap = {};

    // Build fixture map for all 12 groups
    Object.keys(groupsData).forEach(groupName => {
        const teams = groupsData[groupName];
        const fixtures = [
            [teams[0], teams[1]], [teams[2], teams[3]],
            [teams[0], teams[2]], [teams[1], teams[3]],
            [teams[0], teams[3]], [teams[1], teams[2]]
        ];
        fixtureMap[groupName] = [];

        fixtures.forEach(([t1, t2]) => {
            const { g1, g2, team1_xG, team2_xG, eloProb, scorers1, scorers2 } = simulateEloMatch(t1, t2);
            fixtureMap[groupName].push({ t1, t2, g1, g2 });
            collectGroupMatchData(t1, t2, g1, g2, team1_xG, team2_xG, eloProb, scorers1, scorers2, stats);
        });
    });

    const { groupResults, best8ThirdPlaces } = computeGroupStageResults(fixtureMap);
    const koState = buildKnockoutBracket(groupResults, best8ThirdPlaces);
    simulateKnockoutStage(koState, stats);

    const stageMap = computeStageAssignments(koState);

    // Assign stages to teams in stats
    Object.keys(stats.teams).forEach(team => {
        stats.teams[team].stage = stageMap[team] || "Group Stage";
    });

    return { stats, stageMap, champion: koState.champion };
}

// =====================================================================
// Multi-Tournament Simulation Orchestrator
// =====================================================================

function runMultiSimulation(numSims) {
    // Hide single-tournament UI
    const groupStageSection = document.querySelector('.stage-section');
    if (groupStageSection) groupStageSection.style.display = 'none';
    const tablesContainer = document.getElementById("group-tables-container");
    if (tablesContainer) { tablesContainer.style.display = 'none'; tablesContainer.innerHTML = ""; }
    const koSection = document.getElementById("knockout-section");
    if (koSection) koSection.style.display = 'none';
    const statsContainer = document.getElementById("stats-container");
    if (statsContainer) { statsContainer.style.display = 'none'; statsContainer.innerHTML = ""; }
    // Hide hr elements between sections
    document.querySelectorAll('hr').forEach(el => el.style.display = 'none');

    // Show progress
    const progressEl = document.getElementById("multi-sim-progress");
    if (progressEl) {
        progressEl.style.display = "block";
        progressEl.innerText = "0 / " + numSims + " tournaments";
    }

    // Aggregators
    const teamCounters = {};
    const goldenBootWins = {};

    // Initialize all teams
    Object.values(groupsData).forEach(group => {
        group.forEach(team => {
            teamCounters[team] = { winCount: 0, finalCount: 0, semiCount: 0, qfCount: 0 };
        });
    });

    let completed = 0;
    const BATCH_SIZE = 50;

    function processBatch() {
        const batchEnd = Math.min(completed + BATCH_SIZE, numSims);
        for (let i = completed; i < batchEnd; i++) {
            const result = runSingleHeadlessSimulation();
            const s = result.stats;
            const stageMap = result.stageMap;

            // Aggregate team advancement data
            Object.keys(teamCounters).forEach(team => {
                const stage = stageMap[team] || "Group Stage";
                if (stage === "Champion") teamCounters[team].winCount++;
                if (stage === "Champion" || stage === "Final") teamCounters[team].finalCount++;
                if (stage === "Champion" || stage === "Final" || stage === "Semi-Finals") teamCounters[team].semiCount++;
                if (stage === "Champion" || stage === "Final" || stage === "Semi-Finals" || stage === "Quarter-Finals") teamCounters[team].qfCount++;
            });

            // Compute per-simulation top scorers (Golden Boot winner)
            const simGoalTally = {};
            const simPlayerTeam = {};
            s.matches.forEach(m => {
                if (m.scorers1) {
                    m.scorers1.forEach(name => {
                        if (name !== "Own Goal" && name !== "Squad Player") {
                            simGoalTally[name] = (simGoalTally[name] || 0) + 1;
                            simPlayerTeam[name] = m.t1;
                        }
                    });
                }
                if (m.scorers2) {
                    m.scorers2.forEach(name => {
                        if (name !== "Own Goal" && name !== "Squad Player") {
                            simGoalTally[name] = (simGoalTally[name] || 0) + 1;
                            simPlayerTeam[name] = m.t2;
                        }
                    });
                }
            });
            // Find max goals and award wins to all tied top scorers
            let maxGoals = 0;
            Object.values(simGoalTally).forEach(g => { if (g > maxGoals) maxGoals = g; });
            if (maxGoals > 0) {
                Object.entries(simGoalTally).forEach(([name, goals]) => {
                    if (goals === maxGoals) {
                        const team = simPlayerTeam[name];
                        const key = name + "|" + team;
                        if (!goldenBootWins[key]) goldenBootWins[key] = { player: name, team, wins: 0 };
                        goldenBootWins[key].wins++;
                    }
                });
            }
        }

        completed = batchEnd;

        // Update progress
        if (progressEl) {
            progressEl.innerText = completed + " / " + numSims + " tournaments";
        }

        if (completed < numSims) {
            setTimeout(processBatch, 0);
        } else {
            displayMultiSimResults(teamCounters, goldenBootWins, numSims);
        }
    }

    // Start processing in batches
    setTimeout(processBatch, 50);
}

function displayMultiSimResults(teamResults, goldenBootWins, numSims) {
    const container = document.getElementById("multi-sim-container");
    if (!container) return;
    container.style.display = "block";

    // Build team table HTML
    const teamEntries = Object.entries(teamResults).map(([team, counters]) => ({
        team,
        rank: teamFifaRankings[team] || 999,
        group: Object.keys(groupsData).find(g => groupsData[g].includes(team)) || "?",
        winPct: (counters.winCount / numSims) * 100,
        finalPct: (counters.finalCount / numSims) * 100,
        semiPct: (counters.semiCount / numSims) * 100,
        qfPct: (counters.qfCount / numSims) * 100
    }));

    // Sort by win% descending, then final%, then semi%, then qf%
    teamEntries.sort((a, b) => b.winPct - a.winPct || b.finalPct - a.finalPct || b.semiPct - a.semiPct || b.qfPct - a.qfPct);

    let teamHtml = '<div class="multi-sim-table"><h3>Advancement Probabilities (based on ' + numSims + ' simulations)</h3>';
    teamHtml += '<table><tr><th>#</th><th>Team</th><th>FIFA Rank</th><th>Group</th><th>Win %</th><th>Final %</th><th>Semi %</th><th>QF %</th></tr>';

    teamEntries.forEach((entry, idx) => {
        const winPctClass = entry.winPct >= 5 ? 'pct-high' : entry.winPct >= 1 ? 'pct-mid' : '';
        const finalPctClass = entry.finalPct >= 15 ? 'pct-high' : entry.finalPct >= 5 ? 'pct-mid' : '';
        const semiPctClass = entry.semiPct >= 25 ? 'pct-high' : entry.semiPct >= 10 ? 'pct-mid' : '';
        const qfPctClass = entry.qfPct >= 40 ? 'pct-high' : entry.qfPct >= 20 ? 'pct-mid' : '';
        teamHtml += '<tr>' +
            '<td class="rank-col">' + (idx + 1) + '</td>' +
            '<td>' + renderTeam(entry.team) + '</td>' +
            '<td>' + entry.rank + '</td>' +
            '<td>' + entry.group + '</td>' +
            '<td class="' + winPctClass + '">' + entry.winPct.toFixed(1) + '%</td>' +
            '<td class="' + finalPctClass + '">' + entry.finalPct.toFixed(1) + '%</td>' +
            '<td class="' + semiPctClass + '">' + entry.semiPct.toFixed(1) + '%</td>' +
            '<td class="' + qfPctClass + '">' + entry.qfPct.toFixed(1) + '%</td>' +
            '</tr>';
    });
    teamHtml += '</table></div>';
    document.getElementById("multi-sim-team-table").innerHTML = teamHtml;

    // Build Golden Boot top 10 (by number of times won)
    const gbEntries = Object.values(goldenBootWins)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);

    let gbHtml = '<div class="multi-sim-table"><h3>Golden Boot Top 10 (Across All Simulations)</h3>';
    gbHtml += '<table><tr><th>#</th><th>Player</th><th>Nation</th><th>Times Won</th><th>Win Rate</th></tr>';

    gbEntries.forEach((entry, idx) => {
        const winRate = (entry.wins / numSims) * 100;
        const goalClass = idx < 3 ? 'gold-high' : '';
        gbHtml += '<tr>' +
            '<td class="rank-col">' + (idx + 1) + '</td>' +
            '<td>' + entry.player + '</td>' +
            '<td>' + renderTeam(entry.team) + '</td>' +
            '<td class="' + goalClass + '">' + entry.wins + '</td>' +
            '<td>' + winRate.toFixed(1) + '%</td>' +
            '</tr>';
    });
    gbHtml += '</table></div>';
    document.getElementById("multi-sim-golden-boot-table").innerHTML = gbHtml;

    // Scroll to results
    container.scrollIntoView({ behavior: 'smooth' });
}
