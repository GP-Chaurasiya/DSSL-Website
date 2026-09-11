import List "mo:core/List";
import DalsTypes "../types/dals";
import SportsTypes "../types/sports";
import Common "../types/common";
import Array "mo:core/Array";
import DalsLib "../lib/dals";

mixin (
  matches : List.List<SportsTypes.Match>,
) {
  /// Returns all 7 DSSL dals.
  public query func getDals() : async [DalsTypes.Dal] {
    DalsLib.defaultDals();
  };

  /// Returns the current leaderboard (sorted by points desc).
  public query func getLeaderboard() : async [DalsTypes.LeaderboardEntry] {
    let dals = DalsLib.defaultDals();
    DalsLib.computeLeaderboard(dals, matches.toArray());
  };

  /// Returns the medal tally for all dals.
  public query func getMedalTally() : async [DalsTypes.MedalTallyEntry] {
    let dals = DalsLib.defaultDals();
    DalsLib.computeMedalTally(dals, matches.toArray());
  };

  /// Returns leaderboard entries filtered to a specific sport.
  public query func getLeaderboardBySport(sportId : Common.SportId) : async [DalsTypes.LeaderboardEntry] {
    let dals = DalsLib.defaultDals();
    let filtered = matches.filter(func(m : SportsTypes.Match) : Bool { m.sportId == sportId });
    DalsLib.computeLeaderboard(dals, filtered.toArray());
  };
}
