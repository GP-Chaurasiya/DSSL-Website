import Types "../types/dals";
import SportsTypes "../types/sports";
import Array "mo:core/Array";
import Float "mo:core/Float";

module {
  /// Returns the list of all 7 DSSL dals.
  public func defaultDals() : [Types.Dal] {
    [
      { id = 1; name = "Adarsh Dal" },
      { id = 2; name = "Sankalp Dal" },
      { id = 3; name = "Chanakya Dal" },
      { id = 4; name = "Vijay Dal" },
      { id = 5; name = "Utkarsh Dal" },
      { id = 6; name = "Rakshak Dal" },
      { id = 7; name = "Shaurya Dal" },
    ];
  };

  /// Computes leaderboard entries from a list of completed matches and dals.
  public func computeLeaderboard(
    dals : [Types.Dal],
    matches : [SportsTypes.Match],
  ) : [Types.LeaderboardEntry] {
    let entries = dals.map(
      func(dal) {
        var wins = 0;
        var losses = 0;
        var draws = 0;
        for (m in matches.vals()) {
          if (m.status == #completed) {
            if (m.dalAId == dal.id or m.dalBId == dal.id) {
              if (m.scoreA == m.scoreB) {
                draws += 1;
              } else if (m.dalAId == dal.id) {
                if (m.scoreA > m.scoreB) { wins += 1 } else { losses += 1 };
              } else {
                if (m.scoreB > m.scoreA) { wins += 1 } else { losses += 1 };
              };
            };
          };
        };
        let matchesPlayed = wins + losses + draws;
        let points = wins * 3 + draws;
        let winPct : Float = if (matchesPlayed == 0) { 0.0 } else {
          wins.toFloat() / matchesPlayed.toFloat() * 100.0
        };
        {
          dalId = dal.id;
          dalName = dal.name;
          wins;
          losses;
          draws;
          points;
          matchesPlayed;
          winPercentage = winPct;
        };
      }
    );
    // Sort descending by points then wins
    entries.sort(
      func(a, b) {
        if (a.points > b.points) { #less }
        else if (a.points < b.points) { #greater }
        else if (a.wins > b.wins) { #less }
        else if (a.wins < b.wins) { #greater }
        else { #equal };
      }
    );
  };

  /// Computes medal tally: gold = match winner, silver = runner-up, bronze = third (if applicable).
  /// For head-to-head sports each match awards gold/silver based on score.
  public func computeMedalTally(
    dals : [Types.Dal],
    matches : [SportsTypes.Match],
  ) : [Types.MedalTallyEntry] {
    let entries = dals.map(
      func(dal) {
        var gold = 0;
        var silver = 0;
        var bronze = 0;
        for (m in matches.vals()) {
          if (m.status == #completed) {
            if (m.dalAId == dal.id or m.dalBId == dal.id) {
              if (m.scoreA == m.scoreB) {
                // draw → bronze for both
                bronze += 1;
              } else if (m.dalAId == dal.id) {
                if (m.scoreA > m.scoreB) { gold += 1 } else { silver += 1 };
              } else {
                if (m.scoreB > m.scoreA) { gold += 1 } else { silver += 1 };
              };
            };
          };
        };
        {
          dalId = dal.id;
          dalName = dal.name;
          gold;
          silver;
          bronze;
          total = gold + silver + bronze;
        };
      }
    );
    // Sort descending by gold, then silver, then bronze
    entries.sort(
      func(a, b) {
        if (a.gold > b.gold) { #less }
        else if (a.gold < b.gold) { #greater }
        else if (a.silver > b.silver) { #less }
        else if (a.silver < b.silver) { #greater }
        else if (a.bronze > b.bronze) { #less }
        else if (a.bronze < b.bronze) { #greater }
        else { #equal };
      }
    );
  };
}
