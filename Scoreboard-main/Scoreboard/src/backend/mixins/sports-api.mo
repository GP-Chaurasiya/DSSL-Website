import List "mo:core/List";
import SportsTypes "../types/sports";
import Common "../types/common";
import Time "mo:core/Time";
import Array "mo:core/Array";
import SportsLib "../lib/sports";
import DalsLib "../lib/dals";

mixin (
  matches : List.List<SportsTypes.Match>,
  state : { var nextMatchId : Nat },
) {
  /// Returns all sports supported by DSSL (17 sports).
  public query func getSports() : async [SportsTypes.Sport] {
    SportsLib.defaultSports();
  };

  /// Creates a new match. Returns the new match ID.
  public func createMatch(input : SportsTypes.CreateMatchInput) : async Nat {
    let id = state.nextMatchId;
    state.nextMatchId += 1;
    let m = SportsLib.createMatch(id, input);
    matches.add(m);
    id;
  };

  /// Returns a single match by ID.
  public query func getMatch(id : Common.MatchId) : async ?SportsTypes.MatchPublic {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == id })) {
      case (?m) {
        let sportName = switch (sports.find(func(s) { s.id == m.sportId })) {
          case (?s) { s.name };
          case null { "" };
        };
        let dalAName = switch (dals.find(func(d) { d.id == m.dalAId })) {
          case (?d) { d.name };
          case null { "" };
        };
        let dalBName = switch (dals.find(func(d) { d.id == m.dalBId })) {
          case (?d) { d.name };
          case null { "" };
        };
        ?SportsLib.toPublic(m, sportName, dalAName, dalBName);
      };
      case null { null };
    };
  };

  /// Increments score for dal A in the given match.
  public func incrementScoreA(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.incrementScoreA(m); true };
      case null { false };
    };
  };

  /// Decrements score for dal A in the given match (floor 0).
  public func decrementScoreA(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.decrementScoreA(m); true };
      case null { false };
    };
  };

  /// Increments score for dal B in the given match.
  public func incrementScoreB(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.incrementScoreB(m); true };
      case null { false };
    };
  };

  /// Decrements score for dal B in the given match (floor 0).
  public func decrementScoreB(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.decrementScoreB(m); true };
      case null { false };
    };
  };

  /// Starts a scheduled match (changes status to #live).
  public func startMatch(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.startMatch(m, Time.now()); true };
      case null { false };
    };
  };

  /// Pauses a live match.
  public func pauseMatch(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.pauseMatch(m, Time.now()); true };
      case null { false };
    };
  };

  /// Marks a match as completed.
  public func completeMatch(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.completeMatch(m, Time.now()); true };
      case null { false };
    };
  };

  /// Resets a match back to scheduled with zeroed scores.
  public func resetMatch(matchId : Common.MatchId) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { SportsLib.resetMatch(m); true };
      case null { false };
    };
  };

  /// Sets the isLive toggle on a match.
  public func setMatchLive(matchId : Common.MatchId, isLive : Bool) : async Bool {
    switch (matches.find(func(m : SportsTypes.Match) : Bool { m.id == matchId })) {
      case (?m) { m.isLive := isLive; true };
      case null { false };
    };
  };

  /// Returns all currently live matches.
  public query func getLiveMatches() : async [SportsTypes.MatchPublic] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
      let live = matches.filter(func(m : SportsTypes.Match) : Bool { m.isLive });
    live.map<SportsTypes.Match, SportsTypes.MatchPublic>(func(m) {
      let sportName = switch (sports.find(func(s) { s.id == m.sportId })) {
        case (?s) { s.name }; case null { "" };
      };
      let dalAName = switch (dals.find(func(d) { d.id == m.dalAId })) {
        case (?d) { d.name }; case null { "" };
      };
      let dalBName = switch (dals.find(func(d) { d.id == m.dalBId })) {
        case (?d) { d.name }; case null { "" };
      };
      SportsLib.toPublic(m, sportName, dalAName, dalBName);
    }).toArray();
  };

  /// Returns most recent N completed matches.
  public query func getRecentMatches(limit : Nat) : async [SportsTypes.MatchPublic] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    let completed = matches.filter(func(m : SportsTypes.Match) : Bool { m.status == #completed });
    let arr = completed.map<SportsTypes.Match, SportsTypes.MatchPublic>(func(m) {
      let sportName = switch (sports.find(func(s) { s.id == m.sportId })) {
        case (?s) { s.name }; case null { "" };
      };
      let dalAName = switch (dals.find(func(d) { d.id == m.dalAId })) {
        case (?d) { d.name }; case null { "" };
      };
      let dalBName = switch (dals.find(func(d) { d.id == m.dalBId })) {
        case (?d) { d.name }; case null { "" };
      };
      SportsLib.toPublic(m, sportName, dalAName, dalBName);
    }).toArray();
    // Return last `limit` entries (most recent are at end of list)
    let total = arr.size();
    if (total <= limit) { arr } else { arr.sliceToArray(total - limit, total) };
  };

  /// Returns upcoming (scheduled) matches.
  public query func getUpcomingMatches(limit : Nat) : async [SportsTypes.MatchPublic] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    let scheduled = matches.filter(func(m : SportsTypes.Match) : Bool { m.status == #scheduled });
    let arr = scheduled.map<SportsTypes.Match, SportsTypes.MatchPublic>(func(m) {
      let sportName = switch (sports.find(func(s) { s.id == m.sportId })) {
        case (?s) { s.name }; case null { "" };
      };
      let dalAName = switch (dals.find(func(d) { d.id == m.dalAId })) {
        case (?d) { d.name }; case null { "" };
      };
      let dalBName = switch (dals.find(func(d) { d.id == m.dalBId })) {
        case (?d) { d.name }; case null { "" };
      };
      SportsLib.toPublic(m, sportName, dalAName, dalBName);
    }).toArray();
    if (arr.size() <= limit) { arr } else { arr.sliceToArray(0, limit) };
  };

  /// Returns all matches for a given sport.
  public query func getMatchesBySport(sportId : Common.SportId) : async [SportsTypes.MatchPublic] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    let filtered = matches.filter(func(m : SportsTypes.Match) : Bool { m.sportId == sportId });
    filtered.map<SportsTypes.Match, SportsTypes.MatchPublic>(func(m) {
      let sportName = switch (sports.find(func(s) { s.id == m.sportId })) {
        case (?s) { s.name }; case null { "" };
      };
      let dalAName = switch (dals.find(func(d) { d.id == m.dalAId })) {
        case (?d) { d.name }; case null { "" };
      };
      let dalBName = switch (dals.find(func(d) { d.id == m.dalBId })) {
        case (?d) { d.name }; case null { "" };
      };
      SportsLib.toPublic(m, sportName, dalAName, dalBName);
    }).toArray();
  };

  /// Returns all matches (full history) for report generation.
  public query func getAllMatches() : async [SportsTypes.MatchPublic] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    matches.map<SportsTypes.Match, SportsTypes.MatchPublic>(func(m) {
      let sportName = switch (sports.find(func(s : SportsTypes.Sport) : Bool { s.id == m.sportId })) {
        case (?s) { s.name }; case null { "" };
      };
      let dalAName = switch (dals.find(func(d : { id : Common.DalId; name : Text }) : Bool { d.id == m.dalAId })) {
        case (?d) { d.name }; case null { "" };
      };
      let dalBName = switch (dals.find(func(d : { id : Common.DalId; name : Text }) : Bool { d.id == m.dalBId })) {
        case (?d) { d.name }; case null { "" };
      };
      SportsLib.toPublic(m, sportName, dalAName, dalBName);
    }).toArray();
  };

  /// Returns match statistics summary for reports.
  public query func getMatchStats() : async {
    total : Nat;
    live : Nat;
    completed : Nat;
    scheduled : Nat;
    todayCount : Nat;
  } {
    var total = 0;
    var live = 0;
    var completed = 0;
    var scheduled = 0;
    let nowNs = Time.now();
    // Day boundaries in nanoseconds
    let dayNs : Int = 86_400_000_000_000;
    let todayStart : Int = (nowNs / dayNs) * dayNs;
    let todayEnd : Int = todayStart + dayNs;
    var todayCount = 0;
    for (m in matches.values()) {
      total += 1;
      switch (m.status) {
        case (#live) { live += 1 };
        case (#completed) { completed += 1 };
        case (#scheduled) { scheduled += 1 };
      };
      switch (m.startTime) {
        case (?t) {
          if (t >= todayStart and t < todayEnd) { todayCount += 1 };
        };
        case null {};
      };
    };
    { total; live; completed; scheduled; todayCount };
  };

  /// Bulk import matches. Validates each input and creates only valid ones.
  /// Returns the IDs of successfully created matches.
  public func importMatches(inputs : [SportsTypes.CreateMatchInput]) : async [Nat] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    var createdIds : [Nat] = [];
    for (input in inputs.vals()) {
      if (SportsLib.validateInput(input, sports, dals)) {
        let id = state.nextMatchId;
        state.nextMatchId += 1;
        let m = SportsLib.createMatch(id, input);
        matches.add(m);
        createdIds := createdIds.concat([id]);
      };
    };
    createdIds;
  };

  /// Exports all matches as an array of MatchPublic.
  public query func exportMatches() : async [SportsTypes.MatchPublic] {
    let sports = SportsLib.defaultSports();
    let dals = DalsLib.defaultDals();
    matches.map<SportsTypes.Match, SportsTypes.MatchPublic>(func(m) {
      let sportName = switch (sports.find(func(s) { s.id == m.sportId })) {
        case (?s) { s.name }; case null { "" };
      };
      let dalAName = switch (dals.find(func(d) { d.id == m.dalAId })) {
        case (?d) { d.name }; case null { "" };
      };
      let dalBName = switch (dals.find(func(d) { d.id == m.dalBId })) {
        case (?d) { d.name }; case null { "" };
      };
      SportsLib.toPublic(m, sportName, dalAName, dalBName);
    }).toArray();
  };
}
