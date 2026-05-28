// Official FIFA World Cup 2026 Groups
const groupsData = {
    A: ["🇲🇽 Mexico", "🇿🇦 South Africa", "🇰🇷 South Korea", "🇨🇿 Czechia"],
    B: ["🇨🇦 Canada", "🇧🇦 Bosnia and Herzegovina", "🇶🇦 Qatar", "🇨🇭 Switzerland"],
    C: ["🇧🇷 Brazil", "🇲🇦 Morocco", "🇭🇹 Haiti", "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland"],
    D: ["🇺🇸 United States", "🇵🇾 Paraguay", "🇦🇺 Australia", "🇹🇷 Turkey"],
    E: ["🇩🇪 Germany", "🇨🇼 Curaçao", "🇨🇮 Ivory Coast", "🇪🇨 Ecuador"],
    F: ["🇳🇱 Netherlands", "🇯🇵 Japan", "🇸🇪 Sweden", "🇹🇳 Tunisia"],
    G: ["🇧🇪 Belgium", "🇪🇬 Egypt", "🇮🇷 Iran", "🇳🇿 New Zealand"],
    H: ["🇪🇸 Spain", "🇨🇻 Cape Verde", "🇸🇦 Saudi Arabia", "🇺🇾 Uruguay"],
    I: ["🇫🇷 France", "🇸🇳 Senegal", "🇮🇶 Iraq", "🇳🇴 Norway"],
    J: ["🇦🇷 Argentina", "🇩🇿 Algeria", "🇦🇹 Austria", "🇯🇴 Jordan"],
    K: ["🇵🇹 Portugal", "🇨🇴 Colombia", "🇺🇿 Uzbekistan", "🇨🇩 DR Congo"],
    L: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 England", "🇭🇷 Croatia", "🇬🇭 Ghana", "🇵🇦 Panama"]
};

// Elo ratings derived from World.tsv (column 4)
const teamEloRatings = {
    "🇲🇽 Mexico": 1860,
    "🇿🇦 South Africa": 1524,
    "🇰🇷 South Korea": 1752,
    "🇨🇿 Czechia": 1726,
    "🇨🇦 Canada": 1784,
    "🇧🇦 Bosnia and Herzegovina": 1594,
    "🇶🇦 Qatar": 1425,
    "🇨🇭 Switzerland": 1889,
    "🇧🇷 Brazil": 1984,
    "🇲🇦 Morocco": 1822,
    "🇭🇹 Haiti": 1532,
    "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland": 1767,
    "🇺🇸 United States": 1721,
    "🇵🇾 Paraguay": 1833,
    "🇦🇺 Australia": 1783,
    "🇹🇷 Turkey": 1902,
    "🇩🇪 Germany": 1923,
    "🇨🇼 Curaçao": 1436,
    "🇨🇮 Ivory Coast": 1676,
    "🇪🇨 Ecuador": 1933,
    "🇳🇱 Netherlands": 1961,
    "🇯🇵 Japan": 1904,
    "🇸🇪 Sweden": 1719,
    "🇹🇳 Tunisia": 1636,
    "🇧🇪 Belgium": 1867,
    "🇪🇬 Egypt": 1689,
    "🇮🇷 Iran": 1760,
    "🇳🇿 New Zealand": 1585,
    "🇪🇸 Spain": 2165,
    "🇨🇻 Cape Verde": 1549,
    "🇸🇦 Saudi Arabia": 1568,
    "🇺🇾 Uruguay": 1892,
    "🇫🇷 France": 2081,
    "🇸🇳 Senegal": 1878,
    "🇮🇶 Iraq": 1607,
    "🇳🇴 Norway": 1912,
    "🇦🇷 Argentina": 2113,
    "🇩🇿 Algeria": 1743,
    "🇦🇹 Austria": 1827,
    "🇯🇴 Jordan": 1690,
    "🇵🇹 Portugal": 1984,
    "🇨🇴 Colombia": 1975,
    "🇺🇿 Uzbekistan": 1727,
    "🇨🇩 DR Congo": 1655,
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England": 2020,
    "🇭🇷 Croatia": 1930,
    "🇬🇭 Ghana": 1503,
    "🇵🇦 Panama": 1737
};

// Home advantage: +175 Elo points for host nations (USA, Mexico, Canada)
const HOME_ADVANTAGE = 175;
const HOST_NATIONS = ["🇺🇸 United States", "🇲🇽 Mexico", "🇨🇦 Canada"];

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

// Hostile/rival nations for Geopolitical Hostility Index
const HOSTILE_NATIONS = ["🇮🇷 Iran", "🇭🇹 Haiti", "🇮🇶 Iraq"];
const RIVAL_NATIONS = ["🇲🇽 Mexico", "🇨🇦 Canada"];

// ===== Golden Boot Player Data (from golden boot.tsv) =====
// Maps TSV country names to JS team names (with flag emojis)
const countryToTeamName = {
    "France": "🇫🇷 France",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England",
    "Argentina": "🇦🇷 Argentina",
    "Norway": "🇳🇴 Norway",
    "Spain": "🇪🇸 Spain",
    "Portugal": "🇵🇹 Portugal",
    "Brazil": "🇧🇷 Brazil",
    "Belgium": "🇧🇪 Belgium",
    "Germany": "🇩🇪 Germany",
    "Netherlands": "🇳🇱 Netherlands",
    "Colombia": "🇨🇴 Colombia",
    "Egypt": "🇪🇬 Egypt",
    "Sweden": "🇸🇪 Sweden",
    "Ecuador": "🇪🇨 Ecuador",
    "Mexico": "🇲🇽 Mexico",
    "Uruguay": "🇺🇾 Uruguay",
    "USA": "🇺🇸 United States",
    "Senegal": "🇸🇳 Senegal",
    "Croatia": "🇭🇷 Croatia",
    "Austria": "🇦🇹 Austria",
    "Turkey": "🇹🇷 Turkey",
    "Ghana": "🇬🇭 Ghana",
    "Canada": "🇨🇦 Canada",
    "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland",
    "Switzerland": "🇨🇭 Switzerland",
    "Morocco": "🇲🇦 Morocco",
    "South Korea": "🇰🇷 South Korea",
    "Japan": "🇯🇵 Japan",
    "Algeria": "🇩🇿 Algeria",
    "Ivory Coast": "🇨🇮 Ivory Coast",
    "DR Congo": "🇨🇩 DR Congo",
    "New Zealand": "🇳🇿 New Zealand",
    "South Africa": "🇿🇦 South Africa",
    "Paraguay": "🇵🇾 Paraguay",
    "Bosnia": "🇧🇦 Bosnia and Herzegovina",
    "Saudi Arabia": "🇸🇦 Saudi Arabia",
    "Cape Verde": "🇨🇻 Cape Verde",
    "Czechia": "🇨🇿 Czechia",
    "Tunisia": "🇹🇳 Tunisia"
};

// Raw golden boot data: [player, country, gbImplied%, winGroup%, reachFinal%, toWin%]
const goldenBootRaw = [
    ["Kylian Mbappe", "France", 14.30, 69.70, 25.00, 16.70],
    ["Harry Kane", "England", 12.50, 76.20, 25.00, 13.30],
    ["Lionel Messi", "Argentina", 7.70, 77.30, 19.00, 10.00],
    ["Erling Haaland", "Norway", 6.70, 26.70, 7.70, 3.20],
    ["Lamine Yamal", "Spain", 5.30, 81.80, 31.30, 17.40],
    ["Mikel Oyarzabal", "Spain", 5.30, 81.80, 31.30, 17.40],
    ["Cristiano Ronaldo", "Portugal", 4.80, 69.70, 16.70, 9.10],
    ["Vinicius Junior", "Brazil", 4.30, 78.70, 20.00, 11.10],
    ["Lautaro Martinez", "Argentina", 3.80, 77.30, 19.00, 10.00],
    ["Ousmane Dembele", "France", 3.40, 69.70, 25.00, 16.70],
    ["Romelu Lukaku", "Belgium", 3.20, 69.70, 7.70, 2.80],
    ["Raphinha", "Brazil", 3.20, 78.70, 20.00, 11.10],
    ["Nick Woltemade", "Germany", 2.80, 75.60, 15.40, 6.70],
    ["Julian Alvarez", "Argentina", 2.80, 77.30, 19.00, 10.00],
    ["Alvaro Morata", "Spain", 2.80, 81.80, 31.30, 17.40],
    ["Richarlison", "Brazil", 2.80, 78.70, 20.00, 11.10],
    ["Joao Pedro", "Brazil", 2.80, 78.70, 20.00, 11.10],
    ["Cody Gakpo", "Netherlands", 2.40, 56.50, 10.00, 4.80],
    ["Bukayo Saka", "England", 2.40, 76.20, 25.00, 13.30],
    ["Memphis Depay", "Netherlands", 2.40, 56.50, 10.00, 4.80],
    ["Ferran Torres", "Spain", 2.40, 81.80, 31.30, 17.40],
    ["Mikel Merino", "Spain", 2.40, 81.80, 31.30, 17.40],
    ["Igor Thiago", "Belgium", 2.40, 69.70, 7.70, 2.80],
    ["Jean-Philippe Mateta", "France", 2.00, 69.70, 25.00, 16.70],
    ["Jude Bellingham", "England", 2.00, 76.20, 25.00, 13.30],
    ["Goncalo Ramos", "Portugal", 2.00, 69.70, 16.70, 9.10],
    ["Florian Wirtz", "Germany", 2.00, 75.60, 15.40, 6.70],
    ["Marcus Thuram", "France", 2.00, 69.70, 25.00, 16.70],
    ["Neymar", "Brazil", 2.00, 78.70, 20.00, 11.10],
    ["Bruno Fernandes", "Portugal", 2.00, 69.70, 16.70, 9.10],
    ["Luis Diaz", "Colombia", 2.00, 29.40, 5.30, 2.40],
    ["Desire Doue", "France", 2.00, 69.70, 25.00, 16.70],
    ["Mohamed Salah", "Egypt", 2.00, 20.00, 1.20, 0.30],
    ["Kai Havertz", "Germany", 2.00, 75.60, 15.40, 6.70],
    ["Dani Olmo", "Spain", 2.00, 81.80, 31.30, 17.40],
    ["Deniz Undav", "Germany", 2.00, 75.60, 15.40, 6.70],
    ["Viktor Gyokeres", "Sweden", 2.00, 18.20, 2.00, 1.00],
    ["Enner Valencia", "Ecuador", 1.50, 22.20, 2.80, 1.20],
    ["Donyell Malen", "Netherlands", 1.50, 56.50, 10.00, 4.80],
    ["Morgan Rogers", "England", 1.50, 76.20, 25.00, 13.30],
    ["Santiago Gimenez", "Mexico", 1.50, 52.40, 3.80, 1.20],
    ["Darwin Nunez", "Uruguay", 1.50, 21.30, 4.80, 2.00],
    ["Eberechi Eze", "England", 1.50, 76.20, 25.00, 13.30],
    ["Lois Openda", "Belgium", 1.50, 69.70, 7.70, 2.80],
    ["Jamal Musiala", "Germany", 1.50, 75.60, 15.40, 6.70],
    ["Leandro Trossard", "Belgium", 1.50, 69.70, 7.70, 2.80],
    ["Marcus Rashford", "England", 1.50, 76.20, 25.00, 13.30],
    ["Matheus Cunha", "Brazil", 1.50, 78.70, 20.00, 11.10],
    ["Alexander Sorloth", "Norway", 1.50, 26.70, 7.70, 3.20],
    ["Alexander Isak", "Sweden", 1.50, 18.20, 2.00, 1.00],
    ["Folarin Balogun", "USA", 1.20, 44.40, 5.30, 1.60],
    ["Kevin De Bruyne", "Belgium", 1.20, 69.70, 7.70, 2.80],
    ["Christian Pulisic", "USA", 1.20, 44.40, 5.30, 1.60],
    ["Anthony Gordon", "England", 1.20, 76.20, 25.00, 13.30],
    ["Rafael Leao", "Portugal", 1.20, 69.70, 16.70, 9.10],
    ["Jeremy Doku", "Belgium", 1.20, 69.70, 7.70, 2.80],
    ["Sadio Mane", "Senegal", 1.20, 11.80, 2.40, 1.10],
    ["Leroy Sane", "Germany", 1.20, 75.60, 15.40, 6.70],
    ["Jhon Duran", "Colombia", 1.20, 29.40, 5.30, 2.40],
    ["Raul Jimenez", "Mexico", 1.20, 52.40, 3.80, 1.20],
    ["Ante Budimir", "Croatia", 1.20, 22.20, 3.40, 1.20],
    ["Brian Brobbey", "Netherlands", 1.20, 56.50, 10.00, 4.80],
    ["Christoph Baumgartner", "Austria", 1.20, 18.20, 2.40, 0.70],
    ["Ollie Watkins", "England", 1.20, 76.20, 25.00, 13.30],
    ["Omar Marmoush", "Egypt", 1.00, 20.00, 1.20, 0.30],
    ["Arda Guler", "Turkey", 1.00, 33.30, 3.80, 1.00],
    ["Mohammed Kudus", "Ghana", 1.00, 9.10, 1.20, 0.30],
    ["Nicolas Jackson", "Senegal", 1.00, 11.80, 2.40, 1.10],
    ["Jonathan David", "Canada", 1.00, 33.30, 2.40, 0.50],
    ["Kenan Yildiz", "Turkey", 1.00, 33.30, 3.80, 1.00],
    ["Pedro Neto", "Portugal", 1.00, 69.70, 16.70, 9.10],
    ["Haji Wright", "USA", 1.00, 44.40, 5.30, 1.60],
    ["Nico Williams", "Spain", 1.00, 81.80, 31.30, 17.40],
    ["Ricardo Pepi", "USA", 1.00, 44.40, 5.30, 1.60],
    ["Scott McTominay", "Scotland", 1.00, 9.10, 1.20, 0.50],
    ["Bradley Barcola", "France", 1.00, 69.70, 25.00, 16.70],
    ["Casemiro", "Brazil", 1.00, 78.70, 20.00, 11.10],
    ["Charles De Ketelaere", "Belgium", 1.00, 69.70, 7.70, 2.80],
    ["Gabriel Martinelli", "Brazil", 1.00, 78.70, 20.00, 11.10],
    ["Rayan Cherki", "France", 1.00, 69.70, 25.00, 16.70],
    ["Breel Embolo", "Switzerland", 0.80, 55.60, 5.30, 1.50],
    ["Ismaila Sarr", "Senegal", 0.70, 11.80, 2.40, 1.10],
    ["Hamza Igamane", "Morocco", 0.70, 21.30, 4.30, 2.00],
    ["Noa Lang", "Netherlands", 0.70, 56.50, 10.00, 4.80],
    ["Hirving Lozano", "Mexico", 0.70, 52.40, 3.80, 1.20],
    ["Lee Kang-In", "South Korea", 0.70, 25.00, 1.50, 0.20],
    ["Enzo Fernandez", "Argentina", 0.70, 77.30, 19.00, 10.00],
    ["Jorgen Strand Larsen", "Norway", 0.70, 26.70, 7.70, 3.20],
    ["Riyad Mahrez", "Algeria", 0.70, 12.50, 1.50, 0.30],
    ["James Rodriguez", "Colombia", 0.70, 29.40, 5.30, 2.40],
    ["Brahim Diaz", "Morocco", 0.70, 21.30, 4.30, 2.00],
    ["Andrej Kramaric", "Croatia", 0.70, 22.20, 3.40, 1.20],
    ["Jhon Arias", "Colombia", 0.70, 29.40, 5.30, 2.40],
    ["Ange-Yoan Bonny", "Ivory Coast", 0.70, 14.30, 1.20, 0.40],
    ["Ivan Toney", "England", 0.70, 76.20, 25.00, 13.30],
    ["Julian Quinones", "Mexico", 0.70, 52.40, 3.80, 1.20],
    ["Pedri", "Spain", 0.50, 81.80, 31.30, 17.40],
    ["Che Adams", "Scotland", 0.50, 9.10, 1.20, 0.50],
    ["Chris Wood", "New Zealand", 0.50, 3.80, 0.30, 0.10],
    ["Oscar Bobb", "Norway", 0.50, 26.70, 7.70, 3.20],
    ["Cyle Larin", "Canada", 0.50, 33.30, 2.40, 0.50],
    ["Martin Odegaard", "Norway", 0.50, 26.70, 7.70, 3.20],
    ["Daizen Maeda", "Japan", 0.50, 27.80, 3.80, 1.50],
    ["Amad Diallo", "Ivory Coast", 0.50, 14.30, 1.20, 0.40],
    ["Denzel Dumfries", "Netherlands", 0.50, 56.50, 10.00, 4.80],
    ["Ermedin Demirovic", "Bosnia", 0.50, 19.00, 1.20, 0.20],
    ["Lawrence Shankland", "Scotland", 0.50, 9.10, 1.20, 0.50],
    ["Lucas Paqueta", "Brazil", 0.50, 78.70, 20.00, 11.10],
    ["Nicolas Pepe", "Ivory Coast", 0.50, 14.30, 1.20, 0.40],
    ["Noah Okafor", "Switzerland", 0.50, 55.60, 5.30, 1.50],
    ["Zeki Amdouni", "Switzerland", 0.50, 55.60, 5.30, 1.50],
    ["Giovanni Reyna", "USA", 0.40, 44.40, 5.30, 1.60],
    ["Julio Enciso", "Paraguay", 0.40, 20.00, 1.50, 0.30],
    ["Achraf Hakimi", "Morocco", 0.40, 21.30, 4.30, 2.00],
    ["Anthony Elanga", "Sweden", 0.40, 18.20, 2.00, 1.00],
    ["Cedric Bakambu", "DR Congo", 0.40, 8.30, 0.70, 0.10],
    ["Dan Ndoye", "Switzerland", 0.40, 55.60, 5.30, 1.50],
    ["Marcel Sabitzer", "Austria", 0.40, 18.20, 2.40, 0.70],
    ["Yoane Wissa", "DR Congo", 0.40, 8.30, 0.70, 0.10],
    ["Brenden Aaronson", "USA", 0.20, 44.40, 5.30, 1.60],
    ["John McGinn", "Scotland", 0.20, 9.10, 1.20, 0.50],
    ["Lyle Foster", "South Africa", 0.20, 7.70, 0.40, 0.10]
];

// Compute Goals Per Game (GPG) from raw percentages
// Formula: expectedMatches = 3.0 + 1.5*(winGroup%) + 1.5*(reachFinal%) + 1.0*(toWin%)
//          gpg = (gbImplied% / 100) / expectedMatches * 27.5
const goldenBootPlayers = goldenBootRaw.map((row, idx) => {
    const [player, country, gbPct, winGroupPct, reachFinalPct, toWinPct] = row;
    const gbDec = gbPct / 100;
    const winGroupDec = winGroupPct / 100;
    const reachFinalDec = reachFinalPct / 100;
    const toWinDec = toWinPct / 100;

    const expectedMatches = 3.0 + 1.5 * winGroupDec + 1.5 * reachFinalDec + 1.0 * toWinDec;
    const gpg = (gbDec / expectedMatches) * 27.5;

    return {
        rank: idx + 1,
        player,
        country,
        team: countryToTeamName[country] || null,
        gbImplied: gbDec,
        expectedMatches: Math.round(expectedMatches * 100) / 100,
        gpg: Math.round(gpg * 100) / 100
    };
});

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

// Knuth-Poisson random goal generator
function getPoissonGoals(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1.0;
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    return k - 1;
}

// Simulate a match using Elo ratings with Poisson-distributed goals. Returns { g1, g2 }
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
        // Team 1 wins — generate Poisson goals until Team 1 > Team 2
        do {
            g1 = getPoissonGoals(team1_xG);
            g2 = getPoissonGoals(team2_xG);
        } while (g1 <= g2);
    } else if (rand < team1WinProb + team2WinProb) {
        // Team 2 wins
        do {
            g1 = getPoissonGoals(team1_xG);
            g2 = getPoissonGoals(team2_xG);
        } while (g2 <= g1);
    } else {
        // Draw — balanced xG for realistic low-scoring draws (0-0, 1-1, 2-2)
        const drawGoals = getPoissonGoals(1.1);
        g1 = drawGoals;
        g2 = drawGoals;
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

    // 60% of extra-time periods still end in a draw.
    // Remaining 40% follows the adjusted Elo probability.
    const etDecidedProb = 0.4;
    const etTeam1Prob = etDecidedProb * etEloProb;
    const etTeam2Prob = etDecidedProb * (1.0 - etEloProb);

    const etRoll = Math.random();
    let aet_s1 = 0, aet_s2 = 0;

    if (etRoll < etTeam1Prob) {
        // Team 1 wins in extra time
        aet_s1 = 1 + Math.floor(Math.random() * 2); // 1-2 goals
        return {
            s1, s2, aet: true, aet_s1, aet_s2,
            penalties: false, pen_s1: 0, pen_s2: 0,
            winner: team1,
            xg1, xg2, eloProb,
            scorers1: generateScorers(team1, s1 + aet_s1), scorers2: generateScorers(team2, s2 + aet_s2)
        };
    } else if (etRoll < etTeam1Prob + etTeam2Prob) {
        // Team 2 wins in extra time
        aet_s2 = 1 + Math.floor(Math.random() * 2);
        return {
            s1, s2, aet: true, aet_s1, aet_s2,
            penalties: false, pen_s1: 0, pen_s2: 0,
            winner: team2,
            xg1, xg2, eloProb,
            scorers1: generateScorers(team1, s1 + aet_s1), scorers2: generateScorers(team2, s2 + aet_s2)
        };
    }

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
        s1, s2, aet: true, aet_s1: 0, aet_s2: 0,
        penalties: true, pen_s1, pen_s2,
        winner: penWinner,
        xg1, xg2, eloProb,
        scorers1: generateScorers(team1, s1), scorers2: generateScorers(team2, s2)
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
                <span style="font-size:0.85rem; width:40%; text-align:right;">${match[0]}</span>
                <div class="score-inputs">
                    <input type="number" min="0" class="score-input score-t1" value="0">
                    <span class="match-vs">vs</span>
                    <input type="number" min="0" class="score-input score-t2" value="0">
                </div>
                <span style="font-size:0.85rem; width:40%; text-align:left;">${match[1]}</span>
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
        { id: 7, matchNo: 80, t1: groupResults['L'][1], t2: get3rd(3) },
        { id: 6, matchNo: 79, t1: groupResults['A'][1], t2: get3rd(2) },
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
    if (champField) champField.innerText = knockoutState.champion ? knockoutState.champion : "???";
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
            div1.innerText = name1;
        } else if (match.winner && match.aet) {
            div1.innerHTML = `<span>${name1}</span><span class="score-input score-display">${displayS1}${suffix1}</span>`;
        } else {
            div1.innerHTML = `<span>${name1}</span><input type="number" min="0" class="score-input" value="${displayS1}" onchange="advanceTeamScore('${roundKey}', ${match.id}, this.value, 't1')">`;
        }

        const div2 = document.createElement("div");
        div2.className = `ko-team ${match.winner === match.t2 && match.t2 ? 'advanced' : ''} ${match.winner && match.winner !== match.t2 ? 'eliminated' : ''}`;

        if (!match.t1 || !match.t2) {
            div2.innerText = name2;
        } else if (match.winner && match.aet) {
            div2.innerHTML = `<span>${name2}</span><span class="score-input score-display">${displayS2}${suffix2}</span>`;
        } else {
            div2.innerHTML = `<span>${name2}</span><input type="number" min="0" class="score-input" value="${displayS2}" onchange="advanceTeamScore('${roundKey}', ${match.id}, this.value, 't2')">`;
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
                <td>${i + 1}</td><td>${t.name}</td>
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
            html += `<li><span class="tp-team">${t.team}</span> <span class="tp-stats">Group ${t.group} &middot; ${t.points} pts &middot; ${t.gd > 0 ? '+' : ''}${t.gd} GD</span></li>`;
        });
        html += '</ol></div>';
    }

    container.innerHTML = html;
}

/* =====================================================================
   Tournament Stats Dashboard
   ===================================================================== */

const STAGE_SCORE = {
    "Group Stage": 0, "Round of 32": 1, "Round of 16": 2,
    "Quarter-Finals": 3, "Semi-Finals": 4, "Final": 5, "Champion": 6
};

function initTournamentStats() {
    tournamentStats = {
        teams: {},
        matches: [],
        highestScoring: null,
        biggestBlowout: null,
        marathonMatch: null,
        biggestSmashAndGrab: { deficit: 0 },
        hostility: { teamDeltas: {} }
    };
    // Initialize all 48 teams
    Object.values(groupsData).forEach(group => {
        group.forEach(team => {
            tournamentStats.teams[team] = {
                gf: 0, ga: 0, mp: 0, w: 0, d: 0, l: 0,
                elo: teamEloRatings[team] || 1500,
                etMinutes: 0, pensWon: 0, pensLost: 0,
                xgCreated: 0, xgConceded: 0
            };
        });
    });
    // Initialize hostility trackers for hostile + rival nations + USA (for comparison)
    [...HOSTILE_NATIONS, ...RIVAL_NATIONS, "🇺🇸 United States"].forEach(nation => {
        tournamentStats.hostility.teamDeltas[nation] = { totalDelta: 0, matchCount: 0 };
    });
}

function collectGroupMatchData(t1, t2, g1, g2, xg1, xg2, eloProb, scorers1, scorers2) {
    const d = tournamentStats.teams;
    d[t1].gf += g1; d[t1].ga += g2; d[t1].mp += 1;
    d[t2].gf += g2; d[t2].ga += g1; d[t2].mp += 1;
    if (g1 > g2) { d[t1].w++; d[t2].l++; }
    else if (g2 > g1) { d[t2].w++; d[t1].l++; }
    else { d[t1].d++; d[t2].d++; }

    // Track xG
    d[t1].xgCreated += xg1; d[t1].xgConceded += xg2;
    d[t2].xgCreated += xg2; d[t2].xgConceded += xg1;

    // Track geopolitical hostility deltas
    const h = tournamentStats.hostility.teamDeltas;
    const t1Outcome = g1 > g2 ? 1.0 : g1 === g2 ? 0.5 : 0.0;
    const t2Outcome = g2 > g1 ? 1.0 : g2 === g1 ? 0.5 : 0.0;
    const t1Prob = eloProb;
    const t2Prob = 1.0 - eloProb;
    if (h[t1] !== undefined) { h[t1].totalDelta += t1Outcome - t1Prob; h[t1].matchCount++; }
    if (h[t2] !== undefined) { h[t2].totalDelta += t2Outcome - t2Prob; h[t2].matchCount++; }

    const total = g1 + g2;
    const margin = Math.abs(g1 - g2);
    const record = { t1, t2, g1, g2, round: "Group Stage", scorers1, scorers2 };
    tournamentStats.matches.push(record);

    if (!tournamentStats.highestScoring || total > tournamentStats.highestScoring.total)
        tournamentStats.highestScoring = { total, ...record };
    if (!tournamentStats.biggestBlowout || margin > tournamentStats.biggestBlowout.margin)
        tournamentStats.biggestBlowout = { margin, ...record };

    // Check for Smash & Grab (winner had lower xG)
    if (g1 > g2 && xg1 < xg2) {
        const deficit = xg2 - xg1;
        if (deficit > tournamentStats.biggestSmashAndGrab.deficit) {
            tournamentStats.biggestSmashAndGrab = { winner: t1, loser: t2, score: `${g1}-${g2}`, deficit, xg1, xg2, round: "Group Stage" };
        }
    } else if (g2 > g1 && xg2 < xg1) {
        const deficit = xg1 - xg2;
        if (deficit > tournamentStats.biggestSmashAndGrab.deficit) {
            tournamentStats.biggestSmashAndGrab = { winner: t2, loser: t1, score: `${g2}-${g1}`, deficit, xg1, xg2, round: "Group Stage" };
        }
    }
}

function collectKOMatchData(roundKey, match, result) {
    const t1 = match.t1, t2 = match.t2;
    const g1 = parseInt(result.s1) + (result.aet ? result.aet_s1 : 0);
    const g2 = parseInt(result.s2) + (result.aet ? result.aet_s2 : 0);

    const d = tournamentStats.teams;
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
    const h = tournamentStats.hostility.teamDeltas;
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
    tournamentStats.matches.push(record);

    if (!tournamentStats.highestScoring || total > tournamentStats.highestScoring.total)
        tournamentStats.highestScoring = { total, ...record };
    if (!tournamentStats.biggestBlowout || margin > tournamentStats.biggestBlowout.margin)
        tournamentStats.biggestBlowout = { margin, ...record };
    if (result.penalties && !tournamentStats.marathonMatch)
        tournamentStats.marathonMatch = record;

    // Check for Smash & Grab (winner had lower xG)
    if (g1 > g2 && xg1 < xg2) {
        const deficit = xg2 - xg1;
        if (deficit > tournamentStats.biggestSmashAndGrab.deficit) {
            tournamentStats.biggestSmashAndGrab = { winner: t1, loser: t2, score: `${g1}-${g2}`, deficit, xg1, xg2, round: label };
        }
    } else if (g2 > g1 && xg2 < xg1) {
        const deficit = xg1 - xg2;
        if (deficit > tournamentStats.biggestSmashAndGrab.deficit) {
            tournamentStats.biggestSmashAndGrab = { winner: t2, loser: t1, score: `${g2}-${g1}`, deficit, xg1, xg2, round: label };
        }
    }
}

function computeStageAssignments() {
    const allTeams = new Set();
    Object.values(groupsData).forEach(g => g.forEach(t => allTeams.add(t)));

    function teamsInRound(round) {
        const s = new Set();
        (knockoutState[round] || []).forEach(m => {
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
    if (knockoutState.champion) map[knockoutState.champion] = "Champion";
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

    // Cinderella Award — lowest Elo that reached furthest (at least R16)
    const cinderellaCandidates = teamList.filter(t => STAGE_SCORE[d[t].stage] >= 2);
    const cinderella = cinderellaCandidates.length
        ? cinderellaCandidates.sort((a, b) =>
            STAGE_SCORE[d[b].stage] - STAGE_SCORE[d[a].stage] || d[a].elo - d[b].elo)[0]
        : null;

    // Fraud Watch — highest Elo that went out earliest (at least R32, didn't win)
    const fraudCandidates = teamList.filter(t => d[t].stage !== "Champion" && STAGE_SCORE[d[t].stage] >= 1);
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
                const flag = p.team ? p.team.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0] || '' : '';
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
        const flag = s.tinMedal.team.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0] || '';
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
            <div class="stats-value">${s.cinderella}</div>
            <div class="stats-detail">Elo ${d[s.cinderella].elo} &mdash; Reached ${d[s.cinderella].stage}</div>
        </div>`;
    }
    if (s.fraudWatch) {
        html += `<div class="stats-card badge-fraud">
            <h3><span class="stats-emoji">&#x1f6a8;</span> Fraud Watch</h3>
            <div class="stats-value">${s.fraudWatch}</div>
            <div class="stats-detail">Elo ${d[s.fraudWatch].elo} &mdash; Eliminated in ${d[s.fraudWatch].stage}</div>
        </div>`;
    }
    if (s.chaosMagnet) {
        html += `<div class="stats-card badge-chaos">
            <h3><span class="stats-emoji">&#x26a1;</span> Chaos Magnet</h3>
            <div class="stats-value">${s.chaosMagnet}</div>
            <div class="stats-detail">${d[s.chaosMagnet].etMinutes} minutes of extra time played</div>
        </div>`;
    }

    // ---- Team Performance Pillars ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f3c6; Team Performance Pillars</div>';

    if (s.goldenBoot) {
        html += `<div class="stats-card pillar-golden">
            <h3><span class="stats-emoji">&#x26bd;</span> Golden Boot</h3>
            <div class="stats-value">${s.goldenBoot}</div>
            <div class="stats-detail">${d[s.goldenBoot].gf} goals scored in ${d[s.goldenBoot].mp} matches</div>
        </div>`;
    }
    if (s.ironCurtain) {
        html += `<div class="stats-card pillar-curtain">
            <h3><span class="stats-emoji">&#x1f6e1;&#xfe0f;</span> Iron Curtain</h3>
            <div class="stats-value">${s.ironCurtain}</div>
            <div class="stats-detail">Only ${d[s.ironCurtain].ga} goals conceded in ${d[s.ironCurtain].mp} matches</div>
        </div>`;
    }
    if (s.sniper) {
        const gd = d[s.sniper].gf - d[s.sniper].ga;
        html += `<div class="stats-card pillar-sniper">
            <h3><span class="stats-emoji">&#x1f3af;</span> Sniper Award</h3>
            <div class="stats-value">${s.sniper}</div>
            <div class="stats-detail">Best goal difference: ${gd > 0 ? '+' : ''}${gd}</div>
        </div>`;
    }

    // ---- Expected Goals (xG) Metrics ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f4ca; Expected Goals (xG) Metrics</div>';

    if (s.sniperOver) {
        html += `<div class="stats-card pillar-sniper">
            <h3><span class="stats-emoji">&#x1f3af;</span> Clinical Overperformance</h3>
            <div class="stats-value">${s.sniperOver}</div>
            <div class="stats-detail">Scored ${d[s.sniperOver].gf} goals from ${d[s.sniperOver].xgCreated.toFixed(1)} xG (${s.sniperOverDiff > 0 ? '+' : ''}${s.sniperOverDiff.toFixed(1)})</div>
        </div>`;
    }
    if (s.woodenBoot) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1fab5;</span> Wooden Boot</h3>
            <div class="stats-value">${s.woodenBoot}</div>
            <div class="stats-detail">Created ${d[s.woodenBoot].xgCreated.toFixed(1)} xG but scored only ${d[s.woodenBoot].gf} goals (${s.woodenBootDiff.toFixed(1)})</div>
        </div>`;
    }
    if (s.dominantAttack) {
        html += `<div class="stats-card badge-cinderella">
            <h3><span class="stats-emoji">&#x2694;&#xfe0f;</span> Most Dominant Attack</h3>
            <div class="stats-value">${s.dominantAttack}</div>
            <div class="stats-detail">${s.dominantAttackAvg} xG per match</div>
        </div>`;
    }
    if (s.rigidDefense) {
        html += `<div class="stats-card pillar-curtain">
            <h3><span class="stats-emoji">&#x1f6e1;&#xfe0f;</span> Most Rigid Defense</h3>
            <div class="stats-value">${s.rigidDefense}</div>
            <div class="stats-detail">Only ${s.rigidDefenseAvg} xG allowed per match</div>
        </div>`;
    }
    if (s.smashAndGrab) {
        html += `<div class="stats-card badge-chaos">
            <h3><span class="stats-emoji">&#x1f3b0;</span> Smash &amp; Grab</h3>
            <div class="stats-value">${s.smashAndGrab.winner} ${s.smashAndGrab.score} ${s.smashAndGrab.loser}</div>
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
        const peakLabel = s.peakNation ? ` (peaked by ${s.peakNation})` : '';
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
                <div class="stats-value">${p.nation}</div>
                <div class="stats-detail">Highest individual spite rating: ${pSign}${p.avgDelta.toFixed(2)} &mdash; officially the most geopolitically disruptive team of the summer.</div>
            </div>`;
        }

        if (s.notableUSMatch) {
            const m = s.notableUSMatch;
            const resultLabel = m.usaLost ? '&#x1f534; Shock Defeat' : '&#x1f4aa; Statement Win';
            const hostClass = m.usaLost ? 'badge-fraud' : 'pillar-sniper';
            html += `<div class="stats-card ${hostClass}" style="grid-column: 1 / -1;">
                <h3>${resultLabel}</h3>
                <div class="stats-value">&#x1f1fa;&#x1f1f8; USA ${m.usaScore} &minus; ${m.oppScore} ${m.opponent}</div>
                <div class="stats-detail">${m.round} &mdash; ${m.usaLost ? 'Lost by' : 'Won by'} ${m.margin} goal${m.margin > 1 ? 's' : ''}</div>
            </div>`;
        }
    }

    // ---- Match Superlatives ----
    html += '<div class="stats-section-title" style="grid-column: 1 / -1;">&#x1f3c6; Match Superlatives</div>';

    if (s.highestScoring) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1f525;</span> Highest Scoring Match</h3>
            <div class="stats-value">${s.highestScoring.t1} ${s.highestScoring.g1} &minus; ${s.highestScoring.g2} ${s.highestScoring.t2}</div>
            <div class="stats-detail">${s.highestScoring.total} total goals &mdash; ${s.highestScoring.round}</div>
        </div>`;
    }
    if (s.biggestBlowout) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1f4a5;</span> Biggest Blowout</h3>
            <div class="stats-value">${s.biggestBlowout.t1} ${s.biggestBlowout.g1} &minus; ${s.biggestBlowout.g2} ${s.biggestBlowout.t2}</div>
            <div class="stats-detail">Won by ${s.biggestBlowout.margin} goals &mdash; ${s.biggestBlowout.round}</div>
        </div>`;
    }
    if (s.marathonMatch) {
        html += `<div class="stats-card superlative">
            <h3><span class="stats-emoji">&#x1f3c3;</span> Marathon Match</h3>
            <div class="stats-value">${s.marathonMatch.t1} ${s.marathonMatch.g1} &minus; ${s.marathonMatch.g2} ${s.marathonMatch.t2}</div>
            <div class="stats-detail">Went to penalties &mdash; ${s.marathonMatch.round}</div>
        </div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function pushToNextRound(currentRound, matchId, selectedTeam) {
    const prevWinner = knockoutState[currentRound][matchId].winner;
    knockoutState[currentRound][matchId].winner = selectedTeam;

    if (prevWinner && prevWinner !== selectedTeam) resetDownstream(prevWinner);

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
        if (target) knockoutState.r16[target.nextId][target.slot] = selectedTeam;

    } else if (currentRound === "r16") {
        let nextMatchId = Math.floor(matchId / 2);
        if (matchId % 2 === 0) knockoutState.qf[nextMatchId].t1 = selectedTeam;
        else knockoutState.qf[nextMatchId].t2 = selectedTeam;

    } else if (currentRound === "qf") {
        let nextMatchId = Math.floor(matchId / 2);
        if (matchId % 2 === 0) knockoutState.sf[nextMatchId].t1 = selectedTeam;
        else knockoutState.sf[nextMatchId].t2 = selectedTeam;

    } else if (currentRound === "sf") {
        if (matchId === 0) knockoutState.f[0].t1 = selectedTeam;
        else knockoutState.f[0].t2 = selectedTeam;

    } else if (currentRound === "f") {
        knockoutState.champion = selectedTeam;
    }
    renderBracket();
}

function resetDownstream(teamName) {
    const rounds = ["r16", "qf", "sf", "f"];
    rounds.forEach(r => {
        knockoutState[r].forEach(m => {
            if (m.t1 === teamName) { m.t1 = null; m.winner = null; m.s1 = ""; m.aet = false; m.aet_s1 = 0; m.aet_s2 = 0; m.penalties = false; m.pen_s1 = 0; m.pen_s2 = 0; }
            if (m.t2 === teamName) { m.t2 = null; m.winner = null; m.s2 = ""; m.aet = false; m.aet_s1 = 0; m.aet_s2 = 0; m.penalties = false; m.pen_s1 = 0; m.pen_s2 = 0; }
        });
    });
    if (knockoutState.champion === teamName) knockoutState.champion = null;
}

function resetAll() {
    knockoutState = { r32: [], r16: [], qf: [], sf: [], f: [], champion: null };
    savedGroupTables = null;
    savedBestThirdPlaces = null;
    tournamentStats = null;
    const koSection = document.getElementById("knockout-section");
    if (koSection) koSection.classList.add("id-disabled");
    const tablesContainer = document.getElementById("group-tables-container");
    if (tablesContainer) { tablesContainer.classList.add("id-disabled"); tablesContainer.innerHTML = ""; }
    const statsContainer = document.getElementById("stats-container");
    if (statsContainer) { statsContainer.classList.add("id-disabled"); statsContainer.innerHTML = ""; }
    renderGroupStage();
    renderBracket();
}
